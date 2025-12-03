"use client"

import * as React from "react"
import { Label, Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

const DEFAULT_SLICE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

interface PieChartComponentProps {
  title: string
  description?: string
  data: Array<Record<string, unknown>>
  dataKey: string
  nameKey: string
  chartConfig: ChartConfig
  footer?: React.ReactNode
  className?: string
  donut?: boolean
  centerLabel?: string
  centerValue?: number
}

const getSliceColorFromConfig = (
  sliceKey: string | undefined,
  config: ChartConfig
): string | null => {
  if (!sliceKey) {
    return null
  }

  const entry = config[sliceKey]

  if (!entry) {
    return null
  }

  if ("color" in entry && typeof entry.color === "string" && entry.color.length > 0) {
    return entry.color
  }

  if ("theme" in entry && entry.theme) {
    return entry.theme.light || entry.theme.dark || null
  }

  return null
}

export function PieChartComponent({
  title,
  description,
  data,
  dataKey,
  nameKey,
  chartConfig,
  footer,
  className,
  donut = false,
  centerLabel,
  centerValue,
}: PieChartComponentProps) {
  const totalValue = React.useMemo(() => {
    if (!data || data.length === 0) {
      return 0
    }

    return data.reduce((acc, curr) => acc + (Number(curr[dataKey]) || 0), 0)
  }, [data, dataKey])

  const pieData = React.useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }

    return data.map((entry, index) => {
      const rawSliceName = entry[nameKey]
      const sliceName =
        typeof rawSliceName === "string" && rawSliceName.length > 0
          ? rawSliceName
          : undefined

      const colorFromConfig = getSliceColorFromConfig(sliceName, chartConfig)
      const fallbackColor = DEFAULT_SLICE_COLORS[index % DEFAULT_SLICE_COLORS.length]

      const existingFill =
        typeof entry.fill === "string" && entry.fill.length > 0 ? entry.fill : null

      return {
        ...entry,
        fill: existingFill || colorFromConfig || fallbackColor,
      }
    })
  }, [chartConfig, data, nameKey])

  const resolvedCenterValue =
    typeof centerValue === "number" ? centerValue : donut ? totalValue : undefined

  const shouldRenderCenterLabel =
    donut && typeof resolvedCenterValue === "number" && !Number.isNaN(resolvedCenterValue)

  const hasData = pieData.length > 0

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="items-center pb-0">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {!hasData ? (
          <div className="flex h-[250px] items-center justify-center text-gray-500">
            No hay datos disponibles para este período
          </div>
        ) : (
          <div className="flex h-[260px] w-full items-center justify-center">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square h-full max-h-[260px] w-full max-w-[260px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={pieData}
                  dataKey={dataKey}
                  nameKey={nameKey}
                  innerRadius={donut ? 60 : 0}
                  strokeWidth={5}
                >
                  {shouldRenderCenterLabel && (
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-3xl font-bold"
                              >
                                {resolvedCenterValue.toLocaleString()}
                              </tspan>
                              {centerLabel && (
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 24}
                                  className="fill-muted-foreground"
                                >
                                  {centerLabel}
                                </tspan>
                              )}
                            </text>
                          )
                        }
                        return null
                      }}
                    />
                  )}
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
      {footer && <CardFooter className="flex-col gap-2 text-sm">{footer}</CardFooter>}
    </Card>
  )
}
