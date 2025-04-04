const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/leaderboard", (req, res) => {
  db.all(
    `
    SELECT username, siege_score 
    FROM members 
    ORDER BY siege_score DESC
  `,
    (err, rows) => {
      if (err) return res.status(500).send(err.message);
      res.json(rows);
    }
  );
});

module.exports = router;
