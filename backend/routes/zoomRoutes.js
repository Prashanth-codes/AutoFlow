const express = require('express');
const router = express.Router();
const zoomWebhookController = require('../controllers/zoomWebhookController');
const authMiddleware = require('../middlewares/authMiddleware');

// ── Public: Zoom webhook endpoint (called by Zoom servers) ──
router.post('/webhook', zoomWebhookController.handleZoomWebhook);

// ── Protected: Zoom meeting data endpoints ──
router.get('/meetings/:workflowId', authMiddleware, zoomWebhookController.getZoomMeetings);
router.get('/meeting/:meetingDbId', authMiddleware, zoomWebhookController.getZoomMeeting);

module.exports = router;
