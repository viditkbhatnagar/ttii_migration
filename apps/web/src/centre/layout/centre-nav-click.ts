import type { MouseEvent } from 'react';

/** A plain left click on a portal link navigates in-app; modified clicks keep the browser behaviour (new tab, …). */
export function navClick(onNavigate: (href: string) => void, href: string) {
  return (event: MouseEvent<HTMLAnchorElement>): void => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(href);
  };
}
