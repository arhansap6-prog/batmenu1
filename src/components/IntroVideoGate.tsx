import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, Volume2, VolumeX } from "lucide-react";
import { getActiveIntroVideo } from "@/integrations/supabase/introVideo";

const SEEN_KEY = "bat_menu_intro_seen_v1";

export function IntroVideoGate({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["active-intro-video"],
    queryFn: getActiveIntroVideo,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const [dismissed, setDismissed] = useState(false);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Per-session: only show once per active video id
  useEffect(() => {
    if (typeof window === "undefined" || !data) return;
    try {
      const seen = window.sessionStorage.getItem(SEEN_KEY);
      if (seen === data.record.id) setDismissed(true);
    } catch {}
  }, [data]);

  useEffect(() => {
    if (!data || dismissed) return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    const p = v.play();
    if (p && typeof p.then === "function") {
      p.catch(() => {
        v.muted = true;
        setMuted(true);
        v.play().catch(() => {});
      });
    }
  }, [data, dismissed]);

  function dismiss() {
    if (data && typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(SEEN_KEY, data.record.id);
      } catch {}
    }
    setDismissed(true);
  }

  function unmute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
    v.play().catch(() => {});
  }

  if (isLoading || !data || dismissed) return <>{children}</>;

  return (
    <>
      {children}
      <div
        className="fixed inset-0 z-[999] bg-black"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <video
          ref={videoRef}
          src={data.url}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          playsInline
          onEnded={dismiss}
        />

        {/* subtle bottom gradient for control legibility */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Skip button — top-right, safe-area aware */}
        <button
          onClick={dismiss}
          aria-label="Skip intro"
          className="glass absolute right-4 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-black/60"
          style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
        >
          Skip
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Sound toggle */}
        {muted ? (
          <button
            onClick={unmute}
            aria-label="Tap for sound"
            className="absolute left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full gradient-red px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition hover:scale-[1.02]"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
          >
            <VolumeX className="h-4 w-4" />
            Tap for sound
          </button>
        ) : (
          <button
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              v.muted = true;
              setMuted(true);
            }}
            aria-label="Mute"
            className="glass absolute left-4 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-md hover:bg-black/60"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
          >
            <Volume2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </>
  );
}

export default IntroVideoGate;
