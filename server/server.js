const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const crypto = require('node:crypto');

const app = express();
const db = new sqlite3.Database('leaderboard.db');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.SECRET_SALT

// Middleware
app.use(bodyParser.json());

// Rate limiting: 1 request per 15 seconds per IP
const limiter = rateLimit({
  windowMs: 15 * 1000,
  max: 1,
  message: { error: 'Too many submissions. Try again soon.' }
});
app.use('/submit', limiter);

// Initialize database
db.run(`
  CREATE TABLE IF NOT EXISTS leaderboard (
    combo TEXT,
    handle TEXT PRIMARY KEY,
    score INTEGER
  )
`);

// Utility: Generate hash server-side
function generateHash(handle, score) {
  const data = `${SECRET}:${handle}:${score}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// GET /leaderboard - return top 10
app.get('/leaderboard/combo', (req, res) => {
  let combo = 'combo'
  db.all(`SELECT handle, score FROM leaderboard WHERE combo EQUALS ? ORDER BY score DESC LIMIT 10`, [combo], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});
app.get('/leaderboard/score', (req, res) => {
  let combo = 'score'
  db.all(`SELECT handle, score FROM leaderboard WHERE combo EQUALS ? ORDER BY score DESC LIMIT 10`, [combo], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});



// POST /submit - submit score
app.post('/submit', (req, res) => {
  const { handle, score, combo, hash } = req.body;

  if (!handle || typeof score !== 'number' || !hash || handle.length > 8 || !['combo', 'score'].includes(combo)) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  // Validate hash
  const expectedHash = generateHash(handle, score);
  if (hash !== expectedHash) {
    return res.status(403).json({ error: 'Invalid hash' });
  }

  // Insert or update if score is higher
  db.get(`SELECT score FROM leaderboard WHERE handle = ? AND combo = ?`, [handle, combo], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });

      db.run(`INSERT INTO leaderboard (handle, score, combo) VALUES (?, ?, ?) 
              ON CONFLICT(handle) DO UPDATE SET score = excluded.score`,
          [handle, score, combo],
          (err) => {
              if (err) return res.status(500).json({ error: 'DB insert error' });
              res.json({ success: true });
          }
      );
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Leaderboard server running on port ${PORT}`);
});
