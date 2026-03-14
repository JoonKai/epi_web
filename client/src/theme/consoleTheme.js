import { createElement } from 'react'
import ReactECharts from 'echarts-for-react'

// ── Nowa-TS Color System ───────────────────────────────────────────
export const consoleColors = {
  // Base
  bg: '#0b0f1a',
  bgRaised: '#111827',
  panel: '#111827',
  panelAlt: '#1a2235',
  panelSoft: 'rgba(17, 24, 39, 0.85)',
  border: 'rgba(99, 102, 241, 0.12)',
  borderStrong: 'rgba(99, 102, 241, 0.35)',

  // Text
  text: '#e2e8f0',
  textSoft: 'rgba(226, 232, 240, 0.82)',
  textMuted: 'rgba(148, 163, 184, 0.65)',

  // Brand
  primary: '#6366f1',
  accent: '#6366f1',
  accentSoft: 'rgba(99, 102, 241, 0.15)',
  accentAlt: '#8b5cf6',

  // Semantic
  success: '#22c55e',
  successSoft: 'rgba(34, 197, 94, 0.14)',
  danger: '#f43f5e',
  dangerSoft: 'rgba(244, 63, 94, 0.14)',
  warning: '#eab308',
  warningSoft: 'rgba(234, 179, 8, 0.14)',
  info: '#3b82f6',
  infoSoft: 'rgba(59, 130, 246, 0.14)',
  teal: '#14b8a6',
  tealSoft: 'rgba(20, 184, 166, 0.14)',

  // KPI Card Gradients
  gradViolet: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  gradTeal:   'linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%)',
  gradRose:   'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)',
  gradAmber:  'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
  gradIndigo: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
  gradGreen:  'linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)',
}

export const panelStyle = {
  background: 'var(--nowa-panel)',
  border: '1px solid var(--nowa-border)',
  borderRadius: 16,
  boxShadow: 'var(--nowa-shadow-card)',
}

export const sectionTitleStyle = {
  color: 'var(--nowa-text-muted)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.6,
  textTransform: 'uppercase',
}

export function getMetricTone(value) {
  if (value > 0) return consoleColors.success
  if (value < 0) return consoleColors.danger
  return consoleColors.text
}

export function makeChartBase(title) {
  return {
    backgroundColor: 'transparent',
    textStyle: {
      color: consoleColors.textSoft,
      fontFamily: 'Pretendard, Inter, Segoe UI, sans-serif',
    },
    title: title
      ? {
          text: title,
          left: 12,
          top: 8,
          textStyle: {
            color: consoleColors.textSoft,
            fontSize: 13,
            fontWeight: 600,
          },
        }
      : undefined,
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1a2235',
      borderColor: 'rgba(99,102,241,0.3)',
      textStyle: { color: consoleColors.text },
      extraCssText: 'box-shadow: 0 12px 30px rgba(0,0,0,0.5); border-radius: 12px;',
    },
    legend: {
      textStyle: { color: consoleColors.textMuted, fontSize: 11 },
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 8,
    },
    grid: {
      left: 48,
      right: 20,
      top: 40,
      bottom: 36,
      containLabel: true,
    },
    xAxis: {
      axisLine: { lineStyle: { color: 'rgba(99,102,241,0.15)' } },
      axisLabel: { color: consoleColors.textMuted, fontSize: 11 },
      splitLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      axisLine: { show: false },
      axisLabel: { color: consoleColors.textMuted, fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(99,102,241,0.08)', type: 'dashed' } },
      axisTick: { show: false },
    },
  }
}

export function ConsoleChart({ option, style }) {
  return createElement(ReactECharts, { option, style, opts: { renderer: 'canvas' } })
}
