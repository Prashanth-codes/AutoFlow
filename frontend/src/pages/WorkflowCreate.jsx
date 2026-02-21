import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { workflowAPI } from '../services/api';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Mail,
  Database,
  UserCheck,
  Linkedin,
  CalendarClock,
  Video,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TRIGGER_TYPES = [
  { value: 'GOOGLE_FORM', label: 'Google Form', desc: 'Triggered when a Google Form is submitted' },
  { value: 'PROJECT_ASSIGNMENT', label: 'Project Assignment', desc: 'Triggered when a project is assigned' },
  { value: 'SOCIAL_EVENT', label: 'Social Event', desc: 'Triggered by social media events' },
  { value: 'ZOOM_EVENT', label: 'Zoom Event', desc: 'Triggered by Zoom meeting events' },
  { value: 'ECOMMERCE_ORDER', label: 'E-commerce Order', desc: 'Triggered when an order is placed' },
];

const ACTION_TYPES = [
  { value: 'SEND_EMAIL', label: 'Send Email', icon: Mail, color: '#ea4335' },
  { value: 'STORE_DB', label: 'Store in Database', icon: Database, color: '#34a853' },
  { value: 'ASSIGN_EMPLOYEE', label: 'Assign Employee', icon: UserCheck, color: '#4285f4' },
  { value: 'POST_LINKEDIN', label: 'Post to LinkedIn', icon: Linkedin, color: '#0077b5' },
  { value: 'SCHEDULE_POST', label: 'Schedule Post', icon: CalendarClock, color: '#fbbc04' },
  { value: 'CREATE_ZOOM_MEETING', label: 'Create Zoom Meeting', icon: Video, color: '#2d8cff' },
];

function ActionConfigFields({ action, onChange }) {
  const updateConfig = (key, value) => {
    onChange({ ...action, config: { ...action.config, [key]: value } });
  };

  switch (action.actionType) {
    case 'SEND_EMAIL':
      return (
        <div className="action-config">
          <div className="form-row">
            <div className="form-group">
              <label>Admin Email</label>
              <input
                type="email"
                placeholder="admin@company.com"
                value={action.config?.adminEmail || ''}
                onChange={(e) => updateConfig('adminEmail', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Email Template</label>
              <select
                value={action.config?.template || 'default'}
                onChange={(e) => updateConfig('template', e.target.value)}
              >
                <option value="default">Default</option>
                <option value="form_confirmation">Form Confirmation</option>
                <option value="form_submission">Form Submission</option>
                <option value="order_confirmation">Order Confirmation</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={action.config?.sendToUser ?? true}
                  onChange={(e) => updateConfig('sendToUser', e.target.checked)}
                />
                <span>Notify User</span>
              </label>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={action.config?.sendToAdmin ?? false}
                  onChange={(e) => updateConfig('sendToAdmin', e.target.checked)}
                />
                <span>Notify Admin</span>
              </label>
            </div>
          </div>
        </div>
      );
    case 'STORE_DB':
      return (
        <div className="action-config">
          <div className="form-group">
            <label>Collection / Form Type</label>
            <select
              value={action.config?.formType || 'google_form'}
              onChange={(e) => updateConfig('formType', e.target.value)}
            >
              <option value="google_form">Google Form</option>
              <option value="custom_form">Custom Form</option>
              <option value="contact_form">Contact Form</option>
            </select>
          </div>
        </div>
      );
    case 'POST_LINKEDIN':
      return (
        <div className="action-config">
          <div className="form-group">
            <label>Post Content Template</label>
            <textarea
              placeholder="Use {{name}}, {{email}}, etc. for dynamic values"
              value={action.config?.contentTemplate || ''}
              onChange={(e) => updateConfig('contentTemplate', e.target.value)}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Visibility</label>
            <select
              value={action.config?.visibility || 'PUBLIC'}
              onChange={(e) => updateConfig('visibility', e.target.value)}
            >
              <option value="PUBLIC">Public</option>
              <option value="CONNECTIONS">Connections Only</option>
            </select>
          </div>
        </div>
      );
    case 'SCHEDULE_POST':
      return (
        <div className="action-config">
          <div className="form-row">
            <div className="form-group">
              <label>Platform</label>
              <select
                value={action.config?.platform || 'linkedin'}
                onChange={(e) => updateConfig('platform', e.target.value)}
              >
                <option value="linkedin">LinkedIn</option>
                <option value="twitter">Twitter</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>
            <div className="form-group">
              <label>Delay (minutes)</label>
              <input
                type="number"
                min={1}
                placeholder="30"
                value={action.config?.delayMinutes || ''}
                onChange={(e) => updateConfig('delayMinutes', parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Content Template</label>
            <textarea
              placeholder="Post content..."
              value={action.config?.contentTemplate || ''}
              onChange={(e) => updateConfig('contentTemplate', e.target.value)}
              rows={3}
            />
          </div>
        </div>
      );
    case 'CREATE_ZOOM_MEETING':
      return (
        <div className="action-config">
          <div className="form-row">
            <div className="form-group">
              <label>Meeting Topic</label>
              <input
                type="text"
                placeholder="Team Standup"
                value={action.config?.topic || ''}
                onChange={(e) => updateConfig('topic', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input
                type="number"
                min={15}
                placeholder="60"
                value={action.config?.duration || ''}
                onChange={(e) => updateConfig('duration', parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Agenda</label>
            <textarea
              placeholder="Meeting agenda..."
              value={action.config?.agenda || ''}
              onChange={(e) => updateConfig('agenda', e.target.value)}
              rows={2}
            />
          </div>
        </div>
      );
    case 'ASSIGN_EMPLOYEE':
      return (
        <div className="action-config">
          <p className="action-config-hint">
            Employee assignment will use the <code>employees</code> and <code>assignedTo</code> fields
            from the incoming webhook payload.
          </p>
        </div>
      );
    default:
      return null;
  }
}

export default function WorkflowCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    triggerType: '',
    actions: [],
  });

  const addAction = (actionType) => {
    setForm((prev) => ({
      ...prev,
      actions: [
        ...prev.actions,
        { actionType, config: {}, order: prev.actions.length },
      ],
    }));
  };

  const removeAction = (index) => {
    setForm((prev) => ({
      ...prev,
      actions: prev.actions
        .filter((_, i) => i !== index)
        .map((a, i) => ({ ...a, order: i })),
    }));
  };

  const updateAction = (index, updated) => {
    setForm((prev) => ({
      ...prev,
      actions: prev.actions.map((a, i) => (i === index ? { ...updated, order: i } : a)),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }
    if (!form.triggerType) {
      toast.error('Please select a trigger type');
      return;
    }
    if (form.actions.length === 0) {
      toast.error('Please add at least one action');
      return;
    }
    setLoading(true);
    try {
      const { data } = await workflowAPI.create(form);
      toast.success('Workflow created!');
      navigate(`/workflows/${data.workflow._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create workflow');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-back">
          <button className="btn btn-ghost" onClick={() => navigate('/workflows')}>
            <ArrowLeft size={18} /> Back
          </button>
          <div>
            <h1 className="page-title">Create Workflow</h1>
            <p className="page-subtitle">Configure your automation pipeline</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="workflow-form">
        {/* Basic Info */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Basic Information</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label htmlFor="wf-name">Workflow Name *</label>
              <input
                id="wf-name"
                type="text"
                placeholder="e.g., New Order Processing"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="wf-desc">Description</label>
              <textarea
                id="wf-desc"
                placeholder="What does this workflow do?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Trigger */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Trigger</h3>
            <span className="card-header-hint">What starts this workflow?</span>
          </div>
          <div className="card-body">
            <div className="trigger-grid">
              {TRIGGER_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`trigger-option ${form.triggerType === t.value ? 'selected' : ''}`}
                  onClick={() => setForm({ ...form, triggerType: t.value })}
                >
                  <span className="trigger-option-label">{t.label}</span>
                  <span className="trigger-option-desc">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Actions ({form.actions.length})</h3>
            <span className="card-header-hint">Steps to execute in order</span>
          </div>
          <div className="card-body">
            {form.actions.length > 0 && (
              <div className="actions-list">
                {form.actions.map((action, idx) => {
                  const actionMeta = ACTION_TYPES.find((a) => a.value === action.actionType);
                  const Icon = actionMeta?.icon || Mail;
                  return (
                    <div key={idx} className="action-item">
                      <div className="action-item-header">
                        <div className="action-item-left">
                          <GripVertical size={16} className="text-muted" />
                          <div
                            className="action-item-icon"
                            style={{ backgroundColor: (actionMeta?.color || '#666') + '18', color: actionMeta?.color }}
                          >
                            <Icon size={18} />
                          </div>
                          <div>
                            <span className="action-item-order">Step {idx + 1}</span>
                            <span className="action-item-label">{actionMeta?.label || action.actionType}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          onClick={() => removeAction(idx)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <ActionConfigFields action={action} onChange={(a) => updateAction(idx, a)} />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="add-action-section">
              <p className="add-action-label">Add an action:</p>
              <div className="add-action-grid">
                {ACTION_TYPES.map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    className="add-action-btn"
                    onClick={() => addAction(value)}
                  >
                    <Icon size={18} style={{ color }} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/workflows')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner-sm" /> : <><Save size={18} /> Create Workflow</>}
          </button>
        </div>
      </form>
    </div>
  );
}
