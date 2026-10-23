param([string]$Config = (Join-Path $PSScriptRoot 'config.json'))
$ErrorActionPreference = 'Stop'
if (Get-Command py -ErrorAction SilentlyContinue) {
    & py -3 (Join-Path $PSScriptRoot 'refresh_vfr.py') --config $Config
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    & python (Join-Path $PSScriptRoot 'refresh_vfr.py') --config $Config
} else {
    throw 'Python 3.10+ est requis. Voir MODE-D-EMPLOI.md.'
}
if ($LASTEXITCODE -ne 0) { throw "Le refresh a échoué (code $LASTEXITCODE). Voir les rapports dans data." }
