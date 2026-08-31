# N04R Workforce active-cell input + N05R.1 fluid spine refinement

## Intent
NGAMSOI Mobile New Entry must read as a field record being compiled from top to bottom. The spine is the directional authority path. Workforce is a scan-first roster: data stays continuously visible; editing controls exist only beside the selected working context.

## Frozen boundaries
- No API, persistence, RLS/RBAC, approval, audit, MSP/VO, weather or PDF semantic changes.
- Workforce payload remains `{ trade_name, bumi_count, non_bumi_count, foreign_count }[]`.
- `compiled` is presentation-only local completeness. It never means Saved, Approved or Verified.
- Mobile citizenship figure cells remain approximately 44px or greater as touch targets.

## N05R.1 — fluid compile spine
### Visual grammar
- `NEXT`: neutral continuous datum + hollow node.
- `COMPILED`: green check in the node; green segment carries authority toward the next node.
- `EDITING / REVISION`: reopening a completed section removes the check immediately; node becomes open orange and the orange segment dissolves downstream into the neutral datum.
- `CHECK`: red `!` node and red-to-neutral segment.

### Fluidity contract
- One uninterrupted neutral base rail exists behind all sections.
- Section state segments overlap the inter-section gap so the path never visually breaks between bands.
- Every node is mathematically centred on the same datum x-coordinate.
- Spine/node is the only section-state carrier: no legacy orange/green side slab, section wash or duplicated state border may compete with it.
- State transition is brief and restrained; no HUD pulse, large glow or decorative triangle.
- NGAMSOI triangle remains brand identity, not a repeated progress bullet.
- Reduced-motion preference disables compile animation.

### Reversion contract
1. Complete local section -> green `✓`.
2. Focus/reopen that section -> `✓` disappears immediately; orange open node.
3. Leave/re-close valid content -> green `✓` returns.
4. Validation alert -> red `!` overrides current/compiled presentation.

## N04R — Workforce active-cell input
### Default state
- Roster columns: TRED | BUMI | NON-B | ASING | Σ.
- Citizenship cells contain figures only.
- No permanent `- input +` steppers inside table cells.
- Adjustment controls are absent until a cell is activated: default roster is pure scan mode.
- Standard bilingual catalogue names collapse to the concise local/Malay label in the visible row; the canonical full trade name is preserved in title/ARIA/data payload.
- Visible trade label is one line with ellipsis when needed.

### Activation
- Tap a figure to select exactly one `(trade, citizenship)` cell.
- Selected cell receives a restrained orange inset/underline state.
- One contextual adjustment bay opens immediately below that same trade row, keeping the selected datum and controls in the same visual neighbourhood.
- Context bay identifies selected citizenship + concise trade label.
- `-` is disabled at zero; `+` remains available unless the component is disabled.
- Tapping the active figure again closes the bay and returns the row to scan mode.

### Mutation
- `+/-` mutates only the active cell through the existing `onChange` contract.
- Row total and overall total recalculate immediately.
- Removing a trade clears active-cell context.
- Hidden read-only compatibility inputs preserve existing UI/race-test read contracts without reintroducing visible input clutter.
- No direct database writes are introduced.

## Typography normalization
- Brand face is reserved for NGAMSOI identity/wordmark.
- Operational section headings use Work voice.
- Entered values use Work voice.
- Labels, IDs, totals and compact metadata use Reference voice.
- Mobile section heading > control value > reference label in scale hierarchy.
- Workforce figures are larger than reference headers but smaller than the overall authority total.

## Acceptance gate — 390x844 actual `/site-diary` runtime
Must prove:
- no horizontal overflow;
- RECORD LOADED pseudo-element regression remains fixed;
- heading and form values resolve to Work voice while labels resolve to Reference voice;
- spine node/rail alignment within 1.5px;
- compiled source node is `✓` and active section is an open node;
- state segment spans the inter-section gap;
- focused section has no legacy state background-image or inset side shadow;
- Workforce default row <= 50px in deterministic gate;
- visible trade label is `nowrap` scan text;
- each citizenship column has one visible figure button and zero embedded steppers;
- no adjustment bay exists before a figure is selected;
- selecting BUMI opens the bay directly against the active row (<=1.5px separation);
- `+` updates active value and overall total;
- active Workforce section unticks on edit and recompiles after the adjustment context closes and focus leaves.
