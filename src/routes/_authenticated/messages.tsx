import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { dateBR } from "@/lib/format";

type Search = { partnerId?: string | undefined };

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    partnerId: typeof search["partnerId"] === "string" ? search["partnerId"] : undefined,
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { user } = useAuth();
  const { partnerId } = Route.useSearch();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [activeConversation, setActiveConversation] = useState<string | null>(partnerId || null);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations (users we've messaged with)
  const { data: conversations, isLoading: loadingConversations } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`
          id, content, created_at, sender_id, receiver_id,
          sender:sender_id(user_id, username),
          receiver:receiver_id(user_id, username)
        `)
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by user
      const usersMap = new Map();
      data.forEach((msg: any) => {
        const otherUser = msg.sender_id === user!.id ? msg.receiver : msg.sender;
        if (!otherUser) return;
        
        if (!usersMap.has(otherUser.user_id)) {
          usersMap.set(otherUser.user_id, {
            user_id: otherUser.user_id,
            username: otherUser.username,
            lastMessage: msg.content,
            date: msg.created_at,
          });
        }
      });

      return Array.from(usersMap.values());
    },
  });

  // Load messages for the active conversation
  const { data: messages } = useQuery({
    queryKey: ["messages", activeConversation, user?.id],
    enabled: !!user && !!activeConversation,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${activeConversation}),and(sender_id.eq.${activeConversation},receiver_id.eq.${user!.id})`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Mark as read
      if (activeConversation) {
        await supabase.rpc("mark_messages_read", { conversation_partner_id: activeConversation });
      }
      
      return data;
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("chat-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            if (newMsg.sender_id === activeConversation || newMsg.receiver_id === activeConversation) {
              queryClient.invalidateQueries({ queryKey: ["messages", activeConversation] });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeConversation, queryClient]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = useMutation({
    mutationFn: async () => {
      if (!message.trim() || !activeConversation || !user) return;
      const { error } = await supabase.from("chat_messages").insert({
        sender_id: user.id,
        receiver_id: activeConversation,
        content: message.trim(),
      });
      if (error) throw error;
      setMessage("");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", activeConversation] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return (
    <SiteLayout>
      <div className="mx-auto flex h-[calc(100vh-64px)] max-w-7xl overflow-hidden p-4">
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-[300px_1fr]">
          {/* Sidebar */}
          <Card className="flex flex-col overflow-hidden">
            <div className="border-b p-4 font-bold">Mensagens</div>
            <ScrollArea className="flex-1">
              <div className="flex flex-col">
                {loadingConversations ? (
                  <div className="p-4 text-center text-muted-foreground">Carregando...</div>
                ) : conversations?.length ? (
                  conversations.map((conv) => (
                    <button
                      key={conv.user_id}
                      onClick={() => setActiveConversation(conv.user_id)}
                      className={`flex flex-col border-b p-4 text-left transition-colors hover:bg-muted/50 ${
                        activeConversation === conv.user_id ? "bg-muted" : ""
                      }`}
                    >
                      <span className="font-semibold">{conv.username || "Usuário"}</span>
                      <span className="truncate text-xs text-muted-foreground">{conv.lastMessage}</span>
                      <span className="mt-1 text-[10px] text-muted-foreground opacity-70">{dateBR(conv.date)}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma conversa.</div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          <Card className="flex flex-col overflow-hidden">
            {activeConversation ? (
              <>
                <div className="border-b p-4 font-semibold">
                  {conversations?.find((c) => c.user_id === activeConversation)?.username || "Chat"}
                </div>
                <ScrollArea ref={scrollRef} className="flex-1 p-4">
                  <div className="flex flex-col gap-3">
                    {messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                          msg.sender_id === user?.id
                            ? "ml-auto bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p>{msg.content}</p>
                        <span className="mt-1 block text-[10px] opacity-70">
                          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send.mutate();
                  }}
                  className="flex gap-2 border-t p-4"
                >
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    maxLength={2000}
                    disabled={send.isPending}
                  />
                  <Button type="submit" size="icon" disabled={send.isPending || !message.trim()}>
                    <Send className="size-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="grid flex-1 place-items-center text-muted-foreground">
                Selecione uma conversa para começar.
              </div>
            )}
          </Card>
        </div>
      </div>
    </SiteLayout>
  );
}
