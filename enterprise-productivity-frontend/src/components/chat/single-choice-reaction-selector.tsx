'use client';

import { forwardRef, useCallback, type ComponentProps, type Ref } from 'react';
import {
  ReactionSelector,
  useChannelStateContext,
  useMessageContext,
} from 'stream-chat-react';

function SingleChoiceReactionSelectorInner(
  props: ComponentProps<typeof ReactionSelector>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ref: Ref<HTMLDivElement>,
) {
  const { message } = useMessageContext('SingleChoiceReactionSelector');
  const { channel } = useChannelStateContext('SingleChoiceReactionSelector');

  const ownReactions = message.own_reactions ?? [];
  const messageId = message.id;

  const handleReaction = useCallback(
    async (reactionType: string) => {
      const hasReactedWithType = ownReactions.some(
        (reaction) => reaction.type === reactionType,
      );

      if (hasReactedWithType) {
        await channel.deleteReaction(messageId, reactionType);
        return;
      }

      // enforce_unique replaces any existing reaction from this user with the
      // new one, guaranteeing at most one active reaction per user per message.
      await channel.sendReaction(
        messageId,
        { type: reactionType },
        { enforce_unique: true },
      );
    },
    [channel, messageId, ownReactions],
  );

  return <ReactionSelector {...props} handleReaction={handleReaction} />;
}

export const SingleChoiceReactionSelector = forwardRef(
  SingleChoiceReactionSelectorInner,
);

SingleChoiceReactionSelector.displayName = 'SingleChoiceReactionSelector';
