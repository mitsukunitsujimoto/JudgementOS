# 日立向け事前共有 PDF を生成（URL・日付・ページ番号のフッターなし）
# Usage: powershell -File scripts/generate-hitachi-pdf.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$html = Join-Path $root "output\hitachi-kokubunji-pre-distribute-2026-06-11.html"
$pdf  = Join-Path $root "output\hitachi-kokubunji-pre-distribute-2026-06-11.pdf"
$send = Join-Path $root "output\6月11日_ディスカッション事前共有.pdf"
$sendAscii = Join-Path $root "output\2026-06-11_事前共有.pdf"

if (-not (Test-Path $html)) {
  Write-Error "HTML not found: $html"
}

$chrome = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) {
  $edge = "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
}

$browser = $null
if (Test-Path $chrome) { $browser = $chrome }
elseif (Test-Path $edge) { $browser = $edge }
else {
  Write-Error "Chrome or Edge not found. Install Chrome, or print manually with Headers and footers OFF."
}

$resolved = (Resolve-Path $html).Path
$fileUrl = [System.Uri]::new($resolved).AbsoluteUri
if ($pdf -and (Test-Path $pdf)) { Remove-Item $pdf -Force }

$args = @(
  "--headless=new",
  "--disable-gpu",
  "--no-pdf-header-footer",
  "--print-to-pdf-no-header",
  "--print-to-pdf=$pdf",
  $fileUrl
)

Write-Host "Generating PDF (no header/footer)..."
$proc = Start-Process -FilePath $browser -ArgumentList $args -Wait -PassThru -RedirectStandardError "$env:TEMP\chrome-pdf-err.txt" -NoNewWindow

if (-not (Test-Path $pdf)) {
  Get-Content "$env:TEMP\chrome-pdf-err.txt" -ErrorAction SilentlyContinue | Write-Host
  Write-Error "PDF generation failed."
}

# 各ページ下部に 1/2, 2/2 ... を付与
$stampScript = Join-Path $root "scripts\stamp-page-numbers.mjs"
node $stampScript $pdf
if ($LASTEXITCODE -ne 0) { Write-Error "Page number stamp failed." }

# 送付用コピー（ファイル名は Node 側で固定 — PowerShell の文字化け回避）
$finalizeScript = Join-Path $root "scripts\finalize-hitachi-pdf.mjs"
node $finalizeScript
if ($LASTEXITCODE -ne 0) { Write-Error "Send copy failed." }

# 検証
$bytes = [System.IO.File]::ReadAllBytes($pdf)
$header = [System.Text.Encoding]::ASCII.GetString($bytes, 0, 4)
if ($header -ne "%PDF") { Write-Error "Generated file is not a valid PDF." }

Write-Host "Done: $pdf"
Write-Host "Send: $send"
Write-Host "Send (ASCII): output\2026-06-11_事前共有.pdf"
Start-Process $pdf
