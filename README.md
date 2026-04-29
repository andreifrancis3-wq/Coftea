# Coftea

This repository now separates the application into dedicated folders:

- `frontend/`: Vite + React responsive storefront and role-based dashboards
- `backend/`: MySQL-backed business logic, auth helpers, order/product/staff services, and schema reference
- `api/`: thin Vercel function entrypoints that delegate into `backend/`
- `OneDrive/Desktop/AMALA/AMALA/`: legacy PHP implementation retained as a migration reference

## Features

- customer account registration and sign-in with secure hashed passwords
- role-based access control for `admin`, `staff`, and `customer`
- admin dashboard for product management and staff account creation, password updates, and removal
- staff dashboard for pending and processing order management
- customer cart, checkout, and order tracking
- near-real-time order refresh using an SSE endpoint with periodic refresh fallback
- responsive interface for desktop, tablet, mobile, and narrow browser windows

## Local Setup

1. Copy `.env.example` to `.env` and fill in your MySQL connection values.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the local Vite URL shown in the terminal.

The backend bootstraps the required tables and seed data automatically on first API access.

## Vercel Deployment

1. Import the repository into Vercel.
2. Keep the project root at the repository root.
3. Add the environment variables from `.env.example`.
4. Deploy.

`vercel.json` is configured to:

- build the frontend from the root workspace
- publish `frontend/dist`
- keep `/api/*` routed to serverless functions
- rewrite other routes to `index.html` so client-side navigation works after refreshes

## Default Admin

The first API bootstrap seeds an admin user using:

- username: value of `COFTEA_ADMIN_USERNAME` or `admin`
- password: value of `COFTEA_ADMIN_PASSWORD` or `Admin@12345`
