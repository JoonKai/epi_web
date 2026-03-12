import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CostBreakdown } from '../types';
import { formatKRW } from '../utils/calculations';

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444'];

interface CostChartProps {
  cost: CostBreakdown;
}

export default function CostChart({ cost }: CostChartProps) {
  const data = [
    { name: '직접재료비', value: cost.directMaterial },
    { name: '직접노무비', value: cost.directLabor },
    { name: '제조경비', value: cost.manufacturingOverhead },
    { name: '판관비', value: cost.sellingAdminCost },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-md font-semibold text-gray-700 mb-4">원가 구성비</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `${formatKRW(value)} 원`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
