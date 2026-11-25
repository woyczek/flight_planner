$ErrorActionPreference='Stop'
try {
    $config=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    if(-not (Test-Path -LiteralPath $config.python)) { throw 'Python introuvable. Renseigner le chemin de python.exe dans config.json.' }
    # Restart only this installation's RouteSim process. Previously, server.py
    # silently reused an older instance, keeping its imported Python modules.
    $routeSimScript = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'server.py'))
    $routeSimEscaped = [regex]::Escape($routeSimScript)
    Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" | Where-Object {
        $_.CommandLine -match ('(?i)(?:"' + $routeSimEscaped + '"|' + $routeSimEscaped + ')(?:\s|$)')
    } | ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction Stop }
    Write-Host 'RouteSim - serveur local. Fermer cette fenetre pour arreter.'
    & $config.python $routeSimScript
    exit $LASTEXITCODE
} catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }
