const Notification = require('../models/notificationModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Staff = require('../models/staffModel');
const Student = require('../models/studentModel');


exports.createNotification = catchAsync(async (req, res) => {
    try {
        let {message, year, departments} = req.body;
        const facultyId = req.user.id; // Assuming you have user authentication and you get faculty ID from user
        const role = req.user.roles.toString();
        departments = departments.toString();
        

        const notification = await Notification.forge({
            message,
            year,
            departments,
            faculty_id: facultyId,
            role
        }).save();

        res.status(201).json({
            status: 'success',
            data: {
                notification,
            },
        });
    } catch (err) {
        // console.error(err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create notification',
        });
    }
});

exports.viewNotifications = catchAsync(async (req, res) => {
    try {
        let notifications;

        notifications = await Notification.fetchAll();

        const notificationsList = [];

        for (const notification of notifications.models) {
            const message = notification.get("message");
            const staff_id = notification.get("faculty_id");
            const staff = await Staff.where({id: staff_id}).fetch();
            const staff_name = staff.get("name");
            const date = notification.get('updated_at')
            notificationsList.push({message, staff_name, date});
        }
        res.status(200).json({
            status: 'success',
            data: {
                notification: notificationsList,
            },
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch notifications',
        });
    }
});

exports.viewStudentNotifications = catchAsync(async (req, res) => {
    try {
        const studentId = req.user.id;
        const student = await Student.where({'id': studentId}).fetch();
        const year = student.get('year_of_studying');
        const department = req.user.department;
        const notifications = await Notification.where({'year': year}).fetchAll();
        const notificationsWithList = [];

        for (const notification of notifications.models) {
            const departments = notification.get('departments').split(',').map(department => department.trim());
            if (!departments.includes(department)) {
                continue;
            }
            const message = notification.get("message");
            const staff_id = notification.get("faculty_id");
            const staff = await Staff.where({id: staff_id}).fetch();
            const staff_name = staff.get("name");
            const date = notification.get('updated_at')

            notificationsWithList.push({message, staff_name, date});
        }
        res.status(200).json({
            status: 'success',
            data: {
                notification: notificationsWithList,
            },
        });
    } catch (err) {
        console.log(err)
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch notifications',
        });
    }
});

exports.updateNotifications = catchAsync(async (req, res) => {
    try {
        const facultyId = req.user.id;
        const id = req.params.id;
        const notifications = await Notification.where({faculty_id: facultyId}).fetchAll();
        if (!notifications || notifications.length === 0) {
            // If the staff with the provided ID is not found, return an error response
            return res.status(404).json({
                status: 'fail',
                message: 'No Notification found for the faculty',
            });
        }
        const {message,departments} = req.body;
        const updated_at = new  Date();

        const updatedData = {
            message,updated_at,departments
        };
        const updatedNotifications = await Notification.findByIdAndUpdate(id, updatedData, {
            new: true, // Return the updated document
            runValidators: true, // Run the validation on the updated fields
            tableName: 'notification' // Specify the table name
        });
        res.status(200).json({
            status: 'success',
            message: ' Notification updated successfully',
            result: updatedNotifications,
        });
    } catch (err) {
        console.error(err);
        // res.status(500).json({
        //     status: 'error',
        //     message: 'Failed to update notifications',
        //   });
        if (err.message === "EmptyResponse") {
            const error = new AppError("Notification Not Found", 404);
            error.sendResponse(res);
        } else {
            const error = new AppError(err.message, 500);
            error.sendResponse(res);
        }
    }
});

exports.deleteNotification = catchAsync(async (req, res) => {
    try {
        const msg_id = req.params.id;
        const facultyId = req.user.id;

        // Find the internship in the database based on the provided ID
        await Notification.findByIdAndDelete(msg_id, facultyId);

        // Send a success response
        res.status(200).json({
            status: 'success',
            message: 'Notification deleted successfully',

        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete the notification.',
        });
    }

});


// // Schedule a job to run daily
// schedule.scheduleJob('0 0 * * *', async () => {
//   try {
//     // Calculate the date 1 month ago
//     const oneMonthAgo = new Date();
//     oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

//     // Fetch notifications older than 1 month
//     const notificationsToDelete = await Notification.where('created_at', '<', oneMonthAgo).fetchAll();

//     // Delete the fetched notifications
//     for (const notification of notificationsToDelete.models) {
//       await notification.destroy();
//     }

//     console.log('Automatic deletion of notifications completed.');
//   } catch (err) {
//     console.error('Error during automatic deletion:', err);
//   }
// });




