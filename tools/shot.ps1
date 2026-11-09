# 開発用：Edgeヘッドレスでスクリーンショットを撮る
# 使い方: pwsh tools/shot.ps1 "index.html#/home" home 1180 820
param([string]$Path, [string]$Out, [int]$W = 1180, [int]$H = 820)
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$dir = Join-Path $env:TEMP "md"
New-Item -ItemType Directory -Force $dir | Out-Null
$png = Join-Path $dir "$Out.png"
$log = Join-Path $dir "$Out.log"
if (Test-Path $png) { Remove-Item $png }
$args = @('--headless', '--disable-gpu', '--no-first-run', "--user-data-dir=$dir\prof", "--disk-cache-dir=$dir\cache\$(Get-Random)",'--enable-logging=stderr', '--v=0', "--screenshot=$png", "--window-size=$W,$H", '--virtual-time-budget=6000', "http://localhost:8765/$Path")
Start-Process -FilePath $edge -ArgumentList $args -Wait -NoNewWindow -RedirectStandardError $log
for ($i = 0; $i -lt 20 -and (Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*md\prof*' }); $i++) { Start-Sleep -Milliseconds 300 }
Select-String -Path $log -Pattern "CONSOLE|Uncaught" | ForEach-Object { $_.Line } | Select-Object -First 15
if (Test-Path $png) { "OK $png" } else { "NO PNG" }
