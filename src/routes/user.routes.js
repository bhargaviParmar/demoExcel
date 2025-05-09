const express = require('express');
const router = express.Router();
const multer = require("multer");
const userController = require('../controllers/user.controller');
const {authenticate} = require('../middleware/auth')
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/uploadUserCSV', upload.single("userDetailFile"),userController.uploadUserCSV);
router.post('/verifyEmailToken', userController.verifyEmailToken);
router.post('/setPassword', userController.setPassword);
router.post('/login', userController.login);
router.post('/verifyOTP', userController.verifyOTP);
// router.post('/signup', userController.signup);

router.get('/getDashboardUsers', authenticate,userController.getDashboardUsers);
router.patch('/updateProfile', authenticate,userController.updateProfile);
router.get('/logout', authenticate,userController.logout);

module.exports = router;
