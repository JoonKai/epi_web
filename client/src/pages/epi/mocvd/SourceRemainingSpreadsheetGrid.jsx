import { useEffect, useMemo, useRef } from 'react'
import dayjs from 'dayjs'
import jspreadsheet from 'jspreadsheet-ce'
import jsuites from 'jsuites'
import 'jspreadsheet-ce/dist/jspreadsheet.css'
import 'jsuites/dist/jsuites.css'
import './SourceRemainingSpreadsheetGrid.css'
import { getGroupColor, getSourceColor } from './sourceColors'

const COLUMN_WIDTHS_STORAGE_KEY = 'mocvd:source-remaining-horizontal:grid-column-widths'

if (typeof jsuites?.setDictionary === 'function') {
  jsuites.setDictionary({
    Done: '확인',
    Reset: '초기화',
    Update: '적용',
  })
}

function toNumber(value, fallback = 0) {
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim()
    const next = Number(normalized)
    return Number.isFinite(next) ? next : fallback
  }

  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function formatDisplayNumber(value, fallback = 0) {
  return toNumber(value, fallback).toFixed(2)
}

function getStatusLabel(daysLeft, settings) {
  if (daysLeft == null) return '-'
  if (daysLeft <= Number(settings?.overdue_days ?? 0)) return '부족'
  if (daysLeft <= Number(settings?.urgent_days ?? 7)) return '임박'
  return '정상'
}

function clearStoredColumnWidths() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(COLUMN_WIDTHS_STORAGE_KEY)
  } catch {
    // Ignore localStorage failures.
  }
}

function debugLog(...args) {
  void args
}

function enforceFirstDataColumnWidth(worksheet) {
  const width = 72
  if (!worksheet) return

  worksheet.hideIndex?.()

  if (worksheet.table) {
    worksheet.table.style.tableLayout = 'fixed'
    worksheet.table.style.width = 'max-content'
  }

  if (worksheet.content) {
    worksheet.content.style.width = 'max-content'
  }

  if (worksheet.options?.columns?.[0]) {
    worksheet.options.columns[0].width = width
  }

  worksheet.setWidth?.(0, width)

  const columnElement = worksheet?.cols?.[0]?.colElement
  if (columnElement) {
    columnElement.style.width = `${width}px`
    columnElement.style.minWidth = `${width}px`
    columnElement.style.maxWidth = `${width}px`
  }

  const indexColumnElement = worksheet?.colgroupContainer?.children?.[0]
  if (indexColumnElement) {
    indexColumnElement.style.width = '0px'
    indexColumnElement.style.minWidth = '0px'
    indexColumnElement.style.maxWidth = '0px'
    indexColumnElement.style.display = 'none'
  }
}

function applyStickyRows(worksheet) {
  const table = worksheet?.table
  const shell = table?.closest('.remaining-style-jspreadsheet-shell')
  if (!table || !shell) return

  const headRows = Array.from(table.querySelectorAll('thead tr'))
  const bodyRows = Array.from(table.querySelectorAll('tbody tr'))
  const headerRow1Height = headRows[0]?.getBoundingClientRect().height ?? 0
  const headerRow2Height = headRows[1]?.getBoundingClientRect().height ?? 0
  const stickyRow1Height = bodyRows[0]?.getBoundingClientRect().height ?? 0

  shell.style.setProperty('--remaining-top-header-2', `${headerRow1Height}px`)
  shell.style.setProperty('--remaining-top-row-1', `${headerRow1Height + headerRow2Height}px`)
  shell.style.setProperty('--remaining-top-row-2', `${headerRow1Height + headerRow2Height + stickyRow1Height}px`)

  bodyRows.forEach((row) => row.classList.remove('remaining-sticky-row-1', 'remaining-sticky-row-2', 'remaining-today-row'))
  if (bodyRows[0]) bodyRows[0].classList.add('remaining-sticky-row-1')
  if (bodyRows[1]) bodyRows[1].classList.add('remaining-sticky-row-2')
  if (bodyRows[2]) bodyRows[2].classList.add('remaining-today-row')
}

function applyReadOnlyRows(worksheet) {
  if (!worksheet?.setReadOnly) return

  ;(worksheet.records ?? []).forEach((recordRow, rowIndex) => {
    recordRow?.forEach((record, columnIndex) => {
      if (!record?.element || columnIndex === 0) return
      const shouldReadOnly = rowIndex === 1 || rowIndex >= 3
      worksheet.setReadOnly(record.element, shouldReadOnly)
    })
  })
}

function applySourceAccentClasses(worksheet, rows, sourceNames) {
  if (!worksheet) return

  const table = worksheet.table
  table?.querySelectorAll('.remaining-machine-divider, .remaining-projection-normal, .remaining-projection-low, .remaining-projection-zero').forEach((cell) => {
    cell.classList.remove(
      'remaining-machine-divider',
      'remaining-projection-normal',
      'remaining-projection-low',
      'remaining-projection-zero',
    )
  })

  ;(rows ?? []).forEach((row, index) => {
    const columnIndex = index + 1
    const palette = getSourceColor(Math.max(0, sourceNames.indexOf(row.source_name)))
    const headerCell = worksheet.headers?.[columnIndex]
    if (headerCell) {
      headerCell.style.setProperty('color', palette.main, 'important')
    }
  })

  const topRowCells = worksheet?.table?.querySelectorAll('thead tr:first-child td') ?? []
  const seen = new Set()
  let machineIndex = 0
  ;(rows ?? []).forEach((row) => {
    if (seen.has(row.machine_no)) return
    seen.add(row.machine_no)
    const groupColor = getGroupColor(row.machine_group)
    const headerCell = topRowCells[machineIndex + 2]
    machineIndex += 1
    if (!headerCell) return

    const machineLabel = row.machine_label ?? `${row.machine_no}`
    if (groupColor && row.machine_group) {
      headerCell.innerHTML = `
        <div class="remaining-machine-header">
          <div class="remaining-machine-title">${machineLabel}</div>
          <div class="remaining-machine-group" style="color:${groupColor.text};background:${groupColor.bg};border-color:${groupColor.border}">
            ${row.machine_group}
          </div>
        </div>
      `
      headerCell.style.setProperty('background', '#172534', 'important')
      headerCell.style.setProperty('border-color', groupColor.border, 'important')
    } else {
      headerCell.innerHTML = `<div class="remaining-machine-header"><div class="remaining-machine-title">${machineLabel}</div></div>`
      headerCell.style.setProperty('background', '#172534', 'important')
    }
  })

  ;(rows ?? []).forEach((row, index) => {
    const columnIndex = index + 1
    const nextRow = rows[index + 1]
    const isMachineBoundary = !nextRow || nextRow.machine_no !== row.machine_no
    if (!isMachineBoundary) return

    worksheet.headers?.[columnIndex]?.classList.add('remaining-machine-divider')
    ;(worksheet.records ?? []).forEach((recordRow) => {
      recordRow?.[columnIndex]?.element?.classList.add('remaining-machine-divider')
    })
  })

  const bodyRows = Array.from(table?.querySelectorAll('tbody tr') ?? [])
  ;(rows ?? []).forEach((row, index) => {
    const columnIndex = index + 1
    const dailyUsage = toNumber(row.daily_usage)
    const remaining = toNumber(row.remaining)
    const thresholdAmount = toNumber(row.threshold_amount)

    bodyRows.forEach((_, bodyRowIndex) => {
      if (bodyRowIndex < 3) return
      const cell = worksheet.records?.[bodyRowIndex]?.[columnIndex]?.element
      if (!cell) return

      if (dailyUsage <= 0) {
        cell.classList.add('remaining-projection-normal')
        return
      }

      const forecastOffset = bodyRowIndex - 2
      const projected = Math.max(0, remaining - forecastOffset * dailyUsage)
      if (projected <= 0) {
        cell.classList.add('remaining-projection-zero')
      } else if (projected <= thresholdAmount) {
        cell.classList.add('remaining-projection-low')
      } else {
        cell.classList.add('remaining-projection-normal')
      }
    })
  })
}

function buildSheetModel(rows, forecastDays, statusSettings, pendingKeys, sourceNames) {
  const visibleRows = rows ?? []
  const orderedSourceNames = sourceNames?.length ? sourceNames : [...new Set(visibleRows.map((row) => row.source_name))]
  const columns = [{ type: 'text', title: '소스', width: 72, readOnly: true }]
  const nestedHeaders = []

  const grouped = []
  let currentMachineNo = null
  visibleRows.forEach((row) => {
    if (row.machine_no !== currentMachineNo) {
      currentMachineNo = row.machine_no
      grouped.push({
        machineNo: row.machine_no,
        machineLabel: row.machine_label,
        machineGroup: row.machine_group,
        cols: [],
      })
    }
    grouped[grouped.length - 1].cols.push(row)
  })

  nestedHeaders.push({ title: '구분', colspan: 1 })

  grouped.forEach((group) => {
    const orderedCols = orderedSourceNames
      .map((sourceName) => group.cols.find((row) => row.source_name === sourceName))
      .filter(Boolean)

    nestedHeaders.push({
      title: group.machineGroup ? `${group.machineLabel} · ${group.machineGroup}` : (group.machineLabel ?? `${group.machineNo}`),
      colspan: orderedCols.length,
    })

    orderedCols.forEach((row) => {
      columns.push({
        type: 'numeric',
        title: row.source_name ?? '',
        width: 82,
        mask: '0.00',
      })
    })
  })

  const dates = Array.from({ length: forecastDays + 1 }, (_, index) => dayjs().add(index, 'day'))
  const data = []

  data.push(['일사용량', ...visibleRows.map((row) => formatDisplayNumber(row.daily_usage))])
  data.push(['잔량', ...visibleRows.map((row) => formatDisplayNumber(row.remaining))])

  dates.forEach((date, index) => {
    const label = `${date.month() + 1}/${date.date()}`
    const rowData = [label]

    visibleRows.forEach((row) => {
      if (index === 0) {
        rowData.push(formatDisplayNumber(row.remaining))
        return
      }

      const dailyUsage = toNumber(row.daily_usage)
      const remaining = toNumber(row.remaining)
      const projected = dailyUsage > 0 ? Math.max(0, remaining - index * dailyUsage) : remaining
      rowData.push(formatDisplayNumber(projected))
    })

    data.push(rowData)
  })

  if (false) {
    data.push(['상태', ...visibleRows.map((row) => getStatusLabel(row.days_left, statusSettings))])
    data.push(['변경', ...visibleRows.map((row) => (pendingKeys.has(row.key) ? '수정' : ''))])
  }

  return {
    columns,
    nestedHeaders: nestedHeaders.length > 0 ? [nestedHeaders] : [],
    data,
  }
}

function applyWidths(columns) {
  return columns.map((column, index) => (index === 0 ? { ...column, width: 72 } : column))
}

function matrixEquals(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
  for (let rowIndex = 0; rowIndex < left.length; rowIndex++) {
    const leftRow = left[rowIndex] ?? []
    const rightRow = right[rowIndex] ?? []
    if (leftRow.length !== rightRow.length) return false
    for (let columnIndex = 0; columnIndex < leftRow.length; columnIndex++) {
      if ((leftRow[columnIndex] ?? '') !== (rightRow[columnIndex] ?? '')) return false
    }
  }
  return true
}

function patchMatrixCell(matrix, columnIndex, rowIndex, value) {
  const nextMatrix = matrix.map((row) => [...(row ?? [])])
  if (!nextMatrix[rowIndex]) return nextMatrix
  nextMatrix[rowIndex][columnIndex] = formatDisplayNumber(value)
  return nextMatrix
}

function patchMatrixChanges(matrix, changes) {
  let nextMatrix = matrix.map((row) => [...(row ?? [])])
  for (const change of changes ?? []) {
    const columnIndex = Number(change?.x)
    const rowIndex = Number(change?.y)
    if (!Number.isFinite(columnIndex) || !Number.isFinite(rowIndex) || columnIndex <= 0) continue
    if (rowIndex !== 0 && rowIndex !== 2) continue
    nextMatrix = patchMatrixCell(nextMatrix, columnIndex, rowIndex, change?.value)
  }
  return nextMatrix
}

function recomputeProjectionMatrix(matrix) {
  if (!Array.isArray(matrix) || matrix.length < 3) return matrix

  const nextMatrix = matrix.map((row) => [...(row ?? [])])
  const columnCount = nextMatrix.reduce((max, row) => Math.max(max, row?.length ?? 0), 0)

  for (let columnIndex = 1; columnIndex < columnCount; columnIndex++) {
    const dailyUsage = toNumber(nextMatrix[0]?.[columnIndex], 0)
    const todayValue = toNumber(nextMatrix[2]?.[columnIndex], toNumber(nextMatrix[1]?.[columnIndex], 0))

    if (nextMatrix[1]) nextMatrix[1][columnIndex] = formatDisplayNumber(todayValue)
    if (nextMatrix[2]) nextMatrix[2][columnIndex] = formatDisplayNumber(todayValue)

    for (let rowIndex = 3; rowIndex < nextMatrix.length; rowIndex++) {
      const forecastOffset = rowIndex - 2
      const projected = dailyUsage > 0 ? Math.max(0, todayValue - forecastOffset * dailyUsage) : todayValue
      nextMatrix[rowIndex][columnIndex] = formatDisplayNumber(projected)
    }
  }

  return nextMatrix
}

function matrixToRows(matrix, prevRows, forecastDays, statusSettings) {
  const dailyUsageRow = matrix[0] ?? []
  const todayRow = matrix[2] ?? []

  return prevRows.map((row, index) => {
    const columnIndex = index + 1
    const dailyUsage = toNumber(dailyUsageRow[columnIndex], toNumber(row.daily_usage))
    const remaining = toNumber(todayRow[columnIndex], toNumber(row.remaining))
    const thresholdAmount = toNumber(row.threshold_amount)
    const daysLeft = dailyUsage > 0 ? Math.ceil((remaining - thresholdAmount) / dailyUsage) : null
    const projectedRemaining = dailyUsage > 0 ? Math.max(0, remaining - forecastDays * dailyUsage) : null

    return {
      ...row,
      daily_usage: dailyUsage,
      remaining,
      days_left: daysLeft,
      projected_remaining: projectedRemaining,
      status_label: getStatusLabel(daysLeft, statusSettings),
      _dirty: true,
    }
  })
}

function decorateMergedLabelHeader(worksheet) {
  void worksheet
}

export default function SourceRemainingSpreadsheetGrid({
  rows,
  onRowsChange,
  pendingKeys,
  forecastDays,
  statusSettings,
  sourceNames,
}) {
  const hostRef = useRef(null)
  const sheetRef = useRef(null)
  const syncingRef = useRef(false)
  const rowsRef = useRef(rows)

  const model = useMemo(
    () => buildSheetModel(rows, forecastDays, statusSettings, pendingKeys, sourceNames),
    [rows, forecastDays, statusSettings, pendingKeys, sourceNames],
  )

  useEffect(() => {
    rowsRef.current = rows
    debugLog('rows prop updated', rows.slice(0, 5).map((row) => ({
      key: row.key,
      remaining: row.remaining,
      daily_usage: row.daily_usage,
    })))
  }, [rows])

  useEffect(() => {
    clearStoredColumnWidths()
  }, [])

  useEffect(() => {
    if (!hostRef.current || sheetRef.current) return

    const applyWorksheetDecorations = (worksheet) => {
      if (!worksheet) return
      requestAnimationFrame(() => {
        applyStickyRows(worksheet)
        applySourceAccentClasses(worksheet, rowsRef.current, sourceNames)
        applyReadOnlyRows(worksheet)
      })
    }

    const syncToParent = (matrixOverride = null) => {
      if (!sheetRef.current || syncingRef.current) return
      const worksheet = sheetRef.current.worksheets?.[0]
      if (!worksheet) return
      const sheetData = matrixOverride ?? worksheet.getData?.() ?? []
      onRowsChange(matrixToRows(sheetData, rowsRef.current, forecastDays, statusSettings))
    }

    const syncCalculatedMatrix = (worksheet, matrixOverride = null) => {
      if (!worksheet) return matrixOverride ?? []
      const currentData = matrixOverride ?? worksheet.getData?.() ?? []
      const nextData = recomputeProjectionMatrix(currentData)

      syncingRef.current = true
      if (!matrixEquals(currentData, nextData)) {
        worksheet.setData(nextData)
      }
      syncingRef.current = false

      applyWorksheetDecorations(worksheet)
      return nextData
    }

    const columns = applyWidths(model.columns)

    sheetRef.current = jspreadsheet(hostRef.current, {
      toolbar: false,
      tabs: false,
      about: false,
      worksheets: [
        {
          data: model.data,
          columns,
          nestedHeaders: model.nestedHeaders,
          minDimensions: [columns.length, model.data.length],
          minSpareRows: 0,
          defaultRowHeight: 30,
          allowInsertColumn: false,
          allowManualInsertColumn: false,
          allowDeleteColumn: false,
          allowRenameColumn: false,
          allowInsertRow: false,
          allowManualInsertRow: false,
          allowDeleteRow: false,
          columnDrag: false,
          columnResize: false,
          columnSorting: false,
          filters: false,
          search: false,
          rowDrag: false,
          rowResize: false,
          onchange: () => {
            // Use onafterchanges so committed values are applied once.
          },
          onafterchanges: (worksheet, changes) => {
            if (syncingRef.current) return

            const currentData = worksheet.getData?.() ?? []
            const patchedData = patchMatrixChanges(currentData, changes)
            const nextData = syncCalculatedMatrix(worksheet, patchedData)
            syncToParent(nextData)
          },
        },
      ],
      onload: (spreadsheet) => {
        sheetRef.current = spreadsheet
        const worksheet = spreadsheet?.worksheets?.[0]
        enforceFirstDataColumnWidth(worksheet)
        decorateMergedLabelHeader(worksheet)
        applySourceAccentClasses(worksheet, rowsRef.current, sourceNames)
        applyStickyRows(worksheet)
        syncCalculatedMatrix(worksheet)
        applyReadOnlyRows(worksheet)
      },
    })

    return () => {
      if (hostRef.current) hostRef.current.innerHTML = ''
      sheetRef.current = null
    }
  }, [forecastDays, model.columns, model.data, model.nestedHeaders, onRowsChange, sourceNames, statusSettings])

  useEffect(() => {
    const worksheet = sheetRef.current?.worksheets?.[0]
    if (!worksheet) return

    const nextData = model.data
    const currentData = worksheet.getData?.() ?? []
    if (matrixEquals(currentData, nextData)) return

    syncingRef.current = true
    worksheet.setData(nextData)
    syncingRef.current = false

    requestAnimationFrame(() => {
      enforceFirstDataColumnWidth(worksheet)
      decorateMergedLabelHeader(worksheet)
      applySourceAccentClasses(worksheet, rowsRef.current, sourceNames)
      applyStickyRows(worksheet)
      applyReadOnlyRows(worksheet)
    })
  }, [model.data, sourceNames])

  return (
    <div className="remaining-style-jspreadsheet-shell">
      <div ref={hostRef} />
    </div>
  )
}
