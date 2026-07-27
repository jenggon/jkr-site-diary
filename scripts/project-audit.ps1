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

function Find-AuditChecks {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ChecksDirectory
    )

    return @(
        Get-ChildItem -LiteralPath $ChecksDirectory -Filter '*.ps1' -File |
            Sort-Object -Property Name
    )
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
        # Check scripts own their audit logic and may emit structured output for reporting.
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

$projectRoot = Get-ProjectRoot
$scriptsDirectory = Join-Path -Path $projectRoot -ChildPath 'scripts'
$libraryDirectory = Join-Path -Path $scriptsDirectory -ChildPath 'lib'
$checksDirectory = Join-Path -Path $scriptsDirectory -ChildPath 'checks'

. (Join-Path -Path $libraryDirectory -ChildPath 'config.ps1')
$configuration = Get-AuditConfiguration -ProjectRoot $projectRoot

if (-not $configuration.IsValid) {
    return [pscustomobject]@{
        StartedAt     = Get-Date
        Configuration = $configuration
        Checks        = @()
    }
}

Import-AuditLibraries -LibraryDirectory $libraryDirectory
$results = foreach ($check in Find-AuditChecks -ChecksDirectory $checksDirectory) {
    Invoke-AuditCheck -Check $check -Configuration $configuration
}

return [pscustomobject]@{
    StartedAt     = Get-Date
    Configuration = $configuration
    Checks        = @($results)
}
