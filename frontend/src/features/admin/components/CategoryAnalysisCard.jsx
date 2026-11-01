import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';

const CATEGORY_META = [
  { id: 'roads', label: 'Roads & Potholes', color: '#7C97B0' },
  { id: 'water', label: 'Water & Drainage', color: '#9BAFC1' },
  { id: 'sanitation', label: 'Waste & Sanitation', color: '#2E7D6B' },
  { id: 'lighting', label: 'Streetlighting & Power', color: '#B7791F' },
  { id: 'safety', label: 'Public Safety Hazard', color: '#C74949' },
  { id: 'traffic', label: 'Traffic & Signals', color: '#688299' },
  { id: 'other', label: 'Other Civic Infrastructure', color: '#64748B' },
];

export function CategoryAnalysisCard({ incidents = [] }) {
  const countsByCategory = incidents.reduce((acc, inc) => {
    const cat = inc.category || 'other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const total = incidents.length || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complaint Category Distribution</CardTitle>
        <CardDescription>
          Real-time incident volume across municipal civic infrastructure domains.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Multi-segment distribution bar */}
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-[#E1E7EE] dark:bg-[#40515F]">
          {CATEGORY_META.map((cat) => {
            const count = countsByCategory[cat.id] || 0;
            const percentage = (count / total) * 100;
            if (count === 0) return null;

            return (
              <div
                key={cat.id}
                className="h-full transition-all duration-300"
                style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                title={`${cat.label}: ${count} (${percentage.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs">
          {CATEGORY_META.map((cat) => {
            const count = countsByCategory[cat.id] || 0;
            const percentage = ((count / total) * 100).toFixed(1);

            return (
              <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg bg-[#F7F9FB] dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F]">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-[#2E4A62] dark:text-[#F2F5F8] truncate">{cat.label}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                  <span className="font-bold text-[#2E4A62] dark:text-[#8FAFCB]">{count}</span>
                  <span className="text-[#64748B] dark:text-[#B7C3CE]">({percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default CategoryAnalysisCard;
