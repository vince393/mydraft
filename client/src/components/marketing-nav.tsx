import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Mail, Menu, X } from "lucide-react";
import { useState } from "react";

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
    { href: "/product", label: "Product" },
    { href: "/pricing", label: "Pricing" },
    { href: "/security", label: "Security" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/90 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">MailFlow</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={location === link.href ? "text-foreground" : "text-muted-foreground"}
                  data-testid={`nav-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link href="/inbox">
                <Button variant="ghost" size="sm" data-testid="nav-inbox">
                  Go to inbox
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" size="sm" data-testid="nav-settings">
                  Settings
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" data-testid="nav-signin">
                  Sign in
                </Button>
              </Link>
              <Link href={getStartedHref()}>
                <Button size="sm" data-testid="nav-getstarted">
                  Get started
                </Button>
              </Link>
            </>
          )}
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          data-testid="nav-mobile-toggle"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl">
          <div className="px-6 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
            <div className="pt-2 border-t border-border/40 space-y-2">
              {isLoggedIn ? (
                <>
                  <Link href="/inbox">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-nav-inbox">
                      Go to inbox
                    </Button>
                  </Link>
                  <Link href="/settings">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-nav-settings">
                      Settings
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-nav-signin">
                      Sign in
                    </Button>
                  </Link>
                  <Link href={getStartedHref()}>
                    <Button className="w-full" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-nav-getstarted">
                      Get started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
