const InternshipDetails = require("../models/internshipModel");
const Approval = require("../models/approvalModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { sendEmail } = require("../utils/mail");
const { saveFile } = require("../utils/saveFiles");
const Student = require("../models/studentModel");
const Staff = require("../models/staffModel");
const File = require("../models/fileModel");
const fs = require("fs");
const { generateInternshipDetails } = require("../utils/pdfGenerator");
const moment = require("moment");
const cron = require("node-cron");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

exports.checkCompletionStatus = catchAsync(async (req, res) => {
  let student_id;
  if (req.user.roles.includes("student")) {
    student_id = req.user.id;
  } else {
    student_id = req.params.id;
  }
  if (!student_id) throw new AppError("Student id missing", 404);

  const internships = await InternshipDetails.where({
    student_id: student_id,
  }).fetchAll();

  for (const internship of internships) {
    // Access the specific detail of each internship
    if (internship.get("internship_status") === "Not Completed") {
      const err = new AppError("Previous internship not completed", 400);
      err.sendResponse(res);
    }
  }

  return res.status(200).json({
    status: "success",
  });
});

exports.registerInternship = catchAsync(async (req, res) => {
  try {
    // Retrieve the submitted data from the request body
    let {
      company_name,
      company_address,
      company_ph_no,
      current_cgpa,
      cin_gst_udyog,
      cin_gst_udyog_no,
      academic_year,
      industry_supervisor_name,
      industry_supervisor_ph_no,
      industry_supervisor_email,
      mode_of_intern,
      starting_date,
      no_of_days,
      location,
      domain,
      student_id, // This is for internships registering by Staffs
    } = req.body;
    const approval_status = "Not Approved";
    const internship_status = "Not Completed";

    if (
      !company_name ||
      !company_address ||
      !company_ph_no ||
      !current_cgpa ||
      !cin_gst_udyog_no ||
      !cin_gst_udyog ||
      !academic_year ||
      !industry_supervisor_name ||
      !industry_supervisor_email ||
      !industry_supervisor_ph_no ||
      !mode_of_intern ||
      !starting_date ||
      !no_of_days ||
      !location ||
      !domain
    ) {
      throw new AppError("All fields are required", 400);
    }
    const newstarting_date = new Date(starting_date);
    const ending_date = new Date(newstarting_date);
    ending_date.setDate(ending_date.getDate() + no_of_days);

    if (mode_of_intern === "online") {
      no_of_days /= 2;
    }

    //special case
    if (req.user.roles.includes("student")) {
      const student = await Student.where({ id: req.user.id }).fetch();
      console.log(student.get("total_days_internship") + +no_of_days);
      if (student.get("total_days_internship") + +no_of_days > 45) {
        res.status(400).json({
          status: "failed",
          message: "Internship Days Exceeded",
        });
        return;
      }
      student_id = req.user.id;
    } else {
      if (!student_id) throw new AppError("All fields are required", 400);
    }
    const internships = await InternshipDetails.where({
      student_id: student_id,
    }).fetchAll();

    for (const internship of internships) {
      // Access the specific detail of each internship
      if (internship.get("internship_status") === "Not Completed") {
        throw new AppError("Previous internship not completed", 400);
      }
    }

    const student = await Student.where({ id: student_id }).fetch();
    const { buffer, mimetype, originalname } = req.file;
    const fileName = `${student.get(
      "student_id"
    )}_${company_name}_offer_letter`;

    const offer_letter = await saveFile(
      buffer,
      mimetype,
      fileName,
      originalname
    );
    const certificate = null;
    // Create a new instance of the InternshipDetails model
    const internshipDetails = new InternshipDetails({
      company_name,
      company_address,
      company_ph_no,
      current_cgpa,
      cin_gst_udyog,
      cin_gst_udyog_no,
      academic_year,
      industry_supervisor_name,
      industry_supervisor_ph_no,
      industry_supervisor_email,
      mode_of_intern,
      starting_date: newstarting_date,
      ending_date,
      no_of_days,
      location,
      domain,
      student_id,
      approval_status,
      internship_status,
      offer_letter,
      certificate,
    });

    // Save the internship details to the database
    await internshipDetails.save();
    const id = internshipDetails.get("id");

    const approval = new Approval({
      internship_id: id,
    });
    await approval.save();

    // const staff = await Staff.where({id: student.get('staff_id')}).fetch();

    // await sendEmail(staff.get('email'), "Internship Approval - " + student.get('name')
    //     , "Internship Registered by:\n " + student.get('name') + "\n\n"
    //     + "Approve To Proceed\n\n\n\nThis is a auto generated mail. Do Not Reply");

    // Send a success response

    res.status(201).json({
      status: "success",
      message: "Internship details registered successfully",
      data: {
        internshipDetails,
      },
    });
  } catch (err) {
    // Handle any errors that occur during the process
    const error = new AppError(err.message, 400);
    error.sendResponse(res);
    throw err;
  }
});

exports.uploadCompletionForm = catchAsync(async (req, res) => {
  try {
    const id = req.params.id;
    const internship = await InternshipDetails.where({ id: id }).fetch();
    const student = await Student.where({
      id: internship.get("student_id"),
    }).fetch();

    const { certificate, attendance, feedback } = req.files;
    const {
      buffer: certificateBuffer,
      mimetype: certificateMimetype,
      originalname: certificate_Original,
    } = certificate[0];
    const certificateFileName = `${student.get("student_id")}_${internship.get(
      "company_name"
    )}_${new Date()}_certificate_of_completion`;
    const certificateId = await saveFile(
      certificateBuffer,
      certificateMimetype,
      certificateFileName,
      certificate_Original
    );

    // const { buffer: attendanceBuffer, mimetype: attendanceMimetype, originalname: attendance_Original } = attendance[0];
    // const attendanceFileName = `${student.get('student_id')}_${internship.get('company_name')}_${new Date()}_attendance`;
    // const attendanceId = await saveFile(attendanceBuffer, attendanceMimetype, attendanceFileName, attendance_Original);

    // const { buffer: feedbackBuffer, mimetype: feedbackMimetype, originalname: feedback_Original } = feedback[0];
    // const feedbackFileName = `${student.get('student_id')}_${internship.get('company_name')}_${new Date()}_feedback`;
    // const feedbackId = await saveFile(feedbackBuffer, feedbackMimetype, feedbackFileName, feedback_Original);

    await InternshipDetails.findByIdAndUpdate(req.params.id, {
      certificate: certificateId,
      // attendance: attendanceId,
      // feedback: feedbackId,
      internship_status: "Completed",
    });
    student.set({
      total_days_internship:
        student.get("total_days_internship") + internship.get("no_of_days"),
    });
    await student.save();

    res.status(201).json({
      status: "success",
      message: "Internship documents uploaded successfully",
    });
  } catch (err) {
    const error = new AppError(err.message, 400);
    error.sendResponse(res);
  }
});

exports.viewInternship = catchAsync(async (req, res) => {
  try {
    const internshipId = req.params.id;

    // Fetch the internship details using the provided internshipId
    const internshipDetails = await InternshipDetails.where({
      id: internshipId,
    }).fetch();

    if (!internshipDetails) {
      throw new AppError("Internship details not found", 404);
    }

    // You can customize the response format according to your needs
    const responseData = {
      status: "success",
      message: "Internship details retrieved successfully",
      data: {
        internshipDetails,
      },
    };

    // Send the response
    res.status(200).json(responseData);
  } catch (err) {
    const error = new AppError(err.message, 500);
    error.sendResponse(res);
  }
});

exports.viewInternships = catchAsync(async (req, res) => {
  try {
    const loggedInStaffId = req.user.id;
    const loggedInStaffRole = req.user.roles; // Role of the logged-in staff member
    const loggedInStaffSecSit = req.user.sec_sit; // SEC or SIT value for the logged-in staff
    const isCEOOrTapCell =
      loggedInStaffRole.includes("ceo") ||
      loggedInStaffRole.includes("tapcell");
    const isPrincipal = loggedInStaffRole.includes("principal");
    const isHODOrCoordinator =
      loggedInStaffRole.includes("hod") ||
      loggedInStaffRole.includes("internshipcoordinator");
    const isMentor = loggedInStaffRole.includes("mentor");
    let students;
    if (isCEOOrTapCell) {
      // Fetch all students from the database
      students = await Student.fetchAll({ withRelated: "skills" });
    } else if (isPrincipal) {
      // Fetch all students from the same SEC or SIT as the Principal
      students = await Student.where({ sec_sit: loggedInStaffSecSit }).fetchAll(
        {
          withRelated: "skills",
        }
      );
    } else if (isHODOrCoordinator) {
      // Fetch all students from the same department as the HOD or Coordinator
      const department = req.user.department;

      students = await Student.where({
        department: department,
        sec_sit: loggedInStaffSecSit,
      }).fetchAll({ withRelated: "skills" });
    } else if (isMentor) {
      // Fetch all students from the staff id (mentor)

      students = await Student.where({
        staff_id: loggedInStaffId,
      }).fetchAll({ withRelated: "skills" });
    } else {
      throw new AppError("Unauthorised access to view multiple students", 403);
    }
    if (!students || students.length === 0) {
      throw new AppError("No Student found in the database", 404);
    }

    const processedStudents = students.map(async (student) => {
      // Copy student attributes to a new object
      const processedStudent = { ...student.attributes };

      // Exclude specific fields
      const excludedFields = ["registered_date", "password", "staff_id"];
      for (const field of excludedFields) {
        delete processedStudent[field];
      }

      // Fetch mentor details using staff_id from the student table
      const mentorId = student.get("staff_id");
      const mentor = await Staff.where({ id: mentorId }).fetch();
      processedStudent.mentor_name = mentor.get("name");

      // Process skills
      processedStudent.skills = student
        .related("skills")
        .map((skill) => skill.get("skill_name"));

      return processedStudent;
    });

    // Wait for all student processing to complete
    const finalProcessedStudents = await Promise.all(processedStudents);

    let internships = [];

    await Promise.all(
      finalProcessedStudents.map(async (student) => {
        const internshipDetails = await InternshipDetails.where({
          student_id: student.id,
        }).fetchAll();

        // Map each internship detail to a data object
        const data = internshipDetails.map((internship) => ({
          ...internship.attributes,
          student,
        }));

        // Concatenate the data array to the internships array
        internships = internships.concat(data);
      })
    );

    const responseData = {
      status: "success",
      message: "Internship details retrieved successfully",
      data: {
        internships,
      },
    };

    // Send the response
    res.status(200).json(responseData);
  } catch (err) {
    const error = new AppError(err.message, 500);
    error.sendResponse(res);
  }
});

exports.updateInternship = catchAsync(async (req, res) => {
  try {
    const internshipId = req.params.id;
    const updatedData = req.body;
    let internship = await InternshipDetails.where({
      id: req.params.id,
    }).fetch();

    if (
      internship.get("internship_status") === "Approved" &&
      req.user.roles.includes("student")
    ) {
      res.status(400).json({
        status: "fail",
        message: "Internship details cant be updated",
      });
      return;
    }
    // Find the internship in the database based on the provided ID
    internship = await InternshipDetails.findByIdAndUpdate(
      internshipId,
      updatedData,
      {
        new: true, // Return the updated document
        runValidators: true, // Run the validation on the updated fields
        tableName: "internships", // Specify the table name
      }
    );
    const student = await Student.where({
      id: internship.get("student_id"),
    }).fetch();

    const { certificate, offer_letter } = req.files;
    let offer_letterId, certificateId, attendanceId, feedbackId;
    offer_letterId = internship.get("offer_letter");
    certificateId = internship.get("certificate");
    // attendanceId = internship.get('attendance');
    // feedbackId = internship.get('feedback');
    if (offer_letter) {
      const {
        buffer: offer_letterBuffer,
        mimetype: offer_letterMimetype,
        originalname: offer_letterOriginal,
      } = offer_letter[0];
      const offer_letterFileName = `${student.get(
        "student_id"
      )}_${internship.get("company_name")}_offer_letter`;
      offer_letterId = await saveFile(
        offer_letterBuffer,
        offer_letterMimetype,
        offer_letterFileName,
        offer_letterOriginal
      );
      const file = await File.where({
        id: internship.get("offer_letter"),
      }).fetchAll();
      if (file.length === 1) {
        await file.models[0].destroy();
      }
    }
    if (certificate) {
      const {
        buffer: certificateBuffer,
        mimetype: certificateMimetype,
        originalname: certificate_Original,
      } = certificate[0];
      const certificateFileName = `${student.get(
        "student_id"
      )}_${internship.get("company_name")}_certificate_of_completion`;
      certificateId = await saveFile(
        certificateBuffer,
        certificateMimetype,
        certificateFileName,
        certificate_Original
      );
      const file = await File.where({
        id: internship.get("certificate"),
      }).fetchAll();
      if (file.length === 1) {
        await file.models[0].destroy();
      }
    }
    // if (attendance) {
    //     const {
    //         buffer: attendanceBuffer,
    //         mimetype: attendanceMimetype,
    //         originalname: attendance_Original
    //     } = attendance[0];
    //     const attendanceFileName = `${student.get('student_id')}_${internship.get('company_name')}_attendance`;
    //     attendanceId = await saveFile(attendanceBuffer, attendanceMimetype, attendanceFileName, attendance_Original);
    //     const file = await File.where({id: internship.get('attendance')}).fetchAll();
    //     if (file.length ===1) {
    //         await file.models[0].destroy();
    //     }
    // }
    // if (feedback) {
    //     const {buffer: feedbackBuffer, mimetype: feedbackMimetype, originalname: feedback_Original} = feedback[0];
    //     const feedbackFileName = `${student.get('student_id')}_${internship.get('company_name')}_feedback`;
    //     feedbackId = await saveFile(feedbackBuffer, feedbackMimetype, feedbackFileName, feedback_Original);
    //     const file = await File.where({id: internship.get('feedback')}).fetchAll();
    //     if (file.length ===1) {
    //         await file.models[0].destroy();
    //     }
    // }
    internship = await InternshipDetails.findByIdAndUpdate(req.params.id, {
      certificate: certificateId,
      // attendance: attendanceId,
      // feedback: feedbackId,
      offer_letter: offer_letterId,
    });

    if (!internship) {
      // If the internship with the provided ID is not found, return an error response
      return res.status(404).json({
        status: "fail",
        message: "Internship not found",
      });
    }
    // Send a success response
    res.status(200).json({
      status: "success",
      message: "Internship details updated successfully",
      data: {
        internship,
      },
    });
  } catch (err) {
    // Handle any errors that occur during the process
    const error = new AppError(err.message, 400);
    error.sendResponse(res);
  }
});

exports.deleteInternship = catchAsync(async (req, res) => {
  try {
    const internshipId = req.params.id;

    // Find the internship in the database based on the provided ID
    await InternshipDetails.findByIdAndDelete(internshipId, {
      tableName: "internships",
    });

    // Send a success response
    res.status(200).json({
      status: "success",
      message: "Internship deleted successfully",
    });
  } catch (err) {
    // Handle any errors that occur during the process
    const error = new AppError(err.message, 400);
    error.sendResponse(res);
  }
});

// cron.schedule('22 20 * * *', async () => {
//     try {
//         // Fetch internships that need to be deleted based on the specified conditions
//         const internshipsToDelete = await InternshipDetails.query((qb) => {
//             qb.leftJoin('students', 'internships.student_id', 'students.id')
//                 .where((builder) => {
//                     // Conditions to delete internships
//                     builder.where('students.id', null) // If the student is deleted in the student table
//                         .orWhere('approval_status', 'rejected') // If the approval is rejected
//                         .orWhere((subQuery) => {
//                             // If the internship is incomplete (failed to submit attendance or certificate file within 30 days)
//                             subQuery.where('certificate', null).andWhereRaw('DATEDIFF(ending_date, CURDATE()) >= 30');
//                         });
//                 })
//         }).fetchAll();
//
//         // Perform the deletion of the fetched internships
//         for (const internship of internshipsToDelete) {
//             await InternshipDetails.findByIdAndDelete(internship.id, {tableName: 'internships'});
//             console.log(`Deleted internship with ID ${internship.id}`);
//         }
//
//         console.log(`Deleted ${internshipsToDelete.length} internships.`);
//     } catch (error) {
//         console.error('Error deleting internships:', error);
//     }
// });

exports.approveInternship = catchAsync(async (req, res) => {
  try {
    const internship = await InternshipDetails.where({
      id: req.params.id,
    }).fetch();
    const student = await Student.where({
      id: internship.get("student_id"),
    }).fetch();
    const approval = await Approval.where({
      internship_id: req.params.id,
    }).fetch();
    if (req.params.role === "mentor") {
      if (approval.get("mentor") === 1) {
        const error = new AppError("Mentor already Approved", 400);
        error.sendResponse(res);
        return;
      }
      approval.set({
        mentor: true,
        mentor_id: req.user.id,
        mentor_approved_at: new Date(),
      });
      if (approval.get("comments_by_Role") === "mentor") {
        approval.set({
          comments: null,
          comments_by_id: null,
          comments_by_Role: null,
          commented_at: null,
        });
      }
      await approval.save();

      // const staffs = await Staff.where(
      //    { department: student.get('department'),
      //     sec_sit: student.get('sec_sit')
      // }).fetchAll({withRelated:'roles'});
      // const filteredStaffs = staffs.filter(staff => {
      //     const roles = staff.related('roles').pluck('role_name');
      //     return roles.includes('internshipcoordinator');
      //   });
      // const staffs = await Staff.query((qb) => {
      //     qb.where({
      //       department: student.get('department'),
      //       sec_sit: student.get('sec_sit')
      //     }).innerJoin('staff_roles', 'staffs.id', 'staff_roles.staff_id')
      //       .innerJoin('roles', 'staff_roles.role_id', 'roles.id')
      //       .where('roles.role_name', 'internshipcoordinator');
      //   }).fetchAll();
      // const staffEmails = staffs.map(staffMember => staffMember.get('email'));
      // for (const email of staffEmails) {
      //     await sendEmail(email, "Internship Approval - " + student.get('name')
      //         , "Internship Registered by:\n " + student.get('name') + "\n\n"
      //         + "Approve To Proceed\n\n\n\nThis is a auto generated mail. Do Not Reply");
      //
      // }
      res.status(200).json({
        status: "success",
        message: "Mentor - approved",
      });
    } else if (
      req.params.role === "internshipcoordinator" &&
      approval.get("mentor")
    ) {
      if (approval.get("internshipcoordinator") === 1) {
        const error = new AppError(
          "Internship Coordinator already Approved",
          400
        );
        error.sendResponse(res);
        return;
      }
      approval.set({
        internshipcoordinator: true,
        internshipcoordinator_id: req.user.id,
        internshipcoordinator_approved_at: new Date(),
      });
      if (approval.get("comments_by_Role") === "internshipcoordinator") {
        approval.set({
          comments: null,
          comments_by_id: null,
          comments_by_Role: null,
          commented_at: null,
        });
      }
      await approval.save();
      // const staffs = await Staff.query((qb) => {
      //     qb.where({
      //       department: student.get('department'),
      //       sec_sit: student.get('sec_sit')
      //     }).innerJoin('staff_roles', 'staffs.id', 'staff_roles.staff_id')
      //       .innerJoin('roles', 'staff_roles.role_id', 'roles.id')
      //       .where('roles.role_name', 'hod');
      //   }).fetchAll();
      // const staffEmails = staffs.map(staffMember => staffMember.get('email'));
      // for (const email of staffEmails) {
      //     await sendEmail(email, "Internship Approval - " + student.get('name')
      //         , "Internship Registered by:\n " + student.get('name') + "\n\n"
      //         + "Approve To Proceed\n\n\n\nThis is a auto generated mail. Do Not Reply");
      //
      // }
      res.status(200).json({
        status: "success",
        message: "Internship Coordinator - approved",
      });
    } else if (
      req.params.role === "hod" &&
      approval.get("mentor") &&
      approval.get("internshipcoordinator")
    ) {
      if (approval.get("hod") === 1) {
        const error = new AppError("HOD already Approved", 400);
        error.sendResponse(res);
        return;
      }
      approval.set({
        hod: true,
        hod_id: req.user.id,
        hod_approved_at: new Date(),
      });
      if (approval.get("comments_by_Role") === "hod") {
        approval.set({
          comments: null,
          comments_by_id: null,
          comments_by_Role: null,
          commented_at: null,
        });
      }
      await approval.save();

      // const staffs = await Staff.query((qb) => {qb
      //     .innerJoin('staff_roles', 'staffs.id', 'staff_roles.staff_id')
      //     .innerJoin('roles', 'staff_roles.role_id', 'roles.id')
      //     .where('roles.role_name', 'tapcell');
      // }).fetchAll();
      //
      // const staffEmails = staffs.map(staffMember => staffMember.get('email'));
      // for (const email of staffEmails) {
      //     await sendEmail(email, "Internship Approval - " + student.get('name')
      //         , "Internship Registered by:\n " + student.get('name') + "\n\n"
      //         + "Approve To Proceed\n\n\n\nThis is a auto generated mail. Do Not Reply");
      //
      // }
      res.status(200).json({
        status: "success",
        message: "HOD - approved",
      });
    } else if (
      req.params.role === "tapcell" &&
      approval.get("mentor") &&
      approval.get("internshipcoordinator") &&
      approval.get("hod")
    ) {
      if (approval.get("tapcell") === 1) {
        const error = new AppError("tapcell already Approved", 400);
        error.sendResponse(res);
        return;
      }
      approval.set({
        tapcell: true,
        tapcell_id: req.user.id,
        tapcell_approved_at: new Date(),
      });
      if (approval.get("comments_by_Role") === "tapcell") {
        approval.set({
          comments: null,
          comments_by_id: null,
          comments_by_Role: null,
          commented_at: null,
        });
      }
      await approval.save();

      // const staffs = await Staff.query((qb) => {
      //     qb.where({
      //       sec_sit: student.get('sec_sit')
      //     }).innerJoin('staff_roles', 'staffs.id', 'staff_roles.staff_id')
      //       .innerJoin('roles', 'staff_roles.role_id', 'roles.id')
      //       .where('roles.role_name', 'principal');
      //   }).fetchAll();
      // const staffEmails = staffs.map(staffMember => staffMember.get('email'));
      // for (const email of staffEmails) {
      //     await sendEmail(email, "Internship Approval - " + student.get('name')
      //         , "Internship Registered by:\n " + student.get('name') + "\n\n"
      //         + "Approve To Proceed\n\n\n\nThis is a auto generated mail. Do Not Reply");
      //
      // }
      // await sendEmail(
      //   student.get("email"),
      //   "Internship Approved - " + student.get("name"),
      //   student.get("name") +
      //     " Congratulations!! Your internship is approved successfully\n\n\n\nThis is a auto generated mail. Do Not Reply"
      // );

      res.status(200).json({
        status: "success",
        message: "Tap Cell - approved",
      });
    } else if (
      req.params.role === "principal" &&
      approval.get("mentor") &&
      approval.get("internshipcoordinator") &&
      approval.get("hod") &&
      approval.get("tapcell")
    ) {
      if (approval.get("principal") === 1) {
        const error = new AppError("Principal already Approved", 400);
        error.sendResponse(res);
        return;
      }
      approval.set({
        principal: true,
        principal_id: req.user.id,
        principal_approved_at: new Date(),
      });
      if (approval.get("comments_by_Role") === "principal") {
        approval.set({
          comments: null,
          comments_by_id: null,
          comments_by_Role: null,
          commented_at: null,
        });
      }
      await approval.save();
      //     await sendEmail(student.get("email"), "Internship Approved - " + student.get('name'),
      //         student.get('name') + " Congratulations!! Your internship is approved successfully\n\n\n\nThis is a auto generated mail. Do Not Reply");
      //
      res.status(200).json({
        status: "success",
        message: "Principal - approved",
      });
      internship.set({ approval_status: "Approved" });
      await internship.save();
    } else {
      res.status(400).json({
        status: "fail",
        message: "You cant approve the internship right now",
      });
    }
  } catch (err) {
    // Handle any errors that occur during the process
    const error = new AppError(err.message, 400);
    error.sendResponse(res);
  }
});

exports.sendBack = catchAsync(async (req, res) => {
  try {
    // const internship = await InternshipDetails.where({id: req.params.id}).fetch();
    const approval = await Approval.where({
      internship_id: req.params.id,
    }).fetch();
    const internship = await InternshipDetails.where({
      id: req.params.id,
    }).fetch();
    const comments = req.body.comments;
    approval.set({
      comments: comments,
      comments_by_id: req.user.id,
      comments_by_Role: req.params.role,
      commented_at: new Date(),
    });
    internship.set({ approval_status: "Sent Back" });
    await internship.save();
    await approval.save();
    res.status(200).json({
      status: "success",
      message: "Comment Added and Sent Back",
    });
  } catch (err) {
    // Handle any errors that occur during the process
    const error = new AppError(err.message, 400);
    error.sendResponse(res);
  }
});

exports.getApprovalStatus = catchAsync(async (req, res) => {
  try {
    const approval = await Approval.where({
      internship_id: req.params.id,
    }).fetch();
    const approval_status = {
      mentor: approval.get("mentor"),
      internshipcoordinator: approval.get("internshipcoordinator"),
      hod: approval.get("hod"),
      tap_cell: approval.get("tapcell"),
      principal: approval.get("principal"),
      comments: approval.get("comments"),
      commentsBy: approval.get("comments_by_Role"),
      rejectedBy: approval.get("rejected_by_Role"),
    };
    res.status(200).json({
      status: "success",
      data: {
        approval_status,
      },
    });
  } catch (e) {
    const error = new AppError(e.message, 400);
    error.sendResponse(res);
  }
});

exports.reject = catchAsync(async (req, res) => {
  try {
    // const internship = await InternshipDetails.where({id: req.params.id}).fetch();
    const approval = await Approval.where({
      internship_id: req.params.id,
    }).fetch();
    const internship = await InternshipDetails.where({
      id: req.params.id,
    }).fetch();
    const comments = req.body.comments;

    approval.set({
      comments: comments,
      comments_by_id: req.user.id,
      comments_by_Role: req.params.role,
      rejected_by_Role: req.params.role,
      rejected_by_id: req.user.id,
      commented_at: new Date(),
    });

    internship.set({
      approval_status: "Rejected",
      internship_status: "Rejected",
    });
    await internship.save();
    await approval.save();
    res.status(200).json({
      status: "success",
      message: "Rejected",
    });
  } catch (err) {
    // Handle any errors that occur during the process
    const error = new AppError(err.message, 400);
    error.sendResponse(res);
  }
});

exports.downloadReport = catchAsync(async (req, res) => {
  try {
    const internship = await InternshipDetails.where({
      id: req.params.id,
    }).fetch();
    const approval = await Approval.where({
      internship_id: req.params.id,
    }).fetch();
    const student = await Student.where({
      id: internship.get("student_id"),
    }).fetch();
    const path = await generateInternshipDetails(internship, student, approval);
    await sleep(1000);
    const pdfBuffer = fs.readFileSync(path);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="document.pdf"');
    res.send(pdfBuffer);
  } catch (e) {
    const err = new AppError(e.message, 404);
    err.sendResponse(res);
  }
});

exports.downloadFiles = catchAsync(async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = await File.where({ id: fileId }).fetch();

    if (!file) {
      return res.status(404).json({
        status: "error",
        message: "File not found",
      });
    }

    const fileName = file.get("file_name");
    const fileData = file.get("file");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("content-disposition", `attachment; filename="${fileName}"`);
    res.send(fileData);
  } catch (err) {
    const e = new AppError(err.message, 500);
    e.sendResponse(res);
  }
});
