import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { AccountProvider } from './contexts/AccountContext'

import LoginPage       from './pages/LoginPage'
import DashboardPage   from './pages/DashboardPage'
import QuickEntryPage  from './pages/QuickEntryPage'
import TransactionsPage from './pages/TransactionsPage'
import PredictionsPage from './pages/PredictionsPage'
import AnalyticsPage   from './pages/AnalyticsPage'
import SettingsPage    from './pages/SettingsPage'
import TreasuryPage    from './pages/TreasuryPage'
import ImporterPage    from './pages/ImporterPage'

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AccountProvider>
        <Layout />
      </AccountProvider>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — all share the sidebar layout shell */}
        <Route element={<ProtectedLayout />}>
          <Route index          element={<DashboardPage />} />
          <Route path="quick-entry"  element={<QuickEntryPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="predictions"  element={<PredictionsPage />} />
          <Route path="analytics"    element={<AnalyticsPage />} />
          <Route path="treasury"     element={<TreasuryPage />} />
          <Route path="settings"     element={<SettingsPage />} />
          <Route path="settings/import" element={<ImporterPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
