const express = require('express');
const router = express.Router();
const linkedinController = require('../controllers/linkedinController');
const authMiddleware = require('../middlewares/authMiddleware');

// ── OAuth flow (public — user clicks from frontend) ────────
router.get('/auth/linkedin', linkedinController.startOAuth);
router.get('/auth/linkedin/callback', linkedinController.handleCallback);

// ── Protected endpoints ─────────────────────────────────────
router.get('/linkedin/status', authMiddleware, linkedinController.getStatus);
router.post('/linkedin/test-post', authMiddleware, linkedinController.testPost);
router.delete('/linkedin/disconnect', authMiddleware, linkedinController.disconnect);

module.exports = router;
