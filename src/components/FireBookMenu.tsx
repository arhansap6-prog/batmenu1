// Premium burning-book digital menu experience.
// - Cinematic closed-book intro that opens with a tap
// - Real page-flip via react-pageflip (physical swipe + tap corners)
// - Uses /public/fire-book-bg.png as the living, on-fire backdrop
// - Ember + spark particle layers for a cinematic feel
// - Chapter intro page before each category, dish cards printed onto pages
// - Floating cart, back, cart-count, search/chef shortcuts, page indicator
// - Fullscreen dish detail with veg/non-veg + chef + today's-special badges

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import HTMLFlipBook from "react-pageflip";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Flame,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";

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

const ITEMS_PER_PAGE = 3;

type PageKind =
  | { kind: "cover"; name: string; logoUrl: string | null }
  | { kind: "chapter"; category: Category; count: number }
  | {
      kind: "category";
      category: Category;
      items: Item[];
      part: number;
      totalParts: number;
    }
  | { kind: "back" };

// Rough veg heuristic — we don't store a flag, so infer from text.
const NON_VEG = /\b(chicken|mutton|beef|lamb|prawn|shrimp|fish|egg|bacon|ham|pork|kebab|tikka|keema|seekh)\b/i;
const VEG_HINT = /\b(paneer|veg|aloo|dal|palak|mushroom|corn|cheese|tofu|kaju|matar)\b/i;
function isVeg(it: Item): boolean | null {
  const t = `${it.name} ${it.description ?? ""}`;
  if (NON_VEG.test(t)) return false;
  if (VEG_HINT.test(t)) return true;
  return null;
}

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
  const [opened, setOpened] = useState(false);

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
      out.push({ kind: "chapter", category: c, count: catItems.length });
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
      {/* Living background */}
      <div
        className="absolute inset-0 bg-black"
        style={{
          backgroundImage: "url(/fire-book-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />

      {/* Slow drifting embers + sparks */}
      <ParticleField accent={template.accentFrom} />

      {/* Global keyframes */}
      <style>{`
        @keyframes fbm-ember-rise { 0%{transform:translateY(0) translateX(0);opacity:0} 10%{opacity:1} 100%{transform:translateY(-110vh) translateX(14px);opacity:0} }
        @keyframes fbm-spark { 0%,100%{opacity:.2;transform:scale(1)} 50%{opacity:1;transform:scale(1.4)} }
        @keyframes fbm-pulse-glow { 0%,100%{box-shadow:0 0 30px 4px var(--fbm-accent), inset 0 0 24px 2px rgba(0,0,0,.4)} 50%{box-shadow:0 0 60px 10px var(--fbm-accent), inset 0 0 24px 2px rgba(0,0,0,.4)} }
        @keyframes fbm-open-book { 0%{transform:perspective(1400px) rotateY(-25deg) rotateX(6deg) scale(.85);opacity:0} 100%{transform:perspective(1400px) rotateY(0) rotateX(0) scale(1);opacity:1} }
        @keyframes fbm-float-in { 0%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes fbm-cover-glow { 0%,100%{filter:drop-shadow(0 0 18px var(--fbm-accent))} 50%{filter:drop-shadow(0 0 40px var(--fbm-accent))} }
      `}</style>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <GlassBtn onClick={onBack} label="Home">
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </GlassBtn>
        <div className="flex items-center gap-2">
          <IconBtn title="Search (on Home)" onClick={onBack}>
            <Search className="h-4 w-4" />
          </IconBtn>
          <IconBtn
            title="Chef Special"
            onClick={() => setChefOnly((v) => !v)}
            style={{
              borderColor: chefOnly ? template.priceColor : undefined,
              background: chefOnly ? `${template.priceColor}33` : undefined,
              color: chefOnly ? template.priceColor : undefined,
            }}
          >
            <Star className="h-4 w-4" fill={chefOnly ? template.priceColor : "none"} />
          </IconBtn>
          <IconBtn title="Cart" onClick={onOpenCart}>
            <ShoppingBag className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-red-600 text-[9px] font-bold text-white shadow">
                {cartCount}
              </span>
            )}
          </IconBtn>
        </div>
      </div>

      {/* Book stage */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-2">
        {!opened ? (
          <ClosedBookIntro
  template={template}
  restaurantName={restaurantName}
  logoUrl={logoUrl}
  onOpen={() => setOpened(true)}
/>
        ) : (
          <div
            className="w-full max-w-[980px]"
            style={{ animation: "fbm-open-book 900ms cubic-bezier(.2,.7,.2,1) both" }}
          >
            <HTMLFlipBook
              ref={bookRef}
              width={isMobile ? 320 : 440}
              height={isMobile ? 480 : 620}
              size="stretch"
              minWidth={280}
              maxWidth={500}
              minHeight={420}
              maxHeight={680}
              showCover={true}
              drawShadow={true}
              flippingTime={800}
              usePortrait={isMobile}
              mobileScrollSupport={false}
              maxShadowOpacity={0.6}
              className="fire-book-shadow"
              style={{}}
              startPage={0}
              startZIndex={0}
              autoSize={true}
              clickEventForward={true}
              useMouseEvents={true}
              swipeDistance={30}
              showPageCorners={true}
              disableFlipByClick={true}
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
        )}
      </div>

      {/* Bottom bar */}
      {opened && (
        <div className="relative z-10 flex items-center justify-between px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3">
            <IconBtn onClick={flipPrev} title="Previous" disabled={currentPage === 0}>
              <ChevronLeft className="h-4 w-4" />
            </IconBtn>
            <div
              className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[11px] uppercase tracking-widest tabular-nums text-white/85 backdrop-blur-md"
              style={{ fontFamily: template.headingFont }}
            >
              {String(currentPage + 1).padStart(2, "0")} / {String(pages.length).padStart(2, "0")}
            </div>
            <IconBtn
              onClick={flipNext}
              title="Next"
              disabled={currentPage >= pages.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </IconBtn>
          </div>
          <div
            className="h-9 w-6 rounded-b-sm shadow-lg"
            style={{
              background: `linear-gradient(180deg, ${template.accentFrom}, ${template.accentTo})`,
              boxShadow: `0 4px 20px ${template.accentFrom}66`,
            }}
          />
        </div>
      )}

      {/* Dish detail */}
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

/* ---------- Closed book intro ---------- */

function ClosedBookIntro({
  template,
  restaurantName,
  logoUrl,
  onOpen,
}: {
  template: Template;
  restaurantName: string;
  logoUrl: string | null;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="group relative flex flex-col items-center gap-6"
      style={{ ["--fbm-accent" as any]: template.accentFrom }}
    >
      <div
        className="relative flex h-[520px] w-[340px] items-center justify-center rounded-[14px] sm:h-[600px] sm:w-[420px]"
        style={{
          background: `linear-gradient(135deg, #1a0b06 0%, #0a0403 60%, #1c0a06 100%)`,
          border: "1px solid rgba(255,180,90,.25)",
          animation: "fbm-pulse-glow 3.4s ease-in-out infinite",
          transform: "perspective(1400px) rotateY(-8deg) rotateX(4deg)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Spine */}
        <div
          className="absolute left-0 top-0 h-full w-4 rounded-l-[14px]"
          style={{
            background: "linear-gradient(90deg, rgba(0,0,0,.9), rgba(255,255,255,.05))",
          }}
        />
        {/* Gold border frame */}
        <div
          className="absolute inset-3 rounded-[10px] border"
          style={{ borderColor: `${template.accentFrom}55` }}
        />
        <div
          className="absolute inset-5 rounded-[8px] border"
          style={{ borderColor: `${template.accentFrom}22` }}
        />

        {/* Cover content */}
        <div
          className="relative z-10 flex flex-col items-center gap-5 px-8 text-center"
          style={{ animation: "fbm-cover-glow 3s ease-in-out infinite" }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={restaurantName}
              className="h-24 w-24 rounded-full object-cover ring-2"
              style={{ boxShadow: `0 0 40px ${template.accentFrom}` }}
            />
          ) : (
            <div
              className="grid h-24 w-24 place-items-center rounded-full"
              style={{
                background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})`,
                boxShadow: `0 0 40px ${template.accentFrom}`,
              }}
            >
              <Flame className="h-10 w-10 text-white" />
            </div>
          )}
          <p
            className="text-[10px] uppercase tracking-[0.5em]"
            style={{ color: template.accentFrom }}
          >
            The Menu
          </p>
          <h1
            className="text-3xl sm:text-4xl"
            style={{
              fontFamily: template.headingFont,
              color: "#f6e2b3",
              textShadow: `0 2px 20px ${template.accentFrom}88`,
            }}
          >
            {restaurantName}
          </h1>
          <div className="h-px w-16" style={{ background: `${template.accentFrom}88` }} />
          <p
            className="text-[10px] uppercase tracking-[0.35em]"
            style={{ color: "#c9a86a" }}
          >
            Tap to open
          </p>
        </div>

        {/* Corner ornaments */}
        {["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"].map((c) => (
          <div
            key={c}
            className={`absolute h-4 w-4 ${c}`}
            style={{
              borderTop: c.includes("top") ? `2px solid ${template.accentFrom}` : "none",
              borderBottom: c.includes("bottom") ? `2px solid ${template.accentFrom}` : "none",
              borderLeft: c.includes("left") ? `2px solid ${template.accentFrom}` : "none",
              borderRight: c.includes("right") ? `2px solid ${template.accentFrom}` : "none",
              opacity: 0.7,
            }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-4 py-2 text-xs text-white/85 backdrop-blur-md transition group-hover:bg-black/70">
        <Sparkles className="h-3.5 w-3.5" style={{ color: template.accentFrom }} />
        Tap the book to begin
      </div>
    </button>
  );
}

/* ---------- Particles ---------- */

function ParticleField({ accent }: { accent: string }) {
  const embers = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: Math.round(Math.random() * 100),
        delay: Math.round(Math.random() * 8000),
        duration: 5000 + Math.round(Math.random() * 5000),
        size: 2 + Math.round(Math.random() * 3),
        key: i,
      })),
    [],
  );
  const sparks = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: Math.round(Math.random() * 100),
        top: Math.round(Math.random() * 100),
        delay: Math.round(Math.random() * 4000),
        duration: 2000 + Math.round(Math.random() * 2500),
        key: i,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {embers.map((e) => (
        <span
          key={`e-${e.key}`}
          style={{
            position: "absolute",
            bottom: -10,
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            borderRadius: 9999,
            background: accent,
            boxShadow: `0 0 6px 2px ${accent}`,
            animation: `fbm-ember-rise ${e.duration}ms ${e.delay}ms infinite ease-out`,
          }}
        />
      ))}
      {sparks.map((s) => (
        <span
          key={`s-${s.key}`}
          style={{
            position: "absolute",
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: 3,
            height: 3,
            borderRadius: 9999,
            background: "#ffcf80",
            boxShadow: `0 0 8px 2px ${accent}`,
            animation: `fbm-spark ${s.duration}ms ${s.delay}ms infinite ease-in-out`,
            opacity: 0.4,
          }}
        />
      ))}
    </div>
  );
}

/* ---------- Buttons ---------- */

function GlassBtn({ children, onClick, label }: { children: ReactNode; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/50 px-3 py-2 text-xs font-medium text-white backdrop-blur-md transition hover:bg-black/70"
    >
      {children}
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  disabled,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="relative grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70 disabled:opacity-30"
      style={style}
    >
      {children}
    </button>
  );
}

/* ---------- Page shell ---------- */

const BookPage = forwardRef<HTMLDivElement, { template: Template; children: ReactNode }>(
  function BookPage({ template, children }, ref) {
    const style: CSSProperties = {
      background:
        "linear-gradient(180deg, rgba(245,224,178,.98) 0%, rgba(232,206,158,.96) 55%, rgba(210,182,132,.96) 100%)",
      color: "#2b1a10",
      boxShadow: `inset 0 0 60px rgba(80,30,10,.35), inset 0 0 12px rgba(0,0,0,.25)`,
    };
    return (
      <div
        ref={ref}
        className="relative h-full w-full overflow-hidden"
        style={style}
        data-density="hard"
      >
        {/* Charred paper edges */}
        <div className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(120% 60% at 50% 0%, rgba(255,140,50,.18), transparent 55%), radial-gradient(120% 60% at 50% 100%, rgba(120,30,10,.35), transparent 55%)",
          }}
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/60 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-black/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-black/50 to-transparent" />
        {/* Subtle paper grain via SVG noise */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[.08] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          }}
        />
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
  if (p.kind === "cover")
    return <CoverPage name={p.name} logoUrl={p.logoUrl} template={ctx.template} />;
  if (p.kind === "chapter")
    return <ChapterPage category={p.category} count={p.count} template={ctx.template} />;
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
          className="mb-6 h-24 w-24 rounded-full object-cover"
          style={{ boxShadow: `0 0 30px ${template.accentFrom}77` }}
        />
      )}
      <p
        className="text-[10px] uppercase tracking-[0.5em]"
        style={{ color: "#8a4a1c" }}
      >
        La Carte
      </p>
      <h1
        className="mt-4 text-4xl"
        style={{ fontFamily: template.headingFont, color: "#2b1a10" }}
      >
        {name}
      </h1>
      <div className="mt-4 h-px w-20" style={{ background: "#2b1a1055" }} />
      <p className="mt-4 max-w-[24ch] text-sm italic" style={{ color: "#5a3a20" }}>
        A curated selection of chef-crafted plates. Turn the page to begin.
      </p>
      <div className="mt-8 flex items-center gap-2 text-[10px] uppercase tracking-[0.35em]" style={{ color: "#8a4a1c" }}>
        <Flame className="h-3 w-3" /> Powered by BAT MENU
      </div>
    </div>
  );
}

function ChapterPage({ category, count, template }: { category: Category; count: number; template: Template }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center"
      style={{ animation: "fbm-float-in 500ms ease both" }}
    >
      <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: "#8a4a1c" }}>
        Chapter
      </p>
      <h2
        className="mt-3 text-5xl leading-tight"
        style={{ fontFamily: template.headingFont, color: "#2b1a10", textShadow: `0 2px 12px ${template.accentFrom}33` }}
      >
        {category.name}
      </h2>
      <div className="mt-4 flex items-center gap-3">
        <span className="h-px w-10" style={{ background: "#2b1a1055" }} />
        <Flame className="h-4 w-4" style={{ color: template.accentFrom }} />
        <span className="h-px w-10" style={{ background: "#2b1a1055" }} />
      </div>
      <p className="mt-4 text-xs uppercase tracking-widest" style={{ color: "#5a3a20" }}>
        {count} {count === 1 ? "dish" : "dishes"}
      </p>
    </div>
  );
}

function BackPage({ template }: { template: Template }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-10 text-center">
      <Flame className="h-8 w-8" style={{ color: template.accentFrom }} />
      <p
        className="mt-4 text-3xl"
        style={{ fontFamily: template.headingFont, color: "#2b1a10" }}
      >
        Thank you
      </p>
      <p className="mt-2 max-w-[24ch] text-sm italic" style={{ color: "#5a3a20" }}>
        Bon appétit. We hope you enjoyed browsing our menu.
      </p>
      <div className="mt-6 h-px w-16" style={{ background: "#2b1a1055" }} />
      <p className="mt-4 text-[10px] uppercase tracking-[0.35em]" style={{ color: "#8a4a1c" }}>
        BAT MENU
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
    <div className="flex h-full flex-col p-5 sm:p-6" style={{ animation: "fbm-float-in 400ms ease both" }}>
      <header className="mb-3 text-center">
        <p className="text-[9px] uppercase tracking-[0.4em]" style={{ color: "#8a4a1c" }}>
          Category
        </p>
        <h2
          className="mt-1 text-2xl sm:text-3xl"
          style={{ fontFamily: template.headingFont, color: "#2b1a10" }}
        >
          {category.name}
        </h2>
        <div className="mx-auto mt-2 h-px w-14" style={{ background: "#2b1a1055" }} />
        {totalParts > 1 && (
          <p className="mt-1 text-[9px] uppercase tracking-widest" style={{ color: "#8a4a1c" }}>
            Page {part} of {totalParts}
          </p>
        )}
      </header>

      <ul className="flex-1 space-y-3 overflow-y-auto pr-1">
        {items.map((it) => {
          const price = Number(it.discount_price ?? it.price);
          const qty = cart[it.id];
          const veg = isVeg(it);
          return (
            <li
              key={it.id}
              className="relative flex gap-3 rounded-lg border p-2"
              style={{
                borderColor: "#2b1a1022",
                background: "linear-gradient(180deg, rgba(255,240,210,.55), rgba(230,200,150,.35))",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,.35)",
              }}
            >
              <button
                onClick={() => onOpenDetail(it)}
                className="relative h-16 w-16 flex-none overflow-hidden rounded-md ring-1 ring-black/15"
              >
                {it.image_url ? (
                  <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="grid h-full w-full place-items-center"
                    style={{
                      background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})`,
                    }}
                  >
                    <Flame className="h-5 w-5 text-white/80" />
                  </div>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  {veg !== null && <VegDot veg={veg} />}
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onOpenDetail(it)}
                  >
                    <h3
                      className="truncate text-base font-semibold leading-tight"
                      style={{ fontFamily: template.headingFont, color: "#2b1a10" }}
                    >
                      {it.name}
                    </h3>
                  </button>
                  <div
                    className="whitespace-nowrap text-base font-bold tabular-nums"
                    style={{ color: "#8a2a10" }}
                  >
                    {currency}{price.toFixed(0)}
                  </div>
                </div>
                {it.description && (
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug" style={{ color: "#5a3a20" }}>
                    {it.description}
                  </p>
                )}
                <div className="mt-1.5 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {it.is_chef_recommended && (
                      <PaperBadge accent color="#8a2a10">Chef</PaperBadge>
                    )}
                    {it.is_todays_special && (
                      <PaperBadge accent color={template.accentFrom}>Today</PaperBadge>
                    )}
                  </div>
                  {qty ? (
                    <div className="flex items-center gap-1.5 rounded-full border bg-white/60 px-1 py-0.5" style={{ borderColor: "#2b1a1033" }}>
                      <button
                        onClick={() => onBump(it.id, -1)}
                        className="grid h-6 w-6 place-items-center rounded-full bg-black/10 text-[#2b1a10]"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-4 text-center text-xs font-bold text-[#2b1a10]">{qty}</span>
                      <button
                        onClick={() => onBump(it.id, 1)}
                        className="grid h-6 w-6 place-items-center rounded-full text-white"
                        style={{
                          background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})`,
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onAdd(it)}
                      className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow"
                      style={{
                        background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})`,
                        boxShadow: `0 4px 14px ${template.accentFrom}66`,
                      }}
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
          <li className="pt-10 text-center text-xs" style={{ color: "#5a3a20" }}>
            No items yet.
          </li>
        )}
      </ul>
    </div>
  );
}

function VegDot({ veg }: { veg: boolean }) {
  const color = veg ? "#1a7a2e" : "#a11d1d";
  return (
    <span
      title={veg ? "Vegetarian" : "Non-vegetarian"}
      className="mt-1 grid h-3 w-3 flex-none place-items-center border"
      style={{ borderColor: color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
    </span>
  );
}

function PaperBadge({ children, color, accent }: { children: ReactNode; color: string; accent?: boolean }) {
  return (
    <span
      className="rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
      style={
        accent
          ? { borderColor: color, color, background: `${color}12` }
          : { borderColor: "#2b1a1033", color: "#5a3a20" }
      }
    >
      {children}
    </span>
  );
}

/* ---------- Dish detail ---------- */

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
  const veg = isVeg(item);
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black" style={{ animation: "fbm-float-in 260ms ease both" }}>
      <button
        onClick={onClose}
        className="absolute left-4 top-[calc(1rem+env(safe-area-inset-top))] z-10 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/50 px-3 py-2 text-xs font-medium text-white backdrop-blur-md"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="relative">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="h-[50vh] w-full object-cover" />
        ) : (
          <div
            className="h-[50vh] w-full"
            style={{
              background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})`,
            }}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 text-white">
        <div className="flex flex-wrap items-center gap-2">
          {veg !== null && <VegDot veg={veg} />}
          {item.is_chef_recommended && (
            <span className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90">
              Chef's Pick
            </span>
          )}
          {item.is_todays_special && (
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ borderColor: template.accentFrom, color: template.accentFrom }}
            >
              Today's Special
            </span>
          )}
        </div>
        <h1 className="mt-3 text-3xl" style={{ fontFamily: template.headingFont }}>
          {item.name}
        </h1>
        {item.description && (
          <p className="mt-3 text-sm leading-relaxed text-white/75">{item.description}</p>
        )}
        <p className="mt-5 text-3xl font-bold" style={{ color: template.accentFrom }}>
          {currency} {price.toFixed(2)}
        </p>
      </div>

      <div
        className="border-t p-5"
        style={{ borderColor: "rgba(255,255,255,.12)" }}
      >
        {cartQty ? (
          <div className="flex items-center justify-center gap-4 rounded-full border border-white/20 bg-white/5 px-3 py-2 backdrop-blur">
            <button
              onClick={() => onBump(-1)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-lg font-bold text-white">{cartQty}</span>
            <button
              onClick={() => onBump(1)}
              className="grid h-9 w-9 place-items-center rounded-full text-white"
              style={{
                background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})`,
              }}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onAdd}
            className="w-full rounded-full py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-xl"
            style={{
              background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})`,
              boxShadow: `0 10px 30px ${template.accentFrom}66`,
            }}
          >
            Add to order
          </button>
        )}
      </div>
    </div>
  );
}
