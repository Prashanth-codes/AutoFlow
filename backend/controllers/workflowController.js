const Workflow = require('../models/Workflow');
const Organization = require('../models/Organization');
const generateWebhookId = require('../utils/generateWebhookId');
const scheduler = require('../services/scheduler');

// Create Workflow
exports.createWorkflow = async (req, res) => {
  try {
    const { name, description, triggerType, triggerConfig, actions } = req.body;
    const { organizationId } = req.user;
    const { userId } = req.user;
    //org id, userid comes from the jwt.


    // Validate trigger type
    const validTriggers = [
      'GOOGLE_FORM',
      'PROJECT_ASSIGNMENT',
      'SOCIAL_EVENT',
      'ZOOM_EVENT',
      'ECOMMERCE_ORDER',
      'SCHEDULED_POST',
    ];
    if (!validTriggers.includes(triggerType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trigger type',
      });
    }

    // Validate actions
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one action',
      });
    }

    // Generate webhook ID
    const webhookId = generateWebhookId();

    // Create workflow
    // Ensuring every action has fieldMappings, auto-assiging execution order.
    const workflow = await Workflow.create({
      name,
      description,
      organizationId,
      createdBy: userId,
      triggerType,
      webhookId,
      triggerConfig: (triggerType === 'GOOGLE_FORM' || triggerType === 'ECOMMERCE_ORDER' || triggerType === 'ZOOM_EVENT' || triggerType === 'SCHEDULED_POST') && triggerConfig ? triggerConfig : undefined,
      actions: actions.map((action, index) => ({
        ...action,
        fieldMappings: action.fieldMappings || {},
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
    const { name, description, actions, isActive, triggerType, triggerConfig } = req.body;

    // Build update object with only provided fields to avoid wiping unset ones
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (isActive !== undefined) updateFields.isActive = isActive;
    if (triggerType !== undefined) {
      const validTriggers = [
        'GOOGLE_FORM',
        'PROJECT_ASSIGNMENT',
        'SOCIAL_EVENT',
        'ZOOM_EVENT',
        'ECOMMERCE_ORDER',
        'SCHEDULED_POST',
      ];
      if (!validTriggers.includes(triggerType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid trigger type',
        });
      }
      updateFields.triggerType = triggerType;
    }
    if (triggerConfig !== undefined) updateFields.triggerConfig = triggerConfig;
    if (actions !== undefined) {
      updateFields.actions = actions.map((action, index) => ({
        ...action,
        fieldMappings: action.fieldMappings || {},
        order: index,
      }));
    }

    const workflow = await Workflow.findOneAndUpdate(
      { _id: id, organizationId },
      updateFields,
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

// Schedule a SCHEDULED_POST workflow
exports.scheduleWorkflowPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId, userId } = req.user;

    const workflow = await Workflow.findOne({ _id: id, organizationId });

    if (!workflow) {
      return res.status(404).json({ success: false, message: 'Workflow not found' });
    }

    if (workflow.triggerType !== 'SCHEDULED_POST') {
      return res.status(400).json({ success: false, message: 'Workflow is not a Scheduled Post trigger' });
    }

    const config = workflow.triggerConfig?.scheduledPostConfig;
    if (!config || !config.content || !config.scheduledFor) {
      return res.status(400).json({ success: false, message: 'Missing scheduled post configuration (content, scheduledFor)' });
    }

    // Create scheduled post via the scheduler
    const result = await scheduler.schedulePost(
      workflow,
      config.platform || 'linkedin',
      config.content,
      new Date(config.scheduledFor),
      null, // mediaUrl
      userId // pass the userId so LinkedIn service can look up the right account
    );

    // Increment execution count
    workflow.executionCount += 1;
    await workflow.save();

    res.status(200).json({
      success: true,
      message: `Post scheduled for ${new Date(config.scheduledFor).toLocaleString()}`,
      ...result,
    });
  } catch (error) {
    console.error('Schedule workflow post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling post',
      error: error.message,
    });
  }
};

// Trigger a workflow manually (e.g. "Create Meeting" button)
exports.triggerWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;
    const ExecutionLog = require('../models/ExecutionLog');
    const workflowEngine = require('../services/workflowEngine');

    const workflow = await Workflow.findOne({ _id: id, organizationId });

    if (!workflow) {
      return res.status(404).json({ success: false, message: 'Workflow not found' });
    }

    if (!workflow.isActive) {
      return res.status(403).json({ success: false, message: 'Workflow is inactive. Please activate it first.' });
    }

    // Build payload from request body or use defaults
    let payload = req.body || {};
    if (typeof payload === 'object' && Object.keys(payload).length === 0) {
      payload = { _trigger: workflow.triggerType, _triggeredAt: new Date().toISOString() };
    }

    // Create execution log entry
    const executionLog = await ExecutionLog.create({
      workflowId: workflow._id,
      organizationId: workflow.organizationId,
      triggerPayload: payload,
      status: 'pending',
    });

    // Execute workflow asynchronously
    workflowEngine.executeWorkflow(workflow, payload, executionLog._id).catch((error) => {
      console.error('Manual trigger execution error:', error);
    });

    // Increment execution count
    await Workflow.findByIdAndUpdate(workflow._id, {
      $inc: { executionCount: 1 },
    });

    res.status(202).json({
      success: true,
      message: 'Workflow triggered successfully',
      executionLogId: executionLog._id,
    });
  } catch (error) {
    console.error('Manual trigger error:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering workflow',
      error: error.message,
    });
  }
};
