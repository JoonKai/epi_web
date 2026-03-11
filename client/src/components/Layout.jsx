import { useState } from 'react'
import { Layout as AntLayout, Menu, Button, Tooltip, theme } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  ExperimentOutlined,
  TableOutlined,
  SunOutlined,
  MoonOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ControlOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'

const { Sider, Content, Header } = AntLayout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '대시보드' },
  {
    key: 'epi',
    icon: <ExperimentOutlined />,
    label: 'EPI',
    children: [
      { key: '/epi/mocvd', icon: <ControlOutlined />, label: 'MOCVD' },
      { key: '/epi/measurement', icon: <ApartmentOutlined />, label: '측정설비' },
    ],
  },
  { key: '/grid', icon: <TableOutlined />, label: '데이터 조회/입력' },
]

function findLabel(items, pathname) {
  for (const item of items) {
    if (item.key === pathname) return item.label
    if (item.children) {
      const found = findLabel(item.children, pathname)
      if (found) return found
    }
  }
  return null
}

function Layout({ children, isDark, onThemeToggle }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = theme.useToken()

  const currentLabel = findLabel(menuItems, location.pathname) ?? 'EPI Web'

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{
          background: isDark
            ? 'linear-gradient(180deg, #141414 0%, #1a1a2e 100%)'
            : 'linear-gradient(180deg, #1e3a5f 0%, #16213e 100%)',
          boxShadow: '2px 0 12px rgba(0,0,0,0.3)',
        }}
      >
        {/* 로고 */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          cursor: 'pointer',
        }} onClick={() => navigate('/dashboard')}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #4f7fff, #7b5ea7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 'bold',
            color: '#fff',
            flexShrink: 0,
          }}>E</div>
          {!collapsed && (
            <span style={{ color: '#fff', fontSize: 17, fontWeight: 700, letterSpacing: 1 }}>
              EPI Web
            </span>
          )}
        </div>

        {/* 메뉴 */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['epi']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            background: 'transparent',
            border: 'none',
            marginTop: 8,
          }}
          theme="dark"
        />
      </Sider>

      <AntLayout>
        {/* 헤더 */}
        <Header style={{
          background: token.colorBgContainer,
          padding: '0 24px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(p => !p)}
              style={{ fontSize: 16, color: token.colorTextSecondary }}
            />
            <span style={{
              fontSize: 16,
              fontWeight: 600,
              color: token.colorText,
              letterSpacing: 0.3,
            }}>
              {currentLabel}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tooltip title={isDark ? '라이트 모드' : '다크 모드'}>
              <Button
                type="text"
                shape="circle"
                icon={isDark ? <SunOutlined style={{ color: '#faad14' }} /> : <MoonOutlined />}
                onClick={onThemeToggle}
                style={{ fontSize: 16 }}
              />
            </Tooltip>
          </div>
        </Header>

        {/* 컨텐츠 */}
        <Content style={{
          margin: 24,
          padding: 28,
          background: token.colorBgContainer,
          borderRadius: 12,
          boxShadow: isDark
            ? '0 2px 16px rgba(0,0,0,0.4)'
            : '0 2px 16px rgba(0,0,0,0.06)',
          minHeight: 'calc(100vh - 112px)',
          transition: 'background 0.3s',
        }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout
