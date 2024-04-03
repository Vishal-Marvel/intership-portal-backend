const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const skillController = require('../controllers/skillController');
router.get('/getAllSkills', skillController.getAllSkills)

router.use(authController.protect);
router.use(authController.restrictTo("hod", "tapcell", "principal", "ceo", "admin"));

router.post('/addSkill', skillController.addSkill)
router.delete('/deleteSkill', skillController.deleteSkill)

module.exports = router;
