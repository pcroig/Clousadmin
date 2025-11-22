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
  const _totalValue = React.useMemo(() => {
    if (!data || data.length === 0) return 0;
    return data.reduce((acc, curr) => acc + (Number(curr[dataKey]) || 0), 0)
  }, [data, dataKey])

  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader className="items-center pb-0">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {!data || data.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-gray-500">
            No hay datos disponibles para este período
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={data}
                dataKey={dataKey}
                nameKey={nameKey}
                innerRadius={donut ? 60 : 0}
                strokeWidth={5}
              >
                {donut && centerValue !== undefined && (
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
                              {centerValue.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground"
                            >
                              {centerLabel}
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                )}
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      {footer && <CardFooter className="flex-col gap-2 text-sm">{footer}</CardFooter>}
    </Card>
  )
}
