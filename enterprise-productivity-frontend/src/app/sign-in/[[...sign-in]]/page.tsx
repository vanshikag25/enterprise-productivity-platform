import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/auth-shell';
import { AuthCardSkeleton } from '@/components/auth/auth-card-skeleton';
import { SignInForm } from '@/components/auth/sign-in-form';

export const metadata = { title: 'Sign in | Enterprise Productivity' };

export default function SignInPage() {
  return (
    <AuthShell>
      <Suspense fallback={<AuthCardSkeleton />}>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}