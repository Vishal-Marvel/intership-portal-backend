const Notification = require("../models/notificationModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Staff = require("../models/staffModel");
const Student = require("../models/studentModel");

exports.createNotification = catchAsync(async (req, res) => {
  try {
    let { message, year, departments, type, toRoles, expiry } = req.body;
    const facultyId = req.user.id; // Assuming you have user authentication and you get faculty ID from user
    departments = departments.toString();
    const expiryDate = new Date(expiry);
    const notification = await Notification.forge({
      message,
      year,
      departments,
      faculty_id: facultyId,
      type,
      toRoles,
      expiryDate,
    }).save();

    res.status(201).json({
      status: "success",
      data: {
        notification,
      },
    });
  } catch (err) {
    // console.error(err);
    res.status(500).json({
      status: "error",
      message: "Failed to create notification",
    });
  }
});

exports.viewNotifications = catchAsync(async (req, res) => {
  try {
    let notifications;
    const today = new Date();
    notifications = await Notification.fetchAll();
    const activeNotifications = notifications.filter(
      (notification) => notification.expiryDate > today
    );

    const notificationList = [];

    for (const notification of activeNotifications.models) {
      const message = notification.get("message");
      const staff_id = notification.get("faculty_id");
      const staff = await Staff.where({ id: staff_id }).fetch();
      const staff_name = staff.get("name");
      const type = notification.get("type");
      const toRoles = notification.get("toRoles");
      const date = notification.get("updated_at");
      const year = notification.get("year");
      const depts = notification.get("departments");
      notificationList.push({
        message,
        staff_name,
        date,
        type,
        toRoles,
        year,
        depts,
      });
    }
    res.status(200).json({
      status: "success",
      data: {
        notificationList,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch notifications",
    });
  }
});

exports.deleteNotification = catchAsync(async (req, res) => {
  try {
    const msg_id = req.params.id;
    const facultyId = req.user.id;
    const loggedInStaffRole = req.user.roles;

    // Find the internship in the database based on the provided ID
    const notification = await Notification.where({ id: msg_id }).fetch();
    if (notification.get("faculty_id") != facultyId) {
      if (
        loggedInStaffRole.inclues("hod") ||
        loggedInStaffRole.inclues("tapcell") ||
        loggedInStaffRole.inclues("ceo") ||
        loggedInStaffRole.inclues("prinipal")
      )
        await notification.destroy();
      else {
        throw new AppError("Not Authorized", 403);
      }
    } else {
      await notification.destroy();
    }
    // Send a success response
    res.status(200).json({
      status: "success",
      message: "Notification deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Failed to delete the notification.",
    });
  }
});

// Schedule a job to run daily
// schedule.scheduleJob("0 0 * * *", async () => {
//   try {
// const today = new Date();
// Fetch notifications older than 1 month
// const notificationsToDelete = await Notification.where(
//   "expiry_at",
//   "<",
//   today
// ).fetchAll();

// // Delete the fetched notifications
// for (const notification of notificationsToDelete.models) {
//   await notification.destroy();
// }

//     console.log("Automatic deletion of notifications completed.");
//   } catch (err) {
//     console.error("Error during automatic deletion:", err);
//   }
// });
