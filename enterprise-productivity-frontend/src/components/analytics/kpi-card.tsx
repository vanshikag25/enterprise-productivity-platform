'use client';

import type { ReactNode } from 'react';
import type { AnalyticsKpi } from '@/lib/api-client';
import { Card, CardBody } from '@/components/ui/card';

interface KpiCardProps {
  label: string;
  kpi: AnalyticsKpi;
  format?: (value: number) => string;
  icon?: ReactNode;
  onClick?: () => void;
}

export function KpiCard({ label, kpi, format, icon, onClick }: KpiCardProps) {
  const change = kpi.changePct;
  const positive = change !== null && change >= 0;

  return (
    <Card
      hoverable={Boolean(onClick)}
      className={onClick ? 'cursor-pointer' : ''}
      onClick={onClick}
    >
      <CardBody>
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          {icon}
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {format ? format(kpi.value) : kpi.value.toLocaleString()}
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-xs">
          {change === null ? (
            <span className="text-slate-400">No previous period</span>
          ) : (
            <>
              <span className={`font-medium ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
                {positive ? '↑' : '↓'} {Math.abs(change)}%
              </span>
              <span className="text-slate-400">vs previous period</span>
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
