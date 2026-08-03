import { Suspense } from 'react';
import { SignUp } from '@clerk/nextjs';
import { AuthShell } from '@/components/auth/auth-shell';
import { AuthCardSkeleton } from '@/components/auth/auth-card-skeleton';
import { clerkAppearance } from '@/lib/clerk-appearance';

export const metadata = { title: 'Sign up | Enterprise Productivity' };

export default function SignUpPage() {
  return (
    <AuthShell>
      <Suspense fallback={<AuthCardSkeleton />}>
        <SignUp
          forceRedirectUrl="/dashboard"
          signInUrl="/sign-in"
          appearance={clerkAppearance}
        />
      </Suspense>
    </AuthShell>
  );
}
