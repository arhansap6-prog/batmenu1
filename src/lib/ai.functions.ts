import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public AI menu concierge — takes a customer's craving/preference and the current
 * menu, returns a curated selection with reasoning.
 * Uses Lovable AI Gateway (no user API key needed).
 */
export const recommendDishes = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z
      .object({
        query: z.string().trim().min(2).max(400),
        restaurant_name: z.string().trim().min(1).max(120),
        currency: z.string().trim().min(1).max(8),
        items: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              description: z.string().nullable().optional(),
              price: z.number(),
              category: z.string().nullable().optional(),
            }),
          )
          .min(1)
          .max(200),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");

    const menuLines = data.items
      .map(
        (it) =>
          `#${it.id} · ${it.name}${it.category ? ` [${it.category}]` : ""} — ${data.currency} ${it.price.toFixed(
            2,
          )}${it.description ? ` — ${it.description}` : ""}`,
      )
      .join("\n");

    const system =
      "You are the concierge for a premium restaurant. Recommend at most 3 dishes from the provided menu that best match the guest's request. Only choose from the menu ids listed. Be warm, brief, and specific.";

    const user = `Restaurant: ${data.restaurant_name}
Currency: ${data.currency}

Guest request:
"""
${data.query}
"""

Available menu (id · name [category] — price — description):
${menuLines}

Respond ONLY as JSON matching:
{"picks":[{"id":"<menu id>","reason":"<one short line>"}],"summary":"<one warm sentence>"}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Too many requests. Please try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please add credits.");
      throw new Error(`AI error ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { picks?: { id: string; reason: string }[]; summary?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { summary: content, picks: [] };
    }
    const validIds = new Set(data.items.map((i) => i.id));
    const picks = (parsed.picks ?? [])
      .filter((p) => validIds.has(p.id))
      .slice(0, 3);
    return { picks, summary: parsed.summary ?? "" };
  });
