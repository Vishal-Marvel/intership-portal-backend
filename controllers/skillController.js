const Student = require("../models/studentModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const Skill = require("../models/skillModel");

// Controller function to get all skills
exports.getAllSkills = catchAsync(async (req, res) => {
  const skills = await Skill.fetchAll();
  const skillNames = skills.map((skill) => ({
    name: skill.get("skill_name"),
    id: skill.get("id"),
  }));
  res.json({
    status: "success",
    data: {
      skillNames,
    },
  });
});

exports.getSkillsList = catchAsync(async (req, res) => {
  try {
    const skillsWithStudentCount = await Skill.query()
      .select("skills.id", "skills.skill_name")
      .countDistinct("students.id as student_count")
      .leftJoin("student_skill", "student_skill.skill_id", "skills.id")
      .leftJoin("students", "students.id", "student_skill.student_id")
      .groupBy("skills.id");

    res.json({
      status: "success",
      data: {
        skill: skillsWithStudentCount.map((each) => ({
          skill: each.skill_name,
          id: each.id,
          count: each.student_count,
        })),
      },
    });
  } catch (e) {
    const err = new AppError(e.message, 500);
    err.sendResponse(res);
  }
});

// Controller function to add a new skill
exports.addSkill = catchAsync(async (req, res) => {
  try {
    const { skillName } = req.body;

    if (!skillName) {
      const error = new AppError("Skill name is required.", 400);
      error.sendResponse(res);
      return;
    }

    const newSkill = await Skill.forge({ skill_name: skillName }).save();

    res.json({
      status: "success",
      data: {
        skill: newSkill,
      },
    });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      const err = new AppError("Skill Already Exists", 409);
      err.sendResponse(res);
    } else {
      const err = new AppError(e.message, 500);
      err.sendResponse(res);
    }
  }
});
// Controller function to add a new skill
exports.editSkill = catchAsync(async (req, res) => {
  try {
    const { skillName, id } = req.body;

    if (!skillName) {
      const error = new AppError("Skill name is required.", 400);
      error.sendResponse(res);
      return;
    }

    const skill = await Skill.where({ id }).fetch();
    skill.set({skill_name: skillName});
    await skill.save();

    res.json({
      status: "success",
      
    });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      const err = new AppError("Skill Already Exists", 409);
      err.sendResponse(res);
    } else {
      const err = new AppError(e.message, 500);
      err.sendResponse(res);
    }
  }
});

exports.deleteSkill = catchAsync(async (req, res) => {
  try {
    const id  = req.params.id;
    const skill = await Skill.where({ id:id }).fetch();

    await skill.destroy();

    res.status(200).json({
      status: "success",
      message: "Skill deleted successfully",
    });
  } catch (e) {
    if (e.message === "EmptyResponse") {
      const err = new AppError("Skill Doesn't Exists", 409);
      err.sendResponse(res);
    } else {
      const err = new AppError(e.message, 500);
      err.sendResponse(res);
    }
  }
});
