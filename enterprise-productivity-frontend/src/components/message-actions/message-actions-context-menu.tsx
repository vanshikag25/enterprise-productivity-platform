'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ContextMenu as StreamContextMenu,
  ContextMenuContent,
  DialogPortalEntry,
  useDialogIsOpen,
} from 'stream-chat-react';
import type { ComponentProps, CSSProperties } from 'react';

type ContextMenuProps = ComponentProps<typeof StreamContextMenu>;

const MESSAGE_ACTIONS_CLASS = 'str-chat__message-actions-box';
const MAX_HEIGHT_VAR = '--str-chat-message-actions-max-height';
const MAX_MENU_HEIGHT = 26 * 16; // 416px
const MENU_OFFSET = 8;
const VIEWPORT_MARGIN = 8;
const MENU_Z_INDEX = 75;
const HIDDEN_LEFT = -10000;

type MenuLayout = {
  top: number;
  left: number;
  maxHeight: number;
  maxWidth: number;
};

/**
 * Anchor/dialog props that belong to the SDK's ContextMenu/DialogAnchor layer.
 * They must not be forwarded to ContextMenuContent (they would otherwise be
 * rendered as unknown DOM attributes on the menu root).
 */
const ANCHOR_PROP_KEYS = [
  'id',
  'dialogManagerId',
  'placement',
  'referenceElement',
  'tabIndex',
  'trapFocus',
  'focus',
  'closeTransitionMs',
  'offset',
  'closeOnClickOutside',
  'allowFlip',
] as const;

function isMessageActionsMenu(className: unknown): boolean {
  return (
    typeof className === 'string' &&
    className.split(/\s+/).includes(MESSAGE_ACTIONS_CLASS)
  );
}

function getViewportSize(): { width: number; height: number } {
  const visualViewport = window.visualViewport;
  return {
    width: visualViewport?.width ?? window.innerWidth,
    height: visualViewport?.height ?? window.innerHeight,
  };
}

/**
 * Positions the menu fully inside the visible viewport.
 *
 * - Vertically: opens downward whenever there is at least as much space below
 *   the "..." button as above; otherwise opens upward. The menu height is
 *   capped to the space available in the chosen direction so it scrolls
 *   internally instead of overflowing.
 * - Horizontally: keeps the SDK alignment (right-aligned for outgoing,
 *   left-aligned for incoming messages) but clamps the position so the menu
 *   never crosses either viewport edge. When there is not enough room on the
 *   right it is repositioned to the left (and vice versa).
 */
function computeMenuLayout(
  buttonRect: DOMRect,
  viewport: { width: number; height: number },
  menuWidth: number,
  menuHeight: number,
  originalPlacement: ContextMenuProps['placement'],
): MenuLayout {
  const spaceBelow = viewport.height - buttonRect.bottom;
  const spaceAbove = buttonRect.top;
  const openBelow = spaceBelow >= spaceAbove;

  const availableVertical = openBelow ? spaceBelow : spaceAbove;
  const maxHeight = Math.min(
    MAX_MENU_HEIGHT,
    Math.max(0, availableVertical - MENU_OFFSET - VIEWPORT_MARGIN),
  );

  const rawTop = openBelow
    ? buttonRect.bottom + MENU_OFFSET
    : buttonRect.top - MENU_OFFSET - menuHeight;
  const top = Math.max(
    VIEWPORT_MARGIN,
    Math.min(rawTop, viewport.height - VIEWPORT_MARGIN - maxHeight),
  );

  const maxWidth = Math.max(0, viewport.width - 2 * VIEWPORT_MARGIN);
  const effectiveWidth = Math.min(menuWidth, maxWidth);

  const alignEnd =
    typeof originalPlacement === 'string' && originalPlacement.endsWith('-end');
  const rawLeft = alignEnd ? buttonRect.right - effectiveWidth : buttonRect.left;
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(rawLeft, viewport.width - effectiveWidth - VIEWPORT_MARGIN),
  );

  return { top, left, maxHeight, maxWidth };
}

function MessageActionsContextMenuInner(props: ContextMenuProps) {
  const { id, dialogManagerId, placement, referenceElement, onClose } = props;
  const isOpen = useDialogIsOpen(id ?? '', dialogManagerId);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<MenuLayout | null>(null);
  const wasOpenRef = useRef(false);
  const rafRef = useRef(0);

  const reposition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Safety net: never leave the menu hidden if we have no anchor to measure.
    if (!(referenceElement instanceof HTMLElement)) {
      setLayout((prev) =>
        prev ?? {
          top: VIEWPORT_MARGIN,
          left: VIEWPORT_MARGIN,
          maxHeight: MAX_MENU_HEIGHT,
          maxWidth: getViewportSize().width - 2 * VIEWPORT_MARGIN,
        },
      );
      return;
    }

    const buttonRect = referenceElement.getBoundingClientRect();
    const viewport = getViewportSize();

    // The anchor scrolled out of view while the menu was open - dismiss it
    // rather than leaving a detached floating menu behind.
    if (buttonRect.bottom < 0 || buttonRect.top > viewport.height) {
      onClose?.();
      return;
    }

    const menuRect = container.getBoundingClientRect();
    const next = computeMenuLayout(
      buttonRect,
      viewport,
      menuRect.width,
      menuRect.height,
      placement,
    );
    setLayout((prev) =>
      prev &&
      prev.top === next.top &&
      prev.left === next.left &&
      prev.maxHeight === next.maxHeight
        ? prev
        : next,
    );
  }, [onClose, placement, referenceElement]);

  // Position the menu and re-evaluate on scroll/resize and whenever the menu
  // content resizes (e.g. a submenu swaps in with different dimensions). The
  // menu starts hidden and is only revealed once `reposition` has run, so the
  // first positioning pass never flashes a mis-placed or clipped menu.
  useEffect(() => {
    if (!isOpen) return;

    let observer: ResizeObserver | null = null;
    const scheduleTick = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(reposition);
    };

    const container = containerRef.current;
    if (typeof ResizeObserver !== 'undefined' && container) {
      observer = new ResizeObserver(scheduleTick);
      observer.observe(container);
    }

    window.addEventListener('resize', scheduleTick);
    window.addEventListener('scroll', scheduleTick, true);
    scheduleTick();

    return () => {
      cancelAnimationFrame(rafRef.current);
      observer?.disconnect();
      window.removeEventListener('resize', scheduleTick);
      window.removeEventListener('scroll', scheduleTick, true);
    };
  }, [isOpen, reposition]);

  // Focus the first menu item so keyboard navigation works from the start.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const items = containerRef.current?.querySelectorAll(
      '[role="menuitem"]:not(:disabled)',
    );
    (items?.[0] as HTMLElement | undefined)?.focus();
  }, [isOpen]);

  // Restore focus to the "..." button when the menu closes and reset the
  // cached layout so the next open starts hidden instead of flashing the
  // previous position.
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      return;
    }
    if (wasOpenRef.current && referenceElement instanceof HTMLElement) {
      referenceElement.focus();
    }
    wasOpenRef.current = false;
    const rafId = requestAnimationFrame(() => setLayout(null));
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, referenceElement]);

  // Dismiss on outside pointer-down, and on Escape once focus leaves the menu
  // (Escape is handled by the menu itself while focus is inside it).
  useEffect(() => {
    if (!isOpen) return;

    // Interactions inside another dialog portal (e.g. the SDK's
    // delete-confirmation modal opened from this menu, which renders at the
    // chat root rather than in this menu's subtree) must NOT dismiss the menu:
    // unmounting it would also unmount that modal mid-interaction.
    const isInsideDialogPortal = (target: Node) =>
      target instanceof Element &&
      target.closest('[data-str-chat__portal-id]') !== null;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target)) return;
      if (
        referenceElement instanceof HTMLElement &&
        referenceElement.contains(target)
      ) {
        return;
      }
      if (isInsideDialogPortal(target)) return;
      onClose?.();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const target = event.target;
      if (target instanceof Node && containerRef.current?.contains(target)) {
        return;
      }
      if (target instanceof Node && isInsideDialogPortal(target)) return;
      onClose?.();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose, referenceElement]);

  if (!isOpen) return null;

  const contentProps = {} as Record<string, unknown>;
  for (const key of Object.keys(props)) {
    if (!(ANCHOR_PROP_KEYS as readonly string[]).includes(key)) {
      contentProps[key] = (props as Record<string, unknown>)[key];
    }
  }

  const wrapperStyle: CSSProperties & Record<string, string | number | undefined> = {
    position: 'fixed',
    top: layout ? layout.top : 0,
    left: layout ? layout.left : HIDDEN_LEFT,
    visibility: layout ? 'visible' : 'hidden',
    pointerEvents: layout ? undefined : 'none',
    zIndex: MENU_Z_INDEX,
    maxWidth: layout ? layout.maxWidth : `calc(100vw - ${2 * VIEWPORT_MARGIN}px)`,
  };
  if (layout) {
    // Scoped to this menu instance; the inner `.str-chat__context-menu`
    // (which also carries the `.str-chat__message-actions-box` class) inherits
    // it and scrolls internally instead of overflowing the viewport.
    wrapperStyle[MAX_HEIGHT_VAR] = `${layout.maxHeight}px`;
  }

  return (
    <DialogPortalEntry dialogId={id ?? ''} dialogManagerId={dialogManagerId}>
      <div
        ref={containerRef}
        className="str-chat str-chat__dialog-contents"
        data-str-chat-placement={placement}
        style={wrapperStyle}
      >
        <ContextMenuContent
          {...(contentProps as ComponentProps<typeof ContextMenuContent>)}
          anchorReferenceElement={referenceElement ?? null}
        />
      </div>
    </DialogPortalEntry>
  );
}

function MessageActionsContextMenu(props: ContextMenuProps) {
  if (
    !isMessageActionsMenu(props.className) ||
    !props.placement?.startsWith('top')
  ) {
    return <StreamContextMenu {...props} />;
  }
  return <MessageActionsContextMenuInner {...props} />;
}

export { MessageActionsContextMenu };