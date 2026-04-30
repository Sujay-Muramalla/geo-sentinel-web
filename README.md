# Geo-Sentinel Web

> **Geopolitical Intelligence Platform** — Real-time RSS-driven news aggregation, relevance scoring, and intelligence reporting for global scenario analysis.

---

## Table of Contents

- [Overview](#overview)
- [Architecture Summary](#architecture-summary)
- [System Architecture Diagram](#system-architecture-diagram)
- [Tech Stack](#tech-stack)
- [Application Features](#application-features)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Python Intelligence Worker](#python-intelligence-worker)
- [AWS Infrastructure](#aws-infrastructure)
- [Authentication Flow](#authentication-flow)
- [Data Flow](#data-flow)
- [Source Catalog](#source-catalog)
- [CI/CD Pipeline](#cicd-pipeline)
- [Environment Configuration](#environment-configuration)
- [Local Development](#local-development)
- [Project Structure](#project-structure)

---

## Overview

Geo-Sentinel is a full-stack geopolitical intelligence platform that aggregates live news from curated global RSS feeds, applies multi-signal relevance scoring, and surfaces ranked intelligence results for analyst-defined scenarios. It is designed for security researchers, policy analysts, and intelligence professionals who need fast, structured situational awareness across global events.

**Example scenarios the platform handles:**
- Taiwan semiconductor disruption
- Red Sea shipping attacks
- India–China border tension
- NATO escalation in Eastern Europe
- South China Sea naval confrontation
- Iran–Israel regional escalation

The platform supports both authenticated (Cognito-protected) and public demo modes, and can generate downloadable PDF intelligence reports per result.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                                 │
│              React 19 + Vite + TailwindCSS + Radix UI               │
│         (Hosted on S3 + CloudFront, eu-central-1)                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS (OAuth2 PKCE / Bearer JWT)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AWS COGNITO (Hosted UI)                           │
│         User Pool · PKCE Auth Code Flow · JWT Tokens                │
└────────────────────────────┬────────────────────────────────────────┘
                             │ Verified JWT
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              APPLICATION LOAD BALANCER (ALB)                        │
│                  HTTP/HTTPS · Target Group Routing                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  EC2 BACKEND (Node.js / Express)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Intelligence │  │   Report     │  │   Auth Middleware         │  │
│  │ Controller   │  │  Controller  │  │  (Cognito JWT Verify)     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────────┘  │
│         │                 │                                          │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────────────────────────┐  │
│  │ Intelligence │  │ Report       │  │  Cache Service            │  │
│  │ Service      │  │ Builder Svc  │  │  (DynamoDB · SHA256 key)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────────┘  │
│         │                 │                                          │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────────────────────────┐  │
│  │ Python Worker│  │ PDF Report   │  │  Snapshot Service         │  │
│  │ (subprocess) │  │ Service      │  │  (S3 · date-partitioned)  │  │
│  └──────┬───────┘  └──────────────┘  └──────────────────────────┘  │
└─────────┼───────────────────────────────────────────────────────────┘
          │ stdin/stdout JSON
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│              PYTHON RSS INTELLIGENCE WORKER                         │
│  Source Selection → RSS Fetch → Relevance Scoring → Ranked Output   │
│  (18+ curated feeds · multi-signal scoring · sentiment analysis)    │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     AWS DATA LAYER                                  │
│  ┌──────────────────────┐    ┌──────────────────────────────────┐  │
│  │  DynamoDB Cache      │    │  S3 Reports Bucket               │  │
│  │  (queryHash TTL)     │    │  (snapshots / year/month/day)    │  │
│  └──────────────────────┘    └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## System Architecture Diagram

Architecture diagrams (PNG + ASCII + Mermaid) are available in [`docs/architecture_diagrams/`](docs/architecture_digrams/).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19.2, Vite 8, TailwindCSS 4.2, Radix UI, Lucide React |
| **Backend** | Node.js, Express 4.21, AWS SDK v3 |
| **Intelligence Worker** | Python 3 (stdlib + `requests`) |
| **Authentication** | AWS Cognito (OAuth2 PKCE, JWT) |
| **Cache** | AWS DynamoDB (on-demand, TTL-based) |
| **Storage** | AWS S3 (frontend hosting + intelligence snapshots) |
| **CDN** | AWS CloudFront |
| **Compute** | AWS EC2 (Amazon Linux 2023, t2.micro) |
| **Load Balancer** | AWS ALB (HTTP/HTTPS) |
| **TLS** | AWS ACM (DNS-validated certificates) |
| **IaC** | Terraform (AWS Provider 6.3) |
| **CI/CD** | GitHub Actions (OIDC → S3 deploy) |
| **PDF Generation** | PDFKit 0.18 |
| **Region** | `eu-central-1` (Frankfurt) |

---

## Application Features

- **Scenario-based intelligence queries** — free-text scenario input with geographic scope, country, media type, publication focus, sentiment, and sort order filters
- **Automatic query expansion** — queries are expanded with related geopolitical terms to maximize feed coverage
- **Multi-signal relevance scoring** — articles scored across query relevance, geo alignment, source tier, recency, sentiment strength, and source influence weight
- **Source transparency** — UI exposes selected feeds, applied filters, expanded queries, and per-result diagnostics
- **Sentiment classification** — positive / neutral / negative classification per article
- **Per-result intelligence reports** — structured executive briefs with relevance analysis and signal interpretation
- **PDF report export** — downloadable PDF per intelligence card
- **DynamoDB query caching** — SHA256-keyed cache with TTL to avoid redundant feed fetches
- **S3 snapshot audit trail** — every intelligence run is stored as a date-partitioned snapshot
- **Optional authentication** — supports both Cognito-authenticated and public demo modes
- **Fallback synthetic results** — graceful degradation if the Python worker fails

---

## Frontend Architecture

**Location:** `frontend-react/`

Built with React 19 and Vite, styled with TailwindCSS 4 and Radix UI primitives.

### Pages

| Page | Description |
|---|---|
| `LandingPage` | Unauthenticated entry point with product overview |
| Dashboard (App.jsx) | Main intelligence query and results interface |

### Component Structure

```
src/
├── components/
│   ├── dashboard/
│   │   ├── query-panel.jsx        # Scenario input + filter controls
│   │   ├── example-chips.jsx      # Pre-built scenario shortcuts
│   │   ├── results-list.jsx       # Ranked intelligence results
│   │   ├── result-card.jsx        # Individual result with scores + report
│   │   ├── results-placeholder.jsx
│   │   └── status-panel.jsx       # Source transparency + diagnostics
│   ├── layout/
│   │   └── app-shell.jsx          # Top bar + sidebar shell
│   └── ui/                        # Radix-based primitives (Button, Card, Badge, etc.)
├── pages/
│   └── landing.jsx
└── lib/
    ├── api.js                     # All backend API calls
    ├── auth.js                    # Cognito PKCE OAuth2 flow
    └── utils.js
```

### State Management

Local React state via `useState` / `useMemo` / `useEffect`. No external state library — the app is intentionally lean.

### Authentication (Frontend)

`lib/auth.js` implements the full OAuth2 Authorization Code + PKCE flow:
1. Generates a cryptographic code verifier and SHA-256 challenge
2. Redirects to Cognito Hosted UI
3. Exchanges the authorization code for access/ID/refresh tokens
4. Stores tokens in `localStorage`
5. Attaches `Authorization: Bearer <token>` to API requests

---

## Backend Architecture

**Location:** `backend/src/`

Node.js / Express API server with structured middleware, service, and utility layers.

### API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/health` | API health check |
| `POST` | `/api/intelligence/generate` | Run intelligence query |
| `GET` | `/api/reports/:queryHash` | Retrieve full report by hash |
| `GET` | `/api/reports/:queryHash/items/:resultId` | Per-card report (JSON or PDF) |

### Middleware Stack

```
Request → CORS → JSON Parser → Request Logger → Optional Auth → Route Handler → Error Handler
```

- **authMiddleware** — extracts and verifies Cognito JWT; supports `optional` mode for public access
- **requestLogger** — structured request/response logging
- **errorHandler** — centralized error formatting with `AppError` class

### Services

| Service | Responsibility |
|---|---|
| `intelligenceService` | Orchestrates the full query pipeline: normalize → cache check → spawn Python worker → transform → filter → cache write → snapshot |
| `cognitoJwtService` | Verifies Cognito access/ID tokens using `aws-jwt-verify` |
| `cacheService` | DynamoDB read/write with SHA256 query hash keys and TTL expiry |
| `snapshotService` | S3 read/write for date-partitioned intelligence snapshots |
| `reportBuilderService` | Builds structured per-card reports (executive brief, relevance analysis, signal classification) |
| `pdfReportService` | PDFKit-based PDF generation with headers, score bars, and footers |

### Key Design Decisions

- **Python worker as subprocess** — the intelligence worker is spawned as a child process, communicating via stdin/stdout JSON. This keeps the Node.js event loop non-blocking and allows the Python layer to be replaced or upgraded independently.
- **Deterministic reports** — reports are built from captured metadata, not AI-generated, ensuring reproducibility.
- **Fallback results** — if the Python worker times out or errors, the service returns synthetic placeholder results rather than a hard failure.
- **Optional auth mode** — `AUTH_MODE=optional` allows unauthenticated demo access without code changes.

---

## Python Intelligence Worker

**Location:** `backend/src/python/rss_intelligence_worker.py`

A self-contained Python 3 script (~1,360 lines) that handles all RSS feed processing and article scoring. It receives a JSON payload on stdin and writes ranked results to stdout.

### Processing Pipeline

```
Input JSON (query + filters)
        │
        ▼
1. Query Expansion
   └─ Expands terms (e.g. "Taiwan" → "Taiwan strait", "China Taiwan tensions")
        │
        ▼
2. Source Selection
   └─ Scores 18+ feeds by geographic + topical alignment
   └─ Selects up to 12 most relevant feeds
        │
        ▼
3. RSS Fetch
   └─ Parallel HTTP requests with 12s timeout per feed
   └─ XML parsing via ElementTree
        │
        ▼
4. Strict Match Gate
   └─ Rejects articles where no query terms appear in title/body
        │
        ▼
5. Multi-Signal Scoring
   └─ Query relevance    (weight: 2.0×)
   └─ Geo alignment      (weight: 2.4×)
   └─ Source tier        (weight: 1.0×)
   └─ Recency            (weight: 1.0×)
   └─ Sentiment strength (weight: 0.35×)
   └─ Influence weight   (weight: 2.2×)
        │
        ▼
6. Sentiment Classification
   └─ positive / neutral / negative per article
        │
        ▼
7. Ranked Output (JSON)
   └─ Up to 40 results, min relevance score 0.42
   └─ Includes: expanded queries, selected sources, diagnostics, feed errors
```

### Scoring Details

- **Phrase scoring** — checks for multi-word phrase matches in title and body
- **Proximity scoring** — measures how close query terms appear to each other
- **Token overlap** — ratio of matching query tokens
- **Title boost** — articles with query terms in the title receive a score multiplier

---

## AWS Infrastructure

**Location:** `infra/terraform/`  
**Provider:** AWS 6.3 · **Region:** `eu-central-1`

All infrastructure is managed as Terraform code. Resources are tagged with `Project`, `Environment`, and `ManagedBy=terraform`.

### Infrastructure Components

#### Networking (`main.tf`)
- **VPC** — `10.0.0.0/16` with DNS support and hostnames enabled
- **Public Subnets** — 2× across availability zones (EC2, ALB)
- **Private Subnets** — 2× for internal resources
- **Internet Gateway** + route tables

#### Compute (`ec2-backend.tf`)
- **EC2** — Amazon Linux 2023, `t2.micro`, 8 GB encrypted EBS
- IMDSv2 enforced
- IAM instance profile for S3, DynamoDB, CloudWatch access
- User data script bootstraps Node.js and clones the repo on first boot
- Toggle-able (can be disabled for cost savings)

#### Load Balancer (`alb-backend.tf`)
- **ALB** — HTTP/HTTPS listeners, target group routing to EC2
- Toggle-able alongside EC2

#### Frontend Hosting (`s3-frontend-bucket.tf`, `cloudfront-frontend.tf`)
- **S3** — static website hosting for React build artifacts
- **CloudFront** — CDN distribution with custom domain support and cache optimization

#### Authentication (`cognito-auth.tf`)
- **Cognito User Pool** — email-based sign-up/sign-in
- Password policy: 10+ chars, upper, lower, number, symbol
- Hosted UI domain for OAuth2 login page
- App client with PKCE support
- Token validity: 60 min (access/ID), 30 days (refresh)

#### Data Layer
- **DynamoDB** (`dynamodb-cache.tf`) — on-demand billing, `queryHash` partition key, TTL on `expiresAt`
- **S3 Reports Bucket** (`s3-reports-bucket.tf`) — intelligence snapshots, date-partitioned (`year/month/day`)

#### TLS / DNS
- **ACM** (`acm-backend.tf`, `acm-cloudfront.tf`) — DNS-validated certificates for backend API and CloudFront distribution

#### IAM & Security
- **EC2 Instance Role** (`backend-iam.tf`) — least-privilege access to S3, DynamoDB, CloudWatch
- **GitHub OIDC Role** (`github_oidc.tf`, `github_deploy_role.tf`) — keyless CI/CD deployments via OIDC federation
- **Security Groups** (`security-groups.tf`) — ALB accepts HTTP/HTTPS from internet; EC2 accepts traffic only from ALB; SSH restricted to configured CIDRs

---

## Authentication Flow

```
Browser                    Cognito Hosted UI              Backend (EC2)
   │                              │                             │
   │── buildLoginUrl() ──────────►│                             │
   │   (PKCE code_challenge)      │                             │
   │                              │◄── User enters credentials ─│
   │◄── redirect + auth_code ─────│                             │
   │                              │                             │
   │── exchangeCodeForTokens() ───►│                             │
   │◄── access_token + id_token ──│                             │
   │                              │                             │
   │── POST /api/intelligence/generate ─────────────────────────►│
   │   Authorization: Bearer <access_token>                      │
   │                              │                             │
   │                              │   cognitoJwtService.verify()│
   │                              │   (aws-jwt-verify, JWKS)    │
   │◄── intelligence results ────────────────────────────────────│
```

- Tokens stored in `localStorage` under `geoSentinelAuthSession`
- PKCE verifier stored under `geoSentinelPkceVerifier`
- `AUTH_MODE=optional` bypasses token requirement for demo/public access

---

## Data Flow

### Intelligence Generation

```
1. User submits scenario + filters (POST /api/intelligence/generate)
2. Backend normalizes payload → generates SHA256 queryHash
3. DynamoDB cache lookup
   ├── HIT  → return cached results immediately
   └── MISS → spawn Python worker (subprocess, 30s timeout)
              │
              ▼
4. Python worker fetches RSS feeds → scores articles → returns JSON
5. Backend transforms results (source metadata annotation)
6. Geographic + sentiment filtering applied
7. Results written to DynamoDB cache (with TTL)
8. Snapshot written to S3 (year/month/day/queryHash.json)
9. Ranked results returned to frontend
```

### Report Generation

```
1. User requests report (GET /api/reports/:queryHash/items/:resultId)
2. Backend retrieves snapshot from S3
3. reportBuilderService builds structured report
   └── executive brief, relevance analysis, signal classification
4. If ?format=pdf → pdfReportService generates PDF via PDFKit
5. Response: JSON report or PDF binary download
```

---

## Source Catalog

The platform aggregates from **60+ curated sources** across regions, with tiered reliability and influence weights:

| Region | Sources |
|---|---|
| **Global Wires** | Reuters (0.95), AP News (0.94) |
| **UK** | BBC (0.93), The Guardian (0.90), Financial Times (0.92), Sky News (0.86) |
| **Germany** | DW (0.91), Tagesschau (0.91), Der Spiegel (0.88), ZDF, ARD, WELT |
| **France** | France 24 (0.90), Le Monde (0.90), RFI (0.86) |
| **Europe** | Euronews, ANSA, El País, RTVE, NOS, SVT, Yle, NRK, Kyiv Independent |
| **India** | NDTV (0.88), Times of India (0.84), The Hindu (0.89), WION, Economic Times |
| **Asia-Pacific** | SCMP (0.88), CNA (0.87), Nikkei Asia (0.89), NHK, Japan Times, Yonhap, Taipei Times |
| **Middle East** | Al Jazeera (0.91), Arab News (0.84), Times of Israel (0.84), Haaretz |
| **North America** | CNN (0.90), NPR (0.89), PBS NewsHour |

Sources are scored by `reliabilityScore` (0–1) and `influenceWeight` (multiplier applied during article scoring). Tier levels: `top`, `high`, `standard`.

---

## CI/CD Pipeline

**File:** `.github/workflows/deploy.yml`  
**Trigger:** Push to `main` branch

```
Push to main
     │
     ▼
1. Checkout repository (actions/checkout@v4)
2. Setup Node.js 20 (actions/setup-node@v4)
3. npm ci (frontend-react/)
4. npm run build (Vite production build → dist/)
5. Configure AWS credentials via OIDC
   └─ Role: GeoSentinelGitHubDeployRole (no long-lived keys)
6. aws s3 sync dist/ → s3://geo-sentinel-web-frontend-632150488936
7. CloudFront cache invalidation
```

No AWS access keys are stored in GitHub Secrets — authentication uses OIDC federation via `github_oidc.tf` and `github_deploy_role.tf`.

---

## Environment Configuration

### Backend (`backend/.env.example`)

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# CORS
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com

# Python worker
PYTHON_COMMAND=python3
PYTHON_INTELLIGENCE_WORKER=src/python/rss_intelligence_worker.py
PYTHON_WORKER_TIMEOUT_MS=30000
INTELLIGENCE_REQUEST_TIMEOUT_MS=35000

# Auth
AUTH_MODE=optional          # "optional" = public demo, "required" = enforce JWT

# AWS Cognito
COGNITO_REGION=eu-central-1
COGNITO_USER_POOL_ID=eu-central-1_XXXXXXXXX
COGNITO_CLIENT_ID=your-client-id

# AWS
DYNAMODB_CACHE_TABLE=geo-sentinel-cache
S3_REPORTS_BUCKET=your-reports-bucket-name
```

### Frontend (`frontend-react/.env.example`)

```env
VITE_API_BASE_URL=https://your-backend-api.com
VITE_COGNITO_DOMAIN=your-pool.auth.eu-central-1.amazoncognito.com
VITE_COGNITO_CLIENT_ID=your-client-id
VITE_COGNITO_REDIRECT_URI=https://your-frontend-domain.com
VITE_COGNITO_LOGOUT_URI=https://your-frontend-domain.com
```

---

## Local Development

### Prerequisites

- Node.js 20+
- Python 3.9+
- AWS credentials configured (for DynamoDB/S3 features)

### Backend

```bash
cd backend
cp .env.example .env        # fill in your values
npm install
npm run dev                 # nodemon on port 3000
```

### Frontend

```bash
cd frontend-react
cp .env.example .env.local  # fill in your values
npm install
npm run dev                 # Vite dev server on port 5173
```

### Python Worker (standalone test)

```bash
cd backend/src/python
pip install -r requirements.txt
echo '{"query":"Taiwan semiconductor","regions":["Asia"],"countries":[],"mediaTypes":["news-article"],"publicationFocus":["international"],"sentimentFilter":"all","sortBy":"final-desc"}' | python3 rss_intelligence_worker.py
```

---

## Project Structure

```
geo-sentinel-web/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions: build + S3 deploy
│
├── backend/
│   └── src/
│       ├── app.js                  # Express app setup
│       ├── server.js               # HTTP server entry point
│       ├── config/
│       │   ├── env.js              # Typed environment config
│       │   └── sourceRegistry.js   # 60+ source metadata registry
│       ├── controllers/
│       │   ├── intelligenceController.js
│       │   └── reportController.js
│       ├── middleware/
│       │   ├── authMiddleware.js   # Cognito JWT verification
│       │   ├── errorHandler.js
│       │   └── requestLogger.js
│       ├── python/
│       │   └── rss_intelligence_worker.py  # RSS fetch + scoring engine
│       ├── routes/
│       ├── services/
│       │   ├── intelligenceService.js      # Core orchestration
│       │   ├── cacheService.js             # DynamoDB cache
│       │   ├── snapshotService.js          # S3 snapshots
│       │   ├── reportBuilderService.js     # Report generation
│       │   ├── pdfReportService.js         # PDF export
│       │   └── cognitoJwtService.js        # JWT verification
│       └── utils/
│           ├── apiResponse.js
│           ├── appError.js
│           ├── asyncHandler.js
│           └── logger.js
│
├── frontend-react/
│   └── src/
│       ├── App.jsx                 # Root component + state
│       ├── components/
│       │   ├── dashboard/          # Query panel, results, status
│       │   ├── layout/             # App shell, sidebar, topbar
│       │   └── ui/                 # Radix UI primitives
│       ├── pages/
│       │   └── landing.jsx
│       └── lib/
│           ├── api.js              # Backend API client
│           └── auth.js             # Cognito PKCE flow
│
├── infra/
│   └── terraform/
│       ├── main.tf                 # VPC, subnets, networking
│       ├── ec2-backend.tf          # EC2 compute
│       ├── alb-backend.tf          # Application Load Balancer
│       ├── s3-frontend-bucket.tf   # Frontend static hosting
│       ├── s3-reports-bucket.tf    # Intelligence snapshots
│       ├── cloudfront-frontend.tf  # CDN distribution
│       ├── cognito-auth.tf         # User pool + app client
│       ├── dynamodb-cache.tf       # Query result cache
│       ├── acm-backend.tf          # TLS cert (backend)
│       ├── acm-cloudfront.tf       # TLS cert (CloudFront)
│       ├── security-groups.tf      # ALB + EC2 SGs
│       ├── backend-iam.tf          # EC2 instance role
│       ├── github_oidc.tf          # GitHub OIDC provider
│       ├── github_deploy_role.tf   # CI/CD deploy role
│       ├── variables.tf
│       └── outputs.tf
│
└── docs/
    ├── architecture_diagrams/      # PNG + ASCII + Mermaid diagrams
    └── NF_Capstone_Project_OnePager_Brief.pdf
```

---

## Security Notes

- JWT tokens verified server-side via `aws-jwt-verify` against Cognito JWKS endpoint
- CORS origin validation enforced at the Express layer
- EC2 IMDSv2 enforced (no IMDSv1)
- S3 objects encrypted at rest (AES-256)
- IAM roles follow least-privilege principle
- GitHub Actions uses OIDC federation — no long-lived AWS credentials stored in secrets
- Input validation and sanitization on all API endpoints
- Error responses in production do not expose internal stack traces

---

*Built as a capstone project demonstrating full-stack cloud architecture on AWS with Terraform IaC, React frontend, Node.js/Python backend, and automated CI/CD.*
