import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Coins } from 'lucide-react'
import Sidebar from './Sidebar'
import DisplayFormatSync from './DisplayFormatSync'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Collapse only applies on desktop. On mobile, the sidebar slides in fully.
  const effectiveCollapsed = !isMobile && sidebarCollapsed

  return (
    <div className="app-shell">
      {/* Ambient background glows */}
      <div className="bg-glow-right" />
      <div className="bg-glow-left" />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={effectiveCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <div className={`main-content flex flex-col ${effectiveCollapsed ? 'main-content-collapsed' : ''}`}>
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
          <div className="topbar-title">
            <Coins size={20} className="text-gold" />
            <span className="text-gold font-bold tracking-wide text-sm font-cinzel">
              Sir Spendalot
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
