import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dateBR, statusClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/disputes")({
  head: () => ({
    meta: [
      { title: "Disputas e suporte — Brainrot Market" },
      { name: "description", content: "Acompanhe o andamento das disputas abertas nos seus pedidos e fale com o suporte." },
      { property: "og:title", content: "Disputas e suporte — Brainrot Market" },
      { property: "og:description", content: "Acompanhe o andamento das suas disputas." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DisputesPage,
});

function DisputesPage() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["disputes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("disputes").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold">Disputas</h1>
        <p className="mt-1 text-muted-foreground">Abra uma disputa a partir de um pedido em "Pedidos".</p>
        <div className="mt-8 space-y-4">
          {data && data.length ? data.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{d.reason}</p>
                <Badge variant="outline" className={statusClass(d.status)}>{d.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{d.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">Aberta em {dateBR(d.created_at)}</p>
            </Card>
          )) : <Card className="p-14 text-center text-muted-foreground">Nenhuma disputa aberta.</Card>}
        </div>
      </div>
    </SiteLayout>
  );
}
