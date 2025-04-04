const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3");
const app = express();

require("dotenv").config();

// Initialize database
const path = require("path");
const db = new sqlite3.Database(path.resolve(__dirname, "siege.db"));
// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/api/members", (req, res) => {
  db.all("SELECT * FROM members", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Basic health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  db.run("PRAGMA journal_mode = WAL;"); // Better SQLite performance
});
