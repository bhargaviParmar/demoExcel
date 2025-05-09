const User = require("./models/User.model");
const UserLoginHistory = require("./models/UserLoginHistory.model");
const UserMFA = require("./models/UserMFA.model");
const UserOtpVerified = require("./models/UserOtpVerified.model");
const UserPersonalDetail = require("./models/UserPersonalDetail.model");

// one to one
User.hasOne(UserPersonalDetail, {
  foreignKey: "user_id", // if you not define this key in model then it atomically create userId
  // as: "profile Info", // creating alias so you should mention this alise when you fetch this data  //not necessary to create alias
});
UserPersonalDetail.belongsTo(User, {
  foreignKey: "user_id",
  as: "user Info", //not necessary
});

// one to one
User.hasOne(UserMFA, {
  foreignKey: "user_id",
});
UserMFA.belongsTo(User, {
  foreignKey: "user_id",
});

// one to many
User.hasOne(UserOtpVerified, {
  foreignKey: "user_id",
});
UserOtpVerified.belongsTo(User, {
  foreignKey: "user_id",
});

// one to many
User.hasMany(UserLoginHistory,{
  foreignKey: "user_id",
})
UserLoginHistory.belongsTo(User,{
  foreignKey: "user_id",
})



