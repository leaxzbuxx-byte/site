import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPixDeposit } from "@/lib/pix.functions";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/wallet/deposit")({
  head: () => ({
    meta: [
      { title: "Depositar via PIX — Brainrot Market" },
      { name: "description", content: "Adicione saldo à sua carteira do Brainrot Market com um pagamento PIX instantâneo." },
      { property: "og:title", content: "Depositar via PIX — Brainrot Market" },
      { property: "og:description", content: "Adicione saldo com PIX instantâneo." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DepositPage,
});

const PRESETS = [20, 50, 100, 250];

function DepositPage() {
  const deposit = useServerFn(createPixDeposit);
  const [amount, setAmount] = useState(50);
  const [payerName, setPayerName] = useState("");
  const [payerDocument, setPayerDocument] = useState("");
  const [loading, setLoading] = useState(false);
  const [charge, setCharge] = useState<{ copy_paste: string | null; qr_code: string | null; configured: boolean; amount: number } | null>(null);

  async function generate() {
    if (amount < 5 || amount > 5000) { toast.error("Valor deve estar entre R$ 5 e R$ 5.000"); return; }
    if (payerName.trim().length < 3) { toast.error("Informe o nome completo do pagador."); return; }
    if (payerDocument.replace(/\D/g, "").length !== 11) { toast.error("Informe um CPF válido."); return; }
    setLoading(true);
    try {
      const result = await deposit({ data: { amount, payerName: payerName.trim(), payerDocument: payerDocument.replace(/\D/g, "") } });
      setCharge(result);
      if (!result.configured) toast.warning("O provedor de PIX ainda não está configurado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o PIX.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-3xl font-bold">Depositar via PIX</h1>
        <Card className="mt-6 p-6">
          {charge ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">Valor a pagar (inclui R$ 1,00 de taxa)</p>
              <p className="text-3xl font-bold text-primary">{brl(charge.amount)}</p>
              {charge.qr_code && <img src={charge.qr_code} alt="QR Code PIX" className="mx-auto size-56 rounded-lg bg-white p-2" />}
              {charge.copy_paste ? (
                <div className="space-y-2">
                  <p className="break-all rounded-lg border border-border bg-muted/40 p-3 text-xs">{charge.copy_paste}</p>
                  <Button variant="outline" className="w-full" onClick={() => { navigator.clipboard.writeText(charge.copy_paste!); toast.success("Código copiado!"); }}>
                    <Copy className="mr-2 size-4" /> Copiar código PIX
                  </Button>
                </div>
              ) : (
                <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                  A cobrança foi registrada, mas o gateway PIX ainda não está conectado. Configure as credenciais do provedor para gerar o código.
                </p>
              )}
              <Button variant="ghost" className="w-full" onClick={() => setCharge(null)}>Gerar outro valor</Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input id="amount" type="number" min={5} max={5000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="payerName">Nome completo</Label>
                <Input id="payerName" value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Seu nome completo" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="payerDocument">CPF</Label>
                <Input id="payerDocument" value={payerDocument} onChange={(e) => setPayerDocument(e.target.value)} placeholder="00000000000" inputMode="numeric" className="mt-1" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map((p) => (
                  <Button key={p} type="button" variant={amount === p ? "default" : "outline"} size="sm" onClick={() => setAmount(p)}>{p}</Button>
                ))}
              </div>
              <Button className="w-full" onClick={generate} disabled={loading}>{loading ? "Gerando..." : "Gerar código PIX"}</Button>
              <p className="text-xs text-muted-foreground">
                O saldo é creditado automaticamente após a confirmação. 
                Uma taxa fixa de R$ 1,00 é aplicada ao depósito.
              </p>
            </div>
          )}
        </Card>
      </div>
    </SiteLayout>
  );
}
