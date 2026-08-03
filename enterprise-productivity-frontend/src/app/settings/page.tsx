import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSettings } from '@/components/ui/icons';

export const metadata = { title: 'Settings | Enterprise Productivity' };

export default function SettingsPage() {
  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        title="Settings"
        subtitle="Manage your preferences."
        icon={<IconSettings width={20} height={20} />}
      />
      <EmptyState
        icon={<IconSettings width={26} height={26} />}
        title="Settings are coming soon"
        description="Account preferences, notification controls, and appearance settings will be available here shortly."
      />
    </div>
  );
}
