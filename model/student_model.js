const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
    {
        _id: mongoose.Schema.Types.ObjectId,

        fullName: { type: String, required: true, trim: true },

        phone: { type: String, required: true, trim: true },

        studentEmail: { type: String, required: true, trim: true },

        address: { type: String, required: true, trim: true },

        studentImageUrl: { type: String, required: true },

        imageId: { type: String, required: true },

        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            required: true,
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserRecord",
            required: true,
        },
    },
    { timestamps: true }
);

// 🟢 ALLOW: same email + different course
// ❌ BLOCK: same email + same course
studentSchema.index(
  { studentEmail: 1, courseId: 1 },
  { unique: true, partialFilterExpression: { studentEmail: { $type: "string" } } }
);

module.exports = mongoose.model("StudentRecord", studentSchema);
