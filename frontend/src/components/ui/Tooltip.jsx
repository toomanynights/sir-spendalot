import { useEffect, useRef, useState } from 'react'
import { Portal } from './Portal'

export default function Tooltip({ content, children }) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const wrapperRef = useRef(null)

  function show() {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setCoords({ top: rect.top, left: rect.left + rect.width / 2 })
    }
    setVisible(true)
  }

  useEffect(() => {
    function handleOutsidePointer(e) {
      if (e.pointerType === 'touch' && wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setVisible(false)
      }
    }
    document.addEventListener('pointerdown', handleOutsidePointer)
    return () => document.removeEventListener('pointerdown', handleOutsidePointer)
  }, [])

  return (
    <span
      ref={wrapperRef}
      className="inline-flex items-center p-1 cursor-help"
      onPointerEnter={(e) => { if (e.pointerType !== 'touch') show() }}
      onPointerLeave={(e) => { if (e.pointerType !== 'touch') setVisible(false) }}
      onPointerDown={(e) => {
        if (e.pointerType === 'touch') {
          e.preventDefault()
          visible ? setVisible(false) : show()
        }
      }}
    >
      {children}
      {visible && (
        <Portal>
          <span
            role="tooltip"
            style={{
              position: 'fixed',
              top: coords.top - 8,
              left: coords.left,
              transform: 'translate(-50%, -100%)',
              zIndex: 9999,
            }}
            className="inline-block w-max max-w-[260px] rounded border border-gold/30 bg-brown-darker px-3 py-2 text-sm font-crimson text-parchment shadow-card pointer-events-none"
          >
            {content}
          </span>
        </Portal>
      )}
    </span>
  )
}
