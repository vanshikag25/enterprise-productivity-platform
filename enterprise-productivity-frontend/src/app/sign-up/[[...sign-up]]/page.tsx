import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/auth-shell';
import { AuthCardSkeleton } from '@/components/auth/auth-card-skeleton';
import { SignUpForm } from '@/components/auth/sign-up-form';

export const metadata = { title: 'Sign up | Enterprise Productivity' };

export default function SignUpPage() {
  return (
    <AuthShell>
      <Suspense fallback={<AuthCardSkeleton />}>
        <SignUpForm />
      </Suspense>
    </AuthShell>
  );
}