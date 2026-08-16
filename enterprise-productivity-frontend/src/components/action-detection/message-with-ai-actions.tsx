'use client';

import {
  MessageUI,
  useMessageContext,
  type MessageUIComponentProps,
} from 'stream-chat-react';
import { AiActionCards } from './ai-action-cards';
import { MessageTranslationAnnotation } from '@/components/chat/message-translation-annotation';

/**
 * Replaces the default message UI to render AI-detected action cards beneath
 * the message bubble. Renders the stock MessageUI so all standard message
 * behaviour, actions, and styling are preserved.
 *
 * NOTE: stream-chat-react renders the MessageUI slot without props and supplies
 * the message through MessageContext, so `message` must be read from
 * `useMessageContext` rather than from props.
 */
export function MessageWithAiActions(props: MessageUIComponentProps) {
  const { message } = useMessageContext('MessageUI');
  return (
    <>
      <MessageUI {...props} />
      <AiActionCards messageId={message?.id} />
      <MessageTranslationAnnotation />
    </>
  );
}