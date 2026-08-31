# NGAMSOI Product Identity Constitution

Status: **LOCKED — N01 brand foundation**

NGAMSOI is the product identity for the Site Diary digital fieldbook implementation.

The prior DATUM visual branch is retained as implementation lineage and design evidence. NGAMSOI supersedes DATUM as the product identity while preserving useful fieldbook, spine, source-loading and continuous-form patterns unless a later NGAMSOI pass explicitly changes them.

## 1. Core idea

NGAMSOI is a digital engineer's fieldbook anchored to an established reference point.

The product should feel:

- precise enough for engineering work;
- tactile enough for field use;
- calm enough for daily repetition;
- recognisable without relying on generic dark-dashboard conventions.

## 2. Mark construction

The NGAMSOI mark is built from two ideas:

1. **Reference marker** — the inverted triangular marker represents the reference we seek.
2. **Established point + baseline** — the stem intersects the baseline where the reference becomes fixed.

Together they express:

> **Reference found. Baseline locked. Everything else can now be measured, verified and recorded.**

Implementation rules:

- production mark is a native SVG/component, not a baked raster image;
- geometry is straight, centred and engineered;
- the mark must remain legible in monochrome;
- the baseline may carry the operational accent in product chrome;
- no glow, bevel, faux-metal effect or gamer ornament is required for recognition.

## 3. Wordmark

Canonical wordmark: **NGAMSOI**

Canonical line: **Kena boh! Ngamsoi.**

The wordmark uses a restrained condensed technical voice with deliberate tracking. It should not be over-bold.

The line has two roles:

- persistent brand signature when used in a lockup;
- completion ritual when a meaningful save/approve/generate action reaches confirmed completion.

The completion implementation itself belongs to N06.

## 4. Colour grammar

**Graphite is home. Ivory is truth. Grey is structure. Colour appears when state matters.**

Canonical N01 tokens:

- `--ng-graphite-1000` `#050607`
- `--ng-graphite-950` `#08090b`
- `--ng-graphite-925` `#0b0d10`
- `--ng-graphite-900` `#101216`
- `--ng-graphite-850` `#15181d`
- `--ng-graphite-800` `#1b1f25`
- `--ng-graphite-750` `#22272e`
- `--ng-graphite-700` `#2a3038`
- `--ng-graphite-650` `#373e47`
- `--ng-ivory-100` `#f3f0e8`
- `--ng-current` `#ff7a1a`
- `--ng-established` `#55b879`
- `--ng-warning` `#d4a64f`
- `--ng-destructive` `#e46d72`

Semantic meaning:

- **orange / current** — current position, active operational control, action key;
- **green / established** — valid, established, authoritative, approved;
- **amber / warning** — historical, superseded, caution;
- **red / destructive** — destructive or error;
- **ivory / white** — primary truth and committed information;
- **grey** — structure, metadata and inactive context.

Large decorative colour surfaces are not part of the identity.

## 5. Typography grammar

NGAMSOI uses three voices.

### Work voice

Human-readable field content:

- task names;
- locations;
- notes;
- contractor names;
- instructions and ordinary field values.

Properties: readable, calm, modest weight, compact but not microscopic.

Runtime class: `.ng-work-voice`.

### Reference voice

Authoritative and technical reference material:

- WBS;
- UID;
- revision;
- dates;
- status;
- programme code;
- audit/reference metadata.

Properties: mono/tabular treatment, restrained tracking, visually secondary to the human work value unless authority requires emphasis.

Runtime class: `.ng-reference-voice`.

### Brand voice

NGAMSOI wordmark and rare proprietary labels only.

Properties: condensed technical face, medium/semi-bold weight, controlled tracking, uppercase.

Runtime class: `.ng-brand-voice`.

## 6. Baseline grammar

The baseline is not decoration. It represents an established reference.

Use it selectively in:

- the product mark;
- selected-source / record-loaded state;
- spine nodes and transitions;
- action keys where the user commits an operational state.

Avoid repeating the symbol or baseline on every container.

## 7. Interaction principle

NGAMSOI retains the interaction grammar:

**SET → ENGAGE → CONFIRM**

N01 only establishes the identity foundation. Tactile state implementation is expanded in N02-N06.

## 8. Transitional compatibility

The branch is intentionally based on the frozen DATUM implementation head.

During N01:

- existing `datum-*` classes may remain as temporary implementation aliases;
- NGAMSOI tokens override their palette to prevent a destructive rewrite;
- visible product identity must be NGAMSOI;
- compatibility aliases are removed only when N02-N08 propagation makes them unnecessary.

This is technical lineage, not dual branding.

## 9. Frozen domain semantics

NGAMSOI identity must not change:

- Programme/Revision authority;
- MSP XOR VO/APK semantics;
- Activity/Site Diary ownership;
- Workforce semantics;
- Weather semantics;
- approval/audit/security behaviour;
- APIs, database, RLS/RBAC or authentication;
- official JKR Site Diary Page 1 or continuation output.

Identity is presentation and interaction grammar around existing authority.

## 10. N01 acceptance gate

N01 passes when:

- the shell visibly reads NGAMSOI rather than DATUM;
- the mark is rendered from native SVG geometry;
- the mark remains legible in monochrome and supports an orange operational baseline;
- graphite/ivory/semantic colour tokens exist in runtime CSS;
- Work / Reference / Brand typography voices exist as reusable runtime primitives;
- product metadata is NGAMSOI-branded;
- existing programme/revision behaviour is untouched;
- tests lock the identity contract.

N01 does **not** attempt the Workforce rebuild, final field language, complete Spine state grammar, completion sting, homecoming/nav rebuild or final Mobile New Entry visual gate. Those remain N02-N08.
