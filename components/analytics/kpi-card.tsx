"use client"

import { ArrowDown, ArrowUp } from "lucide-react"

import { Card } from "@/components/ui/card"

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  className,
}: KpiCardProps) {
  return (
    <Card className={`p-6 ${className}`}>
      <div className="text-sm text-gray-600 mb-2">{title}</div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {trend && (
        <div
          className={`text-xs mt-2 flex items-center gap-1 ${
            trend.isPositive ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend.isPositive ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )}
          {trend.value > 0 ? "+" : ""}
          {trend.value}% vs mes anterior
        </div>
      )}
      {subtitle && !trend && (
        <div className="text-xs text-gray-600 mt-2">{subtitle}</div>
      )}
    </Card>
  )
}
