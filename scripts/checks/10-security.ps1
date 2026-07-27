[CmdletBinding()]
param([pscustomobject]$Configuration)

Set-StrictMode -Version Latest

$libraryDirectory = Join-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -ChildPath 'lib'
. (Join-Path -Path $libraryDirectory -ChildPath 'logger.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'formatter.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'utils.ps1')

function Invoke-SecurityPostureCheck {
    [CmdletBinding()]
    param([pscustomobject]$Configuration)

    $projectRoot = Get-AuditProjectRoot -StartPath $PSScriptRoot
    $details = [System.Collections.Generic.List[object]]::new()
    $status = 'PASS'
    $summary = 'Basic repository security posture is acceptable.'

    Write-AuditSection -Text 'Security Posture'

    $ignorePath = Join-AuditPath -BasePath $projectRoot -ChildPath '.gitignore'
    $ignoreExists = Test-AuditFile -Path $ignorePath
    $details.Add([pscustomobject]@{ Item = '.gitignore'; Value = if ($ignoreExists) { 'Found' } else { 'Not found' }; Status = if ($ignoreExists) { 'PASS' } else { 'FAIL' } })
    if (-not $ignoreExists) {
        $status = 'FAIL'
        $summary = 'Required Git ignore rules are missing.'
    }
    else {
        $ignoreContent = Get-Content -LiteralPath $ignorePath -Raw
        $environmentIgnored = $ignoreContent -match '(?m)^\.env\*?$'
        $details.Add([pscustomobject]@{ Item = 'Environment-file ignore rule'; Value = if ($environmentIgnored) { 'Found' } else { 'Not found' }; Status = if ($environmentIgnored) { 'PASS' } else { 'WARNING' } })
        if (-not $environmentIgnored -and $status -eq 'PASS') {
            $status = 'WARNING'
            $summary = 'Environment-file ignore rules were not detected.'
        }
    }

    $environmentTemplate = Join-AuditPath -BasePath $projectRoot -ChildPath '.env.example'
    $templateExists = Test-AuditFile -Path $environmentTemplate
    $details.Add([pscustomobject]@{ Item = '.env.example'; Value = if ($templateExists) { 'Found' } else { 'Not found' }; Status = if ($templateExists) { 'PASS' } else { 'WARNING' } })
    if (-not $templateExists -and $status -eq 'PASS') {
        $status = 'WARNING'
        $summary = 'No environment-variable template is available for safe configuration onboarding.'
    }

    $lockFiles = @(
        @('package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml') | Where-Object {
            Test-AuditFile -Path (Join-AuditPath -BasePath $projectRoot -ChildPath $_)
        }
    )
    $details.Add([pscustomobject]@{ Item = 'Dependency lock file'; Value = if ($lockFiles.Count -gt 0) { $lockFiles -join ', ' } else { 'Not found' }; Status = if ($lockFiles.Count -gt 0) { 'PASS' } else { 'WARNING' } })
    if ($lockFiles.Count -eq 0 -and $status -eq 'PASS') {
        $status = 'WARNING'
        $summary = 'No dependency lock file was found.'
    }

    $trackedEnvironmentFiles = @()
    $credentialFindings = @()
    if ($null -ne (Get-Command -Name 'git' -ErrorAction SilentlyContinue)) {
        $trackedEnvironmentFiles = @(& git -C $projectRoot ls-files -- '.env*' 2>$null | Where-Object { $_ -notmatch '\.env\.example$' })
        $candidateFiles = @(& git -C $projectRoot ls-files 2>$null | Where-Object { $_ -match '\.(ts|tsx|js|mjs|json|ps1|sql|md|ya?ml)$' })
        foreach ($relativePath in $candidateFiles) {
            $filePath = Join-AuditPath -BasePath $projectRoot -ChildPath $relativePath
            if ((Test-AuditFile -Path $filePath) -and (Get-Item -LiteralPath $filePath).Length -lt 1048576) {
                $content = Get-Content -LiteralPath $filePath -Raw
                if ($content -match '(?i)(api[_-]?key|secret|password|token)\s*[:=]\s*["''][^"'']{8,}') {
                    $credentialFindings += $relativePath
                }
            }
        }
    }
    $details.Add([pscustomobject]@{ Item = 'Tracked environment files'; Value = $trackedEnvironmentFiles.Count; Status = if ($trackedEnvironmentFiles.Count -eq 0) { 'PASS' } else { 'FAIL' } })
    $details.Add([pscustomobject]@{ Item = 'Potential credential patterns'; Value = $credentialFindings.Count; Status = if ($credentialFindings.Count -eq 0) { 'PASS' } else { 'WARNING' } })
    if ($trackedEnvironmentFiles.Count -gt 0) {
        $status = 'FAIL'
        $summary = 'Tracked environment files may expose secrets.'
    }
    elseif ($credentialFindings.Count -gt 0 -and $status -eq 'PASS') {
        $status = 'WARNING'
        $summary = 'Potential credential patterns were found in tracked text files.'
    }

    switch ($status) { 'PASS' { Write-AuditSuccess -Message $summary } 'WARNING' { Write-AuditWarning -Message $summary } default { Write-AuditError -Message $summary } }
    Write-AuditTable -InputObject $details.ToArray() -Property Item, Value, Status

    return [pscustomobject]@{ CheckName = 'Security Posture'; Status = $status; Summary = $summary; Details = $details.ToArray(); CheckedAt = Get-AuditTimestamp }
}

if ($MyInvocation.InvocationName -ne '.') { Invoke-SecurityPostureCheck -Configuration $Configuration }
