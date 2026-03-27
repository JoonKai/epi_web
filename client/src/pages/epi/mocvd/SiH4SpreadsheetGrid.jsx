import { useEffect, useMemo, useRef } from 'react'
import jspreadsheet from 'jspreadsheet-ce'
import jsuites from 'jsuites'
import 'jspreadsheet-ce/dist/jspreadsheet.css'
import 'jsuites/dist/jsuites.css'
import './SiH4SpreadsheetGrid.css'

const CALENDAR_OPTIONS = {
  format: 'YYYY-MM-DD',
  position: true,
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
  { type: 'dropdown', title: '가스 종류', width: 90, source: ['SiH4', 'Ar'] },
  { type: 'dropdown', title: '캐비닛', width: 140, source: [
    { id: '1', name: '1번' },
    { id: '2', name: '2번' },
    { id: '3', name: '3번' },
    { id: '4', name: '4번' },
    { id: '5', name: '5번' },
  ]},
  { type: 'dropdown', title: 'A/B', width: 70, source: ['A', 'B'] },
  { type: 'text', title: '실린더 No.', width: 180 },
  { type: 'text', title: '작업자', width: 130 },
  { type: 'text', title: '특이사항', width: 320 },
]

const MENU_TITLE_MAP = {
  'Insert a new row before': '위에 행 추가',
  'Insert a new row after': '아래에 행 추가',
  'Delete selected rows': '선택 행 삭제',
  'Add comments': '메모 추가',
  'Edit comments': '메모 수정',
  'Clear comments': '메모 제거',
  'Copy...': '복사',
  'Paste...': '붙여넣기',
  'Save as...': 'CSV 저장',
  About: '정보',
}

const COLUMN_WIDTHS_STORAGE_KEY = 'mocvd:sih4:grid-column-widths'

function loadStoredColumnWidths() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function saveColumnWidths(widths) {
  if (typeof window === 'undefined' || !Array.isArray(widths)) return

  try {
    window.localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(widths))
  } catch {
    // Ignore localStorage write failures.
  }
}

function getColumnConfigs() {
  const storedWidths = loadStoredColumnWidths()

  return COLUMNS.map((column, index) => {
    const storedWidth = storedWidths?.[index]
    return storedWidth
      ? { ...column, width: storedWidth }
      : { ...column }
  })
}

function applyStoredColumnWidths(worksheet) {
  const storedWidths = loadStoredColumnWidths()
  if (!worksheet || !Array.isArray(storedWidths)) return

  for (let index = 0; index < storedWidths.length; index++) {
    const width = Number.parseInt(storedWidths[index], 10)
    if (width > 0) {
      worksheet.setWidth?.(index, width)
    }
  }
}

function rowsToSheetData(rows) {
  return rows.map((row) => [
    row.install_date ?? '',
    row.removal_date ?? '',
    row.gas_name ?? '',
    row.cabinet_no != null && row.cabinet_no !== '' ? String(row.cabinet_no) : '',
    row.slot ?? '',
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
      gas_name: cells[2] ?? '',
      cabinet_no: cells[3] ?? '',
      slot: cells[4] ?? '',
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
    'Add comments',
    'Edit comments',
    'Clear comments',
    'Copy...',
    'Paste...',
  ])

  return items
    .filter((item) => {
      if (!item) return false
      if (item.type === 'line' || item.type === 'divisor') return true
      if (role === 'cell' || role === 'row') return allowedForCell.has(item.title)
      return !['About', 'Save as...'].includes(item.title)
    })
    .map((item) => ({
      ...item,
      title: MENU_TITLE_MAP[item.title] ?? item.title,
      shortcut: item.shortcut ? item.shortcut.replace('Ctrl + ', 'Ctrl+') : item.shortcut,
    }))
}

const SEL_COLOR = 'rgba(96,165,250,0.92)'

function focusClipboardTextarea(target) {
  const worksheet = target?.records ? target : target?.worksheets?.[0]
  const textarea = worksheet?.textarea
  if (textarea instanceof HTMLTextAreaElement) {
    textarea.removeAttribute('aria-hidden')
    textarea.focus({ preventScroll: true })
  }
}

function isUserEditorTarget(target) {
  if (!(target instanceof HTMLElement)) return false
  if (target.classList.contains('jss_textarea')) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function getClipboardCellText(worksheet, x, y, data) {
  const column = COLUMNS[x]
  const rawValue = data?.[y]?.[x] ?? ''

  if (column?.type === 'dropdown') {
    const cellElement = worksheet?.records?.[y]?.[x]?.element
    const displayValue = cellElement?.textContent?.trim()
    return displayValue || rawValue
  }

  return rawValue
}

function getSelectionAsTsv(worksheet) {
  const selection = worksheet?.getSelection?.()
  if (!selection) return ''

  const [x1, y1, x2, y2] = selection
  const minC = Math.min(x1, x2)
  const maxC = Math.max(x1, x2)
  const minR = Math.min(y1, y2)
  const maxR = Math.max(y1, y2)
  const data = worksheet.getData?.() ?? []
  const rows = []

  for (let y = minR; y <= maxR; y++) {
    const cells = []
    for (let x = minC; x <= maxC; x++) {
      cells.push(getClipboardCellText(worksheet, x, y, data))
    }
    rows.push(cells.join('\t'))
  }

  return rows
    .join('\n')
}

function parseClipboardMatrix(text) {
  if (!text) return []
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((row) => row.split('\t'))
}

function applyClipboardMatrix(worksheet, startX, startY, text) {
  const matrix = parseClipboardMatrix(text)
  for (let rowOffset = 0; rowOffset < matrix.length; rowOffset++) {
    const row = matrix[rowOffset]
    for (let colOffset = 0; colOffset < row.length; colOffset++) {
      worksheet.setValueFromCoords(startX + colOffset, startY + rowOffset, row[colOffset], true)
    }
  }
  return matrix
}

function isScrollableElement(element) {
  if (!(element instanceof HTMLElement)) return false
  const style = window.getComputedStyle(element)
  const overflowY = style.overflowY
  const overflowX = style.overflowX
  const canScrollY = ['auto', 'scroll', 'overlay'].includes(overflowY) && element.scrollHeight > element.clientHeight
  const canScrollX = ['auto', 'scroll', 'overlay'].includes(overflowX) && element.scrollWidth > element.clientWidth
  return canScrollY || canScrollX
}

function captureScrollSnapshot(host, worksheet) {
  const containers = []
  const seen = new Set()

  const pushContainer = (target) => {
    if (!target || seen.has(target)) return
    seen.add(target)
    containers.push(target)
  }

  if (worksheet?.content) pushContainer(worksheet.content)

  let current = host?.parentElement ?? null
  while (current) {
    if (isScrollableElement(current)) pushContainer(current)
    current = current.parentElement
  }

  if (document.scrollingElement) pushContainer(document.scrollingElement)

  return containers.map((target) => ({
    target,
    top: target.scrollTop,
    left: target.scrollLeft,
  }))
}

function restoreScrollSnapshot(snapshot) {
  if (!Array.isArray(snapshot) || snapshot.length === 0) return
  for (const item of snapshot) {
    item.target.scrollTop = item.top
    item.target.scrollLeft = item.left
  }
}

function isSameSheetMatrix(left, right) {
  if (left === right) return true
  if (!Array.isArray(left) || !Array.isArray(right)) return false
  if (left.length !== right.length) return false

  for (let rowIndex = 0; rowIndex < left.length; rowIndex++) {
    const leftRow = left[rowIndex] ?? []
    const rightRow = right[rowIndex] ?? []
    if (leftRow.length !== rightRow.length) return false

    for (let colIndex = 0; colIndex < leftRow.length; colIndex++) {
      if ((leftRow[colIndex] ?? '') !== (rightRow[colIndex] ?? '')) {
        return false
      }
    }
  }

  return true
}

function applySelectionBorder(worksheet, px, py, ux, uy) {
  if (!worksheet?.records) return
  const minC = Math.min(px, ux), maxC = Math.max(px, ux)
  const minR = Math.min(py, uy), maxR = Math.max(py, uy)

  for (let r = 0; r < worksheet.records.length; r++) {
    for (let c = 0; c < COLUMNS.length; c++) {
      const el = worksheet.records[r]?.[c]?.element
      if (!el) continue
      const inSel = r >= minR && r <= maxR && c >= minC && c <= maxC
      if (!inSel) { el.style.boxShadow = ''; continue }
      const t = r === minR, b = r === maxR, l = c === minC, ri = c === maxC
      const shadows = []
      if (t)  shadows.push(`inset 0 2px 0 ${SEL_COLOR}`)
      if (b)  shadows.push(`inset 0 -2px 0 ${SEL_COLOR}`)
      if (l)  shadows.push(`inset 2px 0 0 ${SEL_COLOR}`)
      if (ri) shadows.push(`inset -2px 0 0 ${SEL_COLOR}`)
      el.style.boxShadow = shadows.join(', ')
    }
  }

  // 열 헤더 — DOM 직접 쿼리, box-shadow inset으로 적용 (border-collapse 우회)
  // headerCells[0]은 row-number 코너 셀, 데이터 컬럼은 [1]부터
  const headerRow = worksheet.table?.querySelector('thead tr')
  if (headerRow) {
    const headerCells = headerRow.querySelectorAll('td')
    for (let i = 0; i < headerCells.length; i++) {
      const colIdx = i - 1
      headerCells[i].style.boxShadow = (colIdx >= minC && colIdx <= maxC)
        ? `inset 0 2px 0 ${SEL_COLOR}`
        : ''
    }
  }
}

function decorateHeaderFilters(worksheet) {
  worksheet?.filter?.classList?.add('sih4-hidden-filter-row')
}

export default function SiH4SpreadsheetGrid({ rows, onRowsChange, registerCommitHandler }) {
  const hostRef = useRef(null)
  const sheetRef = useRef(null)
  const syncingRef = useRef(false)
  const isPastingRef = useRef(false)
  const clipboardTextRef = useRef('')
  const scrollSnapshotRef = useRef(null)
  const selectionSnapshotRef = useRef(null)
  const rowsRef = useRef(rows)
  const columnConfigs = useMemo(() => getColumnConfigs(), [])
  const rowCount = useMemo(() => Math.max(rows.length + 18, 32), [rows.length])

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  useEffect(() => {
    if (!registerCommitHandler) return undefined

    const commit = () => {
      const worksheet = sheetRef.current?.worksheets?.[0]
      if (!worksheet) return rowsRef.current

      try {
        const activeElement = document.activeElement
        const isWorksheetEditor =
          activeElement instanceof HTMLElement &&
          (activeElement.closest('.jss_editor') || activeElement.classList.contains('jss_textarea'))

        if (isWorksheetEditor) {
          worksheet.closeEditor?.()
        }
      } catch {
        // Ignore closeEditor failures when there is no active jspreadsheet editor.
      }

      scrollSnapshotRef.current = captureScrollSnapshot(hostRef.current, worksheet)
      selectionSnapshotRef.current = worksheet.getSelection?.() ?? null

      const nextRows = sheetDataToRows(worksheet.getData?.() ?? [], rowsRef.current)
      onRowsChange(nextRows)
      return nextRows
    }

    registerCommitHandler(commit)
    return () => registerCommitHandler(null)
  }, [onRowsChange, registerCommitHandler])

  useEffect(() => {
    if (!hostRef.current || sheetRef.current) return

    const syncToParent = () => {
      if (!sheetRef.current || syncingRef.current || isPastingRef.current) return
      const worksheet = sheetRef.current.worksheets?.[0]
      if (!worksheet) return
      scrollSnapshotRef.current = captureScrollSnapshot(hostRef.current, worksheet)
      selectionSnapshotRef.current = worksheet.getSelection?.() ?? null
      const data = worksheet.getData()
      onRowsChange(sheetDataToRows(data, rowsRef.current))
    }

    const persistColumnWidths = (worksheet) => {
      if (!worksheet?.options?.columns?.length) return
      saveColumnWidths(
        worksheet.options.columns.map((_, index) => Number.parseInt(worksheet.getWidth?.(index), 10) || null),
      )
    }

    let ctxMenu = null

    const pasteTextIntoSelection = async () => {
      const worksheet = sheetRef.current?.worksheets?.[0]
      const selection = worksheet?.getSelection?.()
      if (!worksheet || !selection) return

      let text = clipboardTextRef.current
      if (!text && typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        try {
          text = (await navigator.clipboard.readText()).trimEnd()
        } catch {
          // Ignore clipboard permission failures and fall back to internal buffer only.
        }
      }
      if (!text) return

      const [x, y] = selection
      isPastingRef.current = true
      applyClipboardMatrix(worksheet, x, y, text)
      isPastingRef.current = false
      syncToParent()
    }

    // jsuites sets position:fixed with getBoundingClientRect() coords on
    // .jcalendar-container (inner div), but if .jcalendar (outer wrapper) lives
    // inside a CSS transform ancestor the fixed coords are wrong.
    // Fix: move .jcalendar to document.body so position:fixed is viewport-relative.
    const calendarObs = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1 && node.classList?.contains('jcalendar')) {
            document.body.appendChild(node)
            node.addEventListener('mousedown', (e) => e.stopPropagation())
          }
        }
      }
    })
    calendarObs.observe(hostRef.current, { childList: true, subtree: true })

    const handleClipboardShortcuts = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      if (isUserEditorTarget(event.target)) return

      const key = event.key.toLowerCase()
      if (key === 'v') {
        event.preventDefault()
        void pasteTextIntoSelection()
        return
      }

      if (key !== 'c' && key !== 'x') return

      const worksheet = sheetRef.current?.worksheets?.[0]
      if (!worksheet?.getSelection?.()) return

      clipboardTextRef.current = getSelectionAsTsv(worksheet)
      event.preventDefault()
      worksheet.copy(key === 'x')
      focusClipboardTextarea(worksheet)
    }

    const handleCopyCapture = (event) => {
      if (isUserEditorTarget(event.target)) return

      const worksheet = sheetRef.current?.worksheets?.[0]
      const text = getSelectionAsTsv(worksheet)
      if (!text) return

      clipboardTextRef.current = text
      event.preventDefault()
      event.clipboardData?.setData('text/plain', text)
      focusClipboardTextarea(worksheet)
    }

    const handlePasteCapture = (event) => {
      if (isUserEditorTarget(event.target)) return

      const worksheet = sheetRef.current?.worksheets?.[0]
      const selection = worksheet?.getSelection?.()
      const text = (event.clipboardData?.getData('text/plain') ?? '').trimEnd()
      const fallbackText = clipboardTextRef.current
      const pastedText = text || fallbackText
      if (!selection || !pastedText) return

      const [x, y] = selection
      event.preventDefault()
      isPastingRef.current = true
      applyClipboardMatrix(worksheet, x, y, pastedText)
      isPastingRef.current = false
      syncToParent()
    }

    hostRef.current.addEventListener('keydown', handleClipboardShortcuts, true)
    hostRef.current.addEventListener('copy', handleCopyCapture, true)
    hostRef.current.addEventListener('paste', handlePasteCapture, true)

    sheetRef.current = jspreadsheet(hostRef.current, {
      toolbar: false,
      tabs: false,
      about: false,
      onbeforepaste: () => { isPastingRef.current = true },
      onpaste: () => {
        isPastingRef.current = false
        syncToParent()
      },
      onload: (spreadsheet) => {
        sheetRef.current = spreadsheet
        ctxMenu = spreadsheet?.contextMenu ?? null
        if (ctxMenu) document.body.appendChild(ctxMenu)
        const worksheet = spreadsheet?.worksheets?.[0]
        applyStoredColumnWidths(worksheet)
        decorateHeaderFilters(worksheet)
        focusClipboardTextarea(spreadsheet)
      },
      onresizecolumn: (worksheet) => {
        persistColumnWidths(worksheet)
      },
      onselection: (ws, px, py, ux, uy) => {
        applySelectionBorder(ws, px, py, ux, uy)
        // textarea에 포커스를 유지해야 Ctrl+V 시 paste 이벤트가 host div까지 버블업됨
        focusClipboardTextarea(ws)
      },
      contextMenu: (_instance, _colIndex, _rowIndex, _event, items, role) => {
        return normalizeContextMenu(items, role)
      },
      worksheets: [
        {
          data: rowsToSheetData(rowsRef.current),
          columns: columnConfigs,
          minDimensions: [COLUMNS.length, rowCount],
          minSpareRows: 18,
          defaultRowHeight: 38,
          allowInsertColumn: false,
          allowManualInsertColumn: false,
          allowDeleteColumn: false,
          allowRenameColumn: false,
          columnDrag: false,
          columnSorting: false,
          filters: true,
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
      calendarObs.disconnect()
      hostRef.current?.removeEventListener('keydown', handleClipboardShortcuts, true)
      hostRef.current?.removeEventListener('copy', handleCopyCapture, true)
      hostRef.current?.removeEventListener('paste', handlePasteCapture, true)
      document.querySelectorAll('body > .jcalendar').forEach((el) => el.remove())
      ctxMenu?.remove()
      ctxMenu = null
      if (hostRef.current) hostRef.current.innerHTML = ''
      sheetRef.current = null
    }
  }, [onRowsChange, rowCount])

  useEffect(() => {
    const worksheet = sheetRef.current?.worksheets?.[0]
    if (!worksheet) return

    const nextData = rowsToSheetData(rows)
    const currentData = worksheet.getData?.() ?? []
    if (isSameSheetMatrix(currentData, nextData)) {
      scrollSnapshotRef.current = null
      selectionSnapshotRef.current = null
      return
    }

    syncingRef.current = true
    worksheet.setData(nextData)
    syncingRef.current = false

    const snapshot = scrollSnapshotRef.current
    const selection = selectionSnapshotRef.current
    if (snapshot || selection) {
      requestAnimationFrame(() => {
        if (selection) {
          worksheet.updateSelectionFromCoords?.(selection[0], selection[1], selection[2], selection[3])
        }
        restoreScrollSnapshot(snapshot)
        selectionSnapshotRef.current = null
        scrollSnapshotRef.current = null
      })
    }
  }, [rows])

  return (
    <div className="sih4-jspreadsheet-shell">
      <div ref={hostRef} />
    </div>
  )
}
