import { useState } from 'react'
import { Layout as AntLayout, Menu, Button, Tooltip, theme, Avatar, Dropdown, Badge } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
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
  BellOutlined,
  ToolOutlined,
  ApiOutlined,
  BuildOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

const { Sider, Content, Header } = AntLayout

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
            { key: '/epi/mocvd/source', icon: <NodeIndexOutlined />, label: '소스' },
          ],
        },
        { key: '/epi/measurement', icon: <ApartmentOutlined />, label: '측정설비' },
      ],
    },
    {
      key: 'process',
      icon: <ApiOutlined />,
      label: '공정',
      children: [
        { key: 'process-stub', label: '준비 중', disabled: true },
      ],
    },
    {
      key: 'manufacturing',
      icon: <BuildOutlined />,
      label: '제조',
      children: [
        { key: 'mfg-stub', label: '준비 중', disabled: true },
      ],
    },
    {
      key: 'analysis',
      icon: <BarChartOutlined />,
      label: '분석',
      children: [
        { key: '/wafermap', icon: <HeatMapOutlined />, label: 'Wafer Map' },
      ],
    },
    { key: '/epi/simulator', icon: <RocketOutlined />, label: '시뮬레이터' },
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

function buildBreadcrumb(items, pathname) {
  const crumbs = []

  function walk(list) {
    for (const item of list) {
      if (item.key === pathname) {
        crumbs.push(item.label)
        return true
      }
      if (item.children) {
        const found = walk(item.children)
        if (found) {
          crumbs.unshift(item.label)
          return true
        }
      }
    }
    return false
  }

  walk(items)
  return crumbs
}

const SIDER_BG = '#0d1b2e'
const SIDER_BORDER = 'rgba(255,255,255,0.07)'

function Layout({ children, isDark, onThemeToggle }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = theme.useToken()
  const { user, logout } = useAuth()

  const isAdmin = user?.role === 'admin'
  const menuItems = buildMenuItems(isAdmin)
  const currentLabel = findLabel(menuItems, location.pathname) ?? 'EPI Web'
  const breadcrumbs = buildBreadcrumb(menuItems, location.pathname)

  const userMenu = {
    items: [
      { key: 'logout', icon: <LogoutOutlined />, label: '로그아웃', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'logout') logout()
    },
  }

  return (
    <AntLayout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        collapsedWidth={64}
        style={{
          background: SIDER_BG,
          borderRight: `1px solid ${SIDER_BORDER}`,
          boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div
          onClick={() => navigate('/dashboard')}
          style={{
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 12,
            padding: collapsed ? 0 : '0 20px',
            borderBottom: `1px solid ${SIDER_BORDER}`,
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'padding 0.2s',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #4f7fff 0%, #7b5ea7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 900,
              color: '#fff',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(79,127,255,0.4)',
            }}
          >
            E
          </div>
          {!collapsed && (
            <div>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, lineHeight: 1.2, letterSpacing: 0.5 }}>
                EPI Web
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1 }}>
                PROCESS SYSTEM
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <div
            style={{
              padding: '18px 20px 6px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.5,
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            NAVIGATION
          </div>
        )}

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['equipment', 'epi-mocvd', 'process', 'analysis']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          theme="dark"
          style={{
            background: 'transparent',
            border: 'none',
            '--menu-item-color': 'rgba(255,255,255,0.65)',
            '--menu-item-hover-color': '#fff',
          }}
        />

        <div style={{ flex: 1 }} />
      </Sider>

      <AntLayout style={{ background: token.colorBgLayout, overflow: 'hidden' }}>
        <Header
          style={{
            background: isDark ? 'rgba(10,22,40,0.95)' : token.colorBgContainer,
            backdropFilter: 'blur(8px)',
            padding: '0 24px',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : token.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 60,
            lineHeight: '60px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: isDark ? '0 2px 16px rgba(0,0,0,0.3)' : '0 1px 8px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((prev) => !prev)}
              style={{
                fontSize: 16,
                color: isDark ? 'rgba(255,255,255,0.6)' : token.colorTextSecondary,
                width: 36,
                height: 36,
              }}
            />
            <div>
              {breadcrumbs.length > 1 && (
                <div
                  style={{
                    fontSize: 11,
                    color: isDark ? 'rgba(255,255,255,0.3)' : token.colorTextQuaternary,
                    letterSpacing: 0.5,
                    lineHeight: 1,
                    marginBottom: 2,
                  }}
                >
                  YOU ARE HERE {'>'} {breadcrumbs.slice(0, -1).join(' > ')}
                </div>
              )}
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: isDark ? '#fff' : token.colorText,
                  lineHeight: 1.2,
                }}
              >
                {currentLabel}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tooltip title="알림">
              <Badge dot offset={[-4, 4]}>
                <Button
                  type="text"
                  shape="circle"
                  icon={<BellOutlined style={{ fontSize: 17, color: isDark ? 'rgba(255,255,255,0.55)' : token.colorTextSecondary }} />}
                  style={{ width: 38, height: 38 }}
                />
              </Badge>
            </Tooltip>

            <Tooltip title={isDark ? '라이트 모드' : '다크 모드'}>
              <Button
                type="text"
                shape="circle"
                icon={
                  isDark ? (
                    <SunOutlined style={{ fontSize: 16, color: '#faad14' }} />
                  ) : (
                    <MoonOutlined style={{ fontSize: 16, color: token.colorTextSecondary }} />
                  )
                }
                onClick={onThemeToggle}
                style={{ width: 38, height: 38 }}
              />
            </Tooltip>

            <div
              style={{
                width: 1,
                height: 28,
                margin: '0 8px',
                background: isDark ? 'rgba(255,255,255,0.12)' : token.colorBorderSecondary,
              }}
            />

            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  padding: '5px 10px',
                  borderRadius: 10,
                  transition: 'background 0.2s',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : token.colorFillAlter
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <Avatar
                  size={32}
                  icon={<UserOutlined />}
                  style={{
                    background: 'linear-gradient(135deg, #4f7fff 0%, #7b5ea7 100%)',
                    flexShrink: 0,
                  }}
                />
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#fff' : token.colorText }}>
                    {user?.username}
                  </div>
                  <div style={{ fontSize: 11, color: isAdmin ? '#ff6b6b' : (isDark ? 'rgba(255,255,255,0.4)' : token.colorTextTertiary) }}>
                    {isAdmin ? 'Administrator' : 'User'}
                  </div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content
          style={{
            margin: '20px 24px 24px',
            padding: 28,
            background: isDark ? 'rgba(15,32,64,0.6)' : token.colorBgContainer,
            borderRadius: 14,
            border: isDark ? '1px solid rgba(255,255,255,0.06)' : `1px solid ${token.colorBorderSecondary}`,
            boxShadow: isDark ? '0 4px 32px rgba(0,0,0,0.4)' : '0 2px 16px rgba(0,0,0,0.06)',
            minHeight: 'calc(100vh - 108px)',
            transition: 'background 0.3s, border-color 0.3s',
            backdropFilter: isDark ? 'blur(4px)' : 'none',
          }}
        >
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout
