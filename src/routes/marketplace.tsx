import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { ListingCard, type ListingRow } from "@/components/marketplace/ListingCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { RARITIES } from "@/lib/format";

type Search = { q?: string; rarity?: string; sort?: string; min?: number; max?: number; page?: number };

function clean(input: Record<string, unknown>): Search {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null && value !== "") out[key] = value;
  }
  return out as Search;
}

export const Route = createFileRoute("/marketplace")({
  validateSearch: (search: Record<string, unknown>): Search =>
    clean({
      q: typeof search['q'] === "string" ? search['q'] : undefined,
      rarity: typeof search['rarity'] === "string" ? search['rarity'] : undefined,
      sort: typeof search['sort'] === "string" ? search['sort'] : undefined,
      min: search['min'] ? Number(search['min']) : undefined,
      max: search['max'] ? Number(search['max']) : undefined,
      page: search['page'] ? Number(search['page']) : undefined,
    }),
  head: () => ({
    meta: [
      { title: "Marketplace de Brainrots — Brainrot Market" },
      { name: "description", content: "Explore, filtre e compre Brainrots por raridade, mutação e preço com entrega acompanhada pela plataforma." },
      { property: "og:title", content: "Marketplace de Brainrots" },
      { property: "og:description", content: "Explore, filtre e compre Brainrots por raridade, mutação e preço." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Marketplace,
});

const PAGE_SIZE = 12;

function Marketplace() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/marketplace" });
  const queryClient = useQueryClient();
  const [term, setTerm] = useState(search['q'] ?? "");

  useEffect(() => {
    const timer = setTimeout(() => {
      if ((search['q'] ?? "") !== term) {
        navigate({ search: (prev) => clean({ ...prev, q: term || undefined, page: undefined }) });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [term]); // eslint-disable-line react-hooks/exhaustive-deps

  const page = search['page'] ?? 1;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["marketplace", search],
    queryFn: async () => {
      let query = supabase
        .from("listings")
        .select("*, seller:seller_id(*)", { count: "exact" })
        .eq("status", "ACTIVE");

      if (search['q']) query = query.or(`name.ilike.%${search['q']}%,mutation.ilike.%${search['q']}%,rarity.ilike.%${search['q']}%`);
      if (search['rarity']) query = query.eq("rarity", search['rarity']);
      if (search['min'] !== undefined) query = query.gte("price", search['min']);
      if (search['max'] !== undefined) query = query.lte("price", search['max']);

      if (search['sort'] === "price_asc") query = query.order("price", { ascending: true });
      else if (search['sort'] === "price_desc") query = query.order("price", { ascending: false });
      else query = query.order("created_at", { ascending: false });

      const from = (page - 1) * PAGE_SIZE;
      const { data: rows, count, error } = await query.range(from, from + PAGE_SIZE - 1);
      
      if (error) throw error;
      
      return { rows: (rows ?? []) as unknown as ListingRow[], count: count ?? 0 };
    },
    retry: 1,
  });

  useEffect(() => {
    const channel = supabase
      .channel("marketplace-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listings",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["marketplace"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));

  const setSearch = (patch: Record<string, unknown>) =>
    navigate({ search: (prev) => clean({ ...prev, ...patch, page: undefined }) });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-bold">Marketplace</h1>
        <p className="mt-1 text-muted-foreground">Encontre o Brainrot perfeito para sua conta.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          <Card className="h-fit p-5">
            <div className="mb-4 flex items-center gap-2 font-semibold">
              <SlidersHorizontal className="size-4" /> Filtros
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="q">Pesquisar</Label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="q" value={term} maxLength={80} onChange={(e) => setTerm(e.target.value)} placeholder="Pesquisar Brainrot..." className="pl-9" />
                </div>
              </div>
              <div>
                <Label>Raridade</Label>
                <Select value={search['rarity'] ?? "all"} onValueChange={(v) => setSearch({ rarity: v === "all" ? undefined : v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {RARITIES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="min">Preço mín.</Label>
                  <Input id="min" type="number" min={0} defaultValue={search['min'] ?? ""} onBlur={(e) => setSearch({ min: e.target.value ? Number(e.target.value) : undefined })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="max">Preço máx.</Label>
                  <Input id="max" type="number" min={0} defaultValue={search['max'] ?? ""} onBlur={(e) => setSearch({ max: e.target.value ? Number(e.target.value) : undefined })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Ordenação</Label>
                <Select value={search['sort'] ?? "recent"} onValueChange={(v) => setSearch({ sort: v === "recent" ? undefined : v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Mais recentes</SelectItem>
                    <SelectItem value="price_asc">Menor preço</SelectItem>
                    <SelectItem value="price_desc">Maior preço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setTerm(""); navigate({ search: {} }); }}>
                Limpar filtros
              </Button>
            </div>
          </Card>

          <div>
            {isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-3 rounded-xl border border-border/70 p-4">
                    <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="mt-auto flex items-center justify-between">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <Card className="flex flex-col items-center justify-center p-14 text-center">
                <div className="mb-4 rounded-full bg-destructive/10 p-3 text-destructive">
                  <SlidersHorizontal className="size-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Erro ao carregar anúncios</h3>
                <p className="max-w-md text-muted-foreground">
                  {error instanceof Error ? error.message : "Ocorreu um problema ao buscar os itens. Por favor, tente novamente."}
                </p>
                <Button variant="outline" className="mt-6" onClick={() => queryClient.invalidateQueries({ queryKey: ["marketplace"] })}>
                  Tentar novamente
                </Button>
              </Card>
            ) : data && data.rows.length > 0 ? (
              <>
                <p className="mb-4 text-sm text-muted-foreground">{data.count} anúncios encontrados</p>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {data.rows.map((l) => <ListingCard key={l.id} listing={l} />)}
                </div>
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-3">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => navigate({ search: (p) => clean({ ...p, page: page - 1 }) })}>Anterior</Button>
                    <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => navigate({ search: (p) => clean({ ...p, page: page + 1 }) })}>Próxima</Button>
                  </div>
                )}
              </>
            ) : (
              <Card className="p-14 text-center text-muted-foreground">
                <p className="mb-2 text-lg font-medium">Nenhum resultado encontrado</p>
                <p>os anuncios publicados não estão aparecendo no site.</p>
                {(search['q'] || search['rarity'] || search['min'] || search['max']) && (
                  <Button variant="link" className="mt-2 text-primary" onClick={() => navigate({ search: {} })}>
                    Limpar todos os filtros
                  </Button>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
