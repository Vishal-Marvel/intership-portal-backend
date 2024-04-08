const express = require("express");
const router = express.Router();
const internship = require("../controllers/internshipController");
const student = require("../controllers/studentController");
const authController = require("../controllers/authController");
const multer = require("multer");
// Create an instance of multer for handling file uploads
const upload = multer({
  limits: {
    fileSize: 1048576, // 1 mb
  },
});

router.use(authController.protect);
router.get(
  "/check",
  authController.restrictTo("student"),
  internship.checkCompletionStatus
);
router.get(
  "/check/:id",
  authController.doNotAllow("student"),
  internship.checkCompletionStatus
);
router.post("/register", upload.single("file"), internship.registerInternship);
router.post(
  "/completion-update/:id",
  upload.fields([
    { name: "certificate" },
    // { name: 'attendance' },
    // { name: 'feedback' },
  ]),
  internship.uploadCompletionForm
);
router
  .route("/:id")
  .get(internship.viewInternship)
  .put(
    upload.fields([
      { name: "certificate" },
      // {name: 'attendance'},
      // {name: 'feedback'},
      { name: "offer_letter" },
    ]),
    authController.doNotAllow("student"),
    internship.updateInternship
  )
  .delete(authController.doNotAllow("student"), internship.deleteInternship);

router.get("/approval-status/:id", internship.getApprovalStatus);
router.get("/download-report/:id", internship.downloadReport);
router.get("/download-file/:id", internship.downloadFiles);

router.use(authController.doNotAllow("student")); // Restricting Students
router.post("/approval/:role/:id", internship.approveInternship);
router.post("/send-back/:role/:id", internship.sendBack);
router.post("/reject/:role/:id", internship.reject);
router.get("/view/all", internship.viewInternships);
router.get("/view-student-internships/:id", student.viewStudentInternship);
module.exports = router;
