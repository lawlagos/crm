import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { hrefFor, navigate } from '../router';
type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string; replace?: boolean; prefetch?: boolean; scroll?: boolean };
export default function Link({ href, replace, prefetch, scroll, onClick, ...props }: Props) {
  void prefetch; void scroll;
  function clicked(event: MouseEvent<HTMLAnchorElement>) { onClick?.(event); if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === '_blank' || !href.startsWith('/') || href.startsWith('/api/')) return; event.preventDefault(); navigate(href, replace); }
  return <a {...props} href={hrefFor(href)} onClick={clicked} />;
}
