param([Parameter(Mandatory=$true)][string]$PrivateIp,[int]$HttpsPort=3443,[switch]$Demo,[switch]$ValidateOnly)
$ErrorActionPreference='Stop'
$parsedAddress=[System.Net.IPAddress]::Parse($PrivateIp)
$bytes=$parsedAddress.GetAddressBytes()
$isPrivate=$bytes.Length -eq 4 -and ($bytes[0] -eq 10 -or ($bytes[0] -eq 172 -and $bytes[1] -ge 16 -and $bytes[1] -le 31) -or ($bytes[0] -eq 192 -and $bytes[1] -eq 168))
if (-not $isPrivate) { throw 'Use um endereço IPv4 da rede privada do computador.' }
if ($HttpsPort -lt 1024 -or $HttpsPort -gt 65535) { throw 'Porta HTTPS inválida.' }
$localCaddy=Join-Path $PSScriptRoot '..\.tooling\caddy\caddy.exe'
$caddy=if(Test-Path -LiteralPath $localCaddy){[System.IO.Path]::GetFullPath($localCaddy)}else{(Get-Command caddy -ErrorAction SilentlyContinue).Source}
if (-not $caddy) { throw 'Caddy não encontrado. Execute npm run lan:install e siga docs/onboarding.md.' }
$env:CENTRAL_LAN_ORIGIN="https://${PrivateIp}:$HttpsPort"
$runtimeDir=Join-Path $env:LOCALAPPDATA 'Central\runtime'
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$configPath=Join-Path $runtimeDir 'Caddyfile'
$storagePath=(Join-Path $runtimeDir 'caddy-data').Replace('\','/')
$content=@"
{
  auto_https disable_redirects
  admin off
  skip_install_trust
  persist_config off
  storage file_system "$storagePath"
}
${PrivateIp}:$HttpsPort {
  bind $PrivateIp
  tls internal
  reverse_proxy 127.0.0.1:3000
}
"@
[System.IO.File]::WriteAllText($configPath,$content,[System.Text.UTF8Encoding]::new($false))
& $caddy validate --config $configPath --adapter caddyfile
if ($LASTEXITCODE -ne 0) { throw 'A configuração HTTPS local é inválida.' }
if ($ValidateOnly) { return }
$proxy=Start-Process -FilePath $caddy -ArgumentList @('run','--config',('"'+$configPath+'"'),'--adapter','caddyfile') -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'caddy-output.log') -RedirectStandardError (Join-Path $runtimeDir 'caddy-error.log')
try {
  Start-Sleep -Milliseconds 600
  if ($proxy.HasExited) { throw 'O proxy não iniciou. Confira os logs locais em Central/runtime.' }
  if ($Demo) { node scripts/start-local.mjs start --demo } else { node scripts/start-local.mjs start }
} finally { if (-not $proxy.HasExited) { Stop-Process -Id $proxy.Id } }
