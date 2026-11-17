Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting UPI Mule Account Stream Detector Pipeline" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify Docker Engine status
Write-Host "`n[1/5] Verifying Docker Desktop Daemon connection..." -ForegroundColor Yellow
$dockerCheck = docker version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker Desktop is not running or unreachable!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and ensure the engine is running before executing this script." -ForegroundColor Yellow
    exit 1
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
Write-Host "`n[3/5] Cleaning old containers and launching 7 core services..." -ForegroundColor Yellow
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

# Wait for ClickHouse
while ($elapsed -lt $timeout) {
    Start-Sleep -Seconds 2
    $elapsed += 2
    $ping = curl.exe -s http://localhost:8123/ping
    if ($ping -match "Ok") {
        Write-Host "  ClickHouse is healthy (after $elapsed s)." -ForegroundColor Green
        break
    }
}

# Wait for Flink TaskManager slots
while ($elapsed -lt $timeout) {
    Start-Sleep -Seconds 2
    $elapsed += 2
    $overview = curl.exe -s http://localhost:8081/overview
    if ($overview -match '"slots-total":([1-9][0-9]*)') {
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
Write-Host "  Frontend Dashboard : http://localhost:5173" -ForegroundColor White
Write-Host "  FastAPI Alert API  : http://localhost:8000/alerts" -ForegroundColor White
Write-Host "  Flink Dashboard    : http://localhost:8081" -ForegroundColor White
Write-Host "  ClickHouse HTTP    : http://localhost:8123" -ForegroundColor White
Write-Host "==========================================================`n" -ForegroundColor Green
