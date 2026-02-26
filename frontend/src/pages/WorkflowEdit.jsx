import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  FileText,
  X,
  Send,
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
            {hasFormFields && (
              <FieldInsertButtons
                formFields={formFields}
                onInsert={(tag) => updateConfig('contentTemplate', (action.config?.contentTemplate || '') + tag)}
              />
            )}
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
            {hasFormFields && (
              <FieldInsertButtons
                formFields={formFields}
                onInsert={(tag) => updateConfig('contentTemplate', (action.config?.contentTemplate || '') + tag)}
              />
            )}
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
            {hasFormFields && (
              <FieldInsertButtons
                formFields={formFields}
                onInsert={(tag) => updateConfig('agenda', (action.config?.agenda || '') + tag)}
              />
            )}
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

export default function WorkflowEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    triggerType: '',
    triggerConfig: { formFields: [] },
    actions: [],
  });

  useEffect(() => {
    loadWorkflow();
  }, [id]);

  const loadWorkflow = async () => {
    try {
      const { data } = await workflowAPI.getById(id);
      const wf = data.workflow;
      setForm({
        name: wf.name || '',
        description: wf.description || '',
        triggerType: wf.triggerType || '',
        triggerConfig: wf.triggerConfig || { formFields: [] },
        actions: (wf.actions || []).map((a, i) => ({
          actionType: a.actionType,
          config: a.config || {},
          fieldMappings: a.fieldMappings || {},
          order: i,
        })),
      });
    } catch {
      toast.error('Failed to load workflow');
      navigate('/workflows');
    } finally {
      setLoading(false);
    }
  };

  // ── Form Field Management ────────────────────
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
      triggerConfig: (triggerType === 'GOOGLE_FORM' || triggerType === 'ECOMMERCE_ORDER') ? prev.triggerConfig : { formFields: [] },
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
    // Validate form fields if Google Form trigger
    if ((form.triggerType === 'GOOGLE_FORM' || form.triggerType === 'ECOMMERCE_ORDER') && form.triggerConfig.formFields.length > 0) {
      const invalidFields = form.triggerConfig.formFields.filter((f) => !f.fieldName.trim());
      if (invalidFields.length > 0) {
        toast.error('All form fields must have a field name');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        triggerType: form.triggerType,
        triggerConfig: (form.triggerType === 'GOOGLE_FORM' || form.triggerType === 'ECOMMERCE_ORDER') ? form.triggerConfig : undefined,
        actions: form.actions,
      };
      await workflowAPI.update(id, payload);
      toast.success('Workflow updated!');
      navigate(`/workflows/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update workflow');
    } finally {
      setSaving(false);
    }
  };

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
        <div className="page-header-back">
          <button className="btn btn-ghost" onClick={() => navigate(`/workflows/${id}`)}>
            <ArrowLeft size={18} /> Back
          </button>
          <div>
            <h1 className="page-title">Edit Workflow</h1>
            <p className="page-subtitle">Modify your automation pipeline</p>
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
                  onClick={() => handleTriggerChange(t.value)}
                >
                  <span className="trigger-option-label">{t.label}</span>
                  <span className="trigger-option-desc">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Google Form Fields Builder */}
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
          <button type="button" className="btn btn-ghost" onClick={() => navigate(`/workflows/${id}`)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner-sm" /> : <><Save size={18} /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}
