const dotenv = require("dotenv");
const CronJob = require("cron").CronJob;
const moment = require("moment");
const Notification = require("./models/notificationModel");
process.on("uncaughtException", (err) => {
  console.log(err.name, err.message);
  process.exit(1);
});

// Connecting env variables
dotenv.config({ path: "./config.env" });
const app = require("./app");

// Schedule the cron job for automatic deletion
const automaticDeletionJob = new CronJob("0 0 * * *", async () => {
  try {
    const today = new Date();
    const notificationsToDelete = await Notification.where(
      "expiry_at",
      ">",
      today
    ).fetchAll();
    await notificationsToDelete.invokeThen("destroy");

    console.log(`${notificationsToDelete.length} notifications deleted.`);
  } catch (err) {
    console.error("Failed to delete notifications:", err);
  }
});

// Start the cron job
automaticDeletionJob.start();

// Start server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Listening from port ${port}`);
});

//For handeling unhandled promise rejection
process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  console.log("Unhandled Rejection!!! Shutting down...");
  server.close(() => {
    process.exit(1);
  });
});

//For handeling SIGTERM signal
process.on("SIGTERM", () => {
  console.log("SIGTERM Recieved...Shutting down gracefully..");
  server.close(() => {
    console.log("Process Terminated");
  });
});
