const validator = require("validator");

//for user csv
const FIELD_ALIASES = {
  name: ["name", "first name"],
  email: ["email", "e-mail"],
  dob: ["dob", "date of birth", "birth date"],
  address: ["address", "address "],
};

function normalizeHeader(header) {
  return header.trim().toLowerCase();
}

function buildFieldMap(rawHeaders) {
  const map = {};
  const normalizedHeaders = rawHeaders.map((h) => normalizeHeader(h));

  for (const [standardField, aliases] of Object.entries(FIELD_ALIASES)) {
    const match = normalizedHeaders.find((h) => aliases.includes(h));
    if (match) {
      const original = rawHeaders[normalizedHeaders.indexOf(match)];
      map[standardField] = original;
    }
  }

  return map;
}

function isValidJson(str) {
  if (typeof str !== "string") return false;
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === "object" && parsed !== null;
  } catch {
    return false;
  }
}

function isValidEmail(email) {
  return validator.isEmail(email);
}

function isValidDate(dateStr) {
  return validator.isDate(dateStr);
}

function excelDateToJSDate(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split("T")[0];
}

module.exports = {
  isValidJson,
  isValidEmail,
  isValidDate,
  excelDateToJSDate,
  buildFieldMap,
};