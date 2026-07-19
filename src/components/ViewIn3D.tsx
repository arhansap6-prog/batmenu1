import { useEffect, useState } from "react";
import { X, Box } from "lucide-react";

let modelViewerLoaded = false;
async function ensureModelViewer() {
  if (modelViewerLoaded || typeof window === "undefined") return;
  await import("@google/model-viewer");
  modelViewerLoaded = true;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & Record<string, unknown>,
        HTMLElement
      >;
    }
  }
}

export function ViewIn3DButton({
  glbUrl,
  usdzUrl,
  name,
}: {
  glbUrl?: string | null;
  usdzUrl?: string | null;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  if (!glbUrl && !usdzUrl) return null;
  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-full border border-primary/50 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20"
      >
        <Box className="h-3 w-3" /> View in 3D
      </button>
      {open && (
        <ArViewer glbUrl={glbUrl ?? undefined} usdzUrl={usdzUrl ?? undefined} name={name} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function ArViewer({
  glbUrl,
  usdzUrl,
  name,
  onClose,
}: {
  glbUrl?: string;
  usdzUrl?: string;
  name: string;
  onClose: () => void;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    ensureModelViewer().then(() => setReady(true));
  }, []);

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      <button
        onClick={onClose}
        className="absolute right-4 top-[max(env(safe-area-inset-top),1rem)] z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur"
        aria-label="Close 3D view"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="absolute left-1/2 top-[max(env(safe-area-inset-top),1rem)] z-10 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white backdrop-blur">
        {name}
      </div>
      {ready && glbUrl ? (
        // @ts-expect-error web component
        <model-viewer
          src={glbUrl}
          ios-src={usdzUrl ?? undefined}
          alt={`3D model of ${name}`}
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-scale="auto"
          camera-controls
          touch-action="pan-y"
          autoplay
          shadow-intensity="1"
          exposure="1"
          environment-image="neutral"
          style={{ width: "100vw", height: "100vh", background: "#000" }}
        >
          <button
            slot="ar-button"
            className="absolute inset-x-4 bottom-[max(env(safe-area-inset-bottom),1.25rem)] mx-auto max-w-xs rounded-full bg-white py-3 text-sm font-semibold text-black"
          >
            View in your space
          </button>
          {/* @ts-expect-error web component */}
        </model-viewer>
      ) : (
        <div className="grid h-full w-full place-items-center text-white/70">Loading 3D...</div>
      )}
    </div>
  );
}
