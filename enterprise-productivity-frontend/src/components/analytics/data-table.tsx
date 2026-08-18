'use client';

import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  emptyMessage?: string;
}

export function DataTable<T>({ columns, rows, emptyMessage }: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 px-4 py-10 text-xs text-slate-400">
        {emptyMessage ?? 'No data in this period'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 ${col.headerClassName ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
              {columns.map((col) => (
                <td key={col.key} className={`px-3 py-2.5 ${col.className ?? ''}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
