import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardBody, CardHeader } from './Card'
import { Button } from './Button'

export function FilterBar({ expanded, onToggle, onReset, children, className = '', resultText }) {
  return (
    <Card shimmer className={className}>
      <CardHeader>
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 min-w-0 items-center justify-between gap-2 text-left min-h-touch py-1 rounded-md hover:bg-black/10"
        >
          <span className="card-title">Filters</span>
          {expanded
            ? <ChevronUp size={18} className="text-gold" />
            : <ChevronDown size={18} className="text-gold" />
          }
        </button>
      </CardHeader>
      {expanded && (
        <CardBody>
          {children}
          <div className="mt-4 flex items-center justify-between gap-3">
            {resultText
              ? <p className="text-xs text-gold-muted font-crimson italic">{resultText}</p>
              : <span />
            }
            <Button variant="ghost" onClick={onReset}>Reset filters</Button>
          </div>
        </CardBody>
      )}
    </Card>
  )
}
