"use client"

import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const inputGroupVariants = cva(
  "flex w-full items-center overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
  {
    variants: {
      size: {
        default: "h-9",
        sm: "h-8",
        lg: "h-10",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const InputGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof inputGroupVariants>
>(({ className, size, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="input-group"
      className={cn(inputGroupVariants({ size, className }))}
      {...props}
    />
  )
})
InputGroup.displayName = "InputGroup"

const inputBaseClasses =
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-full w-full min-w-0 border-0 bg-transparent px-3 py-1 text-base outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"

const InputGroupInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      data-slot="input-group-input"
      className={cn(inputBaseClasses, className)}
      {...props}
    />
  )
})
InputGroupInput.displayName = "InputGroupInput"

const InputGroupTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      data-slot="input-group-textarea"
      className={cn(inputBaseClasses, "resize-none", className)}
      {...props}
    />
  )
})
InputGroupTextarea.displayName = "InputGroupTextarea"

const inputGroupAddonVariants = cva(
  "flex items-center justify-center border-0 bg-transparent px-3 text-sm text-muted-foreground whitespace-nowrap",
  {
    variants: {
      align: {
        "inline-start": "border-r border-input",
        "inline-end": "border-l border-input",
      },
    },
  }
)

const InputGroupAddon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof inputGroupAddonVariants>
>(({ className, align, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="input-group-addon"
      className={cn(inputGroupAddonVariants({ align, className }))}
      {...props}
    />
  )
})
InputGroupAddon.displayName = "InputGroupAddon"

const InputGroupText = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      data-slot="input-group-text"
      className={cn("text-sm font-medium text-gray-600", className)}
      {...props}
    />
  )
})
InputGroupText.displayName = "InputGroupText"

const inputGroupButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border-0 bg-transparent text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: "text-gray-900 hover:bg-gray-50",
        ghost: "text-gray-900 hover:bg-gray-100",
        secondary: "text-gray-900 hover:bg-gray-50",
      },
      size: {
        default: "h-full px-3",
        "icon-xs": "h-full w-8 p-0",
        sm: "h-full px-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const InputGroupButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof inputGroupButtonVariants>
>(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      ref={ref}
      data-slot="input-group-button"
      className={cn(inputGroupButtonVariants({ variant, size, className }))}
      {...props}
    />
  )
})
InputGroupButton.displayName = "InputGroupButton"

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupTextarea,
  InputGroupText,
}


