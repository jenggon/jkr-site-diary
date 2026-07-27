[CmdletBinding()]
param([pscustomobject]$Configuration)

Set-StrictMode -Version Latest

$libraryDirectory = Join-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -ChildPath 'lib'
. (Join-Path -Path $libraryDirectory -ChildPath 'logger.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'formatter.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'utils.ps1')

function Invoke-CoverageReadinessCheck {
    [CmdletBinding()]
    param([pscustomobject]$Configuration)

    $projectRoot = Get-AuditProjectRoot -StartPath $PSScriptRoot
    $details = [System.Collections.Generic.List[object]]::new()
    $status = 'PASS'
    $summary = 'Testing and coverage artifacts are ready.'

    Write-AuditSection -Text 'Testing and Coverage Readiness'

    $testDirectories = @(
        @('test', 'tests', '__tests__') | Where-Object {
            Test-AuditDirectory -Path (Join-AuditPath -BasePath $projectRoot -ChildPath $_)
        }
    )
    $testFiles = @(Get-ChildItem -LiteralPath $projectRoot -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '(^|[.-])test([.-]|$)' })
    $hasTests = $testDirectories.Count -gt 0 -or $testFiles.Count -gt 0
    $details.Add([pscustomobject]@{ Item = 'Test artifacts'; Value = if ($hasTests) { "$($testDirectories.Count) folder(s), $($testFiles.Count) root file(s)" } else { 'Not found' }; Status = if ($hasTests) { 'PASS' } else { 'WARNING' } })

    $coverageDirectory = Join-AuditPath -BasePath $projectRoot -ChildPath 'coverage'
    $coverageExists = Test-AuditDirectory -Path $coverageDirectory
    $details.Add([pscustomobject]@{ Item = 'Coverage directory'; Value = if ($coverageExists) { 'Found' } else { 'Not found' }; Status = if ($coverageExists) { 'PASS' } else { 'WARNING' } })

    $package = Read-AuditJsonSafely -Path (Join-AuditPath -BasePath $projectRoot -ChildPath 'package.json')
    $testFrameworks = [System.Collections.Generic.List[string]]::new()
    $coverageScriptDeclared = $false
    if ($package.IsSuccess) {
        foreach ($groupName in @('dependencies', 'devDependencies')) {
            $group = $package.Data.PSObject.Properties[$groupName]
            if ($null -ne $group) {
                foreach ($framework in @('jest', 'vitest', 'mocha', '@playwright/test', 'cypress')) {
                    if ($null -ne $group.Value.PSObject.Properties[$framework]) { $testFrameworks.Add($framework) }
                }
            }
        }
        $scripts = $package.Data.PSObject.Properties['scripts']
        if ($null -ne $scripts) {
            $coverageScriptDeclared = $null -ne $scripts.Value.PSObject.Properties['coverage']
        }
    }
    $details.Add([pscustomobject]@{ Item = 'Testing framework'; Value = if ($testFrameworks.Count -gt 0) { $testFrameworks -join ', ' } else { 'Not detected' }; Status = if ($testFrameworks.Count -gt 0) { 'PASS' } else { 'WARNING' } })
    $details.Add([pscustomobject]@{ Item = 'Coverage script'; Value = if ($coverageScriptDeclared) { 'Declared' } else { 'Not declared' }; Status = if ($coverageScriptDeclared) { 'PASS' } else { 'WARNING' } })

    if (-not $hasTests -or $testFrameworks.Count -eq 0 -or -not $coverageScriptDeclared) {
        $status = 'WARNING'
        $summary = 'Testing or coverage readiness artifacts are incomplete.'
    }

    switch ($status) { 'PASS' { Write-AuditSuccess -Message $summary } 'WARNING' { Write-AuditWarning -Message $summary } default { Write-AuditError -Message $summary } }
    Write-AuditTable -InputObject $details.ToArray() -Property Item, Value, Status

    return [pscustomobject]@{ CheckName = 'Coverage Readiness'; Status = $status; Summary = $summary; Details = $details.ToArray(); CheckedAt = Get-AuditTimestamp }
}

if ($MyInvocation.InvocationName -ne '.') { Invoke-CoverageReadinessCheck -Configuration $Configuration }
