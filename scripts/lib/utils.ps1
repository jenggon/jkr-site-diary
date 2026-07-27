Set-StrictMode -Version Latest

function Get-AuditProjectRoot {
    [CmdletBinding()]
    param(
        [string]$StartPath = $PSScriptRoot
    )

    if (-not (Test-Path -LiteralPath $StartPath)) {
        throw "Cannot resolve project root because the start path does not exist: $StartPath"
    }

    $currentDirectory = Get-Item -LiteralPath $StartPath
    if ($currentDirectory -is [System.IO.FileInfo]) {
        $currentDirectory = $currentDirectory.Directory
    }

    while ($null -ne $currentDirectory) {
        $scriptsDirectory = Join-Path -Path $currentDirectory.FullName -ChildPath 'scripts'
        $configPath = Join-Path -Path $scriptsDirectory -ChildPath 'audit-config.json'

        if (Test-Path -LiteralPath $configPath -PathType Leaf) {
            return $currentDirectory.FullName
        }

        $currentDirectory = $currentDirectory.Parent
    }

    throw "Cannot resolve an audit project root from: $StartPath"
}

function Get-AuditTimestamp {
    [CmdletBinding()]
    param(
        [switch]$Utc
    )

    if ($Utc) {
        return [datetime]::UtcNow
    }

    return Get-Date
}

function Read-AuditJsonSafely {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateNotNullOrEmpty()]
        [string]$Path
    )

    if (-not (Test-AuditFile -Path $Path)) {
        return [pscustomobject]@{
            IsSuccess = $false
            Path      = $Path
            Data      = $null
            Error     = 'File does not exist.'
        }
    }

    try {
        $content = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
        if ([string]::IsNullOrWhiteSpace($content)) {
            throw 'File is empty.'
        }

        return [pscustomobject]@{
            IsSuccess = $true
            Path      = $Path
            Data      = $content | ConvertFrom-Json -ErrorAction Stop
            Error     = $null
        }
    }
    catch {
        return [pscustomobject]@{
            IsSuccess = $false
            Path      = $Path
            Data      = $null
            Error     = $_.Exception.Message
        }
    }
}

function Test-AuditFile {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateNotNullOrEmpty()]
        [string]$Path
    )

    return Test-Path -LiteralPath $Path -PathType Leaf
}

function Test-AuditDirectory {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateNotNullOrEmpty()]
        [string]$Path
    )

    return Test-Path -LiteralPath $Path -PathType Container
}

function Join-AuditPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateNotNullOrEmpty()]
        [string]$BasePath,

        [Parameter(Mandatory)]
        [ValidateNotNullOrEmpty()]
        [string[]]$ChildPath
    )

    $combinedPath = $BasePath
    foreach ($segment in $ChildPath) {
        $combinedPath = Join-Path -Path $combinedPath -ChildPath $segment
    }

    return $combinedPath
}

function New-AuditStopwatch {
    [CmdletBinding()]
    param(
        [switch]$Start
    )

    $stopwatch = [System.Diagnostics.Stopwatch]::new()
    if ($Start) {
        $stopwatch.Start()
    }

    return $stopwatch
}

function Test-AuditRequiredValue {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [object]$Value
    )

    if ($null -eq $Value) {
        return $false
    }

    if ($Value -is [string]) {
        return -not [string]::IsNullOrWhiteSpace($Value)
    }

    if ($Value -is [System.Collections.ICollection]) {
        return $Value.Count -gt 0
    }

    return $true
}
