import { Trophy, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EsgItemRankings as EsgItemRankingsData } from "@/actions/content/get-esg-item-rankings";

interface EsgItemRankingsProps {
  rankings: EsgItemRankingsData;
}

export function EsgItemRankings({ rankings }: EsgItemRankingsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-green-600" />
            <CardTitle className="text-sm font-medium">
              가장 많이 완료된 항목 Top 5
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {rankings.topCompleted.length === 0 ? (
            <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
          ) : (
            <ol className="space-y-2">
              {rankings.topCompleted.map((item, index) => (
                <li
                  key={item.esgItemCode}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    <span className="mr-2 font-medium text-muted-foreground">
                      {index + 1}.
                    </span>
                    <span className="font-medium">{item.esgItemCode}</span>
                  </span>
                  <span className="text-green-600">{item.count}건</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              미완료 항목 Top 5
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {rankings.topNotStarted.length === 0 ? (
            <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
          ) : (
            <ol className="space-y-2">
              {rankings.topNotStarted.map((item, index) => (
                <li
                  key={item.esgItemCode}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    <span className="mr-2 font-medium text-muted-foreground">
                      {index + 1}.
                    </span>
                    <span className="font-medium">{item.esgItemCode}</span>
                  </span>
                  <span className="text-muted-foreground">{item.count}건</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
