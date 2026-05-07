const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,

    courseName: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    startDate: {
      type: String,
      required: true,
    },

    endDate: {
      type: String,
      required: true,
    },

    courseImageUrl: {
      type: String,

    },

    imageId: {
      type: String,

    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserRecord",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "completed"],
      default: "active",
    }
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

module.exports = mongoose.model("Course", courseSchema);
