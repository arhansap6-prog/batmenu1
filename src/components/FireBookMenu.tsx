// src/components/FireBookMenu.tsx

import { forwardRef, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import HTMLFlipBook from "react-pageflip";
import { ChevronLeft, ChevronRight, Minus, Plus, ArrowLeft } from "lucide-react";

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

type Category = {
  id: string;
  name: string;
  sort_order: number;
};

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
}) {
  const bookRef = useRef<any>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");

    const check = () => setIsMobile(mq.matches);

    check();
    mq.addEventListener("change", check);

    return () => mq.removeEventListener("change", check);
  }, []);

  const pages = useMemo<PageKind[]>(() => {
    const out: PageKind[] = [
      {
        kind: "cover",
        name: restaurantName,
        logoUrl,
      },
    ];

    categories.forEach((category) => {
      const categoryItems = items.filter(
        (item) => item.category_id === category.id,
      );

      if (!categoryItems.length) return;

      const totalParts = Math.ceil(
        categoryItems.length / ITEMS_PER_PAGE,
      );

      for (let i = 0; i < totalParts; i++) {
        out.push({
          kind: "category",
          category,
          items: categoryItems.slice(
            i * ITEMS_PER_PAGE,
            (i + 1) * ITEMS_PER_PAGE,
          ),
          part: i + 1,
          totalParts,
        });
      }
    });

    out.push({
      kind: "back",
    });

    return out;
  }, [restaurantName, logoUrl, categories, items]);

  function flipPrev() {
    bookRef.current?.pageFlip()?.flipPrev();
  }

  function flipNext() {
    bookRef.current?.pageFlip()?.flipNext();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: template.background,
      }}
    >

      <button
        onClick={onBack}
        className="absolute left-5 top-5 z-[100] flex items-center gap-2 rounded-full px-4 py-2 text-sm"
        style={{
          background: template.surface,
          color: template.textColor,
          border: `1px solid ${template.textColor}33`,
        }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div
        className="pointer-events-none absolute inset-0 opacity-40 blur-3xl"
        style={{
          background:
            `radial-gradient(circle, ${template.accentFrom}55, transparent 60%)`,
        }}
      />

      <div className="relative">        <HTMLFlipBook
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
          {pages.map((page, index) => (
            <BookPage
              key={index}
              template={template}
            >
              {renderPage(page, {
                currency,
                template,
                cart,
                onAdd,
                onBump,
              })}
            </BookPage>
          ))}
        </HTMLFlipBook>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={flipPrev}
          disabled={currentPage === 0}
          className="flex h-10 w-10 items-center justify-center rounded-full border disabled:opacity-30"
          style={{
            background: template.surface,
            color: template.textColor,
            borderColor: `${template.textColor}33`,
          }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <span
          className="text-xs tracking-widest"
          style={{
            color: template.mutedColor,
          }}
        >
          {currentPage + 1} / {pages.length}
        </span>

        <button
          onClick={flipNext}
          disabled={currentPage >= pages.length - 1}
          className="flex h-10 w-10 items-center justify-center rounded-full border disabled:opacity-30"
          style={{
            background: template.surface,
            color: template.textColor,
            borderColor: `${template.textColor}33`,
          }}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <p
        className="mt-3 text-[10px] uppercase tracking-widest"
        style={{
          color: template.mutedColor,
        }}
      >
        Swipe or tap the edge to turn pages
      </p>

    </div>
  );
}


const BookPage = forwardRef<
  HTMLDivElement,
  {
    template: Template;
    children: React.ReactNode;
  }
>(function BookPage(
  { template, children },
  ref,
) {
  const style: CSSProperties = {
    background: template.background,
    color: template.textColor,
    boxShadow: template.glow
      ? `inset 0 0 70px ${template.accentFrom}33`
      : undefined,
  };

  return (
    <div
      ref={ref}
      className="relative h-full w-full overflow-hidden"
      style={style}
      data-density="hard"
    >

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            `radial-gradient(circle at top, ${template.accentFrom}33, transparent 60%)`,
        }}
      />

      <div
        className="pointer-events-none absolute left-0 top-0 h-full w-6"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,.5), transparent)",
        }}
      />

      <div className="relative h-full w-full">
        {children}
      </div>

    </div>
  );
});


function renderPage(
  page: PageKind,
  ctx: {
    currency: string;
    template: Template;
    cart: Record<string, number>;
    onAdd: (it: Item) => void;
    onBump: (id: string, delta: number) => void;
  },
) {
  if (page.kind === "cover") {
    return (
      <CoverPage
        name={page.name}
        logoUrl={page.logoUrl}
        template={ctx.template}
      />
    );
  }

  if (page.kind === "back") {
    return (
      <BackPage template={ctx.template} />
    );
  }

  return (
    <CategoryBookPage
      {...page}
      {...ctx}
    />
  );
                             }function CoverPage({
  name,
  logoUrl,
  template,
}: {
  name: string;
  logoUrl: string | null;
  template: Template;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">

      {logoUrl && (
        <img
          src={logoUrl}
          alt={name}
          className="mb-6 h-24 w-24 rounded-full object-cover"
          style={{
            boxShadow: template.glow
              ? `0 0 50px ${template.accentFrom}`
              : undefined,
          }}
        />
      )}

      <p
        className="text-xs uppercase tracking-[0.5em]"
        style={{
          color: template.accentFrom,
        }}
      >
        Menu
      </p>

      <h1
        className="mt-5 text-4xl font-bold"
        style={{
          color: template.textColor,
          fontFamily: template.headingFont,
        }}
      >
        {name}
      </h1>

      <div
        className="mt-6 h-px w-20"
        style={{
          background: template.accentFrom,
        }}
      />

      <p
        className="mt-5 text-[10px] uppercase tracking-widest"
        style={{
          color: template.mutedColor,
        }}
      >
        Powered by BAT MENU
      </p>

    </div>
  );
}


function BackPage({
  template,
}: {
  template: Template;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-10 text-center">

      <h2
        className="text-3xl font-bold"
        style={{
          color: template.accentFrom,
          fontFamily: template.headingFont,
        }}
      >
        Thank You
      </h2>

      <p
        className="mt-4 text-sm"
        style={{
          color: template.mutedColor,
        }}
      >
        We hope you enjoyed our menu.
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
    <div className="flex h-full flex-col p-6">

      <div className="mb-5 text-center">

        <p
          className="text-[10px] uppercase tracking-widest"
          style={{
            color: template.accentFrom,
          }}
        >
          Category
        </p>

        <h2
          className="mt-2 text-3xl font-bold"
          style={{
            color: template.textColor,
            fontFamily: template.headingFont,
          }}
        >
          {category.name}
        </h2>

        {totalParts > 1 && (
          <p
            className="mt-1 text-xs"
            style={{
              color: template.mutedColor,
            }}
          >
            Page {part} of {totalParts}
          </p>
        )}

      </div>


      <div className="space-y-4 overflow-hidden">

        {items.map((item) => {

          const price = Number(
            item.discount_price ?? item.price
          );

          const qty = cart[item.id] || 0;

          return (
            <div
              key={item.id}
              className="border-b pb-3"
              style={{
                borderColor: `${template.textColor}22`,
              }}
            >

              <div className="flex items-center gap-2">

                <h3
                  className="text-base font-semibold"
                  style={{
                    color: template.textColor,
                  }}
                >
                  {item.name}
                </h3>


                <div className="flex-1 border-b border-dotted" />


                <span
                  className="font-bold"
                  style={{
                    color: template.priceColor,
                  }}
                >
                  {currency} {price.toFixed(2)}
                </span>

              </div>


              {item.description && (
                <p
                  className="mt-1 text-xs"
                  style={{
                    color: template.mutedColor,
                  }}
                >
                  {item.description}
                </p>
              )}


              <div className="mt-2 flex justify-between">

                <div>
                  {item.is_chef_recommended && (
                    <MiniBadge
                      label="Chef"
                      template={template}
                    />
                  )}
                </div>


                {qty > 0 ? (

                  <div className="flex items-center gap-2">

                    <button
                      onClick={() => onBump(item.id,-1)}
                    >
                      <Minus size={14}/>
                    </button>

                    <span>{qty}</span>

                    <button
                      onClick={() => onBump(item.id,1)}
                    >
                      <Plus size={14}/>
                    </button>

                  </div>

                ) : (

                  <button
                    onClick={() => onAdd(item)}
                    className="rounded-full px-3 py-1 text-xs text-white"
                    style={{
                      background:
                        `linear-gradient(135deg,${template.accentFrom},${template.accentTo})`,
                    }}
                  >
                    Add
                  </button>

                )}

              </div>

            </div>
          );

        })}

      </div>

    </div>
  );
}



function MiniBadge({
  label,
  template,
}: {
  label:string;
  template:Template;
}) {

  return (
    <span
      className="rounded-full border px-2 py-1 text-[9px]"
      style={{
        color:template.accentFrom,
        borderColor:template.accentFrom,
      }}
    >
      {label}
    </span>
  );

      }
