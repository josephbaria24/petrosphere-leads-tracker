'use client'

import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react'

interface Props {
  children: ReactNode
  /** Number of x-axis points; drives the scaled inner width. */
  dataLength: number
  /** Pixels per point at zoom = 1. */
  basePxPerPoint?: number
  /** Inner height in px. */
  height?: number
  /** Minimum zoom factor. */
  minZoom?: number
  /** Maximum zoom factor. */
  maxZoom?: number
  /** Baseline container width when there is no data (px). */
  fallbackMinWidth?: number
  className?: string
}

/**
 * Fully interactive chart container:
 * - Drag to pan horizontally.
 * - Ctrl/⌘ + wheel to zoom in/out (anchored at cursor).
 * - Shift + wheel to scroll horizontally.
 * - Zoom in/out/reset buttons.
 * - Double-click empty area to reset.
 *
 * The child chart should fill the container (e.g. ResponsiveContainer 100%).
 */
export function ZoomPanChart({
  children,
  dataLength,
  basePxPerPoint = 56,
  height = 280,
  minZoom = 0.5,
  maxZoom = 6,
  fallbackMinWidth = 320,
  className = '',
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [isDown, setIsDown] = useState(false)
  const [hasDragged, setHasDragged] = useState(false)
  const startX = useRef(0)
  const startScroll = useRef(0)

  const minWidth = Math.max(
    fallbackMinWidth,
    Math.max(1, dataLength) * basePxPerPoint * zoom,
  )

  const zoomAtPoint = useCallback(
    (nextZoom: number, clientX?: number) => {
      const clamped = Math.max(minZoom, Math.min(maxZoom, nextZoom))
      const el = scrollRef.current
      if (!el) {
        setZoom(clamped)
        return
      }
      const rect = el.getBoundingClientRect()
      const pointerX = clientX != null ? clientX - rect.left : rect.width / 2
      const oldMinWidth = Math.max(
        fallbackMinWidth,
        Math.max(1, dataLength) * basePxPerPoint * zoom,
      )
      const newMinWidth = Math.max(
        fallbackMinWidth,
        Math.max(1, dataLength) * basePxPerPoint * clamped,
      )
      const worldX = el.scrollLeft + pointerX
      const ratio = oldMinWidth > 0 ? worldX / oldMinWidth : 0
      const newWorldX = ratio * newMinWidth
      const newScroll = newWorldX - pointerX

      setZoom(clamped)
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = Math.max(0, newScroll)
        }
      })
    },
    [zoom, dataLength, basePxPerPoint, fallbackMinWidth, minZoom, maxZoom],
  )

  const zoomIn = () => zoomAtPoint(zoom * 1.25)
  const zoomOut = () => zoomAtPoint(zoom / 1.25)
  const reset = () => {
    setZoom(1)
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    })
  }

  // Automatically scroll to the end (current date) when data loads
  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
      })
    }
  }, [dataLength])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
        zoomAtPoint(zoom * factor, e.clientX)
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [zoom, zoomAtPoint])

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return
    setIsDown(true)
    setHasDragged(false)
    startX.current = e.pageX - scrollRef.current.offsetLeft
    startScroll.current = scrollRef.current.scrollLeft
  }

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDown || !scrollRef.current) return
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = x - startX.current
    if (Math.abs(walk) > 3) setHasDragged(true)
    scrollRef.current.scrollLeft = startScroll.current - walk
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
    if (e.ctrlKey || e.metaKey) return
    if (!scrollRef.current) return
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      scrollRef.current.scrollLeft += e.deltaY + e.deltaX
    }
  }

  const onDoubleClick = () => reset()

  const zoomPct = Math.round(zoom * 100)

  return (
    <div className={`relative w-full ${className}`}>
      <div className="absolute top-1 right-1 z-10 flex items-center gap-0.5 bg-background/90 backdrop-blur-sm rounded-md border border-zinc-200 dark:border-zinc-800 p-0.5 shadow-sm">
        <button
          type="button"
          onClick={zoomOut}
          disabled={zoom <= minZoom + 0.001}
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Zoom out (Ctrl+scroll)"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="text-[10px] text-muted-foreground tabular-nums min-w-[32px] text-center select-none">
          {zoomPct}%
        </span>
        <button
          type="button"
          onClick={zoomIn}
          disabled={zoom >= maxZoom - 0.001}
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Zoom in (Ctrl+scroll)"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />
        <button
          type="button"
          onClick={reset}
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
          title="Reset view (double-click)"
          aria-label="Reset view"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => zoomAtPoint(maxZoom)}
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
          title="Max zoom"
          aria-label="Max zoom"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className={`overflow-x-auto overflow-y-hidden scroll-smooth ${
          isDown
            ? 'cursor-grabbing [&_*]:cursor-grabbing'
            : 'cursor-grab [&_*]:cursor-grab'
        }`}
        style={{
          WebkitOverflowScrolling: 'touch',
          userSelect: isDown ? 'none' : undefined,
          height: `${height}px`,
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseLeave={stop}
        onMouseUp={stop}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
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
    </div>
  )
}
