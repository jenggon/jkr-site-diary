Set-StrictMode -Version Latest

function Write-AuditHeader {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateNotNullOrEmpty()]
        [string]$Text
    )

    Write-AuditDivider -Character '='
    Write-Host $Text -ForegroundColor Cyan
    Write-AuditDivider -Character '='
}

function Write-AuditSection {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateNotNullOrEmpty()]
        [string]$Text
    )

    Write-Host "-- $Text --" -ForegroundColor Yellow
}

function Write-AuditDivider {
    [CmdletBinding()]
    param(
        [ValidateLength(1, 1)]
        [string]$Character = '-',

        [ValidateRange(1, 200)]
        [int]$Length = 72
    )

    Write-Host ($Character * $Length)
}

function Format-AuditKeyValue {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateNotNullOrEmpty()]
        [string]$Key,

        [AllowNull()]
        [object]$Value,

        [ValidateRange(1, 80)]
        [int]$KeyWidth = 24
    )

    return ("{0,-$KeyWidth} : {1}" -f $Key, $Value)
}

function Write-AuditTable {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [object[]]$InputObject,

        [string[]]$Property,

        [ValidateRange(20, 500)]
        [int]$Width = 120
    )

    if ($InputObject.Count -eq 0) {
        return
    }

    $formatParameters = @{ AutoSize = $true }
    if ($Property.Count -gt 0) {
        $formatParameters.Property = $Property
    }

    $table = $InputObject |
        Format-Table @formatParameters |
        Out-String -Width $Width

    Write-Host $table.TrimEnd()
}

function Write-AuditBlankLine {
    [CmdletBinding()]
    param(
        [ValidateRange(1, 20)]
        [int]$Count = 1
    )

    1..$Count | ForEach-Object {
        Write-Host ''
    }
}
