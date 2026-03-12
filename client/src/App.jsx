import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConfigProvider, Spin, theme as antTheme } from 'antd'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DataGrid from './pages/DataGrid'
import Admin from './pages/Admin'
import Login from './pages/Login'
import WaferMap from './pages/WaferMap'
import Measurement from './pages/epi/Measurement'
import MocvdSource from './pages/epi/mocvd/Source'
import Simulator from './pages/epi/Simulator'

const DARK_TOKENS = {
  colorPrimary: '#ff6a3d',
  colorSuccess: '#35d07f',
  colorWarning: '#ffb648',
  colorError: '#ff5b6e',
  colorInfo: '#4aa3ff',
  colorTextBase: '#edf3ff',
  colorBgBase: '#050b16',
  colorBgLayout: '#050b16',
  colorBgContainer: '#0f1828',
  colorBgElevated: '#131f31',
  colorBorder: 'rgba(120,145,180,0.18)',
  colorBorderSecondary: 'rgba(120,145,180,0.12)',
  colorFillAlter: 'rgba(255,255,255,0.03)',
  colorFillContent: 'rgba(255,255,255,0.05)',
  colorTextSecondary: 'rgba(220,232,255,0.72)',
  colorTextTertiary: 'rgba(163,184,217,0.48)',
  colorTextQuaternary: 'rgba(163,184,217,0.36)',
  borderRadius: 14,
  fontFamily: "'Pretendard', 'Segoe UI', -apple-system, sans-serif",
}

const LIGHT_TOKENS = {
  colorPrimary: '#d85a34',
  colorSuccess: '#1f9d61',
  colorWarning: '#c8891d',
  colorError: '#d4485d',
  colorInfo: '#2f74db',
  colorTextBase: '#102033',
  colorBgBase: '#eef3fa',
  colorBgLayout: '#eef3fa',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#f7f9fc',
  colorBorder: 'rgba(35,58,92,0.12)',
  colorBorderSecondary: 'rgba(35,58,92,0.08)',
  colorFillAlter: 'rgba(16,32,51,0.035)',
  colorFillContent: 'rgba(16,32,51,0.05)',
  colorTextSecondary: 'rgba(16,32,51,0.72)',
  colorTextTertiary: 'rgba(16,32,51,0.5)',
  colorTextQuaternary: 'rgba(16,32,51,0.36)',
  borderRadius: 14,
  fontFamily: "'Pretendard', 'Segoe UI', -apple-system, sans-serif",
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
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
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
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  }, [isDark])

  return (
    <ConfigProvider
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
            darkItemColor: isDark ? 'rgba(220,232,255,0.72)' : 'rgba(16,32,51,0.72)',
            darkItemHoverColor: isDark ? '#ffffff' : '#102033',
            darkItemSelectedColor: isDark ? '#ffffff' : '#102033',
            darkItemSelectedBg: 'transparent',
          },
          Card: {
            colorBgContainer: isDark ? '#0f1828' : '#ffffff',
            headerBg: 'transparent',
          },
          Tabs: {
            itemColor: isDark ? 'rgba(163,184,217,0.48)' : 'rgba(16,32,51,0.48)',
            itemSelectedColor: isDark ? '#ff6a3d' : '#d85a34',
            itemHoverColor: isDark ? '#ffffff' : '#102033',
            inkBarColor: isDark ? '#ff6a3d' : '#d85a34',
          },
          Table: {
            headerBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(16,32,51,0.03)',
            headerColor: isDark ? 'rgba(163,184,217,0.48)' : 'rgba(16,32,51,0.48)',
            rowHoverBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(16,32,51,0.03)',
            borderColor: isDark ? 'rgba(120,145,180,0.12)' : 'rgba(35,58,92,0.12)',
          },
          Input: {
            activeBorderColor: isDark ? 'rgba(255,106,61,0.48)' : 'rgba(216,90,52,0.48)',
            hoverBorderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(16,32,51,0.14)',
          },
          Select: {
            optionSelectedBg: isDark ? 'rgba(255,106,61,0.12)' : 'rgba(216,90,52,0.12)',
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
