const Workflow = require('../models/Workflow');
const ExecutionLog = require('../models/ExecutionLog');
const workflowEngine = require('../services/workflowEngine');

// Receive webhook and trigger workflow
exports.handleWebhook = async (req, res) => {
  try {
    const { webhookId } = req.params;
    let payload = req.body;

    // Find workflow by webhook ID
    const workflow = await Workflow.findOne({ webhookId });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    if (!workflow.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Workflow is inactive',
      });
    }

    // Flatten Google Form responses array into a simple key-value object
    // Google Forms sends: { responses: [{ question: "Name", answer: "John" }, ...] }
    // We normalize to: { name: "John", email: "john@example.com", ... }
    if ((workflow.triggerType === 'GOOGLE_FORM' || workflow.triggerType === 'ECOMMERCE_ORDER') && Array.isArray(payload.responses)) {
      const flattened = {};
      for (const item of payload.responses) {
        if (item.question && item.answer !== undefined) {
          // all should in lowercase and spaces replaced with underscores.
          const key = item.question.trim().toLowerCase().replace(/\s+/g, '_');
          flattened[key] = item.answer;
        }
      }
      // Keep original responses as _rawResponses for reference
      flattened._rawResponses = payload.responses;
      payload = flattened;
    }

    // Ensure payload is always a valid object
    if (!payload || (typeof payload === 'object' && Object.keys(payload).length === 0)) {
      payload = { _trigger: workflow.triggerType, _triggeredAt: new Date().toISOString() };
    }

    // Validate form fields for triggers with form fields
    if (
      (workflow.triggerType === 'GOOGLE_FORM' || workflow.triggerType === 'ECOMMERCE_ORDER') &&
      workflow.triggerConfig?.formFields?.length > 0
    ) {
      const missingFields = workflow.triggerConfig.formFields
        .filter((f) => f.required && (payload[f.fieldName] === undefined || payload[f.fieldName] === ''))
        .map((f) => f.fieldLabel || f.fieldName);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
        });
      }
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
      console.error('Workflow execution error:', error);
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
    console.error('Webhook handling error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message,
    });
  }
};

// Get execution logs
exports.getExecutionLogs = async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { organizationId } = req.user;

    // Verify workflow belongs to organization
    const workflow = await Workflow.findOne({
      _id: workflowId,
      organizationId,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    const logs = await ExecutionLog.find({
      workflowId,
      organizationId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error('Get execution logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching execution logs',
      error: error.message,
    });
  }
};

// Get single execution log
exports.getExecutionLog = async (req, res) => {
  try {
    const { logId } = req.params;
    const { organizationId } = req.user;

    const log = await ExecutionLog.findOne({
      _id: logId,
      organizationId,
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Execution log not found',
      });
    }

    res.status(200).json({
      success: true,
      log,
    });
  } catch (error) {
    console.error('Get execution log error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching execution log',
      error: error.message,
    });
  }
};
