[CmdletBinding()]
param(
    [pscustomobject]$Configuration
)

Set-StrictMode -Version Latest

$libraryDirectory = Join-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -ChildPath 'lib'
. (Join-Path -Path $libraryDirectory -ChildPath 'logger.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'formatter.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'utils.ps1')

function Invoke-GitHealthCheck {
    [CmdletBinding()]
    param(
        [pscustomobject]$Configuration
    )

    $projectRoot = Get-AuditProjectRoot -StartPath $PSScriptRoot
    $details = [System.Collections.Generic.List[object]]::new()
    $status = 'PASS'
    $summary = 'Git repository is healthy.'

    Write-AuditSection -Text 'Git Repository Health'

    $gitCommand = Get-Command -Name 'git' -ErrorAction SilentlyContinue
    if ($null -eq $gitCommand) {
        $details.Add([pscustomobject]@{ Item = 'Git executable'; Value = 'Not found'; Status = 'FAIL' })
        $status = 'FAIL'
        $summary = 'Git is not available in the current environment.'
    }
    else {
        $repositoryRoot = @(& git -C $projectRoot rev-parse --show-toplevel 2>$null)
        if ($LASTEXITCODE -ne 0 -or $repositoryRoot.Count -eq 0) {
            $details.Add([pscustomobject]@{ Item = 'Git repository'; Value = 'Not detected'; Status = 'FAIL' })
            $status = 'FAIL'
            $summary = 'The project root is not a Git repository.'
        }
        else {
            $details.Add([pscustomobject]@{ Item = 'Git repository'; Value = $repositoryRoot[0].Trim(); Status = 'PASS' })

            $branch = @(& git -C $projectRoot branch --show-current 2>$null)
            $branchName = if ($branch.Count -gt 0) { $branch[0].Trim() } else { '(detached HEAD)' }
            $details.Add([pscustomobject]@{ Item = 'Current branch'; Value = $branchName; Status = 'PASS' })

            $workingTree = @(& git -C $projectRoot status --porcelain 2>$null)
            $untrackedCount = @($workingTree | Where-Object { $_ -match '^\?\?' }).Count
            $isDirty = $workingTree.Count -gt 0
            $treeStatus = if ($isDirty) { 'WARNING' } else { 'PASS' }
            $treeValue = if ($isDirty) { 'Dirty' } else { 'Clean' }
            $details.Add([pscustomobject]@{ Item = 'Working tree'; Value = $treeValue; Status = $treeStatus })
            $details.Add([pscustomobject]@{ Item = 'Untracked files'; Value = $untrackedCount; Status = if ($untrackedCount -gt 0) { 'WARNING' } else { 'PASS' } })

            if ($isDirty) {
                $status = 'WARNING'
                $summary = 'Git repository is available, but the working tree has uncommitted changes.'
            }

            $lastCommit = @(& git -C $projectRoot log -1 --format='%H|%s' 2>$null)
            if ($lastCommit.Count -gt 0) {
                $commitParts = $lastCommit[0].Split('|', 2)
                $details.Add([pscustomobject]@{ Item = 'Last commit hash'; Value = $commitParts[0]; Status = 'PASS' })
                $details.Add([pscustomobject]@{ Item = 'Last commit message'; Value = if ($commitParts.Count -gt 1) { $commitParts[1] } else { '' }; Status = 'PASS' })
            }
            else {
                $details.Add([pscustomobject]@{ Item = 'Last commit'; Value = 'No commits found'; Status = 'WARNING' })
                if ($status -eq 'PASS') {
                    $status = 'WARNING'
                    $summary = 'Git repository has no commits yet.'
                }
            }

            $upstream = @(& git -C $projectRoot rev-parse --abbrev-ref '@{upstream}' 2>$null)
            if ($LASTEXITCODE -eq 0 -and $upstream.Count -gt 0) {
                $counts = @(& git -C $projectRoot rev-list --left-right --count '@{upstream}...HEAD' 2>$null)
                $countValues = @()
                if ($counts.Count -gt 0) {
                    $countValues = @($counts[0].Trim().Split([char[]]' ', [System.StringSplitOptions]::RemoveEmptyEntries))
                }

                if ($countValues.Count -eq 2) {
                    $details.Add([pscustomobject]@{ Item = 'Ahead / behind'; Value = "Ahead $($countValues[1]), behind $($countValues[0])"; Status = if ($countValues[0] -eq '0' -and $countValues[1] -eq '0') { 'PASS' } else { 'WARNING' } })
                    if (($countValues[0] -ne '0' -or $countValues[1] -ne '0') -and $status -eq 'PASS') {
                        $status = 'WARNING'
                        $summary = 'Git repository differs from its configured upstream branch.'
                    }
                }
                else {
                    $details.Add([pscustomobject]@{ Item = 'Ahead / behind'; Value = 'Unable to determine'; Status = 'WARNING' })
                    if ($status -eq 'PASS') {
                        $status = 'WARNING'
                        $summary = 'Git repository upstream status could not be determined.'
                    }
                }
            }
            else {
                $details.Add([pscustomobject]@{ Item = 'Ahead / behind'; Value = 'No upstream branch configured'; Status = 'WARNING' })
                if ($status -eq 'PASS') {
                    $status = 'WARNING'
                    $summary = 'Git repository has no upstream branch configured.'
                }
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
        CheckName = 'Git Health'
        Status    = $status
        Summary   = $summary
        Details   = $details.ToArray()
        CheckedAt = Get-AuditTimestamp
    }
}

if ($MyInvocation.InvocationName -ne '.') {
    Invoke-GitHealthCheck -Configuration $Configuration
}
