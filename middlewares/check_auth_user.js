const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Authorization header missing or malformed" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    // Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "tokenkey");

    req.user = decoded;

    console.log("✅ Verified Token Payload:", decoded);

    next();
  } catch (err) {
    console.error("❌ JWT Error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
