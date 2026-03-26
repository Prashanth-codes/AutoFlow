const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/:webhookId', webhookController.handleWebhook);

router.get('/logs/:logId', authMiddleware, webhookController.getExecutionLog);
router.get('/:workflowId/logs', authMiddleware, webhookController.getExecutionLogs);


module.exports = router;
