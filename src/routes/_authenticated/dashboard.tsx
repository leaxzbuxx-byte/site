import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Package, Store, Wallet } from "lucide-react";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile, useWallet } from "@/hooks/useAuth";
import { ORDER_STATUS_LABEL, brl, dateBR, statusClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Meu painel — Brainrot Market" },
      { name: "description", content: "Resumo da sua carteira, pedidos recentes e atalhos do Brainrot Market." },
      { property: "og:title", content: "Meu painel — Brainrot Market" },
      { property: "og:description", content: "Resumo da sua carteira e pedidos recentes." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: wallet } = useWallet();

  const { data: orders } = useQuery({
    queryKey: ["dashboard-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, listings:listing_id(name)")
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []) as any[];
    },
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold">Olá, {profile?.username ?? "jogador"}!</h1>
        <p className="mt-1 text-muted-foreground">Aqui está o resumo da sua conta.</p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5">
            <Wallet className="mb-2 size-5 text-primary" />
            <p className="text-sm text-muted-foreground">Saldo disponível</p>
            <p className="text-2xl font-bold">{brl(wallet?.balance ?? 0)}</p>
            <Button asChild size="sm" className="mt-3 w-full"><Link to="/wallet/deposit">Depositar</Link></Button>
          </Card>
          <Card className="p-5">
            <Wallet className="mb-2 size-5 text-warning" />
            <p className="text-sm text-muted-foreground">Saldo pendente</p>
            <p className="text-2xl font-bold">{brl(wallet?.pending_balance ?? 0)}</p>
          </Card>
          <Card className="p-5">
            <Package className="mb-2 size-5 text-accent" />
            <p className="text-sm text-muted-foreground">Pedidos</p>
            <p className="text-2xl font-bold">{orders?.length ?? 0}</p>
            <Button asChild size="sm" variant="outline" className="mt-3 w-full"><Link to="/orders">Ver pedidos</Link></Button>
          </Card>
          <Card className="p-5">
            <Store className="mb-2 size-5 text-success" />
            <p className="text-sm text-muted-foreground">Vender</p>
            <p className="text-sm">Anuncie seus Brainrots</p>
            <Button asChild size="sm" variant="outline" className="mt-3 w-full"><Link to="/seller">Painel de vendedor</Link></Button>
          </Card>
        </div>

        <Card className="mt-8 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pedidos recentes</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/orders">Ver todos</Link></Button>
          </div>
          {orders && orders.length ? (
            <ul className="divide-y divide-border/60">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{o.listings?.name ?? "Item"}</p>
                    <p className="text-xs text-muted-foreground">{dateBR(o.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={statusClass(o.status)}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</Badge>
                    <span className="font-semibold">{brl(o.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Você ainda não fez pedidos. <Link to="/marketplace" className="text-primary underline">Explorar marketplace</Link>
            </p>
          )}
        </Card>

        <Card className="mt-6 flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <Heart className="size-5 text-destructive" />
            <span className="font-medium">Seus favoritos</span>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/favorites">Abrir</Link></Button>
        </Card>
      </div>
    </SiteLayout>
  );
}
