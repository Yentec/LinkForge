# LinkForge

URL shortener API with authentication, API keys, anonymized async click tracking and analytics.

## Stack

Node.js 22 · TypeScript (strict) · Fastify 5 · Prisma 6 · PostgreSQL 16 · Redis 7 · Zod 4 · Pino · Vitest

## Quickstart

```bash
npm install
cp .env.example .env   # then configure environment variables
docker compose up -d
npm run db:migrate
npm run dev
```

Server runs on `http://localhost:3000`.

## Health checks

```bash
curl http://localhost:3000/health   # liveness probe
curl http://localhost:3000/ready    # readiness probe (DB + Redis)
```

## Available scripts

```bash
npm run dev         # start development server
npm run build       # build production bundle
npm run start       # run production server
npm run lint        # lint codebase
npm run typecheck   # TypeScript validation
npm test            # run tests
```

## Infrastructure

Make sure Docker services are running:

PostgreSQL on localhost:5432
Redis on localhost:6379

```bash
docker compose ps
```

## License

MIT
