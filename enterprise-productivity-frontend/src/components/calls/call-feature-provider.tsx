'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const LazyVideoProviders = dynamic(
  () => import('./video-providers').then((mod) => mod.VideoProviders),
  { ssr: false },
);

/**
 * Client-only mount point for the Stream Video providers. Using
 * `ssr: false` keeps the Stream Video SDKs (which reference browser globals
 * such as `Worker` at module load) out of the server bundle entirely.
 */
export function CallFeatureProvider({ children }: { children: ReactNode }) {
  return <LazyVideoProviders>{children}</LazyVideoProviders>;
}
