# CLAUDE.md

Contexte projet pour Claude Code. À lire avant toute modification.

## Projet

**LinkForge** — API de raccourcissement d'URL avec authentification, clés API, tracking de clics anonymisé (RGPD) et analytics agrégées. Backend pur. Pas de frontend.

Projet portfolio à finalité de recrutement. Scope volontairement borné (~5–7 jours). Privilégier la qualité d'exécution à l'étendue fonctionnelle.

## Stack

- **Runtime** : Node.js 22 LTS, TypeScript `strict`
- **Framework** : Fastify 5
- **ORM** : Prisma 7 + PostgreSQL 16
- **Cache / Queue** : Redis 7 + BullMQ
- **Validation** : Zod 4 — validation de l'entrée uniquement (`.parse()` dans les controllers). Le document OpenAPI est _dérivé_ de ces mêmes schémas via `z.toJSONSchema()` natif.
- **Auth** : access token JWT (HS256, 15 min) + refresh token **opaque** (32 octets aléatoires, stocké hashé en SHA-256, rotatif et révocable en DB). Argon2id pour les mots de passe. Pas de `JWT_REFRESH_SECRET`.
- **Logging** : Pino (JSON structuré)
- **Tests** : Vitest + `app.inject` + Testcontainers (Postgres jetable)
- **Doc API** : document OpenAPI construit dans `src/docs/openapi.ts`, servi en `/openapi.json` et via `@scalar/fastify-api-reference` sur `/docs`. (Pas de `@fastify/swagger`.)
- **Package manager** : npm

## Commandes

```bash
npm run dev # serveur en watch (tsx)
npm run build # compilation -> dist/ (tsup)
npm start # exécution prod (dist/server.js)
npm run lint # ESLint, doit passer sans warning
npm run typecheck # tsc --noEmit
npm test # tests Vitest (nécessite Docker pour Testcontainers + Redis local)
npm run test:cov # tests + coverage

npm run db:migrate # prisma migrate dev
npm run db:deploy # prisma migrate deploy (prod/CI)
npm run db:seed # prisma db seed -> tsx prisma/seed.ts
npm run db:studio # Prisma Studio

docker compose up -d # Postgres + Redis en local
```

Avant tout commit : `npm run lint && npm run typecheck && npm test` doivent passer.

## Architecture

Layered architecture (monolithe modulaire). Flux unidirectionnel :

```
Routes (Fastify) -> Controllers -> Services -> Repositories -> Prisma/Redis
```

- **Routes** : déclaration des endpoints. Aucune logique.
- **Controllers** : parsing/validation entrée (Zod `.parse()`), mapping HTTP, appel service. Pas de logique métier.
- **Services** : logique métier pure. Ne connaissent NI Fastify NI HTTP NI `req`/`res`. Testables en isolation.
- **Repositories** : seule couche qui importe Prisma. Masque l'accès DB.

Injection manuelle (factories dans les `*.routes.ts`), pas de DI container — choix assumé vu la taille.

Le **worker BullMQ tourne dans le même process** que l'API (démarré dans `server.ts`, jamais dans les tests). Il consomme les jobs de clics depuis Redis et persiste via son propre `ClickRepository` (module `tracking`) — il n'appelle pas les services métier.

## Structure

```
src/
├── config/ # env (validé Zod, fail fast), logger Pino
├── modules/
│ ├── auth/ # register, login, refresh, logout, me
│ ├── api-keys/ # gestion des clés, scopes
│ ├── links/ # CRUD, idempotence, pagination cursor, anti-SSRF
│ ├── redirect/ # GET /:code public, cache + enqueue async
│ ├── tracking/ # queue BullMQ, worker, processor, click repository
│ ├── analytics/ # agrégations SQL, stats cachées
│ ├── docs/ # montage de la route /openapi.json + Scalar
│ ├── health/ # /health (liveness), /ready (readiness)
│   ├── maintenance/   # cron de nettoyage (liens expirés, comptes anciens)
│ └── <module>/ # .routes .controller .service .repository .schemas .types
├── shared/
│ ├── auth/ # password (Argon2id), jwt (jose), tokens (opaques + sha256)
│ ├── cache/ # connexion Redis (ioredis) + CacheService JSON
│ ├── errors/ # AppError + error-handler global
│ ├── middleware/ # authenticate, idempotency (rate-limit)
│ ├── queue/ # factory de connexion BullMQ
│ ├── geo/ # résolveur de pays best-effort (null par défaut, pluggable)
│ └── utils/ # short-code (nanoid), classifieur UA maison, validateur URL anti-SSRF
├── docs/openapi.ts # document OpenAPI construit depuis les schémas Zod
├── app.ts # build de l'instance Fastify (testable, sans listen)
└── server.ts # entry point (listen) + arrêt gracieux + cycle de vie du worker
prisma/ # schema, migrations, seed (compte démo + ~600 clics)
tests/ # integration, unit, helpers
scripts/start.sh # applique les migrations puis démarre le serveur (conteneur)
```

`app.ts` et `server.ts` sont séparés : `app.ts` retourne une instance configurée pour que les tests l'instancient sans ouvrir de port ni démarrer le worker.

## Conventions de code

- TypeScript `strict: true` + `noUncheckedIndexedAccess: true`.
- **Zéro `any`** non justifié, **zéro `@ts-ignore`** non commenté.
- Imports absolus via alias `@/` (configuré dans `tsconfig` + résolveur Vitest via `vite-tsconfig-paths`).
- Nommage : fichiers en `kebab-case`, classes en `PascalCase`, fonctions/variables en `camelCase`.
- Un module = un dossier cohérent. Pas de logique métier hors des services.
- Toute entrée externe (body, query, params, headers) est validée par Zod avant usage.

## Gestion des erreurs

- Lancer uniquement des `AppError` typées (`code`, `statusCode`, `message`) via le helper `Errors`.
- Ne jamais renvoyer manuellement une erreur via `reply.send` dans un service.
- L'error handler global Fastify mappe `AppError -> réponse JSON` `{ error: { code, message, details? } }`.
- Les erreurs inattendues -> 500 générique + log Pino avec stack et request ID. Ne jamais leak de stack en réponse.

## Sécurité (non négociable)

- Mots de passe : Argon2id uniquement (params OWASP : 19 MiB / t=2 / p=1).
- Refresh tokens : opaques, stockés hashés (SHA-256), un seul actif par session, révoqués + rotés à chaque usage.
- Clés API : format `lf_live_<random>`, seul le hash SHA-256 est stocké, jamais la valeur en clair après création.
- `@fastify/helmet` activé (CSP désactivée pour servir l'UI Scalar, autres en-têtes conservés). CORS configurable.
- **Anti-SSRF** : valider les URL `target` à la création, refuser `localhost`, `127.0.0.0/8`, `169.254.0.0/16`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, et tout protocole hors http(s).
- **RGPD** : les IP des clics sont hashées (SHA-256 + `IP_HASH_SALT`, tronqué), jamais stockées en clair.
- Aucun secret en dur. Tout passe par `env` validé au démarrage (fail fast).
- Rate limiting (`@fastify/rate-limit` + store Redis) : par clé API si présente, sinon par IP.

## Patterns clés

- **Idempotence** : `POST /links` accepte un header `Idempotency-Key`, mémorisé 24h en Redis (`idem:<userId>:<key>`).
- **Pagination** : cursor-based sur `(createdAt, id)`. Pas d'offset.
- **Redirection** : `GET /:code` résout le lien depuis le cache Redis (`link:<code>`, TTL 5 min, invalidé à l'update/delete), répond en **302** immédiatement, puis `enqueueClick` (fire-and-forget) vers la queue. Le tracking est 100 % asynchrone, jamais bloquant. Lien expiré -> 410.
- **Génération de code** : nanoid base62, 7 caractères, retry sur collision (max 5).
- **Tracking** : le worker enrichit le job (classifieur UA maison, résolveur géo best-effort, hash IP) et insère en DB. Retries avec backoff exponentiel.
- **Cache stats** : TTL 60 s.

## Tests

- Intégration : flux critiques (auth complet, CRUD links, redirect, analytics). Vrai Postgres via Testcontainers + Redis local/CI.
- Unitaire : logique pure (génération de code, classifieur UA, validation URL anti-SSRF).
- Le processor de clics est testé en isolation (sans lancer le worker BullMQ, pour éviter la dépendance au timing).
- Helper `tests/helpers/test-app.ts` construit l'app + reset DB.
- Cible coverage : services ≥ 80 %, flux critiques couverts en intégration.
- Ne pas mocker Prisma dans les tests d'intégration — utiliser une vraie DB jetable.

## Git

- Conventional Commits (`feat`, `fix`, `chore`, `test`, `docs`, `refactor`) sous la forme `<type>(<scope>): <subject>`.
- Une branche par feature/jour (GitHub Flow), PR vers `main`, branche supprimée après merge.
- Commits atomiques et lisibles (l'historique est relu par des recruteurs).
- `main` protégée : CI (lint + typecheck + test + build) doit passer.

## Déploiement

- Docker multi-stage, image finale `node:22-alpine`.
- Cible : **Render** (web service, Docker) + **Neon** (Postgres managé) + **Upstash** (Redis managé). Blueprint dans `render.yaml`.
- Migrations appliquées au démarrage du conteneur par `scripts/start.sh` (`prisma migrate deploy`, idempotent).
- CI/CD : GitHub Actions (`.github/workflows/`).
- Le free tier Render dort après 15 min d'inactivité (cold start 30–60 s) — assumé et documenté dans le README.

## À ne PAS faire

- Pas de frontend complet (le focus est l'API backend).
- Pas de GraphQL, pas de microservices, pas de NestJS — REST propre sur monolithe modulaire.
- Pas de logique métier dans les routes ou controllers.
- Pas d'import de Prisma hors des repositories.
- Pas de tracking synchrone dans le hot path de redirection.
- Pas d'appel aux services métier depuis le worker (il a son propre repository).
- Pas de sur-engineering : préférer la solution simple et lisible.
