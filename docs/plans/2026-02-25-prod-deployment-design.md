# ESGo Admin 프로덕션 배포 디자인

## 결정사항

| 항목 | 값 |
|------|-----|
| 도메인 | `admin.esgohq.com` |
| 네임스페이스 | `esgo-prod` (Platform과 동일) |
| 이미지 레지스트리 | `ghcr.io/team-dogfoot/esgo-admin` |
| OAuth | Platform과 동일 앱 공유 (callback URL 추가) |
| DB | Platform과 동일 PostgreSQL (`esgo-postgres.esgo-prod.svc.cluster.local`) |

## 아키텍처

```
GitHub (main push)
  → CI/CD: lint + tsc → Docker build → GHCR push → kustomize tag 갱신
  → ArgoCD 감지 → K8s 배포

K8s (esgo-prod namespace):
  ┌─────────────────────────────────────────────────┐
  │  Ingress                                        │
  │   k-esg.esgohq.com  → esgo-svc → esgo pod      │
  │   admin.esgohq.com  → esgo-admin-svc → admin pod│
  │                                                 │
  │  esgo-postgres (StatefulSet) ←── 공유 DB        │
  │  esgo-secrets (기존 Platform용)                 │
  │  esgo-admin-secrets (신규 Admin용)              │
  │  ghcr-auth-secret (공유)                        │
  └─────────────────────────────────────────────────┘
```

## K8s 매니페스트 (prod/esgo-admin/)

### deployment.yaml

- Platform과 동일 패턴
- init container 불필요 (db push 안 함, 스키마 읽기 전용)
- envFrom: esgo-admin-secrets
- env: NODE_ENV=production, AUTH_URL=https://admin.esgohq.com
- imagePullSecrets: ghcr-auth-secret (기존 공유)
- resources: 100m/256Mi requests, 300m/512Mi limits

### service.yaml

- ClusterIP, port 80 → targetPort 3000
- selector: app: esgo-admin

### ingress.yaml

- host: admin.esgohq.com
- cert-manager TLS (letsencrypt-production)
- nginx proxy timeout 300s

### hpa.yaml

- 1-2 replicas (admin 트래픽 적음)
- CPU 60%, Memory 70%

### sealed-secret.yaml

Admin 전용 secrets:
- AUTH_SECRET
- AUTH_TRUST_HOST
- AUTH_GOOGLE_ID (Platform과 동일)
- AUTH_GOOGLE_SECRET (Platform과 동일)
- ADMIN_EMAILS
- REGIONS
- DATABASE_URL_KR (esgo-postgres 내부 주소)
- LOG_LEVEL

## GitHub Actions CI/CD

Platform과 동일 4-job 파이프라인:
1. setup: npm ci + prisma generate
2. quality: lint + tsc (test 없음)
3. build-and-push-ghcr: Docker 빌드 → GHCR push (build-args 없음)
4. update-manifests: kustomize edit set image

이미지: `ghcr.io/team-dogfoot/esgo-admin:prod-<sha>`
매니페스트 경로: `prod/esgo-admin`

## 수동 작업 (1회)

1. Cloudflare DNS: `admin.esgohq.com` A 레코드 추가 (같은 서버 IP, DNS Only)
2. Google Cloud Console: OAuth callback URL 추가 `https://admin.esgohq.com/api/auth/callback/google`
3. kubeseal로 esgo-admin-secrets sealed secret 생성
4. GitHub repo secrets 설정: MANIFESTS_REPO_PAT

## Platform과의 차이점

| 항목 | Platform | Admin |
|------|----------|-------|
| init container | prisma db push | 없음 |
| Secrets 수 | 16개 | 8개 |
| build-args | PortOne, GA 등 | 없음 |
| HPA | 1-3 replicas | 1-2 replicas |
| test | vitest | 없음 (lint+tsc만) |
