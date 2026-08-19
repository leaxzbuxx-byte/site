import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const depositSchema = z.object({
  amount: z.number().min(5).max(5000),
  payerName: z.string().trim().min(3).max(80),
  payerDocument: z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v.length === 11, "CPF inválido"),
});

export const createPixDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { amount: number; payerName: string; payerDocument: string }) => depositSchema.parse(input))
  .handler(async ({ data, context }) => {
    const clientId = process.env["MISTICPAY_CLIENT_ID"];
    const clientSecret = process.env["MISTICPAY_CLIENT_SECRET"];
    const amount = Math.round(data.amount * 100) / 100;
    const totalToPay = amount + 1; // R$ 1.00 deposit fee (not added to balance)

    const { data: payment, error } = await context.supabase
      .from("payment_transactions")
      .insert({ user_id: context.userId, amount, provider: "misticpay", status: "PENDING" })
      .select("id")
      .single();
    if (error) throw new Error("Não foi possível iniciar o depósito.");

    if (!clientId || !clientSecret) {
      return { id: payment.id, amount, configured: false, copy_paste: null as string | null, qr_code: null as string | null };
    }

    const baseUrl = (process.env["MISTICPAY_API_URL"] ?? "https://api.misticpay.com/api").replace(/\/$/, "");
    const siteUrl = (process.env["PUBLIC_SITE_URL"] ?? "").replace(/\/$/, "");
    const webhookSecret = process.env["MYSTICPAY_WEBHOOK_SECRET"] ?? "";

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/transactions/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ci: clientId, cs: clientSecret },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          amount: totalToPay,
          payerName: data.payerName,
          payerDocument: data.payerDocument,
          transactionId: payment.id,
          description: `Depósito Brainrot Market ${payment.id}`,
          ...(siteUrl
            ? { projectWebhook: `${siteUrl}/api/public/webhooks/mysticpay${webhookSecret ? `?s=${encodeURIComponent(webhookSecret)}` : ""}` }
            : {}),
        }),
      });
    } catch (err) {
      console.error("MisticPay unreachable", baseUrl, err);
      await context.supabase.from("payment_transactions").update({ status: "FAILED" }).eq("id", payment.id);
      throw new Error("Não foi possível contatar o provedor de PIX. Tente novamente em instantes.");
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("MisticPay error", res.status, detail);
      await context.supabase.from("payment_transactions").update({ status: "FAILED" }).eq("id", payment.id);
      throw new Error(`Falha ao gerar o PIX (${res.status}). Verifique as credenciais do provedor.`);
    }

    const body = (await res.json()) as any;
    const tx = body?.data ?? body;
    const copy = (tx?.copyPaste ?? null) as string | null;
    const qr = (tx?.qrCodeBase64 ?? tx?.qrcodeUrl ?? null) as string | null;

    await context.supabase
      .from("payment_transactions")
      .update({ external_id: String(tx?.transactionId ?? ""), copy_paste: copy, qr_code: qr, raw_payload: body })
      .eq("id", payment.id);

    return { id: payment.id, amount: totalToPay, configured: true, copy_paste: copy, qr_code: qr };
  });
