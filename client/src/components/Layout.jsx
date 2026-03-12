import { useMemo, useState } from 'react'
import { Layout as AntLayout, Menu, Button, Badge, Avatar, Dropdown } from 'antd'
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
    { key: '/grid', icon: <TableOutlined />, label: '데이터 조회/입력' },
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

function Layout({ children, isDark, onThemeToggle }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const isAdmin = user?.role === 'admin'
  const menuItems = useMemo(() => buildMenuItems(isAdmin), [isAdmin])
  const breadcrumbs = findPath(menuItems, location.pathname) ?? ['EPI']
  const title = breadcrumbs[breadcrumbs.length - 1]

  const userMenu = {
    items: [{ key: 'logout', icon: <LogoutOutlined />, label: '로그아웃', danger: true }],
    onClick: ({ key }) => {
      if (key === 'logout') logout()
    },
  }

  return (
    <AntLayout className="console-shell" style={{ minHeight: '100vh', padding: 12 }}>
      <Sider
        width={248}
        collapsedWidth={74}
        collapsed={collapsed}
        trigger={null}
        style={{
          background: 'var(--console-sider-bg)',
          border: '1px solid var(--console-shell-border)',
          borderRadius: 18,
          overflow: 'hidden',
          marginRight: 12,
          boxShadow: 'var(--console-shadow-strong)',
        }}
      >
        <div
          onClick={() => navigate('/dashboard')}
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: collapsed ? '0 16px' : '0 18px',
            borderBottom: '1px solid var(--console-shell-border)',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              background: 'linear-gradient(135deg, var(--console-brand-highlight), var(--console-accent) 55%, var(--console-brand-deep))',
              boxShadow: '0 10px 24px var(--console-brand-glow)',
            }}
          />
          {!collapsed && (
            <div>
              <div style={{ color: 'var(--console-text)', fontSize: 22, fontWeight: 800, letterSpacing: -0.8 }}>EPI</div>
              <div style={{ color: 'var(--console-text-muted)', fontSize: 11, letterSpacing: 1.2 }}>운영 시스템</div>
            </div>
          )}
        </div>

        {!collapsed && (
          <div style={{ padding: '14px 20px 8px', color: 'var(--console-text-muted)', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            메뉴
          </div>
        )}

        <Menu
          className="console-menu"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['equipment', 'epi-mocvd', 'process', 'analysis']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <AntLayout>
        <Header
          style={{
            height: 64,
            padding: '0 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: 18,
            border: '1px solid var(--console-shell-border)',
            background: 'var(--console-header-bg)',
            boxShadow: 'var(--console-shadow-medium)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Button className="console-button" type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed((prev) => !prev)} />
            <div>
              {breadcrumbs.length > 1 && <div style={{ fontSize: 11, color: 'var(--console-text-muted)', letterSpacing: 0.8 }}>{breadcrumbs.slice(0, -1).join(' > ')}</div>}
              <div style={{ fontSize: 20, color: 'var(--console-text)', fontWeight: 700, letterSpacing: -0.4 }}>{title}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge dot color="var(--console-accent)">
              <Button className="console-button" shape="circle" icon={<BellOutlined />} />
            </Badge>
            <Button className="console-button" onClick={onThemeToggle}>
              {isDark ? '라이트' : '다크'}
            </Button>
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid var(--console-shell-border)',
                  background: 'var(--console-button-bg)',
                  cursor: 'pointer',
                }}
              >
                <Avatar size={30} icon={<UserOutlined />} style={{ background: 'var(--console-accent-soft)', color: 'var(--console-accent)' }} />
                {!collapsed && (
                  <div style={{ lineHeight: 1.2 }}>
                    <div style={{ color: 'var(--console-text)', fontSize: 13, fontWeight: 600 }}>{user?.username}</div>
                    <div style={{ color: 'var(--console-text-muted)', fontSize: 11 }}>{isAdmin ? '관리자' : '사용자'}</div>
                  </div>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content
          style={{
            marginTop: 12,
            borderRadius: 20,
            border: '1px solid var(--console-shell-border)',
            background: 'var(--console-content-bg)',
            padding: 18,
            boxShadow: 'var(--console-shadow-medium)',
            minHeight: 'calc(100vh - 100px)',
          }}
        >
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout
