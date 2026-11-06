[CmdletBinding(SupportsShouldProcess)]
param([string]$SuiteRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath($SuiteRoot)
$launcher = Join-Path $root 'tools\launch.py'
if (-not (Test-Path -LiteralPath $launcher -PathType Leaf)) { throw 'Installe cette version dans le dossier FuelDashboard de DEFA avant de lancer le dashboard.' }
$python = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$pythonArgs = @()
if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
    $command = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($command) { $python = $command.Source; $pythonArgs = @('-3') }
    else {
        $command = Get-Command python.exe -ErrorAction SilentlyContinue
        if (-not $command) { throw 'Python est introuvable. Utilise le lanceur habituel de DEFA pour ouvrir FuelDashboard/index.html.' }
        $python = $command.Source
    }
}
$pythonArgs += @('"' + $launcher + '"', '--page', 'FuelDashboard/index.html')
if ($PSCmdlet.ShouldProcess($launcher, 'Ouvrir le dashboard avec le lanceur DEFA')) {
    Start-Process -FilePath $python -ArgumentList $pythonArgs -WorkingDirectory $root -WindowStyle Hidden
}
