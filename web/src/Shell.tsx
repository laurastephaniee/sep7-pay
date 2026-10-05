import { useEffect, useRef, useState, type ReactNode } from "react";

import { Link, useTitle } from "./lib/router";

const NAV = [
  ["/", "Home"],
  ["/app", "App"],
  ["/docs", "Docs"],
] as const;

const REPO = "https://github.com/laurastephaniee/sep7-pay";

function HeaderAction() {
  return (
    <a className="press press-dark inline-block" href={REPO} target="_blank" rel="noreferrer">
      GitHub ↗
    </a>
  );
}

export function Shell({ route, children }: { route: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Close on navigation; Escape closes and hands focus back to the toggle.
  useEffect(() => setOpen(false), [route]);
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b-[3px] border-tar bg-volt backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight text-tar">sep7-pay</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(([to, label]) => (
              <Link key={to} to={to} className={`border-2 px-3.5 py-1.5 text-sm font-bold ${route === to ? "border-tar bg-tar text-volt" : "border-transparent text-tar hover:border-tar"}`}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="hidden md:block">
            <HeaderAction />
          </div>
          <button className="press px-3 py-1.5 md:hidden" onClick={() => setOpen((v) => !v)} ref={toggleRef} aria-label="Menu" aria-controls="mobile-menu" aria-expanded={open}>
            {open ? "✕" : "☰"}
          </button>
        </div>
        {open && (
          <div id="mobile-menu" ref={menuRef} className="space-y-1 border-t border-tar px-5 py-4 md:hidden" onClick={() => setOpen(false)}>
            {NAV.map(([to, label]) => (
              <Link key={to} to={to} className={`block border-2 px-3.5 py-1.5 text-sm font-bold ${route === to ? "border-tar bg-tar text-volt" : "border-transparent text-tar hover:border-tar"}`}>
                {label}
              </Link>
            ))}
            <div className="pt-2">
              <HeaderAction />
            </div>
          </div>
        )}
        
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-20 border-t-[3px] border-tar bg-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="text-xl font-bold tracking-tight text-tar">sep7-pay</p>
            <p className="mt-2 max-w-xs text-sm text-graphite">Stellar payment links and QR codes that any SEP-7 wallet opens pre-filled.</p>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-tar">Product</p>
            <ul className="mt-3 space-y-2 text-graphite">
              <li><Link to="/app" className="hover:underline">App</Link></li>
              <li><Link to="/docs" className="hover:underline">Documentation</Link></li>
              <li><Link to="/docs/faq" className="hover:underline">FAQ</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-tar">Open source</p>
            <ul className="mt-3 space-y-2 text-graphite">
              <li><a href={REPO} target="_blank" rel="noreferrer" className="hover:underline">GitHub</a></li>
              
              <li><a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noreferrer" className="hover:underline">MIT license</a></li>
            </ul>
          </div>
        </div>
        <p className="pb-8 text-center text-xs text-graphite opacity-80">Payment links work on testnet and mainnet. Always double-check the destination before you share one.</p>
      </footer>
    </div>
  );
}

export function NotFound() {
  useTitle("Not found · sep7-pay");
  return (
    <section className="mx-auto max-w-xl px-5 py-28 text-center">
      <p className="text-8xl font-bold tracking-tight text-signal">404</p>
      <p className="mt-4 text-lg text-graphite">There’s nothing at this address.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/" className="press press-dark inline-block">Back home</Link>
        <Link to="/docs" className="press inline-block">Read the docs</Link>
      </div>
    </section>
  );
}
