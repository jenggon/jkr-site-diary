[CmdletBinding()]
param([pscustomobject]$Configuration)

Set-StrictMode -Version Latest

$libraryDirectory = Join-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -ChildPath 'lib'
. (Join-Path -Path $libraryDirectory -ChildPath 'logger.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'formatter.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'utils.ps1')

function Invoke-DatabaseReadinessCheck {
    [CmdletBinding()]
    param([pscustomobject]$Configuration)

    $projectRoot = Get-AuditProjectRoot -StartPath $PSScriptRoot
    $details = [System.Collections.Generic.List[object]]::new()
    $status = 'PASS'
    $summary = 'Database artifacts and documentation are present.'

    Write-AuditSection -Text 'Database Readiness'

    foreach ($artifact in @(
            [pscustomobject]@{ Name = 'baseline.sql'; Path = Join-AuditPath -BasePath $projectRoot -ChildPath 'baseline.sql'; Type = 'File' },
            [pscustomobject]@{ Name = 'Supabase directory'; Path = Join-AuditPath -BasePath $projectRoot -ChildPath 'supabase'; Type = 'Directory' },
            [pscustomobject]@{ Name = 'Migrations directory'; Path = Join-AuditPath -BasePath $projectRoot -ChildPath @('supabase', 'migrations'); Type = 'Directory' },
            [pscustomobject]@{ Name = 'Database documentation'; Path = Join-AuditPath -BasePath $projectRoot -ChildPath @('docs', '06_Database'); Type = 'Directory' }
        )) {
        $exists = if ($artifact.Type -eq 'File') { Test-AuditFile -Path $artifact.Path } else { Test-AuditDirectory -Path $artifact.Path }
        $details.Add([pscustomobject]@{ Item = $artifact.Name; Value = if ($exists) { 'Found' } else { 'Not found' }; Status = if ($exists) { 'PASS' } else { 'FAIL' } })
        if (-not $exists) {
            $status = 'FAIL'
            $summary = "Required database artifact is missing: $($artifact.Name)."
        }
    }

    $migrationDirectory = Join-AuditPath -BasePath $projectRoot -ChildPath @('supabase', 'migrations')
    if (Test-AuditDirectory -Path $migrationDirectory) {
        $migrationCount = @(Get-ChildItem -LiteralPath $migrationDirectory -Filter '*.sql' -File).Count
        $details.Add([pscustomobject]@{ Item = 'Migration SQL files'; Value = $migrationCount; Status = if ($migrationCount -gt 0) { 'PASS' } else { 'WARNING' } })
        if ($migrationCount -eq 0 -and $status -eq 'PASS') {
            $status = 'WARNING'
            $summary = 'Migration directory exists but contains no SQL migration files.'
        }
    }

    $databaseDocs = Join-AuditPath -BasePath $projectRoot -ChildPath @('docs', '06_Database')
    if (Test-AuditDirectory -Path $databaseDocs) {
        $documentationCount = @(Get-ChildItem -LiteralPath $databaseDocs -Filter '*.md' -File).Count
        $details.Add([pscustomobject]@{ Item = 'Database specification documents'; Value = $documentationCount; Status = if ($documentationCount -gt 0) { 'PASS' } else { 'WARNING' } })
    }

    switch ($status) { 'PASS' { Write-AuditSuccess -Message $summary } 'WARNING' { Write-AuditWarning -Message $summary } default { Write-AuditError -Message $summary } }
    Write-AuditTable -InputObject $details.ToArray() -Property Item, Value, Status

    return [pscustomobject]@{ CheckName = 'Database Readiness'; Status = $status; Summary = $summary; Details = $details.ToArray(); CheckedAt = Get-AuditTimestamp }
}

if ($MyInvocation.InvocationName -ne '.') { Invoke-DatabaseReadinessCheck -Configuration $Configuration }
