import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { TrendingUp, Activity, PieChart as PieChartIcon } from 'lucide-react';

interface ShipmentPerformanceWidgetProps {
  shipments: any[];
}

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#6366f1'];

export const ShipmentPerformanceWidget: React.FC<ShipmentPerformanceWidgetProps> = ({ shipments }) => {
  const chartData = useMemo(() => {
    if (!shipments || shipments.length === 0) {
      return [
        { name: 'In Planning', value: 3 },
        { name: 'Shipped', value: 5 },
        { name: 'Delivered', value: 8 }
      ];
    }

    const statusCounts: Record<string, number> = {};
    shipments.forEach(s => {
      const status = s.status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [shipments]);

  const total = useMemo(() => chartData.reduce((sum, entry) => sum + entry.value, 0), [chartData]);

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-600 text-white rounded-2xl shadow-md shadow-red-600/30 group-hover:scale-110 transition-transform">
            <PieChartIcon size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              Shipment Performance
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Status Distribution Matrix</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
          {total} Total Consignments
        </div>
      </div>

      <div className="flex-1 min-h-[250px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              wrapperStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', paddingTop: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-black text-slate-900 leading-none">{total}</p>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Total</p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Activity size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Operations</p>
            <p className="text-xs font-black text-slate-900 mt-1">Smooth Flow</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Efficiency</p>
            <p className="text-xs font-black text-slate-900 mt-1">98.4% SLA</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipmentPerformanceWidget;
