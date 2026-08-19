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

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Brainrot Market" },
      { name: "description", content: "Receba um link por e-mail para redefinir a senha da sua conta do Brainrot Market." },
      { property: "og:title", content: "Recuperar senha — Brainrot Market" },
      { property: "og:description", content: "Receba um link para redefinir sua senha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().trim().email().max(255).safeParse(email);
    if (!parsed.success) { toast.error("E-mail inválido"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-3xl font-bold">Recuperar senha</h1>
        <Card className="mt-8 p-6">
          {sent ? (
            <p className="text-sm text-muted-foreground">Se existir uma conta com esse e-mail, enviamos um link de redefinição.</p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" required />
              </div>
              <Button type="submit" className="w-full">Enviar link</Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm"><Link to="/login" className="text-primary hover:underline">Voltar ao login</Link></p>
        </Card>
      </div>
    </SiteLayout>
  );
}
