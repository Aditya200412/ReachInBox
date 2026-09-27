# Frontend - ReachInbox Email Scheduler

## Architecture Overview
The frontend is a React application built with Vite, TypeScript, and styled with TailwindCSS (or standard CSS modules based on preference). It provides a user-friendly dashboard to manage email campaigns, view scheduled and sent emails, and interact with the search API.

## Component Structure
- `src/components/auth` - Login and authentication guards
- `src/components/dashboard` - Main dashboard layouts and navigation
- `src/components/campaigns` - Campaign creation form and file uploader
- `src/components/emails` - Tables for scheduled and sent emails
- `src/components/search` - Search bar and results view

## Development Commands
```bash
npm install       # Install dependencies
npm run dev       # Start Vite dev server on port 5173
npm run build     # Build for production
npm run preview   # Preview production build locally
```

## Environment Variables
Create a `.env` file in the `frontend` directory:
```
VITE_API_URL=http://localhost:4000/api
```
