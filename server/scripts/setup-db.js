const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Create or open the database
const db = new sqlite3.Database(path.resolve(__dirname, '../siege.db'));

// Read the schema SQL
const schema = fs.readFileSync(path.resolve(__dirname, '../db/schema.sql'), 'utf8');

// Execute the schema SQL
db.exec(schema, (err) => {
  if (err) {
    console.error('Error setting up database:', err.message);
    process.exit(1);
  }
  console.log('Database schema created successfully!');
  
  // Close the database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
      process.exit(1);
    }
    console.log('Database connection closed.');
  });
});
