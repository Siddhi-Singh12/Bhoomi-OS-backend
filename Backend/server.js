const app = require('./src/app');
const env = require('./src/config/env');
const pool = require('./src/config/db');

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});