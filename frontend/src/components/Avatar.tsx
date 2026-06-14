// Круглый аватар с инициалами и зелёным кольцом (дизайн-система оГород).
export function Avatar({ name = '', size = 40, ring = true }: { name?: string; size?: number; ring?: boolean }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        border: ring ? '3px solid var(--paper)' : 'none',
        boxShadow: ring ? '0 0 0 2px var(--brand-primary), var(--shadow-sm)' : 'var(--shadow-xs)',
      }}
    >
      {initials || '🌱'}
    </span>
  );
}
