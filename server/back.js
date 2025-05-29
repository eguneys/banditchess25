const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const db = new sqlite3.Database('leaderboard.db');

const PORT = process.env.PORT || 4300;






// Middleware
app.use(bodyParser.json());


app.get('/votes', (req, res) => {
  db.all(`SELECT * FROM votes LIMIT 10000`, [combo], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
})

app.get('/drop', (req, res) => {
  db.run(`DROP TABLE leaderboard`)
})

// Start server
app.listen(PORT, () => {
  console.log(`Leaderboard server running on port ${PORT}`);
});

