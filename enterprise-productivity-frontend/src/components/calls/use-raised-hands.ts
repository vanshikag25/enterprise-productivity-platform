'use client';

import { useEffect, useState } from 'react';
import type { Call } from '@stream-io/video-react-sdk';

export interface RaisedHand {
  userId: string;
  name: string;
  id: string;
  at: number;
}

/**
 * Tracks participants who raised their hand during the current call.
 *
 * Raise hand is implemented with the Stream reaction that the SDK itself uses
 * (`type: 'raised-hand'`, `emoji_code: ':raise-hand:'`), observed through the
 * `call.reaction_new` event. Hands are auto-cleared after 10 seconds.
 */
export function useRaisedHands(call?: Call | null): RaisedHand[] {
  const [hands, setHands] = useState<Record<string, RaisedHand>>({});

  useEffect(() => {
    if (!call) return;

    const off = call.on('call.reaction_new', (event) => {
      const payload = event as unknown as {
        reaction?: { type?: string; user_id?: string; created_at?: string };
        user?: { id?: string; name?: string };
      };
      const reaction = payload.reaction;
      if (reaction?.type !== 'raised-hand') return;
      const userId = payload.user?.id ?? reaction.user_id;
      if (!userId) return;

      const hand: RaisedHand = {
        userId,
        name: payload.user?.name ?? userId,
        id: `${userId}-${reaction.created_at ?? Date.now()}`,
        at: Date.now(),
      };

      setHands((prev) => ({ ...prev, [userId]: hand }));

      window.setTimeout(() => {
        setHands((prev) => {
          if (prev[userId]?.id !== hand.id) return prev;
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }, 10_000);
    });

    return () => off();
  }, [call]);

  return Object.values(hands).sort((a, b) => a.at - b.at);
}
