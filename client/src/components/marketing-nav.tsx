import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import draftLogo from "@assets/3dc453d8-506f-47f2-be78-60110ca045c3_1768604684762.png";

interface AuthResponse {
  user: { id: string; plan?: string; onboardingCompleted?: boolean; emailConnected?: boolean } | null;
}

export function MarketingNav() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { data: authData } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const isLoggedIn = !!authData?.user;

  const getStartedHref = () => {
    if (!isLoggedIn) return "/login";
    if (!authData?.user?.plan) return "/select-plan";
    if (!authData?.user?.onboardingCompleted) return "/onboarding";
    if (!authData?.user?.emailConnected) return "/connect-email";
    return "/inbox";
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/pricing", label: "Pricing" },
    { href: "/security", label: "Security" },
    { href: "/help", label: "Help" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-background/80 backdrop-blur-2xl">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-3 group">
            <img src={draftLogo} alt="Draft logo" className="h-10 w-auto" style={{ background: 'transparent' }} />
            <span className="text-xl font-semibold text-foreground">Draft</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={`px-4 transition-colors ${location === link.href ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  data-testid={`nav-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="nav-signin">
              Sign in
            </Button>
          </Link>
          <Link href={getStartedHref()}>
            <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:shadow-primary/30" data-testid="nav-getstarted">
              {isLoggedIn ? "Go to inbox" : "Get started"}
            </Button>
          </Link>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden text-muted-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          data-testid="nav-mobile-toggle"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-background/95 backdrop-blur-2xl">
          <div className="px-6 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${location === link.href ? "text-foreground" : "text-muted-foreground"}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
            <div className="pt-3 mt-3 border-t border-white/[0.06] space-y-1">
              <Link href="/login">
                <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-nav-signin">
                  Sign in
                </Button>
              </Link>
              <Link href={getStartedHref()}>
                <Button className="w-full mt-2 shadow-md shadow-primary/25" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-nav-getstarted">
                  {isLoggedIn ? "Go to inbox" : "Get started"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
