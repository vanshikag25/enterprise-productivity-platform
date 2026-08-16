'use client';

import { useMessageContext } from 'stream-chat-react';
import { useMessageTranslation } from '@/components/chat/translation-context';
import { languageLabel } from '@/lib/languages';
import { IconClose } from '@/components/ui/icons';

/**
 * Inline annotation rendered beneath a message bubble once it has been
 * translated. The original message text is always kept visible; this block
 * simply adds the translated text so people can read the content in their
 * preferred language without leaving the conversation. Dismissible per message.
 */
export function MessageTranslationAnnotation() {
  const { message } = useMessageContext('MessageTranslationAnnotation');
  const { getTranslation, hideTranslation } = useMessageTranslation();
  const state = getTranslation(message?.id);

  if (!state || state.hidden) return null;

  if (state.error && !state.translatedText) {
    return (
      <div className="px-2 pt-1">
        <p className="text-xs font-medium text-red-600">{state.error}</p>
      </div>
    );
  }

  if (state.loading && !state.translatedText) {
    return (
      <div className="px-2 pt-1">
        <p className="text-[11px] text-slate-400">Translating…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 px-2 pt-1">
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
        <p className="text-sm leading-relaxed text-slate-700">
          {state.translatedText}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Translated to {languageLabel(state.targetLanguage)}
            {state.sourceLanguage
              ? ` · from ${languageLabel(state.sourceLanguage)}`
              : ''}
          </p>
          <button
            type="button"
            onClick={() => message?.id && hideTranslation(message.id)}
            aria-label="Hide translation"
            className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
          >
            <IconClose width={12} height={12} />
          </button>
        </div>
      </div>
    </div>
  );
}