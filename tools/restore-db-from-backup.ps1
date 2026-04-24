param(
    [string] $BackupPath = "production-backup.sql"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot ".env"

if (-not (Test-Path -LiteralPath $envPath)) {
    throw "Missing .env file in project root."
}

$resolvedBackupPath = if ([System.IO.Path]::IsPathRooted($BackupPath)) {
    $BackupPath
} else {
    Join-Path $repoRoot $BackupPath
}

if (-not (Test-Path -LiteralPath $resolvedBackupPath)) {
    throw "Backup file not found: $resolvedBackupPath"
}

$envMap = @{}
Get-Content -LiteralPath $envPath | ForEach-Object {
    if ($_ -match '^[ \t]*#' -or $_ -match '^[ \t]*$') {
        return
    }

    $parts = $_ -split '=', 2
    if ($parts.Count -ne 2) {
        return
    }

    $key = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    $envMap[$key] = $value
}

$dbConnection = if ($envMap.ContainsKey("DB_CONNECTION")) {
    $envMap["DB_CONNECTION"]
} else {
    "mysql"
}

if ($dbConnection -ne "mysql") {
    throw "Unsupported DB_CONNECTION '$($envMap["DB_CONNECTION"])'. This script only supports mysql."
}

$databaseName = $envMap["DB_DATABASE"]
if ([string]::IsNullOrWhiteSpace($databaseName)) {
    throw "Missing DB_DATABASE in .env"
}

$mysqlCandidates = @()
if ($env:MYSQL_EXE) {
    $mysqlCandidates += $env:MYSQL_EXE
}
if ($env:MYSQL_BIN) {
    $mysqlCandidates += $env:MYSQL_BIN
}
$mysqlCandidates += @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe",
    "C:\xampp\mysql\bin\mysql.exe",
    "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe"
)

$mysqlExe = $mysqlCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if (-not $mysqlExe) {
    throw "mysql.exe not found. Set MYSQL_EXE to the full path if needed."
}

if ($envMap["DB_PASSWORD"]) {
    $env:MYSQL_PWD = $envMap["DB_PASSWORD"]
}

$mysqlArgs = @()
if ($envMap["DB_HOST"]) {
    $mysqlArgs += "--host=$($envMap["DB_HOST"])"
}
if ($envMap["DB_PORT"]) {
    $mysqlArgs += "--port=$($envMap["DB_PORT"])"
}
if ($envMap["DB_USERNAME"]) {
    $mysqlArgs += "--user=$($envMap["DB_USERNAME"])"
}

$sql = "DROP DATABASE IF EXISTS ``$databaseName``; CREATE DATABASE ``$databaseName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

Write-Host "Dropping and recreating database `"$databaseName`"..."
& $mysqlExe @mysqlArgs -e $sql
if ($LASTEXITCODE -ne 0) {
    throw "Failed to recreate database."
}

Write-Host "Importing backup from `"$resolvedBackupPath`"..."
Get-Content -LiteralPath $resolvedBackupPath -Raw | & $mysqlExe @mysqlArgs $databaseName
if ($LASTEXITCODE -ne 0) {
    throw "Failed to import backup."
}

Write-Host "Running migrations..."
Push-Location $repoRoot
try {
    php artisan migrate --force --no-interaction
    if ($LASTEXITCODE -ne 0) {
        throw "php artisan migrate failed."
    }
} finally {
    Pop-Location
}

Write-Host "Database restore completed."
