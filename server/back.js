const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const db = new sqlite3.Database('leaderboard.db');

const PORT = process.env.PORT || 4300;



db.run(`DROP TABLE leaderboard`)



// Middleware
app.use(bodyParser.json());

// Start server
app.listen(PORT, () => {
  console.log(`Leaderboard server running on port ${PORT}`);
});

