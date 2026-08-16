# F1 — Authoritative JKR Site Diary Page 1 Visual Contract

Status: LOCKED FOR F1 OUTPUT IMPLEMENTATION

## Authority

The Product Owner supplied the original JKR Site Diary Page 1 as the authoritative visual reference for F1 printable output. The implementation must reproduce its structure; it must not redesign the form.

## Page 1 Structure

The supplied form contains, in order:

1. JKR logo block, `JABATAN KERJA RAYA MALAYSIA`, and `TARIKH` field.
2. Twelve-hour weather clock.
3. `CUACA`, `WAKTU MULA HUJAN`, `WAKTU TAMAT HUJAN`, and `CATATAN` fields.
4. `1. KERJA YANG DIBINA HARI INI` activity table with columns:
   - Bil.
   - Kod WBS
   - Aktiviti/Kerja
   - Status Kemajuan: Mula / Sedang Laksana / Siap
   - Lokasi Aktiviti/Kerja
   - Waktu Mula
   - Waktu Tamat
5. `2. BILANGAN PEKERJA DI TAPAK BINA` table with:
   - Bil.
   - Jenis Kerja
   - Warganegara: Bumiputera / Bukan Bumi
   - Warga Asing
   - separate `Kontraktor` and `Subkontraktor Dinamakan (NSC)` blocks
   - `Jumlah` rows
6. Existing note/footer and page number.

## Continuation Page Derivation

Continuation/extension pages are derived from Page 1 according to the already-locked S5 rules. They are not independent redesigned reports.

- remove JKR header block;
- remove weather section and weather clock;
- maximize activity-row space;
- preserve the activity-table semantics and column ordering;
- reduce workforce/NSC space as required by overflow priority;
- use the locked overflow priority: Critical Task -> Ongoing Task -> Started Today -> Completed Today;
- when even continuation capacity is exhausted, render the locked digital-overflow notice.

## Product Guardrail

The printable endpoint is the original JKR Site Diary Page 1 plus continuation page(s) only when content requires them. No alternate dashboard/report may replace this output contract.
