# 🏆 10/10 ARCHITECTURE REDESIGN — OmniStudio AI

> **Goal:** Transform from 5/10 Monolithic to 10/10 Production-Grade System
> **Patterns:** Clean Architecture (Hexagonal) + CQRS + Event-Driven + Outbox + Saga
> **Target:** 99.9% Uptime, 10k concurrent users, 0 data loss, 0 security breaches

---

## 📊 Current Score vs Target Score Breakdown

| Architecture Dimension | Current (5/10) | Target (10/10) |
|------------------------|---------------|----------------|
| **Modularity / Cohesion** | 4/10 (Routers fat, services intertwined) | 10/10 |
| **Coupling** | 4/10 (Direct imports everywhere) | 10/10 |
| **Testability** | 2/10 (No DI, no mocks possible) | 10/10 |
| **Scalability** | 3/10 (All in one process, no workers) | 10/10 |
| **Resilience** | 3/10 (No retry, no circuit breaker) | 10/10 |
| **Observability** | 1/10 (print statements only) | 10/10 |
| **Data Consistency** | 3/10 (Dual-write no saga) | 10/10 |
| **Security Architecture** | 2/10 (No zero trust) | 10/10 |
| **Frontend Architecture** | 5/10 (No state management, no feature slices) | 10/10 |
| **Deployment Strategy** | 5/10 (Basic compose, no k8s manifests) | 10/10 |

---

## ════════════════════════════════════════════════════════
## 🏗️ LAYER 1: CLEAN ARCHITECTURE (HEXAGONAL) — FOUNDATION
## ════════════════════════════════════════════════════════

```
backend/
├── domain/                      ← INNERMOST (No external dependencies, pure Python)
│   ├── entities/                ← Pure data classes (not ORM models!)
│   │   ├── asset.py             ← Asset entity (domain language, NOT db schema)
│   │   ├── generation.py        ← Generation entity
│   │   ├── project.py           ← Project aggregate root
│   │   ├── user.py              ← User entity
│   │   └── studio_settings.py   ← Settings value objects
│   ├── value_objects/           ← Immutable types (ULID, Money, AssetType)
│   │   ├── asset_id.py
│   │   ├── money.py             ← USD/INR with currency math
│   │   ├── ulid.py              ← ULID (sortable UUID replacement)
│   │   └── asset_type.py        ← Enum + validation
│   ├── repositories/            ← INTERFACES (ports) — NOT implementations!
│   │   ├── i_asset_repository.py
│   │   ├── i_project_repository.py
│   │   ├── i_generation_repository.py
│   │   ├── i_settings_repository.py
│   │   └── i_storage_repository.py
│   ├── services/                ← Domain services (business rules only)
│   │   ├── cost_calculator.py   ← Pure calculation logic (no IO)
│   │   ├── prompt_composer.py   ← Pure prompt assembly logic
│   │   └── media_policies.py    ← Upload rules, file type validation (pure)
│   ├── events/                  ← Domain events (plain objects)
│   │   ├── asset_created_event.py
│   │   ├── generation_completed_event.py
│   │   ├── project_finished_event.py
│   │   └── settings_changed_event.py
│   └── exceptions/              ← Domain-specific exceptions
│       ├── domain_error.py      ← Base class (NOT HTTP!)
│       ├── asset_not_found.py
│       └── quota_exceeded.py
│
├── application/                 ← USE CASES (Orchestrators, no business logic)
│   ├── use_cases/
│   │   ├── commands/            ← CQRS: WRITE side
│   │   │   ├── generate_image/
│   │   │   │   ├── generate_image_command.py
│   │   │   │   ├── generate_image_handler.py
│   │   │   │   └── generate_image_response.py
│   │   │   ├── generate_video/
│   │   │   ├── run_pipeline/
│   │   │   ├── update_settings/
│   │   │   ├── delete_asset/
│   │   │   └── trash_asset/
│   │   └── queries/             ← CQRS: READ side
│   │       ├── get_vault_summary/
│   │       ├── get_generation_history/
│   │       ├── get_usage_metrics/
│   │       └── get_project_by_id/
│   ├── ports/                   ← Application-level interfaces
│   │   ├── i_event_bus.py       ← Pub/Sub abstraction
│   │   ├── i_unit_of_work.py    ← Transaction boundary
│   │   ├── i_cache.py           ← Cache abstraction
│   │   └── i_external_provider.py  ← AI provider interface
│   ├── dto/                     ← Data Transfer Objects (API contracts)
│   │   ├── requests/
│   │   └── responses/
│   └── bevy/                    ← DI container (dependency injection)
│       └── container.py         ← Wires ALL interfaces to implementations
│
├── infrastructure/              ← OUTERMOST (All external tech details)
│   ├── db/
│   │   ├── models/              ← SQLAlchemy ORM models (NOT domain entities!)
│   │   │   ├── asset_model.py
│   │   │   ├── project_model.py
│   │   │   └── generation_model.py
│   │   ├── repositories/        ← Implement domain.repository interfaces
│   │   │   ├── sqlite_asset_repository.py
│   │   │   ├── supabase_project_repository.py
│   │   │   └── postgres_unit_of_work.py
│   │   ├── migrations/          ← Alembic migrations (proper versioning!)
│   │   │   ├── versions/
│   │   │   └── env.py
│   │   └── outbox/              ← Transactional Outbox Pattern
│   │       └── outbox_writer.py  ← Writes events to DB OUTBOX table atomically
│   ├── ai_providers/            ← Implement i_external_provider
│   │   ├── openai_provider.py
│   │   ├── elevenlabs_provider.py
│   │   ├── replicate_provider.py
│   │   ├── gemini_provider.py
│   │   └── edge_tts_provider.py
│   ├── storage/                 ← Implement i_storage_repository
│   │   ├── r2_storage.py        ← Cloudflare R2
│   │   ├── local_fs_storage.py  ← Local filesystem
│   │   └── storage_router.py    ← Policy-based routing
│   ├── cache/                   ← Implement i_cache
│   │   ├── redis_cache.py
│   │   └── memory_cache.py      ← Fallback for dev
│   ├── events/                  ← Event infra
│   │   ├── redis_event_bus.py   ← Pub/Sub via Redis Streams
│   │   ├── outbox_relay.py      ← Polls OUTBOX → publishes to bus
│   │   └── handlers/            ← Event subscribers
│   │       ├── sync_asset_to_supabase_handler.py
│   │       ├── update_analytics_handler.py
│   │       └── notify_frontend_sse_handler.py
│   ├── auth/                    ← Auth infra
│   │   ├── jwt_validator.py
│   │   ├── api_key_validator.py
│   │   └── supabase_session_validator.py
│   └── resilience/              ← Cross-cutting patterns
│       ├── circuit_breaker.py   ← pybreaker wrapper
│       ├── retry_policy.py      ← tenacity policies per provider
│       └── rate_limiter.py      ← Limits (tenant/user/global tiers)
│
├── presentation/                ← FastAPI Layer (dumb — thin as possible)
│   ├── api/
│   │   ├── v1/                  ← Versioned API from day 1!
│   │   │   ├── image_routes.py  ← Only calls MediatR/Use Case Bus
│   │   │   ├── video_routes.py
│   │   │   ├── assets_routes.py
│   │   │   ├── pipeline_routes.py
│   │   │   ├── settings_routes.py
│   │   │   └── analytics_routes.py
│   │   └── dependencies.py      ← get_current_user, require_auth, etc.
│   └── schemas/                 ← Pydantic v2 (presentation layer only)
│       └── openapi_examples.py  ← Swagger UI examples
│
├── workers/                     ← Separate processes (NOT same as API!)
│   ├── media_worker.py          ← Image/Video heavy processing
│   ├── ai_worker.py             ← External API calls (provider rate limits)
│   ├── pipeline_worker.py       ← Long-running orchestration
│   ├── outbox_relay_worker.py   ← Outbox → Event Bus relay
│   └── cleanup_worker.py        ← Trash purging, orphan file GC
│
├── shared/                      ← Cross-cutting utilities
│   ├── logging/                 ← Structured JSON logs (python-json-logger)
│   │   └── setup.py             ← Request ID, User ID, Correlation ID propagation
│   ├── telemetry/               ← OpenTelemetry
│   │   ├── tracing.py           ← OTLP traces (Jaeger/Grafana Tempo)
│   │   └── metrics.py           ← Prometheus metrics (custom business metrics)
│   ├── health/                  ← Readiness/Liveness probes
│   │   └── checks.py            ← DB, Redis, R2, FFmpeg, AI provider health
│   ├── files/                   ← Safe path utils (from Phase 2)
│   └── ulid_generator.py        ← ULID factory (sortable unique IDs)
│
├── core/
│   ├── settings.py              ← Pydantic-settings + env validation
│   └── security.py              ← Fernet encryption for secrets at rest
│
└── main.py                      ← COMPOSITION ROOT ONLY (100 lines MAX)
```

---

## ════════════════════════════════════════════════════════
## 🧩 LAYER 2: DOMAIN-DRIVEN DESIGN (DDD) — CORE MODEL
## ════════════════════════════════════════════════════════

### 2.1 Project Aggregate Root (`domain/entities/project.py`)
```python
# THIS IS NOT AN ORM MODEL. This is pure Python, no dependencies.
from dataclasses import dataclass, field
from datetime import datetime
from typing import List
from shared.events import DomainEvent, EventRecorderMixin
from domain.value_objects import ProjectId, AssetId, ULID, Money
from domain.entities.asset import Asset
from domain.entities.generation import Generation

@dataclass
class Project(EventRecorderMixin):
    id: ProjectId
    title: str
    topic: str
    style: str = "cinematic"
    scenes_count: int = 1
    scenes: List[dict] = field(default_factory=list)
    assets: List[Asset] = field(default_factory=list)
    generations: List[Generation] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    status: str = "draft"

    # ---- BUSINESS RULES / INVARIANTS (100% pure, no IO) ----
    def mark_completed(self, final_asset: Asset):
        if self.status == "completed":
            raise DomainError("Project already completed")
        self.assets.append(final_asset)
        self.status = "completed"
        # Record domain event — this will be picked up by OUTBOX pattern
        self.record_event(ProjectFinishedEvent(
            project_id=str(self.id),
            final_asset_id=str(final_asset.id),
            scenes_count=self.scenes_count,
            total_cost=self.calculate_total_cost(),
        ))

    def calculate_total_cost(self) -> Money:
        total_usd = sum(g.cost_usd.amount for g in self.generations)
        return Money(amount=total_usd, currency="USD")

    def can_add_scene(self) -> bool:
        return self.scenes_count < 30  # Business invariant: max 30 scenes
```

### 2.2 Value Objects (Immutable, Validated at Construction)
```python
# domain/value_objects/money.py
from dataclasses import dataclass

USD_TO_INR = 83.50  # Will be replaced with live FX rate service call at boundaries

@dataclass(frozen=True)  # IMMUTABLE
class Money:
    amount: float
    currency: str = "USD"

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Money cannot be negative")
        if self.currency not in ("USD", "INR"):
            raise ValueError(f"Unsupported currency: {self.currency}")

    def convert_to(self, target_currency: str) -> "Money":
        if self.currency == target_currency:
            return self
        if self.currency == "USD" and target_currency == "INR":
            return Money(self.amount * USD_TO_INR, "INR")
        return Money(self.amount / USD_TO_INR, "USD")

    def __add__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            converted = other.convert_to(self.currency)
            return Money(self.amount + converted.amount, self.currency)
        return Money(self.amount + other.amount, self.currency)
```

---

## ════════════════════════════════════════════════════════
## 📝 LAYER 3: CQRS + MEDIATOR PATTERN (USE CASES)
## ════════════════════════════════════════════════════════

### 3.1 Command (Write) Example — Generate Image
```python
# application/use_cases/commands/generate_image/generate_image_handler.py
from application.ports.i_unit_of_work import IUnitOfWork
from application.ports.i_external_provider import IImageProvider
from application.ports.i_cache import ICache
from domain.entities.generation import Generation
from domain.value_objects import GenerationId, AssetId, Money
from domain.events import GenerationCompletedEvent
from infrastructure.resilience.retry_policy import with_ai_retry
from infrastructure.resilience.circuit_breaker import ai_provider_circuit

@dataclass
class GenerateImageHandler:
    # All dependencies INJECTED as interfaces — swappable, testable
    unit_of_work: IUnitOfWork
    image_provider: IImageProvider
    storage: IStorageRepository
    cache: ICache

    @with_ai_retry(max_attempts=3)  # Decoration pattern: resilience at boundary
    @ai_provider_circuit
    async def handle(self, command: GenerateImageCommand) -> GenerateImageResponse:
        # Step 1: Compose prompt (pure domain service — no IO)
        from domain.services.prompt_composer import compose_cinematic_prompt
        final_prompt = compose_cinematic_prompt(
            base_prompt=command.prompt,
            style=command.style,
            lens=command.lens,
            lighting=command.lighting,
        )

        # Step 2: Call external AI provider (through interface — mockable)
        image_bytes, provider_metadata = await self.image_provider.generate(
            prompt=final_prompt,
            model=command.model,
            size=command.size,
        )

        # Step 3: Persist storage (through interface — R2 OR local FS automatically)
        asset_id = AssetId.new()
        storage_url, local_path, size_bytes = await self.storage.save(
            content=image_bytes,
            asset_type="image",
            filename=f"{asset_id}.png",
        )

        # Step 4: Create generation record (domain entity with invariants)
        generation = Generation(
            id=GenerationId.new(),
            service_type="image",
            provider=command.model,
            model_used=provider_metadata.model_name,
            prompt=command.prompt,
            output_url=storage_url,
            cost_usd=provider_metadata.estimated_cost,
        )

        # Step 5: Atomic DB write + Event to OUTBOX table via Unit of Work
        #    (This automatically records GenerationCompletedEvent in OUTBOX,
        #     which outbox_relay_worker.py will pick up and fan out to subscribers)
        async with self.unit_of_work as uow:
            uow.generations.add(generation)
            uow.assets.create_from_generation(asset_id, generation, storage_url, local_path, size_bytes)
            # Any domain events on the entities are flushed to OUTBOX here
            await uow.commit_with_outbox()

        # Step 6: Invalidate relevant caches
        await self.cache.delete_pattern("vault:summary:*")

        # Step 7: Return DTO (NOT the domain entity — never leak internal model!)
        return GenerateImageResponse(
            asset_id=str(asset_id),
            url=storage_url,
            local_path=local_path,
            enhanced_prompt=final_prompt,
            estimated_cost=provider_metadata.estimated_cost.convert_to("INR"),
        )
```

### 3.2 Query (Read) Example — Usage Summary
```python
# application/use_cases/queries/get_usage_summary/get_usage_summary_handler.py
# QUERIES DON'T use Unit of Work or domain model — they are optimized for reading.
# This is CQRS separation: write-side = consistent + transactional
#                        read-side  = fast + de-normalized

@dataclass
class GetUsageSummaryHandler:
    read_db: Any  # Direct access to read replica (Supabase or materialized views)
    cache: ICache

    async def handle(self, query: GetUsageSummaryQuery) -> GetUsageSummaryResponse:
        # Cache-first pattern
        cache_key = f"usage:summary:{query.user_id}:{query.time_range}"
        cached = await self.cache.get(cache_key)
        if cached:
            return GetUsageSummaryResponse(**cached)

        # Raw SQL for performance (No ORM overhead for queries!)
        # This hits a MATERIALIZED VIEW refreshed every 5 minutes
        result = await self.read_db.fetch_all("""
            SELECT service_type,
                   COUNT(*) as count,
                   SUM(cost_usd) as spend_usd,
                   SUM(saved_usd) as savings_usd
              FROM analytics_rollup_view
             WHERE user_id = $1
               AND created_at >= NOW() - $2::interval
             GROUP BY service_type
        """, query.user_id, f"{query.days} days")

        response = self._build_response(result)
        await self.cache.setex(cache_key, 300, response.model_dump())  # 5-min TTL
        return response
```

---

## ════════════════════════════════════════════════════════
## 🔄 LAYER 4: EVENT-DRIVEN + OUTBOX + SAGA PATTERNS (10/10)
## ════════════════════════════════════════════════════════

### 4.1 Transactional Outbox Pattern (No More Dual-Write Bugs!)
```
PROBLEM SOLVED: Current code does:
   write to Supabase → (error?) → write to SQLite → (if error, print warning)
   Result: inconsistent state, impossible to recover, data drift.

SOLUTION:
   ┌──────────────────────────────────────────────────────────┐
   │ Unit of Work — ONE DATABASE TRANSACTION                 │
   │                                                          │
   │  BEGIN;                                                  │
   │    INSERT INTO generations (...);                        │
   │    INSERT INTO assets (...);                             │
   │    INSERT INTO outbox (   ← ATOMIC with business data!  │
   │        id, event_type, payload, status, created_at      │
   │    ) VALUES (                                            │
   │        'evt_01HFTA...', 'GenerationCompleted', {...},   │
   │        'PENDING', NOW()                                 │
   │    );                                                    │
   │  COMMIT; ───────────────── 100% atomic, no data loss    │
   └──────────────────────────────────────────────────────────┘
                       │
                       ▼
          ┌─────────────────────────────┐
          │ outbox_relay_worker.py      │  (separate process!)
          │ Runs every 1s, polls:       │
          │   SELECT * FROM outbox      │
          │    WHERE status = 'PENDING' │
          │    ORDER BY created_at ASC  │
          │   LIMIT 100;                │
          │ Publishes to Redis Streams  │
          │ Sets status = 'PUBLISHED'   │
          └─────────────────────────────┘
                       │
         ┌─────────────┼─────────────┬─────────────────┐
         ▼             ▼             ▼                 ▼
    Subscriber 1  Subscriber 2  Subscriber 3    Subscriber 4
 (Sync Supabase) (Analytics)  (Frontend SSE)   (Webhooks)
    (Eventual!)   (Eventual!)   (Real-time)    (Eventual!)
```

### 4.2 Saga Pattern: Long-Running Pipeline (5+ Minutes)
```
PROBLEM SOLVED: Current pipeline.py has a 300-line for loop in HTTP handler.
If scene 2 of 8 fails, you can't resume — you start over.

SOLUTION: Saga Orchestrator pattern with steps persisted to DB:

Saga: GenerateFullMovieSaga
ID: saga_01HFTAG4XY8R3K7N1Z9W
State: RUNNING (Step 3/24)

  STEP 1  [✓] generate_storyboard   id: step_001  status: SUCCESS
  STEP 2  [✓] enhance_prompts       id: step_002  status: SUCCESS
  STEP 3  [⏳] generate_image_scene3 id: step_003  status: RUNNING   ← Retry=2/3
  STEP 4  [ ] generate_video_scene3 id: step_004  status: PENDING
  STEP 5  [ ] generate_voice_scene3 id: step_005  status: PENDING
  STEP 6  [ ] merge_av_scene3       id: step_006  status: PENDING
  STEP 7  [ ] generate_image_scene4 id: step_007  status: PENDING
  ...
  STEP 24 [ ] concatenate_all       id: step_024  status: PENDING

Compensation Actions:
  If saga fails at step 12, compensate (rollback) in reverse:
    - delete uploaded R2 objects for scenes 3-12
    - mark project.status = "failed"
    - record GenerationFailedEvent for billing refund

Key Feature: RESUMABLE — if server crashes, restart and pick up from step 3!
```

---

## ════════════════════════════════════════════════════════
## 🧪 LAYER 5: DEPENDENCY INJECTION CONTAINER (BEVY)
## ════════════════════════════════════════════════════════

```python
# application/bevy/container.py
from di import Container, bind_by_type
from di.dependent import Dependent
from di.executors import AsyncExecutor

# ONE PLACE to wire everything up. No more imports between layers!
def build_container(env: str) -> Container:
    container = Container()

    # ---------- INFRASTRUCTURE ----------
    if env == "production":
        container.bind(bind_by_type(Dependent(PostgresUnitOfWork, scope="request"), IUnitOfWork))
        container.bind(bind_by_type(Dependent(RedisEventBus, scope="app"), IEventBus))
        container.bind(bind_by_type(Dependent(RedisCache, scope="app"), ICache))
        container.bind(bind_by_type(Dependent(R2Storage, scope="app"), IStorageRepository))
    else:  # dev/test — lightweight in-memory
        container.bind(bind_by_type(Dependent(SQLiteUnitOfWork, scope="request"), IUnitOfWork))
        container.bind(bind_by_type(Dependent(InMemoryEventBus, scope="app"), IEventBus))
        container.bind(bind_by_type(Dependent(InMemoryCache, scope="app"), ICache))
        container.bind(bind_by_type(Dependent(LocalFsStorage, scope="app"), IStorageRepository))

    # ---------- AI PROVIDERS (FACTORY — picks based on settings + key availability)----
    def image_provider_factory(settings, openai_p, replicate_p, gemini_p, mock_p) -> IImageProvider:
        return ProviderChain([
            (settings.GEMINI_API_KEY, gemini_p),
            (settings.OPENAI_API_KEY, openai_p),
            (settings.REPLICATE_API_TOKEN, replicate_p),
            (True, mock_p),  # ALWAYS fallback — never return KEY_MISSING error!
        ])
    container.bind(Dependent(image_provider_factory, scope="app"), IImageProvider)

    # ---------- USE CASES ----------
    container.bind(Dependent(GenerateImageHandler, scope="request"))
    container.bind(Dependent(GenerateVideoHandler, scope="request"))
    container.bind(Dependent(RunPipelineSagaHandler, scope="request"))
    container.bind(Dependent(GetUsageSummaryHandler, scope="request"))

    return container
```

**Why This Gets 10/10:**
- ✅ Swap R2 → S3 by changing ONE LINE
- ✅ Write unit tests against `InMemory*` implementations (0 external infra needed!)
- ✅ Test database rollbacks against SQLite, production uses Postgres
- ✅ Provider failover is a policy, not scattered `if/else` in every file

---

## ════════════════════════════════════════════════════════
## 📊 LAYER 6: OBSERVABILITY TRIFECTA (LOGS + METRICS + TRACES)
## ════════════════════════════════════════════════════════

### 6.1 Structured JSON Logs
```json
// Every log line is JSON — instantly parseable by Datadog/Grafana Loki
{
  "timestamp": "2025-09-10T14:32:01Z",
  "level": "INFO",
  "service": "omnistudio-api",
  "correlation_id": "01HFTABZ8YQ3D6H1P4W2Y5GQ9X",
  "user_id": "usr_01HFSZ123ABC",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "handler": "GenerateImageHandler",
  "model": "dall-e-3",
  "duration_ms": 3247,
  "cost_usd": 0.08,
  "message": "Image generation completed successfully",
  "asset_id": "ast_01HFTACXYZ123"
}
```

### 6.2 Prometheus Business Metrics (exported on :9090/metrics)
```python
# shared/telemetry/metrics.py
from prometheus_client import Counter, Histogram, Gauge

# Business KPIs
images_generated_total = Counter('omnistudio_images_generated_total', 'Total images', ['provider', 'model', 'status'])
videos_generated_total = Counter('omnistudio_videos_generated_total', 'Total videos', ['engine', 'status'])

# Cost tracking — so CFO sees spend in real time
total_spend_usd = Counter('omnistudio_total_spend_usd', 'Total spend', ['provider'])
total_savings_usd = Counter('omnistudio_total_savings_usd', 'Money saved vs cloud')

# Performance per operation per provider
generation_duration_seconds = Histogram('omnistudio_generation_seconds', 'Duration',
    ['service_type', 'provider', 'model'],
    buckets=(1, 3, 5, 10, 30, 60, 180, 600)
)

# Queue depth — alert if pipeline is backing up
pipeline_saga_pending = Gauge('omnistudio_pipeline_saga_pending', 'Sagas waiting to run')
media_worker_queue_depth = Gauge('omnistudio_media_worker_queue_depth', 'RQ/Arq jobs waiting')
```

### 6.3 OpenTelemetry Tracing (Jaeger / Grafana Tempo)
```
Single request spans:
  Incoming HTTP: POST /api/v1/image/generate    (3,247 ms total)
    ├─ auth.verify_jwt()                           (12 ms)
    ├─ rate_limiter.check()                         (1 ms)
    ├─ Mediator: GenerateImageHandler              (3,230 ms)
    │   ├─ PromptComposer (pure domain)             (0.3 ms)
    │   ├─ OpenAIProvider.generate              (2,980 ms) ← External API
    │   │   └─ HTTP POST: api.openai.com/v1/images (2,978 ms) ← Network call
    │   ├─ R2Storage.save                          (132 ms) ← Upload
    │   ├─ UnitOfWork.commit_with_outbox()          (45 ms) ← DB transaction
    │   └─ Cache.invalidate()                        (3 ms)
    └─ Response serialization                        (4 ms)
```

---

## ════════════════════════════════════════════════════════
## 🔐 LAYER 7: ZERO-TRUST SECURITY ARCHITECTURE
## ════════════════════════════════════════════════════════

```
                           ┌─────────────────────────┐
                           │  WAF / Cloudflare (DDoS) │
                           │  + OWASP Ruleset        │
                           │  + Rate Limit (Per IP)   │
                           └────────────┬────────────┘
                                        │
                           ┌────────────▼────────────┐
                           │  OPA (Open Policy Agent) │ ← DECISION POINT
                           │  Rego policies:         │
                           │  1. JWT valid?          │
                           │  2. User role permits?  │
                           │  3. Quota remaining?    │
                           │  4. MFA required?       │
                           └────────────┬────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
         ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
         │  API Gateway    │  │  Feature Flags   │  │ Quota Service   │
         │  (Traefik/Kong) │  │  (Flagsmith)     │  │ 40 images/day   │
         │ Auth middleware │  │ Gradual rollouts │  │ 5 videos/day    │
         │ + mTLS for svc  │  │ Canary deploys   │  │ Overage charged │
         └────────┬────────┘  └──────────────────┘  └────────┬────────┘
                  │                                          │
         ┌────────▼──────────────────────────────────────────▼────────┐
         │  FastAPI Presentation Layer — routes are thin              │
         │  Every handler has Depends():                              │
         │   - require_auth(mode=["jwt","apikey","mfa"])             │
         │   - require_role(["admin","creator","viewer"])            │
         │   - require_quota(resource="image_generation", cost=1)    │
         └──────────────────────────────┬─────────────────────────────┘
                                        │
         ┌──────────────────────────────▼─────────────────────────────┐
         │  Encryption (AES-256-GCM everywhere)                       │
         │                                                             │
         │  • At Rest:    Fernet encrypted .env + settings DB column  │
         │  • In Transit:  TLS 1.3 only (disable TLS 1.0/1.1/1.2)     │
         │  • AI Keys:     HashiCorp Vault sidecar — zero long-term   │
         │                 exposure; dynamic leases, auto-rotation    │
         │  • DB:          pgcrypto extension for PII columns         │
         └─────────────────────────────────────────────────────────────┘
```

### Frontend Security Architecture
```typescript
// src/security/session-store.ts  ← Never use localStorage for secrets!
// Use sessionStorage + in-memory store + HttpOnly cookie fallback
export class SecureSessionStore {
  private inMemory: Map<string, string> = new Map();

  setJwt(token: string) {
    // 1. JWT in HttpOnly, Secure, SameSite=Strict cookie
    document.cookie = `backend_jwt=${token}; Secure; SameSite=Strict; HttpOnly; Max-Age=43200; Path=/`;
    // 2. Short-lived nonce in memory for additional CSRF check
    this.inMemory.set("csrf_nonce", crypto.randomUUID());
  }
}
```

---

## ════════════════════════════════════════════════════════
## 🎨 LAYER 8: FRONTEND CLEAN ARCHITECTURE (10/10)
## ════════════════════════════════════════════════════════

```
frontend/src/
├── core/                      ← FRAMEWORK-AGNOSTIC DOMAIN (can run without React!)
│   ├── domain/
│   │   ├── entities/          ← Same language as backend domain (DDD UL)
│   │   ├── value-objects/
│   │   └── errors/
│   ├── application/
│   │   ├── use-cases/         ← Zustand stores as use case orchestrators
│   │   │   ├── image-generation.usecase.ts
│   │   │   ├── pipeline.usecase.ts
│   │   │   └── asset-vault.usecase.ts
│   │   └── ports/
│   │       ├── i-api-client.ts      ← HTTP port
│   │       └── i-analytics.tracker.ts ← GA/Amplitude port
│   └── infrastructure/        ← FRAMEWORK SPECIFIC adapters
│       ├── api-client-impl.ts ← Implements IApiClient (fetch/Axios wrapper)
│       └── analytics-impl.ts  ← Implements IAnalyticsTracker
│
├── features/                  ← FEATURE-SLICED DESIGN (FSD) — #1 modern structure
│   ├── auth/                  ← Every feature is self-contained
│   │   ├── components/
│   │   │   ├── login-form.tsx
│   │   │   └── pin-entry-modal.tsx
│   │   ├── hooks/             ← auth-feature-only hooks
│   │   ├── stores/            ← Zustand store (auth-context REPLACED!)
│   │   │   └── auth.store.ts  ← Zustand is 10x simpler than Context + tested easily
│   │   └── index.ts           ← Public API: export only what's needed
│   │
│   ├── image-studio/          ← Complete feature
│   │   ├── components/
│   │   │   ├── prompt-input.tsx
│   │   │   ├── camera-settings.tsx
│   │   │   ├── model-selector.tsx
│   │   │   └── results-gallery.tsx
│   │   ├── hooks/
│   │   │   └── use-generate-image.ts
│   │   ├── stores/
│   │   │   └── image-generator.store.ts  ← UI state + async actions
│   │   └── types.ts           ← Feature-specific types
│   │
│   ├── video-studio/
│   ├── voice-studio/
│   ├── pipeline-orchestrator/
│   ├── asset-vault/
│   │   ├── components/
│   │   │   ├── vault-grid.tsx
│   │   │   ├── trash-view.tsx
│   │   │   ├── collection-manager.tsx
│   │   │   └── bulk-actions-bar.tsx
│   │   ├── hooks/
│   │   └── stores/
│   ├── settings-panel/
│   └── analytics-dashboard/
│
├── shared/                    ← Reusable across features
│   ├── ui/                    ← Design System (Storybook documented!)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── modal.tsx
│   │   ├── data-table.tsx
│   │   └── progress-tracker.tsx
│   ├── hooks/                 ← Generic React hooks
│   │   ├── use-debounce.ts
│   │   ├── use-event-stream.ts
│   │   └── use-intersection-observer.ts
│   ├── providers/             ← App-level providers: Theme, QueryClient, Router
│   └── lib/                   ← utils, api-client wrapper, types
│
├── app/                       ← ONLY Next.js App Router page composition
│   ├── layout.tsx             ← 30 lines MAX — loads providers, shells only
│   ├── page.tsx               ← Dashboard composition
│   ├── image/
│   │   └── page.tsx           ← ONLY: <ImageStudioFeature /> (that's it!)
│   ├── video/
│   └── pipeline/
│
└── testing/                   ← Test utilities (msw handlers, fixtures, factories)
    ├── mocks/                 ← MSW (Mock Service Worker) for API mocking
    └── fixtures/              ← Test data: sample assets, sample generations
```

### Zustand Store Pattern (Replacing AuthContext)
```typescript
// features/auth/stores/auth.store.ts
import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import { secureSessionStorage } from '@/shared/lib/secure-storage'

interface AuthState {
  jwt: string | null
  user: User | null
  isPinAuthenticated: boolean
  isLoading: boolean
  error: string | null
  // Actions — typed, testable
  verifyPin: (pin: string) => Promise<boolean>
  signInWithPassword: (email: string, pw: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        jwt: null,
        user: null,
        isPinAuthenticated: false,
        isLoading: true,
        error: null,

        verifyPin: async (pin) => {
          set({ isLoading: true, error: null })
          try {
            // CALLS BACKEND for real verification — no client-side PIN!
            const { jwt } = await apiClient.post('/api/v1/auth/verify-pin', { pin })
            // JWT stored HttpOnly cookie automatically, csrf nonce in mem
            set({ isPinAuthenticated: true, jwt })
            return true
          } catch (e) {
            set({ error: (e as Error).message, isPinAuthenticated: false })
            return false
          } finally {
            set({ isLoading: false })
          }
        },

        signOut: async () => {
          await apiClient.post('/api/v1/auth/logout')
          set({ jwt: null, user: null, isPinAuthenticated: false })
        },
      }),
      {
        name: 'omnistudio-auth',
        // NEVER persist JWT. Persist only non-sensitive flags
        partialize: (state) => ({ isPinAuthenticated: state.isPinAuthenticated }),
        storage: createJSONStorage(() => secureSessionStorage),
      }
    ),
    { name: 'AuthStore' }
  )
)

// Testing in 1 line: useAuthStore.setState({ user: mockUser, isPinAuthenticated: true })
```

---

## ════════════════════════════════════════════════════════
## 🚀 LAYER 9: DEPLOYMENT ARCHITECTURE (10/10 — PRODUCTION SCALE)
## ════════════════════════════════════════════════════════

### Kubernetes Manifests Structure (`deploy/k8s/`)
```yaml
# Namespace isolation
# ┌─────────────────────────────────────────────────────────────────┐
# │ omnistudio-ns                                                   │
# │                                                                 │
# │  ┌──────────┐    ┌──────────┐    ┌──────────────────────────┐  │
# │  │ api-     │    │ api-     │    │ Pipeline Worker (HPA:    │  │
# │  │ deploy   │───►│ deploy   │    │ min=2 / max=20) based on │  │
# │  │ (nginx)  │    │ fastapi  │    │ queue depth              │  │
# │  └──────────┘    │ (3 pods, │    └──────────────────────────┘  │
# │                  │  HPA)    │                                    │
# │                  └────┬─────┘    ┌──────────────────────────┐  │
# │                       │          │ AI Worker (separate —     │  │
# │                       ├─────────►│ per-provider rate limits: │  │
# │                       │          │ 4 OpenAI reqs/sec pooled) │  │
# │                       │          └──────────────────────────┘  │
# │                       │                                          │
# │                       │          ┌──────────────────────────┐  │
# │                       ├─────────►│ Media Worker (GPU pool if│  │
# │                       │          │ available — FFmpeg, etc.)│  │
# │                       │          └──────────────────────────┘  │
# │                       │                                          │
# │  Postgres (CloudSQL)◄─┤    R2 / S3                              │
# │  Redis (Cluster) ◄────┤                                          │
# │  OTel Collector  ◄────┤                                          │
# └───────────────────────┼──────────────────────────────────────────┘
#                         │
#                   ▼ Prometheus + Grafana ▼
#                   ▼ Loki (logs) + Tempo (traces) ▼
```

Key Patterns:
- **HPA (Horizontal Pod Autoscaler):** API pods scale on CPU 70% + custom `pipeline_queue_depth` metric
- **Pod Anti-Affinity:** Never put 2 API pods on the same node
- **PodDisruptionBudget:** At least 2 API pods always alive during deploys
- **Canary Deployments (Argo Rollouts):** 5% traffic → 25% → 50% → 100% with auto-rollback on error rate > 1%
- **Secrets via ExternalSecrets Operator:** Pull from HashiCorp Vault / AWS Secrets Manager — NO `env: VALUE:` in manifests

---

## ════════════════════════════════════════════════════════
## 🧪 LAYER 10: TESTING STRATEGY — TEST PYRAMID (10/10)
## ════════════════════════════════════════════════════════

```
                  ╱╲    ┌──────────────────────────────┐
                 ╱  ╲   │ E2E Tests: 5%               │
                ╱    ╲  │ (Playwright)                │
               ╱ E2E  ╲ │ • Full pipeline run         │
              ╱        ╲│ • Login flow + Settings UI  │
             ╱──────────╲└──────────────────────────────┘
            ╱            ╲┌──────────────────────────────┐
           ╱  Integration ╲│ Integration Tests: 15%     │
          ╱    Tests       ╲│ • API → DB roundtrip       │
         ╱                  ╲│ • Redis Cache → Provider  │
        ╱────────────────────╲└─────────────────────────────┘
       ╱                      ╲┌─────────────────────────────┐
      ╱       Unit Tests        ╲│ Unit Tests: 80%           │
     ╱  (FAST! Runs in seconds) ╲│ • Domain entities 100%    │
    ╱                            ╲│ • Value Objects 100%      │
   ╱                              ╲│ • Use Case Handlers      │
  ╱  (In-memory implementations)   ╲│  (mocked repos)         │
 ╱                                  ╲│ • Prompt Composer 100%  │
╱────────────────────────────────────╲└────────────────────────┘
```

Tools:
- **Backend Unit:** pytest + pytest-asyncio + in-memory fakes (zero Docker!)
- **Backend Integration:** testcontainers-python (spins up Postgres + Redis containers automatically)
- **Frontend Unit:** Vitest + @testing-library/react (no browser needed)
- **Frontend Component:** Storybook + Chromatic visual regression testing
- **E2E:** Playwright (runs in CI against full docker-compose stack)

---

## ════════════════════════════════════════════════════════
## 🗂️ LAYER 11: DATA ARCHITECTURE (10/10)
## ════════════════════════════════════════════════════════

```
Current State: One SQLite file (read and write same pattern) + Dual-write to Supabase.
10/10 State: Write/Read separated (CQRS) + migrations + audit

Write DB (PostgreSQL Supabase / Neon):  (OLTP — Row-oriented, 3NF)
├── projects          (Aggregate root, RLS per user_id)
├── assets            (FK projects.id, RLS)
├── generations       (FK assets.id, append-only — NEVER UPDATE!)
├── saga_instances    (Pipeline saga state)
├── saga_steps        (Idempotent steps, for recovery)
├── outbox            (Transactional events, indexed by status+created_at)
├── studio_settings   (Encrypted setting_value column: pgp_sym_encrypt)
├── audit_log         (Append-only: who changed what setting, when, from IP)
└── idempotency_keys  (Prevent double-charge if POST sent twice)

Read DB (Materialized Views in Postgres + Redis cache):  (OLAP — denormalized)
├── analytics_rollup_view   (5-min refresh: spend by provider, by day)
├── vault_summary_view      (Instant counts, sizes by media_type)
├── user_quota_view         (Real-time usage vs plan limits)
└── project_list_view       (Joined projects + asset previews)

Migrations: Alembic — every schema change auto-reversible.
            Migration scripts in VCS. Branches must not conflict.
            CI runs: `alembic check` — block merge if schema vs model mismatch.

Idempotency Pattern:
  Every write API requires header: X-Idempotency-Key: <uuid>
  If same key seen in 24h, return cached response. No double billing.
```

---

## ✅ FINAL 10/10 SCORECARD VERIFICATION

| Dimension | How We Hit 10/10 |
|-----------|-------------------|
| **Modularity** | Clean Architecture enforced by DI container + port/interface pattern |
| **Coupling** | Zero import from domain → infra; all boundaries are interfaces |
| **Testability** | InMemory implementations for every port → 80% unit test coverage |
| **Scalability** | Separate workers per workload + HPA + Redis queues + CQRS read replicas |
| **Resilience** | Circuit breakers + retry policies + Saga compensations + Outbox |
| **Observability** | OTel traces + Prometheus metrics + structured JSON logs → All 3 signals correlated |
| **Consistency** | Unit of Work + Outbox pattern + Saga for long flows — 0 dual-write bugs |
| **Security** | Zero-trust: OPA + per-request auth + HttpOnly cookies + encrypted-at-rest + Secrets Manager |
| **Frontend Arch** | FSD + Domain/Application/Infra separation + Zustand stores |
| **Deployment** | K8s manifests + HPA + PDB + Canary rollouts + ExternalSecrets |

---

**End of 10_10_ARCHITECTURE_REDESIGN.md**
