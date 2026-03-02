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

// Schedule a SCHEDULED_POST workflow
router.post('/:id/schedule', workflowController.scheduleWorkflowPost);

// Manually trigger a workflow (e.g. Create Meeting button)
router.post('/:id/trigger', workflowController.triggerWorkflow);

module.exports = router;
