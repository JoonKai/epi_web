import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme as antTheme, Spin } from 'antd'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Measurement from './pages/epi/Measurement'
import MocvdSource from './pages/epi/mocvd/Source'
import Simulator from './pages/epi/Simulator'
import WaferMap from './pages/WaferMap'
import DataGrid from './pages/DataGrid'
import Admin from './pages/Admin'

// 딥 네이비 다크 토큰
const DARK_TOKENS = {
  colorBgBase:           '#0a1628',
  colorBgContainer:      '#0f2040',
  colorBgElevated:       '#162848',
  colorBgLayout:         '#070f1e',
  colorBgSpotlight:      '#162848',
  colorBorder:           'rgba(255,255,255,0.10)',
  colorBorderSecondary:  'rgba(255,255,255,0.06)',
  colorFillAlter:        'rgba(255,255,255,0.04)',
  colorFillContent:      'rgba(255,255,255,0.06)',
}

const LIGHT_TOKENS = {}

function AppRoutes({ isDark, onThemeToggle }) {
  const { user, loading, logout } = useAuth()

  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [logout])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070f1e' }}>
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
          <Route path="/epi/mocvd/source" element={<MocvdSource />} />
          <Route path="/epi/measurement" element={<Measurement />} />
          <Route path="/epi/simulator" element={<Simulator />} />
          <Route path="/wafermap" element={<WaferMap />} />
          <Route path="/grid" element={<DataGrid />} />
          {user.role === 'admin' && <Route path="/admin" element={<Admin />} />}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

function App() {
  const [isDark, setIsDark] = useState(true)   // 다크 모드 기본값

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#4f7fff',
          borderRadius: 8,
          fontFamily: "'Pretendard', 'Segoe UI', -apple-system, sans-serif",
          ...(isDark ? DARK_TOKENS : LIGHT_TOKENS),
        },
        components: {
          Menu: isDark ? {
            darkItemBg:           'transparent',
            darkItemHoverBg:      'rgba(79,127,255,0.12)',
            darkItemSelectedBg:   'rgba(79,127,255,0.20)',
            darkSubMenuItemBg:    'transparent',
          } : {},
          Card: isDark ? {
            colorBgContainer: '#0f2040',
          } : {},
        },
      }}
    >
      <AuthProvider>
        <AppRoutes isDark={isDark} onThemeToggle={() => setIsDark(p => !p)} />
      </AuthProvider>
    </ConfigProvider>
  )
}

export default App
