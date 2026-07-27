Set-StrictMode -Version Latest

function Get-ProjectRoot {
    return Split-Path -Path $PSScriptRoot -Parent
}

function Import-AuditLibraries {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$LibraryDirectory
    )

    Get-ChildItem -LiteralPath $LibraryDirectory -Filter '*.ps1' -File |
        Where-Object { $_.Name -ne 'config.ps1' } |
        Sort-Object -Property Name |
        ForEach-Object {
            . $_.FullName
        }
}

function Test-AuditSummaryCheckScript {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [System.IO.FileInfo]$Check
    )

    return Select-String -LiteralPath $Check.FullName -Pattern 'function\s+Invoke-AuditSummaryCheck' -Quiet
}

function Find-AuditChecks {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ChecksDirectory,

        [switch]$ExcludeSummary
    )

    $checks = @(
        Get-ChildItem -LiteralPath $ChecksDirectory -Filter '*.ps1' -File |
            Sort-Object -Property Name
    )

    if ($ExcludeSummary) {
        $checks = @($checks | Where-Object { -not (Test-AuditSummaryCheckScript -Check $_) })
    }

    return $checks
}

function Find-AuditSummaryCheckScript {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ChecksDirectory
    )

    return @(
        Get-ChildItem -LiteralPath $ChecksDirectory -Filter '*.ps1' -File |
            Where-Object { Test-AuditSummaryCheckScript -Check $_ } |
            Sort-Object -Property Name |
            Select-Object -First 1
    ) | Select-Object -First 1
}

function New-AuditFailureResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [System.IO.FileInfo]$Check,

        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$ErrorMessage
    )

    $message = if ([string]::IsNullOrWhiteSpace($ErrorMessage)) {
        'The audit module failed without an error message.'
    }
    else {
        $ErrorMessage
    }

    return [pscustomobject]@{
        CheckName = $Check.BaseName
        Status    = 'FAIL'
        Summary   = "Check execution failed: $message"
        Details   = @(
            [pscustomobject]@{
                Item   = 'Error'
                Value  = $message
                Status = 'FAIL'
            }
        )
        CheckedAt = Get-AuditTimestamp
    }
}

function Invoke-AuditCheck {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [System.IO.FileInfo]$Check,

        [Parameter(Mandatory)]
        [pscustomobject]$Configuration
    )

    $startedAt = Get-Date

    try {
        $output = @(& $Check.FullName -Configuration $Configuration)
        $completedAt = Get-Date

        return [pscustomobject]@{
            Name                 = $Check.BaseName
            Path                 = $Check.FullName
            Status               = if ($output.Count -gt 0) { 'Completed' } else { 'NoResult' }
            StartedAt            = $startedAt
            CompletedAt          = $completedAt
            DurationMilliseconds = [math]::Round(($completedAt - $startedAt).TotalMilliseconds, 0)
            Data                 = $output
            Error                = $null
        }
    }
    catch {
        $completedAt = Get-Date

        return [pscustomobject]@{
            Name                 = $Check.BaseName
            Path                 = $Check.FullName
            Status               = 'Failed'
            StartedAt            = $startedAt
            CompletedAt          = $completedAt
            DurationMilliseconds = [math]::Round(($completedAt - $startedAt).TotalMilliseconds, 0)
            Data                 = @()
            Error                = $_.Exception.Message
        }
    }
}

function Write-AuditExecutionOverview {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [object[]]$Executions
    )

    if ($Executions.Count -eq 0) {
        return
    }

    Write-AuditSection -Text 'Check Execution Overview'

    $rows = foreach ($execution in $Executions) {
        $resultStatus = if ($execution.Status -eq 'Failed') {
            'FAIL'
        }
        elseif ($execution.Data.Count -eq 0) {
            'NoResult'
        }
        else {
            $firstResult = $execution.Data | Select-Object -First 1
            if ($null -ne $firstResult.Status) {
                [string]$firstResult.Status
            }
            else {
                'Completed'
            }
        }

        [pscustomobject]@{
            Module   = $execution.Name
            Result   = $resultStatus
            Duration = "$($execution.DurationMilliseconds) ms"
        }
    }

    Write-AuditTable -InputObject $rows -Property Module, Result, Duration
    Write-AuditBlankLine
}

$auditStartedAt = Get-Date
$projectRoot = Get-ProjectRoot
$scriptsDirectory = Join-Path -Path $projectRoot -ChildPath 'scripts'
$libraryDirectory = Join-Path -Path $scriptsDirectory -ChildPath 'lib'
$checksDirectory = Join-Path -Path $scriptsDirectory -ChildPath 'checks'

. (Join-Path -Path $libraryDirectory -ChildPath 'config.ps1')
$configuration = Get-AuditConfiguration -ProjectRoot $projectRoot

if (-not $configuration.IsValid) {
    Import-AuditLibraries -LibraryDirectory $libraryDirectory
    Write-AuditHeader -Text 'Project Audit'
    foreach ($configurationError in $configuration.Errors) {
        Write-AuditError -Message $configurationError
    }

    return [pscustomobject]@{
        StartedAt            = $auditStartedAt
        CompletedAt          = Get-Date
        DurationMilliseconds = [math]::Round(((Get-Date) - $auditStartedAt).TotalMilliseconds, 0)
        Configuration        = $configuration
        Checks               = @()
        Results              = @()
        Summary              = $null
        OverallStatus        = 'FAIL'
    }
}

Import-AuditLibraries -LibraryDirectory $libraryDirectory

Write-AuditHeader -Text 'Project Audit'
Write-AuditInfo -Message "Project root: $projectRoot"
Write-AuditBlankLine

$executableChecks = Find-AuditChecks -ChecksDirectory $checksDirectory -ExcludeSummary
$summaryScript = Find-AuditSummaryCheckScript -ChecksDirectory $checksDirectory
$collectedResults = [System.Collections.Generic.List[object]]::new()
$checkExecutions = [System.Collections.Generic.List[object]]::new()

foreach ($check in $executableChecks) {
    $execution = Invoke-AuditCheck -Check $check -Configuration $configuration
    [void]$checkExecutions.Add($execution)

    if ($execution.Status -eq 'Failed') {
        [void]$collectedResults.Add((New-AuditFailureResult -Check $check -ErrorMessage $execution.Error))
        continue
    }

    foreach ($auditResult in @($execution.Data)) {
        if ($null -ne $auditResult) {
            [void]$collectedResults.Add($auditResult)
        }
    }
}

Write-AuditExecutionOverview -Executions @($checkExecutions)

$summaryResult = $null
if ($null -ne $summaryScript) {
    try {
        $summaryOutput = @(
            & $summaryScript.FullName -Configuration $configuration -AuditResults @($collectedResults)
        )

        $summaryResult = @($summaryOutput | Where-Object { $null -ne $_ }) | Select-Object -Last 1
    }
    catch {
        $summaryResult = New-AuditFailureResult -Check $summaryScript -ErrorMessage $_.Exception.Message
        Write-AuditError -Message $summaryResult.Summary
    }
}
else {
    Write-AuditWarning -Message 'No audit summary module was discovered.'
    $summaryResult = [pscustomobject]@{
        CheckName = 'Audit Summary'
        Status    = 'FAIL'
        Summary   = 'No audit summary module was discovered.'
        Details   = @()
        CheckedAt = Get-AuditTimestamp
    }
}

$auditCompletedAt = Get-Date

return [pscustomobject]@{
    StartedAt            = $auditStartedAt
    CompletedAt          = $auditCompletedAt
    DurationMilliseconds = [math]::Round(($auditCompletedAt - $auditStartedAt).TotalMilliseconds, 0)
    Configuration        = $configuration
    Checks               = @($checkExecutions)
    Results              = @($collectedResults)
    Summary              = $summaryResult
    OverallStatus        = if ($null -ne $summaryResult -and $null -ne $summaryResult.Status) {
        [string]$summaryResult.Status
    }
    else {
        'FAIL'
    }
}
