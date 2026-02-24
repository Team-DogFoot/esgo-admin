# ESGo Admin 프로덕션 배포 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ESGo Admin을 `admin.esgohq.com`에 프로덕션 배포하는 CI/CD 파이프라인과 K8s 매니페스트를 구성한다.

**Architecture:** Platform과 동일한 GitOps 패턴 — GitHub Actions가 Docker 이미지를 GHCR에 push하고, K8s 매니페스트 repo의 이미지 태그를 갱신하면 ArgoCD가 자동 배포. Admin은 Platform과 같은 `esgo-prod` 네임스페이스에 배포되며, 같은 PostgreSQL을 공유한다.

**Tech Stack:** Docker, GHCR, K8s, Kustomize, ArgoCD, cert-manager, nginx-ingress, kubeseal, GitHub Actions

**Reference Files:**
- Platform 매니페스트: `/tmp/k8s-manifests/prod/esgo/` (deployment, service, ingress, hpa, kustomization)
- Platform CI/CD: `/Users/kkh/works/dog-foot/esgo/esg-platform/.github/workflows/ci-cd-prod.yml`
- Admin Dockerfile: `/Users/kkh/works/dog-foot/esgo/esgo-admin/Dockerfile`

---

### Task 1: K8s Deployment 매니페스트 작성

**Files:**
- Create: `/tmp/k8s-manifests/prod/esgo-admin/deployment.yaml`

**Step 1: deployment.yaml 작성**

Platform의 `prod/esgo/deployment.yaml`을 기반으로 작성. 차이점:
- `app: esgo-admin` 라벨
- init container 없음 (db push 불필요)
- `esgo-admin-secrets` 시크릿 참조
- `AUTH_URL: https://admin.esgohq.com`
- 이미지: `ghcr.io/team-dogfoot/esgo-admin:placeholder`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: esgo-admin
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: esgo-admin
  template:
    metadata:
      labels:
        app: esgo-admin
    spec:
      terminationGracePeriodSeconds: 30
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: role
                    operator: NotIn
                    values:
                      - observability
      containers:
        - name: app
          image: ghcr.io/team-dogfoot/esgo-admin:placeholder
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: AUTH_URL
              value: "https://admin.esgohq.com"
          envFrom:
            - secretRef:
                name: esgo-admin-secrets
          startupProbe:
            httpGet:
              path: /login
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 12
          readinessProbe:
            httpGet:
              path: /login
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /login
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 10
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 300m
              memory: 512Mi
      imagePullSecrets:
        - name: ghcr-auth-secret
```

> Note: health check 경로를 `/login`으로 설정 (admin은 `/`가 인증 필요하므로 302를 반환할 수 있음. `/login`은 항상 200).

**Step 2: 검증**

```bash
kubectl apply --dry-run=client -f /tmp/k8s-manifests/prod/esgo-admin/deployment.yaml
```

Expected: `deployment.apps/esgo-admin created (dry run)`

**Step 3: Commit**

```bash
cd /tmp/k8s-manifests
git add prod/esgo-admin/deployment.yaml
git commit -m "feat(esgo-admin): add deployment manifest"
```

---

### Task 2: K8s Service + Ingress 매니페스트 작성

**Files:**
- Create: `/tmp/k8s-manifests/prod/esgo-admin/service.yaml`
- Create: `/tmp/k8s-manifests/prod/esgo-admin/ingress.yaml`

**Step 1: service.yaml 작성**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: esgo-admin-svc
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 3000
  selector:
    app: esgo-admin
```

**Step 2: ingress.yaml 작성**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: esgo-admin-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: "letsencrypt-production"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
spec:
  tls:
    - hosts:
        - admin.esgohq.com
      secretName: admin-esgohq-tls
  rules:
    - host: admin.esgohq.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: esgo-admin-svc
                port:
                  number: 80
```

**Step 3: 검증**

```bash
kubectl apply --dry-run=client -f /tmp/k8s-manifests/prod/esgo-admin/service.yaml
kubectl apply --dry-run=client -f /tmp/k8s-manifests/prod/esgo-admin/ingress.yaml
```

**Step 4: Commit**

```bash
cd /tmp/k8s-manifests
git add prod/esgo-admin/service.yaml prod/esgo-admin/ingress.yaml
git commit -m "feat(esgo-admin): add service and ingress"
```

---

### Task 3: K8s HPA + Kustomization 작성

**Files:**
- Create: `/tmp/k8s-manifests/prod/esgo-admin/hpa.yaml`
- Create: `/tmp/k8s-manifests/prod/esgo-admin/kustomization.yaml`

**Step 1: hpa.yaml 작성**

Admin은 트래픽이 적으므로 1-2 replicas.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: esgo-admin
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: esgo-admin
  minReplicas: 1
  maxReplicas: 2
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 180
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
```

**Step 2: kustomization.yaml 작성**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: esgo-prod

resources:
- deployment.yaml
- service.yaml
- ingress.yaml
- hpa.yaml
- sealed-secret.yaml

images:
- name: ghcr.io/team-dogfoot/esgo-admin
  newName: ghcr.io/team-dogfoot/esgo-admin
  newTag: placeholder
```

**Step 3: Commit**

```bash
cd /tmp/k8s-manifests
git add prod/esgo-admin/hpa.yaml prod/esgo-admin/kustomization.yaml
git commit -m "feat(esgo-admin): add hpa and kustomization"
```

---

### Task 4: K8s Secret 템플릿 + Sealed Secret 생성

**Files:**
- Create: `/tmp/k8s-manifests/prod/esgo-admin/secret.template.yaml`
- Create: `/tmp/k8s-manifests/prod/esgo-admin/sealed-secret.yaml`

**Step 1: secret.template.yaml 작성 (참고용, gitops 미적용)**

```yaml
# 참고용 템플릿 (gitops 적용 대상 아님)
# 실제 값으로 수정 후 kubeseal을 통해 sealed-secret.yaml을 재생성하세요.
apiVersion: v1
kind: Secret
metadata:
  name: esgo-admin-secrets
  namespace: esgo-prod
type: Opaque
stringData:
  AUTH_SECRET: "<openssl rand -base64 32>"
  AUTH_TRUST_HOST: "true"
  AUTH_GOOGLE_ID: "<Platform과 동일한 Google OAuth Client ID>"
  AUTH_GOOGLE_SECRET: "<Platform과 동일한 Google OAuth Client Secret>"
  ADMIN_EMAILS: "kkhdevs@gmail.com"
  REGIONS: '[{"id":"kr","name":"한국","domain":"k-esg.esgohq.com","flag":"🇰🇷"}]'
  DATABASE_URL_KR: "postgresql://esgo_admin:<pw>@esgo-postgres.esgo-prod.svc.cluster.local:5432/esgo_prod"
  LOG_LEVEL: "info"
```

**Step 2: secret.template.yaml에 실제 값을 채워 /tmp/admin-secret.yaml 생성**

Platform의 기존 시크릿에서 AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, DATABASE_URL 값을 참조:

```bash
# Platform secrets에서 Google OAuth 값 확인
kubectl get secret esgo-secrets -n esgo-prod -o jsonpath='{.data.AUTH_GOOGLE_ID}' | base64 -d
kubectl get secret esgo-secrets -n esgo-prod -o jsonpath='{.data.AUTH_GOOGLE_SECRET}' | base64 -d
kubectl get secret esgo-secrets -n esgo-prod -o jsonpath='{.data.DATABASE_URL}' | base64 -d
```

이 값들로 /tmp/admin-secret.yaml을 채운 뒤:

```bash
# kubeseal로 sealed secret 생성
kubeseal --format=yaml < /tmp/admin-secret.yaml > /tmp/k8s-manifests/prod/esgo-admin/sealed-secret.yaml
rm /tmp/admin-secret.yaml
```

**Step 3: Commit**

```bash
cd /tmp/k8s-manifests
git add prod/esgo-admin/secret.template.yaml prod/esgo-admin/sealed-secret.yaml
git commit -m "feat(esgo-admin): add secrets"
```

---

### Task 5: GitHub Actions CI/CD 워크플로우 작성

**Files:**
- Create: `/Users/kkh/works/dog-foot/esgo/esgo-admin/.github/workflows/ci-cd-prod.yml`

**Step 1: CI/CD 워크플로우 작성**

Platform의 `ci-cd-prod.yml`을 기반으로 작성. 차이점:
- 이미지: `ghcr.io/team-dogfoot/esgo-admin`
- 매니페스트 경로: `prod/esgo-admin`
- quality: lint + tsc만 (test 없음)
- build-args 없음 (NEXT_PUBLIC 변수 없음)
- prisma generate 시 `--config=prisma/kr/prisma.config.ts`

```yaml
name: ESGo Admin CI/CD (prod)

on:
  workflow_dispatch:
  pull_request:
    branches: [main]
    paths-ignore:
      - "*.md"
      - ".env.example"
      - ".vscode/**"
      - "docs/**"
  push:
    branches: [main]
    paths-ignore:
      - "*.md"
      - ".env.example"
      - ".vscode/**"
      - "docs/**"

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  IMAGE_NAME: ghcr.io/team-dogfoot/esgo-admin
  MANIFEST_REPO_URL: https://github.com/Team-DogFoot/dog-foot-k8s-manifests.git
  MANIFEST_REPO_PATH: prod/esgo-admin

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Cache node_modules
        id: cache-deps
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            ~/.cache
          key: deps-${{ hashFiles('package-lock.json', 'prisma/kr/schema.prisma') }}

      - name: Install dependencies
        if: steps.cache-deps.outputs.cache-hit != 'true'
        run: npm ci

      - name: Generate Prisma Client
        if: steps.cache-deps.outputs.cache-hit != 'true'
        run: npx prisma generate --config=prisma/kr/prisma.config.ts

  quality:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Restore node_modules
        uses: actions/cache/restore@v4
        with:
          path: |
            node_modules
            ~/.cache
          key: deps-${{ hashFiles('package-lock.json', 'prisma/kr/schema.prisma') }}

      - run: npm run lint
      - run: npx tsc --noEmit

  build-and-push-ghcr:
    if: github.event_name == 'push' || github.event_name == 'workflow_dispatch'
    needs: [quality]
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    outputs:
      image_tag: ${{ steps.set_tag.outputs.IMAGE_TAG }}

    steps:
      - uses: actions/checkout@v4

      - name: Set image tag
        id: set_tag
        run: |
          TAG="prod-${{ github.sha }}"
          echo "IMAGE_TAG=$TAG" >> $GITHUB_ENV
          echo "IMAGE_TAG=$TAG" >> $GITHUB_OUTPUT

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ env.IMAGE_NAME }}:${{ env.IMAGE_TAG }}
          cache-from: type=gha
          cache-to: type=gha,mode=min

  update-manifests:
    if: github.event_name == 'push' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    needs: build-and-push-ghcr

    steps:
      - name: Install Kustomize
        uses: imranismail/setup-kustomize@v2
        with:
          kustomize-version: "5.4.3"

      - name: Checkout manifests repository
        uses: actions/checkout@v4
        with:
          repository: Team-DogFoot/dog-foot-k8s-manifests
          token: ${{ secrets.MANIFESTS_REPO_PAT }}
          ref: main

      - name: Update kustomize image tag
        env:
          IMAGE_TAG: ${{ needs.build-and-push-ghcr.outputs.image_tag }}
        run: |
          cd ${{ env.MANIFEST_REPO_PATH }}
          kustomize edit set image "${IMAGE_NAME}=${IMAGE_NAME}:${IMAGE_TAG}"

      - name: Commit and push
        run: |
          git config user.name "GitHub Actions Bot"
          git config user.email "github-actions@github.com"
          git add .
          git commit -m "chore(esgo-admin): deploy ${{ needs.build-and-push-ghcr.outputs.image_tag }}" || echo "No changes"
          git pull --rebase origin main
          git push
```

**Step 2: 검증**

```bash
# YAML 문법 검증
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-cd-prod.yml'))"
```

**Step 3: Commit**

```bash
cd /Users/kkh/works/dog-foot/esgo/esgo-admin
git add .github/workflows/ci-cd-prod.yml
git commit -m "ci: add production CI/CD pipeline"
```

---

### Task 6: GitHub repo secrets 설정

**Step 1: MANIFESTS_REPO_PAT secret 추가**

esgo-admin repo에 Platform과 동일한 PAT을 설정:

```bash
# Platform repo에서 PAT 값 확인 (GitHub UI에서 확인 필요)
# esgo-admin repo에 secret 추가
gh secret set MANIFESTS_REPO_PAT --repo Team-DogFoot/esgo-admin
```

프롬프트에 PAT 값 입력.

**Step 2: 검증**

```bash
gh secret list --repo Team-DogFoot/esgo-admin
```

Expected: `MANIFESTS_REPO_PAT` 표시

---

### Task 7: Cloudflare DNS 설정

**Step 1: admin.esgohq.com A 레코드 추가**

Cloudflare 대시보드에서:
- Type: A
- Name: admin
- Content: (Platform과 동일한 서버 IP — `kubectl get ingress -n esgo-prod`의 ADDRESS 확인: `192.168.0.201`)
- Proxy status: DNS only

> 이 작업은 Cloudflare 웹 UI에서 수동으로 수행.

---

### Task 8: Google OAuth callback URL 추가

**Step 1: Google Cloud Console에서 callback URL 추가**

Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs:
- Authorized redirect URIs에 추가: `https://admin.esgohq.com/api/auth/callback/google`

> 이 작업은 Google Cloud Console 웹 UI에서 수동으로 수행.

---

### Task 9: K8s 매니페스트 push + ArgoCD 배포

**Step 1: 매니페스트 repo push**

```bash
cd /tmp/k8s-manifests
git push origin main
```

**Step 2: ArgoCD에서 esgo-admin Application 생성 (필요 시)**

기존 ArgoCD가 `prod/` 하위를 자동 감지하지 않는 경우:

```bash
kubectl get applications -n argocd
```

필요하면 ArgoCD Application 매니페스트 추가 또는 UI에서 생성.

**Step 3: 첫 배포 트리거**

```bash
cd /Users/kkh/works/dog-foot/esgo/esgo-admin
git push origin main
```

GitHub Actions가 실행되면서:
1. lint + tsc 통과
2. Docker 이미지 빌드 → GHCR push
3. 매니페스트 repo 이미지 태그 갱신
4. ArgoCD 자동 배포

**Step 4: 배포 확인**

```bash
kubectl get pods -n esgo-prod -l app=esgo-admin
kubectl get ingress -n esgo-prod
curl -I https://admin.esgohq.com/login
```

Expected: pod Running, ingress 등록, HTTPS 200 응답
