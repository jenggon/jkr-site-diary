from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def replace(path: str, old: str, new: str, *, required: bool = False) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if old not in text:
        if required and new not in text:
            raise RuntimeError(f"Missing expected text in {path}: {old!r}")
        return
    target.write_text(text.replace(old, new), encoding="utf-8")


def regex_replace(path: str, pattern: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    updated = re.sub(pattern, new, text, flags=re.DOTALL)
    target.write_text(updated, encoding="utf-8")


# One action word is enough for both create and edit; state context already explains the operation.
replace(
    "src/app/site-diary/DailyEntryForm.tsx",
    "{editingSiteDiaryId ? 'Kemas Kini' : 'Simpan'}",
    "Simpan",
)

# Source selector: remove instructional prose; the MSP/VO switch itself is the explanation.
regex_replace(
    "src/app/site-diary/OperationalSourceSelector.tsx",
    r'\s*<p className="text-xs text-zinc-400 mt-0\.5">\s*Setiap aktiviti tapak mestilah berpunca daripada <strong>Kerja Jadual \(MSP\)</strong>\{\x27 \x27\}\s*atau <strong>Kerja Tambahan / VO \(APK\)</strong>\.\s*</p>',
    "",
)

# Open Activities participates in the same product language. Error detail remains descriptive,
# but permanent controls and empty/loading chrome stay at one or two visible words.
for old, new in [
    ("Memuatkan senarai aktiviti terbuka...", "Muat…"),
    ("Cuba Semula", "Ulang"),
    ("Tiada Aktiviti Terbuka", "Tiada"),
    ("Tiada aktiviti kerja terbuka untuk disambung pada masa ini. Sila cipta laporan baharu untuk memulakan aktiviti kerja.", ""),
    ("+ Cipta Laporan Baharu", "Baharu"),
    ("Senarai Aktiviti Terbuka ({activities.length})", "Aktiviti · {activities.length}"),
    ("Muat Semula", "Muat"),
]:
    replace("src/app/site-diary/OpenActivitiesList.tsx", old, new)

# Workforce action is already contextual; no decorative plus or shout-case copy.
replace("src/app/site-diary/WorkforceEntry.tsx", ">\n            + TAMBAH\n          </button>", ">\n            Tambah\n          </button>")

# Runtime capture uses the same concise labels as the real UI.
replace(
    "scripts/capture-ngamsoi-n05r-runtime.ts",
    "await page.getByRole('tab', { name: 'Laporan Baharu' }).click();",
    "await page.getByRole('tab', { name: 'Baharu' }).click();",
)
replace(
    "scripts/capture-ngamsoi-n05r-runtime.ts",
    "await expect(page.getByText('Pilih Sumber Aktiviti Harian')).toBeVisible();",
    "await expect(page.getByRole('heading', { name: 'Sumber' })).toBeVisible();",
)

# Remaining presentation assertions from the contract migration.
for path, pairs in {
    "tests/integration/ui/dailyEntryNavigationFlow.test.ts": [
        ("Tukar Sumber", "Tukar"),
    ],
    "tests/integration/ui/dailyEntryParity.test.ts": [
        ("Tenaga Kerja di Tapak (Workforce)", "Pekerja"),
        ("Kemaskini Laporan Buku Harian Tapak", "Simpan"),
        ("Catatan &amp; Huraian Kemajuan Kerja", "Catatan"),
    ],
    "tests/integration/ui/diaryManagementList.test.ts": [
        ("Kemas Kini", "Simpan"),
    ],
    "tests/integration/ui/openActivitiesUi.test.ts": [
        ("+ Cipta Baharu", "Baharu"),
        ("+ Cipta Laporan Baharu", "Baharu"),
        ('aria-label="Kembali ke Senarai Aktiviti"', 'aria-label="Kembali"'),
        ("Tenaga Kerja di Tapak (Workforce)", "Pekerja"),
        ("Muat Semula", "Muat"),
        ("Cuba Semula", "Ulang"),
        ("Tiada Aktiviti", "Tiada"),
        ("Memuatkan senarai aktiviti terbuka...", "Muat…"),
        ("Kerja Jadual (MSP)", "MSP"),
        ("Kerja Tambahan / VO (APK)", "VO"),
    ],
    "tests/unit/ui/operationalSourceSelector.test.ts": [
        ("Tukar Sumber", "Tukar"),
    ],
}.items():
    for old, new in pairs:
        replace(path, old, new)

print("N05R.2 concise BM refinement applied")
