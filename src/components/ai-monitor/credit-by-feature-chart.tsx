"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CreditByFeatureChartProps {
  data: { feature: string; amount: number }[];
}

const FEATURE_COLORS: Record<string, string> = {
  "전처리": "oklch(0.6 0.18 250)",
  "분류": "oklch(0.7 0.18 85)",
  "추출": "oklch(0.6 0.18 150)",
  "리포트": "oklch(0.6 0.15 30)",
  "기타": "oklch(0.7 0.05 250)",
};

const DEFAULT_COLOR = "oklch(0.6 0.1 200)";

export function CreditByFeatureChart({ data }: CreditByFeatureChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">기능별 크레딧 소비</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">기능별 크레딧 소비</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="feature"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(props: PieLabelRenderProps) => {
                  const feature = String((props as PieLabelRenderProps & { feature?: string }).feature ?? "");
                  const percent = Number(props.percent ?? 0);
                  return `${feature} ${(percent * 100).toFixed(0)}%`;
                }}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.feature}
                    fill={FEATURE_COLORS[entry.feature] ?? DEFAULT_COLOR}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number | undefined) => [
                  (value ?? 0).toLocaleString(),
                  "크레딧",
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
