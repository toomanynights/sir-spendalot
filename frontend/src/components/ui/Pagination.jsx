import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({ hasPrev, hasNext, onPrev, onNext, pageNumber, className = '' }) {
  if (!hasPrev && !hasNext) return null
  return (
    <div className={['flex items-center justify-between mt-3 pt-3 border-t border-gold/10', className].filter(Boolean).join(' ')}>
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        className="flex items-center gap-1 btn btn-ghost text-sm disabled:opacity-30"
      >
        <ChevronLeft size={14} /> Previous
      </button>
      {pageNumber != null && (
        <span className="text-sm text-gold-muted">Page {pageNumber}</span>
      )}
      <button
        onClick={onNext}
        disabled={!hasNext}
        className="flex items-center gap-1 btn btn-ghost text-sm disabled:opacity-30"
      >
        Next <ChevronRight size={14} />
      </button>
    </div>
  )
}
