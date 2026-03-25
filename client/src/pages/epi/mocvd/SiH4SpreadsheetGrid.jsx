import { useEffect, useMemo, useRef } from 'react'
import jspreadsheet from 'jspreadsheet-ce'
import jsuites from 'jsuites'
import 'jspreadsheet-ce/dist/jspreadsheet.css'
import 'jsuites/dist/jsuites.css'
import './SiH4SpreadsheetGrid.css'

const CALENDAR_OPTIONS = {
  format: 'YYYY-MM-DD',
  textDone: '확인',
  textReset: '초기화',
  textUpdate: '적용',
  months: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthsFull: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  weekdays: ['일', '월', '화', '수', '목', '금', '토'],
  startingDay: 0,
}

if (typeof jsuites?.setDictionary === 'function') {
  jsuites.setDictionary({
    Done: '확인',
    Reset: '초기화',
    Update: '적용',
    January: '1월',
    February: '2월',
    March: '3월',
    April: '4월',
    May: '5월',
    June: '6월',
    July: '7월',
    August: '8월',
    September: '9월',
    October: '10월',
    November: '11월',
    December: '12월',
    Sunday: '일',
    Monday: '월',
    Tuesday: '화',
    Wednesday: '수',
    Thursday: '목',
    Friday: '금',
    Saturday: '토',
  })
}

const COLUMNS = [
  { type: 'calendar', title: '장착 날짜', width: 120, options: CALENDAR_OPTIONS },
  { type: 'calendar', title: '탈착 날짜', width: 120, options: CALENDAR_OPTIONS },
  { type: 'dropdown', title: '캐비닛', width: 90, source: ['1', '2', '3', '4', '5'] },
  { type: 'dropdown', title: '가스명', width: 110, source: ['SiH4', 'Ar'] },
  { type: 'dropdown', title: 'A/B', width: 70, source: ['A', 'B'] },
  { type: 'text', title: 'Cylinder No.', width: 180 },
  { type: 'text', title: 'worker', width: 130 },
  { type: 'text', title: '특이사항', width: 280 },
]

const MENU_TITLE_MAP = {
  'Insert a new row before': '위에 행 추가',
  'Insert a new row after': '아래에 행 추가',
  'Delete selected rows': '선택 행 삭제',
  'Add comments': '메모 추가',
  'Copy...': '복사',
  'Paste...': '붙여넣기',
  'Save as...': 'CSV 저장',
  About: '정보',
}

function rowsToSheetData(rows) {
  return rows.map((row) => [
    row.install_date ?? '',
    row.removal_date ?? '',
    row.cabinet_no != null && row.cabinet_no !== '' ? String(row.cabinet_no) : '',
    row.gas_name ?? 'SiH4',
    row.slot ?? 'A',
    row.cylinder_no ?? '',
    row.worker_name ?? '',
    row.note ?? '',
  ])
}

function sheetDataToRows(sheetData, prevRows) {
  return sheetData.map((cells, index) => {
    const prev = prevRows[index] ?? {}
    return {
      ...prev,
      install_date: cells[0] ?? '',
      removal_date: cells[1] ?? '',
      cabinet_no: cells[2] ?? '',
      gas_name: cells[3] ?? 'SiH4',
      slot: cells[4] ?? 'A',
      cylinder_no: cells[5] ?? '',
      worker_name: cells[6] ?? '',
      note: cells[7] ?? '',
      _dirty: true,
    }
  })
}

function normalizeContextMenu(items, role) {
  if (!Array.isArray(items)) return items

  const allowedForCell = new Set([
    'Insert a new row before',
    'Insert a new row after',
    'Delete selected rows',
    'Copy...',
    'Paste...',
  ])

  return items
    .filter((item) => {
      if (!item) return false
      if (item.type === 'line' || item.type === 'divisor') return true
      if (role === 'cell' || role === 'row') return allowedForCell.has(item.title)
      return !['About', 'Save as...', 'Add comments'].includes(item.title)
    })
    .map((item) => ({
      ...item,
      title: MENU_TITLE_MAP[item.title] ?? item.title,
      shortcut: item.shortcut ? item.shortcut.replace('Ctrl + ', 'Ctrl+') : item.shortcut,
    }))
}

export default function SiH4SpreadsheetGrid({ rows, onRowsChange }) {
  const hostRef = useRef(null)
  const sheetRef = useRef(null)
  const syncingRef = useRef(false)
  const rowsRef = useRef(rows)
  const rowCount = useMemo(() => Math.max(rows.length + 18, 32), [rows.length])

  const placeContextMenu = (event) => {
    const menu = sheetRef.current?.contextMenu
    if (!menu || event?.clientX == null || event?.clientY == null) return

    requestAnimationFrame(() => {
      const menuWidth = menu.offsetWidth || 260
      const menuHeight = menu.offsetHeight || 220
      const left = Math.min(event.clientX, window.innerWidth - menuWidth - 12)
      const top = Math.min(event.clientY, window.innerHeight - menuHeight - 12)
      menu.style.position = 'fixed'
      menu.style.left = `${Math.max(12, left)}px`
      menu.style.top = `${Math.max(12, top)}px`
    })
  }

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  useEffect(() => {
    if (!hostRef.current || sheetRef.current) return

    const syncToParent = () => {
      if (!sheetRef.current || syncingRef.current) return
      const worksheet = sheetRef.current.worksheets?.[0]
      if (!worksheet) return
      const data = worksheet.getData(false, true)
      onRowsChange(sheetDataToRows(data, rowsRef.current))
    }

    sheetRef.current = jspreadsheet(hostRef.current, {
      toolbar: false,
      tabs: false,
      about: false,
      contextMenu: (instance, colIndex, rowIndex, event, items, role) => {
        placeContextMenu(event)
        return normalizeContextMenu(items, role)
      },
      worksheets: [
        {
          data: rowsToSheetData(rowsRef.current),
          columns: COLUMNS,
          minDimensions: [COLUMNS.length, rowCount],
          minSpareRows: 18,
          defaultRowHeight: 38,
          allowInsertColumn: false,
          allowManualInsertColumn: false,
          allowDeleteColumn: false,
          allowRenameColumn: false,
          columnDrag: false,
          columnSorting: false,
          filters: false,
          search: false,
          rowDrag: false,
          rowResize: false,
          onchange: syncToParent,
          oninsertrow: syncToParent,
          ondeleterow: syncToParent,
        },
      ],
    })

    return () => {
      if (hostRef.current) hostRef.current.innerHTML = ''
      sheetRef.current = null
    }
  }, [onRowsChange, rowCount])

  useEffect(() => {
    const worksheet = sheetRef.current?.worksheets?.[0]
    if (!worksheet) return

    const nextData = rowsToSheetData(rows)
    syncingRef.current = true
    worksheet.setData(nextData)
    syncingRef.current = false
  }, [rows])

  return (
    <div className="sih4-jspreadsheet-shell">
      <div ref={hostRef} />
    </div>
  )
}
