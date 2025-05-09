const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const { success, error } = require('../utils/response');
const { Op } = require('sequelize');
const UserLoginHistory = require('../models/UserLoginHistory.model');

exports.authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

  if (!token) return error(res,401,'Access token missing');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
     // Check if token is still active (not logged out)
     const session = await UserLoginHistory.findOne({
      where: {
        user_id: decoded.id,
        token: token,
        logout_date_time: null,
      },
    });
    // console.log("session",session)
    // process.exit()

    if (!session) return error(res, 401, "Token is blacklisted or expired");


    req.user = decoded; // attach user info to request
    next();
  } catch (err) {
    return error(res,401,"Invalid token");
  }
};
