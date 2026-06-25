"use client"

import * as React from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const navItemActive =
  "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-[background-color,color,box-shadow] duration-200 ease-in-out"

const navItemInactive =
  "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100 transition-[background-color,color] duration-200 ease-in-out"

const navButtonBase =
  "h-9 rounded-lg px-2.5 text-[13px] group-data-[collapsible=icon]:!size-9 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center transition-[background-color,color,transform] duration-200 ease-in-out"

const subMenuList =
  "relative mx-0 mt-1 ml-4 gap-0.5 border-l border-sidebar-border pl-2.5 pr-0"

const subMenuItemBranch =
  "relative before:pointer-events-none before:absolute before:-left-3 before:top-1/2 before:h-px before:w-3 before:bg-sidebar-border last:after:pointer-events-none last:after:absolute last:after:-left-[calc(0.75rem+1px)] last:after:top-1/2 last:after:bottom-0 last:after:w-px last:after:bg-sidebar transition-opacity duration-200"

type NavItem = {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
  }[]
}

function NavCollapsibleItem({ item }: { item: NavItem & { items: NonNullable<NavItem["items"]> } }) {
  const [open, setOpen] = React.useState(item.isActive ?? false)

  React.useEffect(() => {
    if (item.isActive) setOpen(true)
  }, [item.isActive])

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            className={cn(navButtonBase, item.isActive ? navItemActive : navItemInactive)}
          >
            {item.icon && <item.icon className="!size-4 transition-transform duration-200 ease-in-out" />}
            <span>{item.title}</span>
            <ChevronRight className="ml-auto !size-3.5 shrink-0 transition-transform duration-300 ease-in-out group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className={subMenuList}>
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title} className={subMenuItemBranch}>
                <SidebarMenuSubButton
                  asChild
                  className={cn(
                    "h-8 rounded-md px-2 text-xs transition-[background-color,color,transform] duration-200 ease-in-out",
                    subItem.isActive ? navItemActive : navItemInactive
                  )}
                >
                  <Link href={subItem.url} className="flex items-center gap-2">
                    {subItem.icon && (
                      <subItem.icon className="!size-3.5 shrink-0 transition-transform duration-200 ease-in-out group-hover/menu-sub-item:scale-105" />
                    )}
                    <span>{subItem.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function NavMain({
  items,
}: {
  items: NavItem[]
}) {
  const { state, isMobile } = useSidebar()
  const isIconCollapsed = state === "collapsed" && !isMobile

  return (
    <SidebarGroup className="px-2 py-1.5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-1.5">
      <SidebarGroupContent>
        <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1.5">
          {items.map((item) => {
            if (item.items && item.items.length > 0) {
              if (isIconCollapsed) {
                return (
                  <SidebarMenuItem key={item.title}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          className={cn(
                            navButtonBase,
                            item.isActive ? navItemActive : navItemInactive
                          )}
                        >
                          {item.icon && <item.icon className="!size-4" />}
                          <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                        </SidebarMenuButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start" className="min-w-48 rounded-xl">
                        {item.items.map((subItem) => (
                          <DropdownMenuItem key={subItem.title} asChild>
                            <Link
                              href={subItem.url}
                              className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-lg transition-[background-color,color] duration-200 ease-in-out",
                                subItem.isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                              )}
                            >
                              {subItem.icon && <subItem.icon className="size-4 shrink-0" />}
                              {subItem.title}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                )
              }

              return (
                <NavCollapsibleItem
                  key={item.title}
                  item={item as NavItem & { items: NonNullable<NavItem["items"]> }}
                />
              )
            }

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={item.isActive}
                  className={cn(
                    navButtonBase,
                    item.isActive ? navItemActive : navItemInactive
                  )}
                >
                  <Link href={item.url} className="flex w-full items-center gap-2">
                    {item.icon && <item.icon className="!size-4 transition-transform duration-200 ease-in-out" />}
                    <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
