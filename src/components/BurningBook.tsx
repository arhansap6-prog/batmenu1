// REPLACE ENTIRE FILE: src/components/FireBookMenu.tsx
//
// Fullscreen burning-book menu:
// - Real page-flip (react-pageflip, already a dependency via m.$slug.tsx)
// - Your uploaded photo (place at public/fire-book-bg.png) as the living
//   background, with lightweight animated embers layered on top
// - Back button (top-left) -> returns to Home tab
// - Search / Chef Special / Cart icons (top-right)
// - Tapping a dish photo opens a big fullscreen detail view with its own
//   back button (returns to the book, not to Home)
// - Bottom page counter + prev/next arrows, decorative bookmark ribbon

import { forwardRef, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import HTMLFlipBook from "react-pageflip";
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus, Search, ShoppingBag, Star } from "lucide-react";

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
  onBack,
  onOpenCart,
  cartCount,
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
  onBack: () => void;
  onOpenCart: () => void;
  cartCount: number;
}) {
  const bookRef = useRef<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [chefOnly, setChefOnly] = useState(false);
  const [detailItem, setDetailItem] = useState<Item | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const visibleItems = chefOnly ? items.filter((i) => i.is_chef_recommended) : items;

  const pages = useMemo<PageKind[]>(() => {
    const out: PageKind[] = [{ kind: "cover", name: restaurantName, logoUrl }];
    categories.forEach((c) => {
      const catItems = visibleItems.filter((i) => i.category_id === c.id);
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
  }, [restaurantName, logoUrl, categories, visibleItems]);

  function flipPrev() {
    bookRef.current?.pageFlip()?.flipPrev();
  }
  function flipNext() {
    bookRef.current?.pageFlip()?.flipNext();
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col overflow-hidden">
      {/* Background photo */}
      <div
        className="absolute inset-0 bg-black"
        style={{
          backgroundImage: "url(/fire-book-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-black/35" />

      {/* Animated embers for a living, "on fire" feel */}
      <Embers accent={template.accentFrom} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/40 px-3 py-2 text-xs font-medium text-white backdrop-blur-md"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            title="Search (on Home)"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-md"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={() => setChefOnly((v) => !v)}
            title="Chef Special"
            className="grid h-9 w-9 place-items-center rounded-full border backdrop-blur-md"
            style={{
              borderColor: chefOnly ? template.priceColor : "rgba(255,255,255,0.25)",
              background: chefOnly ? `${template.priceColor}33` : "rgba(0,0,0,0.4)",
              color: chefOnly ? template.priceColor : "white",
            }}
          >
            <Star className="h-4 w-4" fill={chefOnly ? template.priceColor : "none"} />
          </button>
          <button
            onClick={onOpenCart}
            title="Cart"
            className="relative grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-md"
          >
            <ShoppingBag className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-red-600 text-[9px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Book */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-2">
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
              {renderPage(p, {
                currency,
                template,
                cart,
                onAdd,
                onBump,
                onOpenDetail: setDetailItem,
              })}
            </BookPage>
          ))}
        </HTMLFlipBook>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <button
            onClick={flipPrev}
            disabled={currentPage === 0}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-md disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-[11px] uppercase tracking-widest tabular-nums text-white/80">
            {String(currentPage + 1).padStart(2, "0")} / {String(pages.length).padStart(2, "0")}
          </div>
          <button
            onClick={flipNext}
            disabled={currentPage >= pages.length - 1}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-md disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {/* Decorative bookmark ribbon */}
        <div
          className="h-8 w-6 rounded-b-sm"
          style={{ background: `linear-gradient(180deg, ${template.accentFrom}, ${template.accentTo})` }}
        />
      </div>

      {/* Big dish detail view */}
      {detailItem && (
        <DishDetail
          item={detailItem}
          currency={currency}
          template={template}
          cartQty={cart[detailItem.id]}
          onAdd={() => onAdd(detailItem)}
          onBump={(d) => onBump(detailItem.id, d)}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  );
}

function Embers({ accent }: { accent: string }) {
  const embers = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: Math.round(Math.random() * 100),
        delay: Math.round(Math.random() * 6000),
        duration: 5000 + Math.round(Math.random() * 4000),
        size: 2 + Math.round(Math.random() * 3),
        key: i,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes bat-menu-ember-rise {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(-110vh) translateX(10px); opacity: 0; }
        }
      `}</style>
      {embers.map((e) => (
        <span
          key={e.key}
          style={{
            position: "absolute",
            bottom: "-10px",
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            borderRadius: "9999px",
            background: accent,
            boxShadow: `0 0 6px 2px ${accent}`,
            animation: `bat-menu-ember-rise ${e.duration}ms ${e.delay}ms infinite ease-out`,
          }}
        />
      ))}
    </div>
  );
}

const BookPage = forwardRef<HTMLDivElement, { template: Template; children: React.ReactNode }>(
  function BookPage({ template, children }, ref) {
    const style: CSSProperties = {
      background: `${template.background}f2`,
      color: template.textColor,
      boxShadow: template.glow ? `inset 0 0 60px ${template.accentFrom}33` : undefined,
    };
    return (
      <div ref={ref} className="relative h-full w-full overflow-hidden" style={style} data-density="hard">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: `radial-gradient(120% 60% at 50% 0%, ${template.accentFrom}22, transparent 60%)` }}
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
    onOpenDetail: (it: Item) => void;
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
  onOpenDetail,
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
  onOpenDetail: (it: Item) => void;
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

      <ul className="flex-1 space-y-3 overflow-y-auto">
        {items.map((it) => {
          const price = Number(it.discount_price ?? it.price);
          const qty = cart[it.id];
          return (
            <li key={it.id} className="flex gap-3 border-b border-dashed pb-2 last:border-0" style={{ borderColor: `${template.textColor}22` }}>
              {it.image_url && (
                <button onClick={() => onOpenDetail(it)} className="h-14 w-14 flex-none overflow-hidden rounded-lg">
                  <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <h3
                    className="cursor-pointer text-base font-medium"
                    style={{ fontFamily: template.headingFont, color: template.textColor }}
                    onClick={() => onOpenDetail(it)}
                  >
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

function DishDetail({
  item,
  currency,
  template,
  cartQty,
  onAdd,
  onBump,
  onClose,
}: {
  item: Item;
  currency: string;
  template: Template;
  cartQty: number | undefined;
  onAdd: () => void;
  onBump: (delta: number) => void;
  onClose: () => void;
}) {
  const price = Number(item.discount_price ?? item.price);
  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: template.background }}>
      <button
        onClick={onClose}
        className="absolute left-4 top-[calc(1rem+env(safe-area-inset-top))] z-10 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/40 px-3 py-2 text-xs font-medium text-white backdrop-blur-md"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="h-[45vh] w-full object-cover" />
      ) : (
        <div className="h-[45vh] w-full" style={{ background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})` }} />
      )}

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.is_chef_recommended && <MiniBadge label="Chef" template={template} />}
          {item.is_todays_special && <MiniBadge label="Today" template={template} accent />}
        </div>
        <h1 className="mt-2 text-3xl" style={{ fontFamily: template.headingFont, color: template.textColor }}>
          {item.name}
        </h1>
        {item.description && (
          <p className="mt-3 text-sm leading-relaxed" style={{ color: template.mutedColor }}>{item.description}</p>
        )}
        <p className="mt-4 text-2xl font-semibold" style={{ color: template.priceColor }}>
          {currency} {price.toFixed(2)}
        </p>
      </div>

      <div className="border-t p-5" style={{ borderColor: `${template.textColor}22` }}>
        {cartQty ? (
          <div className="flex items-center justify-center gap-4 rounded-full border px-3 py-2" style={{ borderColor: `${template.textColor}33` }}>
            <button onClick={() => onBump(-1)} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: `${template.textColor}11`, color: template.textColor }}>
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-base font-semibold" style={{ color: template.textColor }}>{cartQty}</span>
            <button onClick={() => onBump(1)} className="grid h-8 w-8 place-items-center rounded-full text-white" style={{ background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})` }}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onAdd}
            className="w-full rounded-full py-3 text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})` }}
          >
            Add to order
          </button>
        )}
      </div>
    </div>
  );
}
