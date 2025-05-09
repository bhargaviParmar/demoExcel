exports.success = (res, message = "Success", data = {}, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

exports.error = (
  res,
  status = 500,
  message = "Something went wrong!",
  errors = null
) => {
  return res.status(status).json({
    success: false,
    message,
    errors,
  });
};
