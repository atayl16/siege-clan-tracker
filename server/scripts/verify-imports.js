 const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.resolve(__dirname, '../siege.db'));

// Count the records
db.get('SELECT COUNT(*) as count FROM members', (err, row) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log(`Total members in database: ${row.count}`);
  
  // Sample some records - update fields to match your schema
  db.all('SELECT wom_id, name, womrole, current_xp, ehb FROM members LIMIT 5', (err, rows) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    console.log('Sample records:');
    console.table(rows);
    
    db.close();
  });
});
