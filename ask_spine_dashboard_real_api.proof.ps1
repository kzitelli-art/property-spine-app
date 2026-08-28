param(
  [Parameter(Mandatory = $true)]
  [string]$ApiRoot,
  [string]$PostgresBin = $(if ($env:PSPINE_POSTGRES_BIN) { $env:PSPINE_POSTGRES_BIN } else { 'C:\Program Files\PostgreSQL\17\bin' }),
  [string]$Node = $(if ((Get-Command node -ErrorAction SilentlyContinue)) { (Get-Command node).Source } else { '' }),
  [string]$NodeModules = $env:NODE_PATH
)

$ErrorActionPreference = 'Stop'
$proofExit = 1
$cleanupFailed = $false
$clusterStarted = $false
$clusterResidue = $true
$runToken = [Guid]::NewGuid().ToString('N')
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar)
$clusterRoot = Join-Path $tempRoot "property-spine-dashboard-proof-$runToken"
$dataRoot = Join-Path $clusterRoot 'data'
$postgresLog = Join-Path $clusterRoot 'postgres.log'
$initdb = Join-Path $PostgresBin 'initdb.exe'
$pgCtl = Join-Path $PostgresBin 'pg_ctl.exe'
$psql = Join-Path $PostgresBin 'psql.exe'

function Get-FreePort {
  $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
  try {
    $listener.Start()
    return ([Net.IPEndPoint]$listener.LocalEndpoint).Port
  } finally {
    $listener.Stop()
  }
}

try {
  if (-not $Node -or -not (Test-Path -LiteralPath $Node)) { throw 'A Node executable is required.' }
  if (-not $NodeModules) { throw 'NODE_PATH or -NodeModules must point to the Playwright dependency directory.' }
  if (-not (Test-Path -LiteralPath $ApiRoot)) { throw "API root does not exist: $ApiRoot" }
  foreach ($tool in @($initdb, $pgCtl, $psql)) {
    if (-not (Test-Path -LiteralPath $tool)) { throw "Postgres tool does not exist: $tool" }
  }
  $resolvedCluster = [IO.Path]::GetFullPath($clusterRoot)
  if (-not $resolvedCluster.StartsWith($tempRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Generated cluster path escaped the operating-system temp directory.'
  }
  New-Item -ItemType Directory -Path $clusterRoot | Out-Null
  & $initdb -D $dataRoot --username=postgres --auth-local=trust --auth-host=trust --encoding=UTF8 --no-locale
  if ($LASTEXITCODE -ne 0) { throw 'initdb failed.' }

  $postgresPort = Get-FreePort
  $apiPort = Get-FreePort
  $appPort = Get-FreePort
  if (@(@($postgresPort, $apiPort, $appPort) | Select-Object -Unique).Count -ne 3) {
    throw 'Port allocator returned a duplicate port.'
  }
  & $pgCtl -D $dataRoot -l $postgresLog -o "-h 127.0.0.1 -p $postgresPort" -w start
  if ($LASTEXITCODE -ne 0) { throw 'Disposable PostgreSQL cluster did not start.' }
  $clusterStarted = $true

  $env:NODE_PATH = $NodeModules
  $env:PSPINE_REAL_API_ROOT = (Resolve-Path -LiteralPath $ApiRoot).Path
  $env:PSPINE_REAL_POSTGRES_ADMIN_URL = "postgresql://postgres@127.0.0.1:$postgresPort/postgres"
  $env:PSPINE_REAL_PSQL = $psql
  $env:PSPINE_REAL_API_BASE = "http://127.0.0.1:$apiPort"
  $env:PSPINE_REAL_APP_PORT = [string]$appPort
  $env:PSPINE_REAL_API_OPERATOR_KEY = 'e2e-key'
  Remove-Item Env:PSPINE_ALLOW_FALSIFIED_INDEX -ErrorAction SilentlyContinue

  & $Node (Join-Path $PSScriptRoot 'ask_spine_dashboard_real_api.browser.js')
  $proofExit = $LASTEXITCODE
} finally {
  if ($clusterStarted) {
    try {
      & $pgCtl -D $dataRoot -w stop -m fast
      if ($LASTEXITCODE -ne 0) { throw 'pg_ctl stop failed.' }
    } catch {
      $cleanupFailed = $true
      Write-Warning "Disposable cluster stop failed: $($_.Exception.Message)"
    }
  }
  if (Test-Path -LiteralPath $clusterRoot) {
    try {
      $resolvedCluster = (Resolve-Path -LiteralPath $clusterRoot).Path
      if (-not $resolvedCluster.StartsWith($tempRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Refusing cleanup outside the operating-system temp directory.'
      }
      Remove-Item -LiteralPath $resolvedCluster -Recurse -Force
    } catch {
      $cleanupFailed = $true
      Write-Warning "Disposable cluster residue remains at ${clusterRoot}: $($_.Exception.Message)"
    }
  }
  $clusterResidue = Test-Path -LiteralPath $clusterRoot
  Write-Output "DISPOSABLE_CLUSTER_RESIDUE=$clusterResidue"
}

if ($cleanupFailed -and $proofExit -eq 0) { $proofExit = 1 }
if ($proofExit -eq 0) {
  $receiptPath = Join-Path $PSScriptRoot 'docs\ask-spine-dashboard-real-api-proof\last-run.json'
  $receipt = Get-Content -Raw -LiteralPath $receiptPath | ConvertFrom-Json
  $receipt.lifecycle | Add-Member -NotePropertyName disposable_cluster_stopped -NotePropertyValue $true -Force
  $receipt.lifecycle | Add-Member -NotePropertyName disposable_cluster_removed -NotePropertyValue (-not $clusterResidue) -Force
  $receipt.lifecycle | Add-Member -NotePropertyName os_policy_residue -NotePropertyValue $(if ($clusterResidue) { $clusterRoot } else { $null }) -Force
  $receipt | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $receiptPath -Encoding utf8
}
exit $proofExit
