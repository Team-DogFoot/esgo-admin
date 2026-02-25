"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyConsumption } from "@/actions/billing/get-credit-consumption";

interface CreditConsumptionChartProps {
  data: DailyConsumption[];
}

export function CreditConsumptionChart({ data }: CreditConsumptionChartProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        date: d.date.slice(5),
        amount: d.amount,
      })),
    [data],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          일별 크레딧 소비량
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => v.toLocaleString()}
              />
              <Tooltip
                formatter={(value: number | undefined) => [
                  `${(value ?? 0).toLocaleString()} 크레딧`,
                  "소비량",
                ]}
                labelFormatter={(label) => `날짜: ${String(label)}`}
              />
              <Bar
                dataKey="amount"
                fill="oklch(0.6 0.17 250)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
