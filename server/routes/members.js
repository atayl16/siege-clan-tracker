const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  db.all(
    `SELECT 
      username, 
      member_type,
      siege_score,
      skiller_rank,
      fighter_rank
     FROM members`,
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(rows);
    }
  );
});

module.exports = router;
