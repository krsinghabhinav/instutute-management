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

routes.post("/addFees", check_auth_user, async (req, res) => {
    try {
        const { fullName, phone, remark, amount, courseId } = req.body;

        // -------------------- Validate Inputs --------------------
        if (!fullName || !phone || !remark || !amount || !courseId) {
            return res.status(200).json({
                status: false,
                message: "All fields (fullName, phone, remark, amount, courseId) are required!",
            });
        }

        // Phone Validation
        if (phone.length !== 10) {
            return res.status(200).json({
                status: false,
                message: "Phone number must be exactly 10 digits!",
            });
        }

        // -------------------- Token Validation --------------------
        if (!req.user?.userId) {
            return res.status(401).json({
                status: false,
                message: "Unauthorized access!",
            });
        }

        // -------------------- Check Auth User --------------------
        const existUser = await UserRecord.findById(req.user.userId);
        if (!existUser) {
            return res.status(200).json({
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

        // -------------------- Course Validation --------------------
        const courseExist = await CourseRecord.findOne({
            _id: courseId,
            userId: req.user.userId
        });

        if (!courseExist) {
            return res.status(200).json({
                status: false,
                message: "Course not found or does not belong to this user!",
            });
        }

        // -------------------- Fee Record Save --------------------
        const newFees = new feesRecord({
            _id: new mongoose.Types.ObjectId(),
            fullName,
            phone,
            remark,
            amount,
            courseId,
            userId: req.user.userId,
        });

        await newFees.save();

        return res.status(200).json({
            status: true,
            message: "Fees added successfully!",
            feesData: newFees,
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
});

routes.get("/payment_history", check_auth_user, async (req, res) => {
    try {
        // -------------------- Token Check --------------------
        if (!req.user?.userId) {
            return res.status(401).json({
                status: false,
                message: "Unauthorized access!",
            });
        }

        // -------------------- Check Auth User --------------------
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

        // -------------------- Fetch Fees --------------------
        const feesList = await feesRecord
            .find({ userId: req.user.userId })
            .sort({ createdAt: -1 })
            .populate("courseId", "courseName price courseImageUrl")
            .populate("userId", "instFullName userName imageUrl");

        if (feesList.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No payment history found!",
                feesList: [],
            });
        }

        // ------------ Format Data using FOR LOOP ------------
        let finalFeesList = [];

        for (let i = 0; i < feesList.length; i++) {
            let item = feesList[i];

            // --------- Extract courseData ---------
            let courseData = item.courseId
                ? {
                    courseId: item.courseId._id,
                    courseName: item.courseId.courseName,
                    price: item.courseId.price,
                    courseImageUrl: item.courseId.courseImageUrl,
                }
                : {};

            // --------- Extract userData ---------
            let userData = item.userId
                ? {
                    userId: item.userId._id,
                    instFullName: item.userId.instFullName,

                    userName: item.userId.userName,
                    imageUrl: item.userId.imageUrl,
                }
                : {};


            // let studentData = item.studentId ? {
            //     studentId: item.studentId._id,
            //     fullName: item.studentId.fullName,
            //     phone: item.studentId.phone,


            // } : {};

            // --------- Push final formatted data ---------
            finalFeesList.push({
                _id: item._id,
                fullName: item.fullName,
                phone: item.phone,
                remark: item.remark,
                amount: item.amount,
                createdAt: item.createdAt,
                courseData: courseData,
                userData: userData,
                // studentData: studentData,
            });
        }

        // -------------------- Response --------------------
        return res.status(200).json({
            status: true,
            message: "Payment history fetched successfully!",
            totalPayments: finalFeesList.length,
            feesList: finalFeesList,
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
});


// Get all payments for a specific student in a course
//http://localhost:3000/fee/all_payment?courseId=6931b391e73c40e0ec98bbb2&phone=8840591008
routes.get("/all_payment", check_auth_user, async (req, res) => {
    try {
        // -------------------- Token Check --------------------
        if (!req.user?.userId) {
            return res.status(401).json({
                status: false,
                message: "Unauthorized access!",
            });
        }

        // -------------------- Check Auth User --------------------
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

        // -------------------- Fetch Payments --------------------
        const feesData = await feesRecord
            .find({
                userId: req.user.userId,
                courseId: req.query.courseId,
                phone: req.query.phone,
            })
            .sort({ createdAt: -1 })
            .populate("courseId", "courseName price courseImageUrl")
            .populate("userId", "instFullName userName imageUrl");

        // ------------ Now convert data using loop with index ----------------
        let finalList = [];
        let totalAmount = 0.0;
        for (let i = 0; i < feesData.length; i++) {
            let fee = feesData[i];

            const courseInfo = fee.courseId
                ? {
                    courseName: fee.courseId.courseName,
                    courseId: fee.courseId._id,
                    price: fee.courseId.price,
                    courseImageUrl: fee.courseId.courseImageUrl,
                }
                : {};

            const userInfo = fee.userId
                ? {
                    instFullName: fee.userId.instFullName,
                    userName: fee.userId.userName,
                    imageUrl: fee.userId.imageUrl,
                }
                : {};

            let cleanFee = fee.toObject();
            delete cleanFee.__v;
            delete cleanFee.userId;
            delete cleanFee.courseId;
            totalAmount += fee.amount;

            finalList.push({

                paymentData: cleanFee,
                courseData: courseInfo,
                userData: userInfo,
            });
        }

        return res.status(200).json({
            status: true,
            message: "Payment history fetched successfully!",
            totalPayments: finalList.length,
            totalAmounts: totalAmount,
            feesList: finalList,
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
});




routes.patch("/feeUpdate/:feeId", check_auth_user, async (req, res) => {
    try {
        const feeId = req.params.feeId;
        const { fullName, remark, amount } = req.body;

        // -------------------- Token Check --------------------
        if (!req.user?.userId) {
            return res.status(401).json({
                status: false,
                message: "Unauthorized access!",
            });
        }

        // -------------------- Check Auth User --------------------
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

        // -------------------- Find Fee --------------------
        const fee = await feesRecord.findById(feeId);

        if (!fee) {
            return res.status(404).json({
                status: false,
                message: "Fees record not found!",
            });
        }

        // -------------------- Authorization Check --------------------
        if (fee.userId.toString() !== req.user.userId) {
            return res.status(403).json({
                status: false,
                message: "You are not authorized to update this fees record!",
            });
        }

        // -------------------- Prepare Update Fields --------------------
        let updateFeeData = {};

        if (fullName) updateFeeData.fullName = fullName;
        if (remark) updateFeeData.remark = remark;
        if (amount) updateFeeData.amount = amount;

        // No fields to update
        if (Object.keys(updateFeeData).length === 0) {
            return res.status(400).json({
                status: false,
                message: "No valid fields provided for update!",
            });
        }

        // -------------------- Update Fee --------------------
        const updatedFees = await feesRecord.findByIdAndUpdate(
            feeId,
            updateFeeData,
            { new: true }
        );

        return res.status(200).json({
            status: true,
            message: "Fees updated successfully!",
            updatedFees,
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
});

routes.delete("/feeDelete/:feeId", check_auth_user, async (req, res) => {
    try {

        const feeId = req.params.feeId;

        // ---- Find Fee Record ----
        const fee = await feesRecord.findById(feeId);
        if (!fee) {
            return res.status(404).json({
                status: false,
                message: "Fee record not found!",
            });
        }

        // ---- Authorization Check ----
        if (fee.userId.toString() !== req.user.userId) {
            return res.status(403).json({
                status: false,
                message: "You are not authorized to delete this fee!",
            });
        }

        // ---- Delete ----
        await fee.deleteOne();

        return res.status(200).json({
            status: true,
            message: "Fee deleted successfully!",
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