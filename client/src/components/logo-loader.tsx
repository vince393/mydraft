import logo from "@assets/logo_no_bg.png";

interface LogoLoaderProps {
  size?: number;
  className?: string;
}

export function LogoLoader({ size = 48, className }: LogoLoaderProps) {
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

  return (
    <div
      className={className}
      style={{ width: size, height: size, position: "relative" }}
      role="status"
      aria-label="Loading"
      data-testid="logo-loader"
    >
      <style>{`
        @keyframes logo-loader-sweep { 0% { background-position: 200% 0; } 100% { background-position: -100% 0; } }
        @media (prefers-reduced-motion: reduce) {
          [data-testid="logo-loader"] > div { animation: none !important; }
        }
      `}</style>
      <img src={logo} alt="" className="absolute inset-0 h-full w-full object-contain" />
      <div
        className="absolute inset-0"
        style={{
          ...maskStyle,
          backgroundImage:
            "linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.9) 50%, transparent 62%)",
          backgroundSize: "300% 100%",
          mixBlendMode: "screen",
          animation: "logo-loader-sweep 1.4s linear infinite",
        }}
      />
    </div>
  );
}
