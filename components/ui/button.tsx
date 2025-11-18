import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-gray-900 text-white hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-gray-300 bg-transparent text-gray-900 hover:bg-gray-50 hover:border-gray-400",
        secondary:
          "bg-transparent text-gray-900 hover:bg-gray-50",
        ghost:
          "bg-transparent text-gray-900 hover:bg-gray-100",
        link: "text-gray-900 underline-offset-4 hover:underline",
      },
      size: {
        // ✅ WCAG 2.5.5: 44px mínimo en mobile, 36px en desktop
        default: "h-11 px-4 py-2 has-[>svg]:px-3 rounded-md sm:h-9",
        // ✅ WCAG 2.5.5: 40px mínimo en mobile, 32px en desktop
        sm: "h-10 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 sm:h-8",
        // ✅ WCAG 2.5.5: 48px en mobile, 40px en desktop
        lg: "h-12 rounded-lg px-6 has-[>svg]:px-4 sm:h-10",
        // ✅ WCAG 2.5.5: 44x44 en mobile, 36x36 en desktop
        icon: "size-11 rounded-md sm:size-9",
        // ✅ WCAG 2.5.5: 40x40 en mobile, 32x32 en desktop
        "icon-sm": "size-10 rounded-md sm:size-8",
        // ✅ WCAG 2.5.5: 48x48 en mobile, 40x40 en desktop
        "icon-lg": "size-12 rounded-lg sm:size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
