import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/mysticpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["MYSTICPAY_WEBHOOK_SECRET"];
        const url = new URL(request.url);
        const provided = request.headers.get("x-webhook-secret") ?? url.searchParams.get("s") ?? "";
        if (!secret || provided !== secret) return new Response("Invalid signature", { status: 401 });

        const payload = (await request.json()) as any;
        const externalId = payload?.transactionId ?? payload?.transaction?.transactionId;
        const status = String(payload?.status ?? payload?.transaction?.status ?? "").toUpperCase();
        if (!externalId) return new Response("Missing reference", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: payment } = await supabaseAdmin
          .from("payment_transactions")
          .select("id")
          .eq("external_id", String(externalId))
          .maybeSingle();
        if (!payment) return new Response("Unknown transaction", { status: 404 });

        if (status === "COMPLETO" || status === "PAGO" || status === "APROVADO") {
          const { error } = await supabaseAdmin.rpc("credit_pix_deposit", { _payment_id: payment.id });
          if (error) return new Response("Error", { status: 500 });
        } else if (status === "CANCELADO" || status === "EXPIRADO" || status === "FALHOU" || status === "RECUSADO") {
          await supabaseAdmin.from("payment_transactions").update({ status: "FAILED" }).eq("id", payment.id);
        }
        return new Response("ok");
      },
    },
  },
});
