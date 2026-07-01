import { useEffect } from "react";
import logo from "@assets/logo_no_bg.png";

const maskStyle: React.CSSProperties = {
  WebkitMaskImage: `url(${logo})`,
  maskImage: `url(${logo})`,
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
};

export default function LoaderPreviewPage() {
  useEffect(() => {
    document.title = "Loader Preview | MyDraft";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-16 py-20">
      <style>{`
        @keyframes ld-sweep { 0% { background-position: 200% 0; } 100% { background-position: -100% 0; } }
        @keyframes ld-breathe { 0%,100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.06); opacity: 1; } }
        @keyframes ld-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="text-center">
        <h1 className="text-2xl font-semibold">MyDraft loading icon — pick one</h1>
        <p className="text-muted-foreground mt-1">Three animated options based on your logo.</p>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-12">
        {/* Variant A: diagonal gloss sweep over the full-color logo */}
        <div className="flex flex-col items-center gap-4 w-56" data-testid="variant-gloss">
          <div className="relative h-24 w-24">
            <img src={logo} alt="" className="absolute inset-0 h-full w-full object-contain" />
            <div
              className="absolute inset-0"
              style={{
                ...maskStyle,
                backgroundImage:
                  "linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.9) 50%, transparent 62%)",
                backgroundSize: "300% 100%",
                mixBlendMode: "screen",
                animation: "ld-sweep 1.4s linear infinite",
              }}
            />
          </div>
          <div className="text-center">
            <p className="font-medium">A · Gloss Sweep</p>
            <p className="text-sm text-muted-foreground">Light glides across the logo, keeps the checkmark.</p>
          </div>
        </div>

        {/* Variant B: full silhouette filled with a moving shimmer gradient */}
        <div className="flex flex-col items-center gap-4 w-56" data-testid="variant-shimmer">
          <div className="relative h-24 w-24">
            <div
              className="absolute inset-0"
              style={{
                ...maskStyle,
                backgroundImage:
                  "linear-gradient(115deg, #1E3A8A 0%, #3B82F6 35%, #93C5FD 50%, #3B82F6 65%, #1E3A8A 100%)",
                backgroundSize: "300% 100%",
                animation: "ld-sweep 1.6s linear infinite",
              }}
            />
          </div>
          <div className="text-center">
            <p className="font-medium">B · Shimmer Fill</p>
            <p className="text-sm text-muted-foreground">Shading flows through the whole shape.</p>
          </div>
        </div>

        {/* Variant C: gloss sweep + gentle breathing pulse */}
        <div className="flex flex-col items-center gap-4 w-56" data-testid="variant-pulse">
          <div className="relative h-24 w-24" style={{ animation: "ld-breathe 1.8s ease-in-out infinite" }}>
            <img src={logo} alt="" className="absolute inset-0 h-full w-full object-contain" />
            <div
              className="absolute inset-0"
              style={{
                ...maskStyle,
                backgroundImage:
                  "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.95) 50%, transparent 60%)",
                backgroundSize: "300% 100%",
                mixBlendMode: "screen",
                animation: "ld-sweep 1.3s linear infinite",
              }}
            />
          </div>
          <div className="text-center">
            <p className="font-medium">C · Pulse + Sweep</p>
            <p className="text-sm text-muted-foreground">Sweep plus a soft breathing scale.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>In context on a page:</span>
        <div className="relative h-8 w-8">
          <img src={logo} alt="" className="absolute inset-0 h-full w-full object-contain" />
          <div
            className="absolute inset-0"
            style={{
              ...maskStyle,
              backgroundImage:
                "linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.9) 50%, transparent 62%)",
              backgroundSize: "300% 100%",
              mixBlendMode: "screen",
              animation: "ld-sweep 1.4s linear infinite",
            }}
          />
        </div>
        <span>Loading your inbox…</span>
      </div>
    </div>
  );
}
