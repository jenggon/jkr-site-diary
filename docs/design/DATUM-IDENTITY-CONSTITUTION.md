# DATUM Product Identity Constitution

Status: **LOCKED design north star** for F4.5 UI/UX work.

DATUM is not a dark theme for the Site Diary. DATUM is the product identity.

> **DATUM is a digital engineer's fieldbook: a familiar daily workspace anchored around the project's ground truth. It should feel precise enough for an engineer, tactile enough for the field, and familiar enough to return to every working day.**

## 1. Product metaphor

DATUM has three permanent concepts:

- **Fieldbook** — the familiar daily place where work is recorded and continued.
- **Datum** — the authoritative reference: programme, revision, task, date, evidence and approved record.
- **Spine** — orientation through a record: what is established, where the user is, and what comes next.

These are product concepts, not decorative motifs. A screen does not need to show a literal spine to belong to DATUM.

## 2. Ground-truth principle

Every working day has a ground truth. DATUM records it.

The interface must make authoritative information easy to distinguish from context and transient interaction state. Programme Revision, MSP/VO source, activity dates, Site Diary evidence and approval state retain their existing domain authority. Product identity must never weaken or reinterpret those semantics.

## 3. Colour constitution

**Graphite is the home. White is truth. Grey is structure. Colour appears only when state matters.**

Core palette:

- Graphite: canvas, housing, working surfaces and inset controls.
- White: primary values, task titles, committed information and decisive actions.
- Grey: hierarchy, metadata, inactive controls, separators and supporting context.

Semantic accent only:

- Blue: current / active / operational.
- Green: valid / approved / authoritative.
- Amber: warning / historical / superseded.
- Red: error / destructive.

Large surfaces must not become blue, green or amber merely for decoration. Status is signalled with compact marks, edges, nodes, labels and interaction state.

## 4. Geometry

DATUM is derived from engineering fieldbooks, technical drawings and professional equipment, not a game HUD.

Use:

- crisp alignment;
- restrained radii;
- straight dividers;
- inset control surfaces;
- selective edge/notch treatment;
- compact action keys;
- strong reference alignment.

Avoid:

- rounded-card soup;
- nested floating cards;
- hexagons and sci-fi framing;
- decorative cut corners everywhere;
- glassmorphism;
- giant shadows;
- generic SaaS pill overload.

## 5. Datum Spine and Datum Node

The **Datum Spine** is the orientation grammar for long field workflows. It may be literal in New Entry and implicit elsewhere.

The **Datum Node** marks a meaningful section/state on that spine.

Rules:

- the spine is primarily graphite/grey;
- only the active operational segment may become blue;
- green is reserved for authoritative/approved meaning;
- amber is reserved for historical/warning meaning;
- the spine must never become a decorative full-height coloured stripe;
- nodes and rails supplement text and accessibility state; they never carry meaning alone.

## 6. Field Strip

Operational collections such as MSP tasks, VO items and similar field records should prefer **Field Strips**: shared framing, aligned metadata, straight dividers and strong scan hierarchy.

A Field Strip should make repeated data easier to scan than separate cards.

## 7. Revision Stamp

Programme Revision authority is presented as a compact **Revision Stamp**, not a decorative status badge. The user should be able to confirm project/revision context at a glance without the context strip dominating the viewport.

## 8. Tactile interaction grammar

Interaction follows:

**SET → ENGAGE → CONFIRM**

Examples:

- set MSP/VO source;
- engage a task or operational control;
- confirm/save the Field Log.

Physicality is restrained:

- 1px depression/translation;
- inset edge change;
- surface response;
- state-marker activation;
- 100–180ms response;
- reduced-motion respected.

Avoid bounce, glow, pulse-as-decoration and permanent animation.

## 9. Typography

DATUM uses two voices:

- **Work voice** — highly readable task names, locations, notes and field values.
- **Reference voice** — WBS, UID, REV, dates, statuses and section metadata; use tabular/monospaced treatment selectively.

Critical site information must not become microscopic in pursuit of a technical aesthetic.

## 10. Homecoming principle

DATUM must become easier and more familiar through repetition.

Stable landmarks, predictable interaction grammar and obvious next actions matter more than novelty. A daily user should feel:

> **This is my field workspace. I know where I am. I know what comes next.**

The interface must not feel like a tactical cockpit that needs to be re-learned each morning.

## 11. Product boundaries

DATUM identity does **not** alter:

- Programme Engine or revision lifecycle;
- MSP/VO authority and XOR semantics;
- Activity and Site Diary ownership;
- Open Activities logic;
- Workforce, Weather or NSC semantics;
- approval/audit/security behaviour;
- APIs, database, RLS/RBAC or authentication;
- official JKR Site Diary Page 1 or continuation output.

The digital product may be branded DATUM while contractual output remains the authoritative required format.

## 12. Anti-identity

DATUM is not:

- a government portal;
- a generic dark Tailwind/shadcn dashboard;
- a gamer HUD;
- a crypto dashboard;
- a consumer-app clone;
- a collection of decorative tactical panels.

## 13. Quality benchmark

References remain benchmarks, not identity:

- Linear — precision and premium software discipline.
- DJI professional field software — field confidence and glanceability.
- The Division — restrained tactile state feedback only.
- Fieldwire/Procore — construction and enterprise reality.
- Grab/MAE/Shopee/ZUS — familiarity and return-to-work psychology.

DATUM itself must remain recognisable when those references are removed.

## 14. First canonical implementation

The first canonical DATUM proving ground is **Mobile New Entry**. It must demonstrate:

- Graphite/white/grey identity;
- compact authoritative project/revision context;
- Datum Spine orientation;
- source selection as an engaged instrument;
- Field Strip task scanning;
- continuous form rhythm instead of stacked form cards;
- coherent Workforce and notes treatment;
- a decisive confirm/save action;
- stable bottom navigation that belongs to the same product.

Only after this workflow passes the Product Owner/HQ visual gate should the language be propagated across Records, Approval, desktop and Operational Home.
