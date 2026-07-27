Set-StrictMode -Version Latest

function Write-AuditLog {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateSet('INFO', 'SUCCESS', 'WARNING', 'ERROR')]
        [string]$Level,

        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$Message,

        [switch]$IncludeTimestamp
    )

    $timestamp = if ($IncludeTimestamp) {
        "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] "
    }
    else {
        ''
    }

    $colour = switch ($Level) {
        'SUCCESS' { 'Green' }
        'WARNING' { 'Yellow' }
        'ERROR'   { 'Red' }
        default   { 'Cyan' }
    }

    Write-Host "$timestamp[$Level] $Message" -ForegroundColor $colour
}

function Write-AuditInfo {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$Message,

        [switch]$IncludeTimestamp
    )

    Write-AuditLog -Level 'INFO' -Message $Message -IncludeTimestamp:$IncludeTimestamp
}

function Write-AuditSuccess {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$Message,

        [switch]$IncludeTimestamp
    )

    Write-AuditLog -Level 'SUCCESS' -Message $Message -IncludeTimestamp:$IncludeTimestamp
}

function Write-AuditWarning {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$Message,

        [switch]$IncludeTimestamp
    )

    Write-AuditLog -Level 'WARNING' -Message $Message -IncludeTimestamp:$IncludeTimestamp
}

function Write-AuditError {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$Message,

        [switch]$IncludeTimestamp
    )

    Write-AuditLog -Level 'ERROR' -Message $Message -IncludeTimestamp:$IncludeTimestamp
}
