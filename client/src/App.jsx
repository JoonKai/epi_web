import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConfigProvider, Spin, theme as antTheme } from 'antd'
import koKR from 'antd/locale/ko_KR'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DataGrid from './pages/DataGrid'
import Admin from './pages/Admin'
import Login from './pages/Login'
import WaferMap from './pages/WaferMap'
import RunComparison from './pages/RunComparison'
import Measurement from './pages/epi/Measurement'
import MocvdMasterData from './pages/epi/mocvd/MasterData'
import MocvdOverview from './pages/epi/mocvd/MocvdOverview'
import MocvdManagement from './pages/epi/mocvd/MocvdManagement'
import PersonnelManagement from './pages/epi/mocvd/PersonnelManagement'
import PmPlan from './pages/epi/mocvd/PmPlan'
import ShiftSchedule from './pages/epi/mocvd/ShiftSchedule'
import MocvdSource from './pages/epi/mocvd/Source'
import Simulator from './pages/epi/Simulator'
import PurchaseRequest from './pages/cost/PurchaseRequest'
import CostMasterData from './pages/cost/CostMasterData'
import RepairStatus from './pages/cost/RepairStatus'

// ── Nowa-TS Design Tokens ──────────────────────────────────────────
const DARK_TOKENS = {
  colorPrimary: '#f59e0b',
  colorSuccess: '#22c55e',
  colorWarning: '#eab308',
  colorError: '#f43f5e',
  colorInfo: '#3b82f6',
  colorTextBase: '#c4cdd8',
  colorBgBase: '#0f1117',
  colorBgLayout: '#0f1117',
  colorBgContainer: '#161921',
  colorBgElevated: '#1c1f2a',
  colorBorder: 'rgba(245,158,11,0.15)',
  colorBorderSecondary: 'rgba(245,158,11,0.09)',
  colorFillAlter: 'rgba(245,158,11,0.05)',
  colorFillContent: 'rgba(255,255,255,0.04)',
  colorTextSecondary: 'rgba(180,196,210,0.78)',
  colorTextTertiary: 'rgba(100,116,132,0.82)',
  colorTextQuaternary: 'rgba(100,116,132,0.5)',
  borderRadius: 12,
  fontFamily: "'Pretendard', 'Inter', 'Segoe UI', -apple-system, sans-serif",
  fontSize: 14,
}

const LIGHT_TOKENS = {
  colorPrimary: '#6366f1',
  colorSuccess: '#16a34a',
  colorWarning: '#ca8a04',
  colorError: '#e11d48',
  colorInfo: '#2563eb',
  colorTextBase: '#0f172a',
  colorBgBase: '#f1f5f9',
  colorBgLayout: '#f1f5f9',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#f8fafc',
  colorBorder: 'rgba(99,102,241,0.1)',
  colorBorderSecondary: 'rgba(99,102,241,0.07)',
  colorFillAlter: 'rgba(99,102,241,0.04)',
  colorFillContent: 'rgba(15,23,42,0.04)',
  colorTextSecondary: 'rgba(15,23,42,0.75)',
  colorTextTertiary: 'rgba(100,116,139,0.75)',
  colorTextQuaternary: 'rgba(100,116,139,0.5)',
  borderRadius: 12,
  fontFamily: "'Pretendard', 'Inter', 'Segoe UI', -apple-system, sans-serif",
  fontSize: 14,
}

function AppRoutes({ isDark, onThemeToggle }) {
  const { user, loading, logout } = useAuth()

  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [logout])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0b0f1a' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <BrowserRouter>
      <Layout isDark={isDark} onThemeToggle={onThemeToggle}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/epi/mocvd/overview" element={<MocvdOverview />} />
          <Route path="/epi/mocvd/source" element={<MocvdSource />} />
          <Route path="/epi/mocvd/pm-plan" element={<PmPlan />} />
          <Route path="/epi/mocvd/management" element={<MocvdManagement />} />
          <Route path="/epi/mocvd/shift-schedule" element={<ShiftSchedule />} />
          <Route path="/epi/mocvd/personnel" element={<PersonnelManagement />} />
          {user.role === 'admin' && <Route path="/epi/mocvd/master-data" element={<MocvdMasterData />} />}
          <Route path="/epi/measurement" element={<Measurement />} />
          <Route path="/epi/simulator" element={<Simulator />} />
          <Route path="/wafermap" element={<WaferMap />} />
          <Route path="/run-comparison" element={<RunComparison />} />
          <Route path="/grid" element={<DataGrid />} />
          <Route path="/cost/purchase-request" element={<PurchaseRequest />} />
          <Route path="/cost/repair-status" element={<RepairStatus />} />
          <Route path="/cost/master-data" element={<CostMasterData />} />
          {user.role === 'admin' && <Route path="/admin" element={<Admin />} />}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

function App() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    dayjs.locale('ko')
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  }, [isDark])

  return (
    <ConfigProvider
      locale={koKR}
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: isDark ? DARK_TOKENS : LIGHT_TOKENS,
        components: {
          Layout: {
            headerBg: 'transparent',
            siderBg: 'transparent',
            bodyBg: 'transparent',
          },
          Menu: {
            darkItemBg: 'transparent',
            darkSubMenuItemBg: 'transparent',
            darkItemColor: isDark ? 'rgba(148,163,184,0.65)' : 'rgba(100,116,139,0.8)',
            darkItemHoverColor: isDark ? '#e2e8f0' : '#0f172a',
            darkItemSelectedColor: isDark ? '#fbbf24' : '#f59e0b',
            darkItemSelectedBg: 'rgba(245,158,11,0.12)',
            itemSelectedBg: 'rgba(245,158,11,0.1)',
            itemSelectedColor: '#f59e0b',
          },
          Card: {
            colorBgContainer: isDark ? '#161921' : '#f8f9ff',
            headerBg: 'transparent',
            borderRadiusLG: 16,
          },
          Tabs: {
            itemColor: isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.75)',
            itemSelectedColor: '#f59e0b',
            itemHoverColor: isDark ? '#e2e8f0' : '#0f172a',
            inkBarColor: '#f59e0b',
          },
          Table: {
            headerBg: isDark ? 'rgba(245,158,11,0.07)' : 'rgba(245,158,11,0.05)',
            headerColor: isDark ? 'rgba(251,191,36,0.75)' : 'rgba(100,116,139,0.85)',
            rowHoverBg: isDark ? 'rgba(245,158,11,0.07)' : 'rgba(245,158,11,0.05)',
            borderColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)',
          },
          Input: {
            activeBorderColor: 'rgba(245,158,11,0.45)',
            hoverBorderColor: isDark ? 'rgba(245,158,11,0.28)' : 'rgba(245,158,11,0.22)',
          },
          Select: {
            optionSelectedBg: 'rgba(245,158,11,0.12)',
          },
          Button: {
            borderRadius: 10,
            primaryColor: '#ffffff',
            colorTextLightSolid: '#ffffff',
          },
        },
      }}
    >
      <AuthProvider>
        <AppRoutes isDark={isDark} onThemeToggle={() => setIsDark((prev) => !prev)} />
      </AuthProvider>
    </ConfigProvider>
  )
}

export default App
