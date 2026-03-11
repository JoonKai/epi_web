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
import DataGrid from './pages/DataGrid'
import Admin from './pages/Admin'

function AppRoutes({ isDark, onThemeToggle }) {
  const { user, loading, logout } = useAuth()

  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [logout])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <Route path="/grid" element={<DataGrid />} />
          {user.role === 'admin' && <Route path="/admin" element={<Admin />} />}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

function App() {
  const [isDark, setIsDark] = useState(false)

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#4f7fff',
          borderRadius: 8,
          fontFamily: "'Segoe UI', 'Pretendard', sans-serif",
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
