const express = require("express");
const routes = express.Router();
const cloudinary = require("cloudinary").v2;
const UserRecord = require("../model/user_model");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const fileUpload = require("express-fileupload");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const check_auth_user = require("../middlewares/check_auth_user");
const CourseRecord = require("../model/course_model");
const StudentRecord = require("../model/student_model")

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME || "dyit1jjef",
  api_key: process.env.CLOUD_KEY || "743564427533897",
  api_secret: process.env.CLOUD_SECRET || "TR9TvJlNF5Blp6AcyZ0plQ0kqkQ",
});

/* routes.post("/addStudent", check_auth_user, async (req, res) => {
  try {
    const { fullName, phone, studentEmail, address, courseId } = req.body;

    if (!fullName || !phone || !studentEmail || !address || !courseId) {
      return res.status(400).json({
        status: false,
        message: "All fields are required!",
      });
    }

    if (!req.user?.userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access!",
      });
    }

    const existUser = await UserRecord.findById(req.user.userId);

    if (!existUser) {
      return res.status(404).json({
        status: false,
        message: "User not found!",
      });
    }

    if (phone.length !== 10) {
      return res.status(400).json({
        status: false,
        message: "Phone number must be 10 digits",
      });
    }

    // ❌ Same email + same course disallow
    const alreadyInSameCourse = await StudentRecord.findOne({
      studentEmail,
      courseId,
    });

    if (alreadyInSameCourse) {
      return res.status(400).json({
        status: false,
        message: "Student already registered in this course!",
      });
    }

    const courseExists = await CourseRecord.findById(courseId);
    if (!courseExists) {
      return res.status(404).json({
        status: false,
        message: "Selected course does not exist!",
      });
    }

    // Upload image
    let studentImageUrl = "";
    let imageId = "";

    if (req.files && req.files.studentImage) {
      const file = req.files.studentImage;

      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "student_images",
      });

      const fullId = result.public_id;
      const shortId = fullId.split("/").pop();

      studentImageUrl = result.secure_url;
      imageId = shortId;
    } else {
      return res.status(400).json({
        status: false,
        message: "Student image is required!",
      });
    }

    const newStudent = new StudentRecord({
      _id: new mongoose.Types.ObjectId(),
      fullName,
      phone,
      studentEmail,
      address,
      userId: req.user.userId,
      courseId,
      studentImageUrl,
      imageId,
    });

    await newStudent.save();

    return res.status(200).json({
      status: true,
      message: "Student added successfully!",
      studentData: newStudent,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
}); */

routes.post("/addStudent", check_auth_user, async (req, res) => {
  try {
    const { fullName, phone, studentEmail, address, courseId } = req.body;

    // // Use either studentEmail or email from frontend
    // const studentEmail = reqEmail || altEmail;

    // Validate fields
    if (!fullName || !phone || !studentEmail || !address || !courseId) {
      return res.status(400).json({
        status: false,
        message: "All fields are required!",
      });
    }

    if (!req.user?.userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access!",
      });
    }

    // Check if auth user exists
    const existUser = await UserRecord.findById(req.user.userId);
    if (!existUser) {
      return res.status(404).json({ status: false, message: "User not found!" });
    }

    // Phone validation
    if (phone.length !== 10) {
      return res.status(400).json({ status: false, message: "Phone number must be 10 digits" });
    }

    // ❌ Prevent same student in SAME course
    const alreadyInSameCourse = await StudentRecord.findOne({ studentEmail, courseId });
    if (alreadyInSameCourse) {
      return res.status(400).json({ status: false, message: "This student already exists in this course!" });
    }

    // Check course validity
    const courseExists = await CourseRecord.findById(courseId);
    if (!courseExists) {
      return res.status(404).json({ status: false, message: "Selected course does not exist!" });
    }

    // Upload student image
    let studentImageUrl = "";
    let imageId = "";

    if (req.files && req.files.studentImage) {
      const file = req.files.studentImage;
      const result = await cloudinary.uploader.upload(file.tempFilePath, { folder: "student_images" });
      studentImageUrl = result.secure_url;
      imageId = result.public_id.split("/").pop();
    } else {
      return res.status(400).json({ status: false, message: "Student image is required!" });
    }

    // Save student
    const newStudent = new StudentRecord({
      _id: new mongoose.Types.ObjectId(),
      fullName,
      phone,
      studentEmail,
      address,
      userId: req.user.userId,
      courseId,
      studentImageUrl,
      imageId,
    });

    await newStudent.save();

    return res.status(200).json({
      status: true,
      message: "Student added successfully!",
      studentData: newStudent,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

// get all the student 
/* routes.get("/getAllStudent", check_auth_user, async (req, res) => {
  try {

    // 🔹 1. Check Token User
    if (!req.user?.userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access! Invalid or missing token.",
      });
    }

    // 🔹 2. Check User Exists
    const existUser = await UserRecord.findById(req.user.userId);

    if (!existUser) {
      return res.status(404).json({
        status: false,
        message: "User not found!",
      });
    }

    // 🔹 3. Check Delete Status
    if (existUser.isDeleted) {
      return res.status(400).json({
        status: false,
        message: "Your account is marked for deletion.",
      });
    }

    // 🔹 4. Fetch all students
    const students = await StudentRecord.find({
      userId: req.user.userId
    })
      .sort({ createdAt: -1 })
      .populate("userId", "firstName lastName userName imageUrl");

    let studentResult = [];

    // 🔹 5. MANUAL FOR-LOOP (As you said)
    for (let i = 0; i < students.length; i++) {
      // current student record
      const student = students[i];

      // user info from populate
      const userInfo = student.userId;

      // Create pure student data without userId
      const studentData = {
        _id: student._id,
        fullName: student.fullName,
        phone: student.phone,
        studentEmail: student.studentEmail,
        address: student.address,
        studentImageUrl: student.studentImageUrl,
        imageId: student.imageId,
        courseId: student.courseId,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt
      };

      // push final combined object
      studentResult.push({
        studentData: studentData,
        userData: userInfo,
      });
    }

    // 🔹 6. Final Response
    return res.status(200).json({
      status: true,
      message: "Get all student related to user",
      totalStudent: studentResult.length,
      studentList: studentResult,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});
 */

// get all the student 
/* routes.get("/getAllStudent", check_auth_user, async (req, res) => {
  try {

    if (!req.user?.userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access! Invalid or missing token.",
      });
    }

    const existUser = await UserRecord.findById(req.user.userId);

    if (!existUser) {
      return res.status(404).json({
        status: false,
        message: "User not found!",
      });
    }

    if (existUser.isDeleted) {
      return res.status(400).json({
        status: false,
        message: "Your account is marked for deletion.",
      });
    }

    const students = await StudentRecord.find({
      userId: req.user.userId
    })
      .sort({ createdAt: -1 })
      .populate("userId", "firstName lastName userName imageUrl")
      .populate("courseId", "courseName price courseImageUrl");

    let studentResult = [];
    let uniqueEmails = new Set();

    for (let i = 0; i < students.length; i++) {

      const student = students[i];
      const userInfo = student.userId;
      const courseInfo = student.courseId;

      if (uniqueEmails.has(student.studentEmail)) {
        continue;
      }

      uniqueEmails.add(student.studentEmail);

      // ⭐ Remove userId & courseId safely
      const cleanStudent = student.toObject();
      delete cleanStudent.userId;
      // delete cleanStudent.courseId;

      studentResult.push({
        studentData: cleanStudent,
        userData: userInfo,
        courseData: courseInfo
      });
    }


    return res.status(200).json({
      status: true,
      message: "Get all unique students related to user",
      totalStudent: studentResult.length,
      studentList: studentResult,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
}); */


routes.get("/getAllStudent", check_auth_user, async (req, res) => {
  try {

    // ---------------- Token Check ----------------
    if (!req.user?.userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access! Invalid or missing token.",
      });
    }

    // ---------------- User Check ----------------
    const existUser = await UserRecord.findById(req.user.userId);
    if (!existUser) {
      return res.status(404).json({
        status: false,
        message: "User not found!",
      });
    }
    if (existUser.isDeleted) {
      return res.status(400).json({
        status: false,
        message: "Your account is marked for deletion.",
      });
    }

    // ---------------- Students Fetch ----------------
    const students = await StudentRecord.find({
      userId: req.user.userId
    })
      .sort({ createdAt: -1 })
      .populate("userId", "firstName lastName userName imageUrl");

    let studentResult = [];
    let uniqueEmails = new Set();

    // ----------- LOOP WITH INDEX (as you said) ----------
    for (let i = 0; i < students.length; i++) {
      let student = students[i];
      let userInfo = student.userId;

      // ---------------- Remove Duplicate Students (Email) ----------------
      if (uniqueEmails.has(student.studentEmail)) {
        continue;
      }
      uniqueEmails.add(student.studentEmail);

      // ---------------- Get Course Details Properly ----------------
      const course = await CourseRecord.findOne({
        _id: student.courseId
      });

      let courseData = course
        ? {
          courseName: course.courseName,
          price: course.price,
        }
        : {};

      // ---------------- Remove Sensitive Fields ----------------
      const cleanStudent = student.toObject();
      delete cleanStudent.userId;   // remove userId
      delete cleanStudent.__v;

      // ---------------- Push Final Data ----------------
      studentResult.push({
        studentData: cleanStudent,
        courseData: courseData,
        userData: userInfo
      });
    }

    // ---------------- Response ----------------
    return res.status(200).json({
      status: true,
      message: "Get all unique students related to user",
      totalStudent: studentResult.length,
      studentList: studentResult,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});
// get all student for a course 
routes.get("/getAllStudentForaCourse/:courseId", check_auth_user, async (req, res) => {
  try {

    const courseId = req.params.courseId;

    // ---------------- Token Check ----------------
    if (!req.user?.userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access! Invalid or missing token.",
      });
    }

    // ---------------- User Check ----------------
    const existUser = await UserRecord.findById(req.user.userId);
    if (!existUser) {
      return res.status(404).json({
        status: false,
        message: "User not found!",
      });
    }
    if (existUser.isDeleted) {
      return res.status(400).json({
        status: false,
        message: "Your account is marked for deletion.",
      });
    }


    const students = await StudentRecord.find({
      courseId: courseId
    }).sort({ createdAt: -1 })
      .populate("userId", "firstName lastName userName imageUrl");

    let studentResult = [];
    let uniqueEmails = new Set();

    // ----------- LOOP WITH INDEX (as you said) ----------
    for (let i = 0; i < students.length; i++) {
      let student = students[i];
      let userInfo = student.userId;

      // ---------------- Remove Duplicate Students (Email) ----------------
      if (uniqueEmails.has(student.studentEmail)) {
        continue;
      }
      uniqueEmails.add(student.studentEmail);

      // ---------------- Get Course Details Properly ----------------
      const course = await CourseRecord.findOne({
        _id: student.courseId
      });

      let courseData = course
        ? {
          courseName: course.courseName,
          price: course.price,
        }
        : {};

      // ---------------- Remove Sensitive Fields ----------------
      const cleanStudent = student.toObject();
      delete cleanStudent.userId;   // remove userId
      delete cleanStudent.__v;

      // ---------------- Push Final Data ----------------
      studentResult.push({
        studentData: cleanStudent,
        courseData: courseData,
        userData: userInfo
      });
    }

    // ---------------- Response ----------------
    return res.status(200).json({
      status: true,
      message: "Get all unique students related to user",
      totalStudent: studentResult.length,
      studentList: studentResult,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
})

//update student details 

routes.patch("/updateStudent/:studentId", check_auth_user, async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const { fullName, phone, address, courseId } = req.body;

    // ---------------- Token Check ----------------
    if (!req.user?.userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access!",
      });
    }

    // ---------------- User Check ----------------
    const existUser = await UserRecord.findById(req.user.userId);
    if (!existUser) {
      return res.status(404).json({
        status: false,
        message: "User not found!",
      });
    }

    if (existUser.isDeleted) {
      return res.status(400).json({
        status: false,
        message: "Your account is marked for deletion.",
      });
    }

    // ---------------- Student Check ----------------
    const student = await StudentRecord.findById(studentId);
    if (!student) {
      return res.status(404).json({
        status: false,
        message: "Student not found!",
      });
    }

    // ---------------- Authorization ----------------
    if (student.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "You are not authorized to update this student!",
      });
    }

    // ---------------- Prepare Update Object ----------------
    let updateStudent = {};

    if (fullName) updateStudent.fullName = fullName;
    if (phone) updateStudent.phone = phone;
    if (address) updateStudent.address = address;
    if (courseId) updateStudent.courseId = courseId;
    // NOTE: email readonly (UI level)

    // ---------------- Image Upload ----------------
    if (req.files && req.files.studentImage) {
      const file = req.files.studentImage;

      // Delete old image if exists
      if (student.imageId) {
        const oldImagePublicId = `student_images/${student.imageId}`;
        await cloudinary.uploader.destroy(oldImagePublicId);
      }

      // Upload new image
      const uploadResult = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "student_images"
      });

      const fullId = uploadResult.public_id;
      const sortId = fullId.split("/").pop();

      updateStudent.studentImageUrl = uploadResult.secure_url;
      updateStudent.imageId = sortId;
    }

    // ---------------- Update Student ----------------
    const updatedStudent = await StudentRecord.findByIdAndUpdate(
      studentId,
      updateStudent,
      { new: true }
    );

    return res.status(200).json({
      status: true,
      message: "Student updated successfully!",
      updatedStudent,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});



// Get single student details
routes.get("/getStudentDetails/:studentId", check_auth_user, async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // ---------------- Token Check ----------------
    if (!req.user?.userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access!",
      });
    }

    // ---------------- User Check ----------------
    const existUser = await UserRecord.findById(req.user.userId);
    if (!existUser) {
      return res.status(404).json({
        status: false,
        message: "User not found!",
      });
    }

    if (existUser.isDeleted) {
      return res.status(400).json({
        status: false,
        message: "Your account is marked for deletion.",
      });
    }

    // ---------------- Student Check ----------------
    const student = await StudentRecord.findById(studentId)
      .populate("courseId", "courseName price courseImageUrl")
      .populate("userId", "firstName lastName userName imageUrl");

    if (!student) {
      return res.status(404).json({
        status: false,
        message: "Student not found!",
      });
    }

    // ---------------- Authorization Check ----------------
    if (student.userId._id.toString() !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "You are not authorized to view this student!",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Student details fetched successfully!",
      studentDetails: student,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});


// delete student 

routes.delete("/deleteStudent/:studentId", check_auth_user, async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // ---------------- Token Check ----------------
    if (!req.user?.userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access!",
      });
    }

    // ---------------- User Check ----------------
    const existUser = await UserRecord.findById(req.user.userId);
    if (!existUser) {
      return res.status(404).json({
        status: false,
        message: "User not found!",
      });
    }

    if (existUser.isDeleted) {
      return res.status(400).json({
        status: false,
        message: "Your account is marked for deletion.",
      });
    }

    // ---------------- Student Check ----------------
    const student = await StudentRecord.findById(studentId);
    if (!student) {
      return res.status(404).json({
        status: false,
        message: "Student not found!",
      });
    }

    // ---------------- Authorization ----------------
    if (student.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "You are not authorized to delete this student!",
      });
    }

    // ---------------- Delete Image from Cloudinary ----------------
    if (student.imageId) {
      const imagePublicId = `student_images/${student.imageId}`;
      await cloudinary.uploader.destroy(imagePublicId);
    }

    // ---------------- Delete Student Record ----------------
    await student.deleteOne();

    return res.status(200).json({
      status: true,
      message: "Student deleted successfully!",
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});


// Get latest 5 students
routes.get("/getLatestStudent", check_auth_user, async (req, res) => {
  try {
    // ---------------- Token Check ----------------
    if (!req.user?.userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access! Invalid or missing token.",
      });
    }

    // ---------------- User Check ----------------
    const existUser = await UserRecord.findById(req.user.userId);
    if (!existUser) {
      return res.status(404).json({
        status: false,
        message: "User not found!",
      });
    }
    if (existUser.isDeleted) {
      return res.status(400).json({
        status: false,
        message: "Your account is marked for deletion.",
      });
    }

    // ---------------- Students Fetch ----------------
    // Fetch latest 5 student docs and populate user & course in single query
    const students = await StudentRecord.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "firstName lastName userName imageUrl")
      .populate("courseId", "courseName price courseImageUrl");

    let studentResult = [];

    // ----------- LOOP WITH INDEX ----------
    for (let i = 0; i < students.length; i++) {
      const student = students[i];

      // userData comes from populate
      const userData = student.userId ? {
        _id: student.userId._id,
        firstName: student.userId.firstName,
        lastName: student.userId.lastName,
        userName: student.userId.userName,
        imageUrl: student.userId.imageUrl
      } : {};

      // courseData comes from populate
      const courseData = student.courseId ? {
        _id: student.courseId._id,
        courseName: student.courseId.courseName,
        price: student.courseId.price,
        courseImageUrl: student.courseId.courseImageUrl
      } : {};

      // Clean student object: convert to plain object and remove populated userId object
      const cleanStudent = student.toObject();
      // keep courseId as id (not populated object) for clarity
      cleanStudent.courseId = student.courseId ? String(student.courseId._id) : cleanStudent.courseId;
      // remove large populated user object from studentData (we return it separately)
      delete cleanStudent.userId;
      delete cleanStudent.__v;

      // push final item
      studentResult.push({
        studentData: cleanStudent,
        userData: userData,
        courseData: courseData
      });
    }

    // ---------------- Response ----------------
    return res.status(200).json({
      status: true,
      message: "Latest 5 students fetched successfully!",
      totalStudent: studentResult.length,
      studentList: studentResult,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

module.exports = routes;