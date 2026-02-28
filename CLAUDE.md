# CLAUDE.md — ESGo Admin 프로젝트 컨텍스트

> K-ESG Platform과의 차이점, 리전 추가, 배포 가이드는 `README.md` 참조.

## 프로젝트 요약

K-ESG 멀티 리전 통합 관리 플랫폼. 리전별 워크스페이스·사용자·크레딧·구독을 모니터링하고 관리한다.

- **스택**: Next.js 16 (App Router), React 19, Tailwind 4, shadcn/ui, Prisma 7, NextAuth v5, Pino, Zod 4
- **언어**: TypeScript strict, 한국어 UI
- **특징**: 자체 DB 없음 (K-ESG 리전 DB 직접 접근), JWT 전용 인증, ADMIN_EMAILS 가드
- **관련 프로젝트**: [ESGo Platform](https://github.com/Team-DogFoot/ESGo) — DB 스키마 owner
- **DB 스키마 적용 팁**: 최신화된 /esg-platform 기준으로 docker-compose.dev.yml 환경에 스키마 push → Admin에서 pull → 작업/배포 진행

## 빠른 명령어

```bash
docker compose up -d postgres                              # PostgreSQL만 (esgo/ 상위)
docker compose -f docker-compose.dev.yml up -d --build     # 전체 dev 환경
npm run dev              # Next.js dev 서버
npm run build            # 프로덕션 빌드
npm run lint             # ESLint
npm run db:pull:kr       # 한국 리전 DB → Prisma 스키마 동기화
npm run db:generate:kr   # 한국 리전 Prisma 클라이언트 생성
```

## 핵심 디렉터리

```
src/proxy.ts              인증 미들웨어 (NextAuth, ADMIN_EMAILS 체크)
src/actions/              Server Actions (도메인별 폴더, 함수당 1파일)
  dashboard/              리전별 대시보드 통계
  user/                   사용자 조회 (목록, 상세)
  workspace/              워크스페이스 관리 (목록, 상세, 크레딧 조정, 플랜 변경)
  billing/                빌링 (구독, 결제, 크레딧)
  ai-monitor/             AI 모니터링 (파이프라인, 크레딧 분석, 사용량)
  content/                콘텐츠 (문서, ESG, 보고서)
src/app/(admin)/[region]/ 리전별 라우트 (dashboard, users, workspaces, billing, ai-monitor, content)
src/components/           UI 컴포넌트 (layout/, common/, dashboard/, user/, workspace/, billing/, ai-monitor/, content/, ui/)
src/lib/                  싱글턴 인프라 (auth, prisma, regions, env, logger, action, format, constants, utils)
prisma/{regionId}/        리전별 Prisma 스키마 + config
```

## 아키텍처 규칙

1. **Server-First**: `page.tsx`는 Server Component. 인터랙션은 `"use client"` 컴포넌트에서
2. **Thin Page, Fat Component**: 페이지는 auth + 데이터 로딩 + 컴포넌트 렌더만
3. **ActionResult 단방향**: `ok(data)` 또는 `fail(error)` 반환
4. **멀티 리전 Prisma**: `getPrismaClient(regionId)` — 리전별 캐시된 PrismaClient
5. **리전 검증**: 모든 액션/페이지에서 `getRegion(regionId)` 검증 후 진행
6. **스키마 동기화**: Platform이 `db push`, Admin은 `db pull`로 읽기 전용 동기화

## ⚠️ 스키마 변경 워크플로우 (최우선 규칙)

**Admin은 자체 DB가 없다. Platform의 PostgreSQL을 공유한다.**

```
1. Platform 스키마 수정  →  ../esg-platform/prisma/schema.prisma
2. Platform DB 반영      →  cd ../esg-platform && npm run db:push
3. Platform 커밋/push
4. Admin 스키마 동기화   →  npm run db:pull:kr
5. Admin 커밋/push       →  변경된 prisma/kr/schema.prisma 반드시 커밋
```

**절대 금지**: Admin에서 `prisma db push` 실행, `schema.prisma` 수동 편집, Platform 변경 후 `db pull` + 커밋 누락 (CI/CD 깨짐)

## Server Action 템플릿

```typescript
"use server";
import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "모듈명" });
const schema = z.object({ regionId: z.string() });

export async function myAction(input: Record<string, unknown>): Promise<ActionResult<T>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");
  const region = getRegion(parsed.data.regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");
  const prisma = getPrismaClient(parsed.data.regionId);

  try {
    const result = await prisma.someModel.findMany({});
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
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    </div>
  );
}
```

## 코딩 규칙

**Import 순서**: React → Next.js → 서드파티 → `@/components/ui` → `@/components` → `@/lib` → `@/actions` → `import type`

**네이밍**: 파일 kebab-case, 컴포넌트 PascalCase named export, 핸들러 `handle` 접두사, 불리언 `is`/`has` 접두사, 상수 UPPER_SNAKE_CASE, Action 동사+목적어

**TypeScript**: strict 모드, `any` 금지, `import type` 사용, Props는 컴포넌트 파일 내 interface 선언

**디자인 시스템**: shadcn/ui + CVA + `cn()`. Named export만. lucide-react 아이콘만 (`h-4 w-4` 인라인, `h-5 w-5` 카드, 로딩 `Loader2 animate-spin`). 시맨틱 CSS 변수 사용 (하드코딩 금지, 플랜 뱃지 예외: FREE gray, STANDARD blue, PRO indigo, ENTERPRISE purple). 페이지 컨테이너 `mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8`. Mobile-first 반응형.

**에러 표시**: `<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>`

**로깅**: `logger.child({ module })` → `log.info/warn/error/debug`. 에러는 `{ err: error }` 키.

**상태 관리**: 외부 라이브러리 없음. `useState` + `useTransition` + Server Action.

## DB 모델

K-ESG 리전 DB 직접 접근. 스키마: `prisma/{regionId}/schema.prisma`. 핵심: `User ──< WorkspaceMember >── Workspace ──< Document/EsgSummary/CreditLedger/PipelineSession/Subscription/Payment/AiUsageLog`.

주요 enum (re-export from `src/lib/prisma.ts`): `PlanCode`, `CreditType`, `PaymentStatus`, `SubscriptionStatus`. Server Action에서 `z.nativeEnum(PlanCode)` 런타임 검증.

## Platform과의 차이점

| 항목 | Platform | Admin |
|------|----------|-------|
| DB | 자체 PostgreSQL (스키마 owner) | 리전 DB 직접 접근 |
| 인증 | NextAuth + DB adapter | JWT 전용 (adapter 없음) |
| 접근 제어 | 워크스페이스 멤버십 | ADMIN_EMAILS 화이트리스트 |
| Prisma | 단일 클라이언트, `db push` | 리전별 팩토리, `db pull` |
| 라우팅 | `/dashboard/*` | `/[region]/*` |

## 절대 하지 말 것

- `default export` 사용 (page/layout/loading/error.tsx 제외)
- `any` 타입 사용
- lucide-react 외 아이콘 사용
- CSS 변수 대신 하드코딩 색상 (플랜 뱃지 예외)
- `console.log`/`console.error` (Pino logger 사용)
- Admin에서 `prisma db push` 또는 `schema.prisma` 수동 편집
- Platform 스키마 변경 후 `db pull` + 커밋 누락
- hook/이벤트 핸들러 없이 `"use client"` 사용
- 외부 상태 관리 라이브러리 도입

## 문서 수정 원칙

README.md, CLAUDE.md 등 프로젝트 문서를 수정할 때는 변경 이력이나 흔적을 남기지 않는다. 항상 처음부터 이 내용이었던 것처럼 최종본 형태로 작성한다.

## 문서 이전 버전 복구

이 문서는 간결함을 위해 압축되었다 (커밋 `cb97af7`). 이전 상세 버전이 필요하면:

```bash
git revert cb97af7                        # 전체 되돌리기
git checkout cb97af7~1 -- CLAUDE.md       # 이 파일만 복구
```
