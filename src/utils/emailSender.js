const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  // service: "gmail", // Or any SMTP provider
  host: "smtp.gmail.com", // Replace with your SMTP host
  port: 587, // 465 = secure (SSL), 587 = STARTTLS
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function sendVerificationEmail(email, token) {
  const mailOptions = {
    from: process.env.MAIL_USER,
    to: email,
    subject: "Your Email Verification Token",
    text: `Your email verification token is: ${token}`,
  };

  return transporter.sendMail(mailOptions);
}

async function sendOtpEmail(email, otp) {
  const mailOptions = {
    from: process.env.MAIL_USER,
    to: email,
    subject: "Your Email Verification Otp",
    text: `Your email verification Otp is: ${otp}
          Note:this otp expire with in 10 min`,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = {sendVerificationEmail,sendOtpEmail};
