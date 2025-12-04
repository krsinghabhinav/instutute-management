const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,

    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" }, // ✅ not required now
    imageId: { type: String, default: "" }, // ✅ not required now
    address: { type: String, required: true, trim: true },
    userName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Invalid email format",
      ],
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: [6, "Password must be at least 6 characters"],
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserRecord", userSchema);
