import { useMemo } from 'react'
import { Tabs } from 'antd'
import { CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import MocvdScheduler from './MocvdScheduler'
import PmWorkTimeSettings from './PmWorkTimeSettings'

export default function PmTabs() {
  const location = useLocation()
  const navigate = useNavigate()

  const activeTab = useMemo(() => {
    const tab = new URLSearchParams(location.search).get('tab')
    const allowed = ['scheduler', 'work-time']
    return allowed.includes(tab) ? tab : 'scheduler'
  }, [location.search])

  return (
    <Tabs
      className="source-tabs"
      activeKey={activeTab}
      destroyOnHidden
      onChange={(key) => navigate(`/epi/mocvd/scheduler?tab=${key}`)}
      tabBarStyle={{ borderBottom: '1px solid rgba(245,158,11,0.18)', marginBottom: 16, paddingBottom: 0, fontSize: 16 }}
      items={[
        { key: 'scheduler', label: <span><CalendarOutlined /> PM 스케줄러</span>, children: <MocvdScheduler /> },
        { key: 'work-time', label: <span><ClockCircleOutlined /> 작업 시간 설정</span>, children: <PmWorkTimeSettings /> },
      ]}
    />
  )
}
