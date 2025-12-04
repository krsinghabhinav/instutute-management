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

// ✅ Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME || "dyit1jjef",
  api_key: process.env.CLOUD_KEY || "743564427533897",
  api_secret: process.env.CLOUD_SECRET || "TR9TvJlNF5Blp6AcyZ0plQ0kqkQ",
});

routes.post("/userSignup", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phoneNumber,
      address,
      email,
      password,
      userName,
    } = req.body;

    // 🔹 Validate input
    if (
      !firstName ||
      !lastName ||
      !phoneNumber ||
      !address ||
      !email ||
      !password ||
      !userName
    ) {
      return res.status(400).json({
        status: false,
        message: "All fields are required",
      });
    }

    if (phoneNumber.length !== 10) {
      return res
        .status(400)
        .json({ status: false, message: "Phone number must be 10 digits" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: false,
        message: "Password must be at least 6 characters",
      });
    }

    // 🔹 Check existing email
    const existUserEmail = await UserRecord.findOne({ email: email });
    if (existUserEmail) {
      return res
        .status(400)
        .json({ status: false, message: "Email already exists" });
    }

    let imageUrl = "";
    let imageId = "";

    if (req.files?.image) {
      const file = req.files.image;
      const uploadResult = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "user_folder",
      });

      const fullId = uploadResult.public_id; // e.g. "user_folder/abc123xyz"
      const shortId = fullId.split("/").pop(); // ✅ "abc123xyz"

      imageUrl = uploadResult.secure_url;
      imageId = shortId; // ✅ folder name removed
    }

    // 🔹 Password Hash
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 Create new user
    const newUser = new UserRecord({
      _id: new mongoose.Types.ObjectId(), // 👈 Auto ID fix
      firstName,
      lastName,
      phoneNumber,
      address,
      email,
      userName,
      password: hashedPassword,
      imageUrl,
      imageId,
    });

    // 🔹 Save user in DB
    await newUser.save();

    // ✅ Success Response
    res.status(201).json({
      status: true,
      message: "Signup successful",
      userData: {
        id: newUser._id,
        firstName,
        lastName,
        phoneNumber,
        address,
        userName,
        email,
        imageUrl,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
});

routes.post("/userLogin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: "Email and password are required!",
      });
    }

    // ✅ Correct DB query field name
    const existUser = await UserRecord.findOne({ email });

    if (!existUser) {
      return res.status(404).json({
        status: false,
        message: "User not found!",
      });
    }

    if (existUser.isDeleted) {
      return res.status(403).json({
        status: false,
        message:
          "Your account is marked for deletion. It will be permanently deleted after 10 days.",
      });
    }

    const isMatchPassword = await bcrypt.compare(password, existUser.password);

    if (!isMatchPassword) {
      return res.status(401).json({
        status: false,
        message: "Invalid password!",
      });
    }

    // ✅ Create JWT Token
    const token = jwt.sign(
      {
        userId: existUser._id,
        firstName: existUser.firstName,
        lastName: existUser.lastName,
        email: existUser.email,
        phoneNumber: existUser.phoneNumber,
      },
      process.env.JWT_SECRET || "tokenkey",
      { expiresIn: "10d" }
    );

    return res.status(200).json({
      status: true,
      message: "User Login Successful!",
      token,
      userData: existUser,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error!",
      error: err.message,
    });
  }
});

routes.get("/getUserDetails", check_auth_user, async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access! Token invalid or missing.",
      });
    }

    const exitUser = await UserRecord.findById(req.user.userId);
    if (!exitUser) {
      return res.status(404).json({
        status: false,
        message: "User not found!",
      });
    }

    if (exitUser.isDeleted) {
      return res.status(400).json({
        status: false,
        message:
          "Your account is marked for deletion. It will be permanently deleted after 10 days.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "User fetched successfully!",
      userData: exitUser,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
});

routes.patch("/updateUser", check_auth_user, async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, address, userName } = req.body;

    // Find existing user
    const existUser = await UserRecord.findById(req.user.userId);
    if (!existUser) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    let imageUrl = existUser.imageUrl;
    let imageId = existUser.imageId;

    // If new image uploaded
    if (req.files?.image) {
      const file = req.files.image;

      // Delete old image from Cloudinary if exists
      if (existUser.imageId) {
        const oldPublicId = `user_folder/${existUser.imageId}`;
        await cloudinary.uploader.destroy(oldPublicId); // ✅ old image deleted
      }

      // Upload new image with same imageId name to replace
      const uploadResult = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "user_folder",
        public_id: existUser.imageId || undefined, // ✅ same ID to replace
        overwrite: true, // ✅ mandatory for replace
      });

      const fullId = uploadResult.public_id; // "user_folder/abc123"
      const shortId = fullId.split("/").pop(); // "abc123"

      imageUrl = uploadResult.secure_url;
      imageId = shortId;
    }

    // Update user fields
    existUser.firstName = firstName || existUser.firstName;
    existUser.lastName = lastName || existUser.lastName;
    existUser.phoneNumber = phoneNumber || existUser.phoneNumber;
    existUser.address = address || existUser.address;
    existUser.imageUrl = imageUrl || existUser.imageUrl;
    existUser.imageId = imageId || existUser.imageId;
    existUser.userName = userName || existUser.userName;

    await existUser.save();

    res.status(200).json({
      status: true,
      message: "User updated successfully",
      user: existUser,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
});

routes.post("/change_password", check_auth_user, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        status: false,
        message: "New password is required!",
      });
    }

    if (newPassword.length < 6) {
      // ✅ FIX length check
      return res.status(400).json({
        status: false,
        message: "Password must be at least 6 characters long!",
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
      return res.status(403).json({
        status: false,
        message:
          "Your account is marked for deletion and cannot change password. It will be permanently deleted after 10 days.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10); // ✅ added saltRounds = 10

    existUser.password = hashedPassword; // ✅ FIXED variable name
    await existUser.save();

    return res.status(200).json({
      status: true,
      message: "Password updated successfully!",
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error!",
      error: err.message, // ✅ consistent key name
    });
  }
});

routes.delete("/delete_account", check_auth_user, async (req, res) => {
  try {
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
        message:
          "Your account is already marked for deletion. It will be permanently deleted after 10 days.",
      });
    }

    // ✅ DELETE CLOUDINARY IMAGE IF EXISTS
    if (existUser.imageId) {
      const oldPublicId = `user_folder/${existUser.imageId}`;
      await cloudinary.uploader.destroy(oldPublicId); // ✅ IMAGE DELETE FIXED
      existUser.imageUrl = "";
      existUser.imageId = "";
    }

    // ✅ MARK ACCOUNT AS DELETED
    existUser.isDeleted = true;
    existUser.deletedAt = new Date();

    await existUser.save();

    return res.status(200).json({
      status: true,
      message:
        "Your account has been marked for deletion. It will be permanently deleted after 10 days.",
      userData: {
        _id: existUser._id,
        firstName: existUser.firstName,
        lastName: existUser.lastName,
        email: existUser.email,
        phoneNumber: existUser.phoneNumber,
        address: existUser.address,
        isDeleted: existUser.isDeleted,
        deletedAt: existUser.deletedAt, // ✅ returning correct key
        imageUrl: existUser.imageUrl, // now will be empty
        imageId: existUser.imageId, // now will be empty
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error!",
      error: err.message,
    });
  }
});
module.exports = routes;
