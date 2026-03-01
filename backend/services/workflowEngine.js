const ExecutionLog = require('../models/ExecutionLog');
const actionExecutor = require('./actionExecutor');

class WorkflowEngine {
  async executeWorkflow(workflow, payload, executionLogId) {
    try {
      const startTime = Date.now();
      const executionLog = await ExecutionLog.findById(executionLogId);

      // Sort actions by order (spread to avoid mutating the original document array)
      const sortedActions = [...workflow.actions].sort((a, b) => a.order - b.order);

      const executionResults = [];
      let hasError = false;

      // Execute each action in sequence
      for (const action of sortedActions) {
        try {
          const result = await actionExecutor.executeAction(action, payload, workflow);

          executionResults.push({
            actionType: action.actionType,
            status: 'success',
            result: result,
            executedAt: new Date(),
          });
        } catch (error) {
          hasError = true;

          executionResults.push({
            actionType: action.actionType,
            status: 'failed',
            error: error.message,
            executedAt: new Date(),
          });

          // Continue to next action instead of breaking
          // This allows partial execution (optional - can be made configurable)
        }
      }

      // Update execution log
      executionLog.executionResults = executionResults;
      executionLog.status = hasError ? 'partial' : 'success';
      executionLog.completedAt = new Date();
      executionLog.duration = Date.now() - startTime;
      await executionLog.save();

      return executionLog;
    } catch (error) {
      console.error('Workflow execution failed:', error);

      // Update log with fatal error
      try {
        await ExecutionLog.findByIdAndUpdate(executionLogId, {
          status: 'failed',
          error: error.message,
          completedAt: new Date(),
        });
      } catch (logError) {
        console.error('Failed to update execution log:', logError.message);
      }

      throw error;
    }
  }
}

module.exports = new WorkflowEngine();
