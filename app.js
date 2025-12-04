const express = require("express");
const app = express();
const UserRoutes = require("./routes/user_route");
const CourseRoutes = require("./routes/course_route")
const StudentRecord = require("./routes/student_routes")
const fileUpload = require("express-fileupload");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// File Upload Middleware
app.use(
  fileUpload({
    useTempFiles: true,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  })
);
app.use("/user", UserRoutes);
app.use("/course", CourseRoutes);
app.use("/student", StudentRecord);

app.use((req, res, next) => {
  res.status(404).send("Route not found");
});
module.exports = app;
