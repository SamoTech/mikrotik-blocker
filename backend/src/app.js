require('dotenv').config();
const express = require('express');
const cors = require('cors');
const resolveRouter = require('./routes/resolve');
const mikrotikRouter = require('./routes/mikrotik');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());

app.use('/api/resolve', resolveRouter);
app.use('/api/mikrotik', mikrotikRouter);

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`🚀 MikroTik Blocker backend running on port ${PORT}`);
});
