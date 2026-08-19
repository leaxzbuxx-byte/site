import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPixKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pix_keys")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const savePixKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        type: z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "RANDOM"]),
        key: z.string().min(1),
        is_default: z.boolean().optional(),
        id: z.string().uuid().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.is_default) {
      await supabase.from("pix_keys").update({ is_default: false }).eq("user_id", userId);
    }

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("pix_keys")
        .update({ type: data.type, key: data.key, is_default: data.is_default ?? false })
        .eq("id", data.id)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }

    const { data: inserted, error } = await supabase
      .from("pix_keys")
      .insert({
        user_id: userId,
        type: data.type,
        key: data.key,
        is_default: data.is_default ?? false,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const deletePixKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pix_keys")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });
