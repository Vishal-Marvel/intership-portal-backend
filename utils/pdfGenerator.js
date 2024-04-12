const PDFDocument = require("pdfkit");
const fs = require("fs");

const outputPath = "pdf_file\\single_report.pdf";

// Function to generate the PDF form
async function generateInternshipDetails(internship, student, approval) {
  const doc = new PDFDocument();
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);
  const backgroundColor = "#FFFFFF"; // Light gray background color
  const logoPath = "public/images/logo.jpg"; // Path to your logo image
  const tableCellPadding = 25; // Padding for table cells
  const pageHeight = doc.page.height;
  let tableY = 120;
  // Define a helper function for table formatting
  const addTableRow = (label, value) => {
    if (tableY + tableCellPadding + 50 > pageHeight) {
      doc.addPage();
      tableY = 100; // Reset Y position for the new page
    }
    doc.text(label, 100, tableY, { width: 200, align: "left" });
    doc.text(value, 300, tableY, { width: 200, align: "left" });

    tableY += tableCellPadding; // Increment y position after adding the row
  };
  doc.image(logoPath, 100, 25, { width: 100, height: 100, align: "center" });

  doc.font("Helvetica-Bold");
  doc.fontSize(16);
  doc.text("Internship Details", { align: "center" });

  doc.moveDown(); // Add some vertical spacing

  doc.font("Helvetica");
  doc.fontSize(12);
  doc.fillColor("black");
  // doc.rect(0, 0, doc.page.width, doc.page.height).fill(backgroundColor); // Set background color

  // Add table rows with data and update tableY
  addTableRow("Student Id:", student.get("student_id"));
  addTableRow("Student Name:", student.get("name"));
  addTableRow("College:", student.get("sec_sit"));
  addTableRow("Register Number:", student.get("register_num"));
  addTableRow("Student Email:", student.get("email"));
  addTableRow("Student Department:", student.get("dept"));
  addTableRow("Student Phone Number:", student.get("phone_no"));
  addTableRow(
    "Placement Status:",
    student.get("placement_status") ? "Placed" : "Not Placed"
  );
  if (student.get("placement_status")) {
    addTableRow(
      "Placed Company:",
      student.get("placed_company") ? "Placed" : "Not Placed"
    );
  }
  addTableRow("Semester:", internship.get("sem"));
  addTableRow("Current CGPA:", internship.get("current_cgpa"));
  addTableRow("Company Name:", internship.get("company_name"));
  addTableRow("Company Address:", internship.get("company_address"));
  addTableRow("Company Phone Number:", internship.get("company_ph_no"));
  addTableRow("CIN/GST/UDYOG Number:", internship.get("cin_gst_udyog_no"));
  addTableRow(
    "Industry Supervisor Name:",
    internship.get("industry_supervisor_name")
  );
  addTableRow(
    "Industry Supervisor Phone Number:",
    internship.get("industry_supervisor_ph_no")
  );
  addTableRow("Mode of Internship:", internship.get("mode_of_intern"));
  addTableRow("Starting Date:", internship.get("starting_date"));
  addTableRow("Ending Date:", internship.get("ending_date"));
  addTableRow("Days of Internship:", internship.get("days_of_internship"));
  addTableRow("Location:", internship.get("location"));
  addTableRow("Domain:", internship.get("domain"));
  addTableRow(
    "Mentor Approved:",
    approval.get("mentor") ? "Approved" : "Not Approved"
  );
  addTableRow(
    "Internship Coordinator Approved:",
    approval.get("internshipcoordinator") ? "Approved" : "Not Approved"
  );
  addTableRow(
    "HOD Approved:",
    approval.get("hod") ? "Approved" : "Not Approved"
  );
  addTableRow(
    "Tap Cell Approved:",
    approval.get("tapcell") ? "Approved" : "Not Approved"
  );
  addTableRow(
    "Principal Approved:",
    approval.get("principal") ? "Approved" : "Not Approved"
  );
  addTableRow(
    "Comments:",
    approval.get("comments") ? approval.get("comments") : "No Comments"
  );
  // table.draw();

  doc.end();
  return outputPath;
}

module.exports = {
  generateInternshipDetails,
};
