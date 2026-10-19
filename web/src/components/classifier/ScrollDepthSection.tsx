import { useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollDepthSectionProps {
  children: ReactNode;
  planeNumber?: string | number;
  planeTitle?: string;
  className?: string;
}

export function ScrollDepthSection({
  children,
  planeNumber,
  planeTitle,
  className = "",
}: ScrollDepthSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [offsetRatio, setOffsetRatio] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setHasEntered(true);
      setOffsetRatio(0);
      return;
    }

    // Stable threshold with hysteresis: once entered, stays visible
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setHasEntered(true);
          }
        }
      },
      {
        threshold: 0.05,
        rootMargin: "50px 0px 50px 0px",
      }
    );

    observer.observe(el);

    let rafId: number | null = null;
    const updateProgress = () => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight || 800;

      // Check if element is roughly near viewport
      if (rect.bottom < -100 || rect.top > windowHeight + 100) {
        return;
      }

      // Calculate distance from viewport center: -1 (top) to 0 (center) to 1 (bottom)
      const elementCenter = rect.top + rect.height / 2;
      const viewportCenter = windowHeight / 2;
      const distance = (elementCenter - viewportCenter) / (windowHeight / 2);
      const clamped = Math.max(-1, Math.min(1, distance));

      setOffsetRatio(clamped);
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        updateProgress();
        rafId = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    updateProgress();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Subtle, continuous, stable transforms without discrete snapping
  // Active reading zone (|offsetRatio| < 0.25): zero transform, full opacity
  const activeFactor = Math.max(0, Math.abs(offsetRatio) - 0.25) / 0.75;
  const direction = offsetRatio > 0 ? 1 : -1;

  const translateY = hasEntered ? direction * activeFactor * 6 : 10;
  const translateZ = hasEntered ? -activeFactor * 12 : -15;
  const rotateX = hasEntered ? -direction * activeFactor * 0.8 : 0;
  const opacity = hasEntered ? Math.max(0.7, 1 - activeFactor * 0.2) : 0.85;

  return (
    <section
      ref={containerRef}
      className={`perspective-1200 will-change-transform ${className}`}
      style={{
        transform: `translate3d(0, ${translateY.toFixed(1)}px, ${translateZ.toFixed(1)}px) rotateX(${rotateX.toFixed(2)}deg)`,
        opacity: Number(opacity.toFixed(2)),
      }}
    >
      {(planeNumber || planeTitle) && (
        <div className="mb-2 flex items-center gap-2 border-b border-border/50 pb-1.5 text-xs">
          {planeNumber && (
            <span className="font-mono text-[10px] font-semibold text-copper border border-copper/30 bg-copper/10 px-1.5 py-0.2 rounded-[2px]">
              PLANO {String(planeNumber).padStart(2, "0")}
            </span>
          )}
          {planeTitle && (
            <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted">
              {planeTitle}
            </span>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
