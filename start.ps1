Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting UPI Mule Account Stream Detector Pipeline" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify Docker Engine status
Write-Host "`n[1/5] Verifying Docker Desktop Daemon connection..." -ForegroundColor Yellow
$dockerCheck = docker version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Docker engine is not responding. Attempting to start Docker Desktop..." -ForegroundColor Cyan
    $dockerExePaths = @(
        "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe",
        "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    )
    $started = $false
    foreach ($path in $dockerExePaths) {
        if (Test-Path $path) {
            Start-Process $path
            $started = $true
            Write-Host "  Launched: $path" -ForegroundColor Gray
            break
        }
    }

    $waitSec = 0
    $maxWait = 60
    while ($waitSec -lt $maxWait) {
        Start-Sleep -Seconds 3
        $waitSec += 3
        $dockerCheck = docker version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Docker Desktop daemon connected successfully!" -ForegroundColor Green
            break
        }
        Write-Host "  Waiting for Docker daemon to become ready ($waitSec s)..." -ForegroundColor Gray
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Docker Desktop is still not running or unreachable!" -ForegroundColor Red
        Write-Host "Please start Docker Desktop manually from the Windows Start menu and ensure 'Engine running' is green, then re-run .\start.ps1." -ForegroundColor Yellow
        exit 1
    }
}
Write-Host "  Docker engine is active and ready." -ForegroundColor Green

# 2. Compile Flink Fat JAR if missing
$jarPath = Join-Path $PSScriptRoot "flink-job\target\flink-job-1.0.0.jar"
if (-not (Test-Path $jarPath)) {
    Write-Host "`n[2/5] Compiling Flink streaming job JAR via Maven container..." -ForegroundColor Yellow
    docker run --rm -v "${PSScriptRoot}/flink-job:/app" -w /app maven:3.8.8-eclipse-temurin-11 mvn clean package -DskipTests
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Maven build failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n[2/5] Found compiled Flink JAR at $jarPath" -ForegroundColor Green
}

# 3. Clean and build Docker Compose services
Write-Host "`n[3/5] Cleaning old containers and launching core services (Frontend 5173 only)..." -ForegroundColor Yellow
docker compose down --remove-orphans
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] docker compose up failed." -ForegroundColor Red
    exit 1
}

# 4. Wait for infrastructure readiness
Write-Host "`n[4/5] Waiting for Kafka, ClickHouse, and Flink JobManager/TaskManager to be ready..." -ForegroundColor Yellow
$timeout = 60
$elapsed = 0

# Wait for ClickHouse (checked internally inside the container)
while ($elapsed -lt $timeout) {
    Start-Sleep -Seconds 2
    $elapsed += 2
    $ping = docker exec clickhouse wget -qO- http://localhost:8123/ping 2>$null
    if (-not $ping) {
        $ping = docker exec clickhouse clickhouse-client --query "SELECT 1" 2>$null
    }
    if ($ping -match "Ok" -or $ping -match "1") {
        Write-Host "  ClickHouse is healthy (after $elapsed s)." -ForegroundColor Green
        break
    }
}

# Wait for Flink TaskManager slots (checked internally inside the container)
while ($elapsed -lt $timeout) {
    Start-Sleep -Seconds 2
    $elapsed += 2
    $overview = docker exec jobmanager curl -s http://localhost:8081/overview 2>$null
    if ($overview -match '"slots-total":([1-9][0-9]*)' -or (docker exec jobmanager flink list 2>&1) -match "No running jobs") {
        Write-Host "  Flink JobManager & TaskManager registered slots (after $elapsed s)." -ForegroundColor Green
        break
    }
}

# 5. Submit Flink Job to cluster
Write-Host "`n[5/5] Submitting Flink Job to JobManager..." -ForegroundColor Yellow
docker cp $jarPath jobmanager:/opt/flink/flink-job.jar
docker exec -d jobmanager flink run -c com.mule.detector.MuleDetectorJob /opt/flink/flink-job.jar --kafka-brokers kafka:9092 --clickhouse-url jdbc:clickhouse://clickhouse:8123/default

Start-Sleep -Seconds 3
$jobList = docker exec jobmanager flink list
Write-Host $jobList -ForegroundColor Cyan

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  ALL SYSTEMS GO! UPI MULE DETECTOR STREAM IS LIVE!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Frontend Dashboard : http://localhost:5173 (Sole Exposed Port)" -ForegroundColor White
Write-Host "  Internal Services  : alert-api, kafka, clickhouse, flink (All host ports closed)" -ForegroundColor Gray
Write-Host "==========================================================`n" -ForegroundColor Green
