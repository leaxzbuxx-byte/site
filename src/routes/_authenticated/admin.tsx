import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  AlertTriangle, 
  Ban, 
  CheckCircle, 
  ChevronRight, 
  History, 
  Search, 
  TrendingUp, 
  Users, 
  WalletCards 
} from "lucide-react";
import { useState } from "react";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useAuth";
import { brl, dateBR, statusClass } from "@/lib/format";
import { banUser } from "@/lib/admin.functions";
import { useServerFn } from "@tanstack/react-start";


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administração — Brainrot Market" },
      { name: "description", content: "Painel administrativo para moderar anúncios, pedidos e disputas do Brainrot Market." },
      { property: "og:title", content: "Administração — Brainrot Market" },
      { property: "og:description", content: "Modere anúncios, pedidos e disputas." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, isLoading } = useRoles();
  const queryClient = useQueryClient();

  const { data: listings } = useQuery({
    queryKey: ["admin-listings"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("listings").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const { data: orders } = useQuery({
    queryKey: ["admin-orders"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const { data: transactions } = useQuery({
    queryKey: ["admin-transactions"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const { data: logs } = useQuery({
    queryKey: ["admin-logs"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("profiles").select("*").limit(100)).data ?? [],
  });
  const banUserFn = useServerFn(banUser);

  if (isLoading) return <SiteLayout><div className="p-16 text-center text-muted-foreground">Carregando...</div></SiteLayout>;
  if (!isAdmin) return <SiteLayout><div className="p-16 text-center text-muted-foreground">Acesso restrito a administradores.</div></SiteLayout>;

  const totalVolume = (transactions ?? []).filter(t => t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0);

  async function handleBan(userId: string) {
    await banUserFn({ data: { userId, reason: "Banimento administrativo via Painel" } });
    toast.success("Usuário banido.");
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold mb-8">Painel Administrativo</h1>
        
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Volume Movimentado</p>
            <p className="text-2xl font-bold text-primary">{brl(totalVolume)}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Pedidos Totais</p>
            <p className="text-2xl font-bold">{orders?.length ?? 0}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Usuários</p>
            <p className="text-2xl font-bold">{users?.length ?? 0}</p>
          </Card>
        </div>

        <Tabs defaultValue="transactions" className="mt-6">
          <TabsList>
            <TabsTrigger value="transactions">Financeiro</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="listings">Anúncios</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-5">
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Transações Recentes</h3>
              <ul className="divide-y divide-border/60">
                {(transactions ?? []).map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <WalletCards className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">{t.type}</p>
                        <p className="text-xs text-muted-foreground">{dateBR(t.created_at)}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={statusClass(t.status)}>{t.status}</Badge>
                    <span className="font-semibold">{brl(t.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-5">
            <Card className="p-5">
              <ul className="divide-y divide-border/60">
                {(users ?? []).map((u) => (
                  <li key={u.id} className="flex items-center justify-between py-3">
                    <span className="text-sm">{u.username ?? u.full_name ?? u.id}</span>
                    <Button size="sm" variant="destructive" onClick={() => handleBan(u.id)}>Banir</Button>
                  </li>
                ))}
              </ul>
            </Card>
          </TabsContent>
          
          <TabsContent value="listings" className="mt-5">
            <Card className="p-5">
              <ul className="divide-y divide-border/60">
                {(listings ?? []).map((l) => (
                  <li key={l.id} className="flex justify-between py-3">
                    <div>
                      <p className="font-medium">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.rarity}</p>
                    </div>
                    <Badge variant="outline" className={statusClass(l.status)}>{l.status}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </TabsContent>
          
          
          <TabsContent value="logs" className="mt-5">
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Logs de Atividade</h3>
              <ul className="divide-y divide-border/60">
                {(logs ?? []).map((log) => (
                  <li key={log.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{log.action}</span>
                      <span className="text-xs text-muted-foreground">{dateBR(log.created_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Alvo: {log.target_user_id}
                    </p>
                    {log.metadata && (
                      <pre className="text-[10px] mt-1 bg-muted p-1 rounded overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}
