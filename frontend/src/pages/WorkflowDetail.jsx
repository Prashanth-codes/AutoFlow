import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { workflowAPI, logsAPI, zoomAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  Mail,
  Database,
  UserCheck,
  Linkedin,
  CalendarClock,
  Video,
  Webhook,
  FileText,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ACTION_META = {
  SEND_EMAIL: { label: 'Send Email', icon: Mail, color: '#ea4335' },
  STORE_DB: { label: 'Store in DB', icon: Database, color: '#34a853' },
  ASSIGN_EMPLOYEE: { label: 'Assign Employee', icon: UserCheck, color: '#4285f4' },
  POST_LINKEDIN: { label: 'Post to LinkedIn', icon: Linkedin, color: '#0077b5' },
  SCHEDULE_POST: { label: 'Schedule Post', icon: CalendarClock, color: '#fbbc04' },
  CREATE_ZOOM_MEETING: { label: 'Create Zoom Meeting', icon: Video, color: '#2d8cff' },
  API_REQUEST: { label: 'API Request', icon: Send, color: '#8b5cf6' },
};

export default function WorkflowDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [logs, setLogs] = useState([]);
  const [zoomMeetings, setZoomMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWebhook, setShowWebhook] = useState(false);
  const [showTranscript, setShowTranscript] = useState(null);

  useEffect(() => {
    loadWorkflow();
  }, [id]);

  const loadWorkflow = async () => {
    try {
      const wfRes = await workflowAPI.getById(id);
      setWorkflow(wfRes.data.workflow);

      // Load webhook URL and logs independently — don't fail the page if these error
      try {
        const whRes = await workflowAPI.getWebhookUrl(id);
        setWebhookUrl(whRes.data.webhookUrl || '');
      } catch {
        // webhook URL not critical
      }

      try {
        const logRes = await logsAPI.getByWorkflow(id);
        setLogs(logRes.data.logs || []);
      } catch {
        // logs may be empty
      }

      // Load zoom meetings if ZOOM_EVENT trigger
      try {
        const zmRes = await zoomAPI.getMeetings(id);
        setZoomMeetings(zmRes.data.meetings || []);
      } catch {
        // zoom meetings may be empty
      }
    } catch {
      toast.error('Failed to load workflow');
      navigate('/workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      const { data } = await workflowAPI.update(id, { isActive: !workflow.isActive });
      setWorkflow(data.workflow);
      toast.success(`Workflow ${workflow.isActive ? 'paused' : 'activated'}`);
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this workflow? This cannot be undone.')) return;
    try {
      await workflowAPI.delete(id);
      toast.success('Workflow deleted');
      navigate('/workflows');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied!');
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

  if (!workflow) return null;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-back">
          <button className="btn btn-ghost" onClick={() => navigate('/workflows')}>
            <ArrowLeft size={18} /> Back
          </button>
          <div>
            <div className="page-title-row">
              <h1 className="page-title">{workflow.name}</h1>
              <div className={`status-dot ${workflow.isActive ? 'dot-active' : 'dot-inactive'}`} />
            </div>
            <p className="page-subtitle">{workflow.description || 'No description'}</p>
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => navigate(`/workflows/${id}/edit`)}>
            <Pencil size={16} /> Edit
          </button>
          <button className="btn btn-outline" onClick={() => setShowWebhook(true)}>
            <Webhook size={16} /> Webhook
          </button>
          <button className="btn btn-outline" onClick={handleToggle}>
            {workflow.isActive ? <ToggleRight size={18} className="text-success" /> : <ToggleLeft size={18} />}
            {workflow.isActive ? 'Active' : 'Paused'}
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Workflow Info */}
      <div className="detail-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Configuration</h3>
          </div>
          <div className="card-body">
            <div className="info-list">
              <div className="info-row">
                <span className="info-label">Trigger Type</span>
                <span className="info-value">{workflow.triggerType?.replace(/_/g, ' ')}</span>
              </div>
              {(workflow.triggerType === 'GOOGLE_FORM' || workflow.triggerType === 'ECOMMERCE_ORDER') &&
                workflow.triggerConfig?.formFields?.length > 0 && (
                  <div className="info-row">
                    <span className="info-label">Form Fields</span>
                    <span className="info-value">{workflow.triggerConfig.formFields.length} fields defined</span>
                  </div>
                )}

              <div className="info-row">
                <span className="info-label">Actions</span>
                <span className="info-value">{workflow.actions?.length || 0} step{(workflow.actions?.length || 0) !== 1 && 's'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Executions</span>
                <span className="info-value">{workflow.executionCount || 0}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Created</span>
                <span className="info-value">{formatDate(workflow.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Pipeline */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Action Pipeline</h3>
          </div>
          <div className="card-body">
            <div className="pipeline">
              {workflow.actions
                ?.sort((a, b) => a.order - b.order)
                .map((action, idx) => {
                  const meta = ACTION_META[action.actionType] || {};
                  const Icon = meta.icon || Activity;
                  return (
                    <div key={idx} className="pipeline-step">
                      <div className="pipeline-connector">
                        <div
                          className="pipeline-dot"
                          style={{ borderColor: meta.color || '#666' }}
                        />
                        {idx < workflow.actions.length - 1 && <div className="pipeline-line" />}
                      </div>
                      <div className="pipeline-content">
                        <div className="pipeline-icon" style={{ backgroundColor: (meta.color || '#666') + '18', color: meta.color }}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <div className="pipeline-label">{meta.label || action.actionType}</div>
                          <div className="pipeline-order">Step {idx + 1}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Form Fields Detail */}
      {(workflow.triggerType === 'GOOGLE_FORM' || workflow.triggerType === 'ECOMMERCE_ORDER') &&
        workflow.triggerConfig?.formFields?.length > 0 && (
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title">
                <FileText size={18} style={{ marginRight: 6 }} /> Form Fields
              </h3>
              <span className="card-header-hint">
                {workflow.triggerConfig.formFields.length} field
                {workflow.triggerConfig.formFields.length !== 1 && 's'}
              </span>
            </div>
            <div className="card-body">
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Field Name</th>
                      <th>Label</th>
                      <th>Type</th>
                      <th>Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflow.triggerConfig.formFields.map((f, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td><code>{f.fieldName}</code></td>
                        <td>{f.fieldLabel || '—'}</td>
                        <td>{f.fieldType}</td>
                        <td>{f.required ? '✓ Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}



      {/* Zoom Meetings History */}
      {workflow.triggerType === 'ZOOM_EVENT' && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title">
              <Video size={18} style={{ marginRight: 6 }} /> Zoom Meetings
            </h3>
            <span className="card-header-hint">{zoomMeetings.length} meeting{zoomMeetings.length !== 1 && 's'}</span>
          </div>
          <div className="card-body">
            {zoomMeetings.length === 0 ? (
              <div className="empty-inline">
                <Video size={20} className="text-muted" />
                <span>No Zoom meetings yet. Trigger the webhook to create one.</span>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Topic</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Attendees</th>
                      <th>Transcript</th>
                      <th>Created</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {zoomMeetings.map((m) => (
                      <tr key={m._id}>
                        <td style={{ fontWeight: 500 }}>{m.topic}</td>
                        <td>
                          <span
                            className={`chip ${
                              m.status === 'ended' ? 'chip-success' :
                              m.status === 'started' ? 'chip-warning' :
                              m.status === 'scheduled' ? 'chip-primary' : 'chip-muted'
                            }`}
                            style={{ fontSize: '0.75rem' }}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td>{m.actualDuration || m.duration} min</td>
                        <td>{m.attendees?.length || 0}</td>
                        <td>
                          {m.transcript ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setShowTranscript(m)}
                              style={{ fontSize: '0.8rem' }}
                            >
                              📝 View
                            </button>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                              {m.status === 'ended' ? 'Processing...' : '—'}
                            </span>
                          )}
                        </td>
                        <td>{formatDate(m.createdAt)}</td>
                        <td>
                          {m.joinUrl && (
                            <a href={m.joinUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                              <ExternalLink size={14} /> Join
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Execution Logs */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">Execution History</h3>
          <span className="card-header-hint">{logs.length} execution{logs.length !== 1 && 's'}</span>
        </div>
        <div className="card-body">
          {logs.length === 0 ? (
            <div className="empty-inline">
              <Activity size={20} className="text-muted" />
              <span>No executions yet. Trigger the webhook to see results here.</span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Duration</th>
                    <th>Actions</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td><StatusBadge status={log.status} /></td>
                      <td>{formatDate(log.createdAt)}</td>
                      <td>{log.duration ? `${log.duration}ms` : '—'}</td>
                      <td>{log.executionResults?.length || 0} steps</td>
                      <td>
                        <Link to={`/logs/${log._id}`} className="btn btn-ghost btn-sm">
                          <ExternalLink size={14} /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Webhook Modal */}
      <Modal isOpen={showWebhook} onClose={() => setShowWebhook(false)} title="Webhook URL">
        <p className="modal-desc">
          Send a POST request to this URL to trigger your workflow. No authentication required.
        </p>
        <div className="webhook-url-box">
          <code>{webhookUrl}</code>
          <button className="btn btn-ghost btn-sm" onClick={copyWebhook}>
            <Copy size={14} /> Copy
          </button>
        </div>
        <div className="webhook-example">
          <h4>Example cURL:</h4>
          <pre>{`curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -d '${
    workflow.triggerConfig?.formFields?.length > 0
      ? JSON.stringify(
          workflow.triggerConfig.formFields.reduce((acc, f) => {
            acc[f.fieldName] =
              f.fieldType === 'email'
                ? 'john@example.com'
                : f.fieldType === 'number'
                ? 123
                : f.fieldType === 'checkbox'
                ? true
                : `sample ${f.fieldLabel || f.fieldName}`;
            return acc;
          }, {}),
          null,
          2
        )
      : '{"name": "John", "email": "john@example.com"}'
  }'`}</pre>
        </div>
        {workflow.triggerConfig?.formFields?.length > 0 && (
          <div className="webhook-fields-info">
            <h4>Expected Fields:</h4>
            <div className="table-wrapper">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Type</th>
                    <th>Required</th>
                  </tr>
                </thead>
                <tbody>
                  {workflow.triggerConfig.formFields.map((f, idx) => (
                    <tr key={idx}>
                      <td><code>{f.fieldName}</code></td>
                      <td>{f.fieldType}</td>
                      <td>{f.required ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Transcript Modal */}
      <Modal isOpen={!!showTranscript} onClose={() => setShowTranscript(null)} title={`Transcript: ${showTranscript?.topic || ''}`}>
        {showTranscript && (
          <div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <div>
                <span style={{ color: '#666', fontSize: '0.8rem' }}>Meeting ID</span>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{showTranscript.meetingId}</div>
              </div>
              <div>
                <span style={{ color: '#666', fontSize: '0.8rem' }}>Duration</span>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{showTranscript.actualDuration || showTranscript.duration} min</div>
              </div>
              <div>
                <span style={{ color: '#666', fontSize: '0.8rem' }}>Participants</span>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{showTranscript.participantCount || 'N/A'}</div>
              </div>
              {showTranscript.endedAt && (
                <div>
                  <span style={{ color: '#666', fontSize: '0.8rem' }}>Ended At</span>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{formatDate(showTranscript.endedAt)}</div>
                </div>
              )}
            </div>
            {showTranscript.recordingUrl && (
              <div style={{ marginBottom: 16 }}>
                <a href={showTranscript.recordingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                  🎥 View Recording
                </a>
              </div>
            )}
            <div
              style={{
                background: '#f8f9fa',
                padding: 16,
                borderRadius: 8,
                maxHeight: 400,
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}
            >
              {showTranscript.transcript || 'Transcript is not yet available. It will appear here after Zoom finishes processing the recording.'}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
