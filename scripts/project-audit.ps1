Set-StrictMode -Version Latest

$script:AuditAllowedStatuses = @('PASS', 'WARNING', 'FAIL')

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

    if (-not (Test-AuditDirectory -Path $ChecksDirectory)) {
        return @()
    }

    $checks = @(
        Get-ChildItem -LiteralPath $ChecksDirectory -Filter '*.ps1' -File -ErrorAction SilentlyContinue |
            Sort-Object -Property Name
    )

    if ($ExcludeSummary) {
        $checks = @($checks | Where-Object { -not (Test-AuditSummaryCheckScript -Check $_) })
    }

    return $checks
}

function Get-AuditSummaryCheckScripts {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ChecksDirectory
    )

    if (-not (Test-AuditDirectory -Path $ChecksDirectory)) {
        return @()
    }

    return @(
        Get-ChildItem -LiteralPath $ChecksDirectory -Filter '*.ps1' -File -ErrorAction SilentlyContinue |
            Where-Object { Test-AuditSummaryCheckScript -Check $_ } |
            Sort-Object -Property Name
    )
}

function Find-AuditSummaryCheckScript {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ChecksDirectory
    )

    $summaryScripts = Get-AuditSummaryCheckScripts -ChecksDirectory $ChecksDirectory
    if ($summaryScripts.Count -gt 1) {
        $duplicateNames = ($summaryScripts | ForEach-Object { $_.BaseName }) -join ', '
        Write-AuditWarning -Message "Multiple audit summary modules were discovered ($duplicateNames). Using '$($summaryScripts[0].BaseName)'."
    }

    return $summaryScripts | Select-Object -First 1
}

function Normalize-AuditStatus {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [object]$Status
    )

    if ($null -eq $Status) {
        return 'FAIL'
    }

    $normalizedStatus = [string]$Status
    if ($script:AuditAllowedStatuses -contains $normalizedStatus) {
        return $normalizedStatus
    }

    return 'FAIL'
}

function Get-AuditResultValidationErrors {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [object]$InputObject
    )

    $errors = [System.Collections.Generic.List[string]]::new()

    if ($null -eq $InputObject) {
        $errors.Add('Result is null.')
        return @($errors)
    }

    if ($InputObject -isnot [pscustomobject]) {
        $errors.Add('Result is not a structured audit object.')
        return @($errors)
    }

    $propertyNames = @($InputObject.PSObject.Properties | ForEach-Object { $_.Name })
    foreach ($requiredField in @('CheckName', 'Status', 'Summary', 'Details', 'CheckedAt')) {
        if ($requiredField -notin $propertyNames) {
            $errors.Add("Missing required field: $requiredField.")
        }
    }

    if ($errors.Count -gt 0) {
        return @($errors)
    }

    if (-not (Test-AuditRequiredValue -Value $InputObject.CheckName)) {
        $errors.Add('CheckName is empty.')
    }

    if ($null -eq $InputObject.Status) {
        $errors.Add('Status is null.')
    }

    if ($null -eq $InputObject.Summary) {
        $errors.Add('Summary is null.')
    }

    if ($null -eq $InputObject.Details) {
        $errors.Add('Details is null.')
    }

    if ($null -eq $InputObject.CheckedAt) {
        $errors.Add('CheckedAt is null.')
    }

    return @($errors)
}

function New-AuditInvalidResultFailure {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateNotNullOrEmpty()]
        [string]$CheckName,

        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [string[]]$ValidationErrors,

        [AllowEmptyString()]
        [string]$SourceLabel = 'Audit result validation'
    )

    $message = if ($ValidationErrors.Count -eq 0) {
        'The audit result failed validation.'
    }
    else {
        ($ValidationErrors -join ' ')
    }

    return [pscustomobject]@{
        CheckName = $CheckName
        Status    = 'FAIL'
        Summary   = "$SourceLabel`: $message"
        Details   = @(
            foreach ($validationError in $ValidationErrors) {
                [pscustomobject]@{
                    Item   = 'Validation'
                    Value  = $validationError
                    Status = 'FAIL'
                }
            }
        )
        CheckedAt = Get-AuditTimestamp
    }
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

function New-AuditNoResultFailure {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [System.IO.FileInfo]$Check
    )

    return [pscustomobject]@{
        CheckName = $Check.BaseName
        Status    = 'FAIL'
        Summary   = 'The audit module completed without returning a result.'
        Details   = @(
            [pscustomobject]@{
                Item   = 'Result'
                Value  = 'No output returned'
                Status = 'FAIL'
            }
        )
        CheckedAt = Get-AuditTimestamp
    }
}

function ConvertTo-NormalizedAuditResult {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [object]$InputObject,

        [Parameter(Mandatory)]
        [ValidateNotNullOrEmpty()]
        [string]$FallbackCheckName
    )

    $validationErrors = Get-AuditResultValidationErrors -InputObject $InputObject
    if ($validationErrors.Count -gt 0) {
        $checkName = if ($null -ne $InputObject -and $null -ne $InputObject.CheckName -and -not [string]::IsNullOrWhiteSpace([string]$InputObject.CheckName)) {
            [string]$InputObject.CheckName
        }
        else {
            $FallbackCheckName
        }

        return New-AuditInvalidResultFailure -CheckName $checkName -ValidationErrors $validationErrors
    }

    $normalizedStatus = Normalize-AuditStatus -Status $InputObject.Status
    $details = @($InputObject.Details)

    return [pscustomobject]@{
        CheckName = [string]$InputObject.CheckName
        Status    = $normalizedStatus
        Summary   = [string]$InputObject.Summary
        Details   = $details
        CheckedAt = $InputObject.CheckedAt
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

    Write-AuditSection -Text 'Check Execution Overview'

    if ($Executions.Count -eq 0) {
        Write-AuditWarning -Message 'No audit module executions were recorded.'
        Write-AuditBlankLine
        return
    }

    $rows = foreach ($execution in $Executions) {
        $status = if ($null -ne $execution.NormalizedStatus) {
            [string]$execution.NormalizedStatus
        }
        else {
            'FAIL'
        }

        [pscustomobject]@{
            Module   = $execution.Name
            Status   = $status
            Duration = "$($execution.DurationMilliseconds) ms"
        }
    }

    Write-AuditTable -InputObject $rows -Property Module, Status, Duration
    Write-AuditBlankLine
}

function Get-AuditOverallStatus {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [object]$SummaryResult
    )

    if ($null -eq $SummaryResult) {
        return 'FAIL'
    }

    return Normalize-AuditStatus -Status $SummaryResult.Status
}

function New-AuditAggregateResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [datetime]$StartedAt,

        [Parameter(Mandatory)]
        [datetime]$CompletedAt,

        [Parameter(Mandatory)]
        [pscustomobject]$Configuration,

        [AllowEmptyCollection()]
        [object[]]$Checks,

        [AllowEmptyCollection()]
        [object[]]$Results,

        [AllowNull()]
        [object]$Summary
    )

    $overallStatus = Get-AuditOverallStatus -SummaryResult $Summary

    return [pscustomobject]@{
        StartedAt            = $StartedAt
        CompletedAt          = $CompletedAt
        DurationMilliseconds = [math]::Round(($CompletedAt - $StartedAt).TotalMilliseconds, 0)
        Configuration        = $Configuration
        Checks               = @($Checks)
        Results              = @($Results)
        Summary              = $Summary
        OverallStatus        = $overallStatus
    }
}

function Complete-AuditRun {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Aggregate
    )

    if ($MyInvocation.InvocationName -ne '.') {
        if ($Aggregate.OverallStatus -eq 'FAIL') {
            exit 1
        }

        exit 0
    }

    return $Aggregate
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

    $invalidConfigurationAggregate = New-AuditAggregateResult -StartedAt $auditStartedAt -CompletedAt (Get-Date) -Configuration $configuration -Checks @() -Results @() -Summary $null
    Complete-AuditRun -Aggregate $invalidConfigurationAggregate
}

Import-AuditLibraries -LibraryDirectory $libraryDirectory

Write-AuditHeader -Text 'Project Audit'
Write-AuditInfo -Message "Project root: $projectRoot"
Write-AuditBlankLine

if (-not (Test-AuditDirectory -Path $checksDirectory)) {
    Write-AuditWarning -Message "Audit checks directory was not found: $checksDirectory"
}

$executableChecks = Find-AuditChecks -ChecksDirectory $checksDirectory -ExcludeSummary
if ($executableChecks.Count -eq 0) {
    Write-AuditWarning -Message 'No executable audit modules were discovered.'
}

$summaryScript = Find-AuditSummaryCheckScript -ChecksDirectory $checksDirectory
if ($null -eq $summaryScript) {
    Write-AuditWarning -Message 'No audit summary module was discovered.'
}

$collectedResults = [System.Collections.Generic.List[object]]::new()
$checkExecutions = [System.Collections.Generic.List[object]]::new()

foreach ($check in $executableChecks) {
    $execution = Invoke-AuditCheck -Check $check -Configuration $configuration
    $moduleNormalizedResults = [System.Collections.Generic.List[object]]::new()

    if ($execution.Status -eq 'Failed') {
        $failureResult = New-AuditFailureResult -Check $check -ErrorMessage $execution.Error
        [void]$moduleNormalizedResults.Add($failureResult)
    }
    elseif ($execution.Data.Count -eq 0) {
        [void]$moduleNormalizedResults.Add((New-AuditNoResultFailure -Check $check))
    }
    else {
        foreach ($auditResult in @($execution.Data)) {
            [void]$moduleNormalizedResults.Add(
                (ConvertTo-NormalizedAuditResult -InputObject $auditResult -FallbackCheckName $check.BaseName)
            )
        }
    }

    foreach ($normalizedResult in $moduleNormalizedResults) {
        [void]$collectedResults.Add($normalizedResult)
    }

    $overviewStatus = if ($moduleNormalizedResults.Count -eq 0) {
        'FAIL'
    }
    else {
        $statuses = @($moduleNormalizedResults | ForEach-Object { $_.Status })
        if ($statuses -contains 'FAIL') { 'FAIL' }
        elseif ($statuses -contains 'WARNING') { 'WARNING' }
        else { 'PASS' }
    }

    $execution | Add-Member -NotePropertyName NormalizedStatus -NotePropertyValue $overviewStatus -Force
    [void]$checkExecutions.Add($execution)
}

Write-AuditExecutionOverview -Executions @($checkExecutions)

$summaryResult = $null
if ($null -ne $summaryScript) {
    try {
        $summaryOutput = @(
            & $summaryScript.FullName -Configuration $configuration -AuditResults @($collectedResults)
        )

        $rawSummaryResult = @($summaryOutput | Where-Object { $null -ne $_ }) | Select-Object -Last 1
        $summaryResult = ConvertTo-NormalizedAuditResult -InputObject $rawSummaryResult -FallbackCheckName $summaryScript.BaseName
    }
    catch {
        $summaryResult = New-AuditFailureResult -Check $summaryScript -ErrorMessage $_.Exception.Message
        Write-AuditError -Message $summaryResult.Summary
    }
}
else {
    $summaryResult = New-AuditInvalidResultFailure -CheckName 'Audit Summary' -ValidationErrors @('No audit summary module was discovered.') -SourceLabel 'Audit summary'
}

$auditCompletedAt = Get-Date
$aggregate = New-AuditAggregateResult -StartedAt $auditStartedAt -CompletedAt $auditCompletedAt -Configuration $configuration -Checks @($checkExecutions) -Results @($collectedResults) -Summary $summaryResult

Complete-AuditRun -Aggregate $aggregate
