"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Menu } from "lucide-react";

// Native <details> keeps the menu keyboard-accessible without a library.
// This wrapper adds the two behaviours a native disclosure does not provide:
// close after following a link, and close on Escape with focus returned.
export function CampusMenu({ children }: { children: ReactNode }) {
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = details.current;
    if (!node) return;

    const close = () => node.removeAttribute("open");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && node.open) {
        event.preventDefault();
        close();
        summary.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (node.open && !node.contains(event.target as Node)) close();
    };
    const links = Array.from(node.querySelectorAll("a"));
    for (const link of links) link.addEventListener("click", close);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      for (const link of links) link.removeEventListener("click", close);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <details className="campus-menu" ref={details}>
      <summary ref={summary}>
        <Menu size={18} aria-hidden="true" />
        Menu
      </summary>
      <nav aria-label="Campus navigation">{children}</nav>
    </details>
  );
}
