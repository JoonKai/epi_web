import { useCostStore } from '../store/useCostStore';
import { OverheadCosts } from '../types';
import { formatKRW } from '../utils/calculations';

interface FieldDef {
  key: keyof OverheadCosts;
  label: string;
  group: string;
}

const fields: FieldDef[] = [
  { key: 'electricity', label: '전력비 (MOCVD 대전력)', group: '제조경비' },
  { key: 'coolingWater', label: '냉각수비', group: '제조경비' },
  { key: 'cleanroomMaint', label: '클린룸 유지비', group: '제조경비' },
  { key: 'nitrogen', label: '질소 가스비', group: '제조경비' },
  { key: 'depreciation', label: '감가상각비', group: '제조경비' },
  { key: 'consumables', label: '소모품 (서셉터/O-ring 등)', group: '제조경비' },
  { key: 'salesExpense', label: '영업비', group: '판관비' },
  { key: 'logisticsCost', label: '물류/운송비', group: '판관비' },
  { key: 'adminCost', label: '관리비', group: '판관비' },
];

export default function OverheadCost() {
  const { overhead, setOverhead } = useCostStore();

  const mfgTotal =
    overhead.electricity + overhead.coolingWater + overhead.cleanroomMaint +
    overhead.nitrogen + overhead.depreciation + overhead.consumables;

  const sgaTotal = overhead.salesExpense + overhead.logisticsCost + overhead.adminCost;

  const groups = ['제조경비', '판관비'] as const;

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group} className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">{group}</h2>
          <p className="text-sm text-gray-500 mb-4">
            {group === '제조경비' ? '월 기준 EPI 공정 간접 제조경비' : '월 기준 판매비와 관리비'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields
              .filter((f) => f.group === group)
              .map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{f.label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={overhead[f.key]}
                      onChange={(e) => setOverhead({ [f.key]: Number(e.target.value) })}
                      className="border rounded-md px-3 py-2 w-full text-right pr-10"
                      min={0}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">원</span>
                  </div>
                </div>
              ))}
          </div>
          <div className="mt-4 pt-4 border-t flex justify-end">
            <span className="text-sm text-gray-500 mr-2">{group} 합계:</span>
            <span className="font-semibold text-blue-700 font-mono">
              {formatKRW(group === '제조경비' ? mfgTotal : sgaTotal)} 원
            </span>
          </div>
        </div>
      ))}

      <div className="bg-blue-50 rounded-lg shadow p-4 flex justify-between items-center">
        <span className="font-semibold text-gray-700">총 간접비 합계 (월)</span>
        <span className="text-xl font-bold text-blue-700 font-mono">
          {formatKRW(mfgTotal + sgaTotal)} 원
        </span>
      </div>
    </div>
  );
}
