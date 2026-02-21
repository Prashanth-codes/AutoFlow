import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GitBranch,
  ScrollText,
  Plug,
  Settings,
  Zap,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/workflows', icon: GitBranch, label: 'Workflows' },
  { to: '/logs', icon: ScrollText, label: 'Execution Logs' },
  { to: '/connections', icon: Plug, label: 'Connections' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Zap size={22} />
        </div>
        <span className="sidebar-brand-text">FlowPilot</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive =
            to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
          return (
            <NavLink key={to} to={to} className={`sidebar-link ${isActive ? 'active' : ''}`}>
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-version">v1.0.0</div>
      </div>
    </aside>
  );
}
