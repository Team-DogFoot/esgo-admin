"use client";

import type { PieLabelRenderProps } from "recharts";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DataSourceChartProps {
  data: { source: string; count: number }[];
}

const SOURCE_COLORS: Record<string, string> = {
  AI: "hsl(217, 91%, 60%)",
  MANUAL: "hsl(142, 71%, 45%)",
  "미설정": "hsl(220, 9%, 60%)",
};

const DEFAULT_COLOR = "hsl(220, 9%, 75%)";

function renderLabel(props: PieLabelRenderProps): string {
  const raw = props as unknown as Record<string, unknown>;
  const name = String(raw.source ?? "");
  const percent = Number(raw.percent ?? 0);
  return `${name} ${(percent * 100).toFixed(0)}%`;
}

export function DataSourceChart({ data }: DataSourceChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">데이터 소스 분포</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="source"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={renderLabel}
                labelLine={false}
                fontSize={12}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.source}
                    fill={SOURCE_COLORS[entry.source] ?? DEFAULT_COLOR}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${String(value ?? 0)}건`, String(name ?? "")]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  fontSize: "12px",
                }}
              />
              <Legend
                formatter={(value: string) => (
                  <span style={{ fontSize: "12px" }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
