export function scrollToMessage(messageId: string): boolean {
  const candidates = [
    document.getElementById(`message-${messageId}`),
    document.querySelector(`[data-message-id="${messageId}"]`),
    document.querySelector(`[data-testid="message-${messageId}"]`),
    document.querySelector(`[id*="${messageId}"]`),
  ];

  const el = candidates.find((c): c is HTMLElement => Boolean(c));

  if (!el) {
    console.warn(
      `[scrollToMessage] Could not find DOM element for message ${messageId}. ` +
        `Inspect a message element in DevTools and report its id/data-* attributes.`,
    );
    return false;
  }

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const previousBackground = el.style.backgroundColor;
  const previousTransition = el.style.transition;
  el.style.transition = 'background-color 0.3s ease';
  el.style.backgroundColor = '#fef08a';

  setTimeout(() => {
    el.style.backgroundColor = previousBackground;
    setTimeout(() => {
      el.style.transition = previousTransition;
    }, 300);
  }, 1200);

  return true;
}
