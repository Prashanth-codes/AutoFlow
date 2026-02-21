import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Building2 } from 'lucide-react';

export default function Header() {
  const { user, organization, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div className="header-left">
        {organization && (
          <div className="header-org">
            <Building2 size={16} />
            <span>{organization.name || organization}</span>
          </div>
        )}
      </div>
      <div className="header-right">
        <div className="header-user">
          <div className="header-avatar">
            <User size={16} />
          </div>
          <span className="header-user-name">{user?.name || 'User'}</span>
        </div>
        <button className="btn-icon" onClick={handleLogout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
