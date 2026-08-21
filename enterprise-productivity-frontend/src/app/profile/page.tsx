'use client';

import { useState, type FormEvent } from 'react';
import { useUser, useAuth } from '@/lib/auth';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FullPageSpinner } from '@/components/ui/spinner';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { IconEdit, IconLanguage, IconMail, IconShield, IconUser } from '@/components/ui/icons';
import { useRole } from '@/hooks/use-role';
import { SUPPORTED_LANGUAGES, languageLabel } from '@/lib/languages';
import {
  USER_ROLE_LABELS,
  changeUsernameRequest,
  updateProfileRequest,
} from '@/lib/api-client';
import { formatJoinedDate } from '@/lib/format-date';
import { useStreamChatContext } from '@/context/stream-chat-context';
import { StatusDot } from '@/components/presence/status-dot';
import { resolveUserStatus } from '@/lib/user-status';

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,50}$/;

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { getToken, setSession } = useAuth();
  const { me, role, isLoading, refresh } = useRole();
  const { client } = useStreamChatContext();

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState<string | null>(null);
  const [isSavingUsername, setIsSavingUsername] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);

  const [isEditingLanguage, setIsEditingLanguage] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [languageError, setLanguageError] = useState<string | null>(null);
  const [languageSuccess, setLanguageSuccess] = useState<string | null>(null);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);

  if (!isLoaded || (isLoading && !me)) {
    return (
      <div className="page-container">
        <FullPageSpinner label="Loading profile…" />
      </div>
    );
  }

  const name = user?.fullName ?? user?.username ?? me?.firstName ?? 'Your account';
  const email = user?.primaryEmailAddress?.emailAddress ?? me?.email ?? '';
  const imageUrl = user?.imageUrl ?? me?.imageUrl ?? null;
  const roleLabel = role ? USER_ROLE_LABELS[role] : null;
  const username = user?.username ?? me?.username ?? '';
  const myStatus = resolveUserStatus(
    client?.user?.online ?? true,
    me?.status ?? null,
  );

  const fields: { label: string; value: string; icon: React.ReactNode }[] = [
    { label: 'Email address', value: email, icon: <IconMail width={16} height={16} /> },
    { label: 'Role', value: roleLabel ?? '—', icon: <IconShield width={16} height={16} /> },
  ];

  function startEditingUsername() {
    setNewUsername(username);
    setUsernameError(null);
    setUsernameSuccess(null);
    setIsEditingUsername(true);
  }

  function startEditingName() {
    setFirstName(user?.firstName ?? me?.firstName ?? '');
    setLastName(user?.lastName ?? me?.lastName ?? '');
    setNameError(null);
    setNameSuccess(null);
    setIsEditingName(true);
  }

  function startEditingLanguage() {
    setPreferredLanguage(user?.preferredLanguage ?? me?.preferredLanguage ?? 'en');
    setLanguageError(null);
    setLanguageSuccess(null);
    setIsEditingLanguage(true);
  }

  async function handleLanguageSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSavingLanguage) return;

    setIsSavingLanguage(true);
    setLanguageError(null);
    setLanguageSuccess(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('You are not signed in.');
      const updated = await updateProfileRequest(token, {
        preferredLanguage,
      });
      if (token) await setSession(token, updated);
      await refresh();
      setIsEditingLanguage(false);
      setLanguageSuccess('Preferred language updated.');
    } catch (err) {
      setLanguageError(
        err instanceof Error ? err.message : 'Failed to update language.',
      );
    } finally {
      setIsSavingLanguage(false);
    }
  }

  async function handleNameSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSavingName) return;

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    if (!trimmedFirstName && !trimmedLastName) {
      setNameError('Enter at least a first or last name.');
      return;
    }

    setIsSavingName(true);
    setNameError(null);
    setNameSuccess(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('You are not signed in.');
      const updated = await updateProfileRequest(token, {
        firstName: trimmedFirstName || undefined,
        lastName: trimmedLastName || undefined,
      });
      if (token) await setSession(token, updated);
      setIsEditingName(false);
      setNameSuccess('Full name updated.');
    } catch (err) {
      setNameError(
        err instanceof Error ? err.message : 'Failed to update full name.',
      );
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleUsernameSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSavingUsername) return;

    const candidate = newUsername.trim();
    if (!USERNAME_PATTERN.test(candidate)) {
      setUsernameError(
        'Username may only contain letters, numbers, dots, dashes and underscores (3–50 chars).',
      );
      return;
    }
    if (candidate === username) {
      setIsEditingUsername(false);
      setNewUsername('');
      return;
    }

    setIsSavingUsername(true);
    setUsernameError(null);
    setUsernameSuccess(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('You are not signed in.');
      const res = await changeUsernameRequest(token, candidate);
      await setSession(res.token, res.user);
      setNewUsername('');
      setIsEditingUsername(false);
      setUsernameSuccess('Username updated.');
    } catch (err) {
      setUsernameError(
        err instanceof Error ? err.message : 'Failed to update username.',
      );
    } finally {
      setIsSavingUsername(false);
    }
  }

  const currentUsername = username;

  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        title="My Profile"
        subtitle="Your account details and role within the organization."
        icon={<IconUser width={20} height={20} />}
      />

      <Card className="overflow-hidden">
        <div className="brand-gradient h-24" />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex items-end justify-between">
            <div className="relative rounded-full ring-4 ring-white">
              <Avatar name={name} imageUrl={imageUrl} size="xl" />
              <StatusDot
                status={myStatus}
                size="lg"
                className="absolute bottom-1 right-1"
              />
            </div>
            {roleLabel && <Badge variant="blue">{roleLabel}</Badge>}
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">{name}</h2>
          <p className="text-sm text-slate-500">{email}</p>
        </div>
      </Card>

      <Card className="mt-6 divide-y divide-slate-100">
        {fields.map((field) => (
          <div key={field.label} className="flex items-center gap-4 px-5 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              {field.icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{field.label}</p>
              <p className="truncate text-sm font-medium text-slate-800">{field.value}</p>
            </div>
          </div>
        ))}
        {user?.createdAt && (
          <div className="flex items-center gap-4 px-5 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <IconUser width={16} height={16} />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Member since</p>
              <p className="text-sm font-medium text-slate-800">{formatJoinedDate(user.createdAt.toString())}</p>
            </div>
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <IconEdit width={16} height={16} />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Username</p>
                <p className="truncate text-sm font-medium text-slate-800">{currentUsername}</p>
              </div>
            </div>
            {!isEditingUsername && (
              <Button type="button" variant="outline" size="sm" onClick={startEditingUsername}>
                Change
              </Button>
            )}
          </div>

          {usernameSuccess && (
            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {usernameSuccess}
            </div>
          )}

          {isEditingUsername && (
            <form onSubmit={handleUsernameSubmit} className="mt-4 space-y-3">
              {usernameError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {usernameError}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="username">New username</Label>
                <Input
                  id="username"
                  name="username"
                  autoComplete="off"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="jane.doe"
                />
                <p className="text-xs text-slate-400">
                  Used to sign in and to identify you across the workspace.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={isSavingUsername}>
                  {isSavingUsername ? <Spinner size={16} /> : 'Save username'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditingUsername(false);
                    setNewUsername('');
                    setUsernameError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>

      <Card className="mt-6">
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <IconUser width={16} height={16} />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Full name</p>
                <p className="truncate text-sm font-medium text-slate-800">{name}</p>
              </div>
            </div>
            {!isEditingName && (
              <Button type="button" variant="outline" size="sm" onClick={startEditingName}>
                Change
              </Button>
            )}
          </div>

          {nameSuccess && (
            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {nameSuccess}
            </div>
          )}

          {isEditingName && (
            <form onSubmit={handleNameSubmit} className="mt-4 space-y-3">
              {nameError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {nameError}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={isSavingName}>
                  {isSavingName ? <Spinner size={16} /> : 'Save name'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditingName(false);
                    setNameError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>

      <Card className="mt-6">
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <IconLanguage width={16} height={16} />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Preferred language</p>
                <p className="truncate text-sm font-medium text-slate-800">
                  {languageLabel(user?.preferredLanguage ?? me?.preferredLanguage ?? 'en')}
                </p>
              </div>
            </div>
            {!isEditingLanguage && (
              <Button type="button" variant="outline" size="sm" onClick={startEditingLanguage}>
                Change
              </Button>
            )}
          </div>

          {languageSuccess && (
            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {languageSuccess}
            </div>
          )}

          {isEditingLanguage && (
            <form onSubmit={handleLanguageSubmit} className="mt-4 space-y-3">
              {languageError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {languageError}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="preferredLanguage">Preferred language</Label>
                <Select
                  id="preferredLanguage"
                  name="preferredLanguage"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="max-w-xs"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-slate-400">
                  Used as the default language for AI features like message translation.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={isSavingLanguage}>
                  {isSavingLanguage ? <Spinner size={16} /> : 'Save language'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditingLanguage(false);
                    setLanguageError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}