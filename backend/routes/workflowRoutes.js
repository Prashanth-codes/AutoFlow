const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/', workflowController.createWorkflow);
router.get('/', workflowController.getWorkflows);
router.get('/:id', workflowController.getWorkflow);
router.put('/:id', workflowController.updateWorkflow);
router.delete('/:id', workflowController.deleteWorkflow);

router.get('/:id/webhook-url', workflowController.getWebhookUrl);

router.post('/:id/schedule', workflowController.scheduleWorkflowPost);

router.post('/:id/trigger', workflowController.triggerWorkflow);

module.exports = router;
