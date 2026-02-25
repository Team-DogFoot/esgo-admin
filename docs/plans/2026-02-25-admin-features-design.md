# ESGo Admin 기능 확장 설계서

## 목표

ESGo Admin에 production급 운영 기능 4개 영역을 추가한다. 1-3명 창업팀이 런칭 전후에 실제로 서비스를 운영할 수 있는 수준의 정보와 기능을 제공한다.

## 대상 영역

1. **빌링/구독 관리** — 매출, 구독, 결제, 크레딧 전체 현황
2. **AI 파이프라인 모니터링** — 파이프라인 실행 현황, 에러 추적, 크레딧 소비 분석
3. **사용자/워크스페이스 심화 관리** — 기존 기능 강화 + 사용자 상세 + 워크스페이스 탭 확장
4. **콘텐츠/데이터 관리** — 문서, ESG 데이터, 리포트 전체 현황

## 접근방식

Feature-Complete Monolith: 기존 esgo-admin Next.js App Router 구조를 그대로 확장한다. 별도 서비스나 SPA 분리 없이 하나의 앱에서 모든 기능을 제공한다.

## 기술 스택

- Next.js 16 App Router, React 19, TypeScript strict
- Tailwind 4, shadcn/ui, lucide-react
- Prisma 7 (읽기 전용, K-ESG Platform DB 공유)
- Recharts (차트 라이브러리 — 신규 도입)
- Pino (로깅), Zod 4 (검증)

## 사전 요구사항

### Platform PlanCode enum 동기화

Platform에서 PlanCode enum이 `FREE | STANDARD | PRO | ENTERPRISE`로 변경되었으나, Admin의 `prisma/kr/schema.prisma`는 아직 `FREE | PRO`이다. 기능 구현 전에 반드시 `npm run db:pull:kr`로 동기화해야 한다.

동기화 후 Admin 스키마의 PlanCode는 다음과 같아야 한다:

```prisma
enum PlanCode {
  FREE
  STANDARD
  PRO
  ENTERPRISE
}
```

기존 Admin 코드에서 `"PRO"` 리터럴을 사용하는 곳(changePlan 등)도 `"STANDARD"`로 업데이트해야 한다.

---

## 1. 빌링/구독 관리

### 1.1 라우트 구조

```
/{region}/billing
  ├── page.tsx                  — 빌링 대시보드
  ├── subscriptions/
  │   └── page.tsx              — 구독 목록
  ├── payments/
  │   └── page.tsx              — 결제 내역
  └── credits/
      └── page.tsx              — 크레딧 원장
```

### 1.2 사이드바 네비게이션 추가

기존 네비게이션(대시보드, 워크스페이스, 사용자, AI 모니터)에 "빌링"과 "콘텐츠" 메뉴를 추가한다.

```
대시보드
워크스페이스
사용자
빌링           ← 신규 (하위: 대시보드, 구독, 결제, 크레딧)
AI 모니터
콘텐츠          ← 신규 (하위: 대시보드, 문서, ESG 데이터, 리포트)
```

하위 메뉴는 사이드바에서 펼침/접힘(collapsible) 방식으로 표시한다. shadcn/ui의 Collapsible 컴포넌트 사용.

### 1.3 빌링 대시보드 (`/{region}/billing`)

**핵심 지표 카드 (4열 그리드, StatCard 재사용):**

| 지표 | 데이터 소스 | 계산 방법 |
|------|------------|----------|
| MRR (월간 반복 매출) | Subscription + Plan | status=ACTIVE인 구독의 Plan.monthlyPrice 합계 |
| 활성 구독 수 / 전환율 | Subscription, Workspace | ACTIVE 구독 수, ACTIVE/총 워크스페이스 비율 |
| 이번 달 크레딧 소비 | CreditLedger | type=CONSUME, 현재 달의 amount 합계 (절대값) |
| 미결제 건수 | Payment | status=PENDING 또는 FAILED 건수 |

**플랜별 구독 분포:**
- 기존 `PlanDistribution` 컴포넌트 확장
- FREE / STANDARD 비율 막대 차트

**최근 7일 크레딧 소비 추이:**
- Recharts BarChart
- X축: 날짜 (7일), Y축: 소비 크레딧 (CONSUME 타입 amount 절대값 합계)

**최근 결제 10건:**

| 컬럼 | 소스 |
|------|------|
| 워크스페이스명 | Payment → Workspace.name |
| 금액 | Payment.amount (원 단위, 포맷팅) |
| 유형 | Payment.type (SUBSCRIPTION / CREDIT_PURCHASE 배지) |
| 상태 | Payment.status (PAID=green, FAILED=red, PENDING=yellow 배지) |
| 결제일 | Payment.paidAt 또는 createdAt |

### 1.4 구독 목록 (`/{region}/billing/subscriptions`)

**테이블 컬럼:**

| 컬럼 | 소스 | 비고 |
|------|------|------|
| 워크스페이스명 | Subscription → Workspace.name | 워크스페이스 상세 링크 |
| 플랜 | Subscription → Plan.code | 배지 (FREE=gray, STANDARD=blue) |
| 상태 | Subscription.status | 배지 (ACTIVE=green, CANCELED=yellow, PAST_DUE=red, EXPIRED=gray) |
| 월 결제액 | Plan.monthlyPrice | 0원이면 "무료" 표시 |
| 구독 시작일 | Subscription.currentPeriodStart | |
| 현재 기간 종료 | Subscription.currentPeriodEnd | 만료 7일 이내면 빨간 텍스트 |
| 취소일 | Subscription.canceledAt | null이면 "-" |

**필터:**
- 플랜: ALL / FREE / STANDARD (Select)
- 상태: ALL / ACTIVE / CANCELED / PAST_DUE / EXPIRED (Select)
- 검색: 워크스페이스명 (Input, debounce 300ms)

**정렬:** 기본 구독 시작일 내림차순. 컬럼 헤더 클릭으로 정렬 변경 가능.

**페이지네이션:** 한 페이지 20건, 이전/다음 버튼.

### 1.5 결제 내역 (`/{region}/billing/payments`)

**테이블 컬럼:**

| 컬럼 | 소스 | 비고 |
|------|------|------|
| 워크스페이스명 | Payment → Workspace.name | 링크 |
| 금액 | Payment.amount | 원 단위, `toLocaleString()` |
| 유형 | Payment.type | SUBSCRIPTION / CREDIT_PURCHASE 배지 |
| 상태 | Payment.status | 5가지 상태 배지 |
| 크레딧 | Payment.credits | null이면 "-" |
| PortOne ID | Payment.portonePaymentId | 클릭 시 영수증 URL (receiptUrl) |
| 실패 사유 | Payment.failReason | null이면 "-", 있으면 빨간 텍스트 |
| 결제일 | Payment.paidAt 또는 createdAt | |

**필터:**
- 상태: ALL / PAID / FAILED / PENDING / REFUNDED / CANCELED
- 기간: 이번 달 / 지난 달 / 최근 3개월 / 전체 (Select)
- 검색: 워크스페이스명

**페이지네이션:** 20건/페이지.

### 1.6 크레딧 원장 (`/{region}/billing/credits`)

**테이블 컬럼:**

| 컬럼 | 소스 | 비고 |
|------|------|------|
| 워크스페이스명 | CreditLedger → Workspace.name | 링크 |
| 변동량 | CreditLedger.amount | +는 green, -는 red |
| 변동 후 잔액 | CreditLedger.balance | |
| 유형 | CreditLedger.type | 6가지 (INITIAL/MONTHLY/PURCHASE/CONSUME/REFUND/ADMIN) 컬러 배지 |
| 사유 | CreditLedger.reason | |
| 참조 ID | CreditLedger.referenceId | null이면 "-" |
| 일시 | CreditLedger.createdAt | |

**필터:**
- 유형: ALL / INITIAL / MONTHLY / PURCHASE / CONSUME / REFUND / ADMIN
- 기간: 이번 달 / 지난 달 / 최근 3개월 / 전체
- 검색: 워크스페이스명

**페이지네이션:** 20건/페이지.

### 1.7 서버 액션

```
src/actions/billing/
  ├── get-billing-stats.ts        — getBillingStats(regionId)
  ├── get-credit-consumption.ts   — getCreditConsumption(regionId, days: 7)
  ├── get-subscriptions.ts        — getSubscriptions(regionId, filters)
  ├── get-payments.ts             — getPayments(regionId, filters)
  └── get-credit-ledger.ts        — getCreditLedger(regionId, filters)
```

**공통 필터 타입:**

```typescript
interface PaginationInput {
  page: number;      // 1-based
  perPage: number;   // default 20
}

interface DateRangeInput {
  from?: Date;
  to?: Date;
}
```

---

## 2. AI 파이프라인 모니터링

### 2.1 라우트 구조

기존 `/{region}/ai-monitor` 스텁 페이지를 실제 구현으로 교체하고 하위 라우트를 추가한다.

```
/{region}/ai-monitor
  ├── page.tsx                  — AI 대시보드 (기존 스텁 교체)
  ├── pipelines/
  │   └── page.tsx              — 파이프라인 세션 목록
  └── credits/
      └── page.tsx              — AI 크레딧 소비 분석
```

### 2.2 AI 대시보드 (`/{region}/ai-monitor`)

**핵심 지표 카드 (4열 그리드):**

| 지표 | 데이터 소스 | 계산 방법 |
|------|------------|----------|
| 총 파이프라인 실행 (오늘) | PipelineSession | startedAt이 오늘인 세션 수 |
| 성공률 | PipelineSession | completedAt IS NOT NULL / 전체 비율 (%) |
| 에러 세션 수 | PipelineSession | errorCount > 0인 세션 수 (최근 7일) |
| 평균 처리 시간 | PipelineSession | completedAt IS NOT NULL인 세션의 durationMs 평균 → "X.Xs" 포맷 |

**파이프라인 단계별 현황:**
- 현재 진행 중인 세션 (completedAt IS NULL)의 currentPhase 분포
- PREPROCESSED / CLASSIFIED / EXTRACTED 각 단계별 세션 수
- Recharts PieChart 또는 가로 막대

**최근 에러 Top 10:**

| 컬럼 | 소스 |
|------|------|
| 워크스페이스명 | PipelineSession → Workspace.name |
| 문서명 | PipelineSession → Document.fileName |
| 현재 단계 | PipelineSession.currentPhase (배지) |
| 에러 수 | PipelineSession.errorCount |
| 마지막 에러 | PipelineSession.lastError (truncate 100자) |
| 시작 시간 | PipelineSession.startedAt |

**크레딧 소비 추이 (최근 7일):**
- Recharts BarChart
- CreditLedger type=CONSUME의 일별 합계

### 2.3 파이프라인 세션 목록 (`/{region}/ai-monitor/pipelines`)

**테이블 컬럼:**

| 컬럼 | 소스 | 비고 |
|------|------|------|
| 세션 ID | PipelineSession.sessionId | 짧게 표시 (앞 8자 + ...) |
| 워크스페이스명 | → Workspace.name | 링크 |
| 문서명 | → Document.fileName | |
| 현재 단계 | currentPhase | PREPROCESSED=blue, CLASSIFIED=yellow, EXTRACTED=green 배지 |
| Auto 모드 | autoMode | 체크/X 아이콘 |
| 에러 수 | errorCount | 0이면 "-", >0이면 빨간 배지 |
| 처리 시간 | durationMs | ms → "X.Xs" 포맷, null이면 "진행중" |
| 시작 시간 | startedAt | 상대 시간 (5분 전) + 절대 시간 tooltip |
| 완료 시간 | completedAt | null이면 "-" |

**필터:**
- 단계: ALL / PREPROCESSED / CLASSIFIED / EXTRACTED
- 상태: ALL / 진행중(completedAt IS NULL) / 완료(completedAt IS NOT NULL) / 에러(errorCount > 0)
- 검색: 워크스페이스명, 문서명

**정렬:** 기본 시작시간 내림차순.

**페이지네이션:** 20건/페이지.

### 2.4 AI 크레딧 소비 분석 (`/{region}/ai-monitor/credits`)

**워크스페이스별 소비 랭킹:**
- CreditLedger type=CONSUME을 워크스페이스별 그룹핑
- 상위 10개 워크스페이스 + 나머지 합계
- Recharts BarChart (가로 막대, 워크스페이스명 Y축)

**기간별 소비 추이:**
- 최근 30일 일별 CONSUME 합계
- Recharts AreaChart

**기능별 소비 비율:**
- CreditLedger.reason 필드 파싱으로 전처리/분류/추출/리포트 구분
- reason에 포함된 키워드로 분류: "전처리"/"preprocess", "분류"/"classif", "추출"/"extract", "리포트"/"report"
- Recharts PieChart

### 2.5 데이터 갱신

AI 대시보드는 polling 방식으로 30초마다 데이터를 갱신한다. 클라이언트 컴포넌트에서 `useEffect` + `setInterval` + 서버 액션 호출.

### 2.6 서버 액션

```
src/actions/ai-monitor/
  ├── get-ai-stats.ts             — getAiStats(regionId)
  ├── get-ai-credit-consumption.ts — getAiCreditConsumption(regionId, days)
  ├── get-pipelines.ts            — getPipelines(regionId, filters)
  ├── get-pipeline-errors.ts      — getPipelineErrors(regionId, limit: 10)
  ├── get-credit-by-workspace.ts  — getCreditByWorkspace(regionId, limit: 10)
  └── get-credit-by-feature.ts    — getCreditByFeature(regionId)
```

---

## 3. 사용자/워크스페이스 심화 관리

### 3.1 라우트 구조

기존 라우트를 확장하고 사용자 상세 페이지를 신규 추가한다.

```
/{region}/users
  ├── page.tsx              — 사용자 목록 (강화)
  └── [id]/
      └── page.tsx          — 사용자 상세 ⭐ 신규

/{region}/workspaces
  ├── page.tsx              — 워크스페이스 목록 (강화)
  └── [id]/
      └── page.tsx          — 워크스페이스 상세 (탭 확장)
```

### 3.2 사용자 목록 강화 (`/{region}/users`)

**기존 컬럼에 추가:**

| 추가 컬럼 | 소스 | 비고 |
|-----------|------|------|
| 가입일 | User.createdAt | |
| 활동 상태 | User.updatedAt 기반 | 7일 이내=green "활성", 30일 이내=yellow "비활성", 그 이상=gray "휴면" |
| 워크스페이스 수 | WorkspaceMember count | |

**추가 기능:**
- 정렬: 가입일 / 최근활동일 / 이름 (컬럼 헤더 클릭)
- 활동 상태 필터: ALL / 활성 / 비활성 / 휴면

**이름 클릭 시 사용자 상세 페이지로 이동** (기존에는 클릭 불가).

### 3.3 사용자 상세 페이지 ⭐ 신규 (`/{region}/users/[id]`)

**프로필 카드 (Card 컴포넌트):**
- Avatar (User.image) + 이름 (User.name) + 이메일 (User.email)
- 가입일 (User.createdAt)
- 이메일 인증 여부 (User.emailVerified — verified=green 배지, unverified=gray 배지)
- 활성 워크스페이스 (User.activeWorkspaceId → Workspace.name, 링크)
- 활동 상태 배지 (위 기준 동일)

**소속 워크스페이스 테이블:**

| 컬럼 | 소스 | 비고 |
|------|------|------|
| 워크스페이스명 | WorkspaceMember → Workspace.name | 워크스페이스 상세 링크 |
| 역할 | WorkspaceMember.role | OWNER=blue, VIEWER=gray 배지 |
| 플랜 | Workspace.planCode | 배지 |
| 크레딧 잔액 | Workspace.creditBalance | |
| 가입일 | WorkspaceMember.joinedAt | |

**활동 요약 카드 (3열 그리드, StatCard):**
- 업로드한 문서 수: Document where uploaderId = userId
- 소유 워크스페이스 수: WorkspaceMember where role = OWNER
- 생성한 리포트 수: Report where createdById = userId

### 3.4 워크스페이스 목록 강화 (`/{region}/workspaces`)

**기존 컬럼에 추가:**

| 추가 컬럼 | 소스 | 비고 |
|-----------|------|------|
| 구독 상태 | Subscription.status | 배지, 구독 없으면 "-" |
| 마지막 활동 | Document 최신 createdAt 또는 EsgSummary 최신 updatedAt | 상대 시간 |

**일괄 크레딧 지급:**
- 체크박스로 워크스페이스 다중 선택
- 상단에 "크레딧 일괄 지급" 버튼 (선택 시에만 활성화)
- Dialog로 금액 + 사유 입력
- `batchAdjustCredits` 서버 액션 호출

### 3.5 워크스페이스 상세 탭 확장 (`/{region}/workspaces/[id]`)

기존 워크스페이스 상세 페이지를 **탭 구조**로 리팩터링한다.

**탭 구성:**

| 탭 | 내용 | 기존/신규 |
|----|------|----------|
| 개요 | 기본 정보 + 크레딧 조정 + 플랜 변경 | 기존 (리팩터링) |
| 멤버 | 멤버 목록 + 역할 | 기존 (리팩터링) |
| 크레딧 | 크레딧 히스토리 | 기존 (리팩터링) |
| 문서 | 업로드된 문서 목록 | ⭐ 신규 |
| ESG | ESG 항목별 진행 현황 | ⭐ 신규 |
| 파이프라인 | 파이프라인 세션 목록 | ⭐ 신규 |
| 구독 | 구독 상세 + 결제 내역 | ⭐ 신규 |

탭 UI는 shadcn/ui의 `Tabs` 컴포넌트 사용. URL 파라미터(`?tab=documents`)로 탭 상태 관리하여 직접 링크 가능.

**문서 탭:**

| 컬럼 | 소스 |
|------|------|
| 파일명 | Document.fileName (displayName 우선) |
| 업로더 | Document → User.name |
| 상태 | Document.status (DocumentStatus 배지) |
| 크기 | Document.size (포맷: KB/MB) |
| 연결된 ESG 항목 수 | DocumentItemLink count |
| 파이프라인 | PipelineSession 유무 + currentPhase |
| 업로드일 | Document.createdAt |

**ESG 탭:**

진행 현황 요약 (상단):
- 전체 완료율 프로그레스 바 (EsgSummary의 COMPLETED / 전체)
- E / S / G 카테고리별 완료율 (esgItemCode 접두사로 구분: E=환경, S=사회, G=지배구조)

항목별 테이블:

| 컬럼 | 소스 |
|------|------|
| 항목 코드 | EsgSummary.esgItemCode |
| 상태 | EsgSummary.status (NOT_STARTED=gray, IN_PROGRESS=yellow, COMPLETED=green 배지) |
| 데이터 소스 | EsgSummary.source (AI=blue, MANUAL=gray 배지, null="-") |
| 완료율 | EsgSummary.completionRate (%) |
| 채워진 필드 | EsgSummary.filledFields / totalFields |
| 마지막 업데이트 | EsgSummary.updatedAt |

**파이프라인 탭:**
- 해당 워크스페이스의 PipelineSession 목록
- 동일 컬럼 구성 (2.3 참조)
- 에러 세션 행 하이라이트 (bg-red-50)

**구독 탭:**

구독 정보 카드:
- 플랜명, 상태, 기간, 월 결제액, 취소일

결제 내역 테이블 (해당 워크스페이스만):
- Payment 목록 (1.5 결제 내역과 동일 컬럼)

### 3.6 서버 액션

```
src/actions/user/
  ├── get-users.ts              — 기존 수정 (추가 컬럼 포함)
  ├── get-user-detail.ts        — getUserDetail(regionId, userId) ⭐ 신규
  └── get-user-activity.ts      — getUserActivity(regionId, userId) ⭐ 신규

src/actions/workspace/
  ├── get-workspaces.ts         — 기존 수정 (구독 상태 포함)
  ├── get-workspace-detail.ts   — 기존 수정 (탭 데이터 포함)
  ├── get-workspace-documents.ts — ⭐ 신규
  ├── get-workspace-esg.ts      — ⭐ 신규
  ├── get-workspace-pipelines.ts — ⭐ 신규
  ├── get-workspace-subscription.ts — ⭐ 신규
  └── batch-adjust-credits.ts   — ⭐ 신규
```

---

## 4. 콘텐츠/데이터 관리

### 4.1 라우트 구조

```
/{region}/content
  ├── page.tsx              — 콘텐츠 대시보드
  ├── documents/
  │   └── page.tsx          — 전체 문서 목록
  ├── esg-data/
  │   └── page.tsx          — ESG 데이터 현황
  └── reports/
      └── page.tsx          — 리포트 목록
```

### 4.2 콘텐츠 대시보드 (`/{region}/content`)

**핵심 지표 카드 (4열 그리드):**

| 지표 | 소스 | 계산 |
|------|------|------|
| 총 문서 수 | Document count | |
| 이번 주 업로드 | Document | createdAt >= 이번 주 월요일 |
| ESG 항목 완료율 | EsgSummary | status=COMPLETED / 전체 (%) |
| 생성된 리포트 수 | Report count | |

**데이터 품질 요약:**

ESG 완료율 분포 (Recharts BarChart):
- X축: 완료율 구간 (0-25%, 25-50%, 50-75%, 75-100%)
- Y축: 해당 구간 워크스페이스 수
- 각 워크스페이스의 EsgSummary COMPLETED 비율을 구간으로 분류

데이터 소스 분포 (Recharts PieChart):
- AI vs MANUAL (EsgSummary.source 기반)
- null은 "미설정"으로 분류

### 4.3 전체 문서 목록 (`/{region}/content/documents`)

**테이블 컬럼:**

| 컬럼 | 소스 | 비고 |
|------|------|------|
| 문서명 | Document.fileName (displayName 우선) | |
| 워크스페이스명 | → Workspace.name | 워크스페이스 링크 |
| 업로더 | → User.name | |
| 상태 | Document.status | DocumentStatus 배지 |
| 크기 | Document.size | BigInt → KB/MB 포맷 |
| 연결된 ESG 항목 | DocumentItemLink count | |
| 파이프라인 단계 | PipelineSession.currentPhase | 배지, 없으면 "-" |
| 업로드일 | Document.createdAt | |

**필터:**
- 문서 상태: ALL / UPLOADED / PREPROCESSED / CLASSIFIED / ANALYZING / ANALYZED
- 파이프라인 유무: ALL / 있음 / 없음
- 기간: 이번 달 / 지난 달 / 최근 3개월 / 전체
- 검색: 파일명, 워크스페이스명

**페이지네이션:** 20건/페이지.

### 4.4 ESG 데이터 현황 (`/{region}/content/esg-data`)

**워크스페이스별 ESG 진행 현황 테이블:**

| 컬럼 | 소스 | 비고 |
|------|------|------|
| 워크스페이스명 | Workspace.name | 워크스페이스 링크 |
| 플랜 | Workspace.planCode | 배지 |
| 총 항목 수 | EsgSummary count | |
| 완료 | EsgSummary status=COMPLETED count | green |
| 진행중 | EsgSummary status=IN_PROGRESS count | yellow |
| 미시작 | EsgSummary status=NOT_STARTED count | gray |
| 완료율 | COMPLETED / 전체 | 프로그레스 바 |
| AI 추출 비율 | source=AI / (source IS NOT NULL) | |
| 마지막 업데이트 | MAX(EsgSummary.updatedAt) | |

**필터:**
- 완료율: ALL / 0-25% / 25-50% / 50-75% / 75-100%
- 플랜: ALL / FREE / STANDARD
- 검색: 워크스페이스명

**집계 통계 카드 (페이지 상단):**

| 통계 | 계산 |
|------|------|
| E(환경) 평균 완료율 | esgItemCode가 "E"로 시작하는 항목의 평균 완료율 |
| S(사회) 평균 완료율 | esgItemCode가 "S"로 시작하는 항목의 평균 완료율 |
| G(지배구조) 평균 완료율 | esgItemCode가 "G"로 시작하는 항목의 평균 완료율 |

**완료 항목 Top 5 / 미완료 항목 Top 5:**
- 전체 워크스페이스에서 가장 많이 COMPLETED된 esgItemCode Top 5
- 전체 워크스페이스에서 가장 많이 NOT_STARTED인 esgItemCode Top 5

### 4.5 리포트 목록 (`/{region}/content/reports`)

**테이블 컬럼:**

| 컬럼 | 소스 | 비고 |
|------|------|------|
| 리포트 제목 | Report.title | |
| 워크스페이스명 | → Workspace.name | 링크 |
| 생성자 | → User.name | |
| 생성일 | Report.generatedAt | |

**필터:**
- 기간: 이번 달 / 지난 달 / 최근 3개월 / 전체
- 검색: 제목, 워크스페이스명

**페이지네이션:** 20건/페이지.

### 4.6 읽기 전용 원칙

콘텐츠/데이터 관리 영역은 **전부 읽기 전용**이다. 문서 삭제, ESG 데이터 수정, 리포트 삭제 등은 플랫폼 사용자의 권한이다. 어드민은 전체 현황 파악과 모니터링만 담당한다.

### 4.7 서버 액션

```
src/actions/content/
  ├── get-content-stats.ts      — getContentStats(regionId)
  ├── get-documents.ts          — getDocuments(regionId, filters)
  ├── get-esg-overview.ts       — getEsgOverview(regionId, filters)
  ├── get-esg-category-stats.ts — getEsgCategoryStats(regionId)
  ├── get-esg-item-rankings.ts  — getEsgItemRankings(regionId)
  └── get-reports.ts            — getReports(regionId, filters)
```

---

## 5. 공통 인프라

### 5.1 차트 라이브러리: Recharts

- `npm install recharts` 추가
- SSR 호환을 위해 차트 컴포넌트는 `"use client"` 래퍼로 감싼다
- 공통 차트 래퍼 컴포넌트 생성하지 않음 (각 페이지에서 직접 사용, YAGNI)

### 5.2 공통 유틸리티

**포맷팅 함수** (`src/lib/format.ts`):

```typescript
export function formatCurrency(amount: number): string
// 99000 → "99,000원"

export function formatNumber(n: number): string
// 1234567 → "1,234,567"

export function formatFileSize(bytes: bigint): string
// 1048576n → "1.0 MB"

export function formatDuration(ms: number): string
// 1234 → "1.2s"

export function formatRelativeTime(date: Date): string
// Date → "5분 전", "2시간 전", "3일 전"
```

### 5.3 공통 컴포넌트

**StatusBadge** (`src/components/common/status-badge.tsx`):
- variant에 따라 색상이 결정되는 범용 배지 컴포넌트
- shadcn/ui Badge 기반

**DataTable** (`src/components/common/data-table.tsx`):
- shadcn/ui Table 기반의 재사용 가능한 데이터 테이블
- 정렬, 페이지네이션, 빈 상태 내장
- 서버 사이드 정렬/페이지네이션 (클라이언트 아님)

**FilterBar** (`src/components/common/filter-bar.tsx`):
- Select + Input 조합의 필터 UI
- 각 페이지에서 필터 옵션을 props로 전달

**ChartCard** (`src/components/common/chart-card.tsx`):
- Card + "use client" Recharts 래퍼
- title, description, children(차트) 구성

### 5.4 페이지네이션

서버 사이드 페이지네이션. URL 파라미터(`?page=2`)로 상태 관리.

각 서버 액션은 다음 형태로 반환:

```typescript
interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
```

### 5.5 정렬

URL 파라미터(`?sort=createdAt&order=desc`)로 관리. 서버 액션에서 Prisma `orderBy`로 처리.

### 5.6 검색

Input에 300ms debounce 적용. URL 파라미터(`?search=keyword`)로 관리. 서버 액션에서 Prisma `contains` (case-insensitive)로 처리.

---

## 6. 사이드바 네비게이션 최종 구조

```
대시보드                    /{region}
워크스페이스                /{region}/workspaces
사용자                      /{region}/users
빌링 ▼
  ├── 대시보드              /{region}/billing
  ├── 구독                  /{region}/billing/subscriptions
  ├── 결제                  /{region}/billing/payments
  └── 크레딧                /{region}/billing/credits
AI 모니터 ▼
  ├── 대시보드              /{region}/ai-monitor
  ├── 파이프라인            /{region}/ai-monitor/pipelines
  └── 크레딧 분석           /{region}/ai-monitor/credits
콘텐츠 ▼
  ├── 대시보드              /{region}/content
  ├── 문서                  /{region}/content/documents
  ├── ESG 데이터            /{region}/content/esg-data
  └── 리포트                /{region}/content/reports
```

각 카테고리(빌링, AI 모니터, 콘텐츠)는 Collapsible로 펼침/접힘 가능. 현재 활성 카테고리는 자동으로 펼쳐진다.

---

## 7. 파일/컴포넌트 신규 생성 목록

### 서버 액션 (16개)

```
src/actions/billing/get-billing-stats.ts
src/actions/billing/get-credit-consumption.ts
src/actions/billing/get-subscriptions.ts
src/actions/billing/get-payments.ts
src/actions/billing/get-credit-ledger.ts
src/actions/ai-monitor/get-ai-stats.ts
src/actions/ai-monitor/get-ai-credit-consumption.ts
src/actions/ai-monitor/get-pipelines.ts
src/actions/ai-monitor/get-pipeline-errors.ts
src/actions/ai-monitor/get-credit-by-workspace.ts
src/actions/ai-monitor/get-credit-by-feature.ts
src/actions/content/get-content-stats.ts
src/actions/content/get-documents.ts
src/actions/content/get-esg-overview.ts
src/actions/content/get-esg-category-stats.ts
src/actions/content/get-esg-item-rankings.ts
src/actions/content/get-reports.ts
```

### 페이지 (12개 신규 + 1개 교체)

```
src/app/(admin)/[region]/billing/page.tsx
src/app/(admin)/[region]/billing/subscriptions/page.tsx
src/app/(admin)/[region]/billing/payments/page.tsx
src/app/(admin)/[region]/billing/credits/page.tsx
src/app/(admin)/[region]/billing/loading.tsx
src/app/(admin)/[region]/ai-monitor/page.tsx                    ← 교체
src/app/(admin)/[region]/ai-monitor/pipelines/page.tsx
src/app/(admin)/[region]/ai-monitor/credits/page.tsx
src/app/(admin)/[region]/ai-monitor/loading.tsx
src/app/(admin)/[region]/users/[id]/page.tsx
src/app/(admin)/[region]/users/[id]/loading.tsx
src/app/(admin)/[region]/content/page.tsx
src/app/(admin)/[region]/content/documents/page.tsx
src/app/(admin)/[region]/content/esg-data/page.tsx
src/app/(admin)/[region]/content/reports/page.tsx
src/app/(admin)/[region]/content/loading.tsx
```

### 컴포넌트 (약 25개)

```
src/components/common/status-badge.tsx
src/components/common/data-table.tsx
src/components/common/filter-bar.tsx
src/components/common/chart-card.tsx
src/components/common/pagination.tsx

src/components/billing/billing-stats.tsx
src/components/billing/credit-consumption-chart.tsx
src/components/billing/subscription-table.tsx
src/components/billing/payment-table.tsx
src/components/billing/credit-ledger-table.tsx
src/components/billing/recent-payments.tsx

src/components/ai-monitor/ai-stats.tsx
src/components/ai-monitor/pipeline-phase-chart.tsx
src/components/ai-monitor/pipeline-error-list.tsx
src/components/ai-monitor/pipeline-table.tsx
src/components/ai-monitor/credit-by-workspace-chart.tsx
src/components/ai-monitor/credit-by-feature-chart.tsx
src/components/ai-monitor/credit-trend-chart.tsx

src/components/user/user-detail.tsx
src/components/user/user-activity-stats.tsx

src/components/workspace/workspace-documents-tab.tsx
src/components/workspace/workspace-esg-tab.tsx
src/components/workspace/workspace-pipelines-tab.tsx
src/components/workspace/workspace-subscription-tab.tsx
src/components/workspace/batch-credit-dialog.tsx

src/components/content/content-stats.tsx
src/components/content/document-table.tsx
src/components/content/esg-overview-table.tsx
src/components/content/esg-category-stats.tsx
src/components/content/esg-item-rankings.tsx
src/components/content/report-table.tsx
src/components/content/esg-completion-chart.tsx
src/components/content/data-source-chart.tsx
```

### 유틸리티 (1개)

```
src/lib/format.ts
```

### 기존 수정 파일

```
src/components/layout/admin-sidebar.tsx     — 네비게이션 구조 변경 (Collapsible 하위 메뉴)
src/actions/user/get-users.ts               — 추가 데이터 포함
src/actions/workspace/get-workspaces.ts     — 구독 상태 포함
src/actions/workspace/get-workspace-detail.ts — 탭 데이터 포함
src/app/(admin)/[region]/workspaces/[id]/page.tsx — 탭 구조로 리팩터링
src/components/workspace/workspace-detail.tsx — 탭 구조로 리팩터링
```

---

## 8. 구현 순서 (권장)

1. **사전 작업**: Prisma 스키마 동기화 + PlanCode 마이그레이션 + Recharts 설치 + 공통 컴포넌트/유틸리티
2. **사이드바**: 네비게이션 구조 변경 (이후 모든 페이지가 접근 가능)
3. **빌링/구독 관리**: 서버 액션 → 대시보드 → 구독 목록 → 결제 내역 → 크레딧 원장
4. **AI 파이프라인**: 서버 액션 → 대시보드 → 파이프라인 목록 → 크레딧 분석
5. **사용자/워크스페이스 심화**: 사용자 목록 강화 + 상세 → 워크스페이스 목록 강화 + 탭 확장
6. **콘텐츠/데이터 관리**: 서버 액션 → 대시보드 → 문서 목록 → ESG 현황 → 리포트

---

## 9. 설계 원칙 요약

- **읽기 중심**: 어드민은 주로 모니터링/조회. 쓰기는 크레딧 조정과 플랜 변경에 한정.
- **서버 사이드 데이터**: 모든 필터/정렬/페이지네이션은 서버에서 처리. 클라이언트에서 대량 데이터를 다루지 않음.
- **점진적 로딩**: 각 라우트에 `loading.tsx` Suspense boundary 제공.
- **URL 기반 상태**: 필터, 정렬, 페이지, 탭 모두 URL 파라미터로 관리하여 공유/북마크 가능.
- **기존 패턴 준수**: CLAUDE.md의 아키텍처 규칙, 네이밍, 템플릿 모두 따름.
- **production 퀄리티**: 빈 상태, 에러 상태, 로딩 상태 모두 처리. 데이터 포맷팅 일관성.
