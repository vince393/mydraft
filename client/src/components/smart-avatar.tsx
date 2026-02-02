import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getAvatarSources } from "@/lib/avatar";

interface SmartAvatarProps {
  email: string;
  name: string;
  className?: string;
  fallbackClassName?: string;
}

export function SmartAvatar({ email, name, className, fallbackClassName }: SmartAvatarProps) {
  const sources = getAvatarSources(email, name);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [failedSources, setFailedSources] = useState<Set<string>>(new Set());

  const getInitials = (displayName: string): string => {
    if (!displayName) return "?";
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  useEffect(() => {
    setFailedSources(new Set());
    
    const trySource = async (url: string | null): Promise<boolean> => {
      if (!url) return false;
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });
    };

    const loadBestSource = async () => {
      if (sources.gravatar) {
        const gravatarWorks = await trySource(sources.gravatar);
        if (gravatarWorks) {
          setCurrentSrc(sources.gravatar);
          return;
        }
      }

      if (sources.companyLogo) {
        const logoWorks = await trySource(sources.companyLogo);
        if (logoWorks) {
          setCurrentSrc(sources.companyLogo);
          return;
        }
      }

      setCurrentSrc(sources.initials);
    };

    loadBestSource();
  }, [email, name]);

  const handleError = () => {
    if (currentSrc && currentSrc !== sources.initials) {
      setFailedSources(prev => new Set(prev).add(currentSrc));
      
      if (currentSrc === sources.gravatar && sources.companyLogo && !failedSources.has(sources.companyLogo)) {
        setCurrentSrc(sources.companyLogo);
      } else {
        setCurrentSrc(sources.initials);
      }
    }
  };

  return (
    <Avatar className={className}>
      {currentSrc && (
        <AvatarImage 
          src={currentSrc} 
          alt={name}
          onError={handleError}
        />
      )}
      <AvatarFallback className={fallbackClassName}>
        {getInitials(name || email)}
      </AvatarFallback>
    </Avatar>
  );
}
