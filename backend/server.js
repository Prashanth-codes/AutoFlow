require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const instagramRoutes = require('./routes/instagramRoutes');
const instagramOAuthRoutes = require('./routes/instagramOAuthRoutes');
const commentRuleRoutes = require('./routes/commentRuleRoutes');
const scheduler = require('./services/scheduler');

const app = express();

// Connect to DB, then recover any pending scheduled posts
connectDB().then(() => {
  scheduler.recoverScheduledPosts();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/webhook/instagram', instagramRoutes);
app.use('/api/instagram-oauth', instagramOAuthRoutes);
app.use('/api/comment-rules', commentRuleRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Base URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
});

module.exports = app;
