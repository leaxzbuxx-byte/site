import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const banUser = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ userId: z.string(), reason: z.string() }).parse(data))
  .handler(async ({ data }) => {
    // We use service role (admin) here to call the DB function
    const { error } = await supabaseAdmin.rpc("admin_ban_user", {
      _user_id: data.userId,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });
