import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { workflowAPI, logsAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { ScrollText, ExternalLink, Filter, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExecutionLogs() {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWf, setSelectedWf] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadWorkflows();
  }, []);

  useEffect(() => {
    if (selectedWf) {
      loadLogs(selectedWf);
    }
  }, [selectedWf]);

  const loadWorkflows = async () => {
    try {
      const { data } = await workflowAPI.getAll();
      const wfs = data.workflows || [];
      setWorkflows(wfs);

      // Load all logs from all workflows
      const allLogs = [];
      for (const wf of wfs) {
        try {
          const logRes = await logsAPI.getByWorkflow(wf._id);
          if (logRes.data.logs) {
            allLogs.push(
              ...logRes.data.logs.map((l) => ({ ...l, workflowName: wf.name }))
            );
          }
        } catch {
          // skip
        }
      }
      allLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setLogs(allLogs);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (wfId) => {
    setLogsLoading(true);
    try {
      const wf = workflows.find((w) => w._id === wfId);
      const { data } = await logsAPI.getByWorkflow(wfId);
      setLogs(
        (data.logs || []).map((l) => ({ ...l, workflowName: wf?.name || 'Workflow' }))
      );
    } catch {
      toast.error('Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filtered = logs.filter((log) => {
    if (statusFilter && log.status !== statusFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Execution Logs</h1>
          <p className="page-subtitle">Monitor your workflow executions in real-time</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="input-with-icon">
          <Filter size={18} className="input-icon" />
          <select
            value={selectedWf}
            onChange={(e) => {
              setSelectedWf(e.target.value);
              if (!e.target.value) loadWorkflows();
            }}
          >
            <option value="">All Workflows</option>
            {workflows.map((wf) => (
              <option key={wf._id} value={wf._id}>{wf.name}</option>
            ))}
          </select>
        </div>
        <div className="input-with-icon">
          <Search size={18} className="input-icon" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {logsLoading ? (
        <div className="page-loader">
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No execution logs"
          description="Trigger a workflow webhook to see execution results here"
        />
      ) : (
        <div className="card">
          <div className="card-body no-pad">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Workflow</th>
                    <th>Started</th>
                    <th>Completed</th>
                    <th>Duration</th>
                    <th>Actions</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr key={log._id}>
                      <td><StatusBadge status={log.status} /></td>
                      <td className="td-bold">{log.workflowName}</td>
                      <td>{formatDate(log.createdAt)}</td>
                      <td>{formatDate(log.completedAt)}</td>
                      <td>{log.duration ? `${log.duration}ms` : '—'}</td>
                      <td>{log.executionResults?.length || 0}</td>
                      <td>
                        <Link to={`/logs/${log._id}`} className="btn btn-ghost btn-sm">
                          <ExternalLink size={14} /> Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
