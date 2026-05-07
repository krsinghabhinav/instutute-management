const mongoose = require("mongoose");

const feeSchema = new mongoose.Schema(
    {
        _id: mongoose.Schema.Types.ObjectId,
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        phone: { type: String, required: true, trim: true },
        remark: { type: String, required: true, trim: true },
        amount: { type: Number, required: true, trim: true },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StudentRecord",
            // required: true,
        },
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
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("feesRecord", feeSchema);
