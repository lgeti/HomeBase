import Icon from './Icon'

// Placeholder for a section that is planned but not built yet (see BACKLOG.md)
export default function ComingSoon({ icon, title, description }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 pb-28 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-hb-primary-tint text-hb-primary">
        <Icon name={icon} size={28} />
      </span>
      <h2 className="text-xl font-semibold text-hb-text">{title}</h2>
      <p className="max-w-xs text-sm text-hb-text2">{description}</p>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-hb-text3">Coming soon</p>
    </div>
  )
}
