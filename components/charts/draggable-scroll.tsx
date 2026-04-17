'use client'

import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

interface Props {
  children: ReactNode
  /** Minimum inner width in pixels; enables horizontal scroll when larger than container. */
  minWidth: number
  /** Inner height. Pass a number (px) or CSS size (e.g. '320px', '100%'). */
  height?: number | string
  className?: string
}

/**
 * Horizontal drag-to-scroll container, useful for charts with many x-axis points.
 * - Click + drag horizontally to pan.
 * - Works with touch (native overflow scrolling) and mouse wheel (shift + wheel).
 */
export function DraggableScrollArea({
  children,
  minWidth,
  height = 320,
  className = '',
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [isDown, setIsDown] = useState(false)
  const [hasDragged, setHasDragged] = useState(false)
  const startX = useRef(0)
  const startScroll = useRef(0)

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    setIsDown(true)
    setHasDragged(false)
    startX.current = e.pageX - ref.current.offsetLeft
    startScroll.current = ref.current.scrollLeft
  }

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDown || !ref.current) return
    const x = e.pageX - ref.current.offsetLeft
    const walk = x - startX.current
    if (Math.abs(walk) > 3) setHasDragged(true)
    ref.current.scrollLeft = startScroll.current - walk
  }

  const stop = useCallback(() => {
    setIsDown(false)
    setTimeout(() => setHasDragged(false), 0)
  }, [])

  useEffect(() => {
    const onUp = () => stop()
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [stop])

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!ref.current) return
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      ref.current.scrollLeft += e.deltaY + e.deltaX
    }
  }

  return (
    <div
      ref={ref}
      className={`overflow-x-auto overflow-y-hidden scroll-smooth ${
        isDown ? 'cursor-grabbing' : 'cursor-grab'
      } ${className}`}
      style={{
        WebkitOverflowScrolling: 'touch',
        userSelect: isDown ? 'none' : undefined,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseLeave={stop}
      onMouseUp={stop}
      onWheel={onWheel}
      onClickCapture={(e) => {
        if (hasDragged) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      <div
        style={{
          minWidth: `${minWidth}px`,
          height: '100%',
          width: '100%',
        }}
      >
        {children}
      </div>
    </div>
  )
}
