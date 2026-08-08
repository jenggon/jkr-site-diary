# AUDIT-001: CURRENT-STATE RECONNAISSANCE AUDIT

**Audit Date**: 2026-08-09  
**Audit Scope**: Baseline inventory of `develop` branch state  
**Authority**: HQ / Chief Architect  
**Status**: COMPLETE (Reconnaissance Only — No Modifications Made)

---

## 1. Audit Baseline

- **Audit Branch**: `audit/AUDIT-001-current-state`
- **Base Branch**: `develop`
- **Current HEAD Commit**: `baaee5c9414e54b83ccba92d5b551aaa1e66e0c4`
- **HEAD Commit Message**: `feat(activity): integrate MRE resolution into open activity pipeline`
- **Repository Working Tree Status**: Clean (0 untracked modifications prior to generating audit document)
- **Runtime Environment**: Windows OS, Node.js v22 (specified in `.github/workflows/ci.yml`), pnpm v9.15.4

---

## 2. Repository Overview

The repository is structured as a full-stack web application built with **Next.js 15.1.7** (App Router), **React 19**, **TypeScript 5.7**, and **Supabase JS v2.48.1**.

### Directory Structure Overview
```
c:\Development\JKR-SiteDiary
├── .github/              # CI/CD Workflows
│   └── workflows/ci.yml
├── .husky/               # Git hook configuration
├── docs/                 # Documentation (22 domain/architectural folders)
├── public/               # Static web assets
├── samples/              # Sample data/payloads
├── scripts/              # Infrastructure and build helper scripts
├── src/                  # Application source code
│   ├── app/              # Next.js App Router (Pages, Layouts, API Routes)
│   ├── components/       # Shared UI components
│   ├── composition/      # Service dependency injection containers
│   ├── constants/        # System domain constants
│   ├── context/          # React Context providers (AuthContext)
│   ├── dto/              # Data Transfer Objects
│   ├── errors/           # Domain error definitions
│   ├── events/           # Domain Event definitions & Event Publisher
│   ├── lib/              # Core infrastructure utilities (DB, Logger, Clock, Invariant)
│   ├── mappers/          # DTO and domain mappers
│   ├── middleware/       # Application middleware handlers
│   ├── repositories/     # Data access layer & Supabase database adapters
│   ├── services/         # Core business engines, evaluators, and domain services
│   ├── statemachines/    # Domain state machine handlers
│   ├── transactions/     # Database transaction abstraction layer
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Shared helper functions
│   └── validation/       # Zod schema validation rules
├── supabase/             # Database migrations and configuration
│   └── migrations/       # 8 SQL migration files
├── tests/                # Test suite (Unit, Integration, Contract)
│   ├── contract/
│   ├── integration/
│   └── unit/
├── baseline.sql          # Full initial database schema definition
├── package.json          # Dependency manifest and npm scripts
├── playwright.config.ts  # Playwright E2E configuration
├── vitest.config.ts      # Vitest test framework configuration
└── fix*.py / fix*.cjs    # Root-level utility scripts (19 Python, 3 Node CJS)
```

---

## 3. Current Branch / HEAD & Commit Log

### Current Branch Details
- **Active Branch**: `audit/AUDIT-001-current-state`
- **Source Branch**: `develop`
- **HEAD Commit**: `baaee5c9414e54b83ccba92d5b551aaa1e66e0c4`

### Recent Commits on `develop`
```
baaee5c9414e54b83ccba92d5b551aaa1e66e0c4 feat(activity): integrate MRE resolution into open activity pipeline
1397407b30c01a58ca9272b939abf983e10b9428 feat(mre): implement DEV-029 Material Recommendation Engine
8fc8277da34e61176e6559cb5e521977b70dba47 feat(activity): implement DEV-028 automatic workforce resolution
adf9b58a5ebd891704a2aa60dd2e9f0d30f1518d feat(wre): implement DEV-027 Workforce Recommendation Engine
3311a83d0d30e46f525e052d92a316063d6f06c0 feat(activity): implement DEV-026 automatic trade resolution
```

---

## 4. Architecture Artefacts Found

The codebase contains strict governance and architectural documentation governing implementation:

- [AGENTS.md](file:///c:/Development/JKR-SiteDiary/AGENTS.md): Locked Site Diary Architecture rules, including single-row `site_diary` updates, append-only `site_diary_logs`, LHI engine constraints, TRE engine priority order (`MSP Resource` -> `Knowledge Engine` -> `Trade Library`), and `editingReportId == site_diary.id` rule.
- [CLAUDE.md](file:///c:/Development/JKR-SiteDiary/CLAUDE.md): Repository commands and developer guidelines.
- `docs/` tree containing 22 documentation directories:
  - `docs/00_Architecture/`
  - `docs/00_Governance/`
  - `docs/01_ADR/`
  - `docs/01_Implementation/`
  - `docs/02_Business_Rules/`
  - `docs/03_Domain_Model/`
  - `docs/04_Zon_Penjadualan/`
  - `docs/05_Zon_Operasi/`
  - `docs/06_Database/`
  - `docs/07_API/`
  - `docs/08_UI/`
  - `docs/09_Product_Modules/`
  - `docs/10_Development/`
  - `docs/10_UX/`
  - `docs/11_Architecture_Diagrams/`
  - `docs/12_Sequence_Diagrams/`
  - `docs/13_State_Machines/`
  - `docs/14_Decision_Tables/`
  - `docs/15_Data_Dictionary/`
  - `docs/16_Test_Scenarios/`
  - `docs/18_Engineering/`
  - `docs/99_Glossary/`

---

## 5. Engine Inventory

Below is an evidence-based assessment of all core and specialized engines identified in the codebase:

### 1. Programme Engine
- **Exists**: Yes
- **Implementation Location**:
  - Service: [ProgrammeService.ts](file:///c:/Development/JKR-SiteDiary/src/services/ProgrammeService.ts), [IProgrammeService.ts](file:///c:/Development/JKR-SiteDiary/src/services/IProgrammeService.ts)
  - Repository: [ProgrammeRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/ProgrammeRepository.ts), [ProgrammeRevisionRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/ProgrammeRevisionRepository.ts)
  - State Machines: [programmeStateMachine.ts](file:///c:/Development/JKR-SiteDiary/src/statemachines/programmeStateMachine.ts), [programmeRevisionStateMachine.ts](file:///c:/Development/JKR-SiteDiary/src/statemachines/programmeRevisionStateMachine.ts)
  - Validation: [programmeValidation.ts](file:///c:/Development/JKR-SiteDiary/src/validation/programmeValidation.ts)
  - Composition: [programmeComposition.ts](file:///c:/Development/JKR-SiteDiary/src/composition/programmeComposition.ts)
- **Database Components**: Tables `programmes`, `programme_revisions`, `programme_milestones`, `programme_wbs`, `programme_tasks` ([20260802141400_programme_engine.sql](file:///c:/Development/JKR-SiteDiary/supabase/migrations/20260802141400_programme_engine.sql), [baseline.sql](file:///c:/Development/JKR-SiteDiary/baseline.sql))
- **API Components**:
  - `POST /api/programme`
  - `GET /api/programme/[programmeId]`
  - `POST /api/programme/[programmeId]/archive`
  - `POST /api/programme-revision/[revisionId]/approve`
  - `POST /api/programme-revision/[revisionId]/archive`
- **UI Components**: `Programme Tab` in [src/app/page.tsx](file:///c:/Development/JKR-SiteDiary/src/app/page.tsx)
- **Tests**: [tests/unit/services/ProgrammeService.test.ts](file:///c:/Development/JKR-SiteDiary/tests/unit/services/ProgrammeService.test.ts), [tests/unit/repositories/ProgrammeRepository.test.ts](file:///c:/Development/JKR-SiteDiary/tests/unit/repositories/ProgrammeRepository.test.ts), [tests/integration/services/programmeService.integration.test.ts](file:///c:/Development/JKR-SiteDiary/tests/integration/services/programmeService.integration.test.ts)
- **Apparent State**: Fully implemented with state transition validation and integration tests.

### 2. MSP Engine
- **Exists**: Partial / Service Level
- **Implementation Location**:
  - Service/Parser: [mspParser.ts](file:///c:/Development/JKR-SiteDiary/src/services/mspParser.ts), [mspHierarchy.ts](file:///c:/Development/JKR-SiteDiary/src/lib/mspHierarchy.ts)
  - Repositories: [MspResourceRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/MspResourceRepository.ts), [MspWorkforceRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/MspWorkforceRepository.ts), [IMspMaterialRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/IMspMaterialRepository.ts)
- **Database Components**: Tables `msp_resources`, `msp_workforce_assignments`, `msp_materials` ([20260802222000_msp_engine.sql](file:///c:/Development/JKR-SiteDiary/supabase/migrations/20260802222000_msp_engine.sql))
- **API Components**: `GET /api/resources`
- **UI Components**: Embedded in [src/app/page.tsx](file:///c:/Development/JKR-SiteDiary/src/app/page.tsx)
- **Tests**: Tested indirectly via TRE and WRE resolution integration tests.
- **Apparent State**: Data access repositories and parser functions exist; used as Priority #1 resolution source in TRE/WRE pipelines.

### 3. Task Engine
- **Exists**: Yes
- **Implementation Location**:
  - Service: [taskService.ts](file:///c:/Development/JKR-SiteDiary/src/services/taskService.ts)
  - Repository: [taskRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/taskRepository.ts)
- **Database Components**: Tables `programme_tasks`, `programme_task_revisions` ([20260802141400_programme_engine.sql](file:///c:/Development/JKR-SiteDiary/supabase/migrations/20260802141400_programme_engine.sql))
- **API Components**:
  - `POST /api/task`
  - `GET /api/task/[taskId]`
  - `PATCH /api/task/[taskId]`
  - `GET /api/task/revision/[revisionId]`
- **UI Components**: Task views in [src/app/page.tsx](file:///c:/Development/JKR-SiteDiary/src/app/page.tsx)
- **Tests**: Executed as part of programme task hierarchy integration tests.
- **Apparent State**: Operational task CRUD and revision tracking.

### 4. Activity Engine
- **Exists**: Yes
- **Implementation Location**:
  - Service: [activityService.ts](file:///c:/Development/JKR-SiteDiary/src/services/activityService.ts)
  - Repository: [activityRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/activityRepository.ts)
  - Validation: [activityValidation.ts](file:///c:/Development/JKR-SiteDiary/src/validation/activityValidation.ts)
  - Events: [activityEvents.ts](file:///c:/Development/JKR-SiteDiary/src/events/activityEvents.ts)
- **Database Components**: Tables `programme_activities`, `programme_activity_revisions` ([20260802231500_activity_engine.sql](file:///c:/Development/JKR-SiteDiary/supabase/migrations/20260802231500_activity_engine.sql))
- **API Components**:
  - `POST /api/activity`
  - `GET /api/activity/[activityId]`
  - `PATCH /api/activity/[activityId]`
  - `POST /api/activities/[activityId]/start`
  - `POST /api/activities/[activityId]/suspend`
  - `POST /api/activities/[activityId]/complete`
  - `POST /api/activities/[activityId]/cancel`
  - `GET /api/activities/[activityId]/history`
- **UI Components**: Activity forms and list views in [src/app/page.tsx](file:///c:/Development/JKR-SiteDiary/src/app/page.tsx)
- **Tests**: [tests/unit/api/activityApi.test.ts](file:///c:/Development/JKR-SiteDiary/tests/unit/api/activityApi.test.ts)
- **Apparent State**: Complete activity lifecycle state machine (start, suspend, complete, cancel).

### 5. Open Activities Engine (LHI Engine)
- **Exists**: Yes (Core Architectural Component)
- **Implementation Location**:
  - Service: [OpenActivityService.ts](file:///c:/Development/JKR-SiteDiary/src/services/OpenActivityService.ts), [IOpenActivityService.ts](file:///c:/Development/JKR-SiteDiary/src/services/IOpenActivityService.ts)
  - Repository: [OpenActivityRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/OpenActivityRepository.ts), [ActivityLogRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/ActivityLogRepository.ts)
  - State Machine: [siteDiaryStateMachine.ts](file:///c:/Development/JKR-SiteDiary/src/statemachines/siteDiaryStateMachine.ts)
  - Composition: [activityComposition.ts](file:///c:/Development/JKR-SiteDiary/src/composition/activityComposition.ts)
- **Database Components**:
  - Primary Table: `site_diary` (single current state row per active report)
  - Audit Trail Table: `site_diary_logs` (append-only event history)
  - View: `open_activities` view ([20260802232900_site_diary_engine.sql](file:///c:/Development/JKR-SiteDiary/supabase/migrations/20260802232900_site_diary_engine.sql), [20260802235100_open_activities_engine.sql](file:///c:/Development/JKR-SiteDiary/supabase/migrations/20260802235100_open_activities_engine.sql))
- **API Components**:
  - `POST /api/site-diary`
  - `GET /api/site-diary/[siteDiaryId]`
  - `PATCH /api/site-diary/[siteDiaryId]`
  - `GET /api/site-diary/[diaryId]/activities`
  - `POST /api/site-diary/[diaryId]/activities`
  - `GET /api/previous-activities`
- **UI Components**: Open Activities / Site Diary interface in [src/app/page.tsx](file:///c:/Development/JKR-SiteDiary/src/app/page.tsx)
- **Tests**:
  - [tests/unit/services/OpenActivityService.test.ts](file:///c:/Development/JKR-SiteDiary/tests/unit/services/OpenActivityService.test.ts) (18 unit tests)
  - [tests/integration/services/openActivityService.integration.test.ts](file:///c:/Development/JKR-SiteDiary/tests/integration/services/openActivityService.integration.test.ts)
  - [tests/integration/services/openActivityTreIntegration.integration.test.ts](file:///c:/Development/JKR-SiteDiary/tests/integration/services/openActivityTreIntegration.integration.test.ts)
  - [tests/integration/services/openActivityWreIntegration.integration.test.ts](file:///c:/Development/JKR-SiteDiary/tests/integration/services/openActivityWreIntegration.integration.test.ts)
- **Apparent State**: Fully developed with automated TRE, WRE, and MRE recommendation pipeline integration.

### 6. Progress Engine
- **Exists**: Yes
- **Implementation Location**:
  - Service: [progressService.ts](file:///c:/Development/JKR-SiteDiary/src/services/progressService.ts)
  - Repository: [progressRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/progressRepository.ts)
- **Database Components**: Tables `activity_progress`, `site_diary_progress` ([baseline.sql](file:///c:/Development/JKR-SiteDiary/baseline.sql))
- **API Components**:
  - `POST /api/progress`
  - `GET /api/progress/[progressId]`
  - `GET /api/progress/activity/[activityId]`
  - `GET /api/progress/site-diary/[siteDiaryId]`
  - `GET /api/progress/measurement-date/[measurementDate]`
- **UI Components**: Progress recording inputs in [src/app/page.tsx](file:///c:/Development/JKR-SiteDiary/src/app/page.tsx)
- **Tests**: Tested via API endpoints and progress service calls.
- **Apparent State**: Fully functional progress recording and site-diary measurement lookup.

### 7. Workforce Engine (WRE)
- **Exists**: Yes (DEV-027 Implementation)
- **Implementation Location**:
  - Service: [WorkforceEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/WorkforceEngineService.ts), [IWorkforceEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/IWorkforceEngineService.ts)
  - Repositories: [WorkforceRuleRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/WorkforceRuleRepository.ts), [TradeWorkforceLibraryRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/TradeWorkforceLibraryRepository.ts)
  - Evaluator Registry: [WorkforceEvaluatorRegistry.ts](file:///c:/Development/JKR-SiteDiary/src/services/evaluators/WorkforceEvaluatorRegistry.ts)
  - Discipline Evaluators (9 classes):
    - [BridgeWorkforceEvaluator.ts](file:///c:/Development/JKR-SiteDiary/src/services/evaluators/disciplines/BridgeWorkforceEvaluator.ts)
    - [CivilWorkforceEvaluator.ts](file:///c:/Development/JKR-SiteDiary/src/services/evaluators/disciplines/CivilWorkforceEvaluator.ts)
    - [ElectricalWorkforceEvaluator.ts](file:///c:/Development/JKR-SiteDiary/src/services/evaluators/disciplines/ElectricalWorkforceEvaluator.ts)
    - [MarineWorkforceEvaluator.ts](file:///c:/Development/JKR-SiteDiary/src/services/evaluators/disciplines/MarineWorkforceEvaluator.ts)
    - [MechanicalWorkforceEvaluator.ts](file:///c:/Development/JKR-SiteDiary/src/services/evaluators/disciplines/MechanicalWorkforceEvaluator.ts)
    - [RoadWorkforceEvaluator.ts](file:///c:/Development/JKR-SiteDiary/src/services/evaluators/disciplines/RoadWorkforceEvaluator.ts)
    - [SafetyWorkforceEvaluator.ts](file:///c:/Development/JKR-SiteDiary/src/services/evaluators/disciplines/SafetyWorkforceEvaluator.ts)
    - [StructuralWorkforceEvaluator.ts](file:///c:/Development/JKR-SiteDiary/src/services/evaluators/disciplines/StructuralWorkforceEvaluator.ts)
    - [TunnelWorkforceEvaluator.ts](file:///c:/Development/JKR-SiteDiary/src/services/evaluators/disciplines/TunnelWorkforceEvaluator.ts)
  - Composition: [wreComposition.ts](file:///c:/Development/JKR-SiteDiary/src/composition/wreComposition.ts)
- **Database Components**: Tables `workforce_rules`, `trade_workforce_library`, `msp_workforce_assignments`
- **API Components**: `GET /api/workforce`
- **UI Components**: Workforce recommendation views in open activity workflows.
- **Tests**:
  - [tests/unit/services/WorkforceEngineService.test.ts](file:///c:/Development/JKR-SiteDiary/tests/unit/services/WorkforceEngineService.test.ts)
  - [tests/unit/services/evaluators/WorkforceEvaluatorRegistry.test.ts](file:///c:/Development/JKR-SiteDiary/tests/unit/services/evaluators/WorkforceEvaluatorRegistry.test.ts)
  - [tests/unit/services/evaluators/DisciplineEvaluators.test.ts](file:///c:/Development/JKR-SiteDiary/tests/unit/services/evaluators/DisciplineEvaluators.test.ts)
  - [tests/integration/services/openActivityWreIntegration.integration.test.ts](file:///c:/Development/JKR-SiteDiary/tests/integration/services/openActivityWreIntegration.integration.test.ts)
- **Apparent State**: Operational with 9 domain discipline evaluators and fallbacks.

### 8. Approval Engine
- **Exists**: Yes
- **Implementation Location**:
  - Service: [approvalService.ts](file:///c:/Development/JKR-SiteDiary/src/services/approvalService.ts)
  - Repository: [approvalRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/approvalRepository.ts)
- **Database Components**: Tables `approvals`, `approval_nodes`, `approval_history` ([20260803212900_approval_engine.sql](file:///c:/Development/JKR-SiteDiary/supabase/migrations/20260803212900_approval_engine.sql))
- **API Components**:
  - `POST /api/approval`
  - `GET /api/approval/[approvalId]`
  - `PATCH /api/approval/[approvalId]`
  - `GET /api/approval/activity/[activityId]`
  - `GET /api/approval/progress/[progressId]`
  - `GET /api/approval/site-diary/[siteDiaryId]`
- **UI Components**: Approvals tab in [src/app/page.tsx](file:///c:/Development/JKR-SiteDiary/src/app/page.tsx)
- **Tests**: Executed via API routes.
- **Apparent State**: Multi-level approval routing for site diaries and activities.

### 9. Audit Engine
- **Exists**: Yes
- **Implementation Location**:
  - Service: [auditService.ts](file:///c:/Development/JKR-SiteDiary/src/services/auditService.ts)
  - Repository: [auditRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/auditRepository.ts)
- **Database Components**: Table `audit_logs` ([20260803215000_audit_engine.sql](file:///c:/Development/JKR-SiteDiary/supabase/migrations/20260803215000_audit_engine.sql))
- **API Components**:
  - `POST /api/audit`
  - `GET /api/audit/[auditId]`
  - `GET /api/audit/programme/[programmeId]`
  - `GET /api/audit/user/[userId]`
  - `GET /api/audit/event/[eventType]`
  - `GET /api/audit/entity`
- **UI Components**: Audit log viewer in [src/app/page.tsx](file:///c:/Development/JKR-SiteDiary/src/app/page.tsx)
- **Tests**: Executed via API tests.
- **Apparent State**: Centralized audit logging for system actions and domain events.

### 10. Trade Recommendation Engine (TRE)
- **Exists**: Yes (LOCKED Architectural Priority Engine)
- **Implementation Location**:
  - Service: [TreEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/TreEngineService.ts), [ITreEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/ITreEngineService.ts)
  - Priority Cascade: `MSP Resource` (Priority 1) -> `Knowledge Engine` (Priority 2) -> `Trade Library` (Priority 3)
  - Mapper: [treTradeSelectionMapper.ts](file:///c:/Development/JKR-SiteDiary/src/services/mappers/treTradeSelectionMapper.ts)
  - Composition: [treComposition.ts](file:///c:/Development/JKR-SiteDiary/src/composition/treComposition.ts)
- **Database Components**: Tables `msp_resources`, `knowledge_rules`, `trade_library`
- **API Components**:
  - `GET /api/trades`
  - `GET /api/trade-library`
  - `GET /api/trade-library/[tradeId]`
  - `GET /api/trade-library/code/[tradeCode]`
  - `GET /api/trade-library/active`
- **UI Components**: Interactive trade picker ([SearchPicker.tsx](file:///c:/Development/JKR-SiteDiary/src/components/SearchPicker.tsx))
- **Tests**:
  - [tests/unit/services/TreEngineService.test.ts](file:///c:/Development/JKR-SiteDiary/tests/unit/services/TreEngineService.test.ts)
  - [tests/unit/services/mappers/treTradeSelectionMapper.test.ts](file:///c:/Development/JKR-SiteDiary/tests/unit/services/mappers/treTradeSelectionMapper.test.ts)
  - [tests/integration/services/openActivityTreIntegration.integration.test.ts](file:///c:/Development/JKR-SiteDiary/tests/integration/services/openActivityTreIntegration.integration.test.ts)
- **Apparent State**: Operational 3-tier priority cascade compliant with locked rules.

### 11. Knowledge Engine
- **Exists**: Yes (DEV-026 Trade Scoring Engine)
- **Implementation Location**:
  - Service: [KnowledgeEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/KnowledgeEngineService.ts), [IKnowledgeEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/IKnowledgeEngineService.ts)
  - Adapter: [KnowledgeEngineAdapter.ts](file:///c:/Development/JKR-SiteDiary/src/services/adapters/KnowledgeEngineAdapter.ts)
  - Repository: [KnowledgeRuleRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/KnowledgeRuleRepository.ts)
  - Rule Evaluators:
    - [TaskRuleEvaluator.ts](file:///c:/Development/JKR-SiteDiary/src/services/evaluators/TaskRuleEvaluator.ts)
    - [BuildingTypeRuleEvaluator.ts](file:///c:/Development/JKR-SiteDiary/src/services/evaluators/BuildingTypeRuleEvaluator.ts)
    - [DisciplineRuleEvaluator.ts](file:///c:/Development/JKR-SiteDiary/src/services/evaluators/DisciplineRuleEvaluator.ts)
    - [HistoryRuleEvaluator.ts](file:///c:/Development/JKR-SiteDiary/src/services/evaluators/HistoryRuleEvaluator.ts)
  - Composition: [knowledgeComposition.ts](file:///c:/Development/JKR-SiteDiary/src/composition/knowledgeComposition.ts)
- **Database Components**: Tables `knowledge_rules`, `subtasks`, `ahi_records`
- **API Components**: `GET /api/ahi`, `GET /api/buildings`
- **UI Components**: Trade recommendation selection UI in [src/app/page.tsx](file:///c:/Development/JKR-SiteDiary/src/app/page.tsx)
- **Tests**: [tests/unit/services/KnowledgeEngineService.test.ts](file:///c:/Development/JKR-SiteDiary/tests/unit/services/KnowledgeEngineService.test.ts)
- **Apparent State**: Functional recommendation scoring based on AHI, subtask, frequency, and recency.

### 12. Material Recommendation Engine (MRE)
- **Exists**: Yes (DEV-029 Implementation)
- **Implementation Location**:
  - Service: [MaterialEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/MaterialEngineService.ts), [IMaterialEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/IMaterialEngineService.ts)
  - Repositories: [IMaterialRuleRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/IMaterialRuleRepository.ts), [ITradeMaterialLibraryRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/ITradeMaterialLibraryRepository.ts), [IMspMaterialRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/IMspMaterialRepository.ts)
  - Evaluators: [MaterialRuleEvaluatorRegistry.ts](file:///c:/Development/JKR-SiteDiary/src/services/evaluators/MaterialRuleEvaluatorRegistry.ts), [StandardMaterialEvaluator.ts](file:///c:/Development/JKR-SiteDiary/src/services/evaluators/StandardMaterialEvaluator.ts)
  - Composition: [mreComposition.ts](file:///c:/Development/JKR-SiteDiary/src/composition/mreComposition.ts)
- **Database Components**: Tables `material_rules`, `trade_material_library`, `msp_materials`
- **API Components**: Material recommendation resolution embedded in activity creation pipelines.
- **UI Components**: Open activity creation form.
- **Tests**: [tests/unit/services/MaterialEngineService.test.ts](file:///c:/Development/JKR-SiteDiary/tests/unit/services/MaterialEngineService.test.ts), [tests/unit/services/evaluators/MaterialRuleEvaluatorRegistry.test.ts](file:///c:/Development/JKR-SiteDiary/tests/unit/services/evaluators/MaterialRuleEvaluatorRegistry.test.ts)
- **Apparent State**: Fully integrated with OpenActivityService pipeline.

---

## 6. Database Inventory

### Migration Files Found in `supabase/migrations/`
1. `20260802141400_programme_engine.sql`
2. `20260802222000_msp_engine.sql`
3. `20260802231500_activity_engine.sql`
4. `20260802232900_site_diary_engine.sql`
5. `20260802235100_open_activities_engine.sql`
6. `20260803212900_approval_engine.sql`
7. `20260803215000_audit_engine.sql`
8. `.gitkeep`

### Baseline SQL File
- [baseline.sql](file:///c:/Development/JKR-SiteDiary/baseline.sql) (9,282 bytes complete schema setup)

### Tables Identified
- `programmes`
- `programme_revisions`
- `programme_milestones`
- `programme_wbs`
- `programme_tasks`
- `programme_task_revisions`
- `programme_activities`
- `programme_activity_revisions`
- `msp_resources`
- `msp_workforce_assignments`
- `msp_materials`
- `site_diary` (Core LHI single-row activity table)
- `site_diary_logs` (Append-only audit log table)
- `activity_progress`
- `site_diary_progress`
- `approvals`
- `approval_nodes`
- `approval_history`
- `audit_logs`
- `knowledge_rules`
- `workforce_rules`
- `material_rules`
- `trade_library`
- `trade_workforce_library`
- `trade_material_library`
- `subtasks`
- `ahi_records`
- `buildings`
- `workpackages`

### Database Views
- `open_activities`: Created in `20260802235100_open_activities_engine.sql`, joining `site_diary` with `programmes` and `programme_tasks`.

### Database Functions & Triggers
- `update_updated_at_column()`: Auto-updates timestamp on row changes.
- `log_site_diary_change()`: Trigger on `site_diary` table that automatically appends audit event rows to `site_diary_logs`.

---

## 7. API Inventory

Approximately 50 API route handlers were located under `src/app/api/`:

| API Endpoint Path | HTTP Methods | Domain / Engine Mapping |
| :--- | :--- | :--- |
| `/api/programme` | POST | Programme Engine |
| `/api/programme/[programmeId]` | GET | Programme Engine |
| `/api/programme/[programmeId]/archive` | POST | Programme Engine |
| `/api/programme-revision/[revisionId]/approve` | POST | Programme Engine |
| `/api/programme-revision/[revisionId]/archive` | POST | Programme Engine |
| `/api/task` | POST | Task Engine |
| `/api/task/[taskId]` | GET, PATCH | Task Engine |
| `/api/task/revision/[revisionId]` | GET | Task Engine |
| `/api/activity` | POST | Activity Engine |
| `/api/activity/[activityId]` | GET, PATCH | Activity Engine |
| `/api/activity/task/[taskId]` | GET | Activity Engine |
| `/api/activity/revision/[revisionId]` | GET | Activity Engine |
| `/api/activities/[activityId]` | GET, PATCH | Activity Engine |
| `/api/activities/[activityId]/start` | POST | Activity Engine |
| `/api/activities/[activityId]/suspend` | POST | Activity Engine |
| `/api/activities/[activityId]/complete` | POST | Activity Engine |
| `/api/activities/[activityId]/cancel` | POST | Activity Engine |
| `/api/activities/[activityId]/history` | GET | Activity Engine |
| `/api/site-diary` | POST | Open Activities / Site Diary |
| `/api/site-diary/[siteDiaryId]` | GET, PATCH | Open Activities / Site Diary |
| `/api/site-diary/activity/[activityId]` | GET | Open Activities / Site Diary |
| `/api/site-diary/revision/[revisionId]` | GET | Open Activities / Site Diary |
| `/api/site-diary/[diaryId]/activities` | GET, POST | Open Activities / Site Diary |
| `/api/previous-activities` | GET | Open Activities / Site Diary |
| `/api/progress` | POST | Progress Engine |
| `/api/progress/[progressId]` | GET | Progress Engine |
| `/api/progress/activity/[activityId]` | GET | Progress Engine |
| `/api/progress/site-diary/[siteDiaryId]` | GET | Progress Engine |
| `/api/progress/measurement-date/[measurementDate]` | GET | Progress Engine |
| `/api/approval` | POST | Approval Engine |
| `/api/approval/[approvalId]` | GET, PATCH | Approval Engine |
| `/api/approval/activity/[activityId]` | GET | Approval Engine |
| `/api/approval/progress/[progressId]` | GET | Approval Engine |
| `/api/approval/site-diary/[siteDiaryId]` | GET | Approval Engine |
| `/api/audit` | POST | Audit Engine |
| `/api/audit/[auditId]` | GET | Audit Engine |
| `/api/audit/programme/[programmeId]` | GET | Audit Engine |
| `/api/audit/user/[userId]` | GET | Audit Engine |
| `/api/audit/event/[eventType]` | GET | Audit Engine |
| `/api/audit/entity` | GET | Audit Engine |
| `/api/trades` | GET | Trade Recommendation Engine (TRE) |
| `/api/trade-library` | GET | Trade Recommendation Engine (TRE) |
| `/api/trade-library/[tradeId]` | GET | Trade Recommendation Engine (TRE) |
| `/api/trade-library/code/[tradeCode]` | GET | Trade Recommendation Engine (TRE) |
| `/api/trade-library/active` | GET | Trade Recommendation Engine (TRE) |
| `/api/workforce` | GET | Workforce Engine (WRE) |
| `/api/resources` | GET | MSP / Resource Engine |
| `/api/ahi` | GET | Knowledge Engine |
| `/api/buildings` | GET | Knowledge Engine / Location |
| `/api/workpackages` | GET | Programme / WBS |
| `/api/project-summary` | GET | Reporting / Dashboard |
| `/api/reports` | GET | Reporting Engine |

---

## 8. UI Inventory

### Pages & Routes
- Main Dashboard App: [src/app/page.tsx](file:///c:/Development/JKR-SiteDiary/src/app/page.tsx) (86,573 bytes monolith containing active tab navigation for Site Diary, Programme Management, Open Activities, Approvals, and Audit logs)
- Login Route: [src/app/login/page.tsx](file:///c:/Development/JKR-SiteDiary/src/app/login/page.tsx) (9,177 bytes)
- Root Layout: [src/app/layout.tsx](file:///c:/Development/JKR-SiteDiary/src/app/layout.tsx)

### UI Components
- [BottomNavigation.tsx](file:///c:/Development/JKR-SiteDiary/src/components/BottomNavigation.tsx): Mobile bottom navigation bar.
- [SearchPicker.tsx](file:///c:/Development/JKR-SiteDiary/src/components/SearchPicker.tsx): Interactive search and selection picker.

### Application Context
- [AuthContext.tsx](file:///c:/Development/JKR-SiteDiary/src/context/AuthContext.tsx): Authentication state management.

---

## 9. Testing / CI Inventory

### Testing Execution Results (Empirically Executed)
- **Command Executed**: `npm test` (`vitest run`)
- **Total Test Files**: 41
- **Total Individual Tests**: 167
- **Passed Tests**: 167 (100% Pass Rate)
- **Failed Tests**: 0
- **Test Duration**: 4.86s

### Test Suite Structure
- **Unit Tests (`tests/unit/`)**: 36 test files covering API routes, domain models, DTOs, evaluators, lib utilities, mappers, repositories, services, state machines, and validation.
- **Integration Tests (`tests/integration/`)**: 5 test files:
  - `programmeRepository.integration.test.ts`
  - `programmeService.integration.test.ts`
  - `openActivityService.integration.test.ts`
  - `openActivityTreIntegration.integration.test.ts`
  - `openActivityWreIntegration.integration.test.ts`
- **Contract Tests (`tests/contract/`)**: Directory present.
- **E2E Tests**: Configured in [playwright.config.ts](file:///c:/Development/JKR-SiteDiary/playwright.config.ts) for `**/*.e2e.spec.ts`.

### CI/CD Workflow
- [.github/workflows/ci.yml](file:///c:/Development/JKR-SiteDiary/.github/workflows/ci.yml): Configured for Node 22 + pnpm. Steps run `typecheck`, `lint`, `test`, `build`, and upload build artifacts on pushes and PRs to `main`, `master`, and `develop`.

---

## 10. Supporting Modules

- **Trade Library Service**: [tradeLibraryService.ts](file:///c:/Development/JKR-SiteDiary/src/services/tradeLibraryService.ts), [tradeLibraryRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/tradeLibraryRepository.ts)
- **Workforce Service**: [workforceService.ts](file:///c:/Development/JKR-SiteDiary/src/services/workforceService.ts), [workforceRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/workforceRepository.ts)
- **Site Diary Service**: [siteDiaryService.ts](file:///c:/Development/JKR-SiteDiary/src/services/siteDiaryService.ts), [siteDiaryRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/siteDiaryRepository.ts)
- **Database Adapter**: [SupabaseDatabaseAdapter.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/adapters/SupabaseDatabaseAdapter.ts), [IDatabaseAdapter.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/adapters/IDatabaseAdapter.ts)
- **Database Transaction Manager**: [DatabaseTransactionManager.ts](file:///c:/Development/JKR-SiteDiary/src/transactions/DatabaseTransactionManager.ts), [ITransactionManager.ts](file:///c:/Development/JKR-SiteDiary/src/transactions/ITransactionManager.ts)
- **Domain Event Publisher**: [IDomainEventPublisher.ts](file:///c:/Development/JKR-SiteDiary/src/events/IDomainEventPublisher.ts), [NoopDomainEventPublisher.ts](file:///c:/Development/JKR-SiteDiary/src/events/NoopDomainEventPublisher.ts)

---

## 11. Recent Development Activity

Review of the 5 most recent commits on `develop`:

1. `baaee5c9414e54b83ccba92d5b551aaa1e66e0c4`: Integrated Material Recommendation Engine (MRE) resolution into Open Activity creation pipeline.
2. `1397407b30c01a58ca9272b939abf983e10b9428`: Implemented DEV-029 Material Recommendation Engine (MRE).
3. `8fc8277da34e61176e6559cb5e521977b70dba47`: Implemented DEV-028 automatic workforce resolution.
4. `adf9b58a5ebd891704a2aa60dd2e9f0d30f1518d`: Implemented DEV-027 Workforce Recommendation Engine (WRE).
5. `3311a83d0d30e46f525e052d92a316063d6f06c0`: Implemented DEV-026 automatic trade resolution.

**Primary Focus Area of Recent Sprints**: Automated resolution pipelines (TRE, WRE, MRE) and their integration into `OpenActivityService`.

---

## 12. Unmapped / Unknown Components

1. **Root Fix Utility Scripts**:
   - 19 Python scripts (`fix.py`, `fix2.py`, `fix3.py`, `fix4.py`, `fix_all.py`, `fix_all_regex.py`, `fix_all_regex2.py`, `fix_final.py`, `fix_final2.py`, `fix_final3.py`, `fix_final4.py`, `fix_final6.py`, `fix_lint.py`, `fix_missing.py`, `fix_mock.py`, `fix_tests.py`, `fix_tre.py`, `fix_unit.py`, `fix_vi.py`) and 3 Node CJS scripts (`fix_node.cjs`, `fix_node2.cjs`, `fix_node3.cjs`) exist in repository root.
   - *Observation*: These scripts appear to be automated code/lint fix tools used in previous development sprints, but are not invoked by standard npm package scripts or CI workflows.

2. **Branch `develop-old`**:
   - A local branch named `develop-old` exists in the local git repository. Unmerged status or delta against `develop` has not been audited as part of this reconnaissance.

3. **Supabase Migration Alignment**:
   - Migration scripts in `supabase/migrations/` (8 files) and `baseline.sql` exist locally. Synchronisation status against remote live Supabase database instance remains unverified until database credentials/environment are inspected by HQ.

---

## 13. Evidence Index

- [AGENTS.md](file:///c:/Development/JKR-SiteDiary/AGENTS.md)
- [CLAUDE.md](file:///c:/Development/JKR-SiteDiary/CLAUDE.md)
- [package.json](file:///c:/Development/JKR-SiteDiary/package.json)
- [vitest.config.ts](file:///c:/Development/JKR-SiteDiary/vitest.config.ts)
- [playwright.config.ts](file:///c:/Development/JKR-SiteDiary/playwright.config.ts)
- [.github/workflows/ci.yml](file:///c:/Development/JKR-SiteDiary/.github/workflows/ci.yml)
- [baseline.sql](file:///c:/Development/JKR-SiteDiary/baseline.sql)
- [supabase/migrations/](file:///c:/Development/JKR-SiteDiary/supabase/migrations)
- [src/app/page.tsx](file:///c:/Development/JKR-SiteDiary/src/app/page.tsx)
- [src/services/ProgrammeService.ts](file:///c:/Development/JKR-SiteDiary/src/services/ProgrammeService.ts)
- [src/services/OpenActivityService.ts](file:///c:/Development/JKR-SiteDiary/src/services/OpenActivityService.ts)
- [src/services/TreEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/TreEngineService.ts)
- [src/services/KnowledgeEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/KnowledgeEngineService.ts)
- [src/services/WorkforceEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/WorkforceEngineService.ts)
- [src/services/MaterialEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/MaterialEngineService.ts)
- [src/services/approvalService.ts](file:///c:/Development/JKR-SiteDiary/src/services/approvalService.ts)
- [src/services/auditService.ts](file:///c:/Development/JKR-SiteDiary/src/services/auditService.ts)
- [src/repositories/ProgrammeRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/ProgrammeRepository.ts)
- [src/repositories/OpenActivityRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/OpenActivityRepository.ts)
- [src/repositories/ActivityLogRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/ActivityLogRepository.ts)

---

## 14. Questions Requiring HQ Review

1. **UI Component Architecture**:
   - `src/app/page.tsx` is an 86.5 KB single file containing the entire dashboard UI and sub-tab interfaces. Should this page be decomposed into modular components per domain in upcoming sprints?

2. **Root Fix Scripts Cleanup**:
   - Should the 22 root-level Python and CJS fix scripts (`fix*.py`, `fix*.cjs`) be moved to an archive directory (`scripts/archive/`) or removed from the repository root?

3. **Database Migration Verification**:
   - Should a dedicated migration validation job be added to `.github/workflows/ci.yml` to ensure local `supabase/migrations/` stay in sync with Supabase schema types?
