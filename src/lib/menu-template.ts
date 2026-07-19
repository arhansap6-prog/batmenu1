import { supabase } from "@/integrations/supabase/client";

export type TemplateConfig = {
  background?: string;
  surface?: string;
  accentFrom?: string;
  accentTo?: string;
  priceColor?: string;
  textColor?: string;
  mutedColor?: string;
  headingFont?: string;
  glow?: boolean;
};

export const defaultConfig: Required<TemplateConfig> = {
  background: "#0b0b0f",
  surface: "#141419",
  accentFrom: "#ff4d4d",
  accentTo: "#c40010",
  priceColor: "#f5c56b",
  textColor: "#f7ecd8",
  mutedColor: "#a09585",
  headingFont: "Playfair Display, serif",
  glow: false,
};

export function mergeConfig(cfg: TemplateConfig | null | undefined): Required<TemplateConfig> {
  return { ...defaultConfig, ...(cfg ?? {}) };
}

export async function listPublishedTemplates() {
  const { data, error } = await supabase
    .from("menu_templates")
    .select("id, name, slug, description, config, is_published")
    .eq("is_published", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}
