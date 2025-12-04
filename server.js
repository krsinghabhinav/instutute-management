require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const app = require("./app");
const PORT = process.env.PORT || 3000;
const cron = require("node-cron");
const UserRecord = require("./model/user_model");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 120000,
    });
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

connectDB();

// Cron job (midnight)
cron.schedule("0 0 * * *", async () => {
  try {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    const result = await UserRecord.deleteMany({
      isDeleted: true,
      deletedAt: { $lte: tenDaysAgo },
    });

    console.log(`🧹 Deleted ${result.deletedCount} users before ${tenDaysAgo}`);
  } catch (err) {
    console.error("❌ Error in cron job:", err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
