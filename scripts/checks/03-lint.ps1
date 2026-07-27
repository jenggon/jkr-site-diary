[CmdletBinding()]
param(
    [pscustomobject]$Configuration
)

Set-StrictMode -Version Latest

$libraryDirectory = Join-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -ChildPath 'lib'
. (Join-Path -Path $libraryDirectory -ChildPath 'logger.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'formatter.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'utils.ps1')

function Invoke-LintReadinessCheck {
    [CmdletBinding()]
    param(
        [pscustomobject]$Configuration
    )

    $projectRoot = Get-AuditProjectRoot -StartPath $PSScriptRoot
    $details = [System.Collections.Generic.List[object]]::new()
    $status = 'PASS'
    $summary = 'Lint tooling is ready for execution.'

    Write-AuditSection -Text 'Lint Readiness'

    $eslintConfigurations = @(
        Get-ChildItem -LiteralPath $projectRoot -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like 'eslint.config.*' -or $_.Name -like '.eslintrc*' }
    )
    $details.Add([pscustomobject]@{ Item = 'ESLint configuration'; Value = if ($eslintConfigurations.Count -gt 0) { $eslintConfigurations.Name -join ', ' } else { 'Not found' }; Status = if ($eslintConfigurations.Count -gt 0) { 'PASS' } else { 'FAIL' } })
    if ($eslintConfigurations.Count -eq 0) {
        $status = 'FAIL'
        $summary = 'No ESLint configuration was found.'
    }

    $packageJsonPath = Join-AuditPath -BasePath $projectRoot -ChildPath 'package.json'
    $package = Read-AuditJsonSafely -Path $packageJsonPath
    if (-not $package.IsSuccess) {
        $details.Add([pscustomobject]@{ Item = 'package.json'; Value = $package.Error; Status = 'FAIL' })
        $status = 'FAIL'
        $summary = 'Lint readiness cannot verify project tooling because package.json could not be read.'
    }
    else {
        $eslintInstalled = $false
        $typeScriptInstalled = $false
        foreach ($groupName in @('dependencies', 'devDependencies')) {
            $dependencyGroup = $package.Data.PSObject.Properties[$groupName]
            if ($null -ne $dependencyGroup) {
                $eslintInstalled = $eslintInstalled -or ($null -ne $dependencyGroup.Value.PSObject.Properties['eslint'])
                $typeScriptInstalled = $typeScriptInstalled -or ($null -ne $dependencyGroup.Value.PSObject.Properties['typescript'])
            }
        }

        $details.Add([pscustomobject]@{ Item = 'ESLint dependency'; Value = if ($eslintInstalled) { 'Declared' } else { 'Not declared' }; Status = if ($eslintInstalled) { 'PASS' } else { 'FAIL' } })
        if (-not $eslintInstalled) {
            $status = 'FAIL'
            $summary = 'ESLint is not declared in package.json.'
        }

        $details.Add([pscustomobject]@{ Item = 'TypeScript dependency'; Value = if ($typeScriptInstalled) { 'Declared' } else { 'Not declared' }; Status = if ($typeScriptInstalled) { 'PASS' } else { 'WARNING' } })
        if (-not $typeScriptInstalled -and $status -eq 'PASS') {
            $status = 'WARNING'
            $summary = 'TypeScript is not declared in package.json.'
        }
    }

    $tsConfigPath = Join-AuditPath -BasePath $projectRoot -ChildPath 'tsconfig.json'
    $details.Add([pscustomobject]@{ Item = 'TypeScript configuration'; Value = if (Test-AuditFile -Path $tsConfigPath) { 'Found' } else { 'Not found' }; Status = if (Test-AuditFile -Path $tsConfigPath) { 'PASS' } else { 'WARNING' } })
    if (-not (Test-AuditFile -Path $tsConfigPath) -and $status -eq 'PASS') {
        $status = 'WARNING'
        $summary = 'TypeScript configuration was not found.'
    }

    $psScriptAnalyzer = Get-Module -ListAvailable -Name 'PSScriptAnalyzer' | Select-Object -First 1
    $details.Add([pscustomobject]@{ Item = 'PSScriptAnalyzer'; Value = if ($null -ne $psScriptAnalyzer) { $psScriptAnalyzer.Version.ToString() } else { 'Not available' }; Status = if ($null -ne $psScriptAnalyzer) { 'PASS' } else { 'WARNING' } })
    if ($null -eq $psScriptAnalyzer -and $status -eq 'PASS') {
        $status = 'WARNING'
        $summary = 'PSScriptAnalyzer is not available for PowerShell linting.'
    }

    switch ($status) {
        'PASS'    { Write-AuditSuccess -Message $summary }
        'WARNING' { Write-AuditWarning -Message $summary }
        default   { Write-AuditError -Message $summary }
    }
    Write-AuditTable -InputObject $details.ToArray() -Property Item, Value, Status

    return [pscustomobject]@{
        CheckName = 'Lint Readiness'
        Status    = $status
        Summary   = $summary
        Details   = $details.ToArray()
        CheckedAt = Get-AuditTimestamp
    }
}

if ($MyInvocation.InvocationName -ne '.') {
    Invoke-LintReadinessCheck -Configuration $Configuration
}
