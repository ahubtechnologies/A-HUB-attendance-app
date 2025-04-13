const express = require('express');
const router = express.Router();
const authController = require('./controllers/authController');
const userController = require('./controllers/userController');
const attendanceController = require('./controllers/attendanceController');

router.use((req, res, next) => {
  console.log(`Received request: ${req.method} ${req.url}`);
  next();
});

router.post('/api/auth/login', authController.login);
router.get('/api/auth/check-admin', authController.checkIfAdmin);
router.post('/api/auth/logout', authController.logout);

router.post('/api/users', userController.addUser);
router.delete('/api/users/:userId', userController.deleteUser);
router.get('/api/users', userController.getUsers);

router.post('/api/attendance', attendanceController.markAttendance);
router.get('/api/attendance', attendanceController.getAttendance);

module.exports = router;