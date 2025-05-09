const validator = require("validator");
// This function validates individual user rows for CSV/XLSX uploads
exports.validateSingleUser = (user) => {
    const errors = [];
 
    if (!user.name || !user.email) {
        errors.push("name and email required ");
    }
    // Email Validation
    if (!validator.isEmail(user.email)) {
      errors.push('Invalid email format');
    }
  
    // DOB Validation
    if (!user.dob || isNaN(Date.parse(user.dob))) {
        console.log("Date.parse(user.dob)",Date.parse(user.dob))
      errors.push('Invalid DOB (must be a valid date)');
    }
  
    // Address Validation
    if (user.addressStr && !validator.isJSON(user.addressStr)) {
      errors.push('Invalid address json');
    }
  
    return errors;
  };