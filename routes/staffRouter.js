const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const staffController = require("../controllers/staffController");
const notificationController = require("../controllers/notificationController");
const multer = require("multer");
// Create an instance of multer for handling file uploads
const upload = multer({
  limits: {
    fileSize: 524288, // 512 kb
  },
});
router.post("/signup", upload.single("file"), authController.staffSignup);
router.post("/login", authController.staffLogin);
router.post("/forgot-password", authController.staffForgotPasswordReq);
router.post("/set-forgot-password", authController.staffForgotPasswordRes);
router.get("/:dept/:clg/mentors", staffController.getDepartMentors);
router.use(authController.protect);
router.use(authController.doNotAllow("student"));
router.post("/change-password", authController.changePassword);
router.get("/mentee-students/:id", staffController.viewMenteeStudents);
router.put("/update", upload.single("file"), staffController.updateStaff);
router.get("/viewMultipleStudent", staffController.viewMultipleStudent);
router.get("/viewStaff", staffController.viewStaff); //for same logged in staff
router.get("/view-notifications", notificationController.viewNotifications);
router.post("/create-notification", notificationController.createNotification);
router.put(
  "/update-notification/:id",
  notificationController.updateNotifications
);
router.delete(
  "/delete-notification/:id",
  notificationController.deleteNotification
);

router.use(
  authController.restrictTo("hod", "tapcell", "principal", "ceo", "admin")
);
router.get("/viewAllRoles", staffController.getAllRoles);
router.post("/updateRole/:id", staffController.updateRole);
router.get("/viewStaffRoles/:id", staffController.viewRoles);
router.post("/updateMentees", staffController.migrateMentees);
router.get("/viewMultipleStaff/:role", staffController.viewMultipleStaff);
router.get("/viewStaff/:id", staffController.viewStaff);
router.post(
  "/addStaffs",
  upload.single("file"),
  authController.multipleStaffSignup
);
router
  .route("/:id")
  .put(upload.single("file"), staffController.updateStaff)
  .delete(staffController.deleteStaff);

module.exports = router;
