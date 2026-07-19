// NEW FILE: src/components/FireBookMenu.tsx
//
// A real page-flip "burning book" menu, using react-pageflip — the SAME
// library already used in src/routes/m.$slug.tsx, so no new dependency
// needs installing. Each restaurant looks different because everything
// visual (colors, glow, font) comes from that restaurant's assigned
// menu_templates.config — the same `template` object already computed in
// r.$slug.tsx via mergeConfig().

import { forwardRef, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import HTMLFlipBook from "react-pageflip";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";

type Item = {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  discount_price: number | string | null;
  category_id: string | null;
  image_url: string | null;
  is_chef_recommended: boolean;
  is_todays_special: boolean;
};
type Category = { id: string; name: string; sort_order: number };
type Template = {
  background: string;
  surface: string;
  accentFrom: string;
  accentTo: string;
  priceColor: string;
  textColor: string;
  mutedColor: string;
  headingFont: string;
  glow: boolean;
};

const ITEMS_PER_PAGE = 4;

type PageKind =
  | { kind: "cover"; name: string; logoUrl: string | null }
  | { kind: "category"; category: Category; items: Item[]; part: number; totalParts: number }
  | { kind: "back" };

export function FireBookMenu({
  restaurantName,
  logoUrl,
  currency,
  categories,
  items,
  template,
  cart,
  onAdd,
  onBump,
}: {
  restaurantName: string;
  logoUrl: string | null;
  currency: string;
  categories: Category[];
  items: Item[];
  template: Template;
  cart: Record<string, number>;
  onAdd: (it: Item) => void;
  onBump: (id: string, delta: number) => void;
}) {
  const bookRef = useRef<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const pages = useMemo<PageKind[]>(() => {
    const out: PageKind[] = [{ kind: "cover", name: restaurantName, logoUrl }];
    categories.forEach((c) => {
      const catItems = items.filter((i) => i.category_id === c.id);
      if (catItems.length === 0) return;
      const parts = Math.max(1, Math.ceil(catItems.length / ITEMS_PER_PAGE));
      for (let p = 0; p < parts; p++) {
        out.push({
          kind: "category",
          category: c,
          items: catItems.slice(p * ITEMS_PER_PAGE, (p + 1) * ITEMS_PER_PAGE),
          part: p + 1,
          totalParts: parts,
        });
      }
    });
    out.push({ kind: "back" });
    return out;
  }, [restaurantName, logoUrl, categories, items]);

  function flipPrev() {
    bookRef.current?.pageFlip()?.flipPrev();
  }
  function flipNext() {
    bookRef.current?.pageFlip()?.flipNext();
  }

  return (
    <div className="relative flex flex-col items-center py-6">
      {/* Flame glow bars on both sides of the book */}
      <div
        className="pointer-events-none absolute inset-y-10 left-0 w-16 sm:w-28 blur-2xl"
        style={{ background: `linear-gradient(90deg, ${template.accentFrom}55, transparent)` }}
      />
      <div
        className="pointer-events-none absolute inset-y-10 right-0 w-16 sm:w-28 blur-2xl"
        style={{ background: `linear-gradient(270deg, ${template.accentTo}55, transparent)` }}
      />

      <div className="relative">
        <HTMLFlipBook
          ref={bookRef}
          width={isMobile ? 300 : 420}
          height={isMobile ? 460 : 580}
          size="stretch"
          minWidth={280}
          maxWidth={480}
          minHeight={400}
          maxHeight={640}
          showCover={true}
          drawShadow={true}
          flippingTime={700}
          usePortrait={isMobile}
          mobileScrollSupport={false}
          maxShadowOpacity={0.5}
          className="fire-book-shadow"
          style={{}}
          startPage={0}
          startZIndex={0}
          autoSize={true}
          clickEventForward={true}
          useMouseEvents={true}
          swipeDistance={30}
          showPageCorners={true}
          disableFlipByClick={false}
          onFlip={(e: any) => setCurrentPage(e.data)}
        >
          {pages.map((p, idx) => (
            <BookPage key={idx} template={template}>
              {renderPage(p, { currency, template, cart, onAdd, onBump })}
            </BookPage>
          ))}
        </HTMLFlipBook>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={flipPrev}
          disabled={currentPage === 0}
          className="flex h-10 w-10 items-center justify-center rounded-full border transition disabled:opacity-30"
          style={{ borderColor: `${template.textColor}33`, background: template.surface, color: template.textColor }}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-[11px] uppercase tracking-widest tabular-nums" style={{ color: template.mutedColor }}>
          {String(currentPage + 1).padStart(2, "0")} / {String(pages.length).padStart(2, "0")}
        </div>
        <button
          onClick={flipNext}
          disabled={currentPage >= pages.length - 1}
          className="flex h-10 w-10 items-center justify-center rounded-full border transition disabled:opacity-30"
          style={{ borderColor: `${template.textColor}33`, background: template.surface, color: template.textColor }}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-[10px] uppercase tracking-widest" style={{ color: template.mutedColor }}>
        Tap the right edge, or swipe, to turn the page
      </p>
    </div>
  );
}

const BookPage = forwardRef<HTMLDivElement, { template: Template; children: React.ReactNode }>(
  function BookPage({ template, children }, ref) {
    const style: CSSProperties = {
      background: template.background,
      color: template.textColor,
      boxShadow: template.glow ? `inset 0 0 60px ${template.accentFrom}33` : undefined,
    };
    return (
      <div ref={ref} className="relative h-full w-full overflow-hidden" style={style} data-density="hard">
        {/* Charred edge glow, inner fold shadow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(120% 60% at 50% 0%, ${template.accentFrom}22, transparent 60%)`,
          }}
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-black/40 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-black/40 to-transparent" />
        <div className="relative h-full w-full">{children}</div>
      </div>
    );
  },
);

function renderPage(
  p: PageKind,
  ctx: {
    currency: string;
    template: Template;
    cart: Record<string, number>;
    onAdd: (it: Item) => void;
    onBump: (id: string, delta: number) => void;
  },
) {
  if (p.kind === "cover") return <CoverPage name={p.name} logoUrl={p.logoUrl} template={ctx.template} />;
  if (p.kind === "back") return <BackPage template={ctx.template} />;
  return <CategoryBookPage {...p} {...ctx} />;
}

function CoverPage({ name, logoUrl, template }: { name: string; logoUrl: string | null; template: Template }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      {logoUrl && (
        <img
          src={logoUrl}
          alt={name}
          className="mb-6 h-20 w-20 rounded-full object-cover"
          style={{ boxShadow: template.glow ? `0 0 40px ${template.accentFrom}` : undefined }}
        />
      )}
      <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: template.accentFrom }}>Menu</p>
      <h1 className="mt-4 text-4xl font-semibold" style={{ fontFamily: template.headingFont, color: template.textColor }}>
        {name}
      </h1>
      <div className="mt-6 h-px w-16" style={{ background: `${template.textColor}33` }} />
      <p className="mt-4 text-[10px] uppercase tracking-[0.3em]" style={{ color: template.mutedColor }}>
        Powered by BAT MENU
      </p>
    </div>
  );
}

function BackPage({ template }: { template: Template }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-10 text-center">
      <p className="text-2xl" style={{ fontFamily: template.headingFont, color: template.accentFrom }}>
        Thank you
      </p>
      <p className="mt-2 max-w-[24ch] text-sm" style={{ color: template.mutedColor }}>
        We hope you enjoyed browsing our menu.
      </p>
    </div>
  );
}

function CategoryBookPage({
  category,
  items,
  part,
  totalParts,
  currency,
  template,
  cart,
  onAdd,
  onBump,
}: {
  category: Category;
  items: Item[];
  part: number;
  totalParts: number;
  currency: string;
  template: Template;
  cart: Record<string, number>;
  onAdd: (it: Item) => void;
  onBump: (id: string, delta: number) => void;
}) {
  return (
    <div className="flex h-full flex-col p-5 sm:p-7">
      <header className="mb-4 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: template.accentFrom }}>Category</p>
        <h2 className="mt-1 text-2xl sm:text-3xl" style={{ fontFamily: template.headingFont, color: template.textColor }}>
          {category.name}
        </h2>
        <div className="mx-auto mt-2 h-px w-12" style={{ background: `${template.textColor}33` }} />
        {totalParts > 1 && (
          <p className="mt-1 text-[9px] uppercase tracking-widest" style={{ color: template.mutedColor }}>
            Part {part} of {totalParts}
          </p>
        )}
      </header>

      <ul className="flex-1 space-y-3 overflow-hidden">
        {items.map((it) => {
          const price = Number(it.discount_price ?? it.price);
          const qty = cart[it.id];
          return (
            <li key={it.id} className="border-b border-dashed pb-2 last:border-0" style={{ borderColor: `${template.textColor}22` }}>
              <div className="flex items-baseline gap-2">
                <h3 className="text-base font-medium" style={{ fontFamily: template.headingFont, color: template.textColor }}>
                  {it.name}
                </h3>
                <div className="flex-1 translate-y-[-3px] border-b border-dotted" style={{ borderColor: `${template.textColor}33` }} />
                <div className="whitespace-nowrap text-base font-semibold tabular-nums" style={{ color: template.priceColor }}>
                  {currency} {price.toFixed(2)}
                </div>
              </div>
              {it.description && (
                <p className="mt-0.5 line-clamp-1 text-[11px]" style={{ color: template.mutedColor }}>{it.description}</p>
              )}
              <div className="mt-1.5 flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {it.is_chef_recommended && <MiniBadge label="Chef" template={template} />}
                  {it.is_todays_special && <MiniBadge label="Today" template={template} accent />}
                </div>
                {qty ? (
                  <div className="flex items-center gap-1.5 rounded-full border px-1 py-0.5" style={{ borderColor: `${template.textColor}33` }}>
                    <button onClick={() => onBump(it.id, -1)} className="grid h-5 w-5 place-items-center rounded-full" style={{ background: `${template.textColor}11`, color: template.textColor }}>
                      <Minus className="h-2.5 w-2.5" />
                    </button>
                    <span className="min-w-3 text-center text-[10px] font-semibold" style={{ color: template.textColor }}>{qty}</span>
                    <button onClick={() => onBump(it.id, 1)} className="grid h-5 w-5 place-items-center rounded-full text-white" style={{ background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})` }}>
                      <Plus className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onAdd(it)}
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white"
                    style={{ background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})` }}
                  >
                    Add
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="pt-10 text-center text-xs" style={{ color: template.mutedColor }}>No items yet.</li>
        )}
      </ul>
    </div>
  );
}

function MiniBadge({ label, template, accent }: { label: string; template: Template; accent?: boolean }) {
  return (
    <span
      className="rounded-full border px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider"
      style={
        accent
          ? { borderColor: template.accentFrom, color: template.accentFrom }
          : { borderColor: `${template.textColor}33`, color: template.mutedColor }
      }
    >
      {label}
    </span>
  );
}

