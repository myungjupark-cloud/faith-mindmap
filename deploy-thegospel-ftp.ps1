# faith-mindmap -> thegospel.kr/faith-mindmap FTP 배포
$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CfgPath = 'C:\Projects\bible-qna\_RAG빌드\구축스크립트\deploy.config.json'
$LocalDir = (Resolve-Path (Join-Path $ScriptDir '..\thegospel-kr\faith-mindmap')).Path
$RemoteDir = '/www/faith-mindmap'

function Upload-FtpFile($localPath, $remotePath, $cfg) {
    $uri = "ftp://$($cfg.host):$($cfg.port)$remotePath"
    $req = [System.Net.FtpWebRequest]::Create($uri)
    $req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $req.Credentials = New-Object System.Net.NetworkCredential($cfg.username, $cfg.password)
    $req.UseBinary = $true
    $req.UsePassive = [bool]$cfg.usePassive
    $req.KeepAlive = $false
    $bytes = [System.IO.File]::ReadAllBytes($localPath)
    $req.ContentLength = $bytes.Length
    $stream = $req.GetRequestStream()
    try { $stream.Write($bytes, 0, $bytes.Length) } finally { $stream.Close() }
    $resp = $req.GetResponse()
    $resp.Close()
}

function Ensure-FtpDir($remotePath, $cfg) {
    $uri = "ftp://$($cfg.host):$($cfg.port)$remotePath"
    $req = [System.Net.FtpWebRequest]::Create($uri)
    $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
    $req.Credentials = New-Object System.Net.NetworkCredential($cfg.username, $cfg.password)
    $req.UsePassive = [bool]$cfg.usePassive
    try {
        $resp = $req.GetResponse()
        $resp.Close()
    } catch {
        # already exists
    }
}

if (-not (Test-Path -LiteralPath $CfgPath)) { throw "FTP config not found: $CfgPath" }
if (-not (Test-Path -LiteralPath $LocalDir)) { throw "Local deploy dir not found: $LocalDir" }

$cfg = Get-Content -LiteralPath $CfgPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $cfg.port) { $cfg | Add-Member -NotePropertyName port -NotePropertyValue 21 -Force }
if ($null -eq $cfg.usePassive) { $cfg | Add-Member -NotePropertyName usePassive -NotePropertyValue $true -Force }

Write-Host "=== faith-mindmap FTP deploy ===" -ForegroundColor Cyan
Write-Host "Local: $LocalDir"
Write-Host "Remote: ftp://$($cfg.host)$RemoteDir/"

Ensure-FtpDir $RemoteDir $cfg
Ensure-FtpDir "$RemoteDir/data" $cfg

$files = @(
    '.htaccess', 'index.html', 'app.js', 'app.css', 'sw.js',
    'manifest.json', 'icon.svg', 'markdown.js', 'data\mindmap.json'
)

foreach ($rel in $files) {
    $local = Join-Path $LocalDir $rel
    if (-not (Test-Path -LiteralPath $local)) { throw "Missing: $local" }
    $remoteName = $rel -replace '\\', '/'
    $remote = "$RemoteDir/$remoteName"
    Write-Host "Upload: $remoteName"
    Upload-FtpFile $local $remote $cfg
    Write-Host "[OK] $remoteName" -ForegroundColor Green
}

$verify = 'https://thegospel.kr/faith-mindmap/'
Write-Host "Verify: $verify"
try {
    $r = Invoke-WebRequest -Uri $verify -UseBasicParsing -TimeoutSec 30
    if ($r.StatusCode -eq 200) {
        Write-Host "[OK] HTTP $($r.StatusCode)" -ForegroundColor Green
    } else {
        Write-Host "[WARN] HTTP $($r.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARN] HTTP check failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "=== Done ===" -ForegroundColor Cyan
