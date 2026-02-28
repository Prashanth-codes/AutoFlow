const express = require('express');
const router = express.Router();
const instagramController = require('../controllers/instagramController');

// Instagram webhook verification (GET) and event handler (POST) — public, no auth
router.get('/', instagramController.verifyWebhook);
router.post('/', instagramController.handleWebhook);

module.exports = router;
