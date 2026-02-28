import { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  Plus,
  Trash2,
  Edit3,
  ToggleLeft,
  ToggleRight,
  Instagram,
  Link,
  Hash,
  Send,
  TrendingUp,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { commentRuleAPI } from '../services/api';

const EMPTY_FORM = {
  keyword: '',
  targetReelUrl: '',
  targetMediaId: '',
  dmMessage: '',
  dmLink: '',
  dmButtonText: 'Open Link',
};

export default function CommentAutomation() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      const res = await commentRuleAPI.getAll();
      setRules(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load comment rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const openCreateModal = () => {
    setEditingRule(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setForm({
      keyword: rule.keyword || '',
      targetReelUrl: rule.targetReelUrl || '',
      targetMediaId: rule.targetMediaId || '',
      dmMessage: rule.dmMessage || '',
      dmLink: rule.dmLink || '',
      dmButtonText: rule.dmButtonText || 'Open Link',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.keyword.trim()) {
      toast.error('Keyword is required');
      return;
    }
    if (!form.dmMessage.trim() && !form.dmLink.trim()) {
      toast.error('Provide a DM message or link');
      return;
    }

    setSaving(true);
    try {
      if (editingRule) {
        await commentRuleAPI.update(editingRule._id, form);
        toast.success('Rule updated');
      } else {
        await commentRuleAPI.create(form);
        toast.success('Rule created');
      }
      setShowModal(false);
      fetchRules();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this rule?')) return;
    try {
      await commentRuleAPI.delete(id);
      toast.success('Rule deleted');
      fetchRules();
    } catch {
      toast.error('Failed to delete rule');
    }
  };

  const handleToggle = async (id) => {
    try {
      await commentRuleAPI.toggle(id);
      fetchRules();
    } catch {
      toast.error('Failed to toggle rule');
    }
  };

  const totalMatches = rules.reduce((s, r) => s + (r.matchCount || 0), 0);
  const activeRules = rules.filter((r) => r.enabled).length;

  if (loading) {
    return (
      <div className="page">
        <div className="page-loader">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title-row">
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #e1306c, #fd1d1d, #f77737)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <Instagram size={22} />
            </div>
            <h1 className="page-title">Comment Automation</h1>
          </div>
          <p className="page-subtitle">
            Auto-send DMs with links when someone comments a keyword on your reels
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} /> New Rule
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-icon stat-icon-purple">
            <Hash size={22} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{rules.length}</span>
            <span className="stat-card-label">Total Rules</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon stat-icon-green">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{activeRules}</span>
            <span className="stat-card-label">Active Rules</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon stat-icon-blue">
            <TrendingUp size={22} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{totalMatches}</span>
            <span className="stat-card-label">Total Matches</span>
          </div>
        </div>
      </div>

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
            <MessageCircle
              size={48}
              style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}
            />
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              No rules yet
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: 400, margin: '0 auto 1.5rem' }}>
              Create your first keyword rule. When someone comments the keyword on your reel,
              they'll automatically receive a DM with your link.
            </p>
            <button className="btn btn-primary" onClick={openCreateModal}>
              <Plus size={16} /> Create First Rule
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body no-pad">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Keyword</th>
                  <th>DM Message / Link</th>
                  <th>Target Reel</th>
                  <th>Matches</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule._id}>
                    <td>
                      <button
                        className="btn-icon"
                        onClick={() => handleToggle(rule._id)}
                        title={rule.enabled ? 'Disable' : 'Enable'}
                      >
                        {rule.enabled ? (
                          <ToggleRight size={22} style={{ color: 'var(--success)' }} />
                        ) : (
                          <ToggleLeft size={22} style={{ color: 'var(--text-muted)' }} />
                        )}
                      </button>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'var(--accent-light)',
                          color: 'var(--accent)',
                          padding: '0.2rem 0.65rem',
                          borderRadius: 100,
                          fontWeight: 600,
                          fontSize: '0.82rem',
                        }}
                      >
                        <Hash size={13} />
                        {rule.keyword}
                      </span>
                    </td>
                    <td>
                      <div style={{ maxWidth: 280 }}>
                        {rule.dmMessage && (
                          <div
                            style={{
                              fontSize: '0.85rem',
                              color: 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {rule.dmMessage}
                          </div>
                        )}
                        {rule.dmLink && (
                          <div
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--info)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              marginTop: rule.dmMessage ? 2 : 0,
                            }}
                          >
                            <Link size={11} />
                            <span
                              style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: 240,
                              }}
                            >
                              {rule.dmLink}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {rule.targetReelUrl ? (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          Specific reel
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          All reels
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{rule.matchCount || 0}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                        <button
                          className="btn-icon"
                          onClick={() => openEditModal(rule)}
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="btn-icon btn-icon-danger"
                          onClick={() => handleDelete(rule._id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <span className="card-title">How It Works</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-light)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem',
                }}
              >
                <MessageCircle size={22} />
              </div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: 4 }}>1. User Comments</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Someone comments your keyword on your Instagram reel
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--success-light)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem',
                }}
              >
                <Hash size={22} />
              </div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: 4 }}>2. Keyword Matched</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                The system detects the keyword and finds the matching rule
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--info-light)',
                  color: 'var(--info)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem',
                }}
              >
                <Send size={22} />
              </div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: 4 }}>3. DM Sent</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                A DM with your link is automatically sent to the commenter
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingRule ? 'Edit Rule' : 'Create Comment Rule'}
      >
        <div className="connect-form">
          <p className="modal-desc" style={{ marginBottom: '1rem' }}>
            When someone comments a keyword on your reel, they'll automatically receive a DM.
          </p>

          {/* Keyword */}
          <div className="form-group">
            <label>Trigger Keyword *</label>
            <input
              type="text"
              placeholder="e.g. LINK, INFO, SEND"
              value={form.keyword}
              onChange={(e) => setForm((p) => ({ ...p, keyword: e.target.value }))}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              Case-insensitive. If someone's comment contains this word, it will match.
            </span>
          </div>

          {/* Target reel URL */}
          <div className="form-group">
            <label>Target Reel URL (optional)</label>
            <input
              type="url"
              placeholder="https://www.instagram.com/reel/... (leave blank for all reels)"
              value={form.targetReelUrl}
              onChange={(e) => setForm((p) => ({ ...p, targetReelUrl: e.target.value }))}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              Limit this rule to a specific reel. Leave blank to match all reels.
            </span>
          </div>

          {/* DM Message */}
          <div className="form-group">
            <label>DM Message</label>
            <textarea
              rows={3}
              placeholder="Hey! Here's the link you asked for 🔥"
              value={form.dmMessage}
              onChange={(e) => setForm((p) => ({ ...p, dmMessage: e.target.value }))}
            />
          </div>

          {/* DM Link */}
          <div className="form-group">
            <label>Link to Send</label>
            <input
              type="url"
              placeholder="https://your-link.com/resource"
              value={form.dmLink}
              onChange={(e) => setForm((p) => ({ ...p, dmLink: e.target.value }))}
            />
          </div>

          {/* Button text */}
          {form.dmLink && (
            <div className="form-group">
              <label>Button Text</label>
              <input
                type="text"
                placeholder="Open Link"
                value={form.dmButtonText}
                onChange={(e) => setForm((p) => ({ ...p, dmButtonText: e.target.value }))}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Label shown on the clickable button in the DM card.
              </span>
            </div>
          )}

          {/* Preview */}
          {(form.dmMessage || form.dmLink) && (
            <div
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '0.5rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                DM Preview
              </span>
              <div
                style={{
                  marginTop: 8,
                  padding: '0.75rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                }}
              >
                {form.dmMessage && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: form.dmLink ? 8 : 0 }}>
                    {form.dmMessage}
                  </p>
                )}
                {form.dmLink && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'var(--accent)',
                      color: 'white',
                      padding: '0.4rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                    }}
                  >
                    <Link size={13} />
                    {form.dmButtonText || 'Open Link'}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
