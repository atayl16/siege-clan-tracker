const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const needsUpdate = req.query.needs_update === "true";

  if (needsUpdate) {
    console.log("Fetching members needing updates...");
    db.all(
      `SELECT 
        name, 
        skiller_rank, 
        fighter_rank, 
        calculated_rank 
       FROM members 
       WHERE needs_rank_update = 1`,
      (err, rows) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Database error" });
        }
        console.log("Members needing updates:", rows);
        res.json(rows);
      }
    );
  } else {
    db.all(
      `SELECT 
        name, 
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
  }
});

module.exports = router;
