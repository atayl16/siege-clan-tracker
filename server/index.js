const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const app = express();

require("dotenv").config();

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/api/members", async (req, res) => {
  try {
    const { data: members, error } = await supabase.from("members").select("*");
    if (error) throw error;
    res.json(members);
  } catch (err) {
    console.error("Error fetching members:", err);
    res.status(500).json({ error: err.message });
  }
});

// Basic health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
