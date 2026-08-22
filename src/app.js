const express = require('express');
const cors = require('cors');
const farmerRoutes = require('./routes/farmer.routes');
const farmRoutes = require('./routes/farm.routes');
const analysisRoutes = require('./routes/analysis.routes');
const proofPacketRoutes = require('./routes/proofPacket.routes');
const alertRoutes = require('./routes/alert.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/farmers', farmerRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/analyses', analysisRoutes);
app.use('/api/proof-packets', proofPacketRoutes);
app.use('/api/alerts', alertRoutes);


app.get('/', (req, res) => {
  res.send('Bhoomi OS backend is running');
});

module.exports = app;

