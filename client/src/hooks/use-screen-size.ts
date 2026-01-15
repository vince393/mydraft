import { useState, useEffect } from "react";

export type ScreenSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface ScreenDimensions {
  width: number;
  height: number;
  size: ScreenSize;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
}

function getScreenSize(width: number): ScreenSize {
  if (width < 480) return "xs";
  if (width < 640) return "sm";
  if (width < 768) return "md";
  if (width < 1024) return "lg";
  if (width < 1280) return "xl";
  return "2xl";
}

function getScreenDimensions(): ScreenDimensions {
  const width = typeof window !== "undefined" ? window.innerWidth : 1024;
  const height = typeof window !== "undefined" ? window.innerHeight : 768;
  const size = getScreenSize(width);

  return {
    width,
    height,
    size,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    isLargeDesktop: width >= 1280,
  };
}

export function useScreenSize(): ScreenDimensions {
  const [dimensions, setDimensions] = useState<ScreenDimensions>(getScreenDimensions);

  useEffect(() => {
    function handleResize() {
      setDimensions(getScreenDimensions());
    }

    handleResize();

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return dimensions;
}

export function getResponsiveValue<T>(
  screen: ScreenDimensions,
  values: { xs?: T; sm?: T; md?: T; lg?: T; xl?: T; "2xl"?: T; default: T }
): T {
  const sizeOrder: ScreenSize[] = ["xs", "sm", "md", "lg", "xl", "2xl"];
  const currentIndex = sizeOrder.indexOf(screen.size);
  
  for (let i = currentIndex; i >= 0; i--) {
    const size = sizeOrder[i];
    if (values[size] !== undefined) {
      return values[size] as T;
    }
  }
  
  return values.default;
}
