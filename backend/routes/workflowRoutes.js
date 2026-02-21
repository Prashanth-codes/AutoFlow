const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes are protected
router.use(authMiddleware);

// Workflow CRUD
router.post('/', workflowController.createWorkflow);
router.get('/', workflowController.getWorkflows);
router.get('/:id', workflowController.getWorkflow);
router.put('/:id', workflowController.updateWorkflow);
router.delete('/:id', workflowController.deleteWorkflow);

// Webhook URL
router.get('/:id/webhook-url', workflowController.getWebhookUrl);

module.exports = router;
