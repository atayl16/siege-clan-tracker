const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const app = express();

// Handle unhandled promise rejections globally
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process
});

// Load environment variables with explicit path
require("dotenv").config({ path: path.resolve(__dirname, '.env') });

// Debug - Check if environment variables are loaded
console.log("SUPABASE_URL exists:", !!process.env.SUPABASE_URL);
console.log("SUPABASE_KEY exists:", !!process.env.SUPABASE_KEY);

// Initialize Supabase client with error handling
let supabase;
try {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );
  console.log("Supabase client initialized successfully");
} catch (err) {
  console.error("Failed to initialize Supabase client:", err);
  // Continue anyway to allow the server to start
}

// Middleware
app.use(cors());
app.use(express.json());

// Routes with better error handling
app.get("/api/members", async (req, res) => {
  try {
    console.log("API: Fetching members...");
    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }
    const { data: members, error } = await supabase.from("members").select("*");
    if (error) throw error;
    console.log(`API: Returning ${members?.length || 0} members`);
    res.json(members || []);
  } catch (err) {
    console.error("Error fetching members:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/events", async (req, res) => {
  try {
    console.log("API: Fetching events...");
    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }
    const { data: events, error } = await supabase.from("events").select("*");
    if (error) throw error;
    console.log(`API: Returning ${events?.length || 0} events`);
    res.json(events || []);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: err.message });
  }
});

// Basic health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", supabaseConnected: !!supabase });
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
});

// Keep the process running
console.log("Server initialized. Press Ctrl+C to stop.");

// This prevents Node from exiting
process.stdin.resume();
