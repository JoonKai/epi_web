import { Tabs } from 'antd'
import SourceChangeLogSourceTab from './SourceChangeLogSourceTab'
import SourceChangeLogSiH4Tab from './SourceChangeLogSiH4Tab'

export default function SourceChangeLogTab() {
  return (
    <Tabs
      defaultActiveKey="source"
      type="card"
      items={[
        { key: 'source', label: '소스 관리 대장', children: <SourceChangeLogSourceTab /> },
        { key: 'sih4', label: '가스 관리 대장', children: <SourceChangeLogSiH4Tab /> },
      ]}
    />
  )
}
