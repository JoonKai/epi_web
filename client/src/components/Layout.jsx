import { useMemo, useState } from 'react'
import { Layout as AntLayout, Menu, Button, Badge, Avatar, Dropdown, Tooltip } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ApartmentOutlined,
  ApiOutlined,
  BarChartOutlined,
  BellOutlined,
  BuildOutlined,
  ControlOutlined,
  DashboardOutlined,
  HeatMapOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  NodeIndexOutlined,
  RocketOutlined,
  SettingOutlined,
  TableOutlined,
  ToolOutlined,
  UserOutlined,
  BulbOutlined,
  MoonOutlined,
} from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

const { Header, Sider, Content } = AntLayout

function buildMenuItems(isAdmin) {
  const items = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '대시보드' },
    {
      key: 'equipment',
      icon: <ToolOutlined />,
      label: '설비',
      children: [
        {
          key: 'epi-mocvd',
          icon: <ControlOutlined />,
          label: 'MOCVD',
          children: [{ key: '/epi/mocvd/source', icon: <NodeIndexOutlined />, label: '소스' }],
        },
        { key: '/epi/measurement', icon: <ApartmentOutlined />, label: '측정설비' },
      ],
    },
    {
      key: 'process',
      icon: <ApiOutlined />,
      label: '공정',
      children: [{ key: 'process-ready', label: '추가 예정', disabled: true }],
    },
    {
      key: 'manufacturing',
      icon: <BuildOutlined />,
      label: '제조',
      children: [{ key: 'manufacturing-ready', label: '추가 예정', disabled: true }],
    },
    {
      key: 'analysis',
      icon: <BarChartOutlined />,
      label: '분석',
      children: [{ key: '/wafermap', icon: <HeatMapOutlined />, label: '웨이퍼 맵' }],
    },
    { key: '/epi/simulator', icon: <RocketOutlined />, label: '시뮬레이터' },
    { key: '/grid', icon: <TableOutlined />, label: '데이터 조회' },
  ]

  if (isAdmin) {
    items.push({ key: '/admin', icon: <SettingOutlined />, label: '관리자 설정' })
  }

  return items
}

function findPath(items, pathname, trail = []) {
  for (const item of items) {
    const nextTrail = [...trail, item.label]
    if (item.key === pathname) return nextTrail
    if (item.children) {
      const found = findPath(item.children, pathname, nextTrail)
      if (found) return found
    }
  }
  return null
}

// 각 경로별 accent 색
const PAGE_COLOR = {
  '/dashboard': '#6366f1',
  '/epi/mocvd/source': '#14b8a6',
  '/epi/measurement': '#3b82f6',
  '/epi/simulator': '#f59e0b',
  '/wafermap': '#ec4899',
  '/grid': '#22c55e',
  '/admin': '#f43f5e',
}

function Layout({ children, isDark, onThemeToggle }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const isAdmin = user?.role === 'admin'
  const menuItems = useMemo(() => buildMenuItems(isAdmin), [isAdmin])
  const breadcrumbs = findPath(menuItems, location.pathname) ?? ['EPI']
  const title = breadcrumbs[breadcrumbs.length - 1]
  const pageColor = PAGE_COLOR[location.pathname] ?? '#6366f1'

  const userMenu = {
    items: [{ key: 'logout', icon: <LogoutOutlined />, label: '로그아웃', danger: true }],
    onClick: ({ key }) => {
      if (key === 'logout') logout()
    },
  }

  return (
    <AntLayout
      style={{
        minHeight: '100vh',
        background: 'var(--nowa-bg)',
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <Sider
        width={240}
        collapsedWidth={72}
        collapsed={collapsed}
        trigger={null}
        style={{
          background: 'var(--nowa-sider-bg)',
          borderRight: '1px solid var(--nowa-border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div
          onClick={() => navigate('/dashboard')}
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: collapsed ? '0 20px' : '0 20px',
            borderBottom: '1px solid var(--nowa-border)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 900,
              color: '#fff',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            }}
          >
            E
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: 'var(--nowa-text)', fontSize: 17, fontWeight: 800, letterSpacing: -0.5, whiteSpace: 'nowrap' }}>
                EPI Web
              </div>
              <div style={{ color: 'var(--nowa-text-muted)', fontSize: 11, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                운영 시스템
              </div>
            </div>
          )}
        </div>

        {/* Menu group label */}
        {!collapsed && (
          <div style={{ padding: '16px 16px 4px', color: 'var(--nowa-text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase' }}>
            메인 메뉴
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Menu
            className="console-menu"
            mode="inline"
            theme={isDark ? 'dark' : 'light'}
            selectedKeys={[location.pathname]}
            defaultOpenKeys={['equipment', 'epi-mocvd', 'analysis']}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ background: 'transparent', border: 'none' }}
          />
        </div>

      </Sider>

      {/* ── Main area ───────────────────────────────────────────── */}
      <AntLayout
        style={{
          marginLeft: collapsed ? 72 : 240,
          transition: 'margin-left 0.2s ease',
          background: 'var(--nowa-bg)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <Header
          style={{
            height: 64,
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--nowa-header-bg)',
            borderBottom: `3px solid ${pageColor}`,
            backdropFilter: 'blur(12px)',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            flexShrink: 0,
          }}
        >
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((prev) => !prev)}
              style={{
                color: 'var(--nowa-text-muted)',
                border: '1px solid var(--nowa-border)',
                background: 'var(--nowa-button-bg)',
                borderRadius: 10,
                width: 38,
                height: 38,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--nowa-text-muted)', fontSize: 13 }}>
              {breadcrumbs.slice(0, -1).map((crumb, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{crumb}</span>
                  <span style={{ opacity: 0.4 }}>/</span>
                </span>
              ))}
              <span style={{ color: 'var(--nowa-text)', fontWeight: 600 }}>{title}</span>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Theme toggle */}
            <Tooltip title={isDark ? '라이트 모드' : '다크 모드'}>
              <Button
                type="text"
                icon={isDark ? <BulbOutlined /> : <MoonOutlined />}
                onClick={onThemeToggle}
                style={{
                  color: 'var(--nowa-text-muted)',
                  border: '1px solid var(--nowa-border)',
                  background: 'var(--nowa-button-bg)',
                  borderRadius: 10,
                  width: 38,
                  height: 38,
                }}
              />
            </Tooltip>

            {/* Bell */}
            <Tooltip title="알림">
              <Badge dot color="var(--nowa-primary)" offset={[-4, 4]}>
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  style={{
                    color: 'var(--nowa-text-muted)',
                    border: '1px solid var(--nowa-border)',
                    background: 'var(--nowa-button-bg)',
                    borderRadius: 10,
                    width: 38,
                    height: 38,
                  }}
                />
              </Badge>
            </Tooltip>

            {/* Divider */}
            <div style={{ width: 1, height: 24, background: 'var(--nowa-border)', margin: '0 4px' }} />

            {/* User dropdown */}
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 12px 6px 6px',
                  borderRadius: 999,
                  border: '1px solid var(--nowa-border)',
                  background: 'var(--nowa-button-bg)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Avatar
                  size={30}
                  icon={<UserOutlined />}
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', flexShrink: 0 }}
                />
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ color: 'var(--nowa-text)', fontSize: 13, fontWeight: 600 }}>{user?.username}</div>
                  <div style={{ color: 'var(--nowa-text-muted)', fontSize: 11 }}>{isAdmin ? '관리자' : '사용자'}</div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* ── Content ───────────────────────────────────────────── */}
        <Content
          style={{
            flex: 1,
            padding: 24,
            background: 'var(--nowa-bg)',
            minHeight: 0,
          }}
        >
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout
