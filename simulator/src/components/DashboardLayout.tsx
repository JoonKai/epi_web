import { ReactNode, useEffect, useState } from 'react';
import { useCostStore, DashboardPage } from '../store/useCostStore';

const menuItems: { id: DashboardPage; label: string; icon: string }[] = [
  { id: 'home', label: '대시보드', icon: '📊' },
  { id: 'cost-simulator', label: '원가 시뮬레이터', icon: '🧮' },
  { id: 'production', label: '생산 관리', icon: '🏭' },
  { id: 'quality', label: '품질 관리', icon: '✅' },
  { id: 'settings', label: '설정', icon: '⚙️' },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { currentPage, sidebarOpen, setCurrentPage, setSidebarOpen } = useCostStore();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = window.localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex transition-colors duration-200">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 bg-slate-900 dark:bg-[#060e1a] text-white transition-all duration-300 flex flex-col ${
          sidebarOpen ? 'w-60' : 'w-16'
        }`}
      >
        {/* Logo / Header */}
        <div className="flex items-center h-16 px-4 border-b border-slate-700/60">
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold truncate tracking-wide">GaN EPI</h1>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">Manufacturing Dashboard</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-slate-700/70 text-slate-400 hover:text-white transition-colors flex-shrink-0"
          >
            {sidebarOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                currentPage === item.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-100'
              }`}
              title={item.label}
            >
              <span className="text-base flex-shrink-0 leading-none">{item.icon}</span>
              {sidebarOpen && <span className="ml-3 truncate font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700/60">
          <button
            onClick={toggleTheme}
            className={`w-full rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
              sidebarOpen ? 'flex items-center' : 'flex items-center justify-center'
            } text-slate-400 hover:bg-slate-700/60 hover:text-slate-100`}
            title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {theme === 'dark' ? (
              /* 태양 아이콘 — 다크 모드일 때: 라이트로 전환 */
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              /* 달 아이콘 — 라이트 모드일 때: 다크로 전환 */
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3c0 .5.04 1 .11 1.48A7 7 0 0 0 19.52 12c.48.07.98.11 1.48.11Z" />
              </svg>
            )}
            {sidebarOpen && (
              <span className="ml-2 font-medium">
                {theme === 'dark' ? '라이트 모드' : '다크 모드'}
              </span>
            )}
          </button>
          {sidebarOpen && (
            <p className="text-[10px] text-slate-600 text-center mt-3">v1.0.0</p>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-60' : 'ml-16'}`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b dark:border-slate-700/50 h-14 flex items-center px-6 shadow-sm dark:shadow-slate-950/50 transition-colors duration-200">
          <h2 className="text-base font-semibold text-gray-800 dark:text-slate-100 tracking-tight">
            <span className="mr-2">{menuItems.find((m) => m.id === currentPage)?.icon}</span>
            {menuItems.find((m) => m.id === currentPage)?.label}
          </h2>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
