/**
 * Spinner — animated loading ring in gold theme.
 * EmptyState — placeholder content for empty lists/sections.
 *
 * Usage:
 *   <Spinner />
 *   <Spinner size="sm" />
 *
 *   <EmptyState
 *     icon={<ScrollText size={32} />}
 *     title="No chronicles found"
 *     message="Thy ledger is bare — record thy first deed above."
 *   />
 */

const SPINNER_SIZES = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-[3px]',
}

export function Spinner({ size = 'md', className = '' }) {
  return (
    <div
      aria-label="Loading…"
      className={[
        'rounded-full border-gold/30 border-t-gold animate-spin',
        SPINNER_SIZES[size] ?? SPINNER_SIZES.md,
        className,
      ].filter(Boolean).join(' ')}
    />
  )
}

export function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-gold-muted">
      <Spinner size="lg" />
      <p className="font-crimson italic text-sm">{message}</p>
    </div>
  )
}

export function EmptyState({ icon, title, message, children, className = 'py-8 px-6' }) {
  return (
    <div className={['text-center', className].filter(Boolean).join(' ')}>
      {icon && (
        <div className="flex justify-center mb-4 text-gold/40">
          {icon}
        </div>
      )}
      {title && (
        <p className="text-gold-muted font-cinzel text-sm tracking-wide mb-2">{title}</p>
      )}
      {message && (
        <p className="text-gold-muted/60 font-crimson italic text-sm">{message}</p>
      )}
      {children}
    </div>
  )
}
