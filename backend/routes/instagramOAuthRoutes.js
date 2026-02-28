const express = require('express');
const router = express.Router();
const instagramOAuthController = require('../controllers/instagramOAuthController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public — these are browser redirects, not API calls
router.get('/auth', instagramOAuthController.initiateOAuth);       // start OAuth
router.get('/callback', instagramOAuthController.handleCallback);  // Instagram redirects here

// Protected — need JWT
router.get('/status', authMiddleware, instagramOAuthController.getConnectionStatus);
router.delete('/disconnect', authMiddleware, instagramOAuthController.disconnect);

module.exports = router;
