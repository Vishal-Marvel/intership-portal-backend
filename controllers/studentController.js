const Student = require("../models/studentModel");
const Skill = require("../models/skillModel");
const InternshipDetails = require("../models/internshipModel");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const File = require("../models/fileModel");
const { savePhoto } = require("../utils/saveFiles");
const Staff = require("../models/staffModel");
function unpick(object, fieldsToUnpick) {
  const newObject = { ...object }; // Create a shallow copy of the object

  for (const field of fieldsToUnpick) {
    delete newObject[field];
  }

  return newObject;
}

exports.updateStudent = catchAsync(async (req, res) => {
  try {
    const studentId = req.user.id;
    const { name, year_of_studying, batch, section, phone_no, skills } =
      req.body;

    let profile_photo;
    if (req.file) {
      // Create a new record in the "files" table to store the new photo
      const { buffer, mimetype, originalname } = req.file;
      const fileName = `${name}_profile_photo`; // Append the unique suffix to the file name

      // Delete the existing profile photo if it exists and not a default photo
      const existingStudent = await Student.where({ id: studentId }).fetch();
      const existingProfilePhotoId = existingStudent.get("profile_photo");

      // Retrieve the default profile photo ID from the files table
      const defaultProfilePhoto = await File.where({
        file_name: "default_profile_photo",
      }).fetch();
      const defaultProfilePhotoId = defaultProfilePhoto.get("id");

      if (
        existingProfilePhotoId !== defaultProfilePhotoId &&
        existingProfilePhotoId
      ) {
        await File.where({ id: existingProfilePhotoId }).destroy();
      }
      // Update the profile_photo field with the new photo ID
      profile_photo = await savePhoto(buffer, mimetype, fileName, originalname);
    }
    const updatedData = {
      name,
      year_of_studying,
      batch,
      section,
      phone_no,
      profile_photo,
    };
    const student = await Student.findByIdAndUpdate(studentId, updatedData, {
      new: true,
      runValidators: true,
      tableName: "students",
    });

    if (!student) {
      const err = new AppError("Student not found", 404);
      err.sendResponse(res);
      return;
    }
    let skillArr;
    if (!Array.isArray(skills)) {
      skillArr = skills.split(",").map((skill) => skill.trim());
    } else {
      skillArr = skills;
    }
    const existingSkills = await student.related("skills").pluck("id");
    const skillsToDelete = existingSkills.filter(
      (skill_id) => !skillArr.includes(skill_id)
    );
    const skillsToAdd = skillArr.filter(
      (skill_id) => !existingSkills.includes(skill_id)
    );
    // console.log(existingSkills, skillsToDelete, skillsToAdd);
    const allSkills = await Skill.fetchAll();
    const skillNames = allSkills.map((skill) => skill.get("id"));
    const errors = [];

    skillsToAdd.forEach((skill) => {
      if (!skillNames.includes(skill)) {
        errors.push(`${skill} Not Found`);
      }
    });
    if (errors.length > 0) {
      const err = new AppError(errors, 404);
      err.sendResponse(res);
      return;
    }
    // const skillsToDeleteObj = await Promise.all(
    //   skillsToDelete.map(
    //     async (skill) => await Skill.where({ id: skill }).fetch()
    //   )
    // );
    // const skillsToAddObj = await Promise.all(
    //   skillsToAdd.map(
    //     async (skill) => await Skill.where({ id: skill }).fetch()
    //   )
    // );
    // const skillsToDeleteIds = skillsToDeleteObj.map((skill) => skill.get("id"));
    // const skillsToAddIds = skillsToAddObj.map((skill) => skill.get("id"));

    await student.skills().detach(skillsToDelete);

    await student.skills().attach(skillsToAdd);

    await Student.forge({
      id: studentId,
    }).fetch({ withRelated: "skills" });

    res.status(200).json({
      status: "success",
      message: "Student details and skills updated successfully",
    });
  } catch (err) {
    if (err.message === "EmptyResponse") {
      const error = new AppError("Student Not Found", 404);
      error.sendResponse(res);
    } else {
      throw err;
      const error = new AppError(err.message, 500);
      error.sendResponse(res);
    }
  }
});

exports.updateStudentByStaff = catchAsync(async (req, res) => {
  try {
    const studentId = req.params.id;
    const {
      name,
      year_of_studying,
      phone_no,
      batch,
      section,
      placement_status,
      placed_company,
    } = req.body;
    const updatedData = {
      name,
      year_of_studying,
      batch,
      section,
      phone_no,
      placement_status,
      placed_company,
    };
    const student = await Student.findByIdAndUpdate(studentId, updatedData, {
      new: true,
      runValidators: true,
      tableName: "students",
    });

    if (!student) {
      const err = new AppError("Student not found", 404);
      err.sendResponse(res);
      return;
    }

    const updatedStudentWithSkills = await Student.where({
      id: studentId,
    }).fetch({ withRelated: "skills" });

    res.status(200).json({
      status: "success",
      message: "Student details updated successfully",
    });
  } catch (err) {
    if (err.message === "EmptyResponse") {
      const error = new AppError("Student Not Found", 404);
      error.sendResponse(res);
    } else {
      const error = new AppError(err.message, 500);
      error.sendResponse(res);
    }
  }
});

exports.deleteStudent = catchAsync(async (req, res) => {
  try {
    const studentId = req.params.id;

    // Find the student in the database based on the provided ID
    await Student.findByIdAndDelete(studentId, { tableName: "students" });

    // Send a success response
    res.status(200).json({
      status: "success",
      message: "Student details deleted successfully",
    });
  } catch (err) {
    if (err.message === "EmptyResponse") {
      const error = new AppError("Student Not Found", 404);
      error.sendResponse(res);
    } else {
      const error = new AppError(err.message, 500);
      error.sendResponse(res);
    }
  }
});

exports.viewStudent = catchAsync(async (req, res) => {
  try {
    const loggedInUserId = req.user.id;
    const loggedInUserRole = req.user.roles;
    const isHOD = loggedInUserRole.includes("hod");
    const isPrincipal = loggedInUserRole.includes("principal");
    const isInternshipCoordinator = loggedInUserRole.includes(
      "internshipcoordinator"
    );
    const isStudent = loggedInUserRole.includes("student");
    const isMentor = loggedInUserRole.includes("mentor");
    const isCeo = loggedInUserRole.includes("ceo");
    let studentId;

    if (isStudent) {
      studentId = loggedInUserId;
    } else if (!req.params.id) {
      const err = new AppError("Student Id is required", 403);
      err.sendResponse(res);
      return;
    } else {
      studentId = req.params.id; // ID of the student to view
    }
    // Fetch the student from the database based on the studentId
    const student = await Student.where({ id: studentId }).fetch({
      withRelated: "skills",
    });
    const mentor_details = await Staff.where({
      id: student.get("staff_id"),
    }).fetch();
    const mentor_name = mentor_details.get("name");
    let unpickfields = student.toJSON();
    if (student) {
      unpickfields = unpick(unpickfields, [
        "registered_date",
        "password",
        "staff_id",
      ]);
    }

    // Transform the skills array to only include skill names
    const transformedSkills = unpickfields.skills.map(
      (skill) => ({id: skill.id,name:skill.skill_name})
    );

    if (
      isStudent ||
      isHOD ||
      isPrincipal ||
      isInternshipCoordinator ||
      isMentor ||
      isCeo
    ) {
      // Return the student details
      return res.status(200).json({
        status: "success",
        data: {
          student: {
            ...unpickfields,
            mentor_name,
            skills: transformedSkills,
          },
        },
      });
    } else {
      const err = new AppError("Unauthorised access", 403);
      err.sendResponse(res);
    }
  } catch (err) {
    if (err.message === "EmptyResponse") {
      const err1 = new AppError("Student Not Found", 404);
      err1.sendResponse(res);
    } else {
      // Handle any errors that occur during the process
      const err1 = new AppError("Failed to fetch student details", 500);
      err1.sendResponse(res);
    }
  }
});

exports.getProfilePhoto = catchAsync(async (req, res) => {
  try {
    const file = await File.where({ id: req.params.id })
      .fetch()
      .catch((err) => {
        if (err.message === "EmptyResponse") {
          throw new AppError("Image not Found", 404);
        }
      });
    const longblobData = file.get("file");
    return res.status(200).json({ image: longblobData.toString("base64") });
  } catch (e) {
    const er = new AppError(e.message, 500);
    er.sendResponse(res);
  }
});

exports.viewStudentInternship = catchAsync(async (req, res) => {
  try {
    let id;
    if (req.user.roles.includes("student")) {
      id = req.user.id;
    }else{
      id = req.params.id;
    }
    // Fetch the internship details using the provided internshipId
    const student = await Student.where({
      id,
    }).fetch();
    const internshipDetails = await InternshipDetails.where({
      student_id: id,
    }).fetchAll();

    if (!internshipDetails && internshipDetails.length === 0) {
      throw new AppError("Internship details not found", 404);
    }
    const internships = internshipDetails.map((internship) => ({
      ...internship.attributes,
      student,
    }));

    // You can customize the response format according to your needs
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
