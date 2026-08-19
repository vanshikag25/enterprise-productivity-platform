import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Base({
  children,
  ...props
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#logo-gradient)" />
      <path
        d="M16 8l5.6 3.2v6.4L16 20.8l-5.6-3.2v-6.4L16 8z"
        stroke="white"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M16 20.8v4.4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11.2 20.6l-3.9 2.3M20.8 20.6l3.9 2.3" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      <defs>
        <linearGradient id="logo-gradient" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="0.6" stopColor="#2563eb" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function IconChat({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Base>
  );
}

export function IconMessageCircle({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
    </Base>
  );
}

export function IconUsers({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Base>
  );
}

export function IconUser({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Base>
  );
}

export function IconTasks({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M11 12H4" />
      <path d="M13 18H4" />
      <path d="M13 6H4" />
      <path d="m15 12 2 2 4-4" />
    </Base>
  );
}

export function IconCalendar({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Base>
  );
}

export function IconMegaphone({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </Base>
  );
}

export function IconBuilding({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 21h18" />
      <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
      <path d="M19 21V9a2 2 0 0 0-2-2h-2" />
      <path d="M9 7h2M9 11h2M9 15h2" />
    </Base>
  );
}

export function IconDepartment({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 21h18" />
      <path d="M6 21V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14" />
      <path d="M9 9h2M9 13h2M13 9h2M13 13h2" />
    </Base>
  );
}

export function IconProject({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M21 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2z" />
    </Base>
  );
}

export function IconShield({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Base>
  );
}

export function IconBell({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Base>
  );
}

export function IconSearch({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Base>
  );
}

export function IconPlus({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  );
}

export function IconClose({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Base>
  );
}

export function IconMenu({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Base>
  );
}

export function IconChevronDown({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="m6 9 6 6 6-6" />
    </Base>
  );
}

export function IconChevronLeft({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="m15 18-6-6 6-6" />
    </Base>
  );
}

export function IconChevronRight({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="m9 18 6-6-6-6" />
    </Base>
  );
}

export function IconChevronsLeft({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="m11 17-5-5 5-5M18 17l-5-5 5-5" />
    </Base>
  );
}

export function IconChevronsRight({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="m13 17 5-5-5-5M6 17l5-5-5-5" />
    </Base>
  );
}

export function IconLogout({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </Base>
  );
}

export function IconSettings({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </Base>
  );
}

export function IconMail({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </Base>
  );
}

export function IconCheck({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Base>
  );
}

export function IconCheckCircle({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </Base>
  );
}

export function IconAlertCircle({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </Base>
  );
}

export function IconAlertTriangle({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" />
      <path d="M12 9v4M12 17h.01" />
    </Base>
  );
}

export function IconInfo({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </Base>
  );
}

export function IconTrash({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </Base>
  );
}

export function IconEdit({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
    </Base>
  );
}

export function IconPin({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" />
    </Base>
  );
}

export function IconArrowRight({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </Base>
  );
}

export function IconClock({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </Base>
  );
}

export function IconLock({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Base>
  );
}

export function IconInbox({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </Base>
  );
}

export function IconSparkles({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z" />
    </Base>
  );
}

export function IconNote({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z" />
      <path d="M14 2v6h6M8 13h8M8 17h8" />
    </Base>
  );
}

export function IconBookmark({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </Base>
  );
}

export function IconCalendarPlus({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
    </Base>
  );
}

export function IconBellRing({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      <path d="M4 2 2 4M22 2l-2 2" />
    </Base>
  );
}

export function IconPoll({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </Base>
  );
}

export function IconLanguage({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </Base>
  );
}

export function IconPhone({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </Base>
  );
}

export function IconPhoneOff({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
      <path d="M22 2 2 22" />
    </Base>
  );
}

export function IconVideo({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="m22 8-6 4 6 4V8Z" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </Base>
  );
}

export function IconVideoOff({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.25-3.5a.5.5 0 0 1 .75.43v9.14a.5.5 0 0 1-.75.43L16 15.5v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
      <path d="M2 2 22 22" />
    </Base>
  );
}

export function IconMic({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
    </Base>
  );
}

export function IconMicOff({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M16.14 15.28A8 8 0 0 0 19 10v-2M16 5.09A3 3 0 0 0 12 8v1M12 19v3M6 10v2a6 6 0 0 0 6 6M8.24 7.76A3 3 0 0 1 12 5" />
      <path d="M2 2 22 22" />
    </Base>
  );
}

export function IconScreenShare({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <path d="M8 20h8M12 16v-6M9.5 12.5 12 10l2.5 2.5" />
    </Base>
  );
}

export function IconHand({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M18 11V6a2 2 0 0 0-4 0v5" />
      <path d="M14 10V4a2 2 0 0 0-4 0v6" />
      <path d="M10 10.5V6a2 2 0 0 0-4 0v7" />
      <path d="M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </Base>
  );
}

export function IconRecord({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconBlur({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 7.5a6.5 6.5 0 0 1 0 9M16 7.5a6.5 6.5 0 0 0 0 9" strokeDasharray="2 2" />
    </Base>
  );
}

export function IconSend({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </Base>
  );
}

export function IconRefresh({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </Base>
  );
}

export function IconHistory({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </Base>
  );
}

export function IconWorkflow({ ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M13 2 4.5 12.5H11L9.5 22 19 10.5h-6.5L13 2z" />
    </Base>
  );
}
