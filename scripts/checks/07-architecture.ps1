[CmdletBinding()]
param([pscustomobject]$Configuration)

Set-StrictMode -Version Latest

$libraryDirectory = Join-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -ChildPath 'lib'
. (Join-Path -Path $libraryDirectory -ChildPath 'logger.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'formatter.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'utils.ps1')

function Invoke-ArchitectureDocumentationCheck {
    [CmdletBinding()]
    param([pscustomobject]$Configuration)

    $projectRoot = Get-AuditProjectRoot -StartPath $PSScriptRoot
    $details = [System.Collections.Generic.List[object]]::new()
    $status = 'PASS'
    $summary = 'Required architecture documentation is present.'

    Write-AuditSection -Text 'Architecture Documentation'

    foreach ($folderName in @('00_Governance', '01_ADR', '02_Business_Rules', '03_Domain_Model', '04_Zon_Penjadualan', '05_Zon_Operasi', '11_Architecture_Diagrams')) {
        $folderPath = Join-AuditPath -BasePath $projectRoot -ChildPath @('docs', $folderName)
        $exists = Test-AuditDirectory -Path $folderPath
        $details.Add([pscustomobject]@{ Item = "docs/$folderName"; Value = if ($exists) { 'Found' } else { 'Not found' }; Status = if ($exists) { 'PASS' } else { 'FAIL' } })
        if (-not $exists) {
            $status = 'FAIL'
            $summary = "Required architecture folder is missing: $folderName."
        }
    }

    $adrDirectory = Join-AuditPath -BasePath $projectRoot -ChildPath @('docs', '01_ADR')
    if (Test-AuditDirectory -Path $adrDirectory) {
        $adrCount = @(Get-ChildItem -LiteralPath $adrDirectory -Filter 'ADR-*.md' -File).Count
        $details.Add([pscustomobject]@{ Item = 'ADR documents'; Value = $adrCount; Status = if ($adrCount -gt 0) { 'PASS' } else { 'FAIL' } })
        if ($adrCount -eq 0) {
            $status = 'FAIL'
            $summary = 'No ADR documents were found.'
        }
    }

    $engineDirectories = @('04_Zon_Penjadualan', '05_Zon_Operasi')
    $engineDocumentCount = 0
    foreach ($engineDirectory in $engineDirectories) {
        $enginePath = Join-AuditPath -BasePath $projectRoot -ChildPath @('docs', $engineDirectory)
        if (Test-AuditDirectory -Path $enginePath) {
            $engineDocumentCount += @(Get-ChildItem -LiteralPath $enginePath -Filter '*.md' -File).Count
        }
    }
    $details.Add([pscustomobject]@{ Item = 'Core engine documents'; Value = $engineDocumentCount; Status = if ($engineDocumentCount -gt 0) { 'PASS' } else { 'FAIL' } })
    if ($engineDocumentCount -eq 0) {
        $status = 'FAIL'
        $summary = 'No planning or operations engine documentation was found.'
    }

    switch ($status) { 'PASS' { Write-AuditSuccess -Message $summary } 'WARNING' { Write-AuditWarning -Message $summary } default { Write-AuditError -Message $summary } }
    Write-AuditTable -InputObject $details.ToArray() -Property Item, Value, Status

    return [pscustomobject]@{ CheckName = 'Architecture Documentation'; Status = $status; Summary = $summary; Details = $details.ToArray(); CheckedAt = Get-AuditTimestamp }
}

if ($MyInvocation.InvocationName -ne '.') { Invoke-ArchitectureDocumentationCheck -Configuration $Configuration }
