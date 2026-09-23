"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { cn } from "cn";
import BorderGlow from "@/components/BorderGlow";

/**
 * A card surface with a cursor-reactive glowing edge.
 *
 * BorderGlow renders its own shell — background, border, radius and shadow are
 * all set inline by the component — so it replaces a card's container rather
 * than wrapping one. This holds the theme values in a single place so call
 * sites stay as plain content.
 *
 * `animated` is deliberately left off: the gradient would then run its own
 * continuous loop on top of the WebGL backdrop already rendering behind the
 * page. Reacting to the pointer alone costs nothing when the mouse is still.
 */
export function GlowCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // BorderGlow takes its surface as a prop and writes it inline, so unlike the
  // rest of the app it can't be themed from CSS — it has to be told. Before
  // mount the theme is unknown; `#ffffff` matches the light default and avoids
  // a flash of dark card for light-mode viewers.
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <BorderGlow
      // Dark: matches the `.dark .bg-white` glass tint — a white veil, so the
      // card reads as raised above the backdrop rather than cut into it.
      // Light: a plain white card, as the rest of the light theme uses.
      // BorderGlow's `isLightColor` parses hex only, so the rgba() value falls
      // through as "dark" while `#ffffff` is correctly read as light — which is
      // what drives its border and shadow treatment.
      backgroundColor={isDark ? "rgba(255, 255, 255, 0.11)" : "#ffffff"}
      // `rounded-xl` is 0.875rem — BorderGlow takes px.
      borderRadius={14}
      colors={["#60a5fa", "#a78bfa", "#f472b6"]}
      glowRadius={26}
      // Halo and border line dialled well back — at full strength the edge read
      // as a lit strip rather than a glow on a tile this small.
      glowIntensity={0.4}
      borderIntensity={0.45}
      coneSpread={32}
      /*
       * Near-zero on purpose. The fill layer paints a mesh gradient across the
       * whole card and masks its middle out with ellipses placed at 33/50/66%.
       * Those percentages are authored for a large hero card; on a ~200px stat
       * tile they land mid-card, so the subtracted mask leaves a bright wedge
       * aimed at the centre instead of a glow hugging the edge. Dropping this
       * leaves the border line and the outer halo — the two layers that
       * actually produce the effect in the reference.
       */
      fillOpacity={0.03}
      edgeSensitivity={26}
      className={cn("backdrop-blur-xl", className)}
    >
      {children}
    </BorderGlow>
  );
}
