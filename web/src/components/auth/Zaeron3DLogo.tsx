import React, { Suspense, useEffect, useState } from "react";

// Check WebGL availability safely
function checkWebGLSupport(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

// Lazy load Three.js 3D canvas so it is cleanly isolated into its own chunk
const Zaeron3DCanvas = React.lazy(() => import("./Zaeron3DCanvas"));

interface Zaeron3DLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showWordmark?: boolean;
}

// 2.5D Fallback component when WebGL is loading or unavailable
function Zaeron25DFallback({
  size = "lg",
  showWordmark = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}) {
  const dimensions =
    size === "sm"
      ? "w-36 h-40"
      : size === "md"
      ? "w-48 h-52"
      : showWordmark
      ? "w-64 h-72 sm:w-72 sm:h-84"
      : "w-64 h-68 sm:w-72 sm:h-80";

  return (
    <div
      className={`relative flex items-center justify-center select-none ${dimensions} ${className}`}
      aria-label="Logo Zaeron (Visualização Estática)"
    >
      <div className="absolute inset-0 rounded-full bg-copper/10 blur-2xl" />
      <img
        src="/assets/zaeron_logo_raw.jpeg"
        alt="Zaeron"
        className="relative z-10 w-4/5 h-4/5 object-contain filter drop-shadow-[0_8px_24px_rgba(200,117,61,0.35)] rounded-md"
      />
    </div>
  );
}

export function Zaeron3DLogo({
  className = "",
  size = "lg",
  showText = false,
  showWordmark = false,
}: Zaeron3DLogoProps) {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasWebGL(checkWebGLSupport());
  }, []);

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* 3D Canvas / Fallback Area */}
      {hasWebGL === false || hasError ? (
        <Zaeron25DFallback size={size} showWordmark={showWordmark} />
      ) : (
        <Suspense fallback={<Zaeron25DFallback size={size} showWordmark={showWordmark} />}>
          {hasWebGL === true && (
            <Zaeron3DCanvasWrapper
              size={size}
              showWordmark={showWordmark}
              onError={() => setHasError(true)}
            />
          )}
        </Suspense>
      )}

      {/* Optional Editorial Subtext */}
      {showText && (
        <div className="mt-3 flex flex-col items-center text-center">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-copper">
            Inteligência Contábil
          </span>
          <p className="mt-1 text-xs text-muted max-w-[280px]">
            Precisão e profundidade operacional para sua rotina
          </p>
        </div>
      )}
    </div>
  );
}

// Error boundary wrapper for React 3D Canvas
class Zaeron3DCanvasWrapper extends React.Component<
  {
    size: "sm" | "md" | "lg";
    showWordmark: boolean;
    onError: () => void;
  },
  { hasError: boolean }
> {
  constructor(props: {
    size: "sm" | "md" | "lg";
    showWordmark: boolean;
    onError: () => void;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("Zaeron3DCanvas failed to render:", error);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return <Zaeron25DFallback size={this.props.size} />;
    }
    return (
      <Zaeron3DCanvas
        size={this.props.size}
        showWordmark={this.props.showWordmark}
      />
    );
  }
}

export default Zaeron3DLogo;
