import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const sendMessage = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    receiverId: z.string().uuid(),
    content: z.string().min(1).max(2000),
  }).parse(data))
  .handler(async ({ data }) => {
    // This is a placeholder for server-side logic if needed.
    // Client-side direct insert to chat_messages via Supabase client is generally preferred
    // for real-time responsiveness and simpler RLS integration.
    return { success: true };
  });
