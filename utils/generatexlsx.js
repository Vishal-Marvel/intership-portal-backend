const ExcelJS = require("exceljs");

async function generate(internships, college, department) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Student Internship");
  worksheet.mergeCells("A1:L1");
  if (college == "sec")
    worksheet.getCell("A1").value = "SRI SAIRAM ENGINEERING COLLEGE";
  if (college == "sit")
    worksheet.getCell("A1").value = "SAIRAM INSTITUTE OF TECHNOLOGY";
  worksheet.getCell("A1").font = { bold: true };
  worksheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.mergeCells("A2:L2");
  worksheet.getCell("A2").value = "DEPARTMENT OF " + department.toUpperCase();
  worksheet.getCell("A2").font = { bold: true };
  worksheet.getCell("A2").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.mergeCells("A3:L3");
  worksheet.getCell("A3").value = "INTERNSHIP LIST";
  worksheet.getCell("A3").font = { bold: true };
  worksheet.getCell("A3").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.addRow([]);
  worksheet.addRow([
    "S. No.",
    "REG NO",
    "STUDENT NAME",
    "SECTION",
    "MENTOR NAME",
    "COMPANY 1 NAME",
    "CIN/TIN/ GST NO",
    "NO OF DAYS",
    "FROM DATE",
    "TO DATE",
    "COMPLETION STATUS",
    "COMPANY 2 NAME",
    "CIN/TIN/ GST NO",
    "NO OF DAYS",
    "FROM DATE",
    "TO DATE",
    "COMPLETION STATUS",
    "COMPANY 3 NAME",
    "CIN/TIN/ GST NO",
    "NO OF DAYS",
    "FROM DATE",
    "TO DATE",
    "COMPLETION STATUS",
    "TOTAL",
  ]);
  internships.map((internship, index) => {
    let details = [];
    internship.internships.map((intern) => {
      const data = [
        intern.company_name,
        intern.cin_gst_udyog_no,
        intern.no_of_days,
        new Date(intern.starting_date).toISOString().substring(0, 10),
        new Date(intern.ending_date).toISOString().substring(0, 10),
        intern.internship_status,
      ];
      details = details.concat(data);
    });
    worksheet.addRow([
      index + 1,
      internship.student.register_num,
      internship.student.name,
      internship.student.section,
      internship.student.mentor_name,
      ...details,
    ]);
  });
  worksheet.columns.forEach((column) => {
    column.eachCell((cell, rowNumber) => {
      if (rowNumber >= 4) {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    });
  });
  worksheet.columns.forEach((column) => {
    let maxColumnLength = 0;
    if (column && typeof column.eachCell === "function") {
      column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber >= 4) {
          maxColumnLength = Math.max(
            maxColumnLength,
            10,
            cell.value ? cell.value.toString().length : 0
          );
        }
      });
      column.width = maxColumnLength + 2;
    }
  });
  return workbook;
}

module.exports = {
  generate,
};
