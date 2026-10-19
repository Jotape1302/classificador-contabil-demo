import { useEffect, useRef } from "react";
import * as THREE from "three";
import shapesData from "../../assets/brand/zaeron-shapes.json";

export interface Zaeron3DCanvasProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}

export function Zaeron3DCanvas({
  className = "",
  size = "lg",
  showWordmark = false,
}: Zaeron3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check reduced motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Dimensions
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 8.2);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn("Could not initialize WebGLRenderer:", err);
      return;
    }

    // 2. Materials (PBR Physical: Radiant Copper Bevel Face + Titanium Satin Sides)
    const copperFrontMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xdd7d3f),
      metalness: 0.88,
      roughness: 0.18,
      clearcoat: 0.85,
      clearcoatRoughness: 0.14,
      reflectivity: 0.95,
      emissive: new THREE.Color(0x6e2c0e),
      emissiveIntensity: 0.38,
      side: THREE.FrontSide,
    });

    const darkSideMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x1a1e26),
      metalness: 0.85,
      roughness: 0.38,
      clearcoat: 0.4,
      clearcoatRoughness: 0.28,
      side: THREE.FrontSide,
    });

    const materialsArray = [copperFrontMaterial, darkSideMaterial];

    // 3. Geometries creation
    const scale = 0.0088; // converts ~450px to ~4.0 Three.js units
    const symbolCx = 250.5;
    const symbolCy = 269.5;
    const wordmarkCx = 249.5;
    const wordmarkCy = 623.0;

    const symbolGroup = new THREE.Group();
    const wordmarkGroup = new THREE.Group();
    const mainPivot = new THREE.Group();

    const geometriesToDispose: THREE.BufferGeometry[] = [];

    shapesData.shapes.forEach((s) => {
      const isWordmark = s.isText;
      const cx = isWordmark ? wordmarkCx : symbolCx;
      const cy = isWordmark ? wordmarkCy : symbolCy;

      const shape = new THREE.Shape();
      const outer = s.outer;
      shape.moveTo((outer[0][0] - cx) * scale, (cy - outer[0][1]) * scale);
      for (let i = 1; i < outer.length; i++) {
        shape.lineTo((outer[i][0] - cx) * scale, (cy - outer[i][1]) * scale);
      }
      shape.closePath();

      s.holes.forEach((hole) => {
        const holePath = new THREE.Path();
        holePath.moveTo((hole[0][0] - cx) * scale, (cy - hole[0][1]) * scale);
        for (let i = 1; i < hole.length; i++) {
          holePath.lineTo((hole[i][0] - cx) * scale, (cy - hole[i][1]) * scale);
        }
        holePath.closePath();
        shape.holes.push(holePath);
      });

      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: isWordmark ? 0.24 : 0.34,
        bevelEnabled: true,
        bevelSegments: isWordmark ? 4 : 6,
        steps: 1,
        bevelSize: isWordmark ? 0.018 : 0.026,
        bevelThickness: isWordmark ? 0.020 : 0.028,
        curveSegments: isWordmark ? 14 : 20,
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.computeVertexNormals();
      geometriesToDispose.push(geometry);

      const mesh = new THREE.Mesh(geometry, materialsArray);
      // Center extrusion depth around z = 0
      mesh.position.z = -extrudeSettings.depth! / 2;

      if (isWordmark) {
        wordmarkGroup.add(mesh);
      } else {
        symbolGroup.add(mesh);
      }
    });

    // Position symbol & wordmark
    if (showWordmark) {
      symbolGroup.position.set(0, 0.42, 0);
      wordmarkGroup.position.set(0, -2.18, -0.04);
      mainPivot.add(symbolGroup);
      mainPivot.add(wordmarkGroup);
    } else {
      symbolGroup.position.set(0, 0, 0);
      mainPivot.add(symbolGroup);
    }

    scene.add(mainPivot);

    // 4. Soft Ground Shadow Plane
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext("2d");

    function renderShadowTexture(isDarkTheme: boolean) {
      if (!sCtx) return;
      sCtx.clearRect(0, 0, 128, 128);
      const gradient = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
      if (isDarkTheme) {
        gradient.addColorStop(0, "rgba(0, 0, 0, 0.45)");
        gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.18)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        gradient.addColorStop(0, "rgba(15, 23, 42, 0.55)");
        gradient.addColorStop(0.5, "rgba(15, 23, 42, 0.22)");
        gradient.addColorStop(1, "rgba(15, 23, 42, 0)");
      }
      sCtx.fillStyle = gradient;
      sCtx.fillRect(0, 0, 128, 128);
    }

    renderShadowTexture(true);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(5.0, 1.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -2.4, -0.1);
    scene.add(shadowMesh);

    // 5. Lighting Setup (Rich warm copper highlights + metallic reflections)
    const keyLight = new THREE.DirectionalLight(0xffbe7a, 3.8);
    keyLight.position.set(3.5, 4.0, 5.0);
    scene.add(keyLight);

    const frontLight = new THREE.DirectionalLight(0xffa85c, 2.4);
    frontLight.position.set(0, 1.5, 6.0);
    scene.add(frontLight);

    const rimLight = new THREE.DirectionalLight(0xff7724, 4.8);
    rimLight.position.set(-4.0, 2.5, -3.5);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x768ea8, 1.1);
    fillLight.position.set(-3.0, -2.0, 3.0);
    scene.add(fillLight);

    const ambientLight = new THREE.AmbientLight(0x28201a, 0.85);
    scene.add(ambientLight);

    // Theme Synchronizer for 3D PBR Materials and Lighting
    function syncThemeSettings(isDarkTheme: boolean) {
      if (!renderer) return;
      if (isDarkTheme) {
        // Dark Mode PBR (100% PRESERVED EXACT SPEC)
        renderer.toneMappingExposure = 1.35;

        copperFrontMaterial.color.setHex(0xdd7d3f);
        copperFrontMaterial.metalness = 0.88;
        copperFrontMaterial.roughness = 0.18;
        copperFrontMaterial.clearcoat = 0.85;
        copperFrontMaterial.clearcoatRoughness = 0.14;
        copperFrontMaterial.reflectivity = 0.95;
        copperFrontMaterial.emissive.setHex(0x6e2c0e);
        copperFrontMaterial.emissiveIntensity = 0.38;

        darkSideMaterial.color.setHex(0x1a1e26);
        darkSideMaterial.metalness = 0.85;
        darkSideMaterial.roughness = 0.38;
        darkSideMaterial.clearcoat = 0.4;
        darkSideMaterial.clearcoatRoughness = 0.28;

        keyLight.color.setHex(0xffbe7a);
        keyLight.intensity = 3.8;

        frontLight.color.setHex(0xffa85c);
        frontLight.intensity = 2.4;

        rimLight.color.setHex(0xff7724);
        rimLight.intensity = 4.8;

        fillLight.color.setHex(0x768ea8);
        fillLight.intensity = 1.1;

        ambientLight.color.setHex(0x28201a);
        ambientLight.intensity = 0.85;

        renderShadowTexture(true);
        shadowTexture.needsUpdate = true;
      } else {
        // Light Mode PBR (Rich saturated copper, diffused highlights without white glare, high bevel contrast)
        renderer.toneMappingExposure = 1.15;

        copperFrontMaterial.color.setHex(0xc65f1c);
        copperFrontMaterial.metalness = 0.78;
        copperFrontMaterial.roughness = 0.28;
        copperFrontMaterial.clearcoat = 0.50;
        copperFrontMaterial.clearcoatRoughness = 0.30;
        copperFrontMaterial.reflectivity = 0.85;
        copperFrontMaterial.emissive.setHex(0x8a3415);
        copperFrontMaterial.emissiveIntensity = 0.30;

        darkSideMaterial.color.setHex(0x12151b);
        darkSideMaterial.metalness = 0.90;
        darkSideMaterial.roughness = 0.42;
        darkSideMaterial.clearcoat = 0.4;
        darkSideMaterial.clearcoatRoughness = 0.28;

        keyLight.color.setHex(0xf18a38);
        keyLight.intensity = 3.2;

        frontLight.color.setHex(0xd96522);
        frontLight.intensity = 2.0;

        rimLight.color.setHex(0xc8551a);
        rimLight.intensity = 3.6;

        fillLight.color.setHex(0x526075);
        fillLight.intensity = 0.9;

        ambientLight.color.setHex(0x381f12);
        ambientLight.intensity = 0.75;

        renderShadowTexture(false);
        shadowTexture.needsUpdate = true;
      }
      copperFrontMaterial.needsUpdate = true;
      darkSideMaterial.needsUpdate = true;
    }

    // Apply current theme on mount
    const currentIsDark =
      typeof document !== "undefined"
        ? !document.documentElement.classList.contains("light") &&
          document.documentElement.getAttribute("data-theme") !== "light"
        : true;
    syncThemeSettings(currentIsDark);

    // Listen for theme change events and class/data-theme mutations
    const handleThemeEvent = (e: Event) => {
      const customDetail = (e as CustomEvent)?.detail?.theme;
      if (customDetail === "light") {
        syncThemeSettings(false);
      } else if (customDetail === "dark") {
        syncThemeSettings(true);
      } else {
        const isDark = document.documentElement.getAttribute("data-theme") !== "light";
        syncThemeSettings(isDark);
      }
    };
    window.addEventListener("zaeron-theme-changed", handleThemeEvent);

    const themeObserver = new MutationObserver(() => {
      const isDark =
        !document.documentElement.classList.contains("light") &&
        document.documentElement.getAttribute("data-theme") !== "light";
      syncThemeSettings(isDark);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    // 6. Interaction State & Physics
    const state = {
      normX: 0,
      normY: 0,
      targetRotX: 0,
      targetRotY: 0,
      targetRotZ: 0,
      currentRotX: 0,
      currentRotY: prefersReducedMotion ? 0.08 : -0.3,
      currentRotZ: 0,
      targetCamX: 0,
      targetCamY: 0,
      targetFov: 40,
      introProgress: prefersReducedMotion ? 1 : 0,
      isInteracting: false,
      lastInteractionTime: Date.now(),
    };

    // Max rotation angles: ~24deg Y, ~14deg X
    const maxRotY = (24 * Math.PI) / 180;
    const maxRotX = (14 * Math.PI) / 180;

    function onPointerMove(e: MouseEvent | TouchEvent) {
      if (prefersReducedMotion) return;
      let clientX = 0;
      let clientY = 0;
      if ("touches" in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ("clientX" in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        return;
      }

      const rect = container!.getBoundingClientRect();
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((clientY - rect.top) / rect.height) * 2 - 1;

      // Clamp between -1.2 and 1.2
      const clampedX = Math.max(-1.2, Math.min(1.2, nx));
      const clampedY = Math.max(-1.2, Math.min(1.2, ny));

      state.normX = clampedX;
      state.normY = clampedY;
      state.targetRotY = clampedX * maxRotY;
      state.targetRotX = -clampedY * maxRotX;
      state.targetRotZ = -clampedX * 0.035;

      state.targetCamX = clampedX * 0.35;
      state.targetCamY = clampedY * 0.25;
      state.targetFov = 40 + (Math.abs(clampedX) + Math.abs(clampedY)) * 2.0;

      state.isInteracting = true;
      state.lastInteractionTime = Date.now();
    }

    function onPointerLeave() {
      if (prefersReducedMotion) return;
      state.normX = 0;
      state.normY = 0;
      state.targetRotX = 0;
      state.targetRotY = 0;
      state.targetRotZ = 0;
      state.targetCamX = 0;
      state.targetCamY = 0;
      state.targetFov = 40;
      state.isInteracting = false;
    }

    container.addEventListener("mousemove", onPointerMove);
    container.addEventListener("mouseleave", onPointerLeave);
    container.addEventListener("touchmove", onPointerMove, { passive: true });
    container.addEventListener("touchend", onPointerLeave);

    // 7. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && renderer) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 8. Animation Loop
    let animFrameId: number;
    const startTime = performance.now();

    const animate = () => {
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;

      // Cinematic Intro Transition (smooth ease-out over 1.0s)
      if (state.introProgress < 1) {
        state.introProgress = Math.min(1, state.introProgress + 0.025);
        const ease = 1 - Math.pow(1 - state.introProgress, 3);
        mainPivot.position.z = -2.0 * (1 - ease);
      }

      if (!prefersReducedMotion) {
        // Idle Animation breathing when not actively moved
        const timeSinceInteraction = Date.now() - state.lastInteractionTime;
        const idleInfluence = state.isInteracting
          ? 0
          : Math.min(1, Math.max(0, (timeSinceInteraction - 400) / 800));

        const idleRotY = Math.sin(elapsed * 1.1) * 0.04;
        const idleRotX = Math.cos(elapsed * 0.9) * 0.02;
        const idleFloat = Math.sin(elapsed * 1.3) * 0.06;

        const effectiveTargetRotX =
          state.targetRotX * (1 - idleInfluence) + idleRotX * idleInfluence;
        const effectiveTargetRotY =
          state.targetRotY * (1 - idleInfluence) + idleRotY * idleInfluence;
        const effectiveTargetRotZ = state.targetRotZ * (1 - idleInfluence);

        // Physics Damping / Inertia Lerp
        const damping = state.isInteracting ? 0.08 : 0.05;
        state.currentRotX += (effectiveTargetRotX - state.currentRotX) * damping;
        state.currentRotY += (effectiveTargetRotY - state.currentRotY) * damping;
        state.currentRotZ += (effectiveTargetRotZ - state.currentRotZ) * damping;

        mainPivot.rotation.x = state.currentRotX;
        mainPivot.rotation.y = state.currentRotY;
        mainPivot.rotation.z = state.currentRotZ;
        mainPivot.position.y = idleFloat * idleInfluence;

        // Parallax separation between symbol and wordmark
        if (showWordmark) {
          wordmarkGroup.position.x = -state.normX * 0.06 * (1 - idleInfluence);
          wordmarkGroup.rotation.y =
            state.currentRotY * 0.85 + (state.targetRotY - state.currentRotY) * 0.02;
        }

        // Camera smooth movement & FOV
        camera.position.x += (state.targetCamX - camera.position.x) * 0.05;
        camera.position.y += (state.targetCamY - camera.position.y) * 0.05;
        camera.fov += (state.targetFov - camera.fov) * 0.05;
        camera.updateProjectionMatrix();
        camera.lookAt(0, 0, 0);

        // Shadow follows rotation
        shadowMesh.position.x = -state.currentRotY * 0.4;
        shadowMesh.scale.set(
          1 + Math.abs(state.currentRotY) * 0.2,
          1 + Math.abs(state.currentRotX) * 0.1,
          1
        );
      } else {
        // Reduced motion: static hero angle
        mainPivot.rotation.set(-0.04, 0.08, 0);
        camera.lookAt(0, 0, 0);
      }

      if (renderer) {
        renderer.render(scene, camera);
      }

      animFrameId = requestAnimationFrame(animate);
    };

    animFrameId = requestAnimationFrame(animate);

    // 9. Cleanup
    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("zaeron-theme-changed", handleThemeEvent);
      container.removeEventListener("mousemove", onPointerMove);
      container.removeEventListener("mouseleave", onPointerLeave);
      container.removeEventListener("touchmove", onPointerMove);
      container.removeEventListener("touchend", onPointerLeave);

      geometriesToDispose.forEach((g) => g.dispose());
      copperFrontMaterial.dispose();
      darkSideMaterial.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTexture.dispose();

      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  }, [showWordmark, size]);

  const dimensions =
    size === "sm"
      ? "w-36 h-40 sm:w-40 sm:h-44"
      : size === "md"
      ? "w-48 h-52 sm:w-56 sm:h-60"
      : showWordmark
      ? "w-64 h-72 sm:w-72 sm:h-84"
      : "w-64 h-68 sm:w-72 sm:h-80";

  return (
    <div
      ref={mountRef}
      className={`relative flex items-center justify-center select-none cursor-pointer touch-none ${dimensions} ${className}`}
      aria-label="Logo oficial Zaeron 3D em WebGL com acabamento metálico cobre e física interativa"
    />
  );
}

export default Zaeron3DCanvas;
