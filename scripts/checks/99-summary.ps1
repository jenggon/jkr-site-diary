[CmdletBinding()]
param(
    [pscustomobject]$Configuration,
    [pscustomobject[]]$AuditResults = @()
)

Set-StrictMode -Version Latest

$libraryDirectory = Join-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -ChildPath 'lib'
. (Join-Path -Path $libraryDirectory -ChildPath 'logger.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'formatter.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'utils.ps1')

function Invoke-AuditSummaryCheck {
    [CmdletBinding()]
    param(
        [pscustomobject[]]$AuditResults = @()
    )

    $validStatuses = @('PASS', 'WARNING', 'FAIL')
    $normalisedResults = @($AuditResults | Where-Object { $null -ne $_ })
    $passCount = @($normalisedResults | Where-Object { $_.Status -eq 'PASS' }).Count
    $warningCount = @($normalisedResults | Where-Object { $_.Status -eq 'WARNING' }).Count
    $failCount = @($normalisedResults | Where-Object { $_.Status -eq 'FAIL' }).Count
    $invalidCount = @($normalisedResults | Where-Object { $_.Status -notin $validStatuses }).Count

    $overallStatus = if ($normalisedResults.Count -eq 0) { 'WARNING' } elseif ($failCount -gt 0 -or $invalidCount -gt 0) { 'FAIL' } elseif ($warningCount -gt 0) { 'WARNING' } else { 'PASS' }
    $summary = if ($normalisedResults.Count -eq 0) { 'No audit results were provided for aggregation.' } else { "Audit results: $passCount pass, $warningCount warning, $failCount fail." }
    $details = @(
        [pscustomobject]@{ Item = 'PASS'; Value = $passCount; Status = 'PASS' },
        [pscustomobject]@{ Item = 'WARNING'; Value = $warningCount; Status = 'WARNING' },
        [pscustomobject]@{ Item = 'FAIL'; Value = $failCount; Status = if ($failCount -gt 0 -or $invalidCount -gt 0) { 'FAIL' } else { 'PASS' } },
        [pscustomobject]@{ Item = 'Overall Status'; Value = $overallStatus; Status = $overallStatus }
    )

    Write-AuditSection -Text 'Audit Summary'
    switch ($overallStatus) { 'PASS' { Write-AuditSuccess -Message $summary } 'WARNING' { Write-AuditWarning -Message $summary } default { Write-AuditError -Message $summary } }
    Write-AuditTable -InputObject $details -Property Item, Value, Status

    return [pscustomobject]@{ CheckName = 'Audit Summary'; Status = $overallStatus; Summary = $summary; Details = $details; CheckedAt = Get-AuditTimestamp }
}

if ($MyInvocation.InvocationName -ne '.') { Invoke-AuditSummaryCheck -AuditResults $AuditResults }
