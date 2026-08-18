import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const form = readFileSync(resolve('src/app/site-diary/DailyEntryForm.tsx'), 'utf8');
const route = readFileSync(resolve('src/app/api/site-diary/[siteDiaryId]/route.ts'), 'utf8');
const repository = readFileSync(resolve('src/repositories/atomic/ResidualAtomicRepository.ts'), 'utf8');

describe('F2.3-B02 production PATCH caller sweep', () => {
  it('requires and forwards concurrency authority through every production layer', () => {
    expect(form).toContain('setExpectedLastModifiedAt(diary.updated_at ?? diary.submitted_at ?? null)');
    expect(form).toContain('expected_last_modified_at: params.expectedLastModifiedAt');
    expect(route).toContain('expected_last_modified_at: z.string().datetime({ offset: true })');
    expect(route).toContain('expectedLastModifiedAt: parseResult.data.expected_last_modified_at');
    expect(repository).toContain('p_expected_last_modified_at: expectedLastModifiedAt');
  });

  it('keeps token out of the mutation payload and preserves exact Site Diary identity', () => {
    expect(form).toContain('/api/site-diary/${encodeURIComponent(params.editingSiteDiaryId)}');
    expect(repository).toContain('p_site_diary_id: siteDiaryId');
    expect(repository).toContain('p_payload: payload');
    expect(repository).not.toContain("payload.expected_last_modified_at");
  });

  it('keeps the 409 path fail-closed without clearing unsaved form state', () => {
    const staleStart = form.indexOf('if (patchRes.status === 409)');
    const staleEnd = form.indexOf('if (!patchRes.ok)', staleStart);
    const staleBranch = form.slice(staleStart, staleEnd);
    expect(staleBranch).toContain('throw new Error');
    expect(staleBranch).not.toContain('fetcher(');

    const submitCatchStart = form.indexOf('} catch (err: unknown) {', form.indexOf('const handleSubmit'));
    const submitCatchEnd = form.indexOf('} finally {', submitCatchStart);
    const submitCatch = form.slice(submitCatchStart, submitCatchEnd);
    expect(submitCatch).toContain('setFormError(msg)');
    expect(submitCatch).not.toMatch(/setNotes|setManpower|setLocation|invalidateContinuationContext/);
  });
});
