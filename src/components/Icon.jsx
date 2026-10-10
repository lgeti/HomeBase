// Line icons from the HomeBase color directions design (24px grid, stroke drawn in the current text color)
const PATHS = {
  car: 'M4 16V12l2.2-5h11.6L20 12v4H4zM4 12h16M7.5 19.5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 1 0 0 3M16.5 19.5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 1 0 0 3',
  subscriptions: 'M3.5 7.5L12 3.5l8.5 4v9L12 20.5l-8.5-4zM3.5 7.5L12 11.5l8.5-4M12 11.5v9',
  groceries: 'M3 4h2.2l2.3 10.5h10.2L20 7.5H6M9 20a1.3 1.3 0 1 0 0-2.6a1.3 1.3 0 1 0 0 2.6M17 20a1.3 1.3 0 1 0 0-2.6a1.3 1.3 0 1 0 0 2.6',
  entertainment: 'M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z',
  'going-out': 'M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3M17 21V3c-2.2 1.2-3.5 3.8-3.5 7v3H17',
  utilities: 'M3.5 11L12 4l8.5 7M5.5 9.5V20h13V9.5M10 20v-5h4v5',
  home: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5l3 3 5.8-5.8a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.5-.6-.6-2.5z',
  other: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2 2.2.8-2.2.8L19 22l-.8-2.2-2.2-.8 2.2-.8z',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  plus: 'M12 5v14M5 12h14',
  chart: 'M5 20V11M12 20V5M19 20v-6',
  users: 'M15 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 3 18.5V20M9 11a3.5 3.5 0 1 0 0-7a3.5 3.5 0 1 0 0 7M21 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  left: 'M15 18l-6-6 6-6',
  right: 'M9 18l6-6-6-6',
  close: 'M18 6L6 18M6 6l12 12',
}

// Decorative by default; pass a label when the icon is the only content that explains something
export default function Icon({ name, size = 20, strokeWidth = 2, label, className = '', style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' })}
    >
      <path d={PATHS[name] || PATHS.other} />
    </svg>
  )
}

// A category's icon in its own color, optionally on a tile in its tint
export function CategoryIcon({ category, size = 20, tile, className = '' }) {
  const icon = <Icon name={category?.id} size={size} strokeWidth={1.9} style={{ color: category?.color }} />
  if (!tile) return <span className={className}>{icon}</span>

  return (
    <span
      className={`flex shrink-0 items-center justify-center ${tile} ${className}`}
      style={{ backgroundColor: category?.tint }}
      aria-hidden="true"
    >
      {icon}
    </span>
  )
}
