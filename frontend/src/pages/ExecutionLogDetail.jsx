import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { logsAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Code,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExecutionLogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedPayload, setExpandedPayload] = useState(false);
  const [expandedActions, setExpandedActions] = useState({});

  useEffect(() => {
    loadLog();
  }, [id]);

  const loadLog = async () => {
    try {
      const { data } = await logsAPI.getById(id);
      setLog(data.log);
    } catch {
      toast.error('Failed to load execution log');
      navigate('/logs');
    } finally {
      setLoading(false);
    }
  };

  const toggleAction = (idx) => {
    setExpandedActions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  if (!log) return null;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-back">
          <button className="btn btn-ghost" onClick={() => navigate('/logs')}>
            <ArrowLeft size={18} /> Back
          </button>
          <div>
            <div className="page-title-row">
              <h1 className="page-title">Execution Details</h1>
              <StatusBadge status={log.status} />
            </div>
            <p className="page-subtitle">Log ID: {log._id}</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="detail-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Summary</h3>
          </div>
          <div className="card-body">
            <div className="info-list">
              <div className="info-row">
                <span className="info-label">Status</span>
                <StatusBadge status={log.status} />
              </div>
              <div className="info-row">
                <span className="info-label">Started</span>
                <span className="info-value">{formatDate(log.createdAt)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Completed</span>
                <span className="info-value">{formatDate(log.completedAt)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Duration</span>
                <span className="info-value">{log.duration ? `${log.duration}ms` : '—'}</span>
              </div>
              {log.error && (
                <div className="info-row">
                  <span className="info-label">Error</span>
                  <span className="info-value text-danger">{log.error}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trigger Payload */}
        <div className="card">
          <div className="card-header clickable" onClick={() => setExpandedPayload(!expandedPayload)}>
            <div className="card-header-toggle">
              {expandedPayload ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <h3 className="card-title">Trigger Payload</h3>
            </div>
            <Code size={16} className="text-muted" />
          </div>
          {expandedPayload && (
            <div className="card-body">
              <pre className="json-block">
                {JSON.stringify(log.triggerPayload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Action Results */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">Action Results</h3>
          <span className="card-header-hint">
            {log.executionResults?.length || 0} action{(log.executionResults?.length || 0) !== 1 && 's'}
          </span>
        </div>
        <div className="card-body">
          {!log.executionResults || log.executionResults.length === 0 ? (
            <div className="empty-inline">
              <Clock size={18} className="text-muted" />
              <span>No action results recorded</span>
            </div>
          ) : (
            <div className="action-results">
              {log.executionResults.map((result, idx) => (
                <div key={idx} className={`action-result ${result.status === 'success' ? 'result-success' : 'result-failed'}`}>
                  <div className="action-result-header" onClick={() => toggleAction(idx)}>
                    <div className="action-result-left">
                      {result.status === 'success' ? (
                        <CheckCircle2 size={18} className="text-success" />
                      ) : (
                        <XCircle size={18} className="text-danger" />
                      )}
                      <span className="action-result-name">
                        {result.actionType?.replace(/_/g, ' ') || `Action ${idx + 1}`}
                      </span>
                    </div>
                    {expandedActions[idx] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                  {expandedActions[idx] && (
                    <div className="action-result-body">
                      <pre className="json-block">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
