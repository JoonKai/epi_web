import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useCostStore } from '../store/useCostStore';
import { calcBreakEven, calcMaterialPerRun, calcMOCVDCostPerRun, calcBakeCostPerRun, calcMeasurementCostPerRun, calcShipmentCostPerRun, calcFixedOverhead, calcSellingAdminCost, formatKRW } from '../utils/calculations';

function AiSuggestionBox({ context }: { context: string }) {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  const handleAsk = async () => {
    if (!apiKey.trim()) {
      setShowKeyInput(true);
      return;
    }
    setLoading(true);
    setResponse('');
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                '당신은 반도체 EPI 공정 원가 분석 전문가입니다. 주어진 손익분기점 데이터를 분석하고, 원가 절감 및 수익성 개선을 위한 구체적인 제안을 한국어로 제공하세요. 간결하고 실행 가능한 제안을 3~5개 항목으로 정리하세요.',
            },
            { role: 'user', content: context },
          ],
          max_tokens: 1000,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setResponse(`오류: ${data.error.message}`);
      } else {
        setResponse(data.choices?.[0]?.message?.content || '응답을 받지 못했습니다.');
      }
    } catch (err) {
      setResponse(`요청 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5 mb-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <h3 className="text-sm font-semibold text-purple-900">AI 개선 제안</h3>
            <p className="text-xs text-purple-600">현재 원가 데이터를 기반으로 개선 방안을 분석합니다</p>
          </div>
        </div>
        <button
          onClick={handleAsk}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            loading
              ? 'bg-purple-300 text-white cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              분석 중...
            </span>
          ) : (
            '분석 요청'
          )}
        </button>
      </div>

      {showKeyInput && !apiKey && (
        <div className="mb-3 flex gap-2">
          <input
            type="password"
            placeholder="OpenAI API Key (sk-...)"
            className="flex-1 border border-purple-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button
            onClick={handleAsk}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
          >
            확인
          </button>
        </div>
      )}

      {response && (
        <div className="bg-white rounded-lg p-4 border border-purple-100 mt-2">
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{response}</div>
        </div>
      )}

      {!response && !loading && (
        <div className="text-xs text-purple-400 mt-1">
          "분석 요청" 버튼을 클릭하면 현재 손익분기점 데이터를 기반으로 AI가 개선 제안을 제공합니다.
        </div>
      )}
    </div>
  );
}

export default function BreakEvenAnalysis() {
  const { bom, mocvd, bake, measurements, shipment, overhead, sellingPrice, setSellingPrice } = useCostStore();

  const bep = useMemo(
    () => calcBreakEven(bom, mocvd, bake, measurements, shipment, overhead, sellingPrice),
    [bom, mocvd, bake, measurements, shipment, overhead, sellingPrice]
  );

  // 변동비 (웨이퍼당)
  const variableCostPerWafer = useMemo(() => {
    const totalYield = (1 - mocvd.defectRate / 100) * (1 - shipment.shipmentDefectRate / 100);
    const materialPerRun = calcMaterialPerRun(bom);
    const mocvdCost = calcMOCVDCostPerRun(mocvd);
    const bakeCost = calcBakeCostPerRun(bake, mocvd.wafersPerRun);
    const measCost = calcMeasurementCostPerRun(measurements, mocvd.wafersPerRun);
    const shipCost = calcShipmentCostPerRun(shipment, mocvd.wafersPerRun);
    const costPerRun = materialPerRun + mocvdCost.labor + mocvdCost.equipment + mocvdCost.maintenance + bakeCost.labor + bakeCost.equipment + measCost.labor + measCost.equipment + shipCost.labor + shipCost.material;
    const goodPerRun = mocvd.wafersPerRun * totalYield;
    return goodPerRun > 0 ? costPerRun / goodPerRun : 0;
  }, [bom, mocvd, bake, measurements, shipment]);

  const fixedCost = calcFixedOverhead(overhead) + calcSellingAdminCost(overhead);

  const chartData = useMemo(() => {
    const maxQty = bep ? Math.max(bep.bepQuantity * 2, 500) : 3000;
    const step = Math.max(Math.floor(maxQty / 20), 1);
    const points = [];
    for (let q = 0; q <= maxQty; q += step) {
      points.push({
        quantity: q,
        revenue: q * sellingPrice,
        totalCost: fixedCost + q * variableCostPerWafer,
        fixedCostLine: fixedCost,
      });
    }
    return points;
  }, [sellingPrice, fixedCost, variableCostPerWafer, bep]);

  const margin = sellingPrice - variableCostPerWafer;
  const marginRate = sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0;

  const aiContext = `GaN EPI MOCVD 공정 손익분기점 분석 데이터:
- 판매 단가: ${formatKRW(sellingPrice)} 원/매
- 변동비(웨이퍼당): ${formatKRW(variableCostPerWafer)} 원
- 고정비(월): ${formatKRW(fixedCost)} 원
- 매당 마진: ${formatKRW(margin)} 원 (마진율 ${marginRate.toFixed(1)}%)
- BEP 수량: ${bep ? `${bep.bepQuantity.toLocaleString()}매` : '달성 불가'}
- BEP 매출액: ${bep ? `${formatKRW(bep.bepRevenue)} 원` : '달성 불가'}
- MOCVD 불량률: ${mocvd.defectRate}%, 출하 불량률: ${shipment.shipmentDefectRate}%
- 웨이퍼/런: ${mocvd.wafersPerRun}매, 리액터: ${mocvd.reactorCount}대

이 데이터를 분석하여 원가 절감 및 수익성 개선을 위한 구체적인 제안을 해주세요.`;

  return (
    <div className="space-y-6">
      <AiSuggestionBox context={aiContext} />

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">손익분기점 (BEP) 분석</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">웨이퍼 판매 단가 (원/매)</label>
            <input
              type="number"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(Number(e.target.value))}
              className="border rounded-md px-3 py-2 w-full text-right text-lg"
              min={0}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">변동비/매</div>
              <div className="font-bold font-mono">{formatKRW(variableCostPerWafer)} 원</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">고정비 합계 (월)</div>
              <div className="font-bold font-mono">{formatKRW(fixedCost)} 원</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`rounded-lg p-4 text-center ${bep ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="text-xs text-gray-500">BEP 수량</div>
            <div className={`text-xl font-bold font-mono ${bep ? 'text-green-700' : 'text-red-700'}`}>
              {bep ? `${bep.bepQuantity.toLocaleString()}매` : '달성 불가'}
            </div>
          </div>
          <div className={`rounded-lg p-4 text-center ${bep ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="text-xs text-gray-500">BEP 매출액</div>
            <div className={`text-xl font-bold font-mono ${bep ? 'text-green-700' : 'text-red-700'}`}>
              {bep ? `${formatKRW(bep.bepRevenue)} 원` : '-'}
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-500">매당 마진</div>
            <div className={`text-xl font-bold font-mono ${margin >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              {formatKRW(margin)} 원
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-500">마진율</div>
            <div className={`text-xl font-bold ${marginRate >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              {marginRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {margin <= 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm font-medium">
              판매 단가가 변동비보다 낮아 손익분기점 달성이 불가능합니다.
              최소 판매 단가: {formatKRW(variableCostPerWafer + 1)} 원 이상으로 설정하세요.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-md font-semibold text-gray-700 mb-4">손익분기점 차트</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="quantity"
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
              label={{ value: '웨이퍼 수 (매)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              tickFormatter={(v) => {
                if (v >= 1000000000) return `${(v / 1000000000).toFixed(0)}B`;
                if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`;
                if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                return v;
              }}
              label={{ value: '금액 (원)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${formatKRW(value)} 원`,
                name === 'revenue' ? '매출액' : name === 'totalCost' ? '총비용' : '고정비',
              ]}
              labelFormatter={(label) => `수량: ${Number(label).toLocaleString()}매`}
            />
            <Legend
              formatter={(value) =>
                value === 'revenue' ? '매출액' : value === 'totalCost' ? '총비용' : '고정비'
              }
            />
            <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} dot={false} name="revenue" />
            <Line type="monotone" dataKey="totalCost" stroke="#dc2626" strokeWidth={2} dot={false} name="totalCost" />
            <Line type="monotone" dataKey="fixedCostLine" stroke="#9ca3af" strokeWidth={1} strokeDasharray="5 5" dot={false} name="fixedCostLine" />
            {bep && (
              <ReferenceLine
                x={bep.bepQuantity}
                stroke="#2563eb"
                strokeDasharray="3 3"
                label={{ value: `BEP: ${bep.bepQuantity.toLocaleString()}매`, position: 'top', fill: '#2563eb' }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
