import { useCostStore } from '../store/useCostStore';
import { BOMCategory, BOMItem } from '../types';
import { formatKRW, calcMaterialPerRun, calcMaterialPerWafer } from '../utils/calculations';

const categories: BOMCategory[] = ['MO소스', '질소', '도펀트', '캐리어', '기판', '소모품', '기타'];

export default function BOMTable() {
  const { bom, mocvd, addBomItem, updateBomItem, removeBomItem } = useCostStore();

  const handleAdd = () => {
    addBomItem({
      id: Date.now().toString(),
      category: 'MO소스',
      name: '',
      spec: '',
      unit: 'g',
      usagePerRun: 0,
      unitPrice: 0,
      supplier: '',
    });
  };

  const handleChange = (id: string, field: keyof BOMItem, value: string | number) => {
    updateBomItem(id, { [field]: value });
  };

  const totalPerRun = calcMaterialPerRun(bom);
  const totalPerWafer = calcMaterialPerWafer(bom, mocvd.wafersPerRun);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">EPI 원자재 (BOM)</h2>
          <p className="text-sm text-gray-500 mt-1">MOCVD 1런당 사용량 기준 ({mocvd.wafersPerRun}매/런)</p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
        >
          + 원자재 추가
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-3 py-2 font-medium text-gray-600">분류</th>
              <th className="px-3 py-2 font-medium text-gray-600">원자재명</th>
              <th className="px-3 py-2 font-medium text-gray-600">규격</th>
              <th className="px-3 py-2 font-medium text-gray-600">단위</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-right">1런 사용량</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-right">단가 (원)</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-right">런당 비용</th>
              <th className="px-3 py-2 font-medium text-gray-600">공급업체</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {bom.map((item) => (
              <tr key={item.id} className="border-t hover:bg-slate-50">
                <td className="px-3 py-2">
                  <select
                    value={item.category}
                    onChange={(e) => handleChange(item.id, 'category', e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-24"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    value={item.name}
                    onChange={(e) => handleChange(item.id, 'name', e.target.value)}
                    className="border rounded px-2 py-1 w-28"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={item.spec}
                    onChange={(e) => handleChange(item.id, 'spec', e.target.value)}
                    className="border rounded px-2 py-1 w-36"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={item.unit}
                    onChange={(e) => handleChange(item.id, 'unit', e.target.value)}
                    className="border rounded px-2 py-1 w-14"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={item.usagePerRun}
                    onChange={(e) => handleChange(item.id, 'usagePerRun', Number(e.target.value))}
                    className="border rounded px-2 py-1 w-24 text-right"
                    min={0}
                    step="any"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => handleChange(item.id, 'unitPrice', Number(e.target.value))}
                    className="border rounded px-2 py-1 w-24 text-right"
                    min={0}
                    step="any"
                  />
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {formatKRW(item.usagePerRun * item.unitPrice)}
                </td>
                <td className="px-3 py-2">
                  <input
                    value={item.supplier}
                    onChange={(e) => handleChange(item.id, 'supplier', e.target.value)}
                    className="border rounded px-2 py-1 w-28"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => removeBomItem(item.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-blue-50 font-semibold">
              <td colSpan={6} className="px-3 py-3 text-right">1런당 재료비</td>
              <td className="px-3 py-3 text-right font-mono text-blue-700">
                {formatKRW(totalPerRun)} 원
              </td>
              <td colSpan={2}></td>
            </tr>
            <tr className="bg-blue-50 font-semibold">
              <td colSpan={6} className="px-3 py-1 text-right text-sm">웨이퍼당 재료비</td>
              <td className="px-3 py-1 text-right font-mono text-blue-600 text-sm">
                {formatKRW(totalPerWafer)} 원
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
