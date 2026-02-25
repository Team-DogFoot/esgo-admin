# CLAUDE.md — ESGo Admin 프로젝트 컨텍스트

> K-ESG Platform과의 차이점, 리전 추가, 배포 가이드는 `README.md` 참조.

## 프로젝트 요약

K-ESG 멀티 리전 통합 관리 플랫폼. 리전별 워크스페이스·사용자·크레딧·구독을 모니터링하고 관리한다.

- **스택**: Next.js 16 (App Router), React 19, Tailwind 4, shadcn/ui, Prisma 7, NextAuth v5, Pino, Zod 4
- **언어**: TypeScript strict, 한국어 UI
- **특징**: 자체 DB 없음 (K-ESG 리전 DB 직접 접근), JWT 전용 인증, ADMIN_EMAILS 가드
- **관련 프로젝트**: [ESGo Platform](https://github.com/Team-DogFoot/ESGo) — DB 스키마 owner

## 빠른 명령어

```bash
# 통합 환경 (esgo/ 상위 폴더에서)
docker compose up -d postgres                              # PostgreSQL만 기동
docker compose -f docker-compose.dev.yml up -d --build     # 전체 dev 환경

# 단독 실행
npm run dev              # Next.js dev 서버 (http://localhost:3001 또는 3000)
npm run build            # 프로덕션 빌드
npm run lint             # ESLint
npm run db:pull:kr       # 한국 리전 DB → Prisma 스키마 동기화
npm run db:generate:kr   # 한국 리전 Prisma 클라이언트 생성
```

## 핵심 디렉터리

```
src/proxy.ts              인증 미들웨어 (NextAuth, ADMIN_EMAILS 체크)
src/actions/              Server Actions (도메인별 폴더, 함수당 1파일)
  dashboard/              get-region-stats
  user/                   get-users, get-user-detail
  workspace/              get-workspaces, get-workspace-detail, adjust-credit, change-plan
                          get-workspace-documents, get-workspace-esg, get-workspace-pipelines
                          get-workspace-subscription, batch-adjust-credits
  billing/                get-billing-stats, get-subscriptions, get-payments
                          get-credit-ledger, get-credit-consumption
  ai-monitor/             get-ai-stats, get-pipelines, get-pipeline-errors
                          get-credit-by-workspace, get-credit-by-feature, get-credit-consumption
  content/                get-content-stats, get-documents, get-reports
                          get-esg-overview, get-esg-category-stats, get-esg-item-rankings
src/app/                  App Router 페이지
  (admin)/                관리자 레이아웃 (인증 필수)
    page.tsx              홈 — 리전 선택
    [region]/             리전별 라우트
      page.tsx            대시보드
      users/              사용자 목록 + [id] 상세
      workspaces/         워크스페이스 목록 + [id] 상세 (7탭)
      billing/            빌링 대시보드 + subscriptions, payments, credits
      ai-monitor/         AI 대시보드 + pipelines, credits
      content/            콘텐츠 대시보드 + documents, esg-data, reports
  (auth)/login/           로그인 페이지
  api/auth/               NextAuth API 라우트
src/components/           UI 컴포넌트
  layout/                 admin-sidebar, sidebar-nav, region-selector, user-menu
  common/                 status-badge, pagination, filter-bar
  dashboard/              stat-card, plan-distribution
  user/                   user-table, user-detail
  workspace/              workspace-table, workspace-detail (7탭), batch-credit-dialog
                          workspace-documents-tab, workspace-esg-tab
                          workspace-pipelines-tab, workspace-subscription-tab
  billing/                subscription-table, payment-table, credit-ledger-table
                          credit-consumption-chart
  ai-monitor/             pipeline-table, pipeline-error-list
                          credit-by-workspace-chart, credit-by-feature-chart
                          credit-consumption-chart, credit-consumption-trend-chart
  content/                document-table, esg-overview-table, report-table
                          esg-category-stats, esg-item-rankings
                          esg-completion-chart, data-source-chart
  ui/                     shadcn/ui 컴포넌트
src/lib/                  싱글턴 인프라
  auth.ts / auth.config.ts  NextAuth (Google OAuth, JWT, ADMIN_EMAILS)
  prisma.ts               리전별 PrismaClient 팩토리 (캐시)
  regions.ts              리전 설정 + getDatabaseUrl()
  env.ts                  환경 변수 검증 (Zod)
  logger.ts               Pino 로거
  action.ts               ActionResult<T>, ok(), fail()
  format.ts               formatCurrency, formatNumber, formatFileSize, formatDuration, formatRelativeTime
  utils.ts                cn()
src/types/                next-auth.d.ts (세션 타입 확장)
prisma/{regionId}/        리전별 Prisma 스키마 + config
```

## 아키텍처 규칙

1. **Server-First**: `page.tsx`는 Server Component로 데이터 로딩만 수행. 인터랙션은 `"use client"` 컴포넌트에서
2. **Thin Page, Fat Component**: 페이지는 auth + 데이터 로딩 + 컴포넌트 렌더만. 비즈니스 로직은 컴포넌트 또는 액션 내부
3. **ActionResult 단방향**: 모든 Server Action은 `ok(data)` 또는 `fail(error)` 반환. 클라이언트에서 `result.success`로 분기
4. **멀티 리전 Prisma**: `getPrismaClient(regionId)` — 리전 ID로 캐시된 PrismaClient 반환. `DATABASE_URL_{REGION_ID}` 환경 변수 사용
5. **리전 검증**: 모든 액션/페이지에서 `getRegion(regionId)` 검증 후 진행. 유효하지 않으면 fail 또는 redirect
6. **스키마 동기화**: Platform이 `prisma db push`로 스키마 관리. Admin은 `prisma db pull`로 읽기 전용 동기화

## ⚠️ 스키마 변경 워크플로우 (최우선 규칙)

**Admin은 자체 DB가 없다. Platform의 PostgreSQL을 공유한다.**
**스키마 변경이 필요하면 반드시 아래 순서를 따라야 한다. 이 순서를 건너뛰거나 바꾸면 배포가 깨진다.**

```
1. Platform 스키마 수정  →  ../esg-platform/prisma/schema.prisma
2. Platform DB 반영      →  cd ../esg-platform && npm run db:push
3. Platform 커밋/push
4. Admin 스키마 동기화   →  npm run db:pull:kr
5. Admin 커밋/push       →  변경된 prisma/kr/schema.prisma 반드시 커밋
```

**절대 하면 안 되는 것:**
- Admin에서 `prisma db push` 실행 (스키마 owner가 아님)
- Admin의 `prisma/kr/schema.prisma`를 수동으로 편집 (`db pull`로만 갱신)
- 스키마 변경 없이 Admin 코드에서 존재하지 않는 모델/필드 사용
- Platform 스키마 변경 후 Admin `db pull` + 커밋을 빠뜨림 (CI/CD는 커밋된 스키마만 사용, DB 접근 없음)

**Docker dev 환경에서는** Admin 컨테이너 시작 시 `db pull`이 자동 실행된다. 하지만 프로덕션 CI/CD는 레포에 커밋된 `schema.prisma`로 `prisma generate`만 실행하므로, 반드시 `db pull` 결과를 커밋해야 한다.

## Server Action 템플릿

```typescript
"use server";
import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "모듈명" });
const schema = z.object({ regionId: z.string(), /* ... */ });

export async function myAction(input: z.infer<typeof schema>): Promise<ActionResult<T>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const region = getRegion(parsed.data.regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(parsed.data.regionId);
  log.info({ regionId: parsed.data.regionId }, "myAction started");

  try {
    const result = await prisma.someModel.findMany({});
    log.info({ regionId: parsed.data.regionId }, "myAction succeeded");
    return ok(result);
  } catch (error) {
    log.error({ err: error }, "myAction failed");
    return fail("에러 메시지");
  }
}
```

## Client Component 템플릿

```typescript
"use client";
import { useState, useCallback, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { regionId: string; }

export function MyComponent({ regionId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAction = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result = await myAction({ regionId });
      if (!result.success) { setError(result.error); return; }
    });
  }, [regionId]);

  return (
    <div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      <Button disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        실행
      </Button>
    </div>
  );
}
```

## Import 순서

```typescript
// 1. React          — useState, useCallback 등
// 2. Next.js        — Link, redirect, revalidatePath
// 3. 서드파티       — lucide-react, zod 등
// 4. UI 컴포넌트    — @/components/ui/*
// 5. 도메인 컴포넌트 — @/components/*
// 6. 라이브러리     — @/lib/*
// 7. Server Actions — @/actions/*
// 8. 타입           — import type { X } from "@/types/*"
```

## 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일 | kebab-case | `credit-adjust-form.tsx` |
| 컴포넌트 | PascalCase, named export | `export function CreditAdjustForm()` |
| 핸들러 | `handle` 접두사 | `handleSubmit` |
| 불리언 | `is`/`has` 접두사 | `isPending` |
| 상수 | UPPER_SNAKE_CASE | `NAV_ITEMS` |
| Action | 동사 + 목적어 | `getWorkspaceDetail` |

## TypeScript

- strict 모드, `any` 금지
- 타입만 import할 때 `import type` 사용
- `ActionResult<T>` = `{ success: true, data: T } | { success: false, error: string }`
- Props는 컴포넌트 파일 내 interface로 선언

## 디자인 시스템

### UI 기반

- **shadcn/ui** 컴포넌트 (`src/components/ui/`)
- **CVA** variant 스타일링
- **`cn()`** 으로 Tailwind 클래스 병합
- **Named export만** 사용 (default export 금지)
- **Composition 패턴**: Card = CardHeader + CardTitle + CardContent

### 컬러

- 시맨틱 CSS 변수 사용 (oklch): `--primary`, `--muted`, `--destructive`, `--border` 등
- 하드코딩 금지. 단, 도메인 컬러는 예외:

```typescript
// 플랜 뱃지
FREE: "bg-gray-100 text-gray-700"
PRO: "bg-indigo-100 text-indigo-700"
STANDARD: "bg-blue-100 text-blue-700"
ENTERPRISE: "bg-purple-100 text-purple-700"
```

### 레이아웃

```
페이지 컨테이너: "mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
카드 그리드 4열: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
2열 레이아웃:    "grid grid-cols-1 gap-6 lg:grid-cols-2"
리스트 아이템:   "flex items-center justify-between"
```

### 반응형

- Mobile-first: 기본 → `sm:` → `md:` → `lg:`
- 사이드바: 데스크톱 `md:block` / 모바일 `md:hidden`

### 아이콘

- **lucide-react만** 사용
- 크기: `h-4 w-4` (인라인), `h-5 w-5` (카드 헤더), `h-10 w-10` (빈 상태)
- 로딩: `<Loader2 className="h-4 w-4 animate-spin" />`

### 에러 표시

```typescript
// 인라인 에러 박스 (가장 일반적)
<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>

// Alert (구조화된 에러)
<Alert variant="destructive"><AlertTriangle className="h-4 w-4" />...</Alert>
```

### 빈 상태

```typescript
<p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
```

## 로깅

```typescript
import { logger } from "@/lib/logger";
const log = logger.child({ module: "모듈명" });

log.info({ regionId }, "started");       // 액션 시작/완료
log.warn("fallback triggered");          // 비정상 흐름
log.error({ err: error, regionId }, "failed");  // catch 블록
log.debug({ count: items.length }, "result");   // DB 결과, 중간값
```

## DB 모델 (K-ESG 리전 DB 조회)

```
User ──< WorkspaceMember >── Workspace ──< Document
                                  │    ├──< EsgSummary
                                  │    ├──< CreditLedger
                                  │    ├──< Subscription ──< Plan
                                  │    └──< Payment

Workspace: creditBalance (Int), planCode (FREE/PRO/STANDARD/ENTERPRISE)
CreditLedger: amount, balance, type (INITIAL/MONTHLY/PURCHASE/CONSUME/REFUND/ADMIN)
EsgSummary: esgItemCode, status (NOT_STARTED/IN_PROGRESS/COMPLETED)
Plan: code, monthlyPrice, initialCredits, monthlyCredits, maxMembers, maxDocuments
Subscription: workspaceId (1:1), status, currentPeriodStart/End
```

## 상태 관리

- 외부 라이브러리 없음. `useState` + `useTransition` + Server Action
- 서버 상태는 Server Component → props 전달
- 폼: `useState` + `onChange` 직접 관리

## K-ESG Platform과의 차이점

| 항목 | K-ESG Platform | ESGo Admin |
|------|----------------|------------|
| DB | 자체 PostgreSQL (스키마 owner) | K-ESG 리전 DB 직접 접근 |
| 인증 | NextAuth + DB adapter | JWT 전용 (DB adapter 없음) |
| 접근 제어 | 워크스페이스 멤버십 | `ADMIN_EMAILS` 화이트리스트 |
| Prisma | 단일 클라이언트, `db push` | 리전별 PrismaClient 팩토리, `db pull` |
| 라우팅 | `/dashboard/*` | `/[region]/*` |
| 포트 (개발) | 3000 | 3001 |

## 절대 하지 말 것

- `default export` 사용 (page.tsx, layout.tsx, loading.tsx, error.tsx 제외)
- `any` 타입 사용
- lucide-react 외 아이콘 라이브러리 사용
- CSS 변수 대신 하드코딩 색상 사용 (플랜 뱃지 등 도메인 컬러 예외)
- `console.log`/`console.error` 사용 (Pino logger 사용)
- Admin에서 `prisma db push` 실행 또는 `prisma/kr/schema.prisma` 수동 편집 (위 "스키마 변경 워크플로우" 참조)
- Platform 스키마 변경 후 Admin에서 `db pull` + 커밋을 빠뜨리기 (CI/CD 빌드 깨짐)
- hook/이벤트 핸들러 없이 `"use client"` 사용
- 외부 상태 관리 라이브러리 도입

## 문서 수정 원칙

README.md, CLAUDE.md 등 프로젝트 문서를 수정할 때는 변경 이력이나 흔적을 남기지 않는다. 항상 처음부터 이 내용이었던 것처럼 최종본 형태로 작성한다.
