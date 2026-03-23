import { useMemo } from 'react'
import { Tabs } from 'antd'
import { BarChartOutlined, BookOutlined, EditOutlined, HeatMapOutlined, TableOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import SourceChangeLogTab from './SourceChangeLogTab'
import SourceStatusBoard from './SourceStatusBoard'
import SourceMachineBoard from './SourceMachineBoard'
import SourceRemainingSheetTab from './SourceRemainingSheetTab'
import SourceTableSheetTab from './SourceTableSheetTab'

export default function SourceTabs() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeTab = useMemo(() => {
    const tab = new URLSearchParams(location.search).get('tab')
    if (tab === 'input') return 'remaining-sheet'
    const allowed = ['status-board', 'machine-board', 'remaining-sheet', 'table-sheet', 'change-log']
    return allowed.includes(tab) ? tab : 'status-board'
  }, [location.search])

  return (
    <Tabs
      activeKey={activeTab}
      onChange={(key) => navigate(`/epi/mocvd/source?tab=${key}`)}
      tabBarStyle={{ borderBottom: '1px solid rgba(245,158,11,0.18)', marginBottom: 20, paddingBottom: 0 }}
      items={[
        { key: 'status-board', label: <span><BarChartOutlined /> 소스교체 현황판</span>, children: <SourceStatusBoard /> },
        { key: 'machine-board', label: <span><HeatMapOutlined /> 설비별 소스현황</span>, children: <SourceMachineBoard /> },
        { key: 'remaining-sheet', label: <span><EditOutlined /> 잔량기입</span>, children: <SourceRemainingSheetTab /> },
        { key: 'table-sheet', label: <span><TableOutlined /> 소스 계산</span>, children: <SourceTableSheetTab /> },
        { key: 'change-log', label: <span><BookOutlined /> 소스교체 작업일지</span>, children: <SourceChangeLogTab /> },
      ]}
    />
  )
}
