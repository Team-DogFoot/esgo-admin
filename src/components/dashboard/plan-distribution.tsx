import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart } from "lucide-react";

interface PlanDistributionProps {
  data: { planCode: string; count: number }[];
}

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700",
  PRO: "bg-blue-100 text-blue-700",
};

export function PlanDistribution({ data }: PlanDistributionProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">플랜별 분포</CardTitle>
        <PieChart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item) => {
            const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div key={item.planCode} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={PLAN_COLORS[item.planCode] ?? "bg-gray-100 text-gray-700"}>
                    {item.planCode}
                  </Badge>
                  <span className="text-sm">{item.count}개</span>
                </div>
                <span className="text-sm text-muted-foreground">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
