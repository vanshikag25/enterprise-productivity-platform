import { Suspense } from 'react';
import { SignIn } from '@clerk/nextjs';
import { AuthShell } from '@/components/auth/auth-shell';
import { AuthCardSkeleton } from '@/components/auth/auth-card-skeleton';
import { clerkAppearance } from '@/lib/clerk-appearance';

export const metadata = { title: 'Sign in | Enterprise Productivity' };

export default function SignInPage() {
  return (
    <AuthShell>
      <Suspense fallback={<AuthCardSkeleton />}>
        <SignIn
          forceRedirectUrl="/dashboard"
          signUpUrl="/sign-up"
          appearance={clerkAppearance}
        />
      </Suspense>
    </AuthShell>
  );
}
