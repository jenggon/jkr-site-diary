[CmdletBinding()]
param([pscustomobject]$Configuration)

Set-StrictMode -Version Latest

$libraryDirectory = Join-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -ChildPath 'lib'
. (Join-Path -Path $libraryDirectory -ChildPath 'logger.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'formatter.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'utils.ps1')
. (Join-Path -Path $libraryDirectory -ChildPath 'blueprint-inventory.ps1')

function Get-BlueprintIntegrityPolicy {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Configuration
    )

    if ($null -eq $Configuration.Values -or $null -eq $Configuration.Values.blueprintIntegrity) {
        throw 'Blueprint integrity configuration is missing.'
    }

    $policy = $Configuration.Values.blueprintIntegrity
    foreach ($propertyName in @('ignoredFolders', 'ignoredDocuments', 'futureReferences', 'ignoredReferencePatterns', 'severity')) {
        if ($null -eq $policy.PSObject.Properties[$propertyName]) {
            throw "Blueprint integrity configuration is missing '$propertyName'."
        }
    }

    foreach ($severityName in @('duplicateDocumentIdentifiers', 'missingReferencedDocumentIds', 'brokenLocalMarkdownLinks', 'missingMandatoryFolders', 'undocumentedFolders', 'indexConsistency', 'identifierSyntax', 'filenameIdentifier', 'headingIdentifier', 'numberingGaps')) {
        if ($null -eq $policy.severity.PSObject.Properties[$severityName]) {
            throw "Blueprint integrity severity configuration is missing '$severityName'."
        }

        if ([string]$policy.severity.$severityName -notin @('INFO', 'PASS', 'WARNING', 'FAIL')) {
            throw "Blueprint integrity severity '$severityName' must be INFO, PASS, WARNING, or FAIL."
        }
    }

    return $policy
}

function Get-BlueprintTraceabilityPolicy {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Configuration
    )

    if ($null -eq $Configuration.Values -or $null -eq $Configuration.Values.traceability) {
        throw 'Traceability configuration is missing.'
    }

    $policy = $Configuration.Values.traceability
    foreach ($propertyName in @('requiredRelationships', 'optionalRelationships', 'ignoredRelationships', 'severity')) {
        if ($null -eq $policy.PSObject.Properties[$propertyName]) {
            throw "Traceability configuration is missing '$propertyName'."
        }
    }

    foreach ($severityName in @('missingRequiredParent', 'missingRequiredDependency', 'invalidDependency', 'duplicateDeclaredDependency', 'circularDependency', 'relationshipDirection', 'optionalRelationship')) {
        if ($null -eq $policy.severity.PSObject.Properties[$severityName] -or [string]$policy.severity.$severityName -notin @('INFO', 'PASS', 'WARNING', 'FAIL')) {
            throw "Traceability severity '$severityName' must be INFO, PASS, WARNING, or FAIL."
        }
    }

    return $policy
}

function Test-BlueprintInventoryDocumentIgnored {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Document,

        [Parameter(Mandatory)]
        [pscustomobject]$Policy
    )

    foreach ($ignoredDocument in @($Policy.ignoredDocuments)) {
        if ($Document.RelativePath -like [string]$ignoredDocument) {
            return $true
        }
    }

    $pathSegments = $Document.RelativePath -split '/'
    foreach ($ignoredFolder in @($Policy.ignoredFolders)) {
        if ($pathSegments -contains [string]$ignoredFolder) {
            return $true
        }
    }

    return $false
}

function Get-BlueprintInventoryScopedDocuments {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Inventory,

        [Parameter(Mandatory)]
        [pscustomobject]$Policy
    )

    return @($Inventory.Documents | Where-Object { -not (Test-BlueprintInventoryDocumentIgnored -Document $_ -Policy $Policy) })
}

function New-BlueprintCrossReferenceFinding {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Rule,

        [Parameter(Mandatory)]
        [pscustomobject]$Document,

        [AllowNull()]
        [Nullable[int]]$Line,

        [Parameter(Mandatory)]
        [string]$Expected,

        [Parameter(Mandatory)]
        [string]$Actual,

        [Parameter(Mandatory)]
        [ValidateSet('INFO', 'PASS', 'WARNING', 'FAIL')]
        [string]$Severity
    )

    return [pscustomobject]@{
        Rule     = $Rule
        Document = if ([string]::IsNullOrWhiteSpace($Document.Identifier)) { $Document.RelativePath } else { $Document.Identifier }
        Path     = $Document.RelativePath
        Line     = $Line
        Expected = $Expected
        Actual   = $Actual
        Severity = $Severity
    }
}

function Get-BlueprintValidationStatus {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [object[]]$Findings
    )

    $severities = @($Findings | ForEach-Object { $_.Severity })
    if ($severities -contains 'FAIL') { return 'FAIL' }
    if ($severities -contains 'WARNING') { return 'WARNING' }
    return 'PASS'
}

function New-BlueprintCrossReferenceResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$CheckName,

        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [object[]]$Findings,

        [Parameter(Mandatory)]
        [string]$SuccessSummary
    )

    $status = Get-BlueprintValidationStatus -Findings $Findings
    $summary = if ($Findings.Count -eq 0) { $SuccessSummary } else { "$($Findings.Count) finding(s) detected." }
    return [pscustomobject]@{
        CheckName = $CheckName
        Status    = $status
        Summary   = $summary
        Details   = $Findings
        CheckedAt = Get-AuditTimestamp
    }
}

function New-BlueprintTraceabilityFinding {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Rule,

        [Parameter(Mandatory)]
        [pscustomobject]$SourceDocument,

        [AllowNull()]
        [string]$TargetDocument,

        [AllowNull()]
        [Nullable[int]]$Line,

        [Parameter(Mandatory)]
        [string]$Expected,

        [Parameter(Mandatory)]
        [string]$Actual,

        [Parameter(Mandatory)]
        [ValidateSet('INFO', 'PASS', 'WARNING', 'FAIL')]
        [string]$Severity
    )

    return [pscustomobject]@{
        Rule           = $Rule
        SourceDocument = if ([string]::IsNullOrWhiteSpace($SourceDocument.Identifier)) { $SourceDocument.RelativePath } else { $SourceDocument.Identifier }
        TargetDocument = $TargetDocument
        Path           = $SourceDocument.RelativePath
        Line           = $Line
        Expected       = $Expected
        Actual         = $Actual
        Severity       = $Severity
    }
}

function Get-BlueprintReferenceSection {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Document,

        [Parameter(Mandatory)]
        [int]$Line
    )

    return @($Document.Headings | Where-Object { $_.Line -lt $Line } | Sort-Object Line -Descending | Select-Object -First 1).Text
}

function Get-BlueprintDeclaredDependencies {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Inventory,

        [Parameter(Mandatory)]
        [pscustomobject]$BlueprintPolicy
    )

    $edges = [System.Collections.Generic.List[object]]::new()
    foreach ($document in @(Get-BlueprintInventoryScopedDocuments -Inventory $Inventory -Policy $BlueprintPolicy)) {
        if ([string]::IsNullOrWhiteSpace($document.Identifier)) {
            continue
        }

        foreach ($reference in @($document.References)) {
            if ($reference.Identifier -eq $document.Identifier) {
                continue
            }

            $section = Get-BlueprintReferenceSection -Document $document -Line $reference.Line
            if ($section -notmatch '(?i)(related|dependenc|parent)') {
                continue
            }

            $edges.Add([pscustomobject]@{
                    Source          = $document
                    SourcePrefix    = $document.Identifier.Split('-')[0]
                    TargetIdentifier = $reference.Identifier
                    TargetPrefix    = $reference.Identifier.Split('-')[0]
                    TargetExists    = $Inventory.DocumentsByIdentifier.ContainsKey($reference.Identifier)
                    Line            = $reference.Line
                    Section         = $section
                })
        }
    }

    return @($edges)
}

function Test-BlueprintRelationshipMatch {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Edge,

        [Parameter(Mandatory)]
        [pscustomobject]$Relationship
    )

    return $Edge.SourcePrefix -like [string]$Relationship.sourcePrefix -and $Edge.TargetPrefix -like [string]$Relationship.targetPrefix
}

function Get-BlueprintRelationshipMatch {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Edge,

        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [object[]]$Relationships
    )

    return @($Relationships | Where-Object { Test-BlueprintRelationshipMatch -Edge $Edge -Relationship $_ } | Select-Object -First 1)
}

function Find-BlueprintCircularDependencies {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object[]]$Edges
    )

    $adjacency = @{}
    foreach ($edge in $Edges) {
        if (-not $edge.TargetExists) {
            continue
        }

        if (-not $adjacency.ContainsKey($edge.Source.Identifier)) {
            $adjacency[$edge.Source.Identifier] = [System.Collections.Generic.List[string]]::new()
        }
        if (-not $adjacency[$edge.Source.Identifier].Contains($edge.TargetIdentifier)) {
            $adjacency[$edge.Source.Identifier].Add($edge.TargetIdentifier)
        }
    }

    $cycles = [System.Collections.Generic.List[string]]::new()
    $seenCycles = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($start in @($adjacency.Keys)) {
        $stack = [System.Collections.Generic.Stack[object]]::new()
        $stack.Push([pscustomobject]@{ Node = $start; Path = @($start) })
        while ($stack.Count -gt 0) {
            $current = $stack.Pop()
            foreach ($next in @($adjacency[$current.Node])) {
                if ($next -eq $start -and $current.Path.Count -gt 1) {
                    $cycle = @($current.Path + $start) -join ' -> '
                    $cycleKey = (@($current.Path | Sort-Object) -join '|')
                    if ($seenCycles.Add($cycleKey)) {
                        $cycles.Add($cycle)
                    }
                    continue
                }

                if ($next -notin $current.Path -and $adjacency.ContainsKey($next)) {
                    $stack.Push([pscustomobject]@{ Node = $next; Path = @($current.Path + $next) })
                }
            }
        }
    }

    return @($cycles)
}

function Invoke-BlueprintTraceabilityValidation {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Inventory,

        [Parameter(Mandatory)]
        [pscustomobject]$BlueprintPolicy,

        [Parameter(Mandatory)]
        [pscustomobject]$TraceabilityPolicy
    )

    $findings = [System.Collections.Generic.List[object]]::new()
    $edges = @(Get-BlueprintDeclaredDependencies -Inventory $Inventory -BlueprintPolicy $BlueprintPolicy)
    $allowedRelationships = @($TraceabilityPolicy.requiredRelationships) + @($TraceabilityPolicy.optionalRelationships)
    $allowedEdges = [System.Collections.Generic.List[object]]::new()

    foreach ($edge in $edges) {
        $relationship = @(Get-BlueprintRelationshipMatch -Edge $edge -Relationships $allowedRelationships) | Select-Object -First 1
        $reverseEdge = [pscustomobject]@{ SourcePrefix = $edge.TargetPrefix; TargetPrefix = $edge.SourcePrefix }
        $reverseRelationship = @(Get-BlueprintRelationshipMatch -Edge $reverseEdge -Relationships $allowedRelationships) | Select-Object -First 1
        $ignored = @(Get-BlueprintRelationshipMatch -Edge $edge -Relationships @($TraceabilityPolicy.ignoredRelationships)).Count -gt 0

        if ($null -ne $relationship) {
            $allowedEdges.Add($edge)
            if (-not $edge.TargetExists) {
                $findings.Add((New-BlueprintTraceabilityFinding -Rule 'InvalidDependency' -SourceDocument $edge.Source -TargetDocument $edge.TargetIdentifier -Line $edge.Line -Expected "An existing $($edge.TargetPrefix) document" -Actual "Referenced document $($edge.TargetIdentifier) is absent from the inventory" -Severity $TraceabilityPolicy.severity.invalidDependency))
            }
            continue
        }

        if ($null -ne $reverseRelationship) {
            $findings.Add((New-BlueprintTraceabilityFinding -Rule 'RelationshipDirectionError' -SourceDocument $edge.Source -TargetDocument $edge.TargetIdentifier -Line $edge.Line -Expected "$($edge.TargetPrefix) -> $($edge.SourcePrefix), as declared by traceability policy" -Actual "$($edge.SourcePrefix) -> $($edge.TargetPrefix)" -Severity $TraceabilityPolicy.severity.relationshipDirection))
        }
        elseif (-not $ignored) {
            $findings.Add((New-BlueprintTraceabilityFinding -Rule 'InvalidDependency' -SourceDocument $edge.Source -TargetDocument $edge.TargetIdentifier -Line $edge.Line -Expected 'A relationship declared by traceability policy' -Actual "$($edge.SourcePrefix) -> $($edge.TargetPrefix) is not declared" -Severity $TraceabilityPolicy.severity.invalidDependency))
        }
    }

    foreach ($relationship in @($TraceabilityPolicy.requiredRelationships)) {
        $sources = @(Get-BlueprintInventoryScopedDocuments -Inventory $Inventory -Policy $BlueprintPolicy | Where-Object { -not [string]::IsNullOrWhiteSpace($_.Identifier) -and $_.Identifier.Split('-')[0] -like [string]$relationship.sourcePrefix })
        foreach ($source in $sources) {
            $dependencies = @($allowedEdges | Where-Object { $_.Source -eq $source -and $_.TargetPrefix -like [string]$relationship.targetPrefix -and $_.TargetExists })
            if ($dependencies.Count -gt 0) {
                continue
            }

            $rule = if ([string]$relationship.relationship -eq 'parent') { 'MissingRequiredParent' } else { 'MissingRequiredDependency' }
            $severity = if ($rule -eq 'MissingRequiredParent') { $TraceabilityPolicy.severity.missingRequiredParent } else { $TraceabilityPolicy.severity.missingRequiredDependency }
            $findings.Add((New-BlueprintTraceabilityFinding -Rule $rule -SourceDocument $source -TargetDocument $null -Line $null -Expected "At least one declared $($relationship.targetPrefix) $($relationship.relationship) relationship" -Actual "No declared $($relationship.targetPrefix) relationship exists" -Severity $severity))
        }
    }

    foreach ($edgeGroup in @($allowedEdges | Group-Object { "$($_.Source.Identifier)|$($_.TargetIdentifier)" } | Where-Object { $_.Count -gt 1 })) {
        foreach ($edge in @($edgeGroup.Group | Select-Object -Skip 1)) {
            $findings.Add((New-BlueprintTraceabilityFinding -Rule 'DuplicateDeclaredDependency' -SourceDocument $edge.Source -TargetDocument $edge.TargetIdentifier -Line $edge.Line -Expected 'One declared dependency per source and target pair' -Actual "Dependency $($edge.Source.Identifier) -> $($edge.TargetIdentifier) is declared $($edgeGroup.Count) times" -Severity $TraceabilityPolicy.severity.duplicateDeclaredDependency))
        }
    }

    foreach ($cycle in @(Find-BlueprintCircularDependencies -Edges $allowedEdges.ToArray())) {
        $sourceIdentifier = ($cycle -split ' -> ')[0]
        $source = @($Inventory.DocumentsByIdentifier[$sourceIdentifier] | Select-Object -First 1)
        if ($source.Count -gt 0) {
            $findings.Add((New-BlueprintTraceabilityFinding -Rule 'CircularDependency' -SourceDocument $source[0] -TargetDocument $null -Line $null -Expected 'An acyclic declared dependency graph' -Actual $cycle -Severity $TraceabilityPolicy.severity.circularDependency))
        }
    }

    return New-BlueprintCrossReferenceResult -CheckName 'Blueprint Traceability' -Findings $findings.ToArray() -SuccessSummary 'Declared traceability relationships satisfy the configured policy.'
}

function Invoke-BlueprintDuplicateIdentifierValidation {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Inventory,

        [Parameter(Mandatory)]
        [pscustomobject]$Policy
    )

    $findings = [System.Collections.Generic.List[object]]::new()
    $scopedDocuments = @(Get-BlueprintInventoryScopedDocuments -Inventory $Inventory -Policy $Policy)
    foreach ($identifier in @($Inventory.DocumentsByIdentifier.Keys | Sort-Object)) {
        $documents = @($Inventory.DocumentsByIdentifier[$identifier] | Where-Object { $scopedDocuments -contains $_ })
        if ($documents.Count -lt 2) {
            continue
        }

        foreach ($document in $documents) {
            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'DuplicateDocumentIdentifier' -Document $document -Line $null -Expected "A unique document identifier: $identifier" -Actual "Identifier $identifier is used by $($documents.Count) documents" -Severity $Policy.severity.duplicateDocumentIdentifiers))
        }
    }

    return New-BlueprintCrossReferenceResult -CheckName 'Blueprint Duplicate Identifiers' -Findings $findings.ToArray() -SuccessSummary 'No duplicate document identifiers were detected.'
}

function Test-BlueprintReferenceIgnored {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Identifier,

        [Parameter(Mandatory)]
        [pscustomobject]$Policy
    )

    foreach ($futureReference in @($Policy.futureReferences)) {
        if ($Identifier.Equals([string]$futureReference, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }

    foreach ($pattern in @($Policy.ignoredReferencePatterns)) {
        if ($Identifier -match [string]$pattern) {
            return $true
        }
    }

    return $false
}

function Invoke-BlueprintMissingReferenceValidation {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Inventory,

        [Parameter(Mandatory)]
        [pscustomobject]$Policy
    )

    $findings = [System.Collections.Generic.List[object]]::new()
    foreach ($document in @(Get-BlueprintInventoryScopedDocuments -Inventory $Inventory -Policy $Policy)) {
        foreach ($reference in @($document.References)) {
            if ((Test-BlueprintReferenceIgnored -Identifier $reference.Identifier -Policy $Policy) -or $Inventory.DocumentsByIdentifier.ContainsKey($reference.Identifier)) {
                continue
            }

            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'MissingReferencedDocumentId' -Document $document -Line $reference.Line -Expected "A document with identifier $($reference.Identifier)" -Actual "No inventory document has identifier $($reference.Identifier)" -Severity $Policy.severity.missingReferencedDocumentIds))
        }
    }

    return New-BlueprintCrossReferenceResult -CheckName 'Blueprint Missing References' -Findings $findings.ToArray() -SuccessSummary 'All required document references resolve in the inventory.'
}

function Resolve-BlueprintLocalMarkdownLinkPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Document,

        [Parameter(Mandatory)]
        [string]$Target
    )

    $pathPart = ($Target -split '[?#]', 2)[0]
    if ([string]::IsNullOrWhiteSpace($pathPart) -or $pathPart -notmatch '(?i)\.md$') {
        return $null
    }

    $pathPart = [uri]::UnescapeDataString($pathPart).Replace('\\', '/')
    $segments = [System.Collections.Generic.List[string]]::new()
    if (-not $pathPart.StartsWith('/')) {
        foreach ($directorySegment in (($Document.RelativePath -split '/')[0..(($Document.RelativePath -split '/').Count - 2)])) {
            if (-not [string]::IsNullOrWhiteSpace($directorySegment)) {
                $segments.Add($directorySegment)
            }
        }
    }

    foreach ($segment in ($pathPart.TrimStart('/') -split '/')) {
        if ([string]::IsNullOrWhiteSpace($segment) -or $segment -eq '.') {
            continue
        }

        if ($segment -eq '..') {
            if ($segments.Count -gt 0) {
                $segments.RemoveAt($segments.Count - 1)
            }
            continue
        }

        $segments.Add($segment)
    }

    return $segments -join '/'
}

function Invoke-BlueprintBrokenMarkdownLinkValidation {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Inventory,

        [Parameter(Mandatory)]
        [pscustomobject]$Policy
    )

    $findings = [System.Collections.Generic.List[object]]::new()
    foreach ($document in @(Get-BlueprintInventoryScopedDocuments -Inventory $Inventory -Policy $Policy)) {
        foreach ($link in @($document.Links)) {
            if ($link.IsExternal -or $link.Target -match '^(?i:mailto:)') {
                continue
            }

            $resolvedPath = Resolve-BlueprintLocalMarkdownLinkPath -Document $document -Target $link.Target
            if ($null -eq $resolvedPath -or $Inventory.DocumentsByRelativePath.ContainsKey($resolvedPath)) {
                continue
            }

            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'BrokenLocalMarkdownLink' -Document $document -Line $link.Line -Expected "A discovered Markdown document at $resolvedPath" -Actual "No inventory document matches link target $($link.Target)" -Severity $Policy.severity.brokenLocalMarkdownLinks))
        }
    }

    return New-BlueprintCrossReferenceResult -CheckName 'Blueprint Local Markdown Links' -Findings $findings.ToArray() -SuccessSummary 'All local Markdown file links resolve in the inventory.'
}

function Get-BlueprintDeclaredFolders {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Document
    )

    $folders = [System.Collections.Generic.List[string]]::new()
    $seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    $folderPattern = [regex]'(?<![A-Za-z0-9_])(?<Folder>\d{2}_[A-Za-z0-9_]+)(?![A-Za-z0-9_])'
    foreach ($line in @($Document.Lines)) {
        foreach ($match in $folderPattern.Matches($line)) {
            $folder = $match.Groups['Folder'].Value
            if ($seen.Add($folder)) {
                $folders.Add($folder)
            }
        }
    }

    return @($folders)
}

function Test-BlueprintFolderIgnored {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Folder,

        [Parameter(Mandatory)]
        [pscustomobject]$Policy
    )

    return @($Policy.ignoredFolders | Where-Object { $Folder -like [string]$_ }).Count -gt 0
}

function Invoke-BlueprintStructureAlignmentValidation {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Inventory,

        [Parameter(Mandatory)]
        [pscustomobject]$Policy
    )

    $structurePath = 'docs/00_Governance/DOCUMENT-STRUCTURE.md'
    $indexPath = 'docs/INDEX.md'
    if (-not $Inventory.DocumentsByRelativePath.ContainsKey($structurePath)) {
        throw "Structure source-of-truth document is missing from the inventory: $structurePath"
    }

    $structureDocument = $Inventory.DocumentsByRelativePath[$structurePath]
    $declaredFolders = @(Get-BlueprintDeclaredFolders -Document $structureDocument | Where-Object { -not (Test-BlueprintFolderIgnored -Folder $_ -Policy $Policy) })
    $actualFolders = @(
        $Inventory.Folders |
            Where-Object { ($_ -split '/').Count -eq 2 } |
            ForEach-Object { ($_ -split '/')[1] } |
            Where-Object { -not (Test-BlueprintFolderIgnored -Folder $_ -Policy $Policy) }
    )
    $findings = [System.Collections.Generic.List[object]]::new()

    foreach ($folder in $declaredFolders) {
        if ($actualFolders -notcontains $folder) {
            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'MissingMandatoryFolder' -Document $structureDocument -Line $null -Expected "Mandatory folder docs/$folder" -Actual "Folder docs/$folder is not present in the inventory" -Severity $Policy.severity.missingMandatoryFolders))
        }
    }

    foreach ($folder in $actualFolders) {
        if ($declaredFolders -notcontains $folder) {
            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'UndocumentedFolder' -Document $structureDocument -Line $null -Expected 'A folder declared by DOCUMENT-STRUCTURE.md' -Actual "Folder docs/$folder is not declared by DOCUMENT-STRUCTURE.md" -Severity $Policy.severity.undocumentedFolders))
        }
    }

    if (-not $Inventory.DocumentsByRelativePath.ContainsKey($indexPath)) {
        $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'IndexConsistency' -Document $structureDocument -Line $null -Expected "Index document $indexPath" -Actual 'Index document is not present in the inventory' -Severity $Policy.severity.indexConsistency))
    }
    else {
        $indexDocument = $Inventory.DocumentsByRelativePath[$indexPath]
        $indexFolders = @(Get-BlueprintDeclaredFolders -Document $indexDocument | Where-Object { -not (Test-BlueprintFolderIgnored -Folder $_ -Policy $Policy) })
        foreach ($folder in $declaredFolders) {
            if ($indexFolders -notcontains $folder) {
                $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'IndexMissingDeclaredFolder' -Document $indexDocument -Line $null -Expected "Folder $folder declared in DOCUMENT-STRUCTURE.md" -Actual "Folder $folder is not declared by INDEX.md" -Severity $Policy.severity.indexConsistency))
            }
        }

        foreach ($folder in $indexFolders) {
            if ($declaredFolders -notcontains $folder) {
                $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'IndexUndocumentedFolder' -Document $indexDocument -Line $null -Expected 'A folder declared by DOCUMENT-STRUCTURE.md' -Actual "INDEX.md declares undocumented folder $folder" -Severity $Policy.severity.indexConsistency))
            }
        }
    }

    return New-BlueprintCrossReferenceResult -CheckName 'Blueprint Structure Alignment' -Findings $findings.ToArray() -SuccessSummary 'Repository folders, INDEX.md, and DOCUMENT-STRUCTURE.md are aligned.'
}

function Invoke-BlueprintNumberingValidation {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Inventory,

        [Parameter(Mandatory)]
        [pscustomobject]$Policy
    )

    $findings = [System.Collections.Generic.List[object]]::new()
    $scopedDocuments = @(Get-BlueprintInventoryScopedDocuments -Inventory $Inventory -Policy $Policy)

    foreach ($identifier in @($Inventory.DocumentsByIdentifier.Keys | Sort-Object)) {
        $documents = @($Inventory.DocumentsByIdentifier[$identifier] | Where-Object { $scopedDocuments -contains $_ })
        if ($documents.Count -lt 2) {
            continue
        }

        foreach ($document in $documents) {
            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'DuplicateDocumentIdentifier' -Document $document -Line $null -Expected "A unique document identifier: $identifier" -Actual "Identifier $identifier is used by $($documents.Count) documents" -Severity $Policy.severity.duplicateDocumentIdentifiers))
        }
    }

    foreach ($document in $scopedDocuments) {
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($document.FileName)
        if ($baseName -match '^[A-Za-z]+-\d' -and $baseName -notmatch '^[A-Z]+-\d{3}[A-Z]?(?:-|$)') {
            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'IdentifierSyntax' -Document $document -Line $null -Expected 'Filename identifier format PREFIX-000 or PREFIX-000A' -Actual "Filename $($document.FileName) has an invalid identifier format" -Severity $Policy.severity.identifierSyntax))
        }

        if ($null -ne $document.HeadingIdentifier -and [string]::IsNullOrWhiteSpace($document.Identifier)) {
            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'FilenameIdentifierMismatch' -Document $document -Line $null -Expected "Filename identifier $($document.HeadingIdentifier)" -Actual "Filename $($document.FileName) has no valid identifier" -Severity $Policy.severity.filenameIdentifier))
        }
        elseif ($null -ne $document.HeadingIdentifier -and $document.Identifier -ne $document.HeadingIdentifier) {
            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'HeadingIdentifierMismatch' -Document $document -Line $null -Expected "Heading identifier $($document.Identifier)" -Actual "Heading identifier is $($document.HeadingIdentifier)" -Severity $Policy.severity.headingIdentifier))
        }
    }

    $identifiedDocuments = @($scopedDocuments | Where-Object { -not [string]::IsNullOrWhiteSpace($_.Identifier) })
    foreach ($prefixGroup in @($identifiedDocuments | Group-Object { $_.Identifier.Split('-')[0] })) {
        $numbers = @($prefixGroup.Group | ForEach-Object { [int]($_.Identifier.Split('-')[1] -replace '[A-Z]$', '') } | Sort-Object -Unique)
        if ($numbers.Count -lt 2) {
            continue
        }

        $missingNumbers = @($numbers[0]..$numbers[-1] | Where-Object { $_ -notin $numbers })
        if ($missingNumbers.Count -gt 0) {
            $document = $prefixGroup.Group | Select-Object -First 1
            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'NumberingGap' -Document $document -Line $null -Expected "Continuous $($prefixGroup.Name) numbering from $($numbers[0]) to $($numbers[-1])" -Actual "$($missingNumbers.Count) number(s) are missing; first missing number: $($missingNumbers[0])" -Severity $Policy.severity.numberingGaps))
        }
    }

    return New-BlueprintCrossReferenceResult -CheckName 'Blueprint Document Numbering' -Findings $findings.ToArray() -SuccessSummary 'Document identifiers and numbering are consistent.'
}

function Get-BlueprintMetadataPolicy {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Configuration
    )

    if ($null -eq $Configuration.Values -or $null -eq $Configuration.Values.metadataValidation) {
        throw 'Metadata validation configuration is missing.'
    }

    $policy = $Configuration.Values.metadataValidation
    foreach ($propertyName in @('mandatoryKeys', 'allowedKeys', 'validationPatterns', 'ignoredDocuments', 'ignoredFolders', 'severity')) {
        if ($null -eq $policy.PSObject.Properties[$propertyName]) {
            throw "Metadata validation configuration is missing '$propertyName'."
        }
    }

    foreach ($severityName in @('MissingMandatoryMetadata', 'DuplicateMetadata', 'UnknownMetadata', 'InvalidMetadataFormat', 'MetadataConsistency')) {
        if ($null -eq $policy.severity.PSObject.Properties[$severityName]) {
            throw "Metadata validation severity configuration is missing '$severityName'."
        }

        if ([string]$policy.severity.$severityName -notin @('INFO', 'PASS', 'WARNING', 'FAIL')) {
            throw "Metadata validation severity '$severityName' must be INFO, PASS, WARNING, or FAIL."
        }
    }

    return $policy
}

function Get-BlueprintLockedPolicy {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Configuration
    )

    if ($null -eq $Configuration.Values -or $null -eq $Configuration.Values.lockedValidation) {
        throw 'Locked validation configuration is missing.'
    }

    $policy = $Configuration.Values.lockedValidation
    foreach ($propertyName in @('requiredDocuments', 'ignoredDocuments', 'ignoredFolders', 'markerPattern', 'severity')) {
        if ($null -eq $policy.PSObject.Properties[$propertyName]) {
            throw "Locked validation configuration is missing '$propertyName'."
        }
    }

    foreach ($severityName in @('MissingLockedMarker', 'MultipleLockedMarkers', 'LockedNotAtEnd', 'ModifiedLockedDocument', 'LockedFormatInvalid')) {
        if ($null -eq $policy.severity.PSObject.Properties[$severityName]) {
            throw "Locked validation severity configuration is missing '$severityName'."
        }

        if ([string]$policy.severity.$severityName -notin @('INFO', 'PASS', 'WARNING', 'FAIL')) {
            throw "Locked validation severity '$severityName' must be INFO, PASS, WARNING, or FAIL."
        }
    }

    return $policy
}

function Get-BlueprintOrphanPolicy {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Configuration
    )

    if ($null -eq $Configuration.Values -or $null -eq $Configuration.Values.orphanValidation) {
        throw 'Orphan validation configuration is missing.'
    }

    $policy = $Configuration.Values.orphanValidation
    foreach ($propertyName in @('rootDocuments', 'ignoredDocuments', 'ignoredFolders', 'ignoredIdentifiers', 'severity')) {
        if ($null -eq $policy.PSObject.Properties[$propertyName]) {
            throw "Orphan validation configuration is missing '$propertyName'."
        }
    }

    foreach ($severityName in @('OrphanDocument', 'UnreachableDocument', 'UnusedIdentifier', 'OrphanFolder')) {
        if ($null -eq $policy.severity.PSObject.Properties[$severityName]) {
            throw "Orphan validation severity configuration is missing '$severityName'."
        }

        if ([string]$policy.severity.$severityName -notin @('INFO', 'PASS', 'WARNING', 'FAIL')) {
            throw "Orphan validation severity '$severityName' must be INFO, PASS, WARNING, or FAIL."
        }
    }

    return $policy
}

function Get-BlueprintDuplicateContentPolicy {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
    [pscustomobject]$Configuration
)

if ($null -eq $Configuration.Values -or $null -eq $Configuration.Values.duplicateContentValidation) {
    throw 'Duplicate content validation configuration is missing.'
}

$policy = $Configuration.Values.duplicateContentValidation
foreach ($propertyName in @('ignoredDocuments', 'ignoredFolders', 'normalizationOptions', 'similarityThreshold', 'severity')) {
    if ($null -eq $policy.PSObject.Properties[$propertyName]) {
        throw "Duplicate content validation configuration is missing '$propertyName'."
    }
}

foreach ($optionName in @('ignoreWhitespace', 'ignoreBlankLines', 'ignoreHeadingFormatting', 'decorationPatterns')) {
    if ($null -eq $policy.normalizationOptions.PSObject.Properties[$optionName]) {
        throw "Duplicate content validation normalization option is missing '$optionName'."
    }
}

foreach ($severityName in @('DuplicateHeading', 'DuplicateDocumentTitle', 'DuplicateNormalizedContent', 'NearDuplicateContent')) {
    if ($null -eq $policy.severity.PSObject.Properties[$severityName]) {
        throw "Duplicate content validation severity configuration is missing '$severityName'."
    }

    if ([string]$policy.severity.$severityName -notin @('INFO', 'PASS', 'WARNING', 'FAIL')) {
        throw "Duplicate content validation severity '$severityName' must be INFO, PASS, WARNING, or FAIL."
    }
}

$thresholdValue = $null
if (-not [double]::TryParse([string]$policy.similarityThreshold, [ref]$thresholdValue)) {
    throw 'Duplicate content validation similarityThreshold must be a numeric value.'
}

$threshold = [double]$policy.similarityThreshold
if ($threshold -lt 0 -or $threshold -gt 1) {
    throw 'Duplicate content validation similarityThreshold must be between 0.0 and 1.0.'
}

return $policy
}

function Get-BlueprintDuplicateContentNormalizedText {
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Text,

    [Parameter(Mandatory)]
    [pscustomobject]$Policy
)

$normalized = [string]$Text
$options = $Policy.normalizationOptions

if ($true -eq [bool]$options.ignoreHeadingFormatting) {
    $normalized = $normalized -replace '^(#{1,6})\s*', ''
}

foreach ($pattern in @($options.decorationPatterns)) {
    if (-not [string]::IsNullOrWhiteSpace($pattern)) {
        try {
            $normalized = [regex]::Replace($normalized, $pattern, '')
        }
        catch {
            $normalized = $normalized
        }
    }
}

if ($true -eq [bool]$options.ignoreWhitespace) {
    $normalized = $normalized -replace '\s+', ' '
}

$normalized = $normalized.Trim()
return $normalized.ToLowerInvariant()
}

function Get-BlueprintDuplicateContentNormalizedDocument {
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [pscustomobject]$Document,

    [Parameter(Mandatory)]
    [pscustomobject]$Policy
)

$options = $Policy.normalizationOptions
$resultLines = [System.Collections.Generic.List[string]]::new()

foreach ($line in @($Document.Lines)) {
    $text = [string]$line
    if ($true -eq [bool]$options.ignoreHeadingFormatting) {
        $text = $text -replace '^(#{1,6})\s*', ''
    }

    foreach ($pattern in @($options.decorationPatterns)) {
        if (-not [string]::IsNullOrWhiteSpace($pattern)) {
            try {
                $text = [regex]::Replace($text, $pattern, '')
            }
            catch {
                $text = $text
            }
        }
    }

    if ($true -eq [bool]$options.ignoreWhitespace) {
        $text = $text -replace '\s+', ' '
    }

    $text = $text.Trim()
    if ($true -eq [bool]$options.ignoreBlankLines -and [string]::IsNullOrWhiteSpace($text)) {
        continue
    }

    $resultLines.Add($text)
}

$normalized = ($resultLines -join "`n").Trim()
return $normalized.ToLowerInvariant()
}

function Get-BlueprintDuplicateContentTokenSet {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Text
    )

    $tokens = @($Text -split '\s+' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    $set = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($token in $tokens) { $set.Add($token) | Out-Null }
    return $set
}

function Get-BlueprintDuplicateContentSimilarity {
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Left,

    [Parameter(Mandatory)]
    [string]$Right
)

$leftSet = Get-BlueprintDuplicateContentTokenSet -Text $Left
$rightSet = Get-BlueprintDuplicateContentTokenSet -Text $Right

if ($leftSet.Count -eq 0 -or $rightSet.Count -eq 0) {
    return 0.0
}

$intersection = 0
foreach ($token in $leftSet) {
    if ($rightSet.Contains($token)) { $intersection++ }
}

$union = $leftSet.Count + $rightSet.Count - $intersection
if ($union -eq 0) { return 0.0 }

return [double]$intersection / [double]$union
}

function Get-BlueprintDuplicateContentSimilarityFromSets {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [System.Collections.Generic.HashSet[string]]$LeftSet,

        [Parameter(Mandatory)]
        [System.Collections.Generic.HashSet[string]]$RightSet
    )

    if ($LeftSet.Count -eq 0 -or $RightSet.Count -eq 0) {
        return 0.0
    }

    $intersection = 0
    foreach ($token in $LeftSet) {
        if ($RightSet.Contains($token)) { $intersection++ }
    }

    $union = $LeftSet.Count + $RightSet.Count - $intersection
    if ($union -eq 0) { return 0.0 }

    return [double]$intersection / [double]$union
}

function Invoke-BlueprintDuplicateContentValidation {
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [pscustomobject]$Inventory,

    [Parameter(Mandatory)]
    [pscustomobject]$Policy
)

$findings = [System.Collections.Generic.List[object]]::new()
$scopedDocuments = @(Get-BlueprintInventoryScopedDocuments -Inventory $Inventory -Policy $Policy)

$titleMap = @{}
$contentMap = @{}
$normalizedContent = @{}

foreach ($document in $scopedDocuments) {
    if (-not [string]::IsNullOrWhiteSpace($document.Title)) {
        $title = Get-BlueprintDuplicateContentNormalizedText -Text $document.Title -Policy $Policy
        if (-not $titleMap.ContainsKey($title)) { $titleMap[$title] = [System.Collections.Generic.List[object]]::new() }
        $titleMap[$title].Add($document)
    }

    $normalized = Get-BlueprintDuplicateContentNormalizedDocument -Document $document -Policy $Policy
    $normalizedContent[$document.RelativePath] = $normalized
    if (-not $contentMap.ContainsKey($normalized)) { $contentMap[$normalized] = [System.Collections.Generic.List[object]]::new() }
    $contentMap[$normalized].Add($document)
}

# Duplicate document title
foreach ($kv in $titleMap.GetEnumerator()) {
    if ($kv.Value.Count -gt 1) {
        foreach ($document in $kv.Value) {
            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'DuplicateDocumentTitle' -Document $document -Line $null -Expected 'Document titles must be unique' -Actual "Duplicate title: $($document.Title)" -Severity $Policy.severity.DuplicateDocumentTitle))
        }
    }
}

# Duplicate headings within a document
foreach ($document in $scopedDocuments) {
    $headingMap = @{}
    foreach ($heading in @($document.Headings)) {
        $normalizedHeading = Get-BlueprintDuplicateContentNormalizedText -Text $heading.Text -Policy $Policy
        if (-not $headingMap.ContainsKey($normalizedHeading)) { $headingMap[$normalizedHeading] = [System.Collections.Generic.List[object]]::new() }
        $headingMap[$normalizedHeading].Add($heading)
    }

    foreach ($kv in $headingMap.GetEnumerator()) {
        if ($kv.Value.Count -gt 1) {
            foreach ($heading in $kv.Value) {
                $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'DuplicateHeading' -Document $document -Line $heading.Line -Expected 'Heading text must be unique within the document' -Actual "Duplicate heading: $($heading.Text)" -Severity $Policy.severity.DuplicateHeading))
            }
        }
    }
}

# Duplicate normalized content across documents
foreach ($kv in $contentMap.GetEnumerator()) {
    if ($kv.Value.Count -gt 1) {
        foreach ($document in $kv.Value) {
            $related = $kv.Value | Where-Object { $_.RelativePath -ne $document.RelativePath } | ForEach-Object { $_.RelativePath }
            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'DuplicateNormalizedContent' -Document $document -Line $null -Expected 'Document content must be unique after normalization' -Actual "Identical normalized content with: $($related -join ', ')" -Severity $Policy.severity.DuplicateNormalizedContent))
        }
    }
}

# Near duplicate content
$keys = @($normalizedContent.Keys)
$threshold = [double]$Policy.similarityThreshold
$tokenSets = @{}
foreach ($key in $keys) {
    $tokenSets[$key] = Get-BlueprintDuplicateContentTokenSet -Text $normalizedContent[$key]
}

for ($i = 0; $i -lt $keys.Count; $i++) {
    for ($j = $i + 1; $j -lt $keys.Count; $j++) {
        $leftKey = $keys[$i]
        $rightKey = $keys[$j]
        $leftText = $normalizedContent[$leftKey]
        $rightText = $normalizedContent[$rightKey]
        if ($leftText -eq $rightText) { continue }

        $similarity = Get-BlueprintDuplicateContentSimilarityFromSets -LeftSet $tokenSets[$leftKey] -RightSet $tokenSets[$rightKey]
        if ($similarity -ge $threshold) {
            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'NearDuplicateContent' -Document $Inventory.DocumentsByRelativePath[$leftKey] -Line $null -Expected "Document content similarity below threshold $threshold" -Actual "Similarity to ${rightKey}: $([math]::Round($similarity * 100, 1))%" -Severity $Policy.severity.NearDuplicateContent))
        }
    }
}

return New-BlueprintCrossReferenceResult -CheckName 'Blueprint Duplicate Content Detection' -Findings $findings.ToArray() -SuccessSummary 'Duplicate content validation passed.'
}

function Invoke-BlueprintOrphanValidation {
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [pscustomobject]$Inventory,

    [Parameter(Mandatory)]
    [pscustomobject]$Policy,

    [Parameter(Mandatory)]
    [pscustomobject]$IntegrityPolicy
)

# Orphan detection uses both identifier references and resolvable local markdown links
$findings = [System.Collections.Generic.List[object]]::new()
    $scopedDocuments = @(Get-BlueprintInventoryScopedDocuments -Inventory $Inventory -Policy $Policy)

    # Prepare maps
    $incomingCountByDocument = @{}
    foreach ($doc in $scopedDocuments) { $incomingCountByDocument[$doc.RelativePath] = 0 }

    # Count incoming references via identifier references
    foreach ($source in $scopedDocuments) {
        foreach ($ref in @($source.References)) {
            if (($ref.Identifier) -and (-not (Test-BlueprintReferenceIgnored -Identifier $ref.Identifier -Policy $IntegrityPolicy))) {
                if ($Inventory.DocumentsByIdentifier.ContainsKey($ref.Identifier)) {
                    foreach ($target in $Inventory.DocumentsByIdentifier[$ref.Identifier]) {
                        if ($scopedDocuments -contains $target) {
                            $incomingCountByDocument[$target.RelativePath] = $incomingCountByDocument[$target.RelativePath] + 1
                        }
                    }
                }
            }
        }

        # Count incoming references via local markdown links
        foreach ($link in @($source.Links)) {
            if ($link.IsExternal -or $link.Target -match '^(?i:mailto:)') { continue }
            $resolvedPath = Resolve-BlueprintLocalMarkdownLinkPath -Document $source -Target $link.Target
            if ($null -ne $resolvedPath -and $Inventory.DocumentsByRelativePath.ContainsKey($resolvedPath)) {
                $targetDoc = $Inventory.DocumentsByRelativePath[$resolvedPath]
                if ($scopedDocuments -contains $targetDoc) {
                    $incomingCountByDocument[$targetDoc.RelativePath] = $incomingCountByDocument[$targetDoc.RelativePath] + 1
                }
            }
        }
    }

    # 1) OrphanDocument: no incoming references and not exempted
    foreach ($doc in $scopedDocuments) {
        # check ignored identifiers
        $isIgnored = $false
        foreach ($ignoredId in @($Policy.ignoredIdentifiers)) {
            if (-not [string]::IsNullOrWhiteSpace($doc.Identifier) -and $doc.Identifier -eq $ignoredId) { $isIgnored = $true; break }
        }
        if ($isIgnored) { continue }

        if ($incomingCountByDocument[$doc.RelativePath] -eq 0) {
            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'OrphanDocument' -Document $doc -Line $null -Expected 'Document has at least one incoming reference or exemption' -Actual 'No incoming references detected' -Severity $Policy.severity.OrphanDocument))
        }
    }

    # 2) UnreachableDocument: not reachable from any configured rootDocuments
    # Build adjacency for reachability using identifier references and local links
    $adj = @{}
    foreach ($d in $scopedDocuments) { $adj[$d.RelativePath] = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase) }

    foreach ($source in $scopedDocuments) {
        foreach ($ref in @($source.References)) {
            if ($ref.Identifier -and (-not (Test-BlueprintReferenceIgnored -Identifier $ref.Identifier -Policy $IntegrityPolicy)) -and $Inventory.DocumentsByIdentifier.ContainsKey($ref.Identifier)) {
                foreach ($t in $Inventory.DocumentsByIdentifier[$ref.Identifier]) {
                    if ($scopedDocuments -contains $t) { $adj[$source.RelativePath].Add($t.RelativePath) | Out-Null }
                }
            }
        }

        foreach ($link in @($source.Links)) {
            if ($link.IsExternal -or $link.Target -match '^(?i:mailto:)') { continue }
            $resolvedPath = Resolve-BlueprintLocalMarkdownLinkPath -Document $source -Target $link.Target
            if ($null -ne $resolvedPath -and $Inventory.DocumentsByRelativePath.ContainsKey($resolvedPath)) {
                $adj[$source.RelativePath].Add($resolvedPath) | Out-Null
            }
        }
    }

    # Resolve roots
    $rootSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($root in @($Policy.rootDocuments)) {
        foreach ($doc in $scopedDocuments) {
            if ((-not [string]::IsNullOrWhiteSpace($doc.Identifier) -and $doc.Identifier -eq $root) -or $doc.RelativePath -eq $root -or $doc.FileName -eq $root) {
                $rootSet.Add($doc.RelativePath) | Out-Null
            }
        }
    }

    # If no configured roots, consider documents with no incoming refs as potential roots (to avoid marking everything unreachable)
    if ($rootSet.Count -eq 0) {
        foreach ($d in $scopedDocuments) { if ($incomingCountByDocument[$d.RelativePath] -eq 0) { $rootSet.Add($d.RelativePath) | Out-Null } }
    }

    # BFS from roots
    $visited = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    $queue = [System.Collections.Generic.Queue[string]]::new()
    foreach ($r in $rootSet) { $visited.Add($r) | Out-Null; $queue.Enqueue($r) }
    while ($queue.Count -gt 0) {
        $cur = $queue.Dequeue()
        foreach ($nbr in $adj[$cur]) {
            if (-not $visited.Contains($nbr)) { $visited.Add($nbr) | Out-Null; $queue.Enqueue($nbr) }
        }
    }

    foreach ($d in $scopedDocuments) {
        if (-not $visited.Contains($d.RelativePath)) {
            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'UnreachableDocument' -Document $d -Line $null -Expected 'Document reachable from configured root documents' -Actual 'Document not reachable from configured roots' -Severity $Policy.severity.UnreachableDocument))
        }
    }

    # 3) UnusedIdentifier: identifiers declared but never referenced
    foreach ($identifier in @($Inventory.DocumentsByIdentifier.Keys | Sort-Object)) {
        if ($Policy.ignoredIdentifiers -contains $identifier) { continue }
        # compute incoming references to this identifier
        $incoming = 0
        foreach ($source in $scopedDocuments) {
            foreach ($ref in @($source.References)) {
                if ($ref.Identifier -and (-not (Test-BlueprintReferenceIgnored -Identifier $ref.Identifier -Policy $IntegrityPolicy)) -and $ref.Identifier -eq $identifier) { $incoming++ }
            }
        }

        if ($incoming -eq 0) {
            # Report for each document that declares the identifier
            foreach ($doc in @($Inventory.DocumentsByIdentifier[$identifier] | Where-Object { $scopedDocuments -contains $_ })) {
                $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'UnusedIdentifier' -Document $doc -Line $null -Expected 'Identifier is referenced at least once' -Actual "Identifier $identifier is not referenced" -Severity $Policy.severity.UnusedIdentifier))
            }
        }
    }

    # 4) OrphanFolder: folders that contain only orphan documents
    $orphanDocs = @($findings | Where-Object { $_.Rule -eq 'OrphanDocument' } | ForEach-Object { $_.Path })
    foreach ($folder in @($Inventory.Folders)) {
        # skip ignored folders per policy
        if (Test-BlueprintFolderIgnored -Folder $folder -Policy $Policy) { continue }
        # find docs in folder
        $docsInFolder = @($Inventory.Documents | Where-Object { $_.RelativePath.StartsWith($folder + '/') -and ($scopedDocuments -contains $_) })
        if ($docsInFolder.Count -eq 0) { continue }
        $allOrphans = $true
        foreach ($doc in $docsInFolder) {
            if ($orphanDocs -notcontains $doc.RelativePath) { $allOrphans = $false; break }
        }
        if ($allOrphans) {
            # use a pseudo-document object for folder reporting
            $fakeDoc = [pscustomobject]@{ Identifier = $null; RelativePath = $folder; FileName = $folder }
            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'OrphanFolder' -Document $fakeDoc -Line $null -Expected 'Folder contains non-orphan documents' -Actual "All documents in folder $folder are orphaned" -Severity $Policy.severity.OrphanFolder))
        }
    }

    return New-BlueprintCrossReferenceResult -CheckName 'Blueprint Orphan Detection' -Findings $findings.ToArray() -SuccessSummary 'No orphan-related issues detected.'
}

function Invoke-BlueprintLockedValidation {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Inventory,

        [Parameter(Mandatory)]
        [pscustomobject]$Policy
    )

    $findings = [System.Collections.Generic.List[object]]::new()

    # Resolve required documents: support identifiers or relative paths
    foreach ($required in @($Policy.requiredDocuments)) {
        $matches = @()
        foreach ($doc in @($Inventory.Documents)) {
            if (-not [string]::IsNullOrWhiteSpace($doc.Identifier) -and $doc.Identifier -eq $required) { $matches += $doc; continue }
            if ($doc.RelativePath -eq $required) { $matches += $doc; continue }
            if ($doc.FileName -eq $required) { $matches += $doc; continue }
        }

        if ($matches.Count -eq 0) {
            # Required document not found in inventory — report as MissingLockedMarker (document absent)
            $fakeDoc = [pscustomobject]@{ Identifier = $required; RelativePath = $required }
            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'MissingLockedMarker' -Document $fakeDoc -Line $null -Expected 'Document present with valid LOCKED marker' -Actual 'Document not found in inventory' -Severity $Policy.severity.MissingLockedMarker))
            continue
        }

        foreach ($document in $matches) {
            # Skip ignored documents/folders
            if ($Policy.ignoredDocuments -contains $document.RelativePath) { continue }
            $segments = $document.RelativePath -split '/'
            $ignored = $false
            foreach ($f in @($Policy.ignoredFolders)) { if ($segments -contains $f) { $ignored = $true; break } }
            if ($ignored) { continue }

            $lines = @($document.Lines)
            $regex = New-Object System.Text.RegularExpressions.Regex($Policy.markerPattern)
            $matchLines = @()
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($regex.IsMatch($lines[$i])) { $matchLines += [pscustomobject]@{ Line = $i + 1; Text = $lines[$i] } }
            }

            if ($matchLines.Count -eq 0) {
                $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'MissingLockedMarker' -Document $document -Line $null -Expected 'Document ends with LOCKED marker' -Actual 'LOCKED marker not found' -Severity $Policy.severity.MissingLockedMarker))
                continue
            }

            if ($matchLines.Count -gt 1) {
                # Multiple locked markers — report at second occurrence
                $second = $matchLines[1]
                $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'MultipleLockedMarkers' -Document $document -Line $second.Line -Expected 'Only one LOCKED marker at document end' -Actual "$($matchLines.Count) LOCKED markers found" -Severity $Policy.severity.MultipleLockedMarkers))
            }

            # Validate format of the marker (full-line match)
            foreach ($m in $matchLines) {
                $lineText = $m.Text.Trim()
                if (-not ([regex]::IsMatch($lineText, '^' + $Policy.markerPattern + '$'))) {
                    $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'LockedFormatInvalid' -Document $document -Line $m.Line -Expected "Marker format: $($Policy.markerPattern)" -Actual "Found: $lineText" -Severity $Policy.severity.LockedFormatInvalid))
                }
            }

            # LockedNotAtEnd: marker must be the last meaningful content
            $markerLine = $matchLines[-1].Line
            $lastMeaningful = $null
            for ($j = $lines.Count - 1; $j -ge 0; $j--) {
                $txt = $lines[$j].Trim()
                if ($txt -eq '' -or $txt -match '^(?:-){3,}$') { continue }
                $lastMeaningful = $j + 1
                break
            }

            if ($null -ne $lastMeaningful -and $lastMeaningful -ne $markerLine) {
                $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'LockedNotAtEnd' -Document $document -Line $markerLine -Expected 'LOCKED marker as final meaningful content' -Actual "Last meaningful content at line $lastMeaningful" -Severity $Policy.severity.LockedNotAtEnd))
            }

            # ModifiedLockedDocument: detect indicators of modification per configuration
            if ($null -ne $Policy.PSObject.Properties['modificationIndicators']) {
                foreach ($indicator in @($Policy.modificationIndicators)) {
                    $indicatorRegex = New-Object System.Text.RegularExpressions.Regex($indicator, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                    for ($k = 0; $k -lt $lines.Count; $k++) {
                        if ($indicatorRegex.IsMatch($lines[$k])) {
                            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'ModifiedLockedDocument' -Document $document -Line ($k + 1) -Expected 'No modification indicators in locked document' -Actual "Found modification indicator: $indicator" -Severity $Policy.severity.ModifiedLockedDocument))
                        }
                    }
                }
            }
        }
    }

    return New-BlueprintCrossReferenceResult -CheckName 'Blueprint Locked Validation' -Findings $findings.ToArray() -SuccessSummary 'Locked validation passed.'
}

function Invoke-BlueprintMetadataValidation {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Inventory,

        [Parameter(Mandatory)]
        [pscustomobject]$Policy
    )

    $findings = [System.Collections.Generic.List[object]]::new()
    $scopedDocuments = @(Get-BlueprintInventoryScopedDocuments -Inventory $Inventory -Policy $Policy)

    foreach ($document in $scopedDocuments) {
        $metadata = @($document.Metadata)

        # Build a map of keys (case-insensitive) to entries
        $entriesByKey = @{}
        foreach ($m in $metadata) {
            $key = if ($null -ne $m.Key) { $m.Key } else { '' }
            $keyLower = $key.ToLowerInvariant()
            if (-not $entriesByKey.ContainsKey($keyLower)) { $entriesByKey[$keyLower] = [System.Collections.Generic.List[object]]::new() }
            $entriesByKey[$keyLower].Add($m)
        }

        # 1) MissingMandatoryMetadata
        foreach ($mandatoryKey in @($Policy.mandatoryKeys)) {
            $mandatoryLower = [string]$mandatoryKey.ToLowerInvariant()
            if (-not $entriesByKey.ContainsKey($mandatoryLower) -or $entriesByKey[$mandatoryLower].Count -eq 0) {
                $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'MissingMandatoryMetadata' -Document $document -Line $null -Expected "Metadata key '$mandatoryKey' present" -Actual "Missing metadata key '$mandatoryKey'" -Severity $Policy.severity.MissingMandatoryMetadata))
            }
        }

        # 2) DuplicateMetadata
        foreach ($kv in $entriesByKey.Keys) {
            $list = $entriesByKey[$kv]
            if ($list.Count -gt 1) {
                foreach ($entry in $list) {
                    $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'DuplicateMetadata' -Document $document -Line $entry.Line -Expected "Single metadata key: $($entry.Key)" -Actual "Multiple metadata entries for key $($entry.Key)" -Severity $Policy.severity.DuplicateMetadata))
                }
            }
        }

        # 3) UnknownMetadata
        $allowedSet = @{}
        foreach ($k in @($Policy.allowedKeys)) { $allowedSet[[string]$k.ToLowerInvariant()] = $true }
        foreach ($kv in $entriesByKey.Keys) {
            if (-not $allowedSet.ContainsKey($kv)) {
                foreach ($entry in $entriesByKey[$kv]) {
                    $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'UnknownMetadata' -Document $document -Line $entry.Line -Expected "Allowed metadata keys: $((@($Policy.allowedKeys) -join ', '))" -Actual "Found metadata key: $($entry.Key)" -Severity $Policy.severity.UnknownMetadata))
                }
            }
        }

        # 4) InvalidMetadataFormat
        foreach ($patternKey in @($Policy.validationPatterns.PSObject.Properties.Name)) {
            $pattern = [string]$Policy.validationPatterns.$patternKey
            $patternRegex = New-Object System.Text.RegularExpressions.Regex($pattern)
            $keyLower = $patternKey.ToLowerInvariant()
            if ($entriesByKey.ContainsKey($keyLower)) {
                foreach ($entry in $entriesByKey[$keyLower]) {
                    $value = if ($null -ne $entry.Value) { [string]$entry.Value } else { '' }
                    if (-not $patternRegex.IsMatch($value)) {
                        $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'InvalidMetadataFormat' -Document $document -Line $entry.Line -Expected "Value matches regex: $pattern" -Actual "Value: $value" -Severity $Policy.severity.InvalidMetadataFormat))
                    }
                }
            }
        }

        # 5) MetadataConsistency
        # Support configurable consistency rules (optional). Each rule object can be:
        # { "type": "equal", "keys": ["KeyA","KeyB"], "message": "KeyA must equal KeyB" }
        # { "type": "oneOf", "key": "KeyX", "allowed": ["A","B"] }
        if ($null -ne $Policy.PSObject.Properties['consistencyRules']) {
            foreach ($rule in @($Policy.consistencyRules)) {
                $ruleType = [string]$rule.type
                switch ($ruleType) {
                    'equal' {
                        $keys = @($rule.keys)
                        if ($keys.Count -lt 2) { continue }
                        $values = @()
                        foreach ($k in $keys) {
                            $kLower = [string]$k.ToLowerInvariant()
                            if ($entriesByKey.ContainsKey($kLower) -and $entriesByKey[$kLower].Count -gt 0) {
                                $values += [string]$entriesByKey[$kLower][0].Value
                            }
                            else {
                                $values += $null
                            }
                        }

                        $nonNull = $values | Where-Object { $_ -ne $null }
                        if ($nonNull.Count -gt 0 -and ($nonNull | Select-Object -Unique).Count -gt 1) {
                            $expected = if ($rule.message) { $rule.message } else { "Values for keys: $($keys -join ', ') must be equal" }
                            $parts = @()
                            foreach ($k2 in $keys) {
                                $k2Lower = [string]$k2.ToLowerInvariant()
                                if ($entriesByKey.ContainsKey($k2Lower) -and $entriesByKey[$k2Lower].Count -gt 0) { $val = $entriesByKey[$k2Lower][0].Value } else { $val = '<missing>' }
                                $parts += ("{0}=`"{1}`"" -f $k2, $val)
                            }
                            $actual = ($parts -join '; ')
                            $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'MetadataConsistency' -Document $document -Line $null -Expected $expected -Actual $actual -Severity $Policy.severity.MetadataConsistency))
                        }
                    }
                    'oneOf' {
                        $key = [string]$rule.key
                        $allowed = @($rule.allowed)
                        $kLower = $key.ToLowerInvariant()
                        if ($entriesByKey.ContainsKey($kLower) -and $entriesByKey[$kLower].Count -gt 0) {
                            $entry = $entriesByKey[$kLower][0]
                            $value = [string]$entry.Value
                            if ($allowed.Count -gt 0 -and ($allowed -notcontains $value)) {
                                $expected = if ($rule.message) { $rule.message } else { "Value must be one of: $($allowed -join ', ')" }
                                $findings.Add((New-BlueprintCrossReferenceFinding -Rule 'MetadataConsistency' -Document $document -Line $entry.Line -Expected $expected -Actual "Value: $value" -Severity $Policy.severity.MetadataConsistency))
                            }
                        }
                    }
                    default {
                        # Unknown rule type: ignore
                    }
                }
            }
        }
    }

    return New-BlueprintCrossReferenceResult -CheckName 'Blueprint Metadata Validation' -Findings $findings.ToArray() -SuccessSummary 'Metadata validation passed.'
}

function Invoke-BlueprintCrossReferenceValidation {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Inventory,

        [Parameter(Mandatory)]
        [pscustomobject]$Policy
    )

    return @(
        Invoke-BlueprintMissingReferenceValidation -Inventory $Inventory -Policy $Policy
        Invoke-BlueprintBrokenMarkdownLinkValidation -Inventory $Inventory -Policy $Policy
    )
}

function Invoke-BlueprintInventoryCheck {
    [CmdletBinding()]
    param([pscustomobject]$Configuration)

    $projectRoot = Get-AuditProjectRoot -StartPath $PSScriptRoot
    $inventory = Get-BlueprintInventory -ProjectRoot $projectRoot
    $policy = Get-BlueprintIntegrityPolicy -Configuration $Configuration
    $traceabilityPolicy = Get-BlueprintTraceabilityPolicy -Configuration $Configuration
    $metadataPolicy = Get-BlueprintMetadataPolicy -Configuration $Configuration
    $lockedPolicy = Get-BlueprintLockedPolicy -Configuration $Configuration
    $orphanPolicy = Get-BlueprintOrphanPolicy -Configuration $Configuration
    $duplicateContentPolicy = Get-BlueprintDuplicateContentPolicy -Configuration $Configuration

    Write-AuditSection -Text 'Blueprint Inventory'
    Write-AuditSuccess -Message 'Blueprint inventory was created successfully.'
    $details = @(
        [pscustomobject]@{ Item = 'Document root'; Value = $inventory.DocumentRoot; Status = 'PASS' },
        [pscustomobject]@{ Item = 'Markdown documents discovered'; Value = $inventory.DocumentCount; Status = 'PASS' }
    )
    Write-AuditTable -InputObject $details -Property Item, Value, Status

    $inventoryResult = [pscustomobject]@{
        CheckName = 'Blueprint Inventory'
        Status    = 'PASS'
        Summary   = 'Blueprint inventory was created successfully.'
        Details   = $details
        CheckedAt = Get-AuditTimestamp
    }

    return @(
        $inventoryResult
        Invoke-BlueprintMetadataValidation -Inventory $inventory -Policy $metadataPolicy
        Invoke-BlueprintLockedValidation -Inventory $inventory -Policy $lockedPolicy
        Invoke-BlueprintOrphanValidation -Inventory $inventory -Policy $orphanPolicy -IntegrityPolicy $policy
        Invoke-BlueprintDuplicateContentValidation -Inventory $inventory -Policy $duplicateContentPolicy
        Invoke-BlueprintCrossReferenceValidation -Inventory $inventory -Policy $policy
        Invoke-BlueprintStructureAlignmentValidation -Inventory $inventory -Policy $policy
        Invoke-BlueprintNumberingValidation -Inventory $inventory -Policy $policy
        Invoke-BlueprintTraceabilityValidation -Inventory $inventory -BlueprintPolicy $policy -TraceabilityPolicy $traceabilityPolicy
    )
}

if ($MyInvocation.InvocationName -ne '.') { Invoke-BlueprintInventoryCheck -Configuration $Configuration }
