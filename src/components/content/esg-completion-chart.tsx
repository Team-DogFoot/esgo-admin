"use client";

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

interface EsgCompletionChartProps {
  data: { range: string; count: number }[];
}

export function EsgCompletionChart({ data }: EsgCompletionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          워크스페이스별 ESG 완료율 분포
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="range"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value) => [`${String(value ?? 0)}개`, "워크스페이스"]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
