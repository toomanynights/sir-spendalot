import { NavLink } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  LayoutDashboard,
  Zap,
  ScrollText,
  TrendingDown,
  BarChart3,
  Landmark,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  {
    section: 'Main',
    links: [
      { to: '/',             label: 'Dashboard',    icon: LayoutDashboard },
      { to: '/quick-entry',  label: 'Quick Entry',  icon: Zap },
    ],
  },
  {
    section: 'Records',
    links: [
      { to: '/transactions', label: 'Chronicles', icon: ScrollText },
      { to: '/predictions',  label: 'Prophecies',   icon: TrendingDown },
      { to: '/analytics',    label: 'Analytics',    icon: BarChart3 },
    ],
  },
  {
    section: 'Config',
    links: [
      { to: '/treasury',     label: 'Treasury',     icon: Landmark },
      { to: '/settings',     label: 'Settings',     icon: Settings },
    ],
  },
]

export default function Sidebar({ isOpen, onClose, collapsed = false, onToggleCollapse }) {
  const { logout } = useAuth()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <aside
        className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="sidebar-logo">
          <Coins size={28} className="text-gold shrink-0" strokeWidth={2} />
          <div className={collapsed ? 'hidden' : ''}>
            <div className="sidebar-logo-title">Sir Spendalot</div>
            <div className="sidebar-logo-sub">Thy finances, foretold!</div>
          </div>
          <button
            type="button"
            className="btn-ghost hidden md:inline-flex ml-auto text-gold-muted hover:text-gold"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ section, links }) => (
            <div key={section}>
              {!collapsed && <div className="nav-section-label">{section}</div>}
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'nav-item-active' : ''}`
                  }
                  onClick={onClose}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={18} strokeWidth={1.75} />
                  {!collapsed && label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            className="nav-item w-full text-danger/70 hover:text-danger"
            onClick={logout}
            title={collapsed ? 'Log Out' : undefined}
          >
            <LogOut size={18} strokeWidth={1.75} />
            {!collapsed && 'Log Out'}
          </button>
          {!collapsed && (
            <p className="text-gold-muted/30 text-xs font-crimson italic text-center mt-3">
              "He who guards his gold,<br />guards his glory"
            </p>
          )}
        </div>
      </aside>
    </>
  )
}
