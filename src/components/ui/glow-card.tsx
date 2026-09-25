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
      // Muted from the saturated 400-weights this started on. At full
      // saturation the sheen read as neon against a dark card — the hues are
      // the same, carrying about half the chroma.
      colors={["#6d8fc4", "#8f86b8", "#bd8aa4"]}
      glowRadius={26}
      /*
       * Both dialled well down.
       *
       * glowIntensity scales the alpha of every shadow layer, and those layers
       * include *inset* ones. The halo is masked by a conic gradient centred on
       * the card, so the inset half paints a wedge inward from the lit edge —
       * on a tile this small that wedge reaches the middle and reads as a hard
       * cone rather than a glow. Lowering the alpha is what softens it; the
       * geometry is BorderGlow's own and shared with every other caller.
       */
      glowIntensity={0.16}
      borderIntensity={0.26}
      coneSpread={38}
      /*
       * Off entirely.
       *
       * The fill layer paints a mesh gradient across the whole card and masks
       * its middle out with ellipses placed at 33/50/66%. Those percentages
       * are authored for a large hero card; on a ~200px stat tile they land
       * mid-card, so the subtracted mask leaves a hard-edged wedge aimed at
       * the centre instead of a glow hugging the edge. It was already near
       * zero and still showing its seam, so it is now nothing at all: the
       * border line and the outer halo are the two layers that actually make
       * the effect.
       */
      fillOpacity={0}
      edgeSensitivity={34}
      className={cn("backdrop-blur-xl", className)}
    >
      {children}
    </BorderGlow>
  );
}
