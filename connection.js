// Install the bookshelf, knex, and mysql packages
// npm install bookshelf knex mysql
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const knexConfig = require("./db/knexfile");
const knex = require("knex")(knexConfig[process.env.NODE_ENV]);
const bookshelf = require("bookshelf")(knex);

const createStaffsTable = async () => {
  try {
    await knex.schema.hasTable("staffs").then((exists) => {
      if (!exists) {
        return knex.schema.createTable("staffs", (table) => {
          table.string("id").primary();
          table.string("name");
          table.string("department");
          table.string("sec_sit");
          table.dateTime("registered_date");
          table.string("faculty_id").unique();
          table.string("email");
          table.string("phone_no");
          table.string("password");
          table.string("profile_photo");
          table.integer("OTP");
          table.date("OTP_validity");
          table.unique(["email"]);
          console.log("Staffs table created successfully");
        });
      }
    });
  } catch (error) {
    console.error("Error creating staffs table:", error);
  }
};

const createStudentsTable = async () => {
  try {
    await knex.schema.hasTable("students").then((exists) => {
      if (!exists) {
        return knex.schema.createTable("students", (table) => {
          table.string("id").primary();
          table.string("name");
          table.string("sec_sit");
          table.string("student_id").unique();
          table.integer("year_of_studying");
          table.string("batch");
          table.date("registered_date");
          table.string("register_num");
          table.string("department");
          table.string("section");
          table.string("email").unique();
          table.string("phone_no");
          table.string("password");
          table.integer("total_days_internship");
          table.integer("OTP");
          table.date("OTP_validity");
          table.boolean("placement_status");
          table.string("placed_company");
          table.string("profile_photo");
          table.string("staff_id"); // Add staff_id column for the foreign key
          table.foreign("staff_id").references("staffs.id"); // Add foreign key constraint
          console.log("Students table created successfully");
        });
      }
    });
  } catch (error) {
    console.error("Error creating students table:", error);
  }
};

const createInternshipTable = async () => {
  try {
    await knex.schema.hasTable("internships").then((exists) => {
      if (!exists) {
        return knex.schema.createTable("internships", (table) => {
          table.string("id").primary();
          table.date("registered_date");
          table.string("company_name");
          table.string("company_address");
          table.string("company_ph_no");
          table.string("current_cgpa");
          table.string("cin_gst_udyog_no");
          table.string("cin_gst_udyog");
          table.string("academic_year");
          table.string("industry_supervisor_name");
          table.string("industry_supervisor_ph_no");
          table.string("industry_supervisor_email");
          table.string("mode_of_intern");
          table.date("starting_date");
          table.date("ending_date");
          table.integer("no_of_days");
          table.string("location");
          table.string("domain");
          table.string("certificate").nullable();
          // table.string('attendance');
          // table.string('feedback');
          table.string("offer_letter").nullable();
          table.string("approval_status");
          table.string("internship_status");
          table
            .string("student_id")
            .references("students.id")
            .onDelete("CASCADE");
          console.log("Internship table created successfully");
        });
      }
    });
  } catch (error) {
    console.error("Error creating internship table:", error);
  }
};

const createApprovalTable = async () => {
  try {
    await knex.schema.hasTable("approval").then((exists) => {
      if (!exists) {
        return knex.schema.createTable("approval", (table) => {
          table.string("id").primary();
          table.boolean("mentor");
          table.string("mentor_id");
          table.date("mentor_approved_at");
          table.boolean("internshipcoordinator");
          table.string("internshipcoordinator_id");
          table.date("internshipcoordinator_approved_at");
          table.boolean("hod");
          table.string("hod_id");
          table.date("hod_approved_at");
          table.boolean("tapcell");
          table.string("tapcell_id");
          table.date("tapcell_approved_at");
          table.boolean("principal");
          table.string("principal_id");
          table.date("principal_approved_at");
          table.string("comments");
          table.string("comments_by_id");
          table.string("comments_by_Role");
          table.date("commented_at");
          table
            .string("internship_id")
            .references("internships.id")
            .onDelete("CASCADE");
          console.log("Approval table created successfully");
        });
      }
    });
  } catch (error) {
    console.error("Error creating approval table:", error);
  }
};

const createRolesTable = async () => {
  try {
    await knex.schema.hasTable("roles").then((exists) => {
      if (!exists) {
        return knex.schema.createTable("roles", (table) => {
          table.string("id").primary();
          table.string("role_name").unique();
          console.log("Roles table created successfully");
        });
      }
    });
  } catch (error) {
    console.error("Error creating role table:", error);
  }
};

const createStaffRoleTable = async () => {
  try {
    await knex.schema.hasTable("staff_roles").then((exists) => {
      if (!exists) {
        return knex.schema.createTable("staff_roles", (table) => {
          table.string("staff_id").references("staffs.id").onDelete("CASCADE");
          table.string("role_id").references("roles.id").onDelete("CASCADE");
          table.primary(["staff_id", "role_id"]);
          console.log("StaffRole table created successfully");
        });
      }
    });
  } catch (error) {
    console.error("Error creating staffrole table:", error);
  }
};

const createSkillsTable = async () => {
  try {
    await knex.schema.hasTable("skills").then((exists) => {
      if (!exists) {
        return knex.schema.createTable("skills", (table) => {
          table.string("id").primary();
          table.string("skill_name").unique();
          console.log("Skills table created successfully");
        });
      }
    });
  } catch (error) {
    console.error("Error creating skills table:", error);
  }
};

const createStudentSkillTable = async () => {
  try {
    await knex.schema.hasTable("student_skill").then((exists) => {
      if (!exists) {
        return knex.schema.createTable("student_skill", (table) => {
          table
            .string("student_id")
            .references("students.id")
            .onDelete("CASCADE");
          table.string("skill_id").references("skills.id").onDelete("CASCADE");
          table.primary(["student_id", "skill_id"]);
          console.log("Student Skills table created successfully");
        });
      }
    });
  } catch (error) {
    console.error("Error creating studentskill table:", error);
  }
};

const createNotificationTable = async () => {
  try {
    await knex.schema.hasTable("notification").then((exists) => {
      if (!exists) {
        return knex.schema.createTable("notification", (table) => {
          table.string("id").primary();
          table.string("message").notNullable();
          table.string("departments").notNullable();
          table.integer("year");
          table
            .string("faculty_id")
            .references("staffs.id")
            .onDelete("CASCADE");
          table.string("role");
          table.date("created_at");
          table.date("updated_at");
        });
      }
    });
  } catch (error) {
    console.error("Error creating notification table:", error);
  }
};

knex.schema.hasTable("files").then((exists) => {
  if (!exists) {
    return knex.schema.createTable("files", (table) => {
      table.string("id").primary();
      table.string("file_name");
      table.specificType("file", "longblob");
      table.date("uploaded_at");
    });
  }
});

knex.schema.hasTable("industry_details").then((exists) => {
  if (!exists) {
    return knex.schema.createTable("industry_details", (table) => {
      table.string("id").primary();
      table.string("company_name");
      table.string("company_address");
      table.string("company_ph_no");
      table.string("cin_tin_gst_no");
      table.string("industry_supervisor_name");
      table.string("industry_supervisor_ph_no");
      table.string("industry_supervisor_email");
      table.date("added_at");
    });
  }
});

createStaffsTable().then((r) =>
  createRolesTable().then((r) =>
    createStaffRoleTable().then((r) =>
      createStudentsTable().then((r) =>
        createSkillsTable().then((r) =>
          createStudentSkillTable().then((r) =>
            createInternshipTable().then((r) =>
              createApprovalTable().then((r) =>
                createNotificationTable().then(async (e) => {
                  const startup = require("./utils/startup");
                  await startup.performStartUp();
                })
              )
            )
          )
        )
      )
    )
  )
);

// Export the bookshelf connection
module.exports = bookshelf;
