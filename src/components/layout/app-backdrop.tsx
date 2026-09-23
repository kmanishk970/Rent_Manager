"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import GradientWaves from "@/components/GradientWaves";

/**
 * The app-wide animated background.
 *
 * Mounted once at the root so a single WebGL context serves every route —
 * mounting it per-layout would spin up a second shader on navigation and double
 * the GPU cost. It is fixed to the viewport and sits on a negative z-index, so
 * page content paints over it in normal flow.
 *
 * Two guards, both about not stranding the viewer:
 *  - Renders only after hydration, keeping the shader off the server render.
 *  - Skipped under `prefers-reduced-motion`, where a static gradient in the same
 *    palette stands in — this covers the whole viewport and never settles, so
 *    there is no "wait for it to stop" option.
 */
export function AppBackdrop() {
  const [animate, setAnimate] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAnimate(!query.matches);

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Light mode has no backdrop at all — the body's own canvas colour shows, and
  // the shader is unmounted rather than hidden so its render loop stops.
  if (resolvedTheme !== "dark") return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
      {/* Base layer: paints instantly, covers the shader's first frame, and is
          the entire background when motion is reduced or WebGL is missing. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(170deg, #0F0A18 0%, #1E1233 55%, #3B2A63 100%)",
        }}
      />

      {animate && (
        <GradientWaves
          // Retuned to the dark plum of the React Bits demo rather than the
          // vivid violet-to-pink defaults: a near-black haze at the horizon, a
          // muted violet swell, and soft lilac crests instead of pure white.
          // Brightness carries most of it — at 1.0 the shader blows the mid
          // tones out to the saturated look you saw.
          horizonColor="#150E24"
          waveColor="#4C2A85"
          crestColor="#C9B8F0"
          speed={0.4}
          amplitude={2.5}
          waveScale={0.6}
          waveRatio={0.9}
          swell={35}
          turbulence={20}
          tilt={1.11}
          zoom={1}
          height={5.5}
          fogDepth={15}
          detail="medium"
          brightness={0.55}
          opacity={1}
          mouseInteraction
          parallaxStrength={0.5}
          grain
          grainIntensity={0.05}
          className="absolute inset-0 size-full"
        />
      )}
    </div>
  );
}
