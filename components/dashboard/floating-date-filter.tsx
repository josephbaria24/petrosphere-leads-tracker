//components\dashboard\floating-date-filter.tsx
'use client'

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import Image from "next/image"
import { useState, useEffect } from "react"

export function FloatingDateFilter(props: any) {
  const {
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    selectedInterval,
    setSelectedInterval,
    rangeIndex,
    setRangeIndex,
    availableYears,
    timeLabels,
    onRefresh
  } = props

  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [side, setSide] = useState<'left' | 'right'>('right')

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Initialize position on mount and handle window resize/zoom
  useEffect(() => {
    const buttonSize = 56

    const calculatePosition = () => {
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight

      const savedPosition = localStorage.getItem('floatingButtonPosition')

      if (savedPosition) {
        const parsed = JSON.parse(savedPosition)
        const savedSide = parsed.side || 'right'

        // Recalculate position based on saved side and constrain to viewport
        let newX = savedSide === 'left' ? 20 : windowWidth - buttonSize - 20
        let newY = Math.max(20, Math.min(windowHeight - buttonSize - 20, parsed.y))

        setPosition({ x: newX, y: newY })
        setSide(savedSide)
      } else {
        // Default position: bottom-right
        setPosition({ x: windowWidth - buttonSize - 20, y: windowHeight - buttonSize - 20 })
        setSide('right')
      }
    }

    calculatePosition()

    // Handle window resize and zoom
    const handleResize = () => {
      calculatePosition()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const buttonSize = 56 // 14 * 4 (w-14 h-14)

    // Get final position
    let finalX = position.x + info.offset.x
    let finalY = position.y + info.offset.y

    // Constrain Y within viewport
    finalY = Math.max(20, Math.min(windowHeight - buttonSize - 20, finalY))

    // Snap to nearest side (left or right)
    const snapThreshold = windowWidth / 2
    const newSide = finalX < snapThreshold ? 'left' : 'right'

    // Snap X to the side with padding
    finalX = newSide === 'left' ? 20 : windowWidth - buttonSize - 20

    const newPosition = { x: finalX, y: finalY, side: newSide }
    setPosition(newPosition)
    setSide(newSide)

    // Save to localStorage
    localStorage.setItem('floatingButtonPosition', JSON.stringify(newPosition))

    // Reset motion values
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      style={{
        x,
        y,
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 50,
        touchAction: 'none'
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      <Popover>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <motion.button
                  whileTap={{ scale: isDragging ? 0.9 : 0.9 }}
                  className="w-12 h-12 rounded-2xl bg-blue-700 border-0 border-accent-foreground flex items-center justify-center shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
                  style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
                >
                  <Image
                    src="/icons/calendar.svg"
                    alt="Calendar"
                    width={25}
                    height={25}
                    className="w-6 h-6 dark:brightness-0 invert dark:invert pointer-events-none"
                  />
                </motion.button>
              </PopoverTrigger>
            </TooltipTrigger>

            <TooltipContent side={side === 'left' ? 'right' : 'left'} className="text-xs px-2 py-1">
              Date Filters
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Animated Popover */}
        <PopoverContent
          asChild
          side={side === 'left' ? 'right' : 'left'}
          align="end"
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-72 p-4 space-y-4 shadow-lg rounded-xl bg-popover"
          >
            <h3 className="text-lg font-semibold">Date Filters</h3>

            {/* Interval */}
            <div>
              <label className="text-sm font-medium">Interval</label>
              <Select
                value={selectedInterval}
                onValueChange={setSelectedInterval}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Year */}
            {selectedInterval !== "annually" && selectedInterval !== "all" && (
              <div>
                <label className="text-sm font-medium">Year</label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y: number) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Month */}
            {selectedInterval === "monthly" && selectedInterval !== "all" && (
              <div>
                <label className="text-sm font-medium">Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                      .map((m: string) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Range */}
            {["weekly", "quarterly", "annually"].includes(selectedInterval) && selectedInterval !== "all" && (
              <div>
                <label className="text-sm font-medium">Range</label>
                <Select
                  value={rangeIndex.toString()}
                  onValueChange={(v) => setRangeIndex(parseInt(v))}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeLabels.map((label: string, idx: number) => (
                      <SelectItem key={idx} value={idx.toString()}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Refresh */}
            <Button
              className="w-full flex items-center justify-center gap-2"
              onClick={onRefresh}
            >
              <RefreshCw className="w-4 h-4" /> Refresh Data
            </Button>

          </motion.div>
        </PopoverContent>
      </Popover>
    </motion.div>
  )
}