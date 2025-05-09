const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserPersonalDetail = sequelize.define('UserPersonalDetail', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    // user_id
    address: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isCorrectFormat(value) {
          if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            throw new Error("Invalid DOB format. Expected 'YYYY-MM-DD'.");
          }
          const date = new Date(value);
          if (isNaN(date.getTime()) || !date.toISOString().startsWith(value)) {
            throw new Error("Invalid date value.");
          }
        }
      }
    }  
  }, {
    tableName: 'user_personal_details',
    paranoid: true, //for soft delete
    // timestamps: true, 
  });


module.exports = UserPersonalDetail;
