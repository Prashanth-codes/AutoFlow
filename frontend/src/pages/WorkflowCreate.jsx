import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { workflowAPI, linkedinAPI } from '../services/api';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Mail,
  Database,
  Linkedin,
  CalendarClock,
  Video,
  FileText,
  X,
  Send,
  CheckCircle2,
  LinkIcon,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TRIGGER_TYPES = [
  { value: 'GOOGLE_FORM', label: 'Google Form', desc: 'Triggered when a Google Form is submitted' },
  { value: 'ZOOM_EVENT', label: 'Zoom Event', desc: 'Triggered by Zoom meeting events' },
  { value: 'ECOMMERCE_ORDER', label: 'E-commerce Order', desc: 'Triggered when an order is placed' },
  { value: 'SCHEDULED_POST', label: 'Scheduled Post', desc: 'Schedule a post to social media at a specific time' },
];

const ACTION_TYPES = [
  { value: 'SEND_EMAIL', label: 'Send Email', icon: Mail, color: '#ea4335' },
  { value: 'STORE_DB', label: 'Store in Database', icon: Database, color: '#34a853' },
  { value: 'CREATE_ZOOM_MEETING', label: 'Create Zoom Meeting', icon: Video, color: '#2d8cff' },
  { value: 'API_REQUEST', label: 'API Request', icon: Send, color: '#8b5cf6' },
];

function FieldInsertButtons({ formFields, onInsert }) {
  if (!formFields || formFields.length === 0) return null;
  return (
    <div className="field-insert-bar">
      <span className="field-insert-label">Insert field:</span>
      <div className="field-insert-chips">
        {formFields.map((f) => (
          <button
            key={f.fieldName}
            type="button"
            className="chip chip-primary"
            onClick={() => onInsert(`{{${f.fieldName}}}`)}
            title={`Insert {{${f.fieldName}}}`}
          >
            {f.fieldLabel || f.fieldName}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActionConfigFields({ action, onChange, formFields }) {
  const updateConfig = (key, value) => {
    onChange({ ...action, config: { ...action.config, [key]: value } });
  };

  const updateFieldMapping = (key, value) => {
    onChange({ ...action, fieldMappings: { ...action.fieldMappings, [key]: value } });
  };

  const hasFormFields = formFields && formFields.length > 0;

  // Helper to get email-type fields
  const emailFields = hasFormFields
    ? formFields.filter((f) => f.fieldType === 'email' || f.fieldName.toLowerCase().includes('email'))
    : [];

  switch (action.actionType) {
    case 'SEND_EMAIL':
      return (
        <div className="action-config">
          {hasFormFields && (
            <div className="form-group">
              <label>Recipient Email Field</label>
              <select
                value={action.fieldMappings?.recipientField || ''}
                onChange={(e) => updateFieldMapping('recipientField', e.target.value)}
              >
                <option value="">— Auto-detect from payload —</option>
                {formFields.map((f) => (
                  <option key={f.fieldName} value={f.fieldName}>
                    {f.fieldLabel || f.fieldName} {f.fieldType === 'email' ? '(email)' : ''}
                  </option>
                ))}
              </select>
              <span className="form-hint">Which form field contains the recipient's email?</span>
            </div>
          )}
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
            <label>Email Subject</label>
            <input
              type="text"
              placeholder='e.g., New submission from {{name}}'
              value={action.config?.customSubject || ''}
              onChange={(e) => updateConfig('customSubject', e.target.value)}
            />
            {hasFormFields && (
              <FieldInsertButtons
                formFields={formFields}
                onInsert={(tag) => updateConfig('customSubject', (action.config?.customSubject || '') + tag)}
              />
            )}
          </div>
          <div className="form-group">
            <label>Email Body</label>
            <textarea
              placeholder={'e.g., Hello {{name}},\n\nThank you for submitting the form.\nYour email: {{email}}\n\nBest regards'}
              value={action.config?.customBody || ''}
              onChange={(e) => updateConfig('customBody', e.target.value)}
              rows={5}
            />
            {hasFormFields && (
              <FieldInsertButtons
                formFields={formFields}
                onInsert={(tag) => updateConfig('customBody', (action.config?.customBody || '') + tag)}
              />
            )}
            <span className="form-hint">Use {'{{fieldName}}'} to insert form field values dynamically.</span>
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
          {hasFormFields && (
            <div className="form-hint-box">
              <FileText size={14} />
              <span>All {formFields.length} form fields will be stored automatically in the database.</span>
            </div>
          )}
        </div>
      );
    case 'CREATE_ZOOM_MEETING': {
      const attendees = action.config?.attendees || [];
      const addAttendee = () => {
        onChange({
          ...action,
          config: {
            ...action.config,
            attendees: [...attendees, { name: '', email: '' }],
          },
        });
      };
      const updateAttendee = (idx, key, value) => {
        const updated = attendees.map((a, i) => (i === idx ? { ...a, [key]: value } : a));
        updateConfig('attendees', updated);
      };
      const removeAttendee = (idx) => {
        updateConfig('attendees', attendees.filter((_, i) => i !== idx));
      };
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
              {hasFormFields && (
                <FieldInsertButtons
                  formFields={formFields}
                  onInsert={(tag) => updateConfig('topic', (action.config?.topic || '') + tag)}
                />
              )}
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
            {hasFormFields && (
              <FieldInsertButtons
                formFields={formFields}
                onInsert={(tag) => updateConfig('agenda', (action.config?.agenda || '') + tag)}
              />
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Timezone</label>
              <select
                value={action.config?.timezone || 'UTC'}
                onChange={(e) => updateConfig('timezone', e.target.value)}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Berlin">Berlin</option>
                <option value="Asia/Kolkata">India (IST)</option>
                <option value="Asia/Tokyo">Tokyo</option>
                <option value="Australia/Sydney">Sydney</option>
              </select>
            </div>
            <div className="form-group">
              <label>Auto Recording</label>
              <select
                value={action.config?.autoRecording || 'cloud'}
                onChange={(e) => updateConfig('autoRecording', e.target.value)}
              >
                <option value="cloud">Cloud Recording</option>
                <option value="local">Local Recording</option>
                <option value="none">No Recording</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Meeting Password</label>
            <input
              type="text"
              placeholder="Optional meeting password"
              value={action.config?.password || ''}
              onChange={(e) => updateConfig('password', e.target.value)}
            />
          </div>

          {/* Attendees */}
          <div className="form-group">
            <label>Attendees (will receive email invite with meeting URL)</label>
            {attendees.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                {attendees.map((att, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Name"
                      value={att.name || ''}
                      onChange={(e) => updateAttendee(idx, 'name', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={att.email || ''}
                      onChange={(e) => updateAttendee(idx, 'email', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn-icon btn-icon-danger"
                      onClick={() => removeAttendee(idx)}
                      title="Remove attendee"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="btn btn-outline" onClick={addAttendee} style={{ marginTop: 4 }}>
              <Plus size={14} /> Add Attendee
            </button>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={action.config?.sendEmailInvite ?? true}
                  onChange={(e) => updateConfig('sendEmailInvite', e.target.checked)}
                />
                <span>Send Email Invite</span>
              </label>
              <span className="form-hint">Email meeting URL to all attendees</span>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={action.config?.storeInDatabase ?? true}
                  onChange={(e) => updateConfig('storeInDatabase', e.target.checked)}
                />
                <span>Store Meeting in DB</span>
              </label>
              <span className="form-hint">Save meeting metadata & transcript</span>
            </div>
          </div>
        </div>
      );
    }
    case 'API_REQUEST':
      return (
        <div className="action-config">
          <div className="form-row">
            <div className="form-group" style={{ flex: '0 0 140px' }}>
              <label>Method</label>
              <select
                value={action.config?.method || 'GET'}
                onChange={(e) => updateConfig('method', e.target.value)}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>URL *</label>
              <input
                type="text"
                placeholder="https://api.example.com/endpoint"
                value={action.config?.url || ''}
                onChange={(e) => updateConfig('url', e.target.value)}
              />
              {hasFormFields && (
                <FieldInsertButtons
                  formFields={formFields}
                  onInsert={(tag) => updateConfig('url', (action.config?.url || '') + tag)}
                />
              )}
            </div>
          </div>
          <div className="form-group">
            <label>Headers <span className="form-hint">(JSON format)</span></label>
            <textarea
              placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
              value={action.config?.headers || ''}
              onChange={(e) => updateConfig('headers', e.target.value)}
              rows={3}
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
          </div>
          <div className="form-group">
            <label>Query Parameters <span className="form-hint">(JSON format)</span></label>
            <textarea
              placeholder='{"page": "1", "search": "{{name}}"}'
              value={action.config?.queryParams || ''}
              onChange={(e) => updateConfig('queryParams', e.target.value)}
              rows={2}
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
            {hasFormFields && (
              <FieldInsertButtons
                formFields={formFields}
                onInsert={(tag) => updateConfig('queryParams', (action.config?.queryParams || '') + tag)}
              />
            )}
          </div>
          {['POST', 'PUT', 'PATCH'].includes(action.config?.method) && (
            <div className="form-group">
              <label>Request Body <span className="form-hint">(JSON format)</span></label>
              <textarea
                placeholder='{"name": "{{name}}", "email": "{{email}}"}'
                value={action.config?.body || ''}
                onChange={(e) => updateConfig('body', e.target.value)}
                rows={5}
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
              {hasFormFields && (
                <FieldInsertButtons
                  formFields={formFields}
                  onInsert={(tag) => updateConfig('body', (action.config?.body || '') + tag)}
                />
              )}
              <span className="form-hint">Use {'{{fieldName}}'} placeholders for dynamic values from the trigger payload.</span>
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
}

export default function WorkflowCreate() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState(null); 
  const [checkingLinkedin, setCheckingLinkedin] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    triggerType: '',
    triggerConfig: { formFields: [] },
    actions: [],
  });

  useEffect(() => {
    checkLinkedInStatus();

    const linkedinParam = searchParams.get('linkedin');
    if (linkedinParam === 'connected') {
      toast.success('LinkedIn connected successfully!');
      setLinkedinConnected(true);
      searchParams.delete('linkedin');
      setSearchParams(searchParams, { replace: true });
    } else if (linkedinParam === 'error') {
      const reason = searchParams.get('reason');
      toast.error(reason ? `LinkedIn error: ${reason}` : 'LinkedIn connection failed. Please try again.');
      searchParams.delete('linkedin');
      searchParams.delete('reason');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  const checkLinkedInStatus = async () => {
    setCheckingLinkedin(true);
    try {
      const { data } = await linkedinAPI.getStatus();
      setLinkedinConnected(data.connected || false);
    } catch {
      setLinkedinConnected(false);
    } finally {
      setCheckingLinkedin(false);
    }
  };

  const handleConnectLinkedIn = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const token = localStorage.getItem('token');
    window.location.href = `${backendUrl}/api/auth/linkedin?token=${token}&returnTo=${encodeURIComponent('/workflows/create')}`;
  };

  const handleDisconnectLinkedIn = async () => {
    try {
      await linkedinAPI.disconnect();
      setLinkedinConnected(false);
      toast.success('LinkedIn disconnected');
    } catch {
      toast.error('Failed to disconnect LinkedIn');
    }
  };

  const addFormField = () => {
    setForm((prev) => ({
      ...prev,
      triggerConfig: {
        ...prev.triggerConfig,
        formFields: [
          ...prev.triggerConfig.formFields,
          { fieldName: '', fieldLabel: '', fieldType: 'text', required: false, options: [] },
        ],
      },
    }));
  };

  const updateFormField = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      triggerConfig: {
        ...prev.triggerConfig,
        formFields: prev.triggerConfig.formFields.map((f, i) =>
          i === index ? { ...f, [key]: value } : f
        ),
      },
    }));
  };

  const removeFormField = (index) => {
    setForm((prev) => ({
      ...prev,
      triggerConfig: {
        ...prev.triggerConfig,
        formFields: prev.triggerConfig.formFields.filter((_, i) => i !== index),
      },
    }));
  };

  const handleTriggerChange = (triggerType) => {
    setForm((prev) => ({
      ...prev,
      triggerType,
      triggerConfig: {
        ...prev.triggerConfig,
        formFields: (triggerType === 'GOOGLE_FORM' || triggerType === 'ECOMMERCE_ORDER') ? prev.triggerConfig.formFields : [],
        zoomConfig: prev.triggerConfig.zoomConfig,
        scheduledPostConfig: triggerType === 'SCHEDULED_POST' ? (prev.triggerConfig.scheduledPostConfig || {
          platform: 'linkedin',
          content: '',
          scheduledFor: '',
          notifyEmail: '',
        }) : prev.triggerConfig.scheduledPostConfig,
      },
    }));
  };

  const addAction = (actionType) => {
    setForm((prev) => ({
      ...prev,
      actions: [
        ...prev.actions,
        { actionType, config: {}, fieldMappings: {}, order: prev.actions.length },
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
    if ((form.triggerType === 'GOOGLE_FORM' || form.triggerType === 'ECOMMERCE_ORDER') && form.triggerConfig.formFields.length > 0) {
      const invalidFields = form.triggerConfig.formFields.filter((f) => !f.fieldName.trim());
      if (invalidFields.length > 0) {
        toast.error('All form fields must have a field name');
        return;
      }
    }
    if (form.triggerType === 'SCHEDULED_POST') {
      const platform = form.triggerConfig.scheduledPostConfig?.platform || 'linkedin';
      if (platform === 'linkedin' && !linkedinConnected) {
        toast.error('Please connect your LinkedIn account first');
        return;
      }
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        triggerConfig: (form.triggerType === 'GOOGLE_FORM' || form.triggerType === 'ECOMMERCE_ORDER' || form.triggerType === 'SCHEDULED_POST') ? form.triggerConfig : undefined,
      };
      const { data } = await workflowAPI.create(payload);

      if (form.triggerType === 'SCHEDULED_POST' && data.workflow?._id) {
        try {
          await workflowAPI.schedulePost(data.workflow._id);
          toast.success('Workflow created & post scheduled!');
        } catch (schedErr) {
          toast.success('Workflow created!');
          toast.error(schedErr.response?.data?.message || 'Failed to schedule post');
        }
      } else {
        toast.success('Workflow created!');
      }

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
                  onClick={() => handleTriggerChange(t.value)}
                >
                  <span className="trigger-option-label">{t.label}</span>
                  <span className="trigger-option-desc">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {(form.triggerType === 'GOOGLE_FORM' || form.triggerType === 'ECOMMERCE_ORDER') && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <FileText size={18} style={{ marginRight: 6 }} />
                Form Fields
              </h3>
              <span className="card-header-hint">
                Define the fields your Google Form will send
              </span>
            </div>
            <div className="card-body">
              {form.triggerConfig.formFields.length === 0 ? (
                <div className="empty-inline">
                  <FileText size={20} className="text-muted" />
                  <span>No fields defined yet. Add fields to customize your workflow actions.</span>
                </div>
              ) : (
                <div className="form-fields-list">
                  {form.triggerConfig.formFields.map((field, idx) => (
                    <div key={idx} className="form-field-row">
                      <div className="form-field-number">{idx + 1}</div>
                      <div className="form-field-inputs">
                        <div className="form-group">
                          <label>Field Name (key)</label>
                          <input
                            type="text"
                            placeholder="e.g., name, email, phone"
                            value={field.fieldName}
                            onChange={(e) =>
                              updateFormField(idx, 'fieldName', e.target.value.replace(/\s+/g, '_').toLowerCase())
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label>Label</label>
                          <input
                            type="text"
                            placeholder="e.g., Full Name"
                            value={field.fieldLabel}
                            onChange={(e) => updateFormField(idx, 'fieldLabel', e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>Type</label>
                          <select
                            value={field.fieldType}
                            onChange={(e) => updateFormField(idx, 'fieldType', e.target.value)}
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="textarea">Long Text</option>
                            <option value="select">Dropdown</option>
                            <option value="checkbox">Checkbox</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="checkbox-label" style={{ marginTop: 22 }}>
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateFormField(idx, 'required', e.target.checked)}
                            />
                            <span>Required</span>
                          </label>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-icon btn-icon-danger"
                        onClick={() => removeFormField(idx)}
                        title="Remove field"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" className="btn btn-outline" onClick={addFormField} style={{ marginTop: 12 }}>
                <Plus size={16} /> Add Field
              </button>
              {form.triggerConfig.formFields.length > 0 && (
                <div className="form-fields-preview">
                  <h4>Available placeholders for actions:</h4>
                  <div className="field-insert-chips">
                    {form.triggerConfig.formFields
                      .filter((f) => f.fieldName)
                      .map((f) => (
                        <span key={f.fieldName} className="chip chip-muted">
                          {`{{${f.fieldName}}}`}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {form.triggerType === 'ZOOM_EVENT' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Video size={18} style={{ marginRight: 6 }} />
                Zoom Event Trigger
              </h3>
            </div>
            <div className="card-body">
              <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>
                This workflow will be triggered via its webhook URL. Add a <strong>Create Zoom Meeting</strong> action below to configure meeting details, attendees, and email invites.
              </p>
            </div>
          </div>
        )}

        {form.triggerType === 'SCHEDULED_POST' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <CalendarClock size={18} style={{ marginRight: 6 }} />
                Scheduled Post Configuration
              </h3>
              <span className="card-header-hint">
                Configure your social media post and when it should be published
              </span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label>Platform</label>
                <select
                  value={form.triggerConfig.scheduledPostConfig?.platform || 'linkedin'}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      triggerConfig: {
                        ...prev.triggerConfig,
                        scheduledPostConfig: { ...prev.triggerConfig.scheduledPostConfig, platform: e.target.value },
                      },
                    }))
                  }
                >
                  <option value="linkedin">🔗 LinkedIn</option>
                  <option value="twitter" disabled>🐦 Twitter (coming soon)</option>
                  <option value="facebook" disabled>📘 Facebook (coming soon)</option>
                  <option value="instagram" disabled>📷 Instagram (coming soon)</option>
                </select>
              </div>

              {(form.triggerConfig.scheduledPostConfig?.platform || 'linkedin') === 'linkedin' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 8,
                    marginBottom: 16,
                    border: linkedinConnected
                      ? '1px solid #34a85333'
                      : '1px solid #ea433533',
                    background: linkedinConnected
                      ? '#34a85310'
                      : '#ea433510',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Linkedin size={20} style={{ color: '#0077b5' }} />
                    {checkingLinkedin ? (
                      <span style={{ color: '#888', fontSize: '0.9rem' }}>
                        <Loader2 size={14} style={{ display: 'inline', marginRight: 4, animation: 'spin 1s linear infinite' }} />
                        Checking connection…
                      </span>
                    ) : linkedinConnected ? (
                      <span style={{ color: '#34a853', fontWeight: 500, fontSize: '0.9rem' }}>
                        <CheckCircle2 size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
                        LinkedIn account connected
                      </span>
                    ) : (
                      <span style={{ color: '#ea4335', fontWeight: 500, fontSize: '0.9rem' }}>
                        LinkedIn not connected — connect to schedule posts
                      </span>
                    )}
                  </div>
                  {linkedinConnected ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                      onClick={handleDisconnectLinkedIn}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: '0.85rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                      onClick={handleConnectLinkedIn}
                      disabled={checkingLinkedin}
                    >
                      <LinkIcon size={14} /> Connect LinkedIn
                    </button>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Post Content *</label>
                <textarea
                  placeholder="Write your LinkedIn post here..."
                  value={form.triggerConfig.scheduledPostConfig?.content || ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      triggerConfig: {
                        ...prev.triggerConfig,
                        scheduledPostConfig: { ...prev.triggerConfig.scheduledPostConfig, content: e.target.value },
                      },
                    }))
                  }
                  rows={5}
                  style={{ resize: 'vertical' }}
                />
                <span className="form-hint">
                  {(form.triggerConfig.scheduledPostConfig?.content || '').length} characters
                </span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Schedule Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={form.triggerConfig.scheduledPostConfig?.scheduledFor || ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        triggerConfig: {
                          ...prev.triggerConfig,
                          scheduledPostConfig: { ...prev.triggerConfig.scheduledPostConfig, scheduledFor: e.target.value },
                        },
                      }))
                    }
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <span className="form-hint">The post will be published at this time</span>
                </div>
                <div className="form-group">
                  <label>Notification Email</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={form.triggerConfig.scheduledPostConfig?.notifyEmail || ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        triggerConfig: {
                          ...prev.triggerConfig,
                          scheduledPostConfig: { ...prev.triggerConfig.scheduledPostConfig, notifyEmail: e.target.value },
                        },
                      }))
                    }
                  />
                  <span className="form-hint">Get notified when the post is published (add Send Email action below)</span>
                </div>
              </div>

              {form.triggerConfig.scheduledPostConfig?.content && form.triggerConfig.scheduledPostConfig?.scheduledFor && (
                <div className="form-hint-box" style={{ marginTop: 12, background: '#0077b515', borderColor: '#0077b533' }}>
                  <Linkedin size={16} style={{ color: '#0077b5' }} />
                  <span>
                    Your post will be published to <strong>LinkedIn</strong> on{' '}
                    <strong>{new Date(form.triggerConfig.scheduledPostConfig.scheduledFor).toLocaleString()}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

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
                      <ActionConfigFields
                        action={action}
                        onChange={(a) => updateAction(idx, a)}
                        formFields={(form.triggerType === 'GOOGLE_FORM' || form.triggerType === 'ECOMMERCE_ORDER') ? form.triggerConfig.formFields : []}
                      />
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
