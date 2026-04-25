import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Coins } from 'lucide-react'
import Sidebar from './Sidebar'
import DisplayFormatSync from './DisplayFormatSync'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="app-shell">
      {/* Ambient background glows */}
      <div className="bg-glow-right" />
      <div className="bg-glow-left" />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <div className={`main-content flex flex-col ${sidebarCollapsed ? 'main-content-collapsed' : ''}`}>
        <DisplayFormatSync />
        {/* Mobile top bar */}
        <header className="topbar">
          <button
            className="btn-ghost p-2 text-gold"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <Coins size={20} className="text-gold" />
            <span className="text-gold font-bold tracking-wide text-sm font-cinzel">
              Sir Spendalot
            </span>
          </div>
          {/* Spacer to centre the title */}
          <div className="w-10" />
        </header>

        {/* Page content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
