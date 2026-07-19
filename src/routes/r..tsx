
type MenuItem = {
  id: string; name: string; description: string | null; price: number | string;
  discount_price: number | string | null; category_id: string | null;
  image_url: string | null; is_veg: boolean; is_chef_recommended: boolean;
  is_todays_special: boolean; model_3d_url: string | null; model_3d_ios_url: string | null; enable_3d: boolean;
};

function DishRow({ it, r, template, isAI, cartQty, onAdd, onBump }: {
  it: MenuItem;
  r: { currency: string };
  template: { surface: string; textColor: string; mutedColor: string; priceColor: string; accentFrom: string; accentTo: string };
  isAI: boolean; cartQty: number | undefined;
  onAdd: () => void; onBump: (delta: number) => void;
}) {
  const price = Number(it.discount_price ?? it.price);
  return (
    <div className="flex items-start gap-4 rounded-2xl border p-3" style={{ background: template.surface, borderColor: isAI ? template.accentFrom : `${template.textColor}22` }}>
      {it.image_url ? (
        <img src={it.image_url} alt={it.name} className="h-20 w-20 flex-none rounded-xl object-cover" />
      ) : (
        <div className="grid h-20 w-20 flex-none place-items-center rounded-xl text-xs" style={{ background: `${template.textColor}11`, color: template.mutedColor }}>
          {it.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold" style={{ color: template.textColor }}>{it.name}</p>
          {it.is_chef_recommended && <span className="rounded-full px-1.5 py-0.5 text-[9px]" style={{ background: `${template.priceColor}33`, color: template.priceColor }}>Chef</span>}
          {it.is_todays_special && <span className="rounded-full px-1.5 py-0.5 text-[9px] text-white" style={{ background: template.accentFrom }}>Today</span>}
          {isAI && <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] text-white" style={{ background: template.accentTo }}><Sparkles className="h-2.5 w-2.5" /> Pick</span>}
        </div>
        {it.description && <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: template.mutedColor }}>{it.description}</p>}
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold" style={{ color: template.priceColor }}>
            {r.currency} {price.toFixed(2)}
            {it.discount_price != null && <span className="ml-2 text-[10px] line-through" style={{ color: template.mutedColor }}>{Number(it.price).toFixed(2)}</span>}
          </p>
          <div className="flex items-center gap-2">
            {it.enable_3d && (it.model_3d_url || it.model_3d_ios_url) && (
              <ViewIn3DButton glbUrl={it.model_3d_url} usdzUrl={it.model_3d_ios_url} name={it.name} />
            )}
            {cartQty ? (
              <div className="flex items-center gap-2 rounded-full border px-1.5 py-1" style={{ borderColor: `${template.textColor}22` }}>
                <button onClick={() => onBump(-1)} className="grid h-6 w-6 place-items-center rounded-full" style={{ background: `${template.textColor}11`, color: template.textColor }}><Minus className="h-3 w-3" /></button>
                <span className="min-w-4 text-center text-xs font-semibold" style={{ color: template.textColor }}>{cartQty}</span>
                <button onClick={() => onBump(1)} className="grid h-6 w-6 place-items-center rounded-full text-white" style={{ background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})` }}><Plus className="h-3 w-3" /></button>
              </div>
            ) : (
              <button onClick={onAdd} className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})` }}>Add</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
