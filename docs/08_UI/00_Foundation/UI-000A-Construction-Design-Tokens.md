# UI-000A - Construction Design Tokens

| Document ID | UI-000A |
|--------------|----------|
| Title | Construction Design Tokens |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | UI Foundation |
| Depends On | UI-000 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

Construction Design Tokens define the canonical visual language of the JKR Site Diary Platform.

They represent the single source of truth for all visual values used across the platform.

Every interface, component and page shall consume these tokens rather than defining raw visual properties independently.

---

# 2. Objectives

The Design Token system exists to:

- Ensure visual consistency.
- Simplify maintenance.
- Improve scalability.
- Enable theming.
- Separate design intent from implementation.
- Reduce duplicated styling.
- Improve AI-generated UI consistency.

---

# 3. Token Philosophy

Tokens describe purpose.

Not implementation.

For example:

Correct

color.surface.primary

Incorrect

#1E1E1E

The actual implementation value may change.

The semantic meaning shall not.

---

# 4. Token Hierarchy

Construction Operations Experience

↓

Construction Design Tokens

↓

Design System

↓

Components

↓

Pages

↓

Application

Every visual element ultimately derives its appearance from this hierarchy.

---

# 5. Colour Tokens

## Background

color.background.primary

Primary application workspace.

---

color.background.secondary

Secondary workspace.

---

color.background.overlay

Overlay workspace.

---

## Surface

color.surface.primary

Operational card.

---

color.surface.secondary

Supporting card.

---

color.surface.raised

Floating content.

---

## Action

color.action.primary

Primary action.

Construction Orange.

---

color.action.secondary

Secondary action.

Steel Blue.

---

color.action.disabled

Disabled controls.

---

## Status

color.status.success

Approved.

Completed.

Healthy.

---

color.status.warning

Requires attention.

---

color.status.danger

Critical.

---

color.status.info

Engineering information.

---

color.status.neutral

Reference information.

---

# 6. Typography Tokens

font.heading.xl

font.heading.lg

font.heading.md

font.body.lg

font.body.md

font.body.sm

font.caption

Typography shall prioritise readability over branding.

---

# 7. Spacing Tokens

Spacing follows an 8-point system.

space.025

space.050

space.100

space.150

space.200

space.300

space.400

space.500

space.600

No arbitrary spacing values shall be introduced.

---

# 8. Radius Tokens

radius.none

radius.sm

radius.md

radius.lg

radius.xl

Components shall consume tokenised radius values only.

---

# 9. Elevation Tokens

elevation.000

Flat

---

elevation.100

Card

---

elevation.200

Floating Panel

---

elevation.300

Drawer

---

elevation.400

Modal

---

elevation.500

Critical Overlay

Elevation communicates hierarchy.

Never decoration.

---

# 10. Motion Tokens

motion.instant

motion.fast

motion.normal

motion.slow

Motion shall communicate operational change.

Never entertainment.

---

# 11. Icon Tokens

Lucide Icons are the standard icon library.

icon.xs

icon.sm

icon.md

icon.lg

icon.xl

---

# 12. Shadow Tokens

shadow.none

shadow.sm

shadow.md

shadow.lg

Shadows communicate depth.

Never decoration.

---

# 13. Breakpoint Tokens

breakpoint.mobile

breakpoint.tablet

breakpoint.desktop

breakpoint.wide

Responsive behaviour shall reference semantic breakpoints.

---

# 14. Future Expansion

Future token groups may include:

- Glass
- Blur
- Heatmaps
- BIM Layers
- AR
- Digital Twin
- AI Visualization

Backward compatibility shall always be preserved.

---

# 15. Governance

No UI component shall define raw visual values.

Every visual property shall consume Design Tokens.

Design Tokens are the single source of truth for all visual implementation.

---

# Document Status

Status

LOCKED

Version

1.0.0

Foundation Specification

---

END OF DOCUMENT