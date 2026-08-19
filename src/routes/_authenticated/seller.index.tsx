import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { brl, rarityClass, statusClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/seller/")({
  head: () => ({
    meta: [
      { title: "Painel do vendedor — Brainrot Market" },
      { name: "description", content: "Gerencie seus anúncios de Brainrots, acompanhe vendas e publique novos itens." },
      { property: "og:title", content: "Painel do vendedor — Brainrot Market" },
      { property: "og:description", content: "Gerencie anúncios e acompanhe suas vendas." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SellerPage,
});

function SellerPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: listings } = useQuery({
    queryKey: ["seller-listings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").eq("seller_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["seller-sales", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("amount, status").eq("seller_id", user!.id);
      return data ?? [];
    },
  });

  const revenue = (sales ?? []).filter((s) => s.status === "COMPLETED").reduce((a, s) => a + Number(s.amount), 0);

  async function toggleStatus(id: string, status: string) {
    const next = status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const { error } = await supabase.from("listings").update({ status: next }).eq("id", id);
    if (error) { toast.error("Não foi possível atualizar o anúncio."); return; }
    queryClient.invalidateQueries({ queryKey: ["seller-listings"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) { toast.error("Não foi possível excluir o anúncio."); return; }
    toast.success("Anúncio excluído.");
    queryClient.invalidateQueries({ queryKey: ["seller-listings"] });
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Painel do vendedor</h1>
            <p className="mt-1 text-muted-foreground">Gerencie seus anúncios e vendas.</p>
          </div>
          <Button asChild><Link to="/seller/listings/create"><Plus className="mr-2 size-4" /> Novo anúncio</Link></Button>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <Card className="p-5"><p className="text-sm text-muted-foreground">Anúncios</p><p className="text-2xl font-bold">{listings?.length ?? 0}</p></Card>
          <Card className="p-5"><p className="text-sm text-muted-foreground">Vendas</p><p className="text-2xl font-bold">{sales?.length ?? 0}</p></Card>
          <Card className="p-5"><p className="text-sm text-muted-foreground">Receita concluída</p><p className="text-2xl font-bold text-success">{brl(revenue)}</p></Card>
        </div>

        <Card className="mt-8 p-6">
          <h2 className="mb-4 text-lg font-semibold">Meus anúncios</h2>
          {listings && listings.length ? (
            <ul className="divide-y divide-border/60">
              {listings.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{l.name}</p>
                    <div className="mt-1 flex gap-2">
                      <Badge variant="outline" className={rarityClass(l.rarity)}>{l.rarity}</Badge>
                      <Badge variant="outline" className={statusClass(l.status)}>{l.status}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{brl(l.price)}</span>
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(l.id, l.status)}>{l.status === "ACTIVE" ? "Pausar" : "Ativar"}</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(l.id)}>Excluir</Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">os anuncios publicados não estão aparecendo no site.</p>
          )}
        </Card>
      </div>
    </SiteLayout>
  );
}
