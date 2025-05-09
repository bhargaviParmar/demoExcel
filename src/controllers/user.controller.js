const xlsx = require("xlsx");
const { v4: uuidv4 } = require("uuid");
const { Op, where } = require("sequelize");
const validator = require("validator");
const User = require("../models/User.model");
const UserMFA = require("../models/UserMFA.model");
const UserPersonalDetail = require("../models/UserPersonalDetail.model");
const UserOtpVerified = require("../models/UserOtpVerified.model");
const UserLoginHistory = require("../models/UserLoginHistory.model");
const { sendVerificationEmail, sendOtpEmail } = require("../utils/emailSender");
const { generateToken } = require("../utils/token");
const { success, error } = require("../utils/response");
const { generateOTP } = require("../utils/generateOTP");
const {
  isValidJson,
  isValidEmail,
  isValidDate,
  excelDateToJSDate,
  buildFieldMap,
} = require("../utils/validators");


// upload User CSV
exports.uploadUserCSV = async (req, res) => {
  if (!req.file) return error(res, 400, "No file uploaded");

  try {
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const users = xlsx.utils.sheet_to_json(sheet, { defval: "" });
    if (!users.length) return error(res, 400, "Empty file");

    // Normalize headers from first row
    const rawHeaders = Object.keys(users[0]);
    const fieldMap = buildFieldMap(rawHeaders);

    // Ensure all required fields exist
    const requiredFields = ["name", "email", "dob", "address"];
    for (const field of requiredFields) {
      if (!fieldMap[field]) {
        return error(res, 400, `Missing required column: ${field}`);
      }
    }

    const skipped = [];
    const alreadyExists = [];
    const newUsers = [];
    const userDetails = [];
    const mfaRecords = [];
    const emailTasks = [];
    const seenEmails = new Set();

    for (const row of users) {
      const name = row[fieldMap.name];
      const email = row[fieldMap.email];
      const addressStr = row[fieldMap.address];
      const dobRaw = row[fieldMap.dob];

      if (seenEmails.has(email)) {
        skipped.push({ name, email, error: "Duplicate email in uploaded file" });
        continue;
      }
      seenEmails.add(email);

      if (!name || !email) {
        skipped.push({ name, email, error: "name and email required " });
        continue;
      }
      if (!validator.isEmail(email)) {
        skipped.push({ name, email, error: "Invalid email" });
        continue;
      }

      let dob = null;
      if(dobRaw){
        if (typeof dobRaw === "number") {
          dob = excelDateToJSDate(dobRaw);
        } else if (typeof dobRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dobRaw)) {
          dob = dobRaw;
        }

        if (!validator.isDate(dob)) {
          skipped.push({
            name,
            email,
            dobRaw,
            error: "Invalid Date ,user YYYY-MM-DD ",
          });
          continue;
        }
      }

      let address = null;
      if (addressStr) {
        if (!isValidJson(addressStr)) {
          skipped.push({ name, email, addressStr, error: "Invalid address json" });
          continue;
        } else {
          address = addressStr;
        }
      }

      const existingUser = await User.findOne({
        where: { email },
        attributes: ["id"],
      });
      if (existingUser) {
        alreadyExists.push({ name, email });
        continue;
      }

      const token = Math.random().toString(36).substr(2, 6);
      const unique_id = uuidv4();

      // Prepare bulk data
      newUsers.push({ name, email, unique_id });
      userDetails.push({ address, dob });
      mfaRecords.push({ email_token: token, is_verify: false });
      emailTasks.push({ email, token });
    }

    // console.log("skipped", skipped);
    // console.log("newUsers", newUsers);
    // console.log("userDetails", userDetails);
    // process.exit();
    
    // Bulk insert users
    const createdUsers = await User.bulkCreate(newUsers, { returning: true });
    // Attach user_id to personal details and MFA
    for (let i = 0; i < createdUsers.length; i++) {
      userDetails[i].user_id = createdUsers[i].id;
      mfaRecords[i].user_id = createdUsers[i].id;
    }

    await UserPersonalDetail.bulkCreate(userDetails, { validate: true });
    await UserMFA.bulkCreate(mfaRecords);

    // Send verification emails in parallel (non-blocking)
    const emailResults = await Promise.allSettled(
      emailTasks.map(({ email, token }) => sendVerificationEmail(email, token))
    );

    emailResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `Failed to send email to ${emailTasks[index].email}: ${result.reason.message}`
        );
      }
    });

    return success(res, "Users uploaded successfully.", {
      alreadyExists,
      created: createdUsers.map((user) => ({
        name: user.name,
        email: user.email,
      })),
      skipped: {
        skippedUsers: skipped,
        message: "Some users were skipped due to validation errors",
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return error(res, 500, "Something went wrong", err.message);
  }
};

// verify Email Token
exports.verifyEmailToken = async (req, res) => {
  const { email, emailToken } = req.body;
  if (!email || !emailToken)
    return error(res, 400, "Email and token are required.");
  try {
    // Find the user MFA record directly
    const mfaRecord = await UserMFA.findOne({
      where: { email_token: emailToken },
      include: {
        model: User,
        where: { email },
        attributes: ["email"],
      },
    });

    if (!mfaRecord || !mfaRecord.User)
      return error(res, 404, "Invalid email or token.");

    if (mfaRecord.is_verify) return error(res, 400, "Email already verified.");

    await mfaRecord.update({ is_verify: true });
    return success(res, "Email verification successful.", mfaRecord.User.email);
  } catch (err) {
    return error(res, 500, "Something went wrong", err.message);
  }
};

// setPassword
exports.setPassword = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return error(res, 400, "Email and password required");
  try {
    const user = await User.findOne({
      where: { email },
      attributes: ["id", "email", "password"],
      include: {
        model: UserMFA,
        where: { is_verify: true },
        attributes: ["id"],
      },
    });

    if (user && user.password !== null)
      return error(res, 401, "Password already set by you");

    if (!user || !user.UserMFA)
      return error(res, 404, "User not found or email not verified.");
    await user.update({ password });
    return success(res, "Password set successfully");
  } catch (err) {
    return error(res, 500, "Something went wrong", err.message);
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return error(res, 400, "Email and password are required.");
  try {
    //verify password
    // const user = await User.findOne({
    //   where: { email },
    //   include: UserOtpVerified,
    // });
    const user = await User.findOne({
      where: { email },
      attributes: ["id", "email", "password"],
      include: {
        model: UserOtpVerified,
        attributes: ["id", "otp_verified"],
      },
    });

    if (!user) return error(res, 401, "Invalid email.");
    if (!user.password)
      return error(res, 401, "Verify email token and set password");
    if (!user.validPassword(password))
      return error(res, 401, "Invalid email or password.");

    const otp = generateOTP(); // Generate OTP
    await sendOtpEmail(email, otp); //sent otp on email

    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    //save otp data
    if (user.UserOtpVerified) {
      await user.UserOtpVerified.update({
        otp,
        otp_verified: false,
        otp_expiry: otpExpiry,
      });
    } else {
      await UserOtpVerified.create({
        user_id: user.id,
        otp,
        otp_verified: false,
        otp_expiry: otpExpiry,
      });
    }

    return success(res, "sent OTP to your email successfully");
  } catch (err) {
    return error(res, 500, "Something went wrong", err.message);
  }
};

// verifyOTP
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return error(res, 400, "Email and OTP required");
  try {
    const user = await User.findOne({
      where: { email },
      attributes: ["id", "email", "name"],
      include: [
        { model: UserOtpVerified },
        { model: UserLoginHistory, attributes: ["isActive"] },
      ],
    });

    console.log("user", user.toJSON());
    if (!user || !user.UserOtpVerified)
      return error(res, 404, "User not found");

    const userOtp = user.UserOtpVerified;
    const now = new Date();

    if (
      userOtp.otp !== otp ||
      !userOtp.otp_expiry ||
      now > new Date(userOtp.otp_expiry)
    )
      return error(res, 400, "Invalid or expired OTP.");

    // mark as verified otp
    userOtp.otp_verified = true;
    userOtp.otp = null;
    userOtp.otp_expiry = null;
    await userOtp.save();

    //Check if any user is already logged in
    const loginData = await UserLoginHistory.findOne({
      where: { isActive: true },
      include: {
        model: User,
        attributes: ["name", "email"],
      },
    });

    //user already logged
    if (
      user &&
      Array.isArray(user.UserLoginHistories) &&
      user.UserLoginHistories.some((history) => history.isActive)
    )
      return error(res, 401, "You are already logged in to the system.");

    if (loginData)
      return error(res, 401, "Already one user login in to the system ", {
        name: loginData.User.name,
        email: loginData.User.email,
      });

    const token = generateToken(user);

    // save user login data
    await UserLoginHistory.create({
      user_id: user.id,
      login_date_time: new Date(),
      token: token,
      isActive: true,
    });

    return success(res, "OTP verified successfully", {
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    return error(res, 500, "Something went wrong", err.message);
  }
};

// dashboard
exports.getDashboardUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { search = "", page = 1, limit = 10, filterDOB = "" } = req.query;

    // Validate filterDOB format if provided
    if (filterDOB) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(filterDOB)) {
        return error(
          res,
          400,
          "Invalid date format. Please use 'YYYY-MM-DD' format."
        );
      }
    }
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {
      id: { [Op.ne]: currentUserId },
      [Op.or]: [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ],
    };

    //filter according DOB
    const personalDetailWhereClause = {};
    if (filterDOB) {
      personalDetailWhereClause.dob = filterDOB; // expected in 'YYYY-MM-DD' format
    }

    const { rows: users, count: total } = await User.findAndCountAll({
      where: whereClause,
      attributes: ["id", "name", "email"],
      include: {
        model: UserPersonalDetail,
        attributes: ["dob", "address"],
        where: Object.keys(personalDetailWhereClause).length
          ? personalDetailWhereClause
          : undefined,
      },
      offset,
      limit: parseInt(limit),
      order: [["name", "ASC"]],
    });

    return success(res, "User list fetched successfully", {
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Dashboard fetch error:", err);
    return error(res, 500, "Something went wrong", err.message);
  }
};
// updateProfile
exports.updateProfile = async (req, res) => {
  try {
    const authId = req.user.id;
    const { name, address, dob } = req.body;

    const user = await User.findOne({
      where: { id: authId },
      include: UserPersonalDetail,
    });
    if (!user) {
      return error(res, "User not found", 404);
    }

    // Update name if provided
    if (name) user.name = name;
    await user.save();

    // Update address and dob
    await UserPersonalDetail.update(
      { address, dob },
      { where: { user_id: authId } }
    );

    // Refetch updated profile
    const updatedUser = await User.findOne({
      where: { id: authId },
      include: UserPersonalDetail,
    });

    return success(res, "User profile update successfully", updatedUser);
  } catch (err) {
    console.error("Dashboard fetch error:", err);
    return error(res, 500, "Something went wrong", err.message);
  }
};

exports.logout = async (req, res) => {
  try {
    const userId = req.user.id;
    const token = req.headers.authorization?.split(" ")[1];

    // Find and update the active session
    const [updated] = await UserLoginHistory.update(
      { logout_date_time: new Date(), token: null, isActive: false },
      {
        where: {
          user_id: userId,
          token: token,
          logout_date_time: null,
        },
      }
    );

    if (updated === 0) {
      return error(res, 400, "Session not found or already logged out");
    }

    return success(res, "User logged out successfully");
  } catch (err) {
    return error(res, 401, "Invalid token or session");
  }
};
