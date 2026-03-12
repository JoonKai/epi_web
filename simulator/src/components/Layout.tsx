import { ReactNode } from 'react';
import { useCostStore } from '../store/useCostStore';

const tabs = [
  { id: 'summary', label: '원가 요약' },
  { id: 'bom', label: 'EPI 원자재' },
  { id: 'process', label: 'MOCVD / 베이크 / 측정 / 출하' },
  { id: 'overhead', label: '경비/판관비' },
  { id: 'lot', label: '생산량 시뮬레이션' },
  { id: 'bep', label: '손익분기점' },
];

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { activeTab, setActiveTab } = useCostStore();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">광반도체 EPI 공정 원가 시뮬레이터</h1>
          <p className="text-slate-300 text-sm mt-1">GaN MOCVD Epitaxy Cost Simulator</p>
        </div>
      </header>

      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
