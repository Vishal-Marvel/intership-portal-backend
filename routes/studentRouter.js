const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const studentController = require('../controllers/studentController');
const notificationController = require('../controllers/notificationController');
const multer = require("multer");
const upload = multer({
    limits: {
        fileSize: 524288 // 512 kb
    }
});
router.post('/signup',upload.single('file'), authController.studentSignUp);
router.post('/login', authController.studentLogin);
router.post('/forgot-password', authController.studentForgotPasswordReq);
router.post('/set-forgot-password', authController.studentForgotPasswordRes);

router.use(authController.protect)
router.post('/change-password', authController.changePassword);

router.put('/update', authController.restrictTo('student'),
    upload.single('file'),
    studentController.updateStudent);
router.get('/viewStudent/:id',
    authController.restrictTo('hod', 'principal', 'internshipcoordinator', 'mentor', 'ceo'),
    studentController.viewStudent);
router.get('/viewStudent',studentController.viewStudent);
router.get('/internships', studentController.viewStudentInternship)
router.get('/image/:id', studentController.getProfilePhoto)
router.get('/notifications', notificationController.viewStudentNotifications)
router.use(authController.doNotAllow('student'))
router.route('/:id')
    .put(studentController.updateStudentByStaff)
    .delete(studentController.deleteStudent);
module.exports = router;
