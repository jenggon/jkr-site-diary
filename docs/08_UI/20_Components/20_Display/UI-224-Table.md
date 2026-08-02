# UI-224 - Table

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-224 |
|-------------|---------|
| Title | Table |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Tier-1 Core Component |
| Component Tier | Tier-1 |
| Template | UI-199C Extended Component Specification |
| Depends On | UI-199, UI-199A, UI-199B, UI-199C, UI-200A, UI-201, UI-202, UI-216, UI-220 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

The Table component provides the primary mechanism for presenting structured datasets within the JKR Site Diary Platform.

It is intended for displaying collections of records in a predictable, efficient, and scalable manner while preserving readability, accessibility, and performance.

The Table component shall function as a presentation component only.

Business rules, workflow decisions, validation logic, data persistence, and permission evaluation remain outside the responsibility of the Table component.

---

# 2. Objectives

The Table component shall:

• Present structured datasets consistently.

• Support efficient data scanning.

• Support enterprise-scale datasets.

• Enable reusable presentation patterns.

• Maintain accessibility.

• Support responsive behaviour.

• Support configurable layouts.

• Support progressive enhancement.

• Remain independent of business logic.

• Remain reusable across every module of the platform.

---

# 3. Philosophy

The Table component is designed according to five architectural principles.

---

## Principle 1

Presentation over Processing

The Table shall display information.

It shall never determine business outcomes.

Examples:

✓ Display Project Status

✓ Display Delay Days

✓ Display Contractor

✗ Approve Project

✗ Calculate Extension of Time

✗ Execute Payment Workflow

---

## Principle 2

Configuration over Customisation

Tables should be configured through metadata rather than rewritten.

Examples include:

Column definitions

Sorting

Filtering

Visibility

Alignment

Formatting

Width

Grouping

Density

---

## Principle 3

Composition over Complexity

The Table is composed from smaller reusable components.

Examples:

Table

↓

Row

↓

Cell

↓

Badge

↓

Button

↓

Avatar

↓

Icon

Rather than becoming one monolithic component.

---

## Principle 4

Scalability by Default

The same Table specification shall support:

10 records

100 records

1,000 records

10,000 records

100,000 records

without requiring architectural redesign.

Different rendering strategies may be applied according to dataset size.

---

## Principle 5

Predictability

Every Table shall behave consistently regardless of module.

Sorting behaves consistently.

Filtering behaves consistently.

Selection behaves consistently.

Expansion behaves consistently.

Keyboard navigation behaves consistently.

Users shall not need to relearn Table behaviour between modules.

---

# 4. Design Principles

The Table component shall adhere to the following design principles.

---

## 4.1 Consistency

Identical interactions shall produce identical behaviour.

---

## 4.2 Readability

Data shall be easier to read than to decorate.

Whitespace is preferred over unnecessary visual effects.

---

## 4.3 Discoverability

Available interactions should be obvious.

Hidden interactions should be minimised.

---

## 4.4 Efficiency

Frequent tasks shall require the fewest possible interactions.

---

## 4.5 Accessibility

Every supported interaction shall be accessible via keyboard.

Colour alone shall never communicate essential meaning.

---

## 4.6 Progressive Disclosure

Complex functionality should remain hidden until needed.

Example:

Basic users

↓

Simple Table

Power users

↓

Advanced Filters

↓

Column Management

↓

Bulk Actions

---

## 4.7 Independence

The Table component shall not assume:

Project structure

Business workflow

Approval state

Database schema

Programme engine

Task engine

Any business-specific implementation.

---

# 5. Usage

The Table component shall be used whenever structured datasets require comparison across multiple records and columns.

Typical usage includes:

Project Register

Site Diary Entries

Inspection Records

Material Deliveries

Concrete Cube Results

Workforce Register

Equipment Register

Approval Queue

Variation Orders

Payment Certificates

Correspondence Register

Audit Trail

Activity Register

Programme Progress

Risk Register

Issue Register

Quality NCR Register

Safety Observations

Document Register

AI Recommendations

Report Results

---

## Appropriate Use

Use Table when:

Multiple records exist.

Comparison across columns is important.

Sorting improves usability.

Filtering improves usability.

Users must scan many records.

Users perform bulk operations.

---

## Inappropriate Use

Do NOT use Table:

For dashboards.

For large text documents.

For article-style content.

For forms.

For single records.

For highly visual layouts.

For navigation menus.

---

# 6. Anti-patterns

The following implementations are prohibited.

---

## Anti-pattern 1

Table as Page Layout

Incorrect

Entire page built using tables.

Reason

Tables represent data.

Not layout.

---

## Anti-pattern 2

Business Logic Inside Table

Incorrect

if status == Approved

disable button

Reason

Business rules belong outside the Table.

---

## Anti-pattern 3

Unbounded Columns

Tables containing excessive columns without management.

Symptoms include:

Horizontal scrolling becoming mandatory.

Poor readability.

Loss of context.

---

## Anti-pattern 4

Visual Decoration

Using colours, borders, gradients, and icons without informational value.

---

## Anti-pattern 5

Inconsistent Behaviour

Different modules implementing different sorting behaviour.

Different keyboard shortcuts.

Different row selection behaviour.

Different pagination controls.

---

## Anti-pattern 6

Nested Interactive Components

Interactive components inside interactive rows that create conflicting interactions.

Example:

Clickable Row

↓

Clickable Button

↓

Clickable Menu

without defined interaction hierarchy.

---

# 7. Anatomy

The Table component consists of the following logical regions.

Table

├── Caption (Optional)

├── Toolbar (Optional)

├── Header

│      ├── Header Row

│      └── Header Cell

├── Body

│      ├── Row

│      └── Cell

├── Footer (Optional)

├── Pagination (Optional)

└── Status Area

       ├── Loading

       ├── Empty

       └── Error

Each region has an independent responsibility.

No region shall duplicate another region's responsibility.

---

# 8. Table Hierarchy

Application

↓

Workspace

↓

Card

↓

Table

↓

Row

↓

Cell

↓

Display Components

↓

Interactive Components

The Table shall remain a container.

Individual Cells are responsible for rendering content.

---

# 9. Variants

The following Table variants are supported.

Standard Table

Default enterprise presentation.

Compact Table

Higher information density.

Comfortable Table

Increased spacing for readability.

Bordered Table

Visible cell boundaries.

Borderless Table

Minimal visual separation.

Striped Table

Alternating row backgrounds.

Interactive Table

Rows support user interaction.

Read-only Table

Presentation only.

Grouped Table

Records organised into logical groups.

Tree Table

Hierarchical data presentation.

Virtual Table

Supports very large datasets.

Future variants shall remain backward compatible.

---

# 10. Density

Density controls information spacing without changing functionality.

Supported densities include:

Compact

Standard

Comfortable

Density shall affect:

Row height

Cell padding

Whitespace

Visual rhythm

Density shall never affect:

Business behaviour

Accessibility

Sorting

Filtering

Selection

---

# 11. Layout Modes

The Table component shall support multiple layout strategies.

Auto Layout

Column widths determined automatically.

Fixed Layout

Column widths predetermined.

Responsive Layout

Columns adapt according to available space.

Scrollable Layout

Horizontal scrolling enabled where appropriate.

Split Layout

Frozen columns with scrollable content.

Virtual Layout

Viewport-based rendering.

Layout strategy shall be configurable independently of dataset contents.

---

# END OF PART 1

---

# 12. Column Model

## Overview

Columns define the structure, meaning, and presentation of tabular information.

Columns describe metadata.

They do not contain business data.

Each column shall have an independent identity throughout its lifecycle.

---

## Column Responsibilities

A column is responsible for defining:

• Identity

• Display Name

• Width

• Alignment

• Visibility

• Formatting

• Sorting Capability

• Filtering Capability

• Search Participation

• Grouping Capability

• Export Behaviour

Columns shall never own row data.

---

## Required Column Attributes

Every column shall define:

Unique Identifier

Display Label

Data Type

Display Format

Alignment

Visibility

Sort Behaviour

Filter Behaviour

Search Behaviour

Export Behaviour

---

## Optional Attributes

Columns may define:

Tooltip

Description

Minimum Width

Maximum Width

Preferred Width

Resizable

Frozen

Hidden by Default

Custom Renderer

Aggregation Method

Permission Requirement

---

## Supported Data Types

The Table component shall support:

Text

Number

Currency

Percentage

Boolean

Enumeration

Date

Time

Date-Time

Duration

Status

Badge

Avatar

Icon

Progress

Hyperlink

Action

Composite

Future data types shall remain backward compatible.

---

## Column Identity

Each column shall possess a permanent identifier.

Display labels may change.

Identifiers shall remain stable.

Example:

Column ID

ProjectStatus

Display Name

Project Status

Changing the display label shall not invalidate filters or user preferences.

---

## Column Ordering

Columns shall support:

Default Order

User-defined Order

System-defined Order

Administrative Locking

Column order shall not modify underlying data.

---

## Column Width

Supported sizing methods include:

Automatic

Fixed Width

Minimum Width

Maximum Width

Content-based Width

Viewport-based Width

Columns shall never become unreadable.

---

# 13. Row Model

## Overview

Rows represent individual business records.

Each row corresponds to one logical entity.

Examples include:

Site Diary Entry

Inspection

Project

Task

Variation Order

Payment Certificate

Concrete Cube Result

Worker

Equipment

Rows contain data only.

They shall not contain presentation logic.

---

## Row Responsibilities

Rows are responsible for:

Holding business data.

Maintaining record identity.

Supporting interaction state.

Providing rendering context.

Rows shall never determine business rules.

---

## Required Row Attributes

Every row shall define:

Unique Identifier

Data Object

Rendering State

Selection State

Expansion State

Visibility State

---

## Optional Attributes

Rows may define:

Hierarchy Level

Parent Identifier

Grouping Identifier

Validation Status

Permission Context

Highlight State

Pinned State

---

## Row Identity

Each row shall possess a stable identifier.

Sorting

Filtering

Searching

Grouping

Selection

shall never modify Row Identity.

---

## Row Ordering

Rows may be ordered by:

Original Dataset

Sorting Rules

Grouping

User Preference

Server Response

The displayed order shall remain independent from business identifiers.

---

## Row Lifecycle

Data Loaded

↓

Visible

↓

Updated

↓

Filtered

↓

Hidden

↓

Removed

Rendering state shall not affect business state.

---

# 14. Cell Model

## Overview

Cells represent intersections between rows and columns.

A Cell combines:

Row Data

+

Column Metadata

↓

Rendered Content

The Cell is the smallest independently renderable unit within the Table.

---

## Cell Responsibilities

Cells shall:

Display information.

Support formatting.

Support interaction where applicable.

Respect accessibility.

Remain stateless regarding business workflows.

---

## Cell Content

Cells may contain:

Plain Text

Numbers

Dates

Badges

Buttons

Icons

Avatars

Progress Indicators

Hyperlinks

Status Indicators

Composite Components

Custom Components

---

## Cell Rendering

Rendering shall depend upon:

Column Metadata

Row Data

Design Tokens

Display Rules

Rendering shall never modify underlying data.

---

## Cell Alignment

Supported alignment includes:

Left

Centre

Right

Justified (rare)

Automatic

Alignment should correspond to data type.

Example:

Text

↓

Left

Numbers

↓

Right

Boolean

↓

Centre

---

## Cell Formatting

Formatting may include:

Currency

Date Format

Number Precision

Percentage

Status Colours

Typography

Whitespace

Formatting shall remain presentation only.

---

## Cell Overflow

Supported overflow behaviour:

Wrap

Truncate

Ellipsis

Expandable

Scrollable

Overflow strategy shall be configurable.

---

## Cell Interaction

Cells may support:

Selection

Copy

Tooltip

Hyperlink

Button

Inline Action

Editing (future section)

Interaction hierarchy shall remain predictable.

---

# 15. Header Model

## Purpose

Headers define the meaning of columns.

Headers shall never contain row data.

---

## Header Responsibilities

Headers may provide:

Column Name

Sorting

Filtering

Grouping

Resize Handle

Tooltip

Selection Checkbox

Menu

---

## Header States

Default

Hover

Focused

Sorted

Filtered

Disabled

---

## Multi-level Headers

The Table shall support grouped headers.

Example

Project Information

↓

Project ID

Project Name

Contractor

without affecting row structure.

---

## Frozen Headers

Headers may remain visible during scrolling.

Header behaviour shall remain independent from body rendering.

---

# 16. Footer Model

## Purpose

The Footer provides summary information.

---

## Typical Footer Content

Record Count

Totals

Average

Minimum

Maximum

Custom Summary

Footer content shall remain read-only.

---

## Footer Responsibilities

The Footer shall never:

Store business data.

Modify records.

Trigger business workflows.

---

## Footer Variants

Static

Summary

Aggregated

Custom

---

# 17. Group Header

## Purpose

Group Headers visually organise related records.

Example

Project A

↓

Activities

↓

Rows

---

## Responsibilities

Group Headers shall:

Improve readability.

Support collapse.

Support expand.

Display summary information.

---

## States

Expanded

Collapsed

Loading

Hidden

---

# 18. Sticky Areas

## Sticky Header

Headers may remain visible during vertical scrolling.

---

## Sticky Columns

Selected columns may remain visible during horizontal scrolling.

Typical examples:

Selection

Project Number

Status

---

## Sticky Footer

Optional.

Useful for totals and summaries.

---

## Behaviour Rules

Sticky regions shall:

Remain synchronised with scrolling.

Preserve accessibility.

Avoid layout shifts.

Support responsive layouts.

---

# 19. Rendering Hierarchy

Application

↓

Workspace

↓

Card

↓

Table

↓

Header

↓

Row

↓

Cell

↓

Display Component

↓

Interactive Component

Rendering responsibilities shall flow from parent to child.

No child component shall alter parent layout behaviour.

---

# END OF PART 2

---

# 20. Sorting Model

## Purpose

Sorting enables users to reorder records according to one or more column values without modifying the underlying dataset.

Sorting shall affect presentation only.

Business data shall remain unchanged.

---

## Supported Sorting Modes

Single Column

Multi Column

Server-side Sorting

Client-side Sorting

Custom Sorting

Natural Sorting

---

## Sorting Behaviour

Sorting shall:

Preserve Row Identity.

Maintain Selection State.

Maintain Expansion State.

Respect Active Filters.

Support Ascending and Descending order.

---

## Sorting State Machine

Not Sorted

↓

Ascending

↓

Descending

↓

Not Sorted

The behaviour shall remain consistent across all modules.

---

## Sorting Priority

For Multi-column Sorting:

Primary Sort

↓

Secondary Sort

↓

Tertiary Sort

The precedence shall follow the order specified by the user.

---

# 21. Filtering Model

## Purpose

Filtering limits the visible dataset according to defined criteria.

Filtering shall never modify the source dataset.

---

## Supported Filter Types

Text

Number

Date

Range

Boolean

Enumeration

Status

Hierarchy

Custom

---

## Filter Behaviour

Filtering shall:

Be composable.

Support multiple active filters.

Support clearing individual filters.

Support clearing all filters.

Support persistent filters where configured.

---

## Filter Combination

Multiple filters shall be evaluated using configurable logical operators.

Typical modes:

AND

OR

Mixed Logic

The evaluation strategy shall remain configurable.

---

## Filter State Machine

No Filter

↓

Active Filter

↓

Modified Filter

↓

Cleared Filter

↓

No Filter

---

# 22. Search Model

## Purpose

Search provides rapid discovery of records.

Search shall complement filtering.

Search shall not replace filtering.

---

## Search Scope

Entire Table

Visible Columns

Selected Columns

Searchable Columns

Server-side Search

---

## Search Behaviour

Search shall support:

Partial Match

Exact Match

Case-insensitive Matching

Configurable Case-sensitive Matching

Incremental Search

Debounced Search

---

## Search State Machine

Idle

↓

Searching

↓

Results Found

↓

No Results

↓

Cleared

---

# 23. Pagination Model

## Purpose

Pagination divides datasets into manageable pages.

---

## Supported Modes

Client-side Pagination

Server-side Pagination

Cursor Pagination

Offset Pagination

---

## Pagination Behaviour

Pagination shall:

Maintain Filters.

Maintain Sorting.

Maintain Column Configuration.

Maintain User Preferences.

---

## Navigation

First Page

Previous Page

Next Page

Last Page

Jump to Page

---

## State Machine

Page Loaded

↓

Navigate

↓

Loading

↓

Loaded

↓

Error (if applicable)

---

# 24. Infinite Scrolling

## Purpose

Infinite Scrolling progressively loads additional records.

---

## Behaviour

Records shall be appended.

Existing records shall remain stable.

Scroll position shall be preserved.

---

## Loading Strategy

Viewport approaches end

↓

Load Next Batch

↓

Append Records

↓

Continue

---

Infinite Scrolling shall never duplicate records.

---

# 25. Virtualization

## Purpose

Virtualization optimises rendering for very large datasets.

---

## Behaviour

Only visible rows shall be rendered.

Off-screen rows may be recycled.

Business data shall remain unaffected.

---

## Virtualization Threshold

Implementation-specific.

The threshold shall remain configurable.

---

## Rendering Lifecycle

Dataset

↓

Viewport

↓

Visible Rows

↓

Rendered Components

---

# 26. Row Selection

## Supported Modes

Single Selection

Multiple Selection

Range Selection

Checkbox Selection

Programmatic Selection

---

## Selection Behaviour

Selection shall survive:

Sorting

Filtering

Pagination

Virtualization

unless explicitly configured otherwise.

---

## Selection State Machine

Unselected

↓

Selected

↓

Multi Selected

↓

Deselected

---

Bulk operations shall consume Selection State rather than visible order.

---

# 27. Cell Selection

## Purpose

Cell Selection enables interaction with individual cells.

---

## Supported Operations

Copy

Inspect

Highlight

Navigate

Edit (future)

---

## Behaviour

Cell selection shall remain independent of Row Selection.

---

# 28. Expandable Rows

## Purpose

Expandable Rows reveal supplementary information.

---

## Expanded Content

Examples:

Activity Details

Comments

Attachments

Audit Trail

Inspection Findings

---

## State Machine

Collapsed

↓

Expanded

↓

Collapsed

---

Expansion shall not alter Row Identity.

---

# 29. Inline Actions

## Purpose

Inline Actions provide contextual operations.

---

## Examples

View

Edit

Download

History

Print

Share

---

## Behaviour

Inline Actions shall:

Remain optional.

Respect permissions.

Remain visually discoverable.

Never interfere with Row Selection.

---

## Interaction Priority

Row Selection

↓

Inline Action

↓

Menu

Interaction precedence shall remain deterministic.

---

# 30. Inline Editing

## Purpose

Inline Editing enables modification without leaving the Table.

---

## Supported Modes

Single Cell

Entire Row

Batch Editing

---

## Validation

Validation shall occur before committing changes.

Invalid edits shall never overwrite valid data.

---

## State Machine

Read

↓

Edit

↓

Validate

↓

Commit

↓

Read

or

↓

Validation Error

↓

Edit

---

# 31. Keyboard Navigation

## Supported Navigation

Arrow Keys

Tab

Shift + Tab

Home

End

Page Up

Page Down

Enter

Escape

Space

---

## Behaviour

Keyboard interaction shall provide equivalent functionality to pointer interaction wherever practicable.

Focus order shall remain predictable.

---

# 32. Interaction Priority Rules

When multiple interactions coexist, precedence shall be deterministic.

Highest Priority

Modal Interaction

↓

Inline Editing

↓

Context Menu

↓

Inline Action

↓

Row Expansion

↓

Row Selection

↓

Hover Effects

Lowest Priority

No interaction shall produce ambiguous behaviour.

---

# END OF PART 3

---

# 33. Accessibility

## Purpose

The Table component shall remain fully accessible to all supported users regardless of input method or assistive technology.

Accessibility is a core architectural requirement and shall not be treated as an optional enhancement.

---

## General Requirements

The Table shall:

• Support keyboard-only navigation.

• Support screen readers.

• Preserve logical reading order.

• Expose semantic table structures.

• Maintain visible keyboard focus.

• Avoid colour-only communication.

---

## Keyboard Accessibility

Supported keyboard interactions include:

Tab

Shift + Tab

Arrow Keys

Home

End

Page Up

Page Down

Enter

Escape

Space

Keyboard behaviour shall remain consistent across all modules.

---

## Screen Reader Support

Tables shall expose:

Table

Header

Row

Column

Cell

Selection

Sorting State

Expansion State

Where supported by the implementation platform.

---

## Focus Management

Focus shall never become trapped.

Focus shall remain visible.

Focus order shall remain predictable.

---

## Colour Independence

Status shall never rely solely on colour.

Additional indicators may include:

Icons

Text

Patterns

Labels

---

# 34. Responsive Behaviour

## Purpose

The Table component shall remain usable across supported devices.

Responsive behaviour shall preserve usability rather than pixel-perfect layouts.

---

## Responsive Strategies

Supported strategies include:

Horizontal Scrolling

Column Prioritisation

Column Hiding

Responsive Cards

Expandable Rows

Adaptive Density

---

## Small Screens

Small devices may:

Reduce visible columns.

Collapse secondary information.

Replace table presentation with card layouts where appropriate.

---

## Behaviour Rules

Responsive behaviour shall not modify:

Business Data

Sorting

Filtering

Selection

Permissions

---

# 35. AI Behaviour

## Purpose

The Table component shall support AI-assisted workflows without transferring ownership of presentation behaviour.

---

## Supported AI Scenarios

AI may:

Highlight anomalies.

Recommend filters.

Recommend sorting.

Suggest grouped views.

Recommend hidden insights.

Generate summaries.

Highlight risks.

Recommend actions.

---

## AI Restrictions

AI shall never:

Modify user data.

Automatically execute row actions.

Approve records.

Delete records.

Override permissions.

---

## AI Presentation

AI recommendations shall remain distinguishable from user-generated data.

Users shall always retain final decision authority.

---

# 36. Composition

## Component Composition

The Table component composes the following reusable components.

Design Tokens

↓

Box

↓

Stack

↓

Icon

↓

Button

↓

Badge

↓

Avatar

↓

Tooltip

↓

Table

↓

Application

---

## Supported Child Components

Examples include:

Badge

Avatar

Button

Icon

Link

Chip

Progress Indicator

Status Indicator

Statistic

Custom Renderers

---

## Composition Rules

Composition shall remain modular.

Business components shall not replace structural table regions.

---

# 37. Dependency Tree

The dependency hierarchy shall be as follows.

Design Tokens

↓

Box

↓

Stack

↓

Divider

↓

Icon

↓

Button

↓

Badge

↓

Avatar

↓

Tooltip

↓

Table

↓

Business Modules

Dependencies shall remain acyclic.

Circular dependencies are prohibited.

---

# 38. Design Tokens

The Table component shall consume the following Design Tokens.

Spacing Tokens

Typography Tokens

Colour Tokens

Border Tokens

Elevation Tokens

Motion Tokens

Radius Tokens

Sizing Tokens

Breakpoint Tokens

Animation Tokens

Hardcoded values are prohibited unless explicitly approved.

---

# 39. Validation Rules

The Table component shall validate configuration before rendering.

---

## Required Validation

Unique Column Identifiers

Unique Row Identifiers

Valid Column Definitions

Supported Data Types

Valid Sorting Configuration

Valid Filtering Configuration

Accessible Labels

---

## Invalid Configuration

Invalid configurations shall fail gracefully.

The component shall never crash because of configuration errors.

---

# 40. Performance

## Performance Objectives

The Table component shall remain performant across enterprise-scale datasets.

---

## Recommended Rendering Strategy

Up to 100 Rows

↓

Standard Rendering

---

100–1,000 Rows

↓

Pagination

---

1,000–10,000 Rows

↓

Pagination

+

Virtualization

---

More than 10,000 Rows

↓

Server-side Data Provider

+

Virtualization

---

## Performance Principles

Avoid unnecessary re-rendering.

Avoid deeply nested render trees.

Avoid duplicate rendering.

Prefer lazy loading.

Prefer asynchronous data loading.

---

# 41. Security

## Purpose

The Table component shall support secure presentation of information.

---

## Security Principles

Presentation shall respect:

Role-based Access Control (RBAC)

Permission-based Visibility

Sensitive Data Masking

Read-only Restrictions

Audit Requirements

---

## Sensitive Information

Examples include:

Financial Amounts

Personal Information

Government Identifiers

Security Classifications

Commercial Information

Sensitive information shall never be exposed through presentation alone.

---

# 42. Examples

## Correct Examples

✓ Approval Queue

✓ Site Diary Register

✓ Material Register

✓ Equipment Register

✓ Programme Activities

✓ Audit Trail

✓ Concrete Cube Results

✓ Risk Register

---

## Incorrect Examples

✗ Login Form

✗ Dashboard Layout

✗ Modal Dialog

✗ Rich Text Document

✗ Image Gallery

---

# 43. Related Components

Box

Stack

Divider

Card

List

List Item

Button

Icon Button

Badge

Chip

Avatar

Icon

Tooltip

Progress Indicator

Empty State

Tree View

---

# 44. Related Patterns

CRUD Pattern

Approval Pattern

Dashboard Pattern

Workspace Pattern

Search Pattern

Audit Pattern

Reporting Pattern

Inspection Pattern

---

# 45. Architecture Decisions

## ADR-001

Decision

The Table component is a presentation component only.

Reason

Business logic belongs to higher architectural layers.

---

## ADR-002

Decision

Sorting shall be independently configurable.

Reason

Different modules require different sorting strategies.

---

## ADR-003

Decision

Filtering shall be externally configurable.

Reason

Business requirements differ across modules.

---

## ADR-004

Decision

Pagination shall remain optional.

Reason

Small datasets should not require unnecessary pagination.

---

## ADR-005

Decision

Virtualization shall be optional.

Reason

Rendering strategy depends on dataset size.

---

## ADR-006

Decision

Columns own metadata.

Rows own business data.

Reason

Clear separation of responsibilities.

---

## ADR-007

Decision

Interaction capabilities shall be independently composable.

Reason

Modules may require different combinations of sorting, filtering, pagination, selection, editing, and expansion without introducing unnecessary coupling.

---

## ADR-008

Decision

The Table component shall remain implementation-framework agnostic.

Reason

The specification defines architectural behaviour rather than implementation technology.

---

# 46. Version History

| Version | Description |
|----------|-------------|
|1.0.0|Initial Release|

---

# Document Status

Status

LOCKED

Version

1.0.0

Classification

Tier-1 Core Enterprise Component

Template

UI-199C Extended Component Specification

END OF DOCUMENT
