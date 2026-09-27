# ReachInbox Email Scheduler
### Production-grade email outreach scheduling platform

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Elasticsearch](https://img.shields.io/badge/Elasticsearch-005571?style=for-the-badge&logo=elasticsearch&logoColor=white)

## Table of Contents
- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Scheduling Flow](#scheduling-flow)
- [Restart Persistence](#restart-persistence)
- [Idempotency](#idempotency)
- [Rate Limiting](#rate-limiting)
- [Elasticsearch](#elasticsearch)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Google OAuth Setup](#google-oauth-setup)
- [Slack OAuth Setup](#slack-oauth-setup)
- [Ethereal Email Setup](#ethereal-email-setup)
- [Environment Variables](#environment-variables)
- [Quick Start](#quick-start)
- [Demo Workflow (19 steps)](#demo-workflow-19-steps)
- [API Reference](#api-reference)
- [BullMQ Dashboard](#bullmq-dashboard)
- [Testing](#testing)
- [Docker Commands](#docker-commands)
- [Assumptions & Trade-offs](#assumptions--trade-offs)
- [License](#license)

## Project Overview
The ReachInbox Email Scheduler is a miniature email outreach scheduling platform. Users sign in via Google OAuth to a secure dashboard. From there, they can compose email campaigns, upload CSV or text files containing recipient email addresses, and configure precise scheduling parameters (such as minimum delay between emails and an hourly rate limit).

Emails are reliably scheduled and delivered via Ethereal SMTP through a distributed BullMQ worker system backed by Redis and PostgreSQL. The application ensures idempotency, rate limiting, and failure recovery.

## Architecture
```text
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   React     │────▶│   Express    │────▶│ PostgreSQL  │
│   Frontend  │     │   API Server │     │  (Prisma)   │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────┴───────┐
                    │    Redis     │
                    │  (BullMQ)    │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │   BullMQ     │
                    │   Worker     │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌────────────┐ ┌─────────┐ ┌──────────────┐
       │  Ethereal  │ │  Slack  │ │Elasticsearch │
       │   SMTP     │ │  API    │ │   (Search)   │
       └────────────┘ └─────────┘ └──────────────┘
```

## Scheduling Flow
1. **User submits campaign via API**: The frontend sends campaign details and recipients to the backend.
2. **Backend validates**: The backend validates the request and creates Campaign + Email records in PostgreSQL.
3. **Calculate schedules**: For each email: `scheduledAt = startTime + (index * delayMs)`.
4. **Create jobs**: BullMQ delayed jobs are created with deterministic IDs: `email-send:<emailId>`.
5. **Worker pickup**: The BullMQ Worker picks up the job when its delay expires.
6. **Rate limit check**: Redis Lua script atomically increments the hourly rate limit counter.
7. **Send throttle check**: Redis Lua script checks for minimum delay since the last send.
8. **Phase A**: A short DB transaction is used to claim the email (status changes from `SCHEDULED` to `PROCESSING`).
9. **SMTP send**: The email is sent via Ethereal (outside the DB transaction to prevent locking issues).
10. **Phase B**: A short DB transaction completes the process (status changes from `PROCESSING` to `SENT`).
11. **Best-effort Elasticsearch indexing**: The email record is indexed in Elasticsearch.

## Restart Persistence
- BullMQ delayed jobs live in Redis sorted sets.
- Redis AOF persistence ensures job durability (infrastructure-level).
- PostgreSQL is the source of truth for email state.
- On restart: the worker reconnects to Redis, and jobs fire according to delayed-job semantics.
- Startup reconciliation: queries for `SCHEDULED` emails with past `scheduledAt`, re-enqueuing orphans if necessary.
- Wall-clock accuracy: if the server was down during a scheduled time, the job processes immediately after recovery — NOT at original wall-clock time.
- No startup logic re-creates jobs from scratch.
- Deterministic job IDs prevent duplicate insertion.

## Idempotency
- Unique idempotencyKey per email record (`email:<uuid>`).
- The worker checks status before processing — `SENT` emails are skipped immediately.
- Two-phase DB lock: short transaction for claim, SMTP outside transaction, short transaction for completion.
- Deterministic BullMQ job IDs prevent duplicate queue insertion.
- Multiple concurrent workers safely handle the same email via a DB state machine.

**Exactly-once trade-off (IMPORTANT)**:
The system provides strong application-level idempotency and prevents duplicate processing under normal retries/concurrency. However, true exactly-once external email delivery cannot be guaranteed across a crash occurring after SMTP acceptance and before the database state is committed. This is a fundamental distributed-systems constraint that applies to any system with external side effects.

## Rate Limiting
- **Hourly limit**: Redis Lua script atomically increments `rate-limit:<senderId>:<YYYY-MM-DD-HH>` counter.
- **Minimum delay**: Redis Lua script tracks last send timestamp at `send-throttle:<senderId>`.
- Both mechanisms work seamlessly across multiple workers, processes, and application instances.
- When rate-limited: the job is rescheduled to the next available window via a BullMQ delayed job.
- There are no in-memory counters, no polling loops, and no cron jobs.
- Slack notification is sent once per sender per hour window (Redis SET NX deduplication) when limits are hit.

## Elasticsearch
- PostgreSQL is the source of truth.
- Elasticsearch is a searchable projection of the emails.
- Emails are indexed after state changes (scheduled, sent, failed).
- If Elasticsearch is unavailable: the email send succeeds, and the indexing failure is logged (graceful degradation).
- Search API filters by `userId` for security.
- Startup routine creates the index with proper mappings if it does not exist.

## Tech Stack
| Component       | Technology        | Version    |
|-----------------|-------------------|------------|
| Runtime         | Node.js           | 18.x       |
| Language        | TypeScript        | 5.x        |
| Frontend        | React (Vite)      | 18.x       |
| API Framework   | Express           | 4.x        |
| Database        | PostgreSQL        | 15         |
| ORM             | Prisma            | 5.x        |
| Queue / Cache   | Redis / BullMQ    | 7.x / 5.x  |
| Search          | Elasticsearch     | 8.x        |
| Container       | Docker            | 24.x       |

## Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Google Cloud Console project (for OAuth)
- Slack App (optional, for notifications)

## Google OAuth Setup
1. Go to Google Cloud Console (https://console.cloud.google.com/)
2. Create project
3. Enable Google+ API (or Google People API)
4. Create OAuth 2.0 credentials
5. Set authorized redirect URI: `http://localhost:4000/api/auth/google/callback`
6. Copy Client ID and Secret to `.env`

## Slack OAuth Setup
1. Go to https://api.slack.com/apps
2. Create new app
3. Add OAuth scopes: `chat:write`, `channels:read`
4. Set redirect URL: `http://localhost:4000/api/slack/callback`
5. Copy Client ID and Secret to `.env`

## Ethereal Email Setup
Ethereal is a fake SMTP service for testing.
1. Go to https://ethereal.email/create
2. Copy credentials to `.env`
3. Or leave `ETHEREAL_USER` and `ETHEREAL_PASS` empty for auto-creation on backend startup.

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Backend server port | 4000 | No |
| `NODE_ENV` | Environment | development | No |
| `CLIENT_URL` | Frontend URL | http://localhost:5173 | Yes |
| `SESSION_SECRET` | Secret for sessions | - | Yes |
| `DATABASE_URL` | Prisma PG connection | postgresql://user... | Yes |
| `REDIS_URL` | Redis connection URL | redis://localhost:6379 | Yes |
| `ELASTICSEARCH_URL` | ES connection URL | http://localhost:9200 | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | - | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | - | Yes |
| `SLACK_CLIENT_ID` | Slack OAuth Client ID | - | No |
| `SLACK_CLIENT_SECRET` | Slack OAuth Secret | - | No |
| `ETHEREAL_USER` | Ethereal SMTP user | - | No |
| `ETHEREAL_PASS` | Ethereal SMTP pass | - | No |

## Quick Start
```bash
# 1. Clone and install
git clone <repo>
cd reachinbox-email-scheduler
npm run install:all

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials (add Google OAuth)

# 3. Start infrastructure (Postgres, Redis, Elasticsearch)
npm run docker:up

# 4. Database setup
npm run db:generate
npm run db:migrate
npm run db:seed

# 5. Start backend (Terminal 1)
npm run dev:backend

# 6. Start worker (Terminal 2)
npm run dev:worker

# 7. Start frontend (Terminal 3)
npm run dev:frontend
```

## Demo Workflow (19 steps)
1. `docker compose up -d`
2. Start backend (`npm run dev:backend`)
3. Start worker (`npm run dev:worker`)
4. Start frontend (`npm run dev:frontend`)
5. Login with Google at http://localhost:5173
6. Connect Slack (if configured) via dashboard
7. Create CSV file with 3 test emails (e.g., test1@example.com, etc)
8. Compose campaign: Subject, delay 2s, hourly limit 2
9. Schedule
10. View Scheduled Emails table
11. Visit Bull Board at http://localhost:4000/admin/queues
12. Wait for processing
13. View Sent Emails
14. Click Ethereal preview link
15. Rate limiting demo: schedule 5 emails with limit=2
16. Schedule email 5 minutes in future
17. Stop backend (Ctrl+C)
18. Restart backend
19. Verify email still processes

## API Reference
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| `GET` | `/api/auth/google` | Initiate Google OAuth | No |
| `GET` | `/api/auth/me` | Get current user | Yes |
| `GET` | `/api/slack/auth` | Initiate Slack OAuth | Yes |
| `POST` | `/api/campaigns` | Create campaign & upload | Yes |
| `GET` | `/api/emails/scheduled` | List scheduled emails | Yes |
| `GET` | `/api/emails/sent` | List sent emails | Yes |
| `GET` | `/api/search` | Search emails (Elasticsearch) | Yes |

## BullMQ Dashboard
A dashboard to monitor BullMQ queues is available at:
`http://localhost:4000/admin/queues`
Requires authentication (session cookie).

## Testing
```bash
cd backend && npm test
```
Tests cover email parsing, scheduling logic, and rate limiting algorithms.

## Docker Commands
- `npm run docker:up` - Start infrastructure
- `npm run docker:down` - Stop infrastructure
- `docker compose -f docker-compose.yml up -d` - Manual start

## Assumptions & Trade-offs
- Single Ethereal sender for demo (Sender model supports multi-sender setup if expanded).
- JWT / Sessions via HTTP-only cookies for stateless/secure auth.
- Elasticsearch graceful degradation (system works even if ES is down).
- BullMQ retry strategy: 3 attempts with exponential backoff.
- Worker concurrency configurable, default 10.
- Slack notifications require separate app setup.
- Rate limit keys scoped per sender, not per user.

## License
MIT
