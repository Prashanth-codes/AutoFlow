import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plug,
  Linkedin,
  Video,
  Mail,
  ShoppingBag,
  Store,
  Plus,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Send,
} from 'lucide-react';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { linkedinAPI } from '../services/api';

const INTEGRATIONS = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    desc: 'Post updates and share content to LinkedIn automatically',
    icon: Linkedin,
    color: '#0077b5',
    oauth: true, // uses OAuth flow — no manual fields
    fields: [],
  },
  {
    id: 'zoom',
    name: 'Zoom',
    desc: 'Create and manage Zoom meetings automatically',
    icon: Video,
    color: '#2d8cff',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password' },
    ],
  },
  {
    id: 'gmail',
    name: 'Gmail',
    desc: 'Send automated emails via Gmail SMTP',
    icon: Mail,
    color: '#ea4335',
    fields: [
      { key: 'email', label: 'Email Address', type: 'email' },
      { key: 'appPassword', label: 'App Password', type: 'password' },
    ],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    desc: 'Process payments and handle order webhooks',
    icon: ShoppingBag,
    color: '#635bff',
    fields: [
      { key: 'secretKey', label: 'Secret Key', type: 'password' },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password' },
    ],
  },
  {
    id: 'shopify',
    name: 'Shopify',
    desc: 'Receive order notifications from your Shopify store',
    icon: Store,
    color: '#96bf48',
    fields: [
      { key: 'shopDomain', label: 'Shop Domain', type: 'text' },
      { key: 'apiKey', label: 'API Key', type: 'password' },
    ],
  },
];

export default function Connections() {
  const { user } = useAuth();
  const [connected, setConnected] = useState({});
  const [showModal, setShowModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [searchParams] = useSearchParams();
  const [testPostText, setTestPostText] = useState('');
  const [posting, setPosting] = useState(false);

  // ── On mount: check LinkedIn connection status & query-param toast ──
  useEffect(() => {
    checkLinkedInStatus();

    const linkedinParam = searchParams.get('linkedin');
    if (linkedinParam === 'connected') {
      toast.success('LinkedIn connected successfully!');
      setConnected((prev) => ({ ...prev, linkedin: true }));
    } else if (linkedinParam === 'error') {
      toast.error('LinkedIn connection failed. Please try again.');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkLinkedInStatus = async () => {
    try {
      const { data } = await linkedinAPI.getStatus();
      if (data.connected) {
        setConnected((prev) => ({ ...prev, linkedin: true }));
      }
    } catch {
      // not connected or not logged in
    }
  };

  const handleConnect = (integration) => {
    // LinkedIn uses OAuth redirect
    if (integration.oauth) {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      window.location.href = `${backendUrl}/api/auth/linkedin?token=${token}&returnTo=${encodeURIComponent('/connections')}`;
      return;
    }
    setShowModal(integration);
    setFormData({});
  };

  const handleSave = () => {
    if (!showModal) return;
    const integration = showModal;
    const allFilled = integration.fields.every((f) => formData[f.key]?.trim());
    if (!allFilled) {
      toast.error('Please fill in all fields');
      return;
    }
    setConnected((prev) => ({ ...prev, [integration.id]: true }));
    setShowModal(null);
    toast.success(`${integration.name} connected!`);
  };

  const handleDisconnect = async (integrationId) => {
    if (integrationId === 'linkedin') {
      try {
        await linkedinAPI.disconnect();
      } catch {
        // ignore
      }
    }
    setConnected((prev) => ({ ...prev, [integrationId]: false }));
    toast.success('Disconnected');
  };

  const handleTestPost = async () => {
    if (!testPostText.trim()) {
      toast.error('Enter some text to post');
      return;
    }
    setPosting(true);
    try {
      const { data } = await linkedinAPI.testPost(testPostText);
      toast.success(data.message || 'Posted!');
      setTestPostText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Post failed');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Connections</h1>
          <p className="page-subtitle">
            Manage your integrations and connected services
          </p>
        </div>
      </div>

      <div className="connections-grid">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;
          const isConnected = connected[integration.id];
          return (
            <div key={integration.id} className={`connection-card ${isConnected ? 'connected' : ''}`}>
              <div className="connection-card-top">
                <div
                  className="connection-icon"
                  style={{ backgroundColor: integration.color + '15', color: integration.color }}
                >
                  <Icon size={24} />
                </div>
                {isConnected && (
                  <div className="connection-status">
                    <CheckCircle2 size={16} className="text-success" />
                    <span>Connected</span>
                  </div>
                )}
              </div>
              <h3 className="connection-name">{integration.name}</h3>
              <p className="connection-desc">{integration.desc}</p>
              <div className="connection-card-bottom">
                {isConnected ? (
                  <>
                    <button
                      className="btn btn-outline btn-sm btn-full"
                      onClick={() => handleDisconnect(integration.id)}
                    >
                      <XCircle size={14} /> Disconnect
                    </button>

                    {/* LinkedIn test-post mini form */}
                    {integration.id === 'linkedin' && (
                      <div style={{ marginTop: 8, width: '100%' }}>
                        <textarea
                          rows={2}
                          placeholder="Write a test post…"
                          value={testPostText}
                          onChange={(e) => setTestPostText(e.target.value)}
                          style={{
                            width: '100%',
                            borderRadius: 6,
                            border: '1px solid #334155',
                            padding: '6px 8px',
                            fontSize: 13,
                            background: '#0f172a',
                            color: '#f1f5f9',
                            resize: 'vertical',
                          }}
                        />
                        <button
                          className="btn btn-primary btn-sm btn-full"
                          style={{ marginTop: 6 }}
                          onClick={handleTestPost}
                          disabled={posting}
                        >
                          <Send size={14} /> {posting ? 'Posting…' : 'Test Post'}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    className="btn btn-primary btn-sm btn-full"
                    onClick={() => handleConnect(integration)}
                  >
                    <Plus size={14} /> Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Custom Integration Card */}
        <div className="connection-card connection-card-custom">
          <div className="connection-card-top">
            <div className="connection-icon" style={{ backgroundColor: '#6b728015', color: '#6b7280' }}>
              <Plug size={24} />
            </div>
          </div>
          <h3 className="connection-name">Custom Webhook</h3>
          <p className="connection-desc">
            Connect any service using custom webhooks
          </p>
          <div className="connection-card-bottom">
            <a href="https://docs.flowpilot.dev" target="_blank" rel="noopener" className="btn btn-ghost btn-sm btn-full">
              <ExternalLink size={14} /> View Docs
            </a>
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      <Modal
        isOpen={!!showModal}
        onClose={() => setShowModal(null)}
        title={`Connect ${showModal?.name}`}
      >
        {showModal && (
          <div className="connect-form">
            <p className="modal-desc">
              Enter your {showModal.name} credentials to enable this integration.
            </p>
            {showModal.fields.map((field) => (
              <div key={field.key} className="form-group">
                <label>{field.label}</label>
                <input
                  type={field.type}
                  placeholder={field.label}
                  value={formData[field.key] || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                />
              </div>
            ))}
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setShowModal(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Save Connection
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
