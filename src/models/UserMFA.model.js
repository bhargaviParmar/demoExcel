const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserMFA = sequelize.define(
  "UserMFA",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    // user_id
    email_token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_verify: {
      type: DataTypes.BOOLEAN,
      default: false,
    },
  },
  {
    tableName: "user_mfa",
    paranoid: true,
  }
);

module.exports = UserMFA;
