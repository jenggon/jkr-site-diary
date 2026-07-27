[CmdletBinding()]
param([pscustomobject]$Configuration)

Set-StrictMode -Version Latest

$libraryDirectory = Join-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -ChildPath 'lib'
. (Join-Path -Path $libraryDirectory -ChildPath 'logger.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'formatter.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'utils.ps1')

function Invoke-ApiReadinessCheck {
    [CmdletBinding()]
    param([pscustomobject]$Configuration)

    $projectRoot = Get-AuditProjectRoot -StartPath $PSScriptRoot
    $details = [System.Collections.Generic.List[object]]::new()
    $status = 'PASS'
    $summary = 'API documentation and route structure are present.'

    Write-AuditSection -Text 'API Readiness'

    foreach ($artifact in @(
            [pscustomobject]@{ Name = 'API documentation directory'; Path = Join-AuditPath -BasePath $projectRoot -ChildPath @('docs', '07_API'); Type = 'Directory' },
            [pscustomobject]@{ Name = 'API architecture specification'; Path = Join-AuditPath -BasePath $projectRoot -ChildPath @('docs', '07_API', 'API-001-API-Architecture.md'); Type = 'File' },
            [pscustomobject]@{ Name = 'Site Diary API specification'; Path = Join-AuditPath -BasePath $projectRoot -ChildPath @('docs', '07_API', 'API-014-Site-Diary-API.md'); Type = 'File' },
            [pscustomobject]@{ Name = 'API route directory'; Path = Join-AuditPath -BasePath $projectRoot -ChildPath @('src', 'app', 'api'); Type = 'Directory' }
        )) {
        $exists = if ($artifact.Type -eq 'File') { Test-AuditFile -Path $artifact.Path } else { Test-AuditDirectory -Path $artifact.Path }
        $details.Add([pscustomobject]@{ Item = $artifact.Name; Value = if ($exists) { 'Found' } else { 'Not found' }; Status = if ($exists) { 'PASS' } else { 'FAIL' } })
        if (-not $exists) {
            $status = 'FAIL'
            $summary = "Required API artifact is missing: $($artifact.Name)."
        }
    }

    $apiDirectory = Join-AuditPath -BasePath $projectRoot -ChildPath @('src', 'app', 'api')
    if (Test-AuditDirectory -Path $apiDirectory) {
        $routeCount = @(Get-ChildItem -LiteralPath $apiDirectory -Recurse -Filter 'route.ts' -File).Count
        $details.Add([pscustomobject]@{ Item = 'API route handlers'; Value = $routeCount; Status = if ($routeCount -gt 0) { 'PASS' } else { 'WARNING' } })
        if ($routeCount -eq 0 -and $status -eq 'PASS') {
            $status = 'WARNING'
            $summary = 'API route directory exists but contains no route handlers.'
        }
    }

    switch ($status) { 'PASS' { Write-AuditSuccess -Message $summary } 'WARNING' { Write-AuditWarning -Message $summary } default { Write-AuditError -Message $summary } }
    Write-AuditTable -InputObject $details.ToArray() -Property Item, Value, Status

    return [pscustomobject]@{ CheckName = 'API Readiness'; Status = $status; Summary = $summary; Details = $details.ToArray(); CheckedAt = Get-AuditTimestamp }
}

if ($MyInvocation.InvocationName -ne '.') { Invoke-ApiReadinessCheck -Configuration $Configuration }
