import { useState } from 'react'
import { Layout as AntLayout, Menu, Button, Tooltip, theme, Avatar, Dropdown } from 'antd'
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
  NodeIndexOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  RocketOutlined,
  HeatMapOutlined,
} from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

const { Sider, Content, Header } = AntLayout

function buildMenuItems(isAdmin) {
  const items = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '대시보드' },
    {
      key: 'epi',
      icon: <ExperimentOutlined />,
      label: 'EPI',
      children: [
        {
          key: 'epi-mocvd',
          icon: <ControlOutlined />,
          label: 'MOCVD',
          children: [
            { key: '/epi/mocvd/source', icon: <NodeIndexOutlined />, label: '소스' },
          ],
        },
        { key: '/epi/measurement', icon: <ApartmentOutlined />, label: '측정설비' },
      ],
    },
    { key: '/epi/simulator', icon: <RocketOutlined />, label: '시뮬레이터' },
    { key: '/wafermap', icon: <HeatMapOutlined />, label: 'Wafer Map' },
    { key: '/grid', icon: <TableOutlined />, label: '데이터 조회/입력' },
  ]
  if (isAdmin) {
    items.push({ key: '/admin', icon: <SettingOutlined />, label: '관리자 설정' })
  }
  return items
}

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
  const { user, logout } = useAuth()

  const isAdmin = user?.role === 'admin'
  const menuItems = buildMenuItems(isAdmin)
  const currentLabel = findLabel(menuItems, location.pathname) ?? 'EPI Web'

  const userMenu = {
    items: [
      { key: 'logout', icon: <LogoutOutlined />, label: '로그아웃', danger: true },
    ],
    onClick: ({ key }) => { if (key === 'logout') logout() },
  }

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
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #4f7fff, #7b5ea7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 'bold', color: '#fff', flexShrink: 0,
          }}>E</div>
          {!collapsed && (
            <span style={{ color: '#fff', fontSize: 17, fontWeight: 700, letterSpacing: 1 }}>
              EPI Web
            </span>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['epi', 'epi-mocvd']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', border: 'none', marginTop: 8 }}
          theme="dark"
        />
      </Sider>

      <AntLayout>
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
            <span style={{ fontSize: 16, fontWeight: 600, color: token.colorText, letterSpacing: 0.3 }}>
              {currentLabel}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tooltip title={isDark ? '라이트 모드' : '다크 모드'}>
              <Button
                type="text" shape="circle"
                icon={isDark ? <SunOutlined style={{ color: '#faad14' }} /> : <MoonOutlined />}
                onClick={onThemeToggle}
                style={{ fontSize: 16 }}
              />
            </Tooltip>
            <Dropdown menu={userMenu} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}>
                <Avatar size="small" icon={<UserOutlined />} style={{ background: '#4f7fff' }} />
                {!collapsed && (
                  <span style={{ fontSize: 13, color: token.colorText }}>
                    {user?.username}
                    {isAdmin && <span style={{ color: '#ff4d4f', fontSize: 11, marginLeft: 4 }}>[관리자]</span>}
                  </span>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{
          margin: 24, padding: 28,
          background: token.colorBgContainer,
          borderRadius: 12,
          boxShadow: isDark ? '0 2px 16px rgba(0,0,0,0.4)' : '0 2px 16px rgba(0,0,0,0.06)',
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
