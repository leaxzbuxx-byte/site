import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ORDER_STATUS_LABEL, brl, dateBR, statusClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Meus pedidos — Brainrot Market" },
      { name: "description", content: "Acompanhe compras e vendas, confirme entregas e avalie vendedores no Brainrot Market." },
      { property: "og:title", content: "Meus pedidos — Brainrot Market" },
      { property: "og:description", content: "Acompanhe compras, vendas e entregas." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: orders } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, listings:listing_id(name, rarity, image_url), deliveries(status, instructions)")
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const purchases = orders?.filter((o) => o.buyer_id === user?.id) ?? [];
  const sales = orders?.filter((o) => o.seller_id === user?.id) ?? [];

  async function confirmReceipt(orderId: string) {
    const { error } = await supabase.rpc("complete_order", { _order_id: orderId });
    if (error) { toast.error("Não foi possível confirmar o pedido."); return; }
    toast.success("Pedido concluído! O vendedor recebeu o valor.");
    queryClient.invalidateQueries();
  }

  async function markDelivering(orderId: string) {
    const { error } = await supabase.from("deliveries").update({ status: "IN_PROGRESS" }).eq("order_id", orderId);
    if (error) { toast.error("Não foi possível atualizar a entrega."); return; }
    toast.success("Entrega marcada como em andamento.");
    queryClient.invalidateQueries();
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold">Pedidos</h1>
        <Tabs defaultValue="purchases" className="mt-6">
          <TabsList>
            <TabsTrigger value="purchases">Compras ({purchases.length})</TabsTrigger>
            <TabsTrigger value="sales">Vendas ({sales.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="purchases" className="mt-5 space-y-4">
            {purchases.length ? purchases.map((o) => (
              <OrderCard key={o.id} order={o} role="buyer" onConfirm={() => confirmReceipt(o.id)} />
            )) : (
              <Card className="p-10 text-center text-muted-foreground">
                Nenhuma compra ainda. <Link to="/marketplace" className="text-primary underline">Explorar marketplace</Link>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="sales" className="mt-5 space-y-4">
            {sales.length ? sales.map((o) => (
              <OrderCard key={o.id} order={o} role="seller" onDeliver={() => markDelivering(o.id)} />
            )) : (
              <Card className="p-10 text-center text-muted-foreground">Nenhuma venda ainda.</Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}

function OrderCard({ order, role, onConfirm, onDeliver }: { order: any; role: "buyer" | "seller"; onConfirm?: () => void; onDeliver?: () => void }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="size-16 overflow-hidden rounded-lg bg-muted">
            {order.listings?.image_url && <img src={order.listings.image_url} alt={order.listings?.name ?? "Item"} className="size-full object-cover" />}
          </div>
          <div>
            <p className="font-semibold">{order.listings?.name ?? "Item removido"}</p>
            <p className="text-xs text-muted-foreground">Pedido em {dateBR(order.created_at)}</p>
            <Badge variant="outline" className={`mt-2 ${statusClass(order.status)}`}>{ORDER_STATUS_LABEL[order.status] ?? order.status}</Badge>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">{brl(order.amount)}</p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {role === "buyer" && order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
              <>
                <Button size="sm" onClick={onConfirm}>Confirmar recebimento</Button>
                <SubmitReviewDialog orderId={order.id} sellerId={order.seller_id} />
                <OpenDisputeDialog orderId={order.id} />
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/messages" search={{ partnerId: order.seller_id }}>
                    Falar com vendedor
                  </Link>
                </Button>
              </>
            )}
            {order.status === "COMPLETED" && (
              <div className="flex gap-2">
                <SubmitReviewDialog orderId={order.id} sellerId={order.seller_id} />
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/messages" search={{ partnerId: order.seller_id }}>
                    Falar com vendedor
                  </Link>
                </Button>
              </div>
            )}
            {role === "seller" && (
              <Button size="sm" variant="ghost" asChild>
                <Link to="/messages" search={{ partnerId: order.buyer_id }}>
                  Falar com comprador
                </Link>
              </Button>
            )}
            {role === "seller" && order.deliveries?.status === "NOT_STARTED" && (
              <Button size="sm" variant="outline" onClick={onDeliver}>Iniciar entrega</Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function OpenDisputeDialog({ orderId }: { orderId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  async function submit() {
    const trimmed = reason.trim();
    if (trimmed.length < 10) { toast.error("Descreva o problema com pelo menos 10 caracteres."); return; }
    const { error } = await supabase.from("disputes").insert({
      order_id: orderId,
      requester_id: user!.id,
      reason: "Problema na entrega",
      description: trimmed.slice(0, 1000),
    });
    if (error) { toast.error("Não foi possível abrir a disputa."); return; }
    toast.success("Disputa aberta. Nossa equipe vai analisar.");
    setOpen(false);
    setReason("");
    queryClient.invalidateQueries();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Abrir disputa</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Abrir disputa</DialogTitle></DialogHeader>
        <div>
          <Label htmlFor="reason">O que aconteceu?</Label>
          <Textarea id="reason" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1" rows={5} />
        </div>
        <DialogFooter><Button onClick={submit}>Enviar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubmitReviewDialog({ orderId, sellerId }: { orderId: string; sellerId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);

  // Check if already reviewed
  const { data: existingReview } = useQuery({
    queryKey: ["review", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("id").eq("order_id", orderId).maybeSingle();
      return data;
    },
  });

  async function submit() {
    if (comment.trim().length < 5) { toast.error("Escreva um comentário um pouco mais longo."); return; }
    
    // Abusive content moderation placeholder
    const abusiveKeywords = ["hack", "scam", "lixo", "fake"];
    if (abusiveKeywords.some(word => comment.toLowerCase().includes(word))) {
      toast.warning("Seu comentário contém palavras que podem precisar de moderação.");
    }

    const { error } = await supabase.from("reviews").insert({
      order_id: orderId,
      seller_id: sellerId,
      reviewer_id: user!.id,
      rating,
      comment: comment.trim(),
    });

    if (error) {
      if (error.code === "23505") toast.error("Você já avaliou este pedido.");
      else toast.error("Erro ao enviar avaliação.");
      return;
    }

    toast.success("Avaliação enviada! Obrigado pelo feedback.");
    setOpen(false);
    queryClient.invalidateQueries();
  }

  if (existingReview) return <Badge variant="secondary">Avaliado</Badge>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="secondary">Avaliar</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Avaliar vendedor</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Nota</Label>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setRating(num)}
                  className={`size-10 rounded-full border text-lg transition-colors ${
                    rating >= num ? "bg-warning border-warning text-warning-foreground" : "bg-muted"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="comment">Comentário</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Como foi sua experiência?"
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter><Button onClick={submit}>Publicar avaliação</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
