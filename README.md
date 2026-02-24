# ESGo Admin

ESGo 멀티 리전 통합 관리 플랫폼. K-ESG 서비스의 워크스페이스, 사용자, 크레딧, 구독을 리전별로 모니터링하고 관리한다.

## 주요 기능

- **리전별 대시보드** — 워크스페이스 수, 활성 사용자, 크레딧 소비, 문서 수, 플랜 분포, ESG 완료율
- **워크스페이스 관리** — 목록 조회, 상세 정보, 크레딧 수동 조정(지급/차감), 구독 플랜 변경
- **사용자 관리** — 전체 사용자 목록, 소속 워크스페이스 확인
- **AI 서비스 모니터링** — 파이프라인 사용 현황 (준비 중)
- **멀티 리전** — 리전별 독립 DB 연결, 사이드바 리전 선택기로 전환

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| UI | React 19, Tailwind 4, shadcn/ui (new-york) |
| ORM | Prisma 7 (PostgreSQL, PrismaPg adapter) |
| 인증 | NextAuth v5 (Google OAuth, JWT 세션, ADMIN_EMAILS 가드) |
| 검증 | Zod 4 |
| 로깅 | Pino |
| 언어 | TypeScript strict |

## 시작하기

### 사전 요구사항

- Node.js 20+
- K-ESG 리전 DB 접근 가능한 PostgreSQL URL

### 설치

```bash
git clone https://github.com/Team-DogFoot/esgo-admin.git
cd esgo-admin
npm install
```

### 환경 변수

`.env.example`을 `.env.local`로 복사하고 값을 채운다.

```bash
cp .env.example .env.local
```

| 변수 | 설명 | 예시 |
|------|------|------|
| `AUTH_SECRET` | NextAuth 암호화 키 | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | 프록시 환경 신뢰 | `true` |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID | |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret | |
| `ADMIN_EMAILS` | 허용 관리자 이메일 (콤마 구분) | `admin@example.com,dev@example.com` |
| `REGIONS` | 리전 설정 JSON 배열 | `[{"id":"kr","name":"한국","domain":"k-esg.esgohq.com","flag":"🇰🇷"}]` |
| `DATABASE_URL_KR` | 한국 리전 DB URL | `postgresql://user:pass@host:5432/db` |
| `LOG_LEVEL` | 로그 레벨 | `info` |

### Prisma 클라이언트 생성

```bash
npm run db:generate:kr
```

> K-ESG 프로덕션 DB에서 스키마를 동기화하려면 `npm run db:pull:kr`을 먼저 실행한다.

### 개발 서버

```bash
npm run dev
```

`http://localhost:3000`에서 접속. `ADMIN_EMAILS`에 등록된 Google 계정으로 로그인한다.

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | Next.js 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 |
| `npm run lint` | ESLint |
| `npm run db:pull:kr` | 한국 리전 DB에서 Prisma 스키마 동기화 |
| `npm run db:generate:kr` | 한국 리전 Prisma 클라이언트 생성 |

## 프로젝트 구조

```
src/
  proxy.ts              인증 미들웨어 (NextAuth)
  actions/              Server Actions
    dashboard/          get-region-stats
    user/               get-users
    workspace/          get-workspaces, get-workspace-detail, adjust-credit, change-plan
  app/
    (admin)/            관리자 페이지 (인증 필수)
      page.tsx          홈 — 리전 선택
      [region]/         리전별 라우트
        page.tsx        대시보드
        users/          사용자 목록
        workspaces/     워크스페이스 목록
          [id]/         워크스페이스 상세
        ai-monitor/     AI 서비스 모니터링
    (auth)/login/       로그인 페이지
    api/auth/           NextAuth API 라우트
  components/
    layout/             admin-sidebar, region-selector, user-menu
    dashboard/          stat-card, plan-distribution
    user/               user-table
    workspace/          workspace-table, workspace-detail, credit-adjust-form, plan-change-form, member-list
    ui/                 shadcn/ui 컴포넌트
  lib/
    auth.ts             NextAuth 인스턴스
    auth.config.ts      NextAuth 설정 (Google, JWT, ADMIN_EMAILS 가드)
    prisma.ts           리전별 PrismaClient 팩토리
    regions.ts          리전 설정 (REGIONS 환경 변수 파싱)
    env.ts              환경 변수 검증 (Zod)
    logger.ts           Pino 로거 싱글턴
    action.ts           ActionResult<T>, ok(), fail()
    utils.ts            cn() (Tailwind 클래스 병합)
  types/
    next-auth.d.ts      세션 타입 확장
prisma/
  kr/                   한국 리전
    schema.prisma       K-ESG DB 스키마 (db pull로 동기화)
    prisma.config.ts    Prisma 설정 (DATABASE_URL_KR)
```

## 리전 추가하기

새 리전(예: `jp`)을 추가하려면:

1. **환경 변수 추가**

```bash
# .env.local
REGIONS='[{"id":"kr","name":"한국","domain":"k-esg.esgohq.com","flag":"🇰🇷"},{"id":"jp","name":"일본","domain":"k-esg-jp.esgohq.com","flag":"🇯🇵"}]'
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

4. **Prisma 클라이언트 생성**

```bash
npm run db:pull:jp
npm run db:generate:jp
```

5. **prisma.ts 수정** — 새 리전의 클라이언트 import를 추가하거나, 기존 스키마가 동일하면 그대로 사용.

## 배포

### Docker

```dockerfile
FROM node:20-alpine AS base
# ... (standalone output 빌드)
```

```bash
docker build -t esgo-admin .
docker run -p 3000:3000 --env-file .env.local esgo-admin
```

### CI/CD

- GitHub Actions → Docker 빌드 → GHCR push → K8s 매니페스트 갱신 → ArgoCD 자동 배포
- 이미지 레지스트리: `ghcr.io/team-dogfoot/esgo-admin`

## 아키텍처 특징

- **자체 DB 없음** — K-ESG 리전 DB에 읽기/쓰기 직접 접근. 어드민 전용 테이블 없음
- **JWT 전용 인증** — DB adapter 미사용. Google OAuth + ADMIN_EMAILS 화이트리스트
- **멀티 리전 Prisma** — 리전 ID로 PrismaClient를 캐시에서 조회. 리전별 독립 DB 연결
- **Server-First** — 페이지는 Server Component, 인터랙션은 Client Component에 격리
