export const brl = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));

export const dateBR = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "-";

export const RARITIES = [
  "Common",
  "Rare",
  "Epic",
  "Legendary",
  "Mythic",
  "Secret",
  "Brainrot God",
] as const;

export type Rarity = (typeof RARITIES)[number];

export const rarityClass = (rarity: string) => {
  switch (rarity) {
    case "Rare":
      return "bg-accent/15 text-accent border-accent/30";
    case "Epic":
      return "bg-primary/15 text-primary border-primary/30";
    case "Legendary":
      return "bg-warning/15 text-warning border-warning/30";
    case "Mythic":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "Secret":
      return "bg-success/15 text-success border-success/30";
    case "Brainrot God":
      return "bg-gradient-to-r from-primary/25 to-accent/25 text-foreground border-primary/40";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  WAITING_DELIVERY: "Aguardando entrega",
  IN_DELIVERY: "Entrega em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
  DISPUTED: "Em disputa",
};

export const statusClass = (status: string) => {
  if (["COMPLETED", "PAID", "APPROVED", "ACTIVE"].includes(status)) return "bg-success/15 text-success border-success/30";
  if (["CANCELLED", "REFUNDED", "FAILED", "BANNED", "EXPIRED"].includes(status)) return "bg-destructive/15 text-destructive border-destructive/30";
  if (["PENDING", "WAITING_DELIVERY", "IN_DELIVERY", "DISPUTED", "PAUSED", "SUSPENDED"].includes(status)) return "bg-warning/15 text-warning border-warning/30";
  return "bg-muted text-muted-foreground border-border";
};
