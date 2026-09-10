# ==========================================================
#  make-gz.ps1
#  บีบอัดไฟล์ CSV ขนาดใหญ่ให้เป็น .gz ก่อนอัปขึ้น GitHub
#  วิธีใช้: คลิกขวาที่ไฟล์นี้ -> Run with PowerShell
#          (หรือเปิด PowerShell แล้วพิมพ์  .\make-gz.ps1 )
# ==========================================================

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

# ไฟล์ที่จะบีบอัด (ไฟล์เล็กไม่ต้องบีบ ปล่อยไว้แบบเดิมได้)
$targets = @('main.csv', 'skill.csv')

$GITHUB_LIMIT = 100MB
$WEB_UPLOAD_LIMIT = 25MB

Write-Host ''
Write-Host '=====================================================' -ForegroundColor Cyan
Write-Host '  บีบอัดไฟล์ CSV สำหรับอัปขึ้น GitHub Pages' -ForegroundColor Cyan
Write-Host '=====================================================' -ForegroundColor Cyan
Write-Host ''

foreach ($name in $targets) {

    if (-not (Test-Path -LiteralPath $name)) {
        Write-Host ("ข้าม {0} — ไม่พบไฟล์ในโฟลเดอร์นี้" -f $name) -ForegroundColor DarkGray
        continue
    }

    $src = (Get-Item -LiteralPath $name).FullName
    $dst = "$src.gz"
    $rawBytes = (Get-Item -LiteralPath $src).Length

    Write-Host ("กำลังบีบอัด {0} ({1:N1} MB) ..." -f $name, ($rawBytes / 1MB)) -ForegroundColor Yellow

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $in = $null; $out = $null; $gz = $null
    try {
        $in  = [System.IO.File]::OpenRead($src)
        $out = [System.IO.File]::Create($dst)
        $gz  = New-Object System.IO.Compression.GZipStream(
                    $out, [System.IO.Compression.CompressionLevel]::Optimal)
        $in.CopyTo($gz, 4194304)
    }
    finally {
        if ($gz)  { $gz.Dispose() }
        if ($out) { $out.Dispose() }
        if ($in)  { $in.Dispose() }
    }
    $sw.Stop()

    $gzBytes = (Get-Item -LiteralPath $dst).Length
    $ratio   = if ($gzBytes -gt 0) { $rawBytes / $gzBytes } else { 0 }

    Write-Host ''
    Write-Host ("  เสร็จใน {0:N0} วินาที" -f $sw.Elapsed.TotalSeconds) -ForegroundColor Green
    Write-Host ("  ก่อนบีบอัด : {0,10:N1} MB" -f ($rawBytes / 1MB))
    Write-Host ("  หลังบีบอัด : {0,10:N1} MB   (เล็กลง {1:N1} เท่า)" -f ($gzBytes / 1MB), $ratio) -ForegroundColor Green

    if ($gzBytes -ge $GITHUB_LIMIT) {
        Write-Host '  [!] ยังเกิน 100 MB — GitHub จะไม่ยอมรับ ต้องแบ่งไฟล์เพิ่ม' -ForegroundColor Red
    }
    elseif ($gzBytes -ge $WEB_UPLOAD_LIMIT) {
        Write-Host '  [i] เกิน 25 MB — อัปผ่านหน้าเว็บ GitHub ไม่ได้' -ForegroundColor Yellow
        Write-Host '      ให้ใช้ GitHub Desktop หรือ git command line แทน' -ForegroundColor Yellow
    }
    else {
        Write-Host '  [+] ต่ำกว่า 25 MB — ลากวางอัปผ่านหน้าเว็บ GitHub ได้เลย' -ForegroundColor Green
    }

    if ($name -eq 'main.csv') {
        Write-Host ''
        Write-Host '  -------------------------------------------------' -ForegroundColor Magenta
        Write-Host '   เปิด index.html หา  const MAIN_RAW_BYTES = 0;' -ForegroundColor Magenta
        Write-Host ('   แล้วแก้เลข 0 เป็น  {0}' -f $rawBytes) -ForegroundColor Magenta
        Write-Host '   (เพื่อให้แถบความคืบหน้าแสดง % ได้ตรง)' -ForegroundColor Magenta
        Write-Host '  -------------------------------------------------' -ForegroundColor Magenta
    }
    Write-Host ''
}

Write-Host '====================================================='  -ForegroundColor Cyan
Write-Host ' เสร็จแล้ว — ไฟล์ที่ต้องอัปขึ้น GitHub:' -ForegroundColor Cyan
Write-Host '   index.html'
Write-Host '   main.csv.gz          (แทน main.csv)'
Write-Host '   skill.csv.gz         (แทน skill.csv)'
Write-Host '   occupation.csv'
Write-Host '   field_of_study.csv'
Write-Host '   .gitattributes'
Write-Host ''
Write-Host ' *** อย่าอัป main.csv และ skill.csv ตัวเดิมขึ้นไป ***' -ForegroundColor Yellow
Write-Host '====================================================='  -ForegroundColor Cyan
Write-Host ''
Read-Host 'กด Enter เพื่อปิดหน้าต่าง'
