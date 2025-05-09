const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserOtpVerified = sequelize.define(
  "UserOtpVerified",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id:{
      type:DataTypes.INTEGER,
    },
    otp:{
      type: DataTypes.STRING,
      allowNull: true,
    },
    otp_expiry :{
      type: DataTypes.DATE,
      allowNull: true,
    },
    otp_verified : {
      type: DataTypes.BOOLEAN,
      default: false,
    },
  },
  {
    tableName: "user_otp_verified",
    // paranoid: true,
  }
);

module.exports = UserOtpVerified;
