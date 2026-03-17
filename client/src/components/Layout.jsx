import { useMemo, useState } from 'react'
import { Layout as AntLayout, Menu, Button, Badge, Avatar, Dropdown, Tooltip } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ApartmentOutlined,
  ApiOutlined,
  AppstoreAddOutlined,
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  BuildOutlined,
  CalendarOutlined,
  ControlOutlined,
  DashboardOutlined,
  DollarOutlined,
  HeatMapOutlined,
  SwapOutlined,
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
          children: [
            { key: '/epi/mocvd/overview', icon: <DashboardOutlined />, label: '종합 현황판' },
            { key: '/epi/mocvd/management', icon: <ControlOutlined />, label: 'MOCVD 관리' },
            { key: '/epi/mocvd/source', icon: <NodeIndexOutlined />, label: '소스관리' },
            { key: '/epi/mocvd/pm-plan', icon: <CalendarOutlined />, label: 'PM주기 계획' },
            { key: '/epi/mocvd/work-log', icon: <BookOutlined />, label: '업무 일지' },
            { key: '/epi/mocvd/master-data', icon: <AppstoreAddOutlined />, label: '기준정보관리' },
          ],
        },
        { key: '/epi/measurement', icon: <ApartmentOutlined />, label: '측정장비' },
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
      children: [
        { key: '/wafermap', icon: <HeatMapOutlined />, label: '웨이퍼맵' },
        { key: '/run-comparison', icon: <SwapOutlined />, label: '런 비교' },
      ],
    },
    {
      key: 'cost',
      icon: <DollarOutlined />,
      label: '비용',
      children: [
        { key: '/cost/purchase-request', label: '구매요청' },
        { key: '/cost/repair-status', label: '수리현황' },
        { key: '/cost/master-data', label: '기준정보등록' },
      ],
    },
    { key: '/epi/simulator', icon: <RocketOutlined />, label: '시뮬레이터' },
    { key: '/epi/mocvd/personnel', icon: <UserOutlined />, label: '인원 관리' },
    { key: '/grid', icon: <TableOutlined />, label: '데이터 조회' },
  ]

  if (isAdmin) {
    items.push({ key: '/admin', icon: <SettingOutlined />, label: '관리자 설정' })
  }

  return items
}

function attachPopupClass(items) {
  return items.map((item) => {
    if (!item.children) return item
    return {
      ...item,
      popupClassName: 'console-menu-popup',
      children: attachPopupClass(item.children),
    }
  })
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

const PAGE_COLOR = {
  '/dashboard': '#6366f1',
  '/epi/mocvd/overview': '#22c55e',
  '/epi/mocvd/source': '#14b8a6',
  '/epi/mocvd/pm-plan': '#06b6d4',
  '/epi/mocvd/management': '#0ea5e9',
  '/epi/mocvd/personnel': '#f97316',
  '/epi/mocvd/work-log': '#a78bfa',
  '/epi/mocvd/master-data': '#8b5cf6',
  '/epi/measurement': '#3b82f6',
  '/epi/simulator': '#f59e0b',
  '/wafermap': '#ec4899',
  '/run-comparison': '#f43f5e',
  '/cost/purchase-request': '#f59e0b',
  '/cost/repair-status': '#ef4444',
  '/cost/master-data': '#8b5cf6',
  '/grid': '#22c55e',
  '/admin': '#f43f5e',
}

function Layout({ children, isDark, onThemeToggle }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const isDashboardPage = location.pathname === '/dashboard'

  const isAdmin = user?.role === 'admin'
  const menuItems = useMemo(() => attachPopupClass(buildMenuItems(isAdmin)), [isAdmin])
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
    <AntLayout style={{ minHeight: '100vh', background: 'var(--nowa-bg)', display: 'flex', flexDirection: 'row' }}>
      <Sider
        width={240}
        collapsedWidth={72}
        collapsed={collapsed}
        trigger={null}
        style={{
          background: isDark
            ? 'linear-gradient(180deg, #0a0e1c 0%, #0d1428 60%, #0a1020 100%)'
            : 'linear-gradient(180deg, #1e1f3b 0%, #1a1c38 60%, #161830 100%)',
          borderRight: '1px solid rgba(99,102,241,0.2)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          overflow: 'hidden',
          boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
        }}
      >
        <div
          onClick={() => navigate('/dashboard')}
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 20px',
            borderBottom: '1px solid rgba(99,102,241,0.18)',
            cursor: 'pointer',
            flexShrink: 0,
            background: 'linear-gradient(90deg, rgba(99,102,241,0.08) 0%, transparent 100%)',
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
              boxShadow: '0 4px 16px rgba(99,102,241,0.55)',
            }}
          >
            E
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: '#c7d2fe', fontSize: 17, fontWeight: 800, letterSpacing: -0.5, whiteSpace: 'nowrap', textShadow: '0 0 20px rgba(129,140,248,0.4)' }}>
                EPI
              </div>
              <div style={{ color: 'rgba(165,180,252,0.5)', fontSize: 11, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                운영 시스템
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <div style={{ padding: '16px 20px 4px', color: 'rgba(129,140,248,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
            Main Menu
          </div>
        )}

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingBottom: 24,
          }}
        >
          <Menu
            className="console-menu"
            mode="inline"
            theme={isDark ? 'dark' : 'light'}
            selectedKeys={[location.pathname]}
            defaultOpenKeys={[]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ background: 'transparent', border: 'none', paddingBottom: 88 }}
          />
        </div>
      </Sider>

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
        <Header
          style={{
            height: 64,
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isDark ? 'var(--nowa-header-bg)' : 'rgba(248,249,255,0.95)',
            borderBottom: `2px solid ${pageColor}`,
            boxShadow: isDark
              ? `0 2px 20px ${pageColor}28, 0 1px 0 rgba(255,255,255,0.04)`
              : `0 2px 16px ${pageColor}22, 0 1px 0 rgba(255,255,255,0.8)`,
            backdropFilter: 'blur(16px)',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            flexShrink: 0,
          }}
        >
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
              {breadcrumbs.slice(0, -1).map((crumb, index) => (
                <span key={index} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{crumb}</span>
                  <span style={{ opacity: 0.4 }}>/</span>
                </span>
              ))}
              <span style={{ color: 'var(--nowa-text)', fontWeight: 600 }}>{title}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

            <div style={{ width: 1, height: 24, background: 'var(--nowa-border)', margin: '0 4px' }} />

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
                <Avatar size={30} icon={<UserOutlined />} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', flexShrink: 0 }} />
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ color: 'var(--nowa-text)', fontSize: 13, fontWeight: 600 }}>{user?.username}</div>
                  <div style={{ color: 'var(--nowa-text-muted)', fontSize: 11 }}>{isAdmin ? '관리자' : '사용자'}</div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ flex: 1, padding: 24, background: 'var(--nowa-bg)', minHeight: 0 }}>
          <div className={isDashboardPage ? 'page-frame' : 'page-frame page-scale-compact'}>{children}</div>
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout
