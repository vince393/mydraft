import { useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarketingNav } from "@/components/marketing-nav";
import { Seo } from "@/components/seo";
import { SiApple, SiLinux } from "react-icons/si";
import { Monitor, Download, CheckCircle, ShieldAlert } from "lucide-react";

// Where the installer files live. GitHub Releases (populated by the desktop
// build workflow) is the default stable host; override with VITE_DESKTOP_RELEASE_URL.
const RELEASE_BASE =
  import.meta.env.VITE_DESKTOP_RELEASE_URL ||
  "https://github.com/vince393/mydraft/releases/latest/download";

type OS = "windows" | "mac" | "linux" | "other";

interface PlatformInfo {
  id: OS;
  label: string;
  ext: string;
  file: string;
  icon: React.ReactNode;
  note: string;
}

const PLATFORMS: Record<Exclude<OS, "other">, PlatformInfo> = {
  windows: {
    id: "windows",
    label: "Windows",
    ext: ".exe",
    file: "MyDraft.Setup.1.0.0.exe",
    icon: <Monitor className="w-6 h-6" />,
    note: "Windows 10 or later. Run the installer and follow the prompts.",
  },
  mac: {
    id: "mac",
    label: "macOS",
    ext: ".dmg",
    file: "MyDraft-1.0.0-arm64.dmg",
    icon: <SiApple className="w-6 h-6" />,
    note: "macOS 11 or later. Open the .dmg and drag MyDraft to Applications.",
  },
  linux: {
    id: "linux",
    label: "Linux",
    ext: ".AppImage",
    file: "MyDraft-1.0.0.AppImage",
    icon: <SiLinux className="w-6 h-6" />,
    note: "Make the .AppImage executable (chmod +x) and run it.",
  },
};

function detectOS(): OS {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || "").toLowerCase();
  if (/win/.test(ua) || /win/.test(platform)) return "windows";
  if (/mac/.test(ua) || /mac/.test(platform)) return "mac";
  if (/linux|x11|ubuntu|fedora|debian/.test(ua)) return "linux";
  if (/android|iphone|ipad|ipod/.test(ua)) return "other";
  return "other";
}

export default function DownloadPage() {
  const detected = useMemo(detectOS, []);
  const primary =
    detected !== "other" ? PLATFORMS[detected] : PLATFORMS.windows;
  const others = (Object.keys(PLATFORMS) as Array<Exclude<OS, "other">>)
    .filter((k) => k !== primary.id)
    .map((k) => PLATFORMS[k]);

  const downloadUrl = (p: PlatformInfo) => `${RELEASE_BASE}/${p.file}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Download MyDraft for Desktop — Windows, Mac & Linux | MyDraft"
        description="Download the MyDraft desktop app for Windows, macOS, and Linux. Get the full AI email experience in a standalone app with its own window and app icon."
        path="/download"
      />
      <MarketingNav />

      <main className="max-w-5xl mx-auto px-5 sm:px-6 pt-16 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] dark:border-white/[0.1] px-4 py-1.5 mb-6 text-xs font-medium text-muted-foreground">
            <Download className="w-3.5 h-3.5" />
            Desktop App
          </div>
          <h1
            className="text-4xl sm:text-5xl font-semibold tracking-tight mb-4"
            data-testid="text-download-title"
          >
            MyDraft on your desktop
          </h1>
          <p className="text-lg text-muted-foreground">
            The full MyDraft experience in a standalone app — its own window, app
            icon, and Start-menu / Dock entry. Sign in with Google or Microsoft,
            manage your inbox, and use AI exactly like the web.
          </p>
        </div>

        {/* Primary (detected OS) download */}
        <Card className="mb-8 border-primary/30">
          <CardContent className="p-8 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary shrink-0">
              {primary.icon}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm text-muted-foreground mb-1">
                {detected === "other"
                  ? "Choose your platform"
                  : "Detected your system"}
              </p>
              <h2
                className="text-2xl font-semibold mb-1"
                data-testid="text-detected-platform"
              >
                Download for {primary.label}
              </h2>
              <p className="text-sm text-muted-foreground">{primary.note}</p>
            </div>
            <a href={downloadUrl(primary)} download data-testid="link-download-primary">
              <Button size="lg" className="gap-2">
                <Download className="w-4 h-4" />
                Download {primary.ext}
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Other platforms */}
        <div className="grid gap-4 sm:grid-cols-2 mb-14">
          {others.map((p) => (
            <Card key={p.id} data-testid={`card-platform-${p.id}`}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted text-foreground shrink-0">
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.note}
                  </p>
                </div>
                <a
                  href={downloadUrl(p)}
                  download
                  data-testid={`link-download-${p.id}`}
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-3.5 h-3.5" />
                    {p.ext}
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How to install */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">How to install</h3>
          <ol className="space-y-3 mb-8">
            {[
              "Download the installer for your operating system above.",
              "Open the downloaded file and follow the install steps.",
              "Launch MyDraft from your Start menu, Dock, or applications list.",
              "Sign in — including with Google or Microsoft — just like the web app.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>

          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              The app isn't code-signed yet, so your system may show an "unknown
              developer" warning on first launch. On Windows click{" "}
              <span className="font-medium text-foreground">More info → Run anyway</span>;
              on macOS right-click the app and choose{" "}
              <span className="font-medium text-foreground">Open</span>. MyDraft
              needs an internet connection — it loads your live account.
            </p>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-10">
            Prefer the browser?{" "}
            <Link
              href="/login"
              className="text-primary hover:underline"
              data-testid="link-use-web"
            >
              Use MyDraft on the web
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
