Set-StrictMode -Version Latest

function Get-BlueprintInventoryIdentifier {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [System.IO.FileInfo]$Document
    )

    $match = [regex]::Match($Document.BaseName, '^(?<Prefix>[A-Za-z]+)-(?<Number>\d+)(?<Suffix>[A-Za-z]?)')
    if (-not $match.Success) {
        return $null
    }

    return ('{0}-{1}{2}' -f $match.Groups['Prefix'].Value.ToUpperInvariant(), $match.Groups['Number'].Value, $match.Groups['Suffix'].Value.ToUpperInvariant())
}

function Get-BlueprintInventoryHeadings {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string[]]$Lines
    )

    $headings = [System.Collections.Generic.List[object]]::new()
    for ($index = 0; $index -lt $Lines.Count; $index++) {
        $match = [regex]::Match($Lines[$index], '^(?<Markers>#{1,6})\s+(?<Text>.+?)\s*#*\s*$')
        if ($match.Success) {
            $headings.Add([pscustomobject]@{
                    Level = $match.Groups['Markers'].Value.Length
                    Text  = $match.Groups['Text'].Value.Trim()
                    Line  = $index + 1
                })
        }
    }

    return @($headings)
}

function Get-BlueprintInventoryHeadingIdentifier {
    [CmdletBinding()]
    param(
        [AllowEmptyCollection()]
        [object[]]$Headings
    )

    foreach ($heading in @($Headings | Where-Object { $_.Level -eq 1 })) {
        $match = [regex]::Match($heading.Text, '^(?<Identifier>[A-Za-z]+-\d{3}[A-Za-z]?)(?:\s|:|-|$)')
        if ($match.Success) {
            return $match.Groups['Identifier'].Value.ToUpperInvariant()
        }
    }

    return $null
}

function Get-BlueprintInventoryTitle {
    [CmdletBinding()]
    param(
        [AllowEmptyCollection()]
        [object[]]$Headings,

        [AllowNull()]
        [string]$Identifier
    )

    foreach ($heading in @($Headings | Where-Object { $_.Level -eq 1 })) {
        $title = $heading.Text.Trim()
        if (-not [string]::IsNullOrWhiteSpace($Identifier) -and $title -match ("^{0}(?:\s*[:\-]\s*|\s+)?" -f [regex]::Escape($Identifier))) {
            $title = $title.Substring($Identifier.Length).Trim(' ', ':', '-')
        }

        if (-not [string]::IsNullOrWhiteSpace($title)) {
            return $title
        }
    }

    return $null
}

function Get-BlueprintInventoryMetadata {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string[]]$Lines
    )

    $knownKeys = @('Project', 'Repository Version', 'Version', 'Status', 'Authority', 'Date', 'Owner', 'Priority', 'Decision Type')
    $metadata = [System.Collections.Generic.List[object]]::new()

    for ($index = 0; $index -lt $Lines.Count; $index++) {
        $line = $Lines[$index].Trim()
        $inlineMatch = [regex]::Match($line, '^(?:\*\*)?(?<Key>Project|Repository Version|Version|Status|Authority|Date|Owner|Priority|Decision Type)(?:\*\*)?\s*:\s*(?<Value>.+?)\s*$')
        if ($inlineMatch.Success) {
            $metadata.Add([pscustomobject]@{
                    Key    = $inlineMatch.Groups['Key'].Value
                    Value  = $inlineMatch.Groups['Value'].Value.Trim()
                    Line   = $index + 1
                    Format = 'Inline'
                })
            continue
        }

        $headingMatch = [regex]::Match($line, '^#{1,6}\s+(?<Key>Project|Repository Version|Version|Status|Authority|Date|Owner|Priority|Decision Type)\s*$')
        $plainKeyMatch = $knownKeys -contains $line
        if (-not $headingMatch.Success -and -not $plainKeyMatch) {
            continue
        }

        $key = if ($headingMatch.Success) { $headingMatch.Groups['Key'].Value } else { $line }
        for ($valueIndex = $index + 1; $valueIndex -lt $Lines.Count; $valueIndex++) {
            $value = $Lines[$valueIndex].Trim()
            if ([string]::IsNullOrWhiteSpace($value) -or $value -match '^---+$') {
                continue
            }

            if ($value -match '^#') {
                break
            }

            $metadata.Add([pscustomobject]@{
                    Key    = $key
                    Value  = $value.Trim('*', ' ')
                    Line   = $valueIndex + 1
                    Format = if ($headingMatch.Success) { 'Heading' } else { 'Block' }
                })
            break
        }
    }

    return @($metadata)
}

function Get-BlueprintInventoryLinks {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string[]]$Lines
    )

    $links = [System.Collections.Generic.List[object]]::new()
    $linkPattern = [regex]'(?<!!)\[(?<Text>[^\]]+)\]\((?<Target>[^)]+)\)'

    for ($index = 0; $index -lt $Lines.Count; $index++) {
        foreach ($match in $linkPattern.Matches($Lines[$index])) {
            $target = $match.Groups['Target'].Value.Trim()
            $links.Add([pscustomobject]@{
                    Text       = $match.Groups['Text'].Value.Trim()
                    Target     = $target
                    Line       = $index + 1
                    IsExternal = $target -match '^[a-z][a-z0-9+.-]*://'
                    IsAnchor   = $target.StartsWith('#')
                })
        }
    }

    return @($links)
}

function Get-BlueprintInventoryReferences {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string[]]$Lines
    )

    $references = [System.Collections.Generic.List[object]]::new()
    $referencePattern = [regex]'(?<![A-Za-z0-9])(?<Identifier>[A-Za-z]{1,12}-\d{3}[A-Za-z]?)(?![A-Za-z0-9])'

    for ($index = 0; $index -lt $Lines.Count; $index++) {
        foreach ($match in $referencePattern.Matches($Lines[$index])) {
            $references.Add([pscustomobject]@{
                    Identifier = $match.Groups['Identifier'].Value.ToUpperInvariant()
                    Line       = $index + 1
                })
        }
    }

    return @($references)
}

function Get-BlueprintInventory {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateNotNullOrEmpty()]
        [string]$ProjectRoot,

        [string]$DocumentRoot
    )

    $resolvedProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot -ErrorAction Stop).Path
    if ([string]::IsNullOrWhiteSpace($DocumentRoot)) {
        $DocumentRoot = Join-Path -Path $resolvedProjectRoot -ChildPath 'docs'
    }

    if (-not (Test-Path -LiteralPath $DocumentRoot -PathType Container)) {
        throw "Blueprint document root was not found: $DocumentRoot"
    }

    $resolvedDocumentRoot = (Resolve-Path -LiteralPath $DocumentRoot -ErrorAction Stop).Path
    $documents = [System.Collections.Generic.List[object]]::new()
    $folders = [System.Collections.Generic.List[string]]::new()
    $documentsByIdentifier = @{}
    $documentsByRelativePath = @{}

    foreach ($folder in @(Get-ChildItem -LiteralPath $resolvedDocumentRoot -Recurse -Directory | Sort-Object FullName)) {
        $relativeFolderPath = $folder.FullName.Substring($resolvedProjectRoot.Length).TrimStart('\', '/') -replace '\\', '/'
        $folders.Add($relativeFolderPath)
    }

    foreach ($document in @(Get-ChildItem -LiteralPath $resolvedDocumentRoot -Recurse -File -Filter '*.md' | Sort-Object FullName)) {
        $relativePath = $document.FullName.Substring($resolvedProjectRoot.Length).TrimStart('\', '/') -replace '\\', '/'
        $content = Get-Content -LiteralPath $document.FullName -Raw -ErrorAction Stop
        $lines = @($content -split "`r?`n")
        $identifier = Get-BlueprintInventoryIdentifier -Document $document
        $headings = @(Get-BlueprintInventoryHeadings -Lines $lines)
        $metadata = @(Get-BlueprintInventoryMetadata -Lines $lines)
        $record = [pscustomobject]@{
            Path        = $document.FullName
            RelativePath = $relativePath
            FileName    = $document.Name
            Identifier  = $identifier
            HeadingIdentifier = Get-BlueprintInventoryHeadingIdentifier -Headings $headings
            Title       = Get-BlueprintInventoryTitle -Headings $headings -Identifier $identifier
            Metadata    = $metadata
            Headings    = $headings
            Lines       = $lines
            Links       = @(Get-BlueprintInventoryLinks -Lines $lines)
            References  = @(Get-BlueprintInventoryReferences -Lines $lines)
        }

        $documents.Add($record)
        $documentsByRelativePath[$relativePath] = $record
        if (-not [string]::IsNullOrWhiteSpace($identifier)) {
            if (-not $documentsByIdentifier.ContainsKey($identifier)) {
                $documentsByIdentifier[$identifier] = [System.Collections.Generic.List[object]]::new()
            }
            $documentsByIdentifier[$identifier].Add($record)
        }
    }

    return [pscustomobject]@{
        ProjectRoot            = $resolvedProjectRoot
        DocumentRoot           = $resolvedDocumentRoot
        CreatedAt              = Get-Date
        DocumentCount          = $documents.Count
        Documents              = @($documents)
        Folders                = @($folders)
        DocumentsByIdentifier  = $documentsByIdentifier
        DocumentsByRelativePath = $documentsByRelativePath
    }
}
