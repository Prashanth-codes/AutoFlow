const Workflow = require('../models/Workflow');
const ExecutionLog = require('../models/ExecutionLog');
const workflowEngine = require('../services/workflowEngine');

exports.handleWebhook = async (req, res) => {
  try {
    const { webhookId } = req.params;
    let payload = req.body;

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

    if ((workflow.triggerType === 'GOOGLE_FORM' || workflow.triggerType === 'ECOMMERCE_ORDER') && Array.isArray(payload.responses)) {
      const flattened = {};
      for (const item of payload.responses) {
        if (item.question && item.answer !== undefined) {
          const key = item.question.trim().toLowerCase().replace(/\s+/g, '_');
          flattened[key] = item.answer;
        }
      }
      flattened._rawResponses = payload.responses;
      payload = flattened;
    }

    if (!payload || (typeof payload === 'object' && Object.keys(payload).length === 0)) {
      payload = { _trigger: workflow.triggerType, _triggeredAt: new Date().toISOString() };
    }

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

    const executionLog = await ExecutionLog.create({
      workflowId: workflow._id,
      organizationId: workflow.organizationId,
      triggerPayload: payload,
      status: 'pending',
    });

    workflowEngine.executeWorkflow(workflow, payload, executionLog._id).catch((error) => {
      console.error('Workflow execution error:', error);
    });

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

exports.getExecutionLogs = async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { organizationId } = req.user;

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
