import { useState } from 'react';
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
} from 'lucide-react';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const INTEGRATIONS = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    desc: 'Post updates and share content to LinkedIn automatically',
    icon: Linkedin,
    color: '#0077b5',
    fields: [{ key: 'accessToken', label: 'Access Token', type: 'password' }],
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
  const [showModal, setShowModal] = useState(null);
  const [formData, setFormData] = useState({});

  const handleConnect = (integration) => {
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
