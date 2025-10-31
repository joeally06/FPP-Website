# ========================================
# FPP Control Center - Rollback Script (Windows)
# ========================================

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupDir
)

$ErrorActionPreference = "Stop"

if (-not $BackupDir) {
    Write-Host "❌ Error: Backup directory path required" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage: .\rollback.ps1 -BackupDir <backup_directory>" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Example: .\rollback.ps1 -BackupDir backups\20250128_143022" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Available backups:" -ForegroundColor Cyan
    if (Test-Path "backups") {
        Get-ChildItem "backups" -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 5 | ForEach-Object { Write-Host "  $($_.Name)" -ForegroundColor Gray }
    } else {
        Write-Host "  No backups found" -ForegroundColor Gray
    }
    exit 1
}

if (-not (Test-Path $BackupDir)) {
    Write-Host "❌ Error: Backup directory not found: $BackupDir" -ForegroundColor Red
    exit 1
}

Write-Host "🔄 FPP Control Center Rollback" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  WARNING: This will restore your system to a previous state." -ForegroundColor Yellow
Write-Host "   Current database and configuration will be replaced." -ForegroundColor Yellow
Write-Host ""
Write-Host "📂 Backup directory: $BackupDir" -ForegroundColor White
Write-Host ""

$dbBackup = Join-Path $BackupDir "votes.db"
$envBackup = Join-Path $BackupDir ".env.local"

if (Test-Path $dbBackup) {
    Write-Host "✅ Database backup found" -ForegroundColor Green
} else {
    Write-Host "❌ Database backup not found in $BackupDir" -ForegroundColor Red
    exit 1
}

if (Test-Path $envBackup) {
    Write-Host "✅ Configuration backup found" -ForegroundColor Green
} else {
    Write-Host "⚠️  Configuration backup not found (will skip .env.local restore)" -ForegroundColor Yellow
}

Write-Host ""
$confirmation = Read-Host "Continue with rollback? (y/N)"

if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Rollback cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🔄 Restoring from backup..." -ForegroundColor Cyan

try {
    # Restore database
    if (Test-Path $dbBackup) {
        Copy-Item $dbBackup -Destination "votes.db" -Force
        Write-Host "✅ Database restored" -ForegroundColor Green
    }

    # Restore WAL and SHM files if they exist
    $walBackup = Join-Path $BackupDir "votes.db-wal"
    if (Test-Path $walBackup) {
        Copy-Item $walBackup -Destination "votes.db-wal" -Force
        Write-Host "✅ Database WAL file restored" -ForegroundColor Green
    }

    $shmBackup = Join-Path $BackupDir "votes.db-shm"
    if (Test-Path $shmBackup) {
        Copy-Item $shmBackup -Destination "votes.db-shm" -Force
        Write-Host "✅ Database SHM file restored" -ForegroundColor Green
    }

    # Restore configuration
    if (Test-Path $envBackup) {
        Copy-Item $envBackup -Destination ".env.local" -Force
        Write-Host "✅ Configuration restored" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "✅ Rollback completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Review your configuration: .env.local" -ForegroundColor White
    Write-Host "   2. Restart the server: npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Tip: If issues persist, you can try another backup:" -ForegroundColor Yellow
    Write-Host "   Available backups in backups\ directory" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host "❌ Rollback failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
