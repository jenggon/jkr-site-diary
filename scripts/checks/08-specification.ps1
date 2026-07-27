[CmdletBinding()]
param([pscustomobject]$Configuration)

Set-StrictMode -Version Latest

$libraryDirectory = Join-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -ChildPath 'lib'
. (Join-Path -Path $libraryDirectory -ChildPath 'logger.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'formatter.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'utils.ps1')

function Invoke-SpecificationCompletenessCheck {
    [CmdletBinding()]
    param([pscustomobject]$Configuration)

    $projectRoot = Get-AuditProjectRoot -StartPath $PSScriptRoot
    $details = [System.Collections.Generic.List[object]]::new()
    $status = 'PASS'
    $summary = 'Specification documentation is complete.'
    $docsDirectory = Join-AuditPath -BasePath $projectRoot -ChildPath 'docs'

    Write-AuditSection -Text 'Specification Completeness'

    $expectedFolders = @('00_Governance', '01_ADR', '02_Business_Rules', '03_Domain_Model', '06_Database', '07_API', '99_Glossary')
    foreach ($folderName in $expectedFolders) {
        $folderPath = Join-AuditPath -BasePath $docsDirectory -ChildPath $folderName
        $exists = Test-AuditDirectory -Path $folderPath
        $details.Add([pscustomobject]@{ Item = "Specification folder: $folderName"; Value = if ($exists) { 'Found' } else { 'Not found' }; Status = if ($exists) { 'PASS' } else { 'FAIL' } })
        if (-not $exists) {
            $status = 'FAIL'
            $summary = "Required specification folder is missing: $folderName."
        }
    }

    $requiredDocuments = @('INDEX.md', '00_Governance/PROJECT-CONSTITUTION.md', '06_Database/DB-001-Database-Architecture.md', '07_API/API-001-API-Architecture.md')
    foreach ($documentName in $requiredDocuments) {
        $documentPath = Join-AuditPath -BasePath $docsDirectory -ChildPath $documentName
        $exists = Test-AuditFile -Path $documentPath
        $details.Add([pscustomobject]@{ Item = "Specification document: $documentName"; Value = if ($exists) { 'Found' } else { 'Not found' }; Status = if ($exists) { 'PASS' } else { 'FAIL' } })
        if (-not $exists) {
            $status = 'FAIL'
            $summary = "Required specification document is missing: $documentName."
        }
    }

    if (Test-AuditDirectory -Path $docsDirectory) {
        $allDocuments = @(Get-ChildItem -LiteralPath $docsDirectory -Recurse -File)
        $nonMarkdownDocuments = @($allDocuments | Where-Object { $_.Extension -ne '.md' })
        $emptyMarkdownDocuments = @($allDocuments | Where-Object { $_.Extension -eq '.md' -and $_.Length -eq 0 })
        $details.Add([pscustomobject]@{ Item = 'Documentation naming'; Value = if ($nonMarkdownDocuments.Count -eq 0) { 'All documentation files use .md' } else { "$($nonMarkdownDocuments.Count) non-Markdown file(s)" }; Status = if ($nonMarkdownDocuments.Count -eq 0) { 'PASS' } else { 'WARNING' } })
        $details.Add([pscustomobject]@{ Item = 'Empty Markdown specifications'; Value = $emptyMarkdownDocuments.Count; Status = if ($emptyMarkdownDocuments.Count -eq 0) { 'PASS' } else { 'WARNING' } })
        if (($nonMarkdownDocuments.Count -gt 0 -or $emptyMarkdownDocuments.Count -gt 0) -and $status -eq 'PASS') {
            $status = 'WARNING'
            $summary = 'Specification documentation has naming or completeness warnings.'
        }
    }

    switch ($status) { 'PASS' { Write-AuditSuccess -Message $summary } 'WARNING' { Write-AuditWarning -Message $summary } default { Write-AuditError -Message $summary } }
    Write-AuditTable -InputObject $details.ToArray() -Property Item, Value, Status

    return [pscustomobject]@{ CheckName = 'Specification Completeness'; Status = $status; Summary = $summary; Details = $details.ToArray(); CheckedAt = Get-AuditTimestamp }
}

if ($MyInvocation.InvocationName -ne '.') { Invoke-SpecificationCompletenessCheck -Configuration $Configuration }
