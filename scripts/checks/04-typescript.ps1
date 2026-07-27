[CmdletBinding()]
param([pscustomobject]$Configuration)

Set-StrictMode -Version Latest

$libraryDirectory = Join-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -ChildPath 'lib'
. (Join-Path -Path $libraryDirectory -ChildPath 'logger.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'formatter.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'utils.ps1')

function Invoke-TypeScriptReadinessCheck {
    [CmdletBinding()]
    param([pscustomobject]$Configuration)

    $projectRoot = Get-AuditProjectRoot -StartPath $PSScriptRoot
    $details = [System.Collections.Generic.List[object]]::new()
    $status = 'PASS'
    $summary = 'TypeScript project structure is ready.'
    $tsConfigPath = Join-AuditPath -BasePath $projectRoot -ChildPath 'tsconfig.json'

    Write-AuditSection -Text 'TypeScript Readiness'

    $tsConfig = Read-AuditJsonSafely -Path $tsConfigPath
    if (-not $tsConfig.IsSuccess) {
        $details.Add([pscustomobject]@{ Item = 'tsconfig.json'; Value = $tsConfig.Error; Status = 'FAIL' })
        $status = 'FAIL'
        $summary = 'TypeScript configuration could not be read.'
    }
    else {
        $details.Add([pscustomobject]@{ Item = 'tsconfig.json'; Value = 'Found'; Status = 'PASS' })
        $compilerOptions = $tsConfig.Data.PSObject.Properties['compilerOptions']
        foreach ($optionName in @('strict', 'noEmit', 'moduleResolution')) {
            $option = if ($null -ne $compilerOptions) { $compilerOptions.Value.PSObject.Properties[$optionName] } else { $null }
            $isPresent = $null -ne $option
            $details.Add([pscustomobject]@{ Item = "compilerOptions.$optionName"; Value = if ($isPresent) { $option.Value } else { 'Not declared' }; Status = if ($isPresent) { 'PASS' } else { 'WARNING' } })
            if (-not $isPresent -and $status -eq 'PASS') {
                $status = 'WARNING'
                $summary = "TypeScript compiler option is not declared: $optionName."
            }
        }
    }

    $package = Read-AuditJsonSafely -Path (Join-AuditPath -BasePath $projectRoot -ChildPath 'package.json')
    $typeScriptInstalled = $false
    if ($package.IsSuccess) {
        foreach ($groupName in @('dependencies', 'devDependencies')) {
            $group = $package.Data.PSObject.Properties[$groupName]
            if ($null -ne $group -and $null -ne $group.Value.PSObject.Properties['typescript']) {
                $typeScriptInstalled = $true
            }
        }
    }
    $details.Add([pscustomobject]@{ Item = 'TypeScript dependency'; Value = if ($typeScriptInstalled) { 'Declared' } else { 'Not declared' }; Status = if ($typeScriptInstalled) { 'PASS' } else { 'FAIL' } })
    if (-not $typeScriptInstalled) {
        $status = 'FAIL'
        $summary = 'TypeScript is not declared in package.json.'
    }

    foreach ($directoryName in @('src', 'src/app')) {
        $directoryPath = Join-AuditPath -BasePath $projectRoot -ChildPath $directoryName
        $exists = Test-AuditDirectory -Path $directoryPath
        $details.Add([pscustomobject]@{ Item = $directoryName; Value = if ($exists) { 'Found' } else { 'Not found' }; Status = if ($exists) { 'PASS' } else { 'FAIL' } })
        if (-not $exists) {
            $status = 'FAIL'
            $summary = "Required source directory is missing: $directoryName."
        }
    }

    switch ($status) { 'PASS' { Write-AuditSuccess -Message $summary } 'WARNING' { Write-AuditWarning -Message $summary } default { Write-AuditError -Message $summary } }
    Write-AuditTable -InputObject $details.ToArray() -Property Item, Value, Status

    return [pscustomobject]@{ CheckName = 'TypeScript Readiness'; Status = $status; Summary = $summary; Details = $details.ToArray(); CheckedAt = Get-AuditTimestamp }
}

if ($MyInvocation.InvocationName -ne '.') { Invoke-TypeScriptReadinessCheck -Configuration $Configuration }
