import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Landmark, LogOut, Menu, Search, Wallet } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useNotifications, useProfile, useRoles, useWallet } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "@/lib/format";
import logoAsset from "@/assets/logo.png.asset.json";

export function Header() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: wallet } = useWallet();
  const { isAdmin, isSeller } = useRoles();
  const { data: notifications } = useNotifications();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);

  const unread = (notifications ?? []).filter((n) => !n.is_read).length;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/marketplace", search: term ? { q: term } : {} });
  };

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const markRead = async () => {
    if (!user || unread === 0) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const nav = (
    <>
      <Link to="/marketplace" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        Marketplace
      </Link>
      <Link to="/seller" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        Vender
      </Link>
      <Link to="/orders" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        Pedidos
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-6">
            <nav className="mt-8 flex flex-col gap-4" onClick={() => setOpen(false)}>
              {nav}
              <Link to="/wallet" className="text-sm font-medium text-muted-foreground">Carteira</Link>
              <Link to="/favorites" className="text-sm font-medium text-muted-foreground">Favoritos</Link>
              {isAdmin && <Link to="/admin" className="text-sm font-medium text-muted-foreground">Admin</Link>}
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative size-10 overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 p-0.5 transition-transform group-hover:scale-105">
            <img 
              src={logoAsset.url} 
              alt="Brainrot Market" 
              className="size-full rounded-[10px] object-cover"
            />
          </div>
          <span className="hidden text-lg font-black tracking-tighter sm:block uppercase">
            Brainrot<span className="text-primary">Market</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-5 md:flex">{nav}</nav>

        <form onSubmit={submitSearch} className="relative ml-auto hidden max-w-xs flex-1 lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Pesquisar Brainrot..."
            className="pl-9"
            maxLength={80}
          />
        </form>

        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          {user ? (
            <>
              <Link to="/wallet" className="hidden items-center gap-3 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold sm:flex">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1.5 leading-none" title="Saldo de Depósito">
                    <Wallet className="size-3 text-primary" />
                    <span className="text-[11px] font-bold">{brl(wallet?.balance ?? 0)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 leading-none" title="Saldo de Vendas (Sacável)">
                    <Landmark className="size-3 text-success" />
                    <span className="text-[11px] font-bold text-success">{brl(wallet?.withdrawable_balance ?? 0)}</span>
                  </div>
                </div>
              </Link>

              <DropdownMenu onOpenChange={(o) => o && markRead()}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
                    <Bell className="size-5" />
                    {unread > 0 && (
                      <Badge className="absolute -right-0.5 -top-0.5 size-5 justify-center rounded-full p-0 text-[10px]">
                        {unread}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(notifications ?? []).length === 0 && (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nenhuma notificação.</p>
                  )}
                  {(notifications ?? []).slice(0, 8).map((n) => (
                    <div key={n.id} className="px-2 py-2">
                      <p className="text-sm">{n.message}</p>
                      <p className="text-xs text-muted-foreground">{dateBR(n.created_at)}</p>
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Conta">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
                        {(profile?.username ?? user.email ?? "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{profile?.username ?? user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/dashboard">Painel</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/wallet">Carteira</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/orders">Pedidos</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/favorites">Favoritos</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/disputes">Disputas</Link></DropdownMenuItem>
                  {isSeller && <DropdownMenuItem asChild><Link to="/seller">Painel de vendedor</Link></DropdownMenuItem>}
                  {isAdmin && <DropdownMenuItem asChild><Link to="/admin">Admin</Link></DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 size-4" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/login">Entrar</Link></Button>
              <Button asChild size="sm"><Link to="/register">Criar conta</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
