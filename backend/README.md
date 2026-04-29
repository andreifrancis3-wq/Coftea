# Coftea Backend

This folder contains the backend source for Coftea:

- `schema.sql`: MySQL schema and seed reference
- `src/lib`: auth, database, and domain services
- `src/api`: request handlers used by the Vercel `api/` functions

The runtime API entrypoints live in the repository root `api/` folder so Vercel can detect them, but the actual application logic stays here.
