Set-StrictMode -Version Latest

function Get-AuditConfiguration {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateNotNullOrEmpty()]
        [string]$ProjectRoot
    )

    $configPath = Join-Path -Path $ProjectRoot -ChildPath 'scripts/audit-config.json'
    $errors = [System.Collections.Generic.List[string]]::new()
    $configuration = $null

    if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) {
        $errors.Add("Audit configuration file was not found: $configPath")
    }
    else {
        try {
            $rawConfiguration = Get-Content -LiteralPath $configPath -Raw -ErrorAction Stop

            if ([string]::IsNullOrWhiteSpace($rawConfiguration)) {
                $errors.Add("Audit configuration file is empty: $configPath")
            }
            else {
                $configuration = $rawConfiguration | ConvertFrom-Json -ErrorAction Stop

                if ($null -eq $configuration -or $configuration -isnot [pscustomobject]) {
                    $errors.Add('Audit configuration must contain a JSON object at its root.')
                }
            }
        }
        catch {
            $errors.Add("Audit configuration is invalid JSON: $($_.Exception.Message)")
        }
    }

    return [pscustomobject]@{
        IsValid     = $errors.Count -eq 0
        ProjectRoot = $ProjectRoot
        Path        = $configPath
        Values      = $configuration
        Errors      = @($errors)
    }
}
