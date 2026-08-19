import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RARITIES } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/seller/listings/create")({
  head: () => ({
    meta: [
      { title: "Novo anúncio — Brainrot Market" },
      { name: "description", content: "Publique um Brainrot à venda definindo raridade, mutação, preço e estoque." },
      { property: "og:title", content: "Novo anúncio — Brainrot Market" },
      { property: "og:description", content: "Publique um Brainrot à venda em poucos segundos." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CreateListing,
});

const schema = z.object({
  name: z.string().trim().min(3, "Nome muito curto").max(80),
  description: z.string().trim().max(1000).optional(),
  rarity: z.string().min(1, "Escolha a raridade"),
  mutation: z.string().trim().max(40).optional(),
  price: z.number().min(1, "Preço mínimo R$ 1").max(100000),
  quantity: z.number().int().min(1).max(999),
  image_url: z.string().trim().url("URL de imagem inválida").max(500).optional().or(z.literal("")),
});

function CreateListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", description: "", rarity: "", mutation: "", price: 10, quantity: 1, image_url: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
  e.preventDefault();

  const parsed = schema.safeParse(form);

  if (!parsed.success) {
    toast.error(parsed.error.issues[0]!.message);
    return;
  }

  if (!user) {
    toast.error("Você precisa estar logado.");
    return;
  }

  setLoading(true);

  try {
    // Busca o perfil do vendedor
    let { data: sellerProfile, error: profileError } = await supabase
  .from("seller_profiles")
  .select("id")
  .eq("user_id", user.id)
  .maybeSingle();

if (profileError) {
  console.error("Erro ao buscar seller profile:", profileError);
  toast.error(profileError.message);
  return;
}

if (!sellerProfile) {
  const { data: newProfile, error: createProfileError } = await supabase
    .from("seller_profiles")
    .insert({
      user_id: user.id,
    })
    .select("id")
    .single();

  if (createProfileError) {
    console.error("Erro ao criar seller profile:", createProfileError);
    toast.error(createProfileError.message);
    return;
  }

  sellerProfile = newProfile;
}

    // Cria o anúncio usando o ID do seller_profiles
    const { error } = await supabase.from("listings").insert({
      seller_id: sellerProfile.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      rarity: parsed.data.rarity,
      mutation: parsed.data.mutation || null,
      price: parsed.data.price,
      quantity: parsed.data.quantity,
      image_url: parsed.data.image_url || null,
      status: "ACTIVE",
    });

    if (error) {
      console.error("Erro ao criar listing:", error);
      toast.error(`Não foi possível publicar o anúncio: ${error.message}`);
      return;
    }

    toast.success("Anúncio publicado!");

    navigate({ to: "/seller" });
  } finally {
    setLoading(false);
  }
}

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-bold">Novo anúncio</h1>
        <Card className="mt-6 p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Brainrot</Label>
              <Input id="name" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Raridade</Label>
                <Select value={form.rarity} onValueChange={(v) => setForm({ ...form, rarity: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{RARITIES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mutation">Mutação (opcional)</Label>
                <Input id="mutation" maxLength={40} value={form.mutation} onChange={(e) => setForm({ ...form, mutation: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="price">Preço (R$)</Label>
                <Input id="price" type="number" min={1} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="quantity">Estoque</Label>
                <Input id="quantity" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="mt-1" required />
              </div>
            </div>
            <div>
              <Label htmlFor="image_url">URL da imagem (opcional)</Label>
              <Input id="image_url" maxLength={500} value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="mt-1" placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" maxLength={1000} rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Publicando..." : "Publicar anúncio"}</Button>
          </form>
        </Card>
      </div>
    </SiteLayout>
  );
}
