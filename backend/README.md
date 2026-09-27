# Backend - ReachInbox Email Scheduler

## Architecture Overview
The backend is an Express.js API server built with TypeScript, acting as the core orchestration layer for the scheduling platform.
It handles OAuth flows (Google & Slack), accepts campaign data, interfaces with PostgreSQL via Prisma, and queues email tasks into Redis using BullMQ.
A separate Worker process consumes jobs from Redis to send emails via Ethereal SMTP.

## Directory Structure
- `/src/controllers` - Route handlers for API endpoints
- `/src/services` - Core business logic (Scheduling, Parsing, Rate Limiting, Elasticsearch)
- `/src/routes` - Express router definitions
- `/src/workers` - BullMQ worker implementations
- `/src/prisma` - DB schema and migrations
- `/tests` - Vitest unit tests

## Development Commands
```bash
npm install       # Install dependencies
npm run dev       # Start API server in dev mode
npm run worker    # Start BullMQ worker in dev mode
npm run build     # Build TypeScript to /dist
npm test          # Run Vitest tests
```

## API Route Summary
- `GET /api/auth/google` - Google OAuth authentication
- `POST /api/campaigns` - Campaign creation (supports multipart/form-data for file uploads)
- `GET /api/emails/scheduled` - Retrieve pending emails
- `GET /api/emails/sent` - Retrieve completed emails
- `GET /api/search` - Full-text search via Elasticsearch
- `GET /admin/queues` - Bull Board UI for queue management
