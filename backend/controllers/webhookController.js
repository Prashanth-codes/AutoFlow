const Workflow = require('../models/Workflow');
const ExecutionLog = require('../models/ExecutionLog');
const workflowEngine = require('../services/workflowEngine');

// Receive webhook and trigger workflow
exports.handleWebhook = async (req, res) => {
  try {
    const { webhookId } = req.params;
    const payload = req.body;

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
