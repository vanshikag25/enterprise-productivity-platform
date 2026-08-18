'use client';

import type { AnalyticsFilterOptions } from '@/lib/api-client';
import { Select } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { IconRefresh } from '@/components/ui/icons';

const RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 180 days' },
];

interface FilterBarProps {
  range: string;
  onRangeChange: (value: string) => void;
  teamId: string;
  onTeamChange: (value: string) => void;
  departmentId: string;
  onDepartmentChange: (value: string) => void;
  channelId: string;
  onChannelChange: (value: string) => void;
  options: AnalyticsFilterOptions | null;
  loading: boolean;
  onRefresh: () => void;
}

export function FilterBar({
  range,
  onRangeChange,
  teamId,
  onTeamChange,
  departmentId,
  onDepartmentChange,
  channelId,
  onChannelChange,
  options,
  loading,
  onRefresh,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <Select
        value={range}
        onChange={(e) => onRangeChange(e.target.value)}
        className="w-auto"
        aria-label="Date range"
      >
        {RANGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>

      <Select
        value={teamId}
        onChange={(e) => onTeamChange(e.target.value)}
        className="w-auto max-w-[180px]"
        aria-label="Team"
      >
        <option value="">All teams</option>
        {options?.teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name} ({team.kind})
          </option>
        ))}
      </Select>

      <Select
        value={departmentId}
        onChange={(e) => onDepartmentChange(e.target.value)}
        className="w-auto max-w-[180px]"
        aria-label="Department"
      >
        <option value="">All departments</option>
        {options?.departments.map((dept) => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </Select>

      <Select
        value={channelId}
        onChange={(e) => onChannelChange(e.target.value)}
        className="w-auto max-w-[200px]"
        aria-label="Channel"
      >
        <option value="">All channels</option>
        {options?.channels.map((channel) => (
          <option key={channel.id} value={channel.id}>
            {channel.name} ({channel.kind})
          </option>
        ))}
      </Select>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <IconRefresh width={14} height={14} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
