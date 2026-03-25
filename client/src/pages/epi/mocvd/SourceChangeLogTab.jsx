import { Tabs } from 'antd'
import SourceChangeLogSourceTab from './SourceChangeLogSourceTab'
import SourceChangeLogSiH4Tab from './SourceChangeLogSiH4Tab'

export default function SourceChangeLogTab() {
  return (
    <Tabs
      defaultActiveKey="source"
      type="card"
      items={[
        { key: 'source', label: '소스', children: <SourceChangeLogSourceTab /> },
        { key: 'sih4', label: 'SiH4', children: <SourceChangeLogSiH4Tab /> },
      ]}
    />
  )
}
