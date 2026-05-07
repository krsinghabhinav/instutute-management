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
const feesRecord = require("../model/fees_model")
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME || "dyit1jjef",
  api_key: process.env.CLOUD_KEY || "743564427533897",
  api_secret: process.env.CLOUD_SECRET || "TR9TvJlNF5Blp6AcyZ0plQ0kqkQ",
});


/* routes.post("/addCourse", check_auth_user, async (req, res) => {
  try {
    const { courseName, price, description, startDate, endDate,  } = req.body;

    // 🔹 Step 1: Validate fields
    if (!courseName || !price || !description || !startDate || !endDate || ) {
      return res.status(400).json({
        status: false,
        message: "All fields (courseName, price, description, startDate, endDate) are required",
      });
    }

    // 🔹 Step 2: Validate user
    if (!req.user || !req.user.userId) {
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
        message: "Your account is marked for deletion. It will be removed permanently after 10 days.",
      });
    }

    // 🔹 Step 3: Upload image to Cloudinary (optional)
    let courseImageUrl = "";
    let imageId = "";

    if (req.files && req.files?.courseImage) {
      const file = req.files.courseImage;

      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "course_images",
      });

      const fullId = result.public_id;
      const shortId = fullId.split("/").pop();

      courseImageUrl = result.secure_url;
      imageId = shortId;
    } else {
      return res.status(400).json({
        status: false,
        message: "Course image is required",
      });
    }

    // 🔹 Step 4: Create new course
    const newCourse = new CourseRecord({
      _id: new mongoose.Types.ObjectId(),
      courseName,
      price, 
      description,
      startDate, // ensure proper Date type
      endDate,
      courseImageUrl ,
      imageId,
      userId: req.user.userId, // 🔥 corrected: should match your schema key name
    });

    // 🔹 Step 5: Save course
    await newCourse.save();

    return res.status(201).json({
      status: true,
      message: "Course added successfully!",
      course: newCourse,
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



routes.post("/addCourse", check_auth_user, async (req, res) => {
  try {
    const {
      courseName,
      price,
      description,
      startDate,
      endDate,
      status, // <-- frontend se aayega toh use receive karna hi padega
    } = req.body;

    // Validate Required Fields
    if (!courseName || !price || !description || !startDate || !endDate || !status) {
      return res.status(400).json({
        status: false,
        message: "All fields (courseName, price, description, startDate, endDate, status) are required",
      });
    }

    // Validate User
    if (!req.user || !req.user.userId) {
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
        message: "Your account is marked for deletion. It will be removed permanently after 10 days.",
      });
    }

    // Upload Image (Required)
    let courseImageUrl = "";
    let imageId = "";

    if (req.files && req.files.courseImage) {
      const file = req.files.courseImage;

      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "course_images",
      });

      const fullId = result.public_id;
      const shortId = fullId.split("/").pop();

      courseImageUrl = result.secure_url;
      imageId = shortId;
    } /* else {
      return res.status(400).json({
        status: false,
        message: "Course image is required",
      });
    }
 */
    // Create New Course
    const newCourse = new CourseRecord({
      _id: new mongoose.Types.ObjectId(),
      courseName,
      price,
      description,
      startDate,
      endDate,
      status,
      courseImageUrl,
      imageId,
      userId: req.user.userId,
    });

    await newCourse.save();

    return res.status(201).json({
      status: true,
      message: "Course added successfully!",
      courseData: newCourse, // ✔ only course data

      // ✔ Clean user data → no duplication, no full user object
      userData: {
        userId: existUser._id,
        name: existUser.name,
        email: existUser.email,
      },
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});



routes.get("/allCourse", check_auth_user, async (req, res) => {
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

    // 🔹 4. Get all courses related to this user
    const courseData = await CourseRecord.find({
      userId: req.user.userId,
    })
      .sort({ createdAt: -1 })
      .populate("userId", "instFullName userName imageUrl");

    // 🔹 5. Prepare final result array
    let result = [];

    // ✅ Simple for-loop with index
    for (let i = 0; i < courseData.length; i++) {
      const course = courseData[i].toObject(); // convert mongoose document to normal object

      const userInfo = courseData[i].userId; // populated user data

      delete course.userId; // remove from course object to avoid duplication

      result.push({
        courseData: course,
        userData: userInfo,
      });
    }

    // 🔹 6. Send Final Response
    return res.status(200).json({
      status: true,
      message: "Get all course related to user",
      totalCourse: result.length,
      courseList: result,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});


/* // UPDATE COURSE API
routes.patch("/updateCourse/:courseId", check_auth_user, async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const { courseName, price, description, startDate, endDate, status } = req.body;

    // 🔹 Validate token
    if (!req.user?.userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access!",
      });
    }

    // 🔹 Validate user
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

    // 🔹 Find existing course
    const course = await CourseRecord.findById(courseId);
    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found!",
      });
    }

    // 🔹 Ensure the course belongs to this user
    if (course.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "You are not authorized to update this course!",
      });
    }

    // 🔹 Prepare update object
    let updateData = {};

    if (courseName) updateData.courseName = courseName;
    if (price) updateData.price = price;
    if (description) updateData.description = description;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);

    if (status) {
      if (!["active", "inactive", "completed"].includes(status)) {
        return res.status(400).json({
          status: false,
          message: "Invalid status! Use: active, inactive, completed",
        });
      }
      updateData.status = status;
    }

    // 🔹 Optional: Image update
    if (req.files?.courseImage) {
      const file = req.files.courseImage;

      if(course.imageId){
        const oldCourseImage = `course_images/${course.courseImageUrl}`
        await cloudinary.uploader.destroy(oldCourseImage)
      }

      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "course_images",
        public_id:course.courseImageUrl || undefined,
        overwrite:true,
      });

      const fullId = result.public_id;
      const shortId = fullId.split("/").pop();

      updateData.courseImageUrl = result.secure_url;
      updateData.imageId = shortId;
    }

    // 🔹 Update Course
    const updatedCourse = await CourseRecord.findByIdAndUpdate(
      courseId,
      updateData,
      { new: true }
    );

    return res.status(200).json({
      status: true,
      message: "Course updated successfully!",
      updatedCourse,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
}); */


// Get specific course details
routes.get("/courseDetails/:courseId", check_auth_user, async (req, res) => {
  try {
    const courseId = req.params.courseId;

    // 🔹 1. Validate Token User
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

    // 🔹 3. Check if User is Deleted
    if (existUser.isDeleted) {
      return res.status(400).json({
        status: false,
        message: "Your account is marked for deletion.",
      });
    }

    // 🔹 4. Find Specific Course (with populated user)
    const courseData = await CourseRecord.findOne({
      _id: courseId,
      userId: req.user.userId
    }).populate("userId", "instFullName userName imageUrl");

    if (!courseData) {
      return res.status(404).json({
        status: false,
        message: "Course not found!",
      });
    }

    // Convert to plain object
    const courseObject = courseData.toObject();

    // Get user data
    const userData = courseObject.userId;

    // Remove userId from course details to avoid duplication
    delete courseObject.userId;

    // 🔹 5. Return Single Course + User Details
    return res.status(200).json({
      status: true,
      message: "Course details fetched successfully",
      courseData: courseObject,
      userData: userData,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});


// UPDATE COURSE API
routes.patch("/updateCourse/:courseId", check_auth_user, async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const { courseName, price, description, startDate, endDate, status } = req.body;

    // 🔹 1. Validate token
    if (!req.user?.userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access!",
      });
    }

    // 🔹 2. Validate User
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

    // 🔹 3. Check Course Exists
    const course = await CourseRecord.findById(courseId);
    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found!",
      });
    }

    // 🔹 4. Ensure ownership
    if (course.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "You are not authorized to update this course!",
      });
    }

    // 🔹 5. Prepare update object
    let updateData = {};

    if (courseName) updateData.courseName = courseName;
    if (price) updateData.price = price;
    if (description) updateData.description = description;
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;

    // 🔹 Validate status
    if (status) {
      const validStatus = ["active", "inactive", "completed"];
      if (!validStatus.includes(status)) {
        return res.status(400).json({
          status: false,
          message: "Invalid status! Use: active, inactive, completed",
        });
      }
      updateData.status = status;
    }

    // 🔹 6. Update Image (optional)
    if (req.files?.courseImage) {
      const file = req.files.courseImage;

      // Delete old image (safely)
      if (course.imageId) {
        const oldImagePublicId = `course_images/${course.imageId}`;
        await cloudinary.uploader.destroy(oldImagePublicId);
      }

      // Upload new image
      const uploadResult = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "course_images",
      });

      const fullId = uploadResult.public_id;
      const shortId = fullId.split("/").pop();

      updateData.courseImageUrl = uploadResult.secure_url;
      updateData.imageId = shortId;
    }

    // 🔹 7. Update Course in DB
    const updatedCourse = await CourseRecord.findByIdAndUpdate(
      courseId,
      updateData,
      { new: true }
    );

    return res.status(200).json({
      status: true,
      message: "Course updated successfully!",
      updatedCourse,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

routes.delete("/courseDelete/:courseId", check_auth_user, async (req, res) => {
  try {
    const courseId = req.params.courseId;

    // 🔹 1. Validate token
    if (!req.user?.userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access!",
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

    if (existUser.isDeleted) {
      return res.status(400).json({
        status: false,
        message: "Your account is marked for deletion.",
      });
    }

    // 🔹 3. Find Course
    const course = await CourseRecord.findById(courseId);
    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found!",
      });
    }

    // 🔹 4. Ensure course belongs to this user
    if (course.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "You are not authorized to delete this course!",
      });
    }

    // 🔹 5. Delete Course Image from Cloudinary
    if (course.imageId) {
      const imagePublicId = `course_images/${course.imageId}`;
      await cloudinary.uploader.destroy(imagePublicId);

      // clear DB fields
      course.courseImageUrl = "";
      course.imageId = "";
    }
    // 6. Find All Students of this course
    const allStudents = await StudentRecord.find({ courseId: courseId });

    // 7. Delete each student's image from Cloudinary
    for (const student of allStudents) {
      if (student.imageId) {
        const studentPublicId = `student_images/${student.imageId}`;
        await cloudinary.uploader.destroy(studentPublicId);
        student.studentImageUrl = "";
        student.imageId = "";
      }
    }
    // 🔹 6. Delete course record from DB
    await course.deleteOne();

    // 🔹 7. Delete all students related to this course
    await StudentRecord.deleteMany({ courseId: courseId });
    return res.status(200).json({
      status: true,
      message: "Course deleted successfully!",
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});


// Get Course Details + All Students Enrolled in That Course
routes.get("/courseDetailsWithStudent/:courseId", check_auth_user, async (req, res) => {
  try {
    const courseId = req.params.courseId;

    // 1. Token Validation
    if (!req.user?.userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access!",
      });
    }

    // 2. Check User Exists
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

    // 3. Find Course (only that course which belongs to this user)
    const courseData = await CourseRecord.findOne({
      _id: courseId,
      userId: req.user.userId
    }).populate("userId", "instFullName userName imageUrl");

    if (!courseData) {
      return res.status(404).json({
        status: false,
        message: "Course not found!",
      });
    }

    // 4. Find All Students Enrolled in This Course
    const students = await StudentRecord.find({
      courseId: courseId,
      userId: req.user.userId
    }).select("fullName studentEmail phone studentImageUrl createdAt");

    // Response Structure
    const responseData = {
      courseDetails: {
        courseId: courseData._id,
        courseName: courseData.courseName,
        price: courseData.price,
        description: courseData.description,
        courseImageUrl: courseData.courseImageUrl,
        startDate: courseData.startDate,
        endDate: courseData.endDate,
        user: courseData.userId
      },
      totalStudents: students.length,
      studentList: students
    };

    return res.status(200).json({
      status: true,
      message: "Course Student list fetched successfully!",
      data: responseData
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});


/* // Get Course Details + All Students Enrolled in That Course
routes.get("/courseDetailsWithStudent/:courseId", check_auth_user, async (req, res) => {
  try {
    const courseId = req.params.courseId;

    // 1. Token Validation
    if (!req.user?.userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access!",
      });
    }

    // 2. Check User Exists
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

    // 3. Find Course (only user’s course)
    const courseData = await CourseRecord.findOne({
      _id: courseId,
      userId: req.user.userId
    }).populate("userId", "firstName lastName userName imageUrl");

    if (!courseData) {
      return res.status(404).json({
        status: false,
        message: "Course not found!",
      });
    }

    // 4. Find all students enrolled in this course
    const students = await StudentRecord.find({
      courseId: courseId,
      userId: req.user.userId
    }).select("fullName studentEmail phone imageUrl createdAt");

    
    // Final Response
    const responseData = {
      courseDetails: courseData,
      totalStudents: students.length,
      studentList: students
    };

    return res.status(200).json({
      status: true,
      message: "Course + Student list fetched successfully!",
      data: responseData
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
}); */


routes.get("/homeApi", check_auth_user, async (req, res) => {
  try {

    // ---------------------------------------------------
    // 🔹 1) Latest 5 Courses
    // ---------------------------------------------------
    const latestCourses = await CourseRecord.find({ userId: req.user.userId })
      .sort({ $natural: -1 })
      .limit(5)
      .populate("userId", "instFullName userName imageUrl");

    let courseResult = [];

    for (let i = 0; i < latestCourses.length; i++) {
      const course = latestCourses[i].toObject();
      delete course.userId;

      courseResult.push({
        courseData: course
      });
    }

    // ---------------------------------------------------
    // 🔹 2) Latest 5 Students
    // ---------------------------------------------------
    const students = await StudentRecord.find({ userId: req.user.userId })
      .sort({ $natural: -1 })
      .limit(5)
      .populate("userId", "instFullName userName imageUrl")
      .populate("courseId", "courseName price courseImageUrl");

    let studentResult = [];

    for (let i = 0; i < students.length; i++) {

      const student = students[i].toObject();

      const userDatas = students[i].userId
        ? {
          _id: students[i].userId._id,
          instFullName: students[i].userId.instFullName,
          userName: students[i].userId.userName,
          imageUrl: students[i].userId.imageUrl
        }
        : {};

      const courseDatas = students[i].courseId
        ? {
          _id: students[i].courseId._id,
          courseName: students[i].courseId.courseName,
          price: students[i].courseId.price,
          courseImageUrl: students[i].courseId.courseImageUrl
        }
        : {};

      delete student.userId;
      delete student.__v;

      student.courseId = students[i].courseId ? String(students[i].courseId._id) : student.courseId;

      studentResult.push({
        studentData: student,
        userDatas,
        courseDatas
      });
    }

    // ---------------------------------------------------
    // 🔹 3) Latest 5 Fees (Payments)
    // ---------------------------------------------------
    const latestPayments = await feesRecord.find({ userId: req.user.userId })
      .sort({ $natural: -1 })
      .limit(5)
      .populate("userId", "instFullName userName imageUrl");




    const totalAmountData = await feesRecord.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.userId) } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    // If no records found → default 0
    const totalAmount = totalAmountData.length > 0 ? totalAmountData[0].total : 0;


    let feesResult = [];
    // let totalAmount = 0;

    for (let i = 0; i < latestPayments.length; i++) {
      const fee = latestPayments[i].toObject();

      delete fee.userId;

      // totalAmount += fee.amount ? fee.amount : 0;

      feesResult.push({
        feesData: fee
      });
    }

    // ---------------------------------------------------
    // 🔹 4) Counts
    // ---------------------------------------------------
    const totalCourse = await CourseRecord.countDocuments({
      userId: req.user.userId
    });

    const totalStudentCount = await StudentRecord.countDocuments({
      userId: req.user.userId
    });

    // ---------------------------------------------------
    // 🔹 5) Final Response
    // ---------------------------------------------------
    return res.status(200).json({
      status: true,
      message: "Home API data fetched successfully!",

      totalCourse,
      totalStudent: totalStudentCount,
      totalAmount,

      courseList: courseResult,
      studentListssss: studentResult,
      feesHistoryList: feesResult
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server Error",
      error: error.message
    });
  }
});



module.exports = routes;


