import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plug,
  Instagram,
  Video,
  Mail,
  ShoppingBag,
  Store,
  Plus,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { instagramAPI } from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const INTEGRATIONS = [
  {
    id: 'instagram',
    name: 'Instagram',
    desc: 'Post photos, reels and stories to Instagram automatically',
    icon: Instagram,
    color: '#e1306c',
    oauth: true, // uses OAuth flow, not manual credentials
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
  const [connected, setConnected] = useState({});
  const [igMeta, setIgMeta] = useState({}); // { username, userId, ... }
  const [showModal, setShowModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [igLoading, setIgLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  // ── On mount: check Instagram connection status + handle OAuth redirect ──
  useEffect(() => {
    // Handle OAuth redirect query params
    const igConnected = searchParams.get('ig_connected');
    const igError = searchParams.get('ig_error');
    const igUsername = searchParams.get('ig_username');

    if (igConnected === 'true') {
      toast.success(`Instagram connected${igUsername ? ` as @${igUsername}` : ''}!`);
      // Clean up URL
      searchParams.delete('ig_connected');
      searchParams.delete('ig_username');
      setSearchParams(searchParams, { replace: true });
    }
    if (igError) {
      toast.error(`Instagram connection failed: ${igError}`);
      searchParams.delete('ig_error');
      setSearchParams(searchParams, { replace: true });
    }

    // Fetch actual connection status from backend
    fetchIgStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchIgStatus = async () => {
    try {
      const res = await instagramAPI.getStatus();
      if (res.data.connected) {
        setConnected((prev) => ({ ...prev, instagram: true }));
        setIgMeta(res.data.data || {});
      } else {
        setConnected((prev) => ({ ...prev, instagram: false }));
        setIgMeta({});
      }
    } catch {
      // silently fail
    } finally {
      setIgLoading(false);
    }
  };

  // ── Instagram OAuth: redirect to backend /api/instagram-oauth/auth?token=JWT ──
  const handleInstagramConnect = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('You must be logged in');
      return;
    }
    // Redirect the browser to the backend OAuth initiation endpoint
    window.location.href = `${API_BASE}/api/instagram-oauth/auth?token=${encodeURIComponent(token)}`;
  };

  const handleInstagramDisconnect = async () => {
    try {
      await instagramAPI.disconnect();
      setConnected((prev) => ({ ...prev, instagram: false }));
      setIgMeta({});
      toast.success('Instagram disconnected');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  const handleConnect = (integration) => {
    if (integration.oauth) {
      // OAuth-based integrations are handled separately
      if (integration.id === 'instagram') {
        handleInstagramConnect();
      }
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

  const handleDisconnect = (integrationId) => {
    if (integrationId === 'instagram') {
      handleInstagramDisconnect();
      return;
    }
    setConnected((prev) => ({ ...prev, [integrationId]: false }));
    toast.success('Disconnected');
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
          const isInstagram = integration.id === 'instagram';
          const isIgLoading = isInstagram && igLoading;

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
              <p className="connection-desc">
                {isInstagram && isConnected && igMeta.username
                  ? `Connected as @${igMeta.username}`
                  : integration.desc}
              </p>
              <div className="connection-card-bottom">
                {isIgLoading ? (
                  <button className="btn btn-ghost btn-sm btn-full" disabled>
                    <Loader2 size={14} className="spin" /> Checking…
                  </button>
                ) : isConnected ? (
                  <button
                    className="btn btn-outline btn-sm btn-full"
                    onClick={() => handleDisconnect(integration.id)}
                  >
                    <XCircle size={14} /> Disconnect
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-sm btn-full"
                    onClick={() => handleConnect(integration)}
                    style={
                      isInstagram
                        ? { background: 'linear-gradient(135deg, #833ab4, #e1306c, #f77737)', border: 'none' }
                        : {}
                    }
                  >
                    {isInstagram ? (
                      <><Instagram size={14} /> Connect with Instagram</>
                    ) : (
                      <><Plus size={14} /> Connect</>
                    )}
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
