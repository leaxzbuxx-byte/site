import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Card } from "@/components/ui/card";
import { ListingCard, type ListingRow } from "@/components/marketplace/ListingCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({
    meta: [
      { title: "Favoritos — Brainrot Market" },
      { name: "description", content: "Os Brainrots que você salvou para comprar depois, reunidos em um só lugar." },
      { property: "og:title", content: "Favoritos — Brainrot Market" },
      { property: "og:description", content: "Os Brainrots que você salvou para comprar depois." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("id, listings:listing_id(*, profiles:seller_id(username))")
        .eq("user_id", user!.id);
      return (data ?? []) as any[];
    },
  });

  const listings = (data ?? []).map((f) => f.listings).filter(Boolean) as ListingRow[];

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-bold">Favoritos</h1>
        {listings.length ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        ) : (
          <Card className="mt-8 p-14 text-center text-muted-foreground">
            Você ainda não favoritou nenhum Brainrot. <Link to="/marketplace" className="text-primary underline">Explorar</Link>
          </Card>
        )}
      </div>
    </SiteLayout>
  );
}
