"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
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

interface BarChartComponentProps {
  title: string
  description?: string
  data: Array<Record<string, any>>
  dataKey: string | string[] // Puede ser una key o múltiples para barras múltiples
  xAxisKey: string
  chartConfig: ChartConfig
  footer?: React.ReactNode
  className?: string
  stacked?: boolean
}

export function BarChartComponent({
  title,
  description,
  data,
  dataKey,
  xAxisKey,
  chartConfig,
  footer,
  className,
  stacked = false,
}: BarChartComponentProps) {
  const dataKeys = Array.isArray(dataKey) ? dataKey : [dataKey]

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.toString().slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel={dataKeys.length === 1} />}
            />
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={`var(--color-${key})`}
                radius={stacked && index === 0 ? [0, 0, 4, 4] : stacked && index === dataKeys.length - 1 ? [4, 4, 0, 0] : 8}
                stackId={stacked ? "a" : undefined}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
      {footer && <CardFooter className="flex-col items-start gap-2 text-sm">{footer}</CardFooter>}
    </Card>
  )
}
