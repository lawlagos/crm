$ErrorActionPreference='Stop'
if ($env:PROCESSOR_ARCHITECTURE -ne 'AMD64') { throw 'Este instalador foi validado para Windows x64.' }
$version='2.11.7'
$expectedHash='0a1edc0b799512051c57071ce0e798d3f2cf67dc98171366f1d2b326072e3b06'
$folder=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\.tooling\caddy'))
New-Item -ItemType Directory -Path $folder -Force | Out-Null
$archive=Join-Path $folder "caddy-$version.zip"
Invoke-WebRequest "https://github.com/caddyserver/caddy/releases/download/v$version/caddy_${version}_windows_amd64.zip" -OutFile $archive -UseBasicParsing -TimeoutSec 60
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expectedHash) { throw 'O download não corresponde ao SHA-256 da distribuição oficial.' }
Expand-Archive -LiteralPath $archive -DestinationPath $folder -Force
& (Join-Path $folder 'caddy.exe') version
Write-Output 'Caddy instalado apenas em .tooling/caddy. Nenhum serviço, certificado confiável ou regra de firewall foi instalado.'
