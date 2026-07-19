import { QRCodeCanvas } from "qrcode.react";
import { X, Download } from "lucide-react";
import { useRef } from "react";

export function QrView({ url, label }: { url: string; label?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  function download() {
    const canvas = wrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${label ?? "qr"}.png`;
    link.click();
  }

  return (
    <div className="text-center">
      <div ref={wrapRef} className="mx-auto inline-block rounded-2xl bg-white p-4">
        <QRCodeCanvas value={url} size={224} includeMargin={false} level="M" />
      </div>
      <p className="mt-3 break-all text-xs text-muted-foreground">{url}</p>
      <button
        onClick={download}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md gradient-red px-4 py-2 text-xs font-semibold text-primary-foreground"
      >
        <Download className="h-3.5 w-3.5" /> Download PNG
      </button>
    </div>
  );
}

export function QrModal({ url, label, onClose }: { url: string; label?: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-6 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{label ?? "QR code"}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <QrView url={url} label={label} />
      </div>
    </div>
  );
}
