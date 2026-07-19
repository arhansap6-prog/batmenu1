import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Bootstrap the very first account = Super Admin.
 * Refuses if a super_admin already exists. This endpoint self-locks after first use.
 */
export const bootstrapSuperAdmin = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(128),
        full_name: z.string().trim().min(1).max(120),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) throw new Error("A Super Admin already exists.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_log").insert({
      actor_id: created.user?.id ?? null,
      action: "bootstrap_super_admin",
      entity_type: "user",
      entity_id: created.user?.id ?? null,
      metadata: { email: data.email },
    });

    return { ok: true };
  });

/** Returns { hasSuperAdmin } — used by /auth to reveal the bootstrap form. */
export const platformStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin");
  if (error) throw new Error(error.message);
  return { hasSuperAdmin: (count ?? 0) > 0 };
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/**
 * Super Admin creates a Restaurant + Owner account atomically.
 * The owner's first login is forced to change password (must_change_password=true).
 */
export const createRestaurantWithOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        restaurant_name: z.string().trim().min(2).max(120),
        category: z.string().trim().max(60).optional().default(""),
        currency: z.string().trim().min(1).max(8).default("USD"),
        language: z.string().trim().min(2).max(8).default("en"),
        country: z.string().trim().max(60).optional().default(""),
        plan: z
          .enum(["free", "starter", "basic", "professional", "premium", "enterprise", "unlimited"])
          .default("starter"),
        menu_template_id: z.string().uuid().optional().nullable(),
        owner_full_name: z.string().trim().min(2).max(120),
        owner_email: z.string().trim().email().max(255),
        owner_mobile: z.string().trim().max(30).optional().default(""),
        owner_username: z.string().trim().min(3).max(40),
        owner_password: z.string().min(8).max(128),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    // Verify caller is Super Admin (RLS-checked via authenticated client)
    const { data: isSA, error: roleErr } = await context.supabase.rpc("is_super_admin", {
      _user_id: context.userId,
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isSA) throw new Error("Forbidden: Super Admin only.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Unique slug
    let base = slugify(data.restaurant_name);
    if (!base) base = "restaurant";
    let slug = base;
    for (let i = 2; i < 100; i++) {
      const { data: existing } = await supabaseAdmin
        .from("restaurants")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${base}-${i}`;
    }

    // Create the owner user
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.owner_email,
      password: data.owner_password,
      email_confirm: true,
      user_metadata: { full_name: data.owner_full_name },
    });
    if (createErr || !created.user) throw new Error(createErr?.message ?? "User creation failed");
    const ownerId = created.user.id;

    // Update profile: username, mobile, must_change_password
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.owner_full_name,
        mobile: data.owner_mobile || null,
        username: data.owner_username,
        must_change_password: true,
      })
      .eq("id", ownerId);
    if (profErr) {
      await supabaseAdmin.auth.admin.deleteUser(ownerId);
      throw new Error(profErr.message);
    }

    // Insert restaurant
    const { data: rest, error: restErr } = await supabaseAdmin
      .from("restaurants")
      .insert({
        name: data.restaurant_name,
        slug,
        category: data.category || null,
        currency: data.currency,
        language: data.language,
        country: data.country || null,
        plan: data.plan,
        owner_id: ownerId,
        created_by: context.userId,
        menu_template_id: data.menu_template_id ?? null,
      })
      .select("id, slug")
      .single();
    if (restErr || !rest) {
      await supabaseAdmin.auth.admin.deleteUser(ownerId);
      throw new Error(restErr?.message ?? "Restaurant creation failed");
    }

    // Assign owner role
    const { error: roleInsErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: ownerId, role: "owner", restaurant_id: rest.id });
    if (roleInsErr) {
      await supabaseAdmin.from("restaurants").delete().eq("id", rest.id);
      await supabaseAdmin.auth.admin.deleteUser(ownerId);
      throw new Error(roleInsErr.message);
    }

    await supabaseAdmin.from("audit_log").insert({
      actor_id: context.userId,
      action: "create_restaurant",
      entity_type: "restaurant",
      entity_id: rest.id,
      metadata: { slug: rest.slug, owner_email: data.owner_email, plan: data.plan },
    });

    return { restaurant_id: rest.id, slug: rest.slug, owner_id: ownerId };
  });

/** Super Admin toggles restaurant active/suspended. */
export const setRestaurantActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: isSA } = await context.supabase.rpc("is_super_admin", { _user_id: context.userId });
    if (!isSA) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("restaurants")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_log").insert({
      actor_id: context.userId,
      action: data.is_active ? "activate_restaurant" : "suspend_restaurant",
      entity_type: "restaurant",
      entity_id: data.id,
    });
    return { ok: true };
  });

/** Called after user changes their password to clear the must_change flag. */
export const clearMustChangePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
