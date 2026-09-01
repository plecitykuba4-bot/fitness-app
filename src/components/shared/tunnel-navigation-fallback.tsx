"use client";

import { useEffect } from "react";

/**
 * Bezplatné SSH tunely nepředávají vždy správně odpovědi pro Next.js klientskou
 * navigaci (RSC). Pro sdílenou lokální ukázku proto interní odkazy načteme
 * klasicky. Na localhostu ani produkční doméně se komponenta vůbec neaktivuje.
 */
export function TunnelNavigationFallback() {
  useEffect(() => {
    if (!window.location.hostname.endsWith(".serveousercontent.com")) return;

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;

      const target = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a[href]")
        : null;
      if (!target || target.target || target.hasAttribute("download")) return;

      const url = new URL(target.href, window.location.href);
      if (url.origin !== window.location.origin || url.href === window.location.href) return;

      event.preventDefault();
      window.location.assign(url.href);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
