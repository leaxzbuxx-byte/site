import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, MessageCircle, Package, ShoppingBag } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/checkout/success/$orderId")({
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-success", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, listings(name, image_url), seller:seller_id(username)")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) return <SiteLayout><div className="mx-auto max-w-2xl p-20"><Skeleton className="h-64" /></div></SiteLayout>;
  if (!order) return <SiteLayout><div className="p-20 text-center">Pedido não encontrado.</div></SiteLayout>;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-success/20 text-success">
          <CheckCircle className="size-10" />
        </div>
        <h1 className="text-3xl font-bold">Compra realizada com sucesso!</h1>
        <p className="mt-2 text-muted-foreground">Seu pedido #{order.id.slice(0, 8)} foi confirmado.</p>
        
        <Card className="mt-10 overflow-hidden text-left">
          <div className="flex gap-4 border-b p-6">
            <div className="size-20 overflow-hidden rounded-lg bg-muted">
              {order.listings?.image_url && <img src={order.listings.image_url} alt={order.listings.name} className="size-full object-cover" />}
            </div>
            <div>
              <h3 className="font-bold">{order.listings?.name}</h3>
              <p className="text-sm text-muted-foreground">Vendedor: {order.seller?.username}</p>
              <p className="mt-1 text-lg font-bold text-primary">{brl(order.amount)}</p>
            </div>
          </div>
          <div className="bg-muted/30 p-6">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Próximos passos</h4>
            <div className="space-y-4">
              <div className="flex gap-3">
                <Package className="mt-1 size-5 text-primary" />
                <div>
                  <p className="font-medium">Acompanhe a entrega</p>
                  <p className="text-sm text-muted-foreground">O vendedor será notificado e iniciará a entrega em breve.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <MessageCircle className="mt-1 size-5 text-primary" />
                <div>
                  <p className="font-medium">Fale com o vendedor</p>
                  <p className="text-sm text-muted-foreground">Tire dúvidas sobre o item ou a entrega pelo chat interno.</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="px-8">
            <Link to="/orders">Ver meus pedidos</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/messages" search={{ partnerId: order.seller_id }}>
              <MessageCircle className="mr-2 size-4" /> Contatar vendedor
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/marketplace">
              <ShoppingBag className="mr-2 size-4" /> Continuar comprando
            </Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
