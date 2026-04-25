import { LayoutDashboard } from 'lucide-react'
import TodayFortune from '../components/dashboard/TodayFortune'
import LowestFortune from '../components/dashboard/LowestFortune'
import RecordDeed from '../components/dashboard/RecordDeed'
import RecentChronicles from '../components/dashboard/RecentChronicles'
import FutureProphecies from '../components/dashboard/FutureProphecies'
import FloatingAdvisor from '../components/FloatingAdvisor'
import PageContextHeader from '../components/layout/PageContextHeader'
import { useSelectedAccount } from '../contexts/AccountContext'

export default function DashboardPage() {
  const { selectedAccount } = useSelectedAccount()
  const isPrimary = selectedAccount?.is_primary

  return (
    <div className="page-shell">
      <PageContextHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle={
          selectedAccount
            ? `Viewing treasury: ${selectedAccount.name}`
            : 'Loading thy treasury…'
        }
        showAccountSwitcher
      />
      <div className="page-container">
        <div className={`grid-dashboard-unified ${isPrimary ? '' : 'grid-dashboard-no-lowest'}`.trim()}>
          <div className="dashboard-card dashboard-today">
            <TodayFortune />
          </div>
          <div className="dashboard-card dashboard-record">
            <RecordDeed />
          </div>
          <div className="dashboard-card dashboard-recent">
            <RecentChronicles />
          </div>
          <div className="dashboard-card dashboard-future">
            <FutureProphecies />
          </div>
          {isPrimary && (
            <div className="dashboard-card dashboard-lowest">
              <LowestFortune />
            </div>
          )}
        </div>

        <FloatingAdvisor />
      </div>
    </div>
  )
}
