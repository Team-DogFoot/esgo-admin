import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EsgCategoryStat } from "@/actions/content/get-esg-category-stats";

interface EsgCategoryStatsProps {
  stats: EsgCategoryStat[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "환경": "bg-green-500",
  "사회": "bg-blue-500",
  "지배구조": "bg-purple-500",
  "기타": "bg-gray-500",
};

export function EsgCategoryStats({ stats }: EsgCategoryStatsProps) {
  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">ESG 카테고리별 현황</CardTitle>
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
        <CardTitle className="text-sm font-medium">ESG 카테고리별 현황</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat) => (
            <div key={stat.category} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{stat.category}</span>
                <span className="text-muted-foreground">
                  {stat.completedCount}/{stat.totalItems} 완료 ({stat.averageCompletionRate}%)
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted">
                <div
                  className={`h-2.5 rounded-full ${CATEGORY_COLORS[stat.category] ?? "bg-gray-500"}`}
                  style={{ width: `${stat.averageCompletionRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
