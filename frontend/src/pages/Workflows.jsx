import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { workflowAPI } from '../services/api';
import {
  Plus,
  Search,
  GitBranch,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ArrowRight,
  Filter,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';

const TRIGGER_LABELS = {
  GOOGLE_FORM: 'Google Form',
  PROJECT_ASSIGNMENT: 'Project Assignment',
  SOCIAL_EVENT: 'Social Event',
  ZOOM_EVENT: 'Zoom Event',
  ECOMMERCE_ORDER: 'E-commerce Order',
};

const TRIGGER_COLORS = {
  GOOGLE_FORM: '#4285f4',
  PROJECT_ASSIGNMENT: '#34a853',
  SOCIAL_EVENT: '#ea4335',
  ZOOM_EVENT: '#2d8cff',
  ECOMMERCE_ORDER: '#fbbc04',
};

export default function Workflows() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTrigger, setFilterTrigger] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const { data } = await workflowAPI.getAll();
      setWorkflows(data.workflows || []);
    } catch {
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (e, wf) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await workflowAPI.update(wf._id, { isActive: !wf.isActive });
      setWorkflows((prev) =>
        prev.map((w) => (w._id === wf._id ? { ...w, isActive: !w.isActive } : w))
      );
      toast.success(`Workflow ${wf.isActive ? 'paused' : 'activated'}`);
    } catch {
      toast.error('Failed to update workflow');
    }
  };

  const handleDelete = async (e, wf) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${wf.name}"? This cannot be undone.`)) return;
    try {
      await workflowAPI.delete(wf._id);
      setWorkflows((prev) => prev.filter((w) => w._id !== wf._id));
      toast.success('Workflow deleted');
    } catch {
      toast.error('Failed to delete workflow');
    }
  };

  const filtered = workflows.filter((wf) => {
    const matchSearch = wf.name.toLowerCase().includes(search.toLowerCase());
    const matchTrigger = filterTrigger ? wf.triggerType === filterTrigger : true;
    return matchSearch && matchTrigger;
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
          <h1 className="page-title">Workflows</h1>
          <p className="page-subtitle">{workflows.length} workflow{workflows.length !== 1 && 's'} configured</p>
        </div>
        <Link to="/workflows/create" className="btn btn-primary">
          <Plus size={18} />
          New Workflow
        </Link>
      </div>

      {/* Filters */}
      <div className="toolbar">
        <div className="input-with-icon search-bar">
          <Search size={18} className="input-icon" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="input-with-icon">
          <Filter size={18} className="input-icon" />
          <select value={filterTrigger} onChange={(e) => setFilterTrigger(e.target.value)}>
            <option value="">All Triggers</option>
            {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Workflow Cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title={search || filterTrigger ? 'No matching workflows' : 'No workflows yet'}
          description={
            search || filterTrigger
              ? 'Try adjusting your filters'
              : 'Create your first automated workflow to get started'
          }
          action={
            !search && !filterTrigger && (
              <Link to="/workflows/create" className="btn btn-primary">
                <Plus size={18} /> Create Workflow
              </Link>
            )
          }
        />
      ) : (
        <div className="workflow-grid">
          {filtered.map((wf) => (
            <div
              key={wf._id}
              className="workflow-card"
              onClick={() => navigate(`/workflows/${wf._id}`)}
            >
              <div className="workflow-card-header">
                <div
                  className="workflow-trigger-badge"
                  style={{ backgroundColor: TRIGGER_COLORS[wf.triggerType] + '18', color: TRIGGER_COLORS[wf.triggerType] }}
                >
                  {TRIGGER_LABELS[wf.triggerType] || wf.triggerType}
                </div>
                <div className="workflow-card-actions">
                  <button
                    className="btn-icon"
                    onClick={(e) => handleToggle(e, wf)}
                    title={wf.isActive ? 'Pause' : 'Activate'}
                  >
                    {wf.isActive ? (
                      <ToggleRight size={20} className="text-success" />
                    ) : (
                      <ToggleLeft size={20} className="text-muted" />
                    )}
                  </button>
                  <button
                    className="btn-icon btn-icon-danger"
                    onClick={(e) => handleDelete(e, wf)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="workflow-card-title">{wf.name}</h3>
              {wf.description && (
                <p className="workflow-card-desc">{wf.description}</p>
              )}
              <div className="workflow-card-footer">
                <span className="workflow-card-stat">
                  {wf.actions?.length || 0} action{(wf.actions?.length || 0) !== 1 && 's'}
                </span>
                <span className="workflow-card-stat">
                  {wf.executionCount || 0} run{(wf.executionCount || 0) !== 1 && 's'}
                </span>
                <ArrowRight size={16} className="workflow-card-arrow" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
