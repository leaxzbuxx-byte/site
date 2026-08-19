import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Header } from "./Header";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/70 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Brainrot Market. Plataforma independente de negociação entre jogadores.</p>
          <div className="flex gap-4">
            <Link to="/marketplace" className="hover:text-foreground">Marketplace</Link>
            <Link to="/seller" className="hover:text-foreground">Vender</Link>
            <Link to="/disputes" className="hover:text-foreground">Suporte</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
