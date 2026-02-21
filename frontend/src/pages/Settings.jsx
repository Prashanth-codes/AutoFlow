import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Building2, Shield, Save, Key } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, organization } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and organization settings</p>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} />
            <span>Profile</span>
          </button>
          <button
            className={`settings-tab ${activeTab === 'organization' ? 'active' : ''}`}
            onClick={() => setActiveTab('organization')}
          >
            <Building2 size={18} />
            <span>Organization</span>
          </button>
          <button
            className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={18} />
            <span>Security</span>
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'profile' && <ProfileTab user={user} />}
          {activeTab === 'organization' && <OrganizationTab org={organization} />}
          {activeTab === 'security' && <SecurityTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ user }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const handleSave = () => {
    toast.success('Profile updated (demo)');
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Profile Information</h3>
      </div>
      <div className="card-body">
        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Role</label>
          <input type="text" value={user?.role || 'member'} disabled />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function OrganizationTab({ org }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Organization Details</h3>
      </div>
      <div className="card-body">
        <div className="info-list">
          <div className="info-row">
            <span className="info-label">Name</span>
            <span className="info-value">{org?.name || '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Slug</span>
            <span className="info-value">{org?.slug || '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Plan</span>
            <span className="info-value plan-badge">{org?.plan || 'free'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Workflows</span>
            <span className="info-value">{org?.workflowCount || 0}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Members</span>
            <span className="info-value">{org?.memberCount || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityTab() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSave = () => {
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    toast.success('Password updated (demo)');
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Change Password</h3>
      </div>
      <div className="card-body">
        <div className="form-group">
          <label>Current Password</label>
          <input
            type="password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            placeholder="Enter current password"
          />
        </div>
        <div className="form-group">
          <label>New Password</label>
          <input
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            placeholder="Min. 6 characters"
          />
        </div>
        <div className="form-group">
          <label>Confirm New Password</label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            placeholder="Confirm new password"
          />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            <Key size={16} /> Update Password
          </button>
        </div>
      </div>
    </div>
  );
}
