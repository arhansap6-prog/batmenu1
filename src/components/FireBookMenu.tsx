// src/components/FireBookMenu.tsx

import { useMemo, useRef, useState, useEffect } from "react";
import HTMLFlipBook from "react-pageflip";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Flame,
  Plus,
  Minus,
} from "lucide-react";

type Item = {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  discount_price?: number | string | null;
  category_id: string | null;
};

type Category = {
  id: string;
  name: string;
};

type Template = {
  accentFrom: string;
  accentTo: string;
  textColor: string;
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
  onBump: (id:string, delta:number)=>void;
  onBack?:()=>void;
  
 };



const ITEMS_PER_PAGE = 6;


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
 onBack
}:Props){

const bookRef = useRef<any>(null);

const [mobile,setMobile]=useState(false);
const [page,setPage]=useState(0);


useEffect(()=>{
 const check=()=>{
  setMobile(window.innerWidth < 768)
 };

 check();

 window.addEventListener("resize",check);

 return ()=>window.removeEventListener("resize",check);

},[]);



const pages = useMemo(()=>{

let result:any[]=[];


result.push({
type:"cover"
});


categories.forEach(cat=>{

const list=items.filter(
i=>i.category_id===cat.id
);


for(
let i=0;
i<list.length;
i+=ITEMS_PER_PAGE
){

result.push({
type:"menu",
category:cat,
items:list.slice(
i,
i+ITEMS_PER_PAGE
)
});

}

});


result.push({
type:"end"
});


return result;


},[
categories,
items
]);



function next(){

bookRef.current
?.pageFlip()
?.flipNext();

}


function prev(){

bookRef.current
?.pageFlip()
?.flipPrev();

}


return (

<div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black">


{/* FIRE LEFT */}

<div
className="absolute left-0 top-0 h-full w-40 animate-pulse"
style={{
background:
"radial-gradient(circle,#ff4500 0%,transparent 65%)",
filter:"blur(30px)"
}}
/>



{/* FIRE RIGHT */}

<div
className="absolute right-0 top-0 h-full w-40 animate-pulse"
style={{
background:
"radial-gradient(circle,#ff4500 0%,transparent 65%)",
filter:"blur(30px)"
}}
/>



{/* TOP BACK BUTTON */}

<button

onClick={onBack}

className="absolute left-5 top-5 z-50 flex items-center gap-2 rounded-full px-5 py-3 text-white"

style={{
background:
"rgba(0,0,0,.5)",
border:
"1px solid rgba(255,255,255,.2)"
}}

>

<ArrowLeft size={18}/>

Back

</button>



<div className="relative">


<HTMLFlipBook

ref={bookRef}

width={mobile?340:520}

height={mobile?520:720}

size="fixed"

showCover

drawShadow

flippingTime={900}

usePortrait={mobile}

onFlip={(e:any)=>setPage(e.data)}

className="burn-book"

>{pages.map((p,index)=>(

<BookPage key={index}>

{p.type==="cover" && (

<div className="flex h-full flex-col items-center justify-center text-center p-10">

{logoUrl && (

<img
src={logoUrl}
className="h-28 w-28 rounded-full object-cover mb-8"
/>

)}


<div className="flex items-center gap-2 text-orange-500 text-sm uppercase tracking-[0.5em]">

<Flame size={18}/>

Premium Menu

<Flame size={18}/>

</div>


<h1

className="mt-8 text-5xl font-bold"

style={{
color:"#111"
}}

>

{restaurantName}

</h1>


<div

className="mt-8 h-[2px] w-32"

style={{
background:
"linear-gradient(90deg,#ff4500,#ffcc00)"
}}

/>


<p className="mt-8 text-xs tracking-widest text-gray-500">

BAT MENU EXPERIENCE

</p>


</div>

)}



{p.type==="menu" && (

<div className="h-full p-8">


<h2

className="mb-8 text-center text-3xl font-bold"

style={{
color:"#111"
}}

>

{p.category.name}

</h2>



<div className="space-y-6">


{p.items.map((item:Item)=>(


<div

key={item.id}

className="border-b border-gray-200 pb-4"

>


<div className="flex items-center gap-3">


<h3

className="text-lg font-semibold text-black"

>

{item.name}

</h3>


<div className="flex-1 border-b border-dotted border-gray-300"/>


<p

className="font-bold text-orange-600"

>

{currency} {Number(
item.discount_price ?? item.price
).toFixed(0)}

</p>


</div>



{item.description && (

<p className="mt-1 text-xs text-gray-500">

{item.description}

</p>

)}



<div className="mt-3 flex justify-end">


{cart[item.id] ? (


<div className="flex items-center gap-3 rounded-full bg-black px-3 py-1 text-white">


<button

onClick={()=>onBump(item.id,-1)}

>

<Minus size={14}/>

</button>



<span>

{cart[item.id]}

</span>



<button

onClick={()=>onBump(item.id,1)}

>

<Plus size={14}/>

</button>


</div>



):(


<button

onClick={()=>onAdd(item)}

className="rounded-full px-4 py-1 text-xs text-white"

style={{
background:
"linear-gradient(135deg,#ff4500,#ff9900)"
}}

>

ADD

</button>


)}


</div>



</div>


))}


</div>


</div>

)}




{p.type==="end" && (

<div className="flex h-full items-center justify-center text-center">


<div>


<Flame

size={60}

className="mx-auto text-orange-500"

/>


<h2 className="mt-6 text-4xl font-bold">

Thank You

</h2>


<p className="mt-3 text-gray-500">

Visit Again

</p>


</div>


</div>

)}



</BookPage>


))}


</HTMLFlipBook>


{/* PAGE BUTTONS */}


<div className="mt-8 flex justify-center gap-6">


<button

onClick={prev}

className="rounded-full bg-white p-4 shadow-xl"

>

<ChevronLeft/>

</button>



<span className="rounded-full bg-white px-5 py-3 shadow-xl">

{page+1}/{pages.length}

</span>



<button

onClick={next}

className="rounded-full bg-white p-4 shadow-xl"

>

<ChevronRight/>

</button>


</div>



</div>

</div>

)

  }
function BookPage({
children
}:{
children:React.ReactNode
}){

return(

<div

className="
relative
h-full
w-full
overflow-hidden
bg-white
"

data-density="hard"

>


{/* PAPER TEXTURE */}

<div

className="
absolute
inset-0
pointer-events-none
opacity-40
"

style={{

backgroundImage:
`
radial-gradient(#ddd 1px, transparent 1px)
`,

backgroundSize:
"18px 18px"

}}

/>



{/* LEFT PAGE BURN EDGE */}

<div

className="
absolute
left-0
top-0
h-full
w-8
pointer-events-none
"

style={{

background:
`
linear-gradient(
90deg,
#ff4500,
#ff9900,
transparent
)
`,

filter:
"blur(8px)"

}}

/>



{/* RIGHT PAGE BURN EDGE */}

<div

className="
absolute
right-0
top-0
h-full
w-8
pointer-events-none
"

style={{

background:
`
linear-gradient(
270deg,
#ff4500,
#ff9900,
transparent
)
`,

filter:
"blur(8px)"

}}

/>



{/* TOP FIRE GLOW */}

<div

className="
absolute
top-0
left-0
w-full
h-5
pointer-events-none
animate-pulse
"

style={{

background:
`
linear-gradient(
90deg,
transparent,
#ff4500,
transparent
)
`,

filter:
"blur(10px)"

}}

/>



{/* BOTTOM FIRE GLOW */}

<div

className="
absolute
bottom-0
left-0
w-full
h-5
pointer-events-none
animate-pulse
"

style={{

background:
`
linear-gradient(
90deg,
transparent,
#ff9900,
transparent
)
`,

filter:
"blur(12px)"

}}

/>



{/* PAGE INNER SHADOW */}

<div

className="
absolute
inset-0
pointer-events-none
"

style={{

boxShadow:
`
inset 0 0 50px rgba(0,0,0,.18)
`

}}

/>



{/* CONTENT */}

<div

className="
relative
z-10
h-full
w-full
"

>

{children}

</div>



</div>

)

}



export default FireBookMenu;
