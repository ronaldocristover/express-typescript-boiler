# Express TypeScript Project – Comprehensive Improvement Plan (AI-Readable)

FORMAT NOTES

- This document is structured for both human and AI agents.
- All actionable items reside in TASKS sections with machine-readable YAML.
- Fields:  
  id: unique task id  
  category: high-level bucket  
  subgroup: finer grouping  
  title: short description  
  description: what & why  
  rationale: business / technical reason  
  priority: critical | high | medium | low  
  effort: XS | S | M | L | XL (relative)  
  dependencies: array of task ids  
  blocking: true if currently blocked  
  status: pending | in_progress | done | dropped  
  owner: (fill later)  
  checklist: granular steps  
  deliverables: expected artifacts or outcomes  
  success_metrics: measurable validation  
  tags: free-form classification

---

## 1. MASTER INDEX

| Category           | Subgroups                                  |
| ------------------ | ------------------------------------------ |
| performance        | database, caching, request_pipeline        |
| security           | auth, headers, rate_limit, env, validation |
| code_quality       | typing, errors, logging, structure         |
| api                | pagination, responses, versioning, docs    |
| testing_monitoring | tests, health, metrics                     |
| devops             | docker, ci_cd, deployment                  |
| documentation      | readme, code_comments                      |
| operations         | observability, graceful_shutdown           |

---

## 2. GLOBAL ASSUMPTIONS

- Runtime: Node.js 18+
- DB: MySQL (Prisma ORM)
- Auth: Planned JWT
- Cache: Planned Redis
- Deployment: PM2 (current), Docker target
- Target Non-Functional Goals:
  - P95 API latency < 150ms (uncached read)
  - Error rate < 0.5% over rolling 24h
  - Cold start < 2s
  - Test coverage (lines) ≥ 70%

---

## 3. TASKS (YAML SECTIONS)

### 3.1 Performance

```yaml
tasks:
  - id: PERF_DB_POOL
    category: performance
    subgroup: database
    title: Configure Prisma connection pooling
    description: Add connection limit, timeout, logging modes to Prisma client initialization.
    rationale: Prevent resource exhaustion & improve throughput under concurrency.
    priority: high
    effort: S
    dependencies: []
    blocking: false
    status: pending
    checklist:
      - Add query params (?connection_limit=10&pool_timeout=20&socket_timeout=60) or use provider-level tuning
      - Expose POOL_* env vars for future tuning
      - Document defaults in README
    deliverables:
      - Updated src/application/database.ts
      - README tuning section
    success_metrics:
      - Sustained 200 RPS without connection saturation in load test
    tags: [prisma, database, pooling]

  - id: PERF_DB_INDEXES
    category: performance
    subgroup: database
    title: Add strategic DB indexes
    description: Index email, is_active, created_at in User table.
    rationale: Reduce query scan time for lookups, filtering, and pagination.
    priority: medium
    effort: S
    dependencies: []
    blocking: false
    status: pending
    checklist:
      - Update prisma/schema.prisma with @@index
      - Run npx prisma migrate dev
      - Validate query plan EXPLAIN
    deliverables:
      - Migration file
      - Updated schema.prisma
    success_metrics:
      - SELECT by email < 5ms (local)
    tags: [indexing, prisma, sql]

  - id: PERF_SELECT_MIN
    category: performance
    subgroup: database
    title: Use selective field projection
    description: Replace findMany returning full entities with select minimal fields.
    rationale: Reduce data transfer & serialization overhead.
    priority: high
    effort: XS
    dependencies: []
    blocking: false
    status: pending
    checklist:
      - Audit repositories
      - Add select for non-sensitive fields
      - Ensure password never leaks
    deliverables:
      - Updated repository methods
    success_metrics:
      - Response payload size reduced >30% for /users
    tags: [optimization]

  - id: PERF_PAGINATION
    category: performance
    subgroup: database
    title: Implement pagination (skip/take)
    description: Add page & limit support to user listing.
    rationale: Avoid full table scans & large memory usage.
    priority: critical
    effort: S
    dependencies: []
    blocking: false
    status: pending
    checklist:
      - Add query params page, limit
      - Validate limit bounds (1–100)
      - Return total & total_page
    deliverables:
      - Service + controller updates
      - API docs update
    success_metrics:
      - List endpoint memory stable with 10k rows
    tags: [pagination]

  - id: PERF_CURSOR_PLAN
    category: performance
    subgroup: database
    title: Plan cursor-based pagination (future)
    description: Introduce cursor pagination for large datasets to improve consistency.
    rationale: Better performance & reliability under concurrent inserts/deletes.
    priority: low
    effort: M
    dependencies: [PERF_PAGINATION]
    blocking: false
    status: pending
    checklist:
      - Decide key (created_at, id)
      - Add API contract
      - Implement fallback to offset
    deliverables:
      - Design doc
    success_metrics:
      - Cursor queries avoid OFFSET cost at 100k rows
    tags: [future]

  - id: PERF_CACHE_LAYER
    category: performance
    subgroup: caching
    title: Introduce Redis caching for GET /users/:id
    description: Cache user lookups with TTL & invalidation on write.
    rationale: Reduce DB load for hot keys.
    priority: medium
    effort: M
    dependencies: [SEC_ENV_REVIEW]
    blocking: false
    status: pending
    checklist:
      - Install redis client
      - Add cache service abstraction
      - Wrap repository read path
      - Add invalidation on update/delete
    deliverables:
      - src/services/cache.service.ts
      - Configurable TTL env
    success_metrics:
      - Cache hit ratio > 60% after warm
    tags: [redis, caching]

  - id: PERF_REQUEST_LIMITS
    category: performance
    subgroup: request_pipeline
    title: Configure request body size limits
    description: Restrict JSON & URL-encoded parser limits to 1MB.
    rationale: Prevent large payload abuse impacting memory.
    priority: high
    effort: XS
    dependencies: []
    blocking: false
    status: pending
    checklist:
      - Update app.ts express.json/express.urlencoded
      - Add test with >1MB rejection
    deliverables:
      - app.ts update
    success_metrics:
      - Oversized request returns 413
    tags: [hardening]

  - id: PERF_REQUEST_ID
    category: performance
    subgroup: request_pipeline
    title: Add request correlation ID middleware
    description: Generate/propagate X-Request-ID and log timings.
    rationale: Improves traceability & latency analysis.
    priority: high
    effort: S
    dependencies: [LOGGING_SETUP]
    blocking: false
    status: pending
    checklist:
      - Middleware create/gather header
      - Append to logs
      - Document in README
    deliverables:
      - request-context.middleware.ts
    success_metrics:
      - 100% responses include X-Request-ID
    tags: [observability]
```

### 3.2 Security

```yaml
tasks:
  - id: SEC_ERROR_MW
    category: security
    subgroup: middleware
    title: Enable error middleware
    description: Uncomment and ensure central error handler is registered last.
    rationale: Prevent raw error leaks & stack traces in production.
    priority: critical
    effort: XS
    dependencies: []
    blocking: false
    status: pending
    checklist:
      - Uncomment import & use
      - Ensure order after routes
      - Add environment-based response format
    deliverables:
      - app.ts updated
    success_metrics:
      - Uncaught route error returns sanitized JSON
    tags: [error-handling]

  - id: SEC_AUTH_ENABLE
    category: security
    subgroup: auth
    title: Enable auth middleware (JWT)
    description: Activate and implement token validation path.
    rationale: Protect endpoints from unauthorized access.
    priority: critical
    effort: M
    dependencies: [SEC_ENV_REVIEW]
    blocking: false
    status: pending
    checklist:
      - Add JWT_SECRET validation
      - Implement sign/verify helper
      - Protect /users except POST (register)
    deliverables:
      - auth-middleware.ts
      - token utility
    success_metrics:
      - Unauthorized access returns 401
    tags: [jwt, auth]

  - id: SEC_HELMET
    category: security
    subgroup: headers
    title: Add helmet security headers
    description: Integrate helmet with minimal CSP config (phase 1).
    rationale: Mitigate common browser-based risks.
    priority: high
    effort: XS
    dependencies: []
    blocking: false
    status: pending
    checklist:
      - Install helmet
      - Add to app.ts early
      - Document override strategy
    deliverables:
      - app.ts update
    success_metrics:
      - Security headers visible in curl -I
    tags: [headers]

  - id: SEC_RATE_LIMIT
    category: security
    subgroup: rate_limit
    title: Add express-rate-limit
    description: Basic IP-based throttle for common abuse protection.
    rationale: Reduces brute-force & flood risk.
    priority: high
    effort: S
    dependencies: []
    blocking: false
    status: pending
    checklist:
      - Create middleware file
      - Apply to auth-sensitive routes
      - Configurable via env
    deliverables:
      - rate-limit.middleware.ts
    success_metrics:
      - Exceeding threshold returns 429
    tags: [ddos, throttle]

  - id: SEC_ENV_REVIEW
    category: security
    subgroup: env
    title: Secure environment variable management
    description: Remove .env from VCS; add .env.example and zod validation.
    rationale: Prevent secret leakage; early failure on misconfig.
    priority: critical
    effort: S
    dependencies: []
    blocking: false
    status: pending
    checklist:
      - git rm --cached .env
      - Add .env.example
      - Implement env.validation.ts
      - Fail fast on invalid config
    deliverables:
      - env.validation.ts
      - Updated README
    success_metrics:
      - App exits with code !=0 on malformed env
    tags: [configuration]

  - id: SEC_INPUT_VALIDATION
    category: security
    subgroup: validation
    title: Add Zod validation layer
    description: Validate and sanitize incoming payloads for user endpoints.
    rationale: Prevent malformed data & injection vectors.
    priority: high
    effort: M
    dependencies: [SEC_ENV_REVIEW]
    blocking: false
    status: pending
    checklist:
      - Create schemas (user create/update)
      - Generic validation middleware
      - Hook into controllers pre-service
    deliverables:
      - validations folder
    success_metrics:
      - Invalid input returns 400 with errors[]
    tags: [validation]

  - id: SEC_PASSWORD_HASH
    category: security
    subgroup: auth
    title: Hash user passwords using bcrypt
    description: Apply hashing on create/update password operations.
    rationale: Protect credential confidentiality.
    priority: high
    effort: S
    dependencies: [SEC_INPUT_VALIDATION]
    blocking: false
    status: pending
    checklist:
      - Add bcrypt dependency
      - Abstract hash & compare helpers
      - Exclude password from responses
    deliverables:
      - password util
    success_metrics:
      - DB password field not plain text
    tags: [credentials]

  - id: SEC_CORS_CONFIG
    category: security
    subgroup: headers
    title: Implement controlled CORS
    description: Restrict origins based on ALLOWED_ORIGINS env variable.
    rationale: Reduce cross-origin attack surface.
    priority: medium
    effort: S
    dependencies: [SEC_ENV_REVIEW]
    blocking: false
    status: pending
    checklist:
      - Add cors middleware
      - Parse env list
      - Unit test for allowed vs blocked origin
    deliverables:
      - app.ts update
    success_metrics:
      - Disallowed origin blocked
    tags: [cors]
```

### 3.3 Code Quality & Type Safety

```yaml
tasks:
  - id: CODE_ID_TYPE_FIX
    category: code_quality
    subgroup: typing
    title: Fix user ID type usage
    description: Remove parseInt usage; treat IDs as string UUID consistently.
    rationale: Prevent runtime errors & incorrect DB queries.
    priority: critical
    effort: XS
    dependencies: []
    blocking: false
    status: pending
    checklist:
      - Audit controllers/services for parseInt
      - Update tests accordingly
    deliverables:
      - Refactored controllers
    success_metrics:
      - No TypeScript warnings on ID usage
    tags: [typing]

  - id: CODE_DTOS
    category: code_quality
    subgroup: typing
    title: Introduce DTO interfaces
    description: Add CreateUserDTO, UpdateUserDTO, UserResponse types.
    rationale: Clarify boundaries & reduce any usage.
    priority: high
    effort: S
    dependencies: [CODE_ID_TYPE_FIX]
    blocking: false
    status: pending
    checklist:
      - types/user.types.ts created
      - Replace inline shapes
    deliverables:
      - types file
    success_metrics:
      - 0 any types in service layer
    tags: [dto]

  - id: CODE_REMOVE_ANY
    category: code_quality
    subgroup: typing
    title: Eliminate any from service & repository
    description: Replace with Prisma types or DTOs.
    rationale: Compile-time safety & IDE assistance.
    priority: high
    effort: S
    dependencies: [CODE_DTOS]
    blocking: false
    status: pending
    checklist:
      - Run tsc --noEmit to verify
    deliverables:
      - Updated service/repository
    success_metrics:
      - tsc passes with strict mode (planned)
    tags: [type-safety]

  - id: CODE_ERROR_STANDARD
    category: code_quality
    subgroup: errors
    title: Standardize error propagation
    description: Use next(error) consistently; central formatting.
    rationale: Predictable error responses & logging.
    priority: high
    effort: S
    dependencies: [SEC_ERROR_MW]
    blocking: false
    status: pending
    checklist:
      - Audit all controllers
      - Remove ad-hoc res.status in catch
    deliverables:
      - Controller updates
    success_metrics:
      - Single error middleware handles all
    tags: [error-handling]

  - id: CODE_LOGGING_SETUP
    category: code_quality
    subgroup: logging
    title: Implement structured logger (winston/pino)
    description: Provide JSON logs with level, timestamp, requestId.
    rationale: Enables ingestion by log systems & correlation.
    priority: high
    effort: S
    dependencies: []
    blocking: false
    status: pending
    checklist:
      - Create logging module
      - Replace console.* calls
      - Add environment level config
    deliverables:
      - logging.ts
    success_metrics:
      - All logs structured JSON
    tags: [observability]

  - id: CODE_RESPONSE_WRAPPER
    category: code_quality
    subgroup: structure
    title: Standard API response envelope
    description: Use ApiResponse<T> with success/message/data/errors/paging.
    rationale: Consistent client consumption & tooling.
    priority: medium
    effort: S
    dependencies: [CODE_DTOS]
    blocking: false
    status: pending
    checklist:
      - Define interface
      - Update controllers to wrap responses
    deliverables:
      - types/api-response.ts
    success_metrics:
      - All endpoints conform (manual audit)
    tags: [api-design]
```

### 3.4 API Layer

```yaml
tasks:
  - id: API_PAGINATION_IMPL
    category: api
    subgroup: pagination
    title: Implement list pagination (service + controller)
    description: Provide page, limit, total, total_page in response.
    rationale: Prevent unbounded payloads & enable UI pagination.
    priority: high
    effort: S
    dependencies: [PERF_PAGINATION]
    blocking: false
    status: pending
    checklist:
      - Parse query params
      - Validate ranges
      - Include in response wrapper
    deliverables:
      - Updated user service + controller
    success_metrics:
      - Response includes paging object
    tags: [pagination]

  - id: API_VERSIONING
    category: api
    subgroup: versioning
    title: Namespace routes under /api/v1
    description: Introduce version root to support future breaking changes.
    rationale: Backwards compatibility strategy.
    priority: low
    effort: XS
    dependencies: []
    blocking: false
    status: pending
    checklist:
      - Add router prefix
      - Update tests
      - Document migration notes
    deliverables:
      - routes/v1/*
    success_metrics:
      - Old root returns redirect or 404 (decision)
    tags: [versioning]

  - id: API_SWAGGER
    category: api
    subgroup: docs
    title: Integrate OpenAPI (swagger-jsdoc + swagger-ui)
    description: Generate interactive API docs served under /docs.
    rationale: Improves consumer onboarding & consistency.
    priority: medium
    effort: M
    dependencies: [API_PAGINATION_IMPL, CODE_RESPONSE_WRAPPER]
    blocking: false
    status: pending
    checklist:
      - Add swagger config
      - Annotate routes
      - Add CI validation step (optional)
    deliverables:
      - openapi.json generation
    success_metrics:
      - /docs accessible & valid spec
    tags: [documentation]
```

### 3.5 Testing & Monitoring

```yaml
tasks:
  - id: TEST_DB_ISOLATION
    category: testing_monitoring
    subgroup: tests
    title: Use dedicated test database
    description: Separate test DB with isolated migrations.
    rationale: Prevent data pollution & reduce flaky tests.
    priority: high
    effort: M
    dependencies: [SEC_ENV_REVIEW]
    blocking: false
    status: pending
    checklist:
      - Add TEST_DATABASE_URL
      - Add script for prisma migrate deploy (test)
      - Clear tables between tests
    deliverables:
      - jest setup file (if using Jest)
    success_metrics:
      - Tests pass consistently across runs
    tags: [testing]

  - id: TEST_FACTORIES
    category: testing_monitoring
    subgroup: tests
    title: Introduce test data factories
    description: Provide consistent & reusable entity builders.
    rationale: Reduce duplication & improve clarity.
    priority: medium
    effort: S
    dependencies: [TEST_DB_ISOLATION]
    blocking: false
    status: pending
    checklist:
      - Create factories/user.factory.ts
      - Use in integration tests
    deliverables:
      - factory files
    success_metrics:
      - Reduced boilerplate lines per test
    tags: [factories]

  - id: TEST_COVERAGE_TARGET
    category: testing_monitoring
    subgroup: tests
    title: Establish and enforce coverage thresholds
    description: Add coverage config (lines ≥70% start).
    rationale: Baseline quality gate.
    priority: medium
    effort: S
    dependencies: [TEST_DB_ISOLATION]
    blocking: false
    status: pending
    checklist:
      - Configure coverage in test runner
      - Add CI step fail under threshold
    deliverables:
      - Updated package scripts
    success_metrics:
      - CI fails if coverage below threshold
    tags: [quality-gate]

  - id: MON_HEALTH_ENDPOINT
    category: testing_monitoring
    subgroup: monitoring
    title: Add /health endpoint
    description: Lightweight readiness & liveness check.
    rationale: Supports uptime monitoring & orchestration.
    priority: high
    effort: XS
    dependencies: []
    blocking: false
    status: pending
    checklist:
      - Return status: ok & timestamp
      - Optionally add build/version
    deliverables:
      - routes/health.route.ts
    success_metrics:
      - 200 <10ms
    tags: [healthcheck]

  - id: MON_METRICS_PLAN
    category: testing_monitoring
    subgroup: monitoring
    title: Plan metrics instrumentation
    description: Evaluate prom-client for HTTP duration & error counters.
    rationale: Observability for scaling decisions.
    priority: low
    effort: M
    dependencies: [PERF_REQUEST_ID]
    blocking: false
    status: pending
    checklist:
      - Decide metric names
      - Add /metrics guarded endpoint
    deliverables:
      - metrics module
    success_metrics:
      - Prometheus scrape success
    tags: [metrics]
```

### 3.6 DevOps

```yaml
tasks:
  - id: DEVOPS_DOCKER
    category: devops
    subgroup: containerization
    title: Create Dockerfile & .dockerignore
    description: Containerize app with multi-stage build.
    rationale: Consistent deployment environment.
    priority: medium
    effort: M
    dependencies: [SEC_ENV_REVIEW]
    blocking: false
    status: pending
    checklist:
      - Multi-stage build (builder → runtime)
      - Install only prod deps in final
      - Healthcheck layer optional
    deliverables:
      - Dockerfile
    success_metrics:
      - Image size < 300MB (target)
    tags: [docker]

  - id: DEVOPS_COMPOSE
    category: devops
    subgroup: containerization
    title: Add docker-compose for local stack
    description: Compose services: app, db, redis.
    rationale: Simplify onboarding & parity.
    priority: low
    effort: S
    dependencies: [DEVOPS_DOCKER]
    blocking: false
    status: pending
    checklist:
      - Services with volumes
      - .env usage
    deliverables:
      - docker-compose.yml
    success_metrics:
      - One command local up
    tags: [local-dev]

  - id: DEVOPS_CI_PIPELINE
    category: devops
    subgroup: ci_cd
    title: Implement GitHub Actions CI
    description: Lint, test, build steps with caching.
    rationale: Automate quality gates.
    priority: high
    effort: M
    dependencies: [TEST_DB_ISOLATION, CODE_REMOVE_ANY]
    blocking: false
    status: pending
    checklist:
      - Node setup with pnpm/npm cache
      - Run prisma generate
      - Run tests + coverage
      - Optional security scan (npm audit)
    deliverables:
      - .github/workflows/ci.yml
    success_metrics:
      - CI duration < 5 min
    tags: [github-actions]

  - id: DEVOPS_GRACEFUL_SHUTDOWN
    category: devops
    subgroup: runtime
    title: Add graceful shutdown handlers
    description: Capture SIGTERM & close server + prisma disconnect.
    rationale: Prevent dropped connections & data inconsistency.
    priority: medium
    effort: S
    dependencies: []
    blocking: false
    status: pending
    checklist:
      - Add process listeners
      - Timeout safeguard
    deliverables:
      - server bootstrap update
    success_metrics:
      - No open handle warnings on exit
    tags: [stability]
```

### 3.7 Documentation

```yaml
tasks:
  - id: DOC_README_UPDATE
    category: documentation
    subgroup: readme
    title: Expand README with setup & usage
    description: Document environment, scripts, architecture overview.
    rationale: Accelerates onboarding.
    priority: medium
    effort: M
    dependencies: [SEC_ENV_REVIEW, DEVOPS_DOCKER]
    blocking: false
    status: pending
    checklist:
      - Add quick start
      - Add env var table
      - Add API reference pointer
    deliverables:
      - README.md updated
    success_metrics:
      - Internal dev feedback positive
    tags: [docs]

  - id: DOC_API_REFERENCE
    category: documentation
    subgroup: api_docs
    title: Generate API reference
    description: Use Swagger/OpenAPI output + narrative.
    rationale: Consumer clarity.
    priority: medium
    effort: M
    dependencies: [API_SWAGGER]
    blocking: false
    status: pending
    checklist:
      - Export openapi.json
      - Link in README
    deliverables:
      - docs/openapi.json
    success_metrics:
      - Validated by swagger-cli
    tags: [api]

  - id: DOC_CODE_COMMENTS
    category: documentation
    subgroup: code_comments
    title: Add JSDoc to public modules
    description: Document service methods & complex logic.
    rationale: Maintenance ease.
    priority: low
    effort: M
    dependencies: [CODE_DTOS]
    blocking: false
    status: pending
    checklist:
      - Services
      - Repositories
      - Middleware
    deliverables:
      - JSDoc annotations
    success_metrics:
      - IDE intellisense shows descriptions
    tags: [maintainability]
```

### 3.8 Operations / Observability

```yaml
tasks:
  - id: OBS_LOG_LEVEL_POLICY
    category: operations
    subgroup: logging
    title: Define log level policy
    description: Set level per environment (debug in dev, info in prod).
    rationale: Noise control & cost reduction.
    priority: medium
    effort: XS
    dependencies: [CODE_LOGGING_SETUP]
    blocking: false
    status: pending
    checklist:
      - Map env → level
      - Document in README
    deliverables:
      - Logging config
    success_metrics:
      - Prod logs < specified volume quota
    tags: [observability]

  - id: OBS_ERROR_TRACKING_PLAN
    category: operations
    subgroup: monitoring
    title: Plan error tracking integration (Sentry)
    description: Decide if external service needed; design integration.
    rationale: Faster incident response.
    priority: low
    effort: S
    dependencies: [SEC_ERROR_MW]
    blocking: false
    status: pending
    checklist:
      - Evaluate cost
      - Add DSN env placeholder
    deliverables:
      - Design note
    success_metrics:
      - Captured stack trace for test error
    tags: [sentry]
```

---

## 4. PRIORITY SUMMARY (FLAT LIST)

```yaml
critical:
  - PERF_PAGINATION
  - SEC_ERROR_MW
  - SEC_AUTH_ENABLE
  - SEC_ENV_REVIEW
  - CODE_ID_TYPE_FIX
high:
  - PERF_DB_POOL
  - PERF_SELECT_MIN
  - PERF_REQUEST_LIMITS
  - PERF_REQUEST_ID
  - SEC_HELMET
  - SEC_RATE_LIMIT
  - SEC_INPUT_VALIDATION
  - SEC_PASSWORD_HASH
  - CODE_DTOS
  - CODE_REMOVE_ANY
  - CODE_ERROR_STANDARD
  - CODE_LOGGING_SETUP
  - API_PAGINATION_IMPL
  - TEST_DB_ISOLATION
  - MON_HEALTH_ENDPOINT
  - DEVOPS_CI_PIPELINE
medium:
  - PERF_DB_INDEXES
  - PERF_CACHE_LAYER
  - SEC_CORS_CONFIG
  - CODE_RESPONSE_WRAPPER
  - API_SWAGGER
  - TEST_FACTORIES
  - TEST_COVERAGE_TARGET
  - DEVOPS_DOCKER
  - DEVOPS_GRACEFUL_SHUTDOWN
  - DOC_README_UPDATE
  - DOC_API_REFERENCE
  - OBS_LOG_LEVEL_POLICY
low:
  - PERF_CURSOR_PLAN
  - API_VERSIONING
  - MON_METRICS_PLAN
  - DEVOPS_COMPOSE
  - DOC_CODE_COMMENTS
  - OBS_ERROR_TRACKING_PLAN
```

---

## 5. EXECUTION ORDER (PROPOSED PHASES)

Phase 1 (Stability & Safety): SEC_ENV_REVIEW, CODE_ID_TYPE_FIX, SEC_ERROR_MW, SEC_INPUT_VALIDATION, SEC_PASSWORD_HASH, PERF_PAGINATION, CODE_DTOS, CODE_REMOVE_ANY  
Phase 2 (Security & Observability): SEC_AUTH_ENABLE, SEC_HELMET, SEC_RATE_LIMIT, CODE_LOGGING_SETUP, PERF_REQUEST_ID, PERF_SELECT_MIN  
Phase 3 (Performance & API): PERF_DB_POOL, API_PAGINATION_IMPL, CODE_RESPONSE_WRAPPER, PERF_REQUEST_LIMITS, MON_HEALTH_ENDPOINT, TEST_DB_ISOLATION  
Phase 4 (DevOps & Caching): DEVOPS_CI_PIPELINE, PERF_CACHE_LAYER, PERF_DB_INDEXES, DEVOPS_GRACEFUL_SHUTDOWN, DEVOPS_DOCKER  
Phase 5 (Documentation & Expansion): API_SWAGGER, DOC_README_UPDATE, TEST_FACTORIES, TEST_COVERAGE_TARGET, SEC_CORS_CONFIG  
Phase 6 (Future Enhancements): API_VERSIONING, PERF_CURSOR_PLAN, MON_METRICS_PLAN, DEVOPS_COMPOSE, DOC_CODE_COMMENTS, OBS_ERROR_TRACKING_PLAN

---

## 6. RISK REGISTER (ABBREVIATED)

| Risk                      | Impact   | Mitigation           |
| ------------------------- | -------- | -------------------- |
| Missing env validation    | High     | SEC_ENV_REVIEW early |
| Password stored plaintext | Critical | SEC_PASSWORD_HASH    |
| Unbounded list query      | High     | PERF_PAGINATION      |
| Inconsistent ID parsing   | Medium   | CODE_ID_TYPE_FIX     |
| Lack of auth              | Critical | SEC_AUTH_ENABLE      |

---

## 7. METRIC DEFINITIONS

- latency_p95_ms: 95th percentile request duration by route
- error_rate_pct: (5xx responses / total) \* 100 (rolling 15m)
- cache_hit_ratio: hits / (hits + misses) for Redis
- coverage_lines_pct: test coverage lines
- build_time_sec: CI end-to-end duration

---

## 8. GLOSSARY

- DTO: Data Transfer Object
- RPS: Requests Per Second
- TTL: Time To Live (cache)
- CSP: Content Security Policy
- CI/CD: Continuous Integration / Continuous Delivery

---

## 9. NEXT ACTION SNAPSHOT (TOP 10)

1. Remove .env from repo (SEC_ENV_REVIEW)
2. Enable error middleware (SEC_ERROR_MW)
3. Fix ID type usage (CODE_ID_TYPE_FIX)
4. Add pagination logic (PERF_PAGINATION)
5. Add validation schemas (SEC_INPUT_VALIDATION)
6. Hash passwords (SEC_PASSWORD_HASH)
7. Introduce DTOs (CODE_DTOS)
8. Remove any usage (CODE_REMOVE_ANY)
9. Add structured logging (CODE_LOGGING_SETUP)
10. Add request correlation (PERF_REQUEST_ID)

---

## 10. CHANGE LOG (Initialize)

```yaml
changelog:
  - version: 0.1.0
    date: YYYY-MM-DD
    notes: Initial improvement plan created.
```

END OF PLAN
