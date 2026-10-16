"use client"

import * as React from "react"

import { tableCellLayout } from "@/lib/table-cell-wrap"
import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className
      )}
      {...props}
    />
  )
}

// Children of a cell. A capped cell (max-w-*) gets a box that asks the table
// for the full one-line width, which the cap clamps as before, and then fills
// the cell so the text wraps inside it. Every other cell passes its children
// through untouched. See tableCellLayout.
function cellChildren(contentClass: string | null, children: React.ReactNode): React.ReactNode {
  if (contentClass === null) return children
  return (
    <div data-slot="table-cell-content" className={contentClass}>
      {children}
    </div>
  )
}

function TableHead({ className, children, ...props }: React.ComponentProps<"th">) {
  const layout = tableCellLayout(className)
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        layout.whitespace,
        className
      )}
      {...props}
    >
      {cellChildren(layout.contentClass, children)}
    </th>
  )
}

function TableCell({ className, children, ...props }: React.ComponentProps<"td">) {
  const layout = tableCellLayout(className)
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        layout.whitespace,
        className
      )}
      {...props}
    >
      {cellChildren(layout.contentClass, children)}
    </td>
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
