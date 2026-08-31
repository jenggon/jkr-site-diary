from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace(path: str, old: str, new: str, *, required: bool = True) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if old not in text:
        if required and new not in text:
            raise RuntimeError(f"Missing expected text in {path}: {old!r}")
        return
    target.write_text(text.replace(old, new), encoding="utf-8")


# Layout: Malay product language + final typography layer.
replace("src/app/layout.tsx", 'import "./ngamsoi-n04r.css";\n', 'import "./ngamsoi-n04r.css";\nimport "./ngamsoi-n05r2-type.css";\n')
replace("src/app/layout.tsx", 'lang="en"', 'lang="ms"')
replace(
    "src/app/layout.tsx",
    'description: "NGAMSOI digital engineer fieldbook for authoritative JKR site records",',
    'description: "NGAMSOI buku tapak digital JKR",',
)

# Mobile workspace navigation: one-word product destinations.
for old, new in [
    ("label: 'Laporan Baharu'", "label: 'Baharu'"),
    ("label: 'Aktiviti Terbuka'", "label: 'Aktiviti'"),
    ("label: 'Rekod / Sejarah'", "label: 'Rekod'"),
    ("label: 'Kelulusan'", "label: 'Semak'"),
]:
    replace("src/app/site-diary/SiteDiaryWorkspace.tsx", old, new)

# Daily entry: BM-only visible copy, one word preferred / two words maximum.
daily = [
    ('<span>Aktiviti Terbuka</span>', '<span>Aktiviti</span>'),
    ('<span>+ Laporan Baharu</span>', '<span>Baharu</span>'),
    ('<span>Melanjutkan Aktiviti Sedia Ada (Continuation Mode)</span>', '<span>Lanjut</span>'),
    ('aria-label="Kembali ke Senarai Aktiviti Terbuka"', 'aria-label="Kembali"'),
    ('<span>Kembali ke Aktiviti Terbuka</span>', '<span>Kembali</span>'),
    ("{existingActivityInfo.sourceType === 'VO' ? 'Kerja Tambahan / VO (APK)' : 'Kerja Jadual (MSP)'}", "{existingActivityInfo.sourceType === 'VO' ? 'VO' : 'MSP'}"),
    ("{existingActivityInfo.status === 'In Progress' ? 'Sedang Laksana' : 'Belum Mula'}", "{existingActivityInfo.status === 'In Progress' ? 'Laksana' : 'Baharu'}"),
    ('Batal Suntingan', 'Batal'),
    ('Tarikh & Status Kerja', 'Harian'),
    ('Tarikh Laporan Harian *', 'Tarikh *'),
    ('Tarikh Mula Sebenar (Known Start) *', 'Mula *'),
    ('Status Kemajuan Kerja *', 'Status *'),
    ('>Sedang Laksana (In Progress)</option>', '>Laksana</option>'),
    ('>Siap (Completed)</option>', '>Siap</option>'),
    ('Maklumat Tapak & Cuaca (Format JKR Page 1)', 'Tapak'),
    ('Lokasi Terperinci / Grid Line *', 'Lokasi *'),
    ('Skop Pelaksanaan *', 'Skop *'),
    ('>Kontraktor Utama (Main Contractor)</option>', '>Utama</option>'),
    ('>Sub-Kontraktor Dinamakan (NSC)</option>', '>NSC</option>'),
    ('Keadaan Cuaca Utama', 'Cuaca'),
    ('>-- Pilih Keadaan Cuaca (Pilihan) --</option>', '>Pilih</option>'),
    ('>Elok (Sunny/Fair)</option>', '>Elok</option>'),
    ('>Hujan (Rainy)</option>', '>Hujan</option>'),
    ('>Mendung (Cloudy)</option>', '>Mendung</option>'),
    ('>Ribut (Stormy)</option>', '>Ribut</option>'),
    ('Masa Mula Kerja', 'Kerja Mula'),
    ('Masa Tamat Kerja', 'Kerja Tamat'),
    ('Masa Mula Hujan', 'Hujan Mula'),
    ('Masa Tamat Hujan', 'Hujan Tamat'),
    ('Catatan & Huraian Kemajuan Kerja *', 'Catatan *'),
    ('placeholder="Nyatakan kemajuan fizikal, kuantiti kerja disiapkan, ujian konkrit/tetulang, atau isu tapak hari ini..."', 'placeholder="Catat kerja"'),
    ('<span>Menyimpan Laporan...</span>', '<span>Simpan…</span>'),
    ("{editingSiteDiaryId ? 'Kemaskini Laporan Buku Harian Tapak' : 'Hantar & Simpan Buku Harian Tapak'}", "{editingSiteDiaryId ? 'Kemas Kini' : 'Simpan'}"),
]
for old, new in daily:
    replace("src/app/site-diary/DailyEntryForm.tsx", old, new)

# Source selector: no bilingual/explanatory chrome on the working surface.
source = [
    ("? 'Kerja Jadual (MSP)'\n                    : 'Kerja Tambahan / VO (APK)'", "? 'MSP'\n                    : 'VO'"),
    ('Pengurangan (Omission)', 'Gugur'),
    ('Tukar Sumber', 'Tukar'),
    ('Sumber operasi', 'Sumber'),
    ('Pilih Sumber Aktiviti Harian', 'Sumber'),
    ('<span>Kerja Jadual (MSP)</span>', '<span>MSP</span>'),
    ('<span>Kerja Tambahan / VO (APK)</span>', '<span>VO</span>'),
    ("? 'Cari nama tugasan, WBS, atau UID...'\n                    : 'Cari no rujukan VO, item, atau perihalan...'", "? 'Cari'\n                    : 'Cari'"),
    ('<span>+ Daftar VO</span>', '<span>Tambah</span>'),
    ('Cuba Semula', 'Ulang'),
    ('Memuatkan tugasan jadual kerja...', 'Muat…'),
    ("? 'Tiada tugasan sepadan dengan carian.'\n                      : 'Tiada tugasan ditemui untuk semakan aktif ini.'", "? 'Tiada'\n                      : 'Tiada'"),
    ('Pastikan Program Kerja MSP telah diimport dan diluluskan.', ''),
    ('Memuatkan rekod VO / APK...', 'Muat…'),
    ("? 'Tiada rekod VO sepadan dengan carian.'\n                      : 'Tiada rekod kerja VO / APK didaftarkan bagi projek ini.'", "? 'Tiada'\n                      : 'Tiada'"),
    ('Anda boleh menambah item VO baharu menggunakan butang &quot;+ Daftar VO&quot;.', ''),
    ('+ Daftar VO Sekarang', 'Tambah'),
    ('Pengurangan', 'Gugur'),
    ('Penambahan', 'Tambah'),
    ('Daftar Item VO / APK Baharu', 'VO Baharu'),
    ('No Rujukan VO / Arahan Perubahan Kerja *', 'Rujukan *'),
    ('placeholder="cth: VO 01 / APK-01"', 'placeholder="VO / APK"'),
    ('Item Baris / Tajuk Kerja *', 'Kerja *'),
    ('placeholder="cth: Kerja Tambahan Paip HDPE 150mm"', 'placeholder="Tajuk kerja"'),
    ('Perihalan Terperinci (Pilihan)', 'Huraian'),
    ('placeholder="Huraian skop kerja tambahan / pengurangan..."', 'placeholder="Huraian"'),
    ('Kerja Gugur (Omission)', 'Gugur'),
    ("{creatingVo ? 'Menyimpan...' : 'Daftar & Simpan'}", "{creatingVo ? 'Simpan…' : 'Simpan'}"),
]
for old, new in source:
    replace("src/app/site-diary/OperationalSourceSelector.tsx", old, new, required=False)

# Workforce: figures first; Malay-only visible roster labels.
workforce = [
    ("{ field: 'non_bumi_count', short: 'NON-B', label: 'Bukan Bumiputera' }", "{ field: 'non_bumi_count', short: 'BUKAN', label: 'Bukan Bumiputera' }"),
    ('<div className="ng-workforce__kicker">WORKFORCE / SITE ROSTER</div>', '<div className="ng-workforce__kicker">PEKERJA</div>'),
    ('aria-label="Tenaga Kerja di Tapak (Workforce)"', 'aria-label="Tenaga Kerja Tapak"'),
    ('Tenaga Kerja di Tapak', 'Pekerja'),
    ('Tap angka untuk laras pekerja mengikut tred dan kerakyatan.', 'Tap angka'),
    ('<span>NON-B</span>', '<span>BUKAN</span>'),
    ('<div className="ng-workforce__empty">Tiada tred tenaga kerja ditambah.</div>', '<div className="ng-workforce__empty">Tiada</div>'),
    ('<strong>{activeClassification.label} · {compactTradeName}</strong>', '<strong>{compactTradeName}</strong>'),
    ('<div className="ng-workforce__add-title">ADD TRADE</div>', '<div className="ng-workforce__add-title">TRED</div>'),
    ('<option value="">Pilih dari katalog tred piawai</option>', '<option value="">Pilih tred</option>'),
    ('<option key={trade} value={trade}>{trade}</option>', '<option key={trade} value={trade}>{rosterTradeLabel(trade)}</option>'),
    ('placeholder="Atau taip nama tred khusus..."', 'placeholder="Tred baharu"'),
]
for old, new in workforce:
    replace("src/app/site-diary/WorkforceEntry.tsx", old, new)

# Runtime visual gate: new Malay source label + unified Geist product face.
replace("scripts/capture-ngamsoi-n05r-runtime.ts", "expect(topMetrics.sourcePrimitive.label).toBe('RECORD LOADED');", "expect(topMetrics.sourcePrimitive.label).toBe('SUMBER');")
replace(
    "scripts/capture-ngamsoi-n05r-runtime.ts",
    "expect(topMetrics.typography.referenceFamily).not.toBe(topMetrics.typography.inputFamily);",
    "expect(topMetrics.typography.referenceFamily).toBe(topMetrics.typography.inputFamily);\n    expect(topMetrics.typography.inputSize).toBeGreaterThanOrEqual(15);",
)

# Presentation tests follow the intentional BM microcopy contract. Behavioural/domain values stay unchanged.
test_copy = {
    "tests/integration/ui/dailyEntryContinuationMode.test.ts": [
        ("Melanjutkan Aktiviti Sedia Ada (Continuation Mode)", "Lanjut"),
    ],
    "tests/integration/ui/dailyEntryNavigationFlow.test.ts": [
        ("Kerja Jadual (MSP)", "MSP"),
        ("Kerja Tambahan / VO (APK)", "VO"),
        ("Tarikh &amp; Status Kerja", "Harian"),
        ("Aktiviti Terbuka", "Aktiviti"),
        ("+ Laporan Baharu", "Baharu"),
    ],
    "tests/integration/ui/dailyEntryParity.test.ts": [
        ("Tarikh &amp; Status Kerja", "Harian"),
        ("Maklumat Tapak &amp; Cuaca (Format JKR Page 1)", "Tapak"),
        ("Catatan &amp; Huraian Kemajuan Kerja *", "Catatan *"),
        ("Hantar &amp; Simpan Buku Harian Tapak", "Simpan"),
    ],
    "tests/integration/ui/diaryManagementList.test.ts": [
        ("Batal Suntingan", "Batal"),
        ("Kemaskini Laporan Buku Harian Tapak", "Kemas Kini"),
    ],
    "tests/integration/ui/openActivitiesLifecycleRaces.test.ts": [
        ("+ Laporan Baharu", "Baharu"),
        ("Sumber Aktiviti", "Sumber"),
    ],
    "tests/integration/ui/openActivitiesUi.test.ts": [
        ("Melanjutkan Aktiviti Sedia Ada (Continuation Mode)", "Lanjut"),
        ("Kembali ke Aktiviti Terbuka", "Kembali"),
        ("Tarikh &amp; Status Kerja", "Harian"),
        ("Laporan Baharu", "Baharu"),
        ("Aktiviti Terbuka", "Aktiviti"),
    ],
    "tests/integration/ui/siteDiaryWorkspace.test.ts": [
        ("'Laporan Baharu'", "'Baharu'"),
        ("'Aktiviti Terbuka'", "'Aktiviti'"),
        ("'Rekod / Sejarah'", "'Rekod'"),
        ("'Kelulusan'", "'Semak'"),
    ],
    "tests/unit/ui/operationalSourceSelector.test.ts": [
        ("Pilih Sumber Aktiviti Harian", "Sumber"),
        ("Kerja Jadual (MSP)", "MSP"),
        ("Kerja Tambahan / VO (APK)", "VO"),
        ("Tiada tugasan ditemui untuk semakan aktif ini.", "Tiada"),
        ("Tiada rekod kerja VO / APK didaftarkan bagi projek ini.", "Tiada"),
        ("Cuba Semula", "Ulang"),
    ],
    "tests/unit/ui/workforceEntry.test.ts": [
        ("Tenaga Kerja di Tapak (Workforce)", "Pekerja"),
        ("Tiada tred tenaga kerja ditambah", "Tiada"),
        ("NON-B", "BUKAN"),
    ],
}
for test_path, replacements in test_copy.items():
    for old, new in replacements:
        replace(test_path, old, new, required=False)

print("N05R.2 premium BM typography/microcopy pass applied")
