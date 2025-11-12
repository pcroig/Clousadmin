"use client"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
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

interface AreaChartComponentProps {
  title: string
  description?: string
  data: Array<Record<string, unknown>>
  dataKey: string
  xAxisKey: string
  chartConfig: ChartConfig
  footer?: React.ReactNode
  className?: string
}

export function AreaChartComponent({
  title,
  description,
  data,
  dataKey,
  xAxisKey,
  chartConfig,
  footer,
  className,
}: AreaChartComponentProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-gray-500">
            No hay datos disponibles para este período
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <AreaChart
              accessibilityLayer
              data={data}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={xAxisKey}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.toString().slice(0, 3)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Area
                dataKey={dataKey}
                type="natural"
                fill={`var(--color-${dataKey})`}
                fillOpacity={0.4}
                stroke={`var(--color-${dataKey})`}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  )
}
