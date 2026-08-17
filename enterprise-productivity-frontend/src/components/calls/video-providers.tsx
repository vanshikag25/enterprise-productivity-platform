'use client';

import type { ReactNode } from 'react';
import { VideoProvider } from '@/lib/video-client';
import { CallManagerProvider } from './call-manager-provider';

/**
 * Bundles the Stream Video client + call-state providers. This module is
 * loaded lazily (client-only) via `CallFeatureProvider` because the Stream
 * Video SDKs reference browser-only globals (`Worker`) at import time and
 * must never be evaluated during server-side rendering.
 */
export function VideoProviders({ children }: { children: ReactNode }) {
  return (
    <VideoProvider>
      <CallManagerProvider>{children}</CallManagerProvider>
    </VideoProvider>
  );
}
