import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme as antTheme } from 'antd'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Measurement from './pages/epi/Measurement'
import MocvdSource from './pages/epi/mocvd/Source'
import DataGrid from './pages/DataGrid'

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
      <BrowserRouter>
        <Layout isDark={isDark} onThemeToggle={() => setIsDark(p => !p)}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/epi/mocvd/source" element={<MocvdSource />} />
            <Route path="/epi/measurement" element={<Measurement />} />
            <Route path="/grid" element={<DataGrid />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
