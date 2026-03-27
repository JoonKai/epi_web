import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Card, Space, message } from 'antd'
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { authFetch } from '../../../context/AuthContext'
import SiH4GasCabinetLayout from './SiH4GasCabinetLayout'
import SiH4SpreadsheetGrid from './SiH4SpreadsheetGrid'

const EMPTY_ROW = () => ({
  id: null,
  install_date: '',
  removal_date: '',
  cabinet_no: '',
  gas_name: '',
  slot: '',
  cylinder_no: '',
  worker_name: '',
  note: '',
})

export default function SourceChangeLogSiH4Tab() {
  const [messageApi, contextHolder] = message.useMessage()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState([EMPTY_ROW()])
  const commitGridRef = useRef(null)
  const scrollWrapRef = useRef(null)
  const pendingScrollRef = useRef(null)

  const captureScroll = useCallback(() => {
    pendingScrollRef.current = {
      wrapTop: scrollWrapRef.current?.scrollTop ?? 0,
      wrapLeft: scrollWrapRef.current?.scrollLeft ?? 0,
      pageX: window.scrollX,
      pageY: window.scrollY,
    }
  }, [])

  const setRowsPreservingScroll = useCallback((updater) => {
    captureScroll()
    setRows(updater)
  }, [captureScroll])

  const isRowEmpty = useCallback((row) => {
    return ![
      row.install_date,
      row.removal_date,
      row.cabinet_no,
      row.gas_name,
      row.slot,
      row.cylinder_no,
      row.worker_name,
      row.note,
    ].some((value) => String(value ?? '').trim() !== '')
  }, [])

  const canPersistRow = useCallback((row) => {
    return !isRowEmpty(row)
  }, [isRowEmpty])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/mocvd/sih4-change-logs')
      const json = await res.json().catch(() => null)
      setRowsPreservingScroll(Array.isArray(json) && json.length > 0 ? json : [EMPTY_ROW()])
    } catch {
      setRowsPreservingScroll([EMPTY_ROW()])
    } finally {
      setLoading(false)
    }
  }, [setRowsPreservingScroll])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const snapshot = pendingScrollRef.current
    if (!snapshot) return

    requestAnimationFrame(() => {
      if (scrollWrapRef.current) {
        scrollWrapRef.current.scrollTop = snapshot.wrapTop
        scrollWrapRef.current.scrollLeft = snapshot.wrapLeft
      }
      window.scrollTo(snapshot.pageX, snapshot.pageY)
      pendingScrollRef.current = null
    })
  }, [rows])

  const handleRowsChange = useCallback((newRows) => {
    setRowsPreservingScroll(newRows)
  }, [setRowsPreservingScroll])

  const registerCommitHandler = useCallback((handler) => {
    commitGridRef.current = handler
  }, [])

  const saveAll = useCallback(async () => {
    if (saving) return

    const latestRows = commitGridRef.current?.() ?? rows
    const dirtyIndexes = latestRows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row._dirty)

    if (dirtyIndexes.length === 0) {
      messageApi.info('저장할 변경사항이 없습니다.')
      return
    }

    setSaving(true)
    let savedCount = 0
    let deletedCount = 0
    let skippedCount = 0

    try {
      const nextRows = [...latestRows]

      for (const { row, index } of [...dirtyIndexes].reverse()) {
        const emptyRow = isRowEmpty(row)
        const validRow = canPersistRow(row)

        if (row.id && emptyRow) {
          const res = await authFetch(`/api/mocvd/sih4-change-logs/${row.id}`, {
            method: 'DELETE',
          })
          if (!res.ok) {
            const json = await res.json().catch(() => ({}))
            throw new Error(json.detail || 'SiH4 작업 내역 삭제에 실패했습니다.')
          }

          nextRows.splice(index, 1)
          deletedCount += 1
          continue
        }

        if (!validRow) {
          skippedCount += 1
          continue
        }

        const url = row.id ? `/api/mocvd/sih4-change-logs/${row.id}` : '/api/mocvd/sih4-change-logs'
        const method = row.id ? 'PUT' : 'POST'
        const res = await authFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(json.detail || 'SiH4 작업 내역 저장에 실패했습니다.')
        }

        nextRows[index] = {
          ...nextRows[index],
          ...json,
          _dirty: false,
        }
        savedCount += 1
      }

      setRowsPreservingScroll(nextRows.length > 0 ? nextRows : [EMPTY_ROW()])

      if (savedCount > 0 || deletedCount > 0) {
        const parts = []
        if (savedCount > 0) parts.push(`${savedCount}건 저장`)
        if (deletedCount > 0) parts.push(`${deletedCount}건 삭제`)
        if (skippedCount > 0) parts.push(`${skippedCount}건 건너뜀`)
        messageApi.success(`전체 저장 완료 (${parts.join(', ')})`)
      } else if (skippedCount > 0) {
        messageApi.warning(`저장 가능한 행이 없습니다. (${skippedCount}건 건너뜀)`)
      } else {
        messageApi.info('변경사항이 정리되었습니다.')
      }
    } catch (error) {
      messageApi.error(error?.message || 'SiH4 작업 내역 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }, [canPersistRow, isRowEmpty, messageApi, rows, saving, setRowsPreservingScroll])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
      {contextHolder}
      <Card className="nowa-card" style={{ width: '100%' }} styles={{ body: { padding: 16 } }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            paddingBottom: 14,
            marginBottom: 14,
            borderBottom: '1px solid var(--nowa-border)',
          }}
        >
          <div style={{ color: 'var(--nowa-text)', fontSize: 18, fontWeight: 800 }}>가스 관리 대장</div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              새로고침
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={saveAll} loading={saving}>
              전체 저장
            </Button>
          </Space>
        </div>

        <div
          ref={scrollWrapRef}
          style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)', paddingRight: 8, position: 'relative' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 8, paddingBottom: 8 }}>
            <SiH4GasCabinetLayout />
            <SiH4SpreadsheetGrid
              rows={rows}
              onRowsChange={handleRowsChange}
              registerCommitHandler={registerCommitHandler}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}
