const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

router.post("/login", async (req, res) => {
  const { password } = req.body;

  if (await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH)) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

module.exports = router;
