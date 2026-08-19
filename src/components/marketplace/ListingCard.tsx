import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { brl, rarityClass } from "@/lib/format";

export type ListingRow = {
  id: string;
  name: string;
  rarity: string;
  mutation: string | null;
  price: number;
  quantity: number;
  status: string;
  image_url: string | null;
  seller_id: string;
  seller?: { display_name: string | null } | null;
};

export function ListingCard({ listing }: { listing: ListingRow }) {
  return (
    <Card className="group flex flex-col overflow-hidden border-border/70 bg-card/70 p-0 transition-all hover:-translate-y-1 glow-card">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/15 via-card to-accent/15">
        {listing.image_url ? (
          <img
            src={listing.image_url}
            alt={listing.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <Sparkles className="size-10 opacity-40" />
          </div>
        )}
        <Badge variant="outline" className={`absolute left-3 top-3 border ${rarityClass(listing.rarity)}`}>
          {listing.rarity}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-1 font-semibold">{listing.name}</h3>
          <p className="text-xs text-muted-foreground">
            {listing.mutation ? `Mutação: ${listing.mutation}` : "Sem mutação"} · {listing.quantity} disponível
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Vendedor: <span className="text-foreground">{listing.seller?.display_name ?? "Anônimo"}</span>
        </p>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-lg font-bold text-primary">{brl(listing.price)}</span>
          <Button asChild size="sm">
            <Link to="/listing/$id" params={{ id: listing.id }}>Comprar</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
