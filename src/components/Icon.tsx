/** Material Symbols glyph. The font is loaded once in the root layout. */
export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={`material-symbols-rounded${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
