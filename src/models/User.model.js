const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const bcrypt = require("bcrypt");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    unique_id: {
      type: DataTypes.STRING,
      allowNull:false,
      unique:true,
      validate: {
        notEmpty: true,
        len: [3, 100],
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        isEmail: true,
        len: [5, 255],
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
      set(value) {
        if (value) {
          if (value.length < 6) {
            throw new Error("Password must be at least 6 characters long.");
          }
          const hashed = bcrypt.hashSync(value, 10);
          this.setDataValue("password", hashed);
        }
      }
    },
  },
  {
    // freezeTableName: true,
    paranoid: true,//use for soft delete 
  }
);

// ✅ Instance method to validate password
User.prototype.validPassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};

module.exports = User;
