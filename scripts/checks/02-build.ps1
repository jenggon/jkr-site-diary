[CmdletBinding()]
param(
    [pscustomobject]$Configuration
)

Set-StrictMode -Version Latest

$libraryDirectory = Join-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -ChildPath 'lib'
. (Join-Path -Path $libraryDirectory -ChildPath 'logger.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'formatter.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'utils.ps1')

function Invoke-BuildEnvironmentCheck {
    [CmdletBinding()]
    param(
        [pscustomobject]$Configuration
    )

    $projectRoot = Get-AuditProjectRoot -StartPath $PSScriptRoot
    $details = [System.Collections.Generic.List[object]]::new()
    $status = 'PASS'
    $summary = 'Build environment is ready for inspection.'

    Write-AuditSection -Text 'Build Environment'

    foreach ($tool in @('node', 'npm', 'git')) {
        $command = Get-Command -Name $tool -ErrorAction SilentlyContinue
        if ($null -eq $command) {
            $details.Add([pscustomobject]@{ Item = $tool; Value = 'Not found'; Status = 'FAIL' })
            $status = 'FAIL'
            $summary = "Required tool is not available: $tool."
            continue
        }

        $version = @(& $tool --version 2>$null)
        $details.Add([pscustomobject]@{ Item = $tool; Value = if ($version.Count -gt 0) { $version[0].Trim() } else { 'Version unavailable' }; Status = 'PASS' })
    }

    $details.Add([pscustomobject]@{ Item = 'PowerShell'; Value = $PSVersionTable.PSVersion.ToString(); Status = 'PASS' })

    $packageJsonPath = Join-AuditPath -BasePath $projectRoot -ChildPath 'package.json'
    if (-not (Test-AuditFile -Path $packageJsonPath)) {
        $details.Add([pscustomobject]@{ Item = 'package.json'; Value = 'Not found'; Status = 'WARNING' })
        if ($status -eq 'PASS') {
            $status = 'WARNING'
            $summary = 'Build tools are available, but package.json was not found.'
        }
    }
    else {
        $package = Read-AuditJsonSafely -Path $packageJsonPath
        if (-not $package.IsSuccess) {
            $details.Add([pscustomobject]@{ Item = 'package.json'; Value = $package.Error; Status = 'FAIL' })
            $status = 'FAIL'
            $summary = 'package.json could not be read.'
        }
        else {
            $scriptsProperty = $package.Data.PSObject.Properties['scripts']
            $scriptNames = if ($null -ne $scriptsProperty) { @($scriptsProperty.Value.PSObject.Properties.Name) } else { @() }
            $details.Add([pscustomobject]@{ Item = 'npm scripts'; Value = if ($scriptNames.Count -gt 0) { $scriptNames -join ', ' } else { 'None declared' }; Status = if ($scriptNames.Count -gt 0) { 'PASS' } else { 'WARNING' } })

            if ($scriptNames.Count -eq 0 -and $status -eq 'PASS') {
                $status = 'WARNING'
                $summary = 'package.json was found, but no npm scripts are declared.'
            }
        }
    }

    switch ($status) {
        'PASS'    { Write-AuditSuccess -Message $summary }
        'WARNING' { Write-AuditWarning -Message $summary }
        default   { Write-AuditError -Message $summary }
    }
    Write-AuditTable -InputObject $details.ToArray() -Property Item, Value, Status

    return [pscustomobject]@{
        CheckName = 'Build Environment'
        Status    = $status
        Summary   = $summary
        Details   = $details.ToArray()
        CheckedAt = Get-AuditTimestamp
    }
}

if ($MyInvocation.InvocationName -ne '.') {
    Invoke-BuildEnvironmentCheck -Configuration $Configuration
}
