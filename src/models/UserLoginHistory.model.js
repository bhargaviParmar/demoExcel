const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserLoginHistory = sequelize.define(
  "UserLoginHistory",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    // user_id
    login_date_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    logout_date_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    token:{
      type:DataTypes.STRING,
      allowNull:true
    },
    isActive:{
      type:DataTypes.BOOLEAN,
      defaultValue:false
    }
  },
  {
    tableName: "user_login_history",
    timestamps: false,
  }
);

module.exports = UserLoginHistory;
