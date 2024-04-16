const express = require("express");
const morgan = require("morgan");
const path = require("path");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cors = require("cors");

const studentRouter = require("./routes/studentRouter");
const staffRouter = require("./routes/staffRouter");
const internshipRouter = require("./routes/internshipRouter");
const adminRouter = require("./routes/adminRouter");
const skillRouter = require("./routes/skillRouter");
const app = express();

// app.enable("trust proxy");

// Parser JSON
app.use(express.json());
app.use(express.urlencoded({ limit: "10kb", extended: true }));
// Set cookie on req
app.use(cookieParser());

const corsOptions = {
  origin: "*", // Replace with the origin(s) you want to allow
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

const limit = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 60,
  message: "Too many request with this IP Address..Try again in 1 hour",
});

app.use("/internship/api", limit);

app.use("/internship/api/v1/students", studentRouter);
app.use("/internship/api/v1/staffs", staffRouter);
app.use("/internship/api/v1/internships", internshipRouter);
app.use("/internship/api/v1/admin", adminRouter);
app.use("/internship/api/v1/skill", skillRouter);

if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

app.use(compression());

app.all("*", (req, res) => {
  res.status(400).json({
    status: "fail",
    message: `Cannot find ${req.originalUrl}`,
  });
});

module.exports = app;
