# ESGo Admin - K-ESG 멀티 리전 통합 관리 플랫폼

K-ESG 서비스([ESGo](https://github.com/Team-DogFoot/ESGo))의 워크스페이스, 사용자, 건수, 구독, 트라이얼을 리전별로 모니터링하고 관리하는 어드민 플랫폼.

---

## 프로젝트 개요

ESGo Admin은 K-ESG 플랫폼의 운영 관리를 위한 내부 도구다. 자체 DB 없이 K-ESG 리전 DB에 직접 접근하여 데이터를 조회·관리한다. `ADMIN_EMAILS` 화이트리스트로 접근을 제어하며, 리전별 독립 DB 연결을 지원한다.

### 핵심 기능

- **리전별 대시보드**: 워크스페이스 수, 활성 사용자, 건수 사용량, 문서 수, 플랜 분포, ESG 완료율
- **워크스페이스 관리**: 목록 조회, 상세 정보(7탭), 건수 조정(보너스 지급/사용량 초기화/직접 수정/일괄), 구독 플랜 변경, 트라이얼 관리
- **사용자 관리**: 전체 사용자 목록, 상세(소속 워크스페이스, 활동 상태)
- **빌링 관리**: 구독 현황, 결제 내역, 건수 사용 추이 차트
- **AI 서비스 모니터링**: 파이프라인 사용 현황, 에러 목록, 워크스페이스/기능별 사용량 분석, 소비 추이
- **콘텐츠 관리**: 문서 목록, ESG 데이터(카테고리 통계, 항목 랭킹, 워크스페이스 진행도), 보고서 목록
- **멀티 리전**: 리전별 독립 DB 연결, 사이드바 리전 선택기로 전환
- **구조화 로깅**: Pino 기반 JSON 로그 (K8s 호환)

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4, Radix UI, shadcn/ui |
| 인증 | NextAuth v5 (Auth.js), Google OAuth, JWT, ADMIN_EMAILS 가드 |
| ORM | Prisma 7 (PostgreSQL, PrismaPg adapter) |
| 로깅 | Pino (JSON prod / pino-pretty dev) |
| 검증 | Zod 4, TypeScript 5 strict |
| 배포 | Docker, GHCR, K8s (ArgoCD GitOps) |

---

## 프로젝트 구조

```
src/
├── proxy.ts                    # 인증 미들웨어 (NextAuth, ADMIN_EMAILS 체크)
├── actions/                    # Server Actions (도메인별 폴더, 함수당 1파일)
│   ├── dashboard/              #   리전별 대시보드 통계
│   ├── user/                   #   사용자 조회 (목록, 상세)
│   ├── workspace/              #   워크스페이스 관리
│   │   ├── get-workspaces.ts   #     목록 (Zod + PlanCode enum 필터)
│   │   ├── get-workspace-detail.ts
│   │   ├── adjust-quota.ts     #     건수 조정 (보너스/초기화/직접 수정)
│   │   ├── batch-adjust-quota.ts  #  일괄 보너스 지급
│   │   ├── manage-trial.ts     #     트라이얼 관리 (시작/연장/종료)
│   │   ├── change-plan.ts      #     구독 플랜 변경
│   │   └── get-workspace-*.ts  #     문서/ESG/파이프라인/구독 탭 데이터
│   ├── billing/                #   빌링 (구독/결제/크레딧)
│   ├── ai-monitor/             #   AI 모니터링 (파이프라인/크레딧 분석)
│   └── content/                #   콘텐츠 (문서/ESG/보고서)
├── app/
│   ├── (admin)/                # 관리자 레이아웃 (인증 필수)
│   │   ├── page.tsx            #   홈 — 리전 선택
│   │   └── [region]/           #   리전별 라우트
│   │       ├── page.tsx        #     대시보드
│   │       ├── users/          #     사용자 목록 + [id] 상세
│   │       ├── workspaces/     #     워크스페이스 목록 + [id] 상세 (7탭)
│   │       ├── billing/        #     빌링 대시보드 + subscriptions, payments, credits
│   │       ├── ai-monitor/     #     AI 대시보드 + pipelines, credits
│   │       └── content/        #     콘텐츠 대시보드 + documents, esg-data, reports
│   ├── (auth)/login/           # 로그인 페이지
│   └── api/auth/               # NextAuth API 라우트
├── components/
│   ├── layout/                 # admin-sidebar, sidebar-nav, region-selector, user-menu
│   ├── common/                 # status-badge, pagination, filter-bar, auto-refresh
│   ├── dashboard/              # stat-card, plan-distribution
│   ├── user/                   # user-table, user-detail
│   ├── workspace/              # workspace-table, workspace-detail (7탭), quota-adjust-form, batch-quota-dialog, trial-manage-form
│   ├── billing/                # subscription-table, payment-table, credit-ledger-table, credit-consumption-chart
│   ├── ai-monitor/             # pipeline-table, pipeline-error-list, credit-*-chart
│   ├── content/                # document-table, esg-overview-table, report-table, esg-category-stats, esg-item-rankings
│   └── ui/                     # shadcn/ui 공통 컴포넌트
├── lib/
│   ├── env.ts                  # 환경변수 Zod 검증
│   ├── auth.ts                 # NextAuth 인스턴스
│   ├── auth.config.ts          # NextAuth 설정 (Google, JWT, ADMIN_EMAILS 가드)
│   ├── prisma.ts               # 리전별 PrismaClient 팩토리 + PlanCode/PaymentStatus/SubscriptionStatus re-export
│   ├── regions.ts              # 리전 설정 (REGIONS 환경 변수 파싱)
│   ├── logger.ts               # Pino 로거 싱글턴
│   ├── action.ts               # ActionResult<T>, ok(), fail()
│   ├── format.ts               # formatCurrency, formatNumber, formatFileSize, formatDuration, formatTokens, formatCostUsd, formatRelativeTime
│   ├── constants.ts            # PLAN_BADGE, PLAN_LABEL (공유 상수)
│   ├── date-range.ts           # getDateRangeFilter() (공유 날짜 필터)
│   ├── activity.ts             # getActivityStatus() (사용자 활동 상태)
│   └── utils.ts                # cn() (Tailwind 클래스 병합)
├── types/
│   ├── next-auth.d.ts          # NextAuth 세션 타입 확장
│   └── credit.ts               # DailyConsumption (공유 타입)
prisma/
  kr/                           # 한국 리전
    schema.prisma               #   K-ESG DB 스키마 (db pull로 동기화)
    prisma.config.ts            #   Prisma 설정 (DATABASE_URL_KR)
  vn/                           # 베트남 리전
    schema.prisma               #   VN DB 스키마 (db pull로 동기화)
    prisma.config.ts            #   Prisma 설정 (DATABASE_URL_VN)
  mx/                           # 멕시코 리전
    schema.prisma               #   MX DB 스키마 (db pull로 동기화)
    prisma.config.ts            #   Prisma 설정 (DATABASE_URL_MX)
```

---

## 데이터 모델

자체 DB가 없으며, K-ESG 리전 DB에 직접 접근한다. 스키마는 `prisma db pull`로 동기화한다.

```
User ──< WorkspaceMember >── Workspace ──< Document
                                  │    ├──< EsgSummary
                                  │    ├──< PipelineSession
                                  │    ├──< Subscription ──< Plan
                                  │    ├──< Payment
                                  │    └──< AiUsageLog
```

### 주요 모델 (어드민에서 조회·관리)

| 모델 | 설명 |
|------|------|
| `User` | NextAuth 사용자 (Google OAuth) |
| `Workspace` | 기업/조직 단위 테넌트 (analysisUsed, reportUsed, bonusAnalysis, bonusReport, planCode) |
| `WorkspaceMember` | 사용자-워크스페이스 관계 (OWNER/VIEWER) |
| `Document` | 업로드 문서 (UPLOADED → PREPROCESSED → CLASSIFIED → ANALYZING → ANALYZED) |
| `EsgSummary` | 항목별 요약 (NOT_STARTED/IN_PROGRESS/COMPLETED) |
| `PipelineSession` | AI 파이프라인 실행 기록 (currentPhase, state) |
| `Plan` | 플랜 정의 (FREE/STANDARD/PRO/ENTERPRISE) |
| `Subscription` | 워크스페이스 구독 (1:1, ACTIVE/CANCELED/PAST_DUE/EXPIRED, trialEndsAt/trialEndedAt) |
| `Payment` | 결제 내역 (PENDING/PAID/FAILED/REFUNDED/CANCELED) |
| `AiUsageLog` | AI API 사용량 로그 (provider, operation, tokens, cost, success) |

---

## 로컬 개발 환경 설정

### 사전 요구사항

- Node.js 24+
- Docker (PostgreSQL용)

### 1. 통합 개발 환경 (권장)

ESGo 프로젝트는 `esgo/` 상위 폴더에서 Docker Compose로 PostgreSQL + Platform + Admin을 통합 관리한다.

```bash
# esgo/ 상위 폴더에서
docker compose up -d postgres postgres-vn postgres-mx   # 리전별 PostgreSQL 기동 (KR:5433, VN:5434, MX:5435)

# 또는 전체 dev 환경 (Docker 내부에서 실행)
docker compose -f docker-compose.dev.yml up -d --build
```

통합 dev 환경에서는 admin 컨테이너가 시작할 때 자동으로:
1. `prisma db pull` — Platform이 push한 최신 스키마를 가져옴
2. `prisma generate` — Prisma Client 생성
3. `next dev` — 개발 서버 시작 (포트 3001)

### 2. 단독 실행

```bash
cd esgo-admin
npm install
```

#### 환경 변수

`.env.example`을 `.env`로 복사하고 값을 채운다.

```bash
cp .env.example .env
```

| 변수 | 설명 | 예시 |
|------|------|------|
| `AUTH_SECRET` | NextAuth 암호화 키 | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | 프록시 환경 신뢰 | `true` |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID | |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret | |
| `ADMIN_EMAILS` | 허용 관리자 이메일 (콤마 구분) | `admin@example.com` |
| `REGIONS` | 리전 설정 JSON 배열 | `[{"id":"kr",...},{"id":"vn",...},{"id":"mx",...}]` |
| `DATABASE_URL_KR` | 한국 리전 DB URL | `postgresql://esgo:esgo_local@localhost:5433/esgo` |
| `DATABASE_URL_VN` | 베트남 리전 DB URL | `postgresql://esgo:esgo_local@localhost:5434/esgo_vn` |
| `DATABASE_URL_MX` | 멕시코 리전 DB URL | `postgresql://esgo:esgo_local@localhost:5435/esgo_mx` |
| `LOG_LEVEL` | 로그 레벨 | `info` |

#### Prisma 클라이언트 생성

```bash
npm run db:pull:all       # 모든 리전 DB에서 스키마 동기화
npm run db:generate:all   # 모든 리전 Prisma Client 생성
```

#### 개발 서버

```bash
npm run dev               # http://localhost:3000
```

`ADMIN_EMAILS`에 등록된 Google 계정으로 로그인한다.

### 유용한 스크립트

```bash
npm run dev              # Next.js 개발 서버
npm run build            # 프로덕션 빌드
npm run start            # 프로덕션 서버
npm run lint             # ESLint
npm run db:pull:kr       # 한국 리전 DB에서 Prisma 스키마 동기화
npm run db:pull:vn       # 베트남 리전 DB에서 Prisma 스키마 동기화
npm run db:pull:mx       # 멕시코 리전 DB에서 Prisma 스키마 동기화
npm run db:pull:all      # 모든 리전 스키마 동기화
npm run db:generate:kr   # 한국 리전 Prisma 클라이언트 생성
npm run db:generate:vn   # 베트남 리전 Prisma 클라이언트 생성
npm run db:generate:mx   # 멕시코 리전 Prisma 클라이언트 생성
npm run db:generate:all  # 모든 리전 Prisma 클라이언트 생성
```

---

## 리전 추가하기

새 리전(예: `jp`)을 추가하려면:

1. **환경 변수 추가**

```bash
REGIONS='[{"id":"kr",...},{"id":"jp","name":"일본","domain":"k-esg-jp.esgohq.com","flag":"🇯🇵"}]'
DATABASE_URL_JP="postgresql://..."
```

2. **Prisma 스키마 디렉터리 생성**

```bash
mkdir prisma/jp
```

`prisma/jp/prisma.config.ts` 작성 (`DATABASE_URL_JP` 참조).
`prisma/jp/schema.prisma` 작성 (output을 `client-jp`으로 설정).

3. **package.json 스크립트 추가**

```json
{
  "db:pull:jp": "prisma db pull --config=prisma/jp/prisma.config.ts",
  "db:generate:jp": "prisma generate --config=prisma/jp/prisma.config.ts"
}
```

4. **스키마 동기화 + 클라이언트 생성**

```bash
npm run db:pull:jp
npm run db:generate:jp
```

5. **prisma.ts ClientMap에 리전 추가**

`src/lib/prisma.ts`에서 새 리전 PrismaClient import 및 `ClientMap`에 엔트리 추가.

---

## 배포

### Docker

```bash
docker build -t esgo-admin .
docker run -p 3000:3000 --env-file .env esgo-admin
```

### CI/CD

- GitHub Actions → lint/tsc → Docker 빌드 → GHCR push → K8s 매니페스트 갱신 → ArgoCD 자동 배포
- 이미지 레지스트리: `ghcr.io/team-dogfoot/esgo-admin`
- 프로덕션 URL: `https://admin.esgohq.com`

---

## 아키텍처 특징

- **자체 DB 없음**: K-ESG 리전 DB에 읽기/쓰기 직접 접근. 어드민 전용 테이블 없음
- **JWT 전용 인증**: DB adapter 미사용. Google OAuth + `ADMIN_EMAILS` 화이트리스트
- **멀티 리전 Prisma**: ClientMap 패턴으로 KR/VN/MX 리전별 PrismaClient를 캐시에서 조회. 리전별 독립 DB 연결
- **Prisma enum re-export**: `PlanCode`, `PaymentStatus`, `SubscriptionStatus`를 `src/lib/prisma.ts`에서 re-export. Zod `nativeEnum`으로 런타임 검증
- **스키마 동기화**: Platform이 `prisma db push`로 스키마 관리, Admin은 `prisma db pull`로 읽기 전용 동기화
- **Server-First**: 페이지는 Server Component, 인터랙션은 Client Component에 격리
- **공유 유틸리티**: `constants.ts` (플랜 뱃지/라벨), `date-range.ts` (날짜 필터), `activity.ts` (활동 상태), `types/credit.ts` (DailyConsumption)

### K-ESG Platform과의 관계

| 항목 | K-ESG Platform | ESGo Admin |
|------|----------------|------------|
| DB | 자체 PostgreSQL (스키마 owner) | K-ESG 리전 DB 직접 접근 |
| 인증 | NextAuth + DB adapter | JWT 전용 (DB adapter 없음) |
| 접근 제어 | 워크스페이스 멤버십 | `ADMIN_EMAILS` 화이트리스트 |
| Prisma | 단일 클라이언트, `db push` | 리전별 PrismaClient 팩토리, `db pull` |
| 라우팅 | `/dashboard/*` | `/[region]/*` |
| 포트 (개발) | 3000 | 3001 |
