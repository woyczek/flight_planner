$ErrorActionPreference='Stop'
try {
    $config=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    & $config.python (Join-Path $PSScriptRoot 'import_rad.py')
    exit $LASTEXITCODE
} catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }
