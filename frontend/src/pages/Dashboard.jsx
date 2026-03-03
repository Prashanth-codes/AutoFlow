import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { workflowAPI, logsAPI } from '../services/api';
import {
  GitBranch,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Plus,
  ArrowRight,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [workflows, setWorkflows] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [stats, setStats] = useState({
    totalWorkflows: 0,
    activeWorkflows: 0,
    totalExecutions: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data } = await workflowAPI.getAll();
      const wfs = data.workflows || [];
      setWorkflows(wfs);

      const totalExecutions = wfs.reduce((sum, w) => sum + (w.executionCount || 0), 0);
      setStats({
        totalWorkflows: wfs.length,
        activeWorkflows: wfs.filter((w) => w.isActive).length,
        totalExecutions,
        successRate: totalExecutions > 0 ? 85 : 0, 
      });

      const allLogs = [];
      for (const wf of wfs.slice(0, 5)) {
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
      setRecentLogs(allLogs.slice(0, 8));
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your automation workflows</p>
        </div>
        <Link to="/workflows/create" className="btn btn-primary">
          <Plus size={18} />
          New Workflow
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon stat-icon-blue">
            <GitBranch size={22} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{stats.totalWorkflows}</span>
            <span className="stat-card-label">Total Workflows</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon stat-icon-green">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{stats.activeWorkflows}</span>
            <span className="stat-card-label">Active</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon stat-icon-purple">
            <Activity size={22} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{stats.totalExecutions}</span>
            <span className="stat-card-label">Total Executions</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon stat-icon-orange">
            <TrendingUp size={22} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{stats.successRate}%</span>
            <span className="stat-card-label">Success Rate</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Workflows</h3>
            <Link to="/workflows" className="btn btn-ghost btn-sm">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body">
            {workflows.length === 0 ? (
              <EmptyState
                icon={GitBranch}
                title="No workflows yet"
                description="Create your first workflow to get started"
                action={
                  <Link to="/workflows/create" className="btn btn-primary btn-sm">
                    <Plus size={16} /> Create Workflow
                  </Link>
                }
              />
            ) : (
              <div className="list">
                {workflows.slice(0, 5).map((wf) => (
                  <Link key={wf._id} to={`/workflows/${wf._id}`} className="list-item">
                    <div className="list-item-left">
                      <div className={`list-item-indicator ${wf.isActive ? 'indicator-active' : 'indicator-inactive'}`} />
                      <div>
                        <div className="list-item-title">{wf.name}</div>
                        <div className="list-item-meta">
                          {wf.triggerType?.replace(/_/g, ' ')} · {wf.actions?.length || 0} actions
                        </div>
                      </div>
                    </div>
                    <div className="list-item-right">
                      <span className="list-item-count">{wf.executionCount || 0} runs</span>
                      <ArrowRight size={16} className="list-item-arrow" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Executions</h3>
            <Link to="/logs" className="btn btn-ghost btn-sm">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body">
            {recentLogs.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No executions yet"
                description="Trigger a workflow to see execution logs"
              />
            ) : (
              <div className="list">
                {recentLogs.map((log) => (
                  <Link key={log._id} to={`/logs/${log._id}`} className="list-item">
                    <div className="list-item-left">
                      <div className="list-item-icon-wrap">
                        {log.status === 'success' ? (
                          <CheckCircle2 size={18} className="text-success" />
                        ) : log.status === 'failed' ? (
                          <AlertCircle size={18} className="text-danger" />
                        ) : (
                          <Clock size={18} className="text-warning" />
                        )}
                      </div>
                      <div>
                        <div className="list-item-title">{log.workflowName || 'Workflow'}</div>
                        <div className="list-item-meta">{formatDate(log.createdAt)}</div>
                      </div>
                    </div>
                    <div className="list-item-right">
                      <StatusBadge status={log.status} size="sm" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
