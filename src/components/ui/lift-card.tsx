import { type ReactNode } from "react";
import { cn } from "cn";

/**
 * A card that lifts toward the reader on hover.
 *
 * Replaces the cursor-reactive glow these tiles used to carry. That effect was
 * authored for a large hero card: its mask geometry is positioned in
 * percentages, so on a ~200px tile the shapes landed mid-card and left a
 * hard-edged wedge across the middle instead of light hugging an edge.
 *
 * A lift says the same thing — this is interactive, this is the one you are
 * pointing at — with nothing to go wrong at any size. The surface classes are
 * the ones every other card in the app uses, so `.dark .bg-white` picks up the
 * glass treatment without this component knowing about themes.
 */
export function LiftCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-card dark:border-white/10",
        // Only the properties that actually change, so the browser is not
        // asked to watch every animatable property on the card.
        "transition-[transform,box-shadow,border-color] duration-200 ease-out",
        // The lift does the work; the shadow underneath it sells the height,
        // and the scale is small enough not to soften the text while moving.
        "hover:-translate-y-1 hover:scale-[1.015] hover:border-slate-300 hover:shadow-card-hover",
        "dark:hover:border-white/20",
        // The raise is the whole effect, so with motion off the card keeps the
        // border and shadow change and simply does not move.
        "motion-reduce:transform-none motion-reduce:transition-[box-shadow,border-color]",
        className,
      )}
    >
      {children}
    </div>
  );
}
