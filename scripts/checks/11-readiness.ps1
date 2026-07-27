[CmdletBinding()]
param([pscustomobject]$Configuration)

Set-StrictMode -Version Latest

$libraryDirectory = Join-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -ChildPath 'lib'
. (Join-Path -Path $libraryDirectory -ChildPath 'logger.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'formatter.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'utils.ps1')

function Invoke-ProjectReadinessCheck {
    [CmdletBinding()]
    param([pscustomobject]$Configuration)

    $projectRoot = Get-AuditProjectRoot -StartPath $PSScriptRoot
    $details = [System.Collections.Generic.List[object]]::new()
    $status = 'PASS'
    $summary = 'Core project artifacts are ready.'

    Write-AuditSection -Text 'Overall Project Readiness'

    foreach ($artifact in @(
            [pscustomobject]@{ Name = 'Source directory'; Path = Join-AuditPath -BasePath $projectRoot -ChildPath 'src'; Type = 'Directory' },
            [pscustomobject]@{ Name = 'Documentation directory'; Path = Join-AuditPath -BasePath $projectRoot -ChildPath 'docs'; Type = 'Directory' },
            [pscustomobject]@{ Name = 'Audit scripts directory'; Path = Join-AuditPath -BasePath $projectRoot -ChildPath 'scripts'; Type = 'Directory' },
            [pscustomobject]@{ Name = 'package.json'; Path = Join-AuditPath -BasePath $projectRoot -ChildPath 'package.json'; Type = 'File' },
            [pscustomobject]@{ Name = 'tsconfig.json'; Path = Join-AuditPath -BasePath $projectRoot -ChildPath 'tsconfig.json'; Type = 'File' },
            [pscustomobject]@{ Name = 'Project Constitution'; Path = Join-AuditPath -BasePath $projectRoot -ChildPath @('docs', '00_Governance', 'PROJECT-CONSTITUTION.md'); Type = 'File' },
            [pscustomobject]@{ Name = 'Database baseline'; Path = Join-AuditPath -BasePath $projectRoot -ChildPath 'baseline.sql'; Type = 'File' }
        )) {
        $exists = if ($artifact.Type -eq 'File') { Test-AuditFile -Path $artifact.Path } else { Test-AuditDirectory -Path $artifact.Path }
        $details.Add([pscustomobject]@{ Item = $artifact.Name; Value = if ($exists) { 'Found' } else { 'Not found' }; Status = if ($exists) { 'PASS' } else { 'FAIL' } })
        if (-not $exists) {
            $status = 'FAIL'
            $summary = "Critical project artifact is missing: $($artifact.Name)."
        }
    }

    foreach ($tool in @('node', 'npm', 'git')) {
        $available = $null -ne (Get-Command -Name $tool -ErrorAction SilentlyContinue)
        $details.Add([pscustomobject]@{ Item = "$tool executable"; Value = if ($available) { 'Available' } else { 'Not available' }; Status = if ($available) { 'PASS' } else { 'FAIL' } })
        if (-not $available) {
            $status = 'FAIL'
            $summary = "Required development tool is unavailable: $tool."
        }
    }

    switch ($status) { 'PASS' { Write-AuditSuccess -Message $summary } 'WARNING' { Write-AuditWarning -Message $summary } default { Write-AuditError -Message $summary } }
    Write-AuditTable -InputObject $details.ToArray() -Property Item, Value, Status

    return [pscustomobject]@{ CheckName = 'Project Readiness'; Status = $status; Summary = $summary; Details = $details.ToArray(); CheckedAt = Get-AuditTimestamp }
}

if ($MyInvocation.InvocationName -ne '.') { Invoke-ProjectReadinessCheck -Configuration $Configuration }
