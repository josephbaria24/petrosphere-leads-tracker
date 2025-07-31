'use client'

import React, { useMemo } from 'react'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { ChevronRight } from 'lucide-react'

interface InsightPanelProps {
  content: string | null
}

type Section = {
  title: string
  items: { label: string; detail: string }[]
}

export const InsightPanel: React.FC<InsightPanelProps> = ({ content }) => {
  const { sections, rawFallback } = useMemo(() => {
    if (!content) return { sections: [], rawFallback: null }

    const rawSections = content.split(/(?:^|\n)###\s*/).filter(Boolean)

    const parsedSections: Section[] = rawSections.map((sectionRaw) => {
      const [titleLine, ...bodyLines] = sectionRaw.split('\n').filter(Boolean)
      const title = titleLine?.trim()

      const items = bodyLines
        .filter((line) => line.trim().startsWith('-'))
        .map((line) => {
          const match = line.match(/-\s+\*\*(.+?)\*\*:\s*(.+)/)
          if (!match) return { label: 'Note', detail: line.replace(/^-/, '').trim() }

          const [, label, detail] = match
          return { label, detail }
        })

      return { title, items }
    }).filter(section => section.items.length > 0)

    const rawFallback = parsedSections.length === 0 ? content : null

    return { sections: parsedSections, rawFallback }
  }, [content])

  if (!content) return null

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex items-center gap-2 font-semibold text-base mb-2 hover:underline group">
        <ChevronRight
          className="transition-transform duration-200 group-data-[state=open]:rotate-90"
        />
        AI Insight
      </CollapsibleTrigger>

      <CollapsibleContent className="p-4 border rounded bg-muted text-sm space-y-4">
        {rawFallback ? (
          <p className="text-muted-foreground whitespace-pre-line">{rawFallback}</p>
        ) : (
          sections.map((section, idx) => (
            <Collapsible key={idx} defaultOpen>
              <CollapsibleTrigger className="font-medium cursor-pointer hover:underline block mb-1">
                {section.title}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="list-disc list-inside pl-2 space-y-1 mt-1">
                  {section.items.map((item, i) => (
                    <li key={i}>
                      <strong>{item.label}:</strong> {item.detail}
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
