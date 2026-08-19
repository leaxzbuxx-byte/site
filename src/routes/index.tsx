import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Star, Zap } from "lucide-react";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { ListingCard, type ListingRow } from "@/components/marketplace/ListingCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { RARITIES, rarityClass } from "@/lib/format";
import logoAsset from "@/assets/logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brainrot Market — Compre e venda seus Brainrots" },
      { name: "description", content: "Marketplace rápido e seguro para negociação de Brainrots, com carteira interna, depósito PIX e proteção ao comprador." },
      { property: "og:title", content: "Brainrot Market — Compre e venda seus Brainrots" },
      { property: "og:description", content: "Marketplace rápido e seguro para negociação de Brainrots." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function useListings(limit: number) {
  return useQuery({
    queryKey: ["home-listings", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("*, seller:seller_id(*)")
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data ?? []) as unknown as ListingRow[];
    },
  });
}

function useTopSellers() {
  return useQuery({
    queryKey: ["home-sellers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seller_profiles")
        .select("*, profiles:user_id(username)")
        .eq("status", "APPROVED")
        .order("total_sales", { ascending: false })
        .limit(4);
      return data ?? [];
    },
  });
}

function Home() {
  const { data: listings, isLoading } = useListings(8);
  const { data: sellers } = useTopSellers();

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 py-16 md:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Badge variant="outline" className="mb-5 border-primary/40 bg-primary/10 text-primary">
              Steal a Brainrot · Roblox
            </Badge>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Compre e venda seus{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Brainrots</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Marketplace rápido e seguro para negociação de Brainrots.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/marketplace">Comprar Brainrots</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/seller/listings/create">Vender Brainrots</Link></Button>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, title: "Pagamento protegido", text: "Valor liberado após confirmação" },
                { icon: Zap, title: "Depósito PIX", text: "Saldo instantâneo na carteira" },
                { icon: Star, title: "Vendedores avaliados", text: "Reputação pública e transparente" },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-xl border border-border/70 bg-card/50 p-4">
                  <Icon className="mb-2 size-5 text-primary" />
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/25 via-card to-accent/25 glow-card">
              <img 
                src={logoAsset.url} 
                alt="Logo" 
                className="size-full object-contain p-4"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14">
        <h2 className="mb-5 text-2xl font-bold">Categorias populares</h2>
        <div className="flex flex-wrap gap-3">
          {RARITIES.map((rarity) => (
            <Link key={rarity} to="/marketplace" search={{ rarity }}>
              <Badge variant="outline" className={`border px-4 py-2 text-sm ${rarityClass(rarity)}`}>{rarity}</Badge>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Brainrots em destaque</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/marketplace">Ver tudo</Link></Button>
        </div>
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        ) : listings && listings.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        ) : (
          <Card className="p-10 text-center text-muted-foreground">
            os anuncios publicados não estão aparecendo no site. Seja o primeiro a{" "}
            <Link to="/seller/listings/create" className="text-primary underline">anunciar um Brainrot</Link>.
          </Card>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <h2 className="mb-5 text-2xl font-bold">Vendedores em destaque</h2>
        {sellers && sellers.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {sellers.map((s: any) => (
              <Card key={s.id} className="p-5 text-center">
                <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-primary/20 text-lg font-bold text-primary">
                  {(s.profiles?.username ?? s.display_name ?? "??").slice(0, 2).toUpperCase()}
                </div>
                <p className="font-semibold">{s.profiles?.username ?? s.display_name}</p>
                <p className="text-sm text-muted-foreground">{s.total_sales} vendas</p>
                <p className="text-sm text-warning">★ {Number(s.completion_rate).toFixed(0)}% conclusão</p>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-10 text-center text-muted-foreground">Ainda não há vendedores aprovados.</Card>
        )}
      </section>
    </SiteLayout>
  );
}
