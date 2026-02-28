const express = require('express');
const router = express.Router();
const commentRuleController = require('../controllers/commentRuleController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

router.get('/', commentRuleController.getRules);
router.get('/:id', commentRuleController.getRule);
router.post('/', commentRuleController.createRule);
router.put('/:id', commentRuleController.updateRule);
router.delete('/:id', commentRuleController.deleteRule);
router.patch('/:id/toggle', commentRuleController.toggleRule);

module.exports = router;
