const Workflow = require('../models/Workflow');
const Organization = require('../models/Organization');
const generateWebhookId = require('../utils/generateWebhookId');

// Create Workflow
exports.createWorkflow = async (req, res) => {
  try {
    const { name, description, triggerType, actions } = req.body;
    const { organizationId } = req.user;
    const { userId } = req.user;

    // Validate trigger type
    const validTriggers = [
      'GOOGLE_FORM',
      'PROJECT_ASSIGNMENT',
      'SOCIAL_EVENT',
      'ZOOM_EVENT',
      'ECOMMERCE_ORDER',
    ];
    if (!validTriggers.includes(triggerType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trigger type',
      });
    }

    // Generate webhook ID
    const webhookId = generateWebhookId();

    // Create workflow
    const workflow = await Workflow.create({
      name,
      description,
      organizationId,
      createdBy: userId,
      triggerType,
      webhookId,
      actions: actions.map((action, index) => ({
        ...action,
        order: index,
      })),
    });

    // Update organization workflow count
    await Organization.findByIdAndUpdate(organizationId, {
      $inc: { workflowCount: 1 },
    });

    res.status(201).json({
      success: true,
      message: 'Workflow created successfully',
      workflow,
    });
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating workflow',
      error: error.message,
    });
  }
};

// Get All Workflows
exports.getWorkflows = async (req, res) => {
  try {
    const { organizationId } = req.user;

    const workflows = await Workflow.find({ organizationId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: workflows.length,
      workflows,
    });
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching workflows',
      error: error.message,
    });
  }
};

// Get Single Workflow
exports.getWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const workflow = await Workflow.findOne({
      _id: id,
      organizationId,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    res.status(200).json({
      success: true,
      workflow,
    });
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching workflow',
      error: error.message,
    });
  }
};

// Update Workflow
exports.updateWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;
    const { name, description, actions, isActive } = req.body;

    const workflow = await Workflow.findOneAndUpdate(
      { _id: id, organizationId },
      {
        name,
        description,
        actions: actions?.map((action, index) => ({
          ...action,
          order: index,
        })),
        isActive,
      },
      { new: true }
    );

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Workflow updated successfully',
      workflow,
    });
  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating workflow',
      error: error.message,
    });
  }
};

// Delete Workflow
exports.deleteWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const workflow = await Workflow.findOneAndDelete({
      _id: id,
      organizationId,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    // Update organization workflow count
    await Organization.findByIdAndUpdate(organizationId, {
      $inc: { workflowCount: -1 },
    });

    res.status(200).json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting workflow',
      error: error.message,
    });
  }
};

// Get webhook URL for a workflow
exports.getWebhookUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const workflow = await Workflow.findOne({
      _id: id,
      organizationId,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    const webhookUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/webhook/${workflow.webhookId}`;

    res.status(200).json({
      success: true,
      webhookUrl,
      webhookId: workflow.webhookId,
    });
  } catch (error) {
    console.error('Get webhook URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching webhook URL',
      error: error.message,
    });
  }
};
