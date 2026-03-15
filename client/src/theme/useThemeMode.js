import { useEffect, useState } from 'react'

function readTheme() {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState(readTheme)

  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const target = document.documentElement
    const observer = new MutationObserver(() => {
      setThemeMode(readTheme())
    })

    observer.observe(target, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    setThemeMode(readTheme())

    return () => observer.disconnect()
  }, [])

  return {
    themeMode,
    isLight: themeMode === 'light',
    isDark: themeMode === 'dark',
  }
}
