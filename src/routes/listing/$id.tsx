import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, MessageCircle, ShieldCheck, Star, X, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useWallet } from "@/hooks/useAuth";
import { brl, dateBR, rarityClass } from "@/lib/format";

export const Route = createFileRoute("/listing/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do Brainrot — Brainrot Market" },
      { name: "description", content: "Veja raridade, mutação, preço e reputação do vendedor antes de comprar seu Brainrot." },
      { property: "og:title", content: "Detalhes do Brainrot — Brainrot Market" },
      { property: "og:description", content: "Veja raridade, mutação, preço e reputação do vendedor." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => <SiteLayout><div className="mx-auto max-w-3xl p-16 text-center">Não foi possível carregar este anúncio.</div></SiteLayout>,
  notFoundComponent: () => <SiteLayout><div className="mx-auto max-w-3xl p-16 text-center">Anúncio não encontrado.</div></SiteLayout>,
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: wallet } = useWallet();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [buying, setBuying] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [zoom, setZoom] = useState(1);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
  .from("listings")
  .select("*")
  .eq("id", id)
  .maybeSingle();

if (error) throw error;

return data;
      if (error) throw error;
      return data as any;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["seller-reviews", listing?.seller_id],
    enabled: !!listing?.seller_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, profiles:reviewer_id(username)")
        .eq("seller_id", listing.seller_id)
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []) as any[];
    },
  });

  const { data: favorite } = useQuery({
    queryKey: ["favorite", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("id").eq("listing_id", id).eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  async function toggleFavorite() {
    if (!user) { navigate({ to: "/login" }); return; }
    if (favorite) await supabase.from("favorites").delete().eq("id", favorite.id);
    else await supabase.from("favorites").insert({ listing_id: id, user_id: user.id });
    queryClient.invalidateQueries({ queryKey: ["favorite", id, user.id] });
    queryClient.invalidateQueries({ queryKey: ["favorites"] });
  }

  async function buy() {
    setBuying(true);
    const { data, error } = await supabase.rpc("purchase_listing", { _listing_id: id, _quantity: 1 });
    setBuying(false);
    if (error) { toast.error(error.message.includes("balance") ? "Saldo insuficiente na carteira." : "Não foi possível concluir a compra."); return; }
    toast.success("Compra realizada!");
    queryClient.invalidateQueries();
    navigate({ to: "/checkout/success/$orderId", params: { orderId: (data as any).id } });
    return data;
  }

  if (isLoading) return <SiteLayout><div className="mx-auto max-w-6xl px-4 py-12"><Skeleton className="h-96 rounded-xl" /></div></SiteLayout>;
  if (!listing) return <SiteLayout><div className="mx-auto max-w-3xl p-16 text-center text-muted-foreground">Anúncio não encontrado.</div></SiteLayout>;

  const avgRating = reviews && reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : null;
  const insufficient = !!user && Number(wallet?.balance ?? 0) < Number(listing.price);
  const isOwn = user?.id === listing.seller_id;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/15 via-card to-accent/15">
              {listing.image_url ? (
                <>
                  <img
                    src={listing.image_url}
                    alt={listing.name}
                    className="size-full cursor-zoom-in object-cover transition-transform hover:scale-105"
                    onClick={() => setShowLightbox(true)}
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-4 right-4 rounded-full opacity-80 hover:opacity-100"
                    onClick={() => setShowLightbox(true)}
                  >
                    <ZoomIn className="size-4" />
                  </Button>
                </>
              ) : (
                <div className="grid size-full place-items-center text-6xl font-black text-muted-foreground/30">?</div>
              )}
            </div>

            {/* Lightbox */}
            {showLightbox && listing.image_url && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-6 top-6 z-[110] rounded-full"
                  onClick={() => {
                    setShowLightbox(false);
                    setZoom(1);
                  }}
                >
                  <X className="size-6" />
                </Button>
                <div className="relative flex size-full flex-col items-center justify-center p-4">
                  <div className="flex gap-4 p-4">
                    <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}><ZoomOut className="size-4" /></Button>
                    <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.25))}><ZoomIn className="size-4" /></Button>
                    <Button variant="outline" onClick={() => setZoom(1)}>Reset</Button>
                  </div>
                  <div className="relative flex-1 overflow-auto">
                    <img
                      src={listing.image_url}
                      alt={listing.name}
                      style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s' }}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              </div>
            )}
            <Card className="mt-6 p-6">
              <h2 className="mb-2 text-lg font-semibold">Descrição</h2>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{listing.description || "Sem descrição."}</p>
            </Card>
            <Card className="mt-6 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Star className="size-4 text-warning" /> Avaliações do vendedor</h2>
              {reviews && reviews.length ? (
                <ul className="space-y-4">
                  {reviews.map((r) => (
                    <li key={r.id} className="border-b border-border/60 pb-3 last:border-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{r.profiles?.username ?? "Usuário"}</span>
                        <span className="text-warning">{"★".repeat(r.rating)}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{dateBR(r.created_at)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Este vendedor ainda não recebeu avaliações.</p>
              )}
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="p-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={rarityClass(listing.rarity)}>{listing.rarity}</Badge>
                {listing.mutation && <Badge variant="outline">{listing.mutation}</Badge>}
              </div>
              <h1 className="mt-3 text-3xl font-bold">{listing.name}</h1>
              <p className="mt-4 text-4xl font-extrabold text-primary">{brl(listing.price)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{listing.quantity} em estoque</p>

              <div className="mt-6 space-y-3">
                {isOwn ? (
                  <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">Este é o seu próprio anúncio.</p>
                ) : !user ? (
                  <Button asChild className="w-full" size="lg"><Link to="/login">Entrar para comprar</Link></Button>
                ) : insufficient ? (
                  <>
                    <p className="text-sm text-destructive">Saldo insuficiente ({brl(wallet?.balance ?? 0)}).</p>
                    <Button asChild className="w-full" size="lg"><Link to="/wallet/deposit">Depositar via PIX</Link></Button>
                  </>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full" size="lg" disabled={buying || listing.quantity < 1 || listing.status !== "ACTIVE"}>
                        {buying ? "Processando..." : "Comprar agora"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar compra</AlertDialogTitle>
                        <AlertDialogDescription>
                          {brl(listing.price)} será debitado do seu saldo e ficará retido até você confirmar o recebimento do Brainrot.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={buy}>Confirmar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button variant="outline" className="w-full" onClick={toggleFavorite}>
                  <Heart className={`mr-2 size-4 ${favorite ? "fill-destructive text-destructive" : ""}`} />
                  {favorite ? "Remover dos favoritos" : "Favoritar"}
                </Button>
                <Button variant="ghost" className="w-full" asChild>
                  <Link to="/messages" search={{ partnerId: listing.seller_id }}>
                    <MessageCircle className="mr-2 size-4" />
                    Falar com o vendedor
                  </Link>
                </Button>
              </div>

              <div className="mt-6 flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                Pagamento protegido: o vendedor só recebe após sua confirmação.
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Vendedor</h2>
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-full bg-primary/20 font-bold text-primary">
                  {(listing.seller?.display_name || listing.profiles?.username || "??").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{listing.seller?.display_name || listing.profiles?.username || "Vendedor"}</p>
                  <p className="text-xs text-muted-foreground">
                    {avgRating ? `★ ${avgRating.toFixed(1)} de ${reviews!.length} avaliações` : "Sem avaliações"}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
