import Link from "next/link";
import { Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { regions } from "@/lib/regions";

export default function HomePage() {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar regionId={null} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">리전 선택</h1>
            <p className="text-sm text-muted-foreground">관리할 리전을 선택하세요</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {regions.map((region) => (
              <Link key={region.id} href={`/${region.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{region.flag}</span>
                      <div>
                        <CardTitle className="text-lg">{region.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{region.domain}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" />
                      <span>{region.domain}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
