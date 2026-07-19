import { useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

type Item = {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  discount_price?: number | string | null;
  category_id?: string | null;
};

type Category = {
  id: string;
  name: string;
};

type Template = {
  background: string;
  surface: string;
  accentFrom: string;
  accentTo: string;
  textColor: string;
  mutedColor: string;
};

type Props = {
  restaurantName: string;
  logoUrl?: string | null;
  currency: string;
  categories: Category[];
  items: Item[];
  template: Template;
  cart: Record<string, number>;
  onAdd: (item: Item) => void;
  onBump: (id: string, delta: number) => void;
  onBack?: () => void;
};

const ITEMS_PER_PAGE = 4;

export function FireBookMenu({
  restaurantName,
  logoUrl,
  currency,
  categories,
  items,
  template,
  onBack,
}: Props) {

  const bookRef = useRef<any>(null);
  const [page, setPage] = useState(0);

  const pages = useMemo(() => {
    const list:any[] = [
      {
        type:"cover",
      }
    ];

    categories.forEach((cat)=>{
      const catItems = items.filter(
        (i)=>i.category_id === cat.id
      );

      for(let i=0;i<catItems.length;i+=ITEMS_PER_PAGE){
        list.push({
          type:"menu",
          category:cat.name,
          items:catItems.slice(i,i+ITEMS_PER_PAGE)
        });
      }
    });

    return list;
  },[categories,items]);


  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">

      {/* BACK BUTTON */}
      <button
        onClick={()=>onBack?.()}
        className="absolute left-5 top-5 z-50 flex items-center gap-2 rounded-full px-5 py-3 text-sm text-white"
        style={{
          background:"rgba(0,0,0,.55)",
          border:"1px solid rgba(255,255,255,.25)"
        }}
      >
        <ArrowLeft size={18}/>
        Back
      </button>


      {/* FIRE BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-red-950 to-black"/>

      <div className="absolute inset-0 flex items-center justify-center">

  <div className="embers">
    {Array.from({length:40}).map((_,i)=>(
      <span key={i}/>
    ))}
  </div>

  <div className="book-container">

  <div className="real-flames">
    {Array.from({length:12}).map((_,i)=>(
      <span key={i}></span>
    ))}
  </div>
        <HTMLFlipBook
          ref={bookRef}
          width={520}
          height={720}
          size="stretch"
          showCover
          drawShadow
          flippingTime={900}
          onFlip={(e:any)=>setPage(e.data)}
          className="luxury-fire-book"
          style={{}}
          >
          {pages.map((p,index)=>(
            <div
              key={index}
              className="book-page"
            >

              {p.type==="cover" && (
                <div className="cover-page">

                  {logoUrl && (
                    <img
                      src={logoUrl}
                      className="h-24 w-24 rounded-full object-cover mb-8"
                    />
                  )}

                  <p className="text-sm tracking-[0.5em] uppercase text-orange-500">
                    Premium Menu
                  </p>

                  <h1 className="mt-6 text-5xl font-bold text-black">
                    {restaurantName}
                  </h1>

                  <div className="mt-10 h-1 w-32 bg-orange-500"/>

                  <p className="mt-8 text-xs tracking-widest text-gray-500">
                    Powered by BAT MENU
                  </p>

                </div>
              )}


              {p.type==="menu" && (

                <div className="menu-page">

                  <h2 className="text-3xl font-bold text-black text-center mb-8">
                    {p.category}
                  </h2>


                  <div className="space-y-6">

                    {p.items.map((item:Item)=>(

                      <div
                        key={item.id}
                        className="border-b border-gray-300 pb-4"
                      >

                        <div className="flex justify-between items-center">

                          <h3 className="text-xl font-semibold text-black">
                            {item.name}
                          </h3>


                          <span className="text-xl font-bold text-orange-600">
                            {currency} {Number(
                              item.discount_price ?? item.price
                            ).toFixed(0)}
                          </span>

                        </div>


                        {item.description && (
                          <p className="mt-2 text-sm text-gray-500">
                            {item.description}
                          </p>
                        )}

                      </div>

                    ))}

                  </div>

                </div>

              )}

            </div>
          ))}


        </HTMLFlipBook>

      </div>
      </div>

      {/* PAGE BUTTONS */}

      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6">

        <button
          onClick={()=>
            bookRef.current?.pageFlip()?.flipPrev()
          }
          className="rounded-full bg-white/20 p-4 text-white"
        >
          <ChevronLeft/>
        </button>


        <button
          onClick={()=>
            bookRef.current?.pageFlip()?.flipNext()
          }
          className="rounded-full bg-white/20 p-4 text-white"
        >
          <ChevronRight/>
        </button>

      </div>

    </div>
  );
}

