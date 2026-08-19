import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Criar conta — Brainrot Market" },
      { name: "description", content: "Crie sua conta gratuita no Brainrot Market e comece a comprar e vender Brainrots com segurança." },
      { property: "og:title", content: "Criar conta — Brainrot Market" },
      { property: "og:description", content: "Crie sua conta gratuita no Brainrot Market." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

const schema = z.object({
  username: z.string().trim().min(3, "Usuário deve ter ao menos 3 caracteres").max(24).regex(/^[a-zA-Z0-9_]+$/, "Use apenas letras, números e _"),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres").max(72),
});

function RegisterPage() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]!.message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: window.location.origin, data: { username: parsed.data.username } },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }

  return (
    <SiteLayout>
      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="text-3xl font-bold">Criar conta</h1>
        <p className="mt-1 text-muted-foreground">Leva menos de um minuto.</p>
        <Card className="mt-8 p-6">
          {sent ? (
            <div className="space-y-3 text-center">
              <p className="font-semibold">Confirme seu e-mail</p>
              <p className="text-sm text-muted-foreground">Enviamos um link de confirmação para {form.email}. Clique nele para ativar sua conta.</p>
              <Button asChild variant="outline" className="w-full"><Link to="/login">Voltar para o login</Link></Button>
            </div>
          ) : (
            <>
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="username">Nome de usuário</Label>
                  <Input id="username" value={form.username} maxLength={24} onChange={(e) => setForm({ ...form, username: e.target.value })} className="mt-1" required />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" required />
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</Button>
              </form>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
              </p>
            </>
          )}
        </Card>
      </div>
    </SiteLayout>
  );
}
