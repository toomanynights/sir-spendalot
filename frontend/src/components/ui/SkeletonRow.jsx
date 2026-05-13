export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-md bg-black/20 animate-pulse">
      <div className="flex-1 space-y-1.5 pr-4">
        <div className="h-2.5 bg-gold/10 rounded w-2/5" />
        <div className="h-2 bg-gold/10 rounded w-1/3" />
      </div>
      <div className="h-3 bg-gold/10 rounded w-16" />
    </div>
  )
}
