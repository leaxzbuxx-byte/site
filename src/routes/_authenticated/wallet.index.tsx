import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Landmark, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useWallet } from "@/hooks/useAuth";
import { brl, dateBR, statusClass } from "@/lib/format";
import { getPixKeys, savePixKey, deletePixKey } from "@/lib/pix-keys.functions";

export const Route = createFileRoute("/_authenticated/wallet/")({
  head: () => ({
    meta: [
      { title: "Carteira — Brainrot Market" },
      { name: "description", content: "Acompanhe saldo, saldo sacável e o histórico completo de movimentações da sua carteira." },
      { property: "og:title", content: "Carteira — Brainrot Market" },
      { property: "og:description", content: "Saldo e histórico de movimentações." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WalletPage,
});

const TYPE_LABEL: Record<string, string> = {
  DEPOSIT: "Depósito PIX",
  PURCHASE: "Compra",
  SALE: "Venda",
  FEE: "Taxa da plataforma",
  REFUND: "Reembolso",
  WITHDRAW: "Saque solicitado",
  WITHDRAWAL_PAID: "Saque concluído",
  WITHDRAWAL_REJECTED: "Saque rejeitado",
};

function WithdrawDialog({ withdrawable }: { withdrawable: number }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(15);
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");

  const { user } = useAuth();
  const { data: pixKeys } = useQuery({
    queryKey: ["pix-keys", user?.id],
    enabled: !!user,
    queryFn: () => getPixKeys(),
  });

  const selectedKey = pixKeys?.find(k => k.id === selectedKeyId);
  const fee = Math.round(amount * 0.05 * 100) / 100;
  const net = Math.max(0, amount - fee);
  const balanceAfter = Math.max(0, withdrawable - amount);

  async function handleWithdraw() {
    if (amount < 15) { toast.error("O valor mínimo para saque é R$ 15,00"); return; }
    if (amount > withdrawable) { toast.error("Saldo insuficiente."); return; }
    if (!selectedKey) { toast.error("Selecione uma chave PIX."); return; }

    setLoading(true);
    try {
      const { error } = await supabase.rpc("request_withdrawal", {
        _amount: amount,
        _pix_key: selectedKey.key,
        _pix_key_type: selectedKey.type,
      });

      if (error) throw error;
      toast.success("Saque solicitado com sucesso! Prazo de até 24h.");
      setOpen(false);
      queryClient.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar saque.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" disabled={withdrawable < 15}>
          Sacar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Saque PIX</DialogTitle>
          <DialogDescription>
            Taxa de 5% sobre o valor solicitado. Saque mínimo de R$ 15,00.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Valor do saque (R$)</Label>
            <Input 
              type="number" 
              min={15} 
              max={withdrawable} 
              step="0.01" 
              value={amount} 
              onChange={(e) => setAmount(Number(e.target.value))} 
            />
            <p className="text-xs text-muted-foreground">Saldo disponível para saque: {brl(withdrawable)}</p>
          </div>
          
          <div className="space-y-2">
            <Label>Selecione a Chave PIX</Label>
            <Select value={selectedKeyId} onValueChange={setSelectedKeyId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma chave cadastrada" />
              </SelectTrigger>
              <SelectContent>
                {pixKeys?.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.type}: {k.key} {k.is_default ? "(Padrão)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end">
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                <a href="#pix-keys">Gerenciar chaves</a>
              </Button>
            </div>
          </div>

          <Card className="space-y-2 bg-muted/40 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumo do Saque</h4>
            <div className="flex justify-between text-sm">
              <span>Valor solicitado:</span>
              <span className="font-medium">{brl(amount)}</span>
            </div>
            <div className="flex justify-between text-sm text-destructive">
              <span>Taxa de serviço (5%):</span>
              <span className="font-medium">- {brl(fee)}</span>
            </div>
            <div className="border-t border-border/50 pt-2 flex justify-between font-bold text-success">
              <span>Valor líquido a receber:</span>
              <span>{brl(net)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Saldo após o saque:</span>
              <span>{brl(balanceAfter)}</span>
            </div>
          </Card>
          
          {selectedKey && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
              <p className="font-semibold text-primary">Atenção:</p>
              <p className="mt-1">O valor será enviado para a chave <strong>{selectedKey.type}</strong>: <code>{selectedKey.key}</code></p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleWithdraw} disabled={loading || !selectedKeyId}>{loading ? "Processando..." : "Confirmar Saque"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PixKeyManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM">("CPF");
  const [key, setKey] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const { user } = useAuth();
  const { data: pixKeys, isLoading } = useQuery({
    queryKey: ["pix-keys", user?.id],
    enabled: !!user,
    queryFn: () => getPixKeys(),
  });

  async function handleSave() {
    if (!user) { toast.error("Você precisa estar logado."); return; }
    if (!key.trim()) { toast.error("Informe a chave PIX."); return; }
    
    // Basic validations
    if (type === "CPF" && key.replace(/\D/g, "").length !== 11) { toast.error("CPF inválido."); return; }
    if (type === "CNPJ" && key.replace(/\D/g, "").length !== 14) { toast.error("CNPJ inválido."); return; }
    if (type === "EMAIL" && !key.includes("@")) { toast.error("E-mail inválido."); return; }

    setLoading(true);
    try {
      await savePixKey({ data: { type, key: key.trim(), is_default: isDefault } });
      toast.success("Chave PIX cadastrada com sucesso!");
      setOpen(false);
      setKey("");
      queryClient.invalidateQueries({ queryKey: ["pix-keys"] });
    } catch (err) {
      toast.error("Erro ao salvar chave PIX.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    if (!confirm("Tem certeza que deseja remover esta chave?")) return;
    try {
      await deletePixKey({ data: { id } });
      toast.success("Chave removida.");
      queryClient.invalidateQueries({ queryKey: ["pix-keys"] });
    } catch (err) {
      toast.error("Erro ao remover chave.");
    }
  }

  return (
    <section id="pix-keys" className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Minhas Chaves PIX</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Plus className="mr-2 size-4" /> Nova Chave</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Chave PIX</DialogTitle>
              <DialogDescription>Adicione uma chave para receber seus saques.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de Chave</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CPF">CPF</SelectItem>
                    <SelectItem value="CNPJ">CNPJ</SelectItem>
                    <SelectItem value="EMAIL">E-mail</SelectItem>
                    <SelectItem value="PHONE">Telefone</SelectItem>
                    <SelectItem value="RANDOM">Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Insira a chave aqui" />
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="default-key" 
                  checked={isDefault} 
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="default-key" className="cursor-pointer">Definir como padrão</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={loading}>{loading ? "Salvando..." : "Salvar Chave"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {isLoading ? (
          Array(2).fill(0).map((_, i) => <Card key={i} className="h-24 animate-pulse bg-muted" />)
        ) : pixKeys?.length ? (
          pixKeys.map((k) => (
            <Card key={k.id} className="relative flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase">{k.type}</span>
                  {k.is_default && <Badge variant="secondary" className="h-4 px-1 text-[10px]">PADRÃO</Badge>}
                </div>
                <p className="mt-1 font-mono text-sm">{k.key}</p>
              </div>
              <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(k.id)}>
                <Trash2 className="size-4" />
              </Button>
            </Card>
          ))
        ) : (
          <Card className="col-span-full border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">Você ainda não tem chaves PIX cadastradas.</p>
          </Card>
        )}
      </div>
    </section>
  );
}

function WalletPage() {
  const { user, loading } = useAuth();
  const { data: wallet } = useWallet();

  const { data: txs } = useQuery({
    queryKey: ["wallet-transactions", wallet?.id],
    enabled: !!wallet?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", wallet!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  if (!loading && !user) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <div className="mx-auto mb-6 grid size-16 place-items-center rounded-full bg-primary/10">
            <Landmark className="size-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Acesso Restrito</h1>
          <p className="mt-2 text-muted-foreground">
            Você precisa estar autenticado para gerenciar sua carteira e chaves PIX.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button asChild variant="default">
              <Link to="/login">Fazer Login</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/register">Criar Conta</Link>
            </Button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-bold">Carteira</h1>

        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          <Card className="p-6 glow-card">
            <p className="text-sm text-muted-foreground">Saldo de depósito (Compras)</p>
            <p className="mt-1 text-4xl font-extrabold text-primary">{brl(wallet?.balance ?? 0)}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button asChild className="w-full"><Link to="/wallet/deposit">Depositar</Link></Button>
              <WithdrawDialog withdrawable={wallet?.withdrawable_balance ?? 0} />
            </div>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Saldo para saque (Vendas)</p>
            <p className="mt-1 text-4xl font-extrabold text-success">{brl(wallet?.withdrawable_balance ?? 0)}</p>
            <p className="mt-4 text-xs text-muted-foreground">Este saldo pode ser sacado via PIX após 15 reais acumulados.</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Saldo pendente</p>
            <p className="mt-1 text-4xl font-extrabold text-warning">{brl(wallet?.pending_balance ?? 0)}</p>
            <p className="mt-4 text-xs text-muted-foreground">Valores retidos até a conclusão do pedido.</p>
          </Card>
        </div>

        <PixKeyManager />

        <Card className="mt-8 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Histórico de Transações</h2>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[10px]"><CheckCircle2 className="mr-1 size-3 text-success" /> PAGO</Badge>
              <Badge variant="outline" className="text-[10px]"><AlertCircle className="mr-1 size-3 text-warning" /> PENDENTE</Badge>
            </div>
          </div>
          
          {txs && txs.length ? (
            <div className="overflow-x-auto">
              <ul className="divide-y divide-border/60 min-w-[500px]">
                {txs.map((t) => {
                  const positive = Number(t.amount) >= 0;
                  const isWithdrawal = t.type === 'WITHDRAW' || t.type.startsWith('WITHDRAWAL');
                  
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`grid size-10 place-items-center rounded-full ${positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                          {positive ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{TYPE_LABEL[t.type] ?? t.type}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            {dateBR(t.created_at)}
                            {t.description && <span>• {t.description}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${positive ? "text-success" : "text-destructive"}`}>
                          {positive ? "+" : ""}{brl(Math.abs(t.amount))}
                        </p>
                        <div className="mt-1 flex flex-col items-end gap-1">
                          <Badge variant="secondary" className={`text-[10px] py-0 px-1.5 ${statusClass(t.status)}`}>
                            {t.status === 'COMPLETO' || t.status === 'PAID' ? 'PAGO' : 
                             t.status === 'PENDENTE' ? 'EM ANÁLISE' : 
                             t.status === 'CANCELADO' || t.status === 'REJECTED' ? 'RECUSADO' : t.status}
                          </Badge>
                          {isWithdrawal && (
                            <span className="text-[9px] text-muted-foreground italic">Taxa de 5% inclusa</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-muted">
                <ArrowDownLeft className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
            </div>
          )}
        </Card>
      </div>
    </SiteLayout>
  );
}
