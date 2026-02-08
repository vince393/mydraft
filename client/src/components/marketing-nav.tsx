import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import draftLogo from "@assets/bd6ad8b0-8b19-4e70-8b55-0ddd333f446e_removalai_preview_1768612163407.png";

interface AuthResponse {
  user: { id: string; plan?: string; onboardingCompleted?: boolean; emailConnected?: boolean } | null;
}

export function MarketingNav() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const { data: authData } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const isLoggedIn = !!authData?.user;

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

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
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-background/80 backdrop-blur-2xl" ref={menuRef}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0" data-testid="nav-logo">
          <img src={draftLogo} alt="vmail logo" className="h-8 w-8 md:h-10 md:w-10 object-contain" />
          <span className="text-lg md:text-xl font-bold tracking-tight text-foreground">vmail</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button 
                variant="ghost" 
                size="sm"
                className={`px-4 transition-colors ${location === link.href ? "text-foreground" : "text-muted-foreground"}`}
                data-testid={`nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Button>
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground" data-testid="nav-signin">
              Sign in
            </Button>
          </Link>
          <Link href={getStartedHref()}>
            <Button size="sm" className="bg-primary shadow-md shadow-primary/25" data-testid="nav-getstarted">
              {isLoggedIn ? "Go to inbox" : "Get started"}
            </Button>
          </Link>
        </div>

        <div className="flex md:hidden items-center gap-1.5">
          <Link href={getStartedHref()}>
            <Button size="sm" className="bg-primary text-xs" data-testid="mobile-nav-getstarted">
              {isLoggedIn ? "Inbox" : "Get started"}
            </Button>
          </Link>
          <Button
            size="icon"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="nav-mobile-toggle"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-all duration-200 ease-out ${mobileMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-3 py-2 space-y-0.5 border-t border-white/[0.06] bg-background/95 backdrop-blur-2xl">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button 
                variant="ghost"
                className={`w-full justify-start ${location === link.href ? "text-foreground bg-muted/50" : "text-muted-foreground"}`}
                onClick={() => setMobileMenuOpen(false)}
                data-testid={`mobile-nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Button>
            </Link>
          ))}
          <div className="pt-2 mt-1 border-t border-white/[0.06]">
            <Link href="/login">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-muted-foreground" 
                onClick={() => setMobileMenuOpen(false)} 
                data-testid="mobile-nav-signin"
              >
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
