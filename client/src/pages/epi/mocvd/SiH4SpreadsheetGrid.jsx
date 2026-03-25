import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community'

ModuleRegistry.registerModules([AllCommunityModule])

const ROW_H    = 32
const HEADER_H = 40

// ── 다크 테마 (AG Grid v33+ 새 API) ─────────────────────────
const darkTheme = themeQuartz.withParams({
  backgroundColor:            '#1a1d28',
  headerBackgroundColor:      '#1a2744',
  oddRowBackgroundColor:      '#1e2235',
  rowHoverColor:              '#252c42',
  borderColor:                '#2a3050',
  foregroundColor:            '#c8d4f0',
  headerTextColor:            '#b8c4e0',
  selectedRowBackgroundColor: '#1e3058',
  rangeSelectionBorderColor:  '#3b82f6',
  fontSize:                   '13px',
  fontFamily:                 "'Malgun Gothic','Apple SD Gothic Neo',sans-serif",
  cellHorizontalBorderColor:  '#2a3050',
})

// ── 셀 렌더러 ────────────────────────────────────────────────
function GasRenderer({ value }) {
  return (
    <span style={{ fontWeight: 800, color: value === 'Ar' ? '#60a5fa' : '#fb923c' }}>
      {value ?? ''}
    </span>
  )
}

function SlotRenderer({ value }) {
  return (
    <span style={{ fontWeight: 800, color: value === 'A' ? '#fb923c' : '#22d3ee' }}>
      {value ?? ''}
    </span>
  )
}

function RowNumRenderer({ node, onDelete }) {
  const idx = node?.rowIndex ?? 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: '100%' }}>
      <span style={{ color: '#4a5580', fontSize: 11 }}>{idx + 1}</span>
      <span
        onClick={() => onDelete(idx)}
        style={{ color: '#4a5580', cursor: 'pointer', fontSize: 14, paddingBottom: 1 }}
        title="삭제"
      >×</span>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function SiH4SpreadsheetGrid({ rows, onRowsChange, onDelete }) {
  const containerRef = useRef(null)

  const [selCell,   setSelCell]   = useState(null)   // { rowIndex, colId }
  const [handlePos, setHandlePos] = useState(null)   // { x, y } px (container 기준)
  const [dragging,  setDragging]  = useState(false)
  const [dragToRow, setDragToRow] = useState(null)

  // ── 컬럼 정의 ───────────────────────────────────────────────
  const columnDefs = useMemo(() => [
    {
      colId: '__no', headerName: '', width: 54, pinned: 'left',
      suppressNavigable: true, editable: false, sortable: false,
      cellRenderer: (p) => <RowNumRenderer node={p.node} onDelete={onDelete} />,
    },
    { field: 'install_date',  headerName: '장착 날짜',    width: 120, editable: true },
    { field: 'removal_date',  headerName: '탈착 날짜',    width: 120, editable: true },
    {
      field: 'cabinet_no', headerName: '캐비닛', width: 90, editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: [1, 2, 3, 4, 5] },
    },
    {
      field: 'gas_name', headerName: '가스명', width: 100, editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['Ar', 'SiH4'] },
      cellRenderer: GasRenderer,
    },
    {
      field: 'slot', headerName: 'A/B', width: 70, editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['A', 'B'] },
      cellRenderer: SlotRenderer,
    },
    { field: 'cylinder_no', headerName: 'Cylinder No.', width: 160, editable: true },
    { field: 'worker_name', headerName: 'worker',       width: 120, editable: true },
    { field: 'note',        headerName: '특이사항',      flex: 1,    editable: true },
  ], [onDelete])

  // ── 셀 포커스 → 핸들 위치 ───────────────────────────────────
  const onCellFocused = useCallback((params) => {
    if (params.rowIndex == null || !params.column) { setHandlePos(null); return }
    const colId = params.column.getColId()
    if (colId === '__no') { setHandlePos(null); return }

    setSelCell({ rowIndex: params.rowIndex, colId })

    requestAnimationFrame(() => {
      const cell = containerRef.current?.querySelector(
        `[row-index="${params.rowIndex}"] [col-id="${colId}"]`
      )
      if (!cell || !containerRef.current) return
      const cr  = containerRef.current.getBoundingClientRect()
      const rct = cell.getBoundingClientRect()
      setHandlePos({
        x: Math.round(rct.right  - cr.left - 5),
        y: Math.round(rct.bottom - cr.top  - 5),
      })
    })
  }, [])

  // ── 셀 값 변경 ───────────────────────────────────────────────
  const onCellValueChanged = useCallback((params) => {
    const idx  = params.node?.rowIndex ?? params.rowIndex
    const next = rows.map((r, i) =>
      i === idx ? { ...r, [params.column.getColId()]: params.newValue } : r
    )
    onRowsChange(next)
  }, [rows, onRowsChange])

  // ── 드래그 채우기 ────────────────────────────────────────────
  const onHandleMouseDown = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
    setDragging(true)
    setDragToRow(selCell?.rowIndex ?? 0)
  }, [selCell])

  const onMouseMove = useCallback((e) => {
    if (!dragging || !containerRef.current) return
    const cr   = containerRef.current.getBoundingClientRect()
    const relY = e.clientY - cr.top - HEADER_H
    const idx  = Math.max(0, Math.min(rows.length - 1, Math.floor(relY / ROW_H)))
    setDragToRow(idx)
  }, [dragging, rows.length])

  const onMouseUp = useCallback(() => {
    if (!dragging) return
    if (dragToRow !== null && selCell && dragToRow > selCell.rowIndex) {
      const { rowIndex, colId } = selCell
      const srcVal = rows[rowIndex]?.[colId]
      const next   = rows.map((r, i) =>
        i > rowIndex && i <= dragToRow ? { ...r, [colId]: srcVal } : r
      )
      onRowsChange(next)
    }
    setDragging(false)
    setDragToRow(null)
  }, [dragging, dragToRow, selCell, rows, onRowsChange])

  useEffect(() => {
    if (!dragging) return
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }
  }, [dragging, onMouseMove, onMouseUp])

  // ── 드래그 채우기 하이라이트 ─────────────────────────────────
  const fillPreview = dragging && selCell && dragToRow !== null && dragToRow > selCell.rowIndex
    ? { top: HEADER_H + (selCell.rowIndex + 1) * ROW_H, height: (dragToRow - selCell.rowIndex) * ROW_H }
    : null

  const gridHeight = rows.length * ROW_H + HEADER_H + 2

  return (
    <div ref={containerRef} style={{ position: 'relative', height: gridHeight, minHeight: 120 }}>
      <AgGridReact
        theme={darkTheme}
        rowData={rows}
        columnDefs={columnDefs}
        rowHeight={ROW_H}
        headerHeight={HEADER_H}
        domLayout="normal"
        style={{ height: '100%', width: '100%' }}
        onCellFocused={onCellFocused}
        onCellValueChanged={onCellValueChanged}
        stopEditingWhenCellsLoseFocus
        enterNavigatesVertically
        enterNavigatesVerticallyAfterEdit
        suppressMovableColumns
        suppressRowClickSelection
      />

      {/* 채우기 핸들 */}
      {handlePos && !dragging && (
        <div
          onMouseDown={onHandleMouseDown}
          style={{
            position: 'absolute', left: handlePos.x, top: handlePos.y,
            width: 8, height: 8,
            background: '#3b82f6', border: '1.5px solid #fff',
            cursor: 'crosshair', zIndex: 20, borderRadius: 1,
          }}
        />
      )}

      {/* 채우기 하이라이트 */}
      {fillPreview && (
        <div style={{
          position: 'absolute', left: 54, right: 0,
          top: fillPreview.top, height: fillPreview.height,
          background: 'rgba(59,130,246,0.12)',
          border: '1px dashed #3b82f6',
          pointerEvents: 'none', zIndex: 10,
        }} />
      )}
    </div>
  )
}
