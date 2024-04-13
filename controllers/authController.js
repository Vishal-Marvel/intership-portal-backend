const Student = require("../models/studentModel");
const Staff = require("../models/staffModel");
const Role = require("../models/roleModel");
const Skill = require("../models/skillModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const jwt = require("jsonwebtoken");
const ExcelJS = require("exceljs");
const File = require("../models/fileModel");
const { sendEmail } = require("../utils/mail");
const { savePhoto } = require("../utils/saveFiles");
const { apigateway } = require("googleapis/build/src/apis/apigateway");

const validateRoleAssignment = (role, data) => {
  const rolesWithDepartment = ["mentor", "internship_coordinator", "hod"];
  const rolesWithSecSit = [
    "mentor",
    "internship_coordinator",
    "hod",
    "principal",
  ];

  if (rolesWithDepartment.includes(role)) {
    if (!data.department) {
      throw new AppError(
        `For Staff ${data.name} with role ${role}, Department is required for this role`,
        400
      );
    }
  }

  if (rolesWithSecSit.includes(role)) {
    if (!data.sec_sit) {
      throw new AppError(
        `For Staff ${data.name} with role ${role}, SEC / SIT is required for this role`,
        400
      );
    }
  }
};
const generateOTP = (length) => {
  const characters = "0123456789";
  let otp = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    otp += characters[randomIndex];
  }

  return otp;
};
// Signup function
exports.studentSignUp = catchAsync(async (req, res) => {
  try {
    const {
      name,
      sec_sit,
      student_id,
      year_of_studying,
      batch,
      register_num,
      department,
      section,
      email,
      phone_no,
      password,
      mentor_name,
      mentor_email,
      skills,
    } = req.body;

    if (
      !name ||
      !sec_sit ||
      !student_id ||
      !year_of_studying ||
      !batch ||
      !register_num ||
      !department ||
      !section ||
      !email ||
      !phone_no ||
      !password ||
      !mentor_name ||
      !mentor_email ||
      !skills
    ) {
      throw new AppError("All fields are required", 400);
    }

    const staff = await Staff.where({ email: mentor_email })
      .fetch()
      .then((staff) => {
        if (!staff) {
          throw new AppError(
            `Staff with mail '${mentor_email}' not Found`,
            404
          );
        } else {
          return staff;
        }
      });
    const staff_id = staff.get("id");
    await Student.query((qb) => {
      qb.where({ email: email }).orWhere({ student_id: student_id });
    })
      .fetch()
      .then((student) => {
        if (student) {
          throw new AppError("Student Already Exists", 400);
        }
      })
      .catch((err) => {
        if (err.message === "EmptyResponse") {
        } else {
          throw new AppError(err.message, 400);
        }
      });
    let profile_photo = "";
    if (req.file) {
      const { buffer, mimetype, originalname } = req.file;

      const fileName = `${student_id}_profile_photo`; // Append the unique suffix to the file name

      profile_photo = await savePhoto(buffer, mimetype, fileName, originalname);
    } else {
      const photo_file = await File.where({
        file_name: "default_profile_photo",
      }).fetch();
      profile_photo = photo_file.get("id");
    }
    const student = new Student({
      name,
      sec_sit,
      student_id,
      year_of_studying,
      batch,
      register_num,
      department,
      section,
      email,
      phone_no,
      password,
      staff_id,
      profile_photo,
    });
    // const allSkills = await Skill.fetchAll();
    // const skillNames = allSkills.map((skill) => skill.get("skill_name"));
    // const errors = [];
    // let skillArr;
    // if (!Array.isArray(skills)) {
    //   skillArr = skills.split(",").map((skill) => skill.trim());
    // } else {
    //   skillArr = skills;
    // }

    // skillArr.forEach((skill) => {
    //   if (!skillNames.includes(skill)) {
    //     errors.push(`${skill} skill Not Found`);
    //   }
    // });
    // if (errors.length > 0) {
    //   const err = new AppError(errors, 404);
    //   err.sendResponse(res);
    //   return;
    // }
    await student.save();
    // const skillObjs = await Promise.all(
    //   skillArr.map(
    //     async (skill) => await Skill.where({ skill_name: skill }).fetch()
    //   )
    // );
    // const skillIds = skillObjs.map((skill) => skill.get("id"));
    await student.skills().attach(skills);

    res.status(201).json({
      status: "success",
    });
  } catch (err) {
    // throw err
    const error = new AppError(err.message, 400);
    error.sendResponse(res);
  }
});

exports.staffSignup = catchAsync(async (req, res) => {
  try {
    const { faculty_id, name, department, email, sec_sit, phone_no, password } =
      req.body;

    if (!faculty_id || !name || !email || !phone_no || !password) {
      throw new AppError("All fields are required", 400);
    }
    Staff.query((qb) => {
      qb.where({ email: email }).orWhere({ faculty_id: faculty_id });
    })
      .fetch()
      .then((staff) => {
        if (staff) {
          throw new AppError(
            `Staff with mail ${email} or id ${faculty_id} already Exists`
          );
        }
      })
      .catch((err) => {
        if (err.message === "EmptyResponse") {
        } else {
          throw new AppError(err.message);
        }
      });

    let profile_photo;
    if (req.file) {
      const { buffer, mimetype, originalname } = req.file;

      const fileName = `${faculty_id}_profile_photo`; // Append the unique suffix to the file name

      profile_photo = await savePhoto(buffer, mimetype, fileName, originalname);
    } else {
      const photo_file = await File.where({
        file_name: "default_profile_photo",
      }).fetch();
      profile_photo = photo_file.get("id");
    }
    const staff = new Staff({
      faculty_id,
      name,
      department,
      email,
      sec_sit,
      phone_no,
      password,
      profile_photo,
    });
    await staff.save();

    res.status(201).json({
      status: "success",
    });
  } catch (err) {
    const error = new AppError(err.message, 400);
    error.sendResponse(res);
  }
});

exports.multipleStaffSignup = catchAsync(async (req, res) => {
  try {
    if (!req.file) {
      const error = new AppError("No Excel file uploaded", 400);
      error.sendResponse(res);
    }

    const photo_file = await File.where({
      file_name: "default_profile_photo",
    }).fetch();
    const default_profile_id = photo_file.get("id");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);
    const staffList = [];
    let errors = [];
    const staffRole = new Map();
    const roleObjsMap = new Map(); // To store fetched role objects using role_name as key

    worksheet.eachRow(async (row, rowNumber) => {
      try {
        if (rowNumber > 1) {
          const [
            _,
            faculty_id,
            name,
            department,
            email,
            sec_sit,
            phone_no,
            password,
            roles,
          ] = row.values;
          const staff = new Staff({
            faculty_id,
            name,
            department,
            email,
            sec_sit,
            phone_no,
            password,
            profile_photo: default_profile_id,
          });
          if (!faculty_id || !name || !email || !phone_no || !password) {
            errors.push(`Row ${rowNumber}: All fields are required`);
          }
          const rolesArr = roles
            ? roles.split(",").map((role) => role.trim())
            : [];
          rolesArr.forEach((role) => {
            validateRoleAssignment(role, staff.toJSON());
          });
          staffList.push(staff);
          staffRole.set(staff, rolesArr);
          rolesArr.forEach((role) => {
            if (!roleObjsMap.has(role)) {
              roleObjsMap.set(role, null);
            }
          });
        }
      } catch (err) {
        errors.push(`Row ${rowNumber}: ${err.message}`);
      }
    });
    if (errors.length > 0) {
      const err = new AppError(errors, 400);
      err.sendResponse(res);
      return;
    }
    errors = [];
    await Promise.all(
      staffList.map(async (staff) => {
        try {
          await staff.save();
        } catch (error) {
          if (error.code === "ER_DUP_ENTRY") {
            errors.push(`Staff Already Exists: ${staff.name} (${staff.email})`);
          } else {
            errors.push(error.message);
          }
        }
      })
    );
    const rolesArr = Array.from(roleObjsMap.keys());
    const roleObjs = await Promise.all(
      rolesArr.map(
        async (role) => await Role.where({ role_name: role }).fetch()
      )
    );
    roleObjs.forEach((role) => {
      roleObjsMap.set(role.get("role_name"), role);
    });
    for (const [staff, role] of staffRole) {
      const roleIds = role.map((role) => roleObjsMap.get(role).get("id"));
      await staff.roles().attach(roleIds);
    }
    res.status(201).json({
      status: "success",
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      const error = new AppError("Staff Already Exists", 400);
      error.sendResponse(res);
    } else {
      // throw err;
      const error = new AppError(err.message, 400);
      error.sendResponse(res);
    }
  }
});

exports.studentLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide both email and password", 400));
  }
  try {
    const student = await Student.where({ email }).fetch();

    if (!(await student.verifyPassword(password))) {
      return res.status(400).json({
        status: "fail",
        message: "Incorrect Password",
      });
    }
    const roles = ["student"];
    const clg = student.get("sec_sit");
    const token = jwt.sign(
      { id: student.get("id"), roles: roles, clg: clg },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRESIN,
      }
    );

    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.COOKIE_EXPIRESIN * 60 * 60 * 1000
      ),
      httpOnly: true,
    };

    res.cookie("jwt", token, cookieOptions);

    res.status(200).json({
      status: "success",
      data: {
        token,
        roles,
        clg,
      },
    });
  } catch (err) {
    if (err.message === "EmptyResponse") {
      const error = new AppError("Student Not Found", 404);
      error.sendResponse(res);
    }
    // throw err;
    else {
      const error = new AppError(err.message, 400);
      error.sendResponse(res);
    }
  }
});

exports.staffLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide both email and password", 400));
  }
  try {
    const staff = await Staff.where({ email }).fetch({
      withRelated: ["roles"],
    });

    if (!(await staff.verifyPassword(password))) {
      res.status(400).json({
        status: "fail",
        message: "Incorrect Password",
      });
      return;
    }
    const userRoles = staff.related("roles");
    const roles = userRoles.map((role) => role.get("role_name"));

    const token = jwt.sign(
      { id: staff.get("id"), roles: roles },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRESIN,
      }
    );

    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.COOKIE_EXPIRESIN * 60 * 60 * 1000
      ),
      httpOnly: true,
    };

    res.cookie("jwt", token, cookieOptions);

    res.status(200).json({
      status: "success",
      data: {
        token,
        roles,
      },
    });
  } catch (err) {
    if (err.message === "EmptyResponse") {
      const error = new AppError("Staff Not Found", 404);
      error.sendResponse(res);
    } else {
      const error = new AppError(err.message, 500);
      error.sendResponse(res);
    }
  }
});

exports.staffForgotPasswordReq = catchAsync(async (req, res) => {
  try {
    const staffMail = req.body.email;
    if (!staffMail) {
      const err = new AppError("Staff email is required", 404);
      err.sendResponse(res);
      return;
    }
    const staff = await Staff.where({ email: staffMail }).fetch();

    const otp = generateOTP(6);
    const otpLimit = new Date();
    otpLimit.setHours(otpLimit.getHours() + 1);
    console.log(otpLimit);
    await Staff.findByIdAndUpdate(
      staff.get("id"),
      {
        OTP: otp,
        OTP_validity: otpLimit,
      },
      {
        new: true,
        runValidators: true,
        tableName: "staffs",
      }
    );
    // await sendEmail(staff.get('email'), "Forgot Password Request"
    //     , `OTP for change password is ${otp}\nValid for 1 hr\n\n\n
    //     This is a auto generated mail. Do Not Reply`);
    res.status(200).json({
      status: "success",
      message: "OTP sent",
    });
  } catch (e) {
    if (e.message === "EmptyResponse") {
      const error = new AppError("Faculty Not Found", 404);
      error.sendResponse(res);
    } else {
      const error = new AppError(e.message, 500);
      error.sendResponse(res);
    }
  }
});

exports.staffForgotPasswordRes = catchAsync(async (req, res) => {
  try {
    const { otp, email, newPassword } = req.body;

    const staff = await Staff.where({ email: email })
      .fetch()
      .then((staff) => {
        if (staff) {
          return staff;
        }
      })
      .catch((err) => {
        if (err.message === "EmptyResponse") {
          throw new AppError(`Faculty with mail ${email} not found`, 404);
        }
      });

    if (staff.get("OTP") == otp) {
      staff.set({
        password: newPassword,
        OTP: null,
        OTP_validity: null,
      });

      await staff.encryptPassword();
      await staff.save();

      return res.status(200).json({
        status: "success",
        message: "Password Changed",
      });
    } else {
      throw new AppError(`Invalid OTP`);
    }
  } catch (e) {
    const err = new AppError(e.message, 400);
    err.sendResponse(res);
  }
});

exports.studentForgotPasswordReq = catchAsync(async (req, res) => {
  try {
    const studentMail = req.body.email;
    if (!studentMail) {
      const err = new AppError("Student email is required", 404);
      err.sendResponse(res);
      return;
    }
    const student = await Student.where({ email: studentMail }).fetch();

    const otp = generateOTP(6);
    const otpLimit = new Date();
    otpLimit.setHours(otpLimit.getHours() + 1);
    console.log(otpLimit);
    await Student.findByIdAndUpdate(
      student.get("id"),
      {
        OTP: otp,
        OTP_validity: otpLimit,
      },
      {
        new: true,
        runValidators: true,
        tableName: "students",
      }
    );
    // await sendEmail(
    //   student.get("email"),
    //   "Forgot Password Request",
    //   `OTP for change password is ${otp}\nValid for 1 hr\n\n\n
    //     This is a auto generated mail. Do Not Reply`
    // );
    res.status(200).json({
      status: "success",
      message: "OTP sent",
    });
  } catch (e) {
    if (e.message === "EmptyResponse") {
      const error = new AppError("student Not Found", 404);
      error.sendResponse(res);
    } else {
      const error = new AppError(e.message, 500);
      error.sendResponse(res);
    }
  }
});

exports.studentForgotPasswordRes = catchAsync(async (req, res) => {
  try {
    const { otp, email, newPassword } = req.body;

    const student = await Student.where({ email: email })
      .fetch()
      .then((student) => {
        if (student) {
          return student;
        }
      })
      .catch((err) => {
        if (err.message === "EmptyResponse") {
          throw new AppError(`Student with mail ${email} not found`, 404);
        }
      });

    if (student.get("OTP") == otp) {
      student.set({
        password: newPassword,
        OTP: null,
        OTP_validity: null,
      });

      await student.encryptPassword();
      await student.save();

      return res.status(200).json({
        status: "success",
        message: "Password Changed",
      });
    } else {
      throw new AppError(`Invalid OTP`);
    }
  } catch (e) {
    const err = new AppError(e.message, 400);
    err.sendResponse(res);
  }
});

exports.changePassword = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    let user;
    if (req.user.roles.includes("student")) {
      user = await Student.where({ id: userId })
        .fetch()

        .catch((err) => {
          if (err.message === "EmptyResponse") {
            throw new AppError(`Student not found`, 404);
          } else {
            throw new AppError("Error Fetching Student Details", 500);
          }
        });
    } else {
      user = await Staff.where({ id: userId })
        .fetch()
        .catch((err) => {
          if (err.message === "EmptyResponse") {
            throw new AppError(`Staff not found`, 404);
          } else {
            throw new AppError("Error Fetching Staff Details", 500);
          }
        });
    }
    if (!(await user.verifyPassword(oldPassword))) {
      throw new AppError("Incorrect Password", 400);
    }
    user.set({
      password: newPassword,
    });
    await user.encryptPassword();
    await user.save();
    return res.status(200).json({
      status: "success",
      message: "Password Changed",
    });
  } catch (e) {
    const er = new AppError(e.message, 500);
    er.sendResponse(res);
  }
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  // Get token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  // Token not present
  if (!token) {
    const err = new AppError("Log In First", 401);
    err.sendResponse(res);
    return;
  }

  // Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const roles = decoded.roles;
  // console.log(roles);
  let user = null;
  // Check if user exists
  try {
    if (roles.includes("student"))
      user = await Student.where({ id: decoded.id }).fetch();
    else {
      user = await Staff.where({ id: decoded.id }).fetch();
    }
  } catch (error) {
    if (error.message == "EmptyResponse") {
      const err = new AppError("User does not exist", 401);
      err.sendResponse(res);
      return;
    }
  }

  if (!user) {
    const err = new AppError("User does not exist", 401);
    err.sendResponse(res);
    return;
  }
  const responseUser = {
    name: user.get("name"),
    roles: roles,
    id: user.get("id"),
    department: user.get("department"),
    sec_sit: user.get("sec_sit"),
  };
  // Set student on req
  req.user = responseUser;
  res.locals.user = responseUser;

  next();
});

exports.addRole = catchAsync(async (req, res) => {
  try {
    const role_name = req.body.role_name;
    const role = new Role({
      role_name,
    });
    await role.save();
    res.status(200).json({
      status: "success",
      message: "Role Added",
    });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      const error = new AppError("Role already Exists", 400);
      error.sendResponse(res);
    } else {
      const error = new AppError(e.message, 500);
      error.sendResponse(res);
    }
  }
});

exports.removeRole = catchAsync(async (req, res) => {
  try {
    const role_name = req.body.role_name;
    const role = await Role.where({ role_name }).fetch();
    await role.destroy();
    res.status(200).json({
      status: "success",
      message: "Role Removed",
    });
  } catch (e) {
    if (e.message === "EmptyResponse") {
      const error = new AppError("Role does not Exists", 400);
      error.sendResponse(res);
    } else {
      const error = new AppError(e.message, 500);
      error.sendResponse(res);
    }
  }
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    const userRoles = req.user.roles;

    if (userRoles.some((role) => roles.includes(role))) {
      return next();
    }

    return next(
      new AppError("You are not authorized to perform this action", 403)
    );
  };
};

exports.doNotAllow = (...roles) => {
  return (req, res, next) => {
    const userRoles = req.user.roles;
    // const hasMatchingRole = roles.some(role => userRoles.includes(role));
    if (!userRoles.some((role) => !roles.includes(role))) {
      return next(
        new AppError("You are not authorized to perform this action", 403)
      );
    }

    next();
  };
};
