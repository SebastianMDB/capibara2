# Railway deploy

## API service

Use the repository root as the service root.

Build command:

```bash
npm run build
```

Start command:

```bash
npm start
```

Healthcheck path:

```text
/health
```

Required variables:

```env
DATABASE_URL=...
DIRECT_URL=...
CLIENT_ORIGIN=https://your-frontend-domain
AUTH_SECRET=change-to-a-long-random-secret
NODE_ENV=production
```

Railway injects `PORT` automatically. The API reads `PORT` first and falls back to `API_PORT` for local development.

If you use Railway PostgreSQL instead of Supabase, set `DIRECT_URL` to the same PostgreSQL connection string as `DATABASE_URL` unless you have a separate direct connection URL.

## First deploy checklist

1. Set all variables in Railway before deploying.
2. Deploy the API service.
3. Open `/health` on the API domain.
4. Seed initial data manually only if this is a fresh database:

```bash
npm run db:seed
```
