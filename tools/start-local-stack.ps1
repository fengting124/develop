[CmdletBinding()]
param(
    [switch]$CheckOnly,
    [switch]$SkipFrontend,
    [switch]$SkipBackend,
    [switch]$SkipModelService
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$LogDir = Join-Path $RepoRoot ".dev\logs"

function Get-ToolPath {
    param([Parameter(Mandatory = $true)][string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -eq $command) {
        return $null
    }

    return $command.Source
}

function Test-PortListening {
    param([Parameter(Mandatory = $true)][int]$Port)

    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1

    return $null -ne $connection
}

function Assert-Command {
    param([Parameter(Mandatory = $true)][string]$Name)

    if ($null -eq (Get-ToolPath $Name)) {
        Stop-WithMessage "Required command '$Name' is not available on PATH."
    }
}

function Stop-WithMessage {
    param([Parameter(Mandatory = $true)][string]$Message)

    Write-Host ""
    Write-Host "[BLOCKED] $Message"
    exit 1
}

function Start-StackProcess {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string]$LogFile
    )

    $fullLogPath = Join-Path $LogDir $LogFile
    $errorLogPath = Join-Path $LogDir ($LogFile -replace '\.log$', '.err.log')
    $arguments = @(
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "Set-Location -LiteralPath '$WorkingDirectory'; $Command"
    )

    $process = Start-Process `
        -FilePath "powershell" `
        -ArgumentList $arguments `
        -WindowStyle Hidden `
        -RedirectStandardOutput $fullLogPath `
        -RedirectStandardError $errorLogPath `
        -PassThru

    Write-Host "Started $Name, pid=$($process.Id), stdout=$fullLogPath, stderr=$errorLogPath"
}

Push-Location $RepoRoot
try {
    $checkScript = Join-Path $PSScriptRoot "check-local-env.ps1"
    if ($CheckOnly) {
        & $checkScript
        return
    }

    & $checkScript -Strict
    if ($LASTEXITCODE -ne 0) {
        Stop-WithMessage "Local environment preflight failed. Run tools\check-local-env.ps1 and resolve the required blocker(s) before starting the stack."
    }

    $dockerPath = Get-ToolPath "docker"
    if ($null -ne $dockerPath) {
        Write-Host "Docker is available. Starting the full stack with Docker Compose..."
        & docker compose -f (Join-Path $RepoRoot "infra\docker-compose.yml") up --build
        return
    }

    if (-not (Test-PortListening -Port 5432)) {
        Stop-WithMessage "PostgreSQL is not listening on localhost:5432. Install Docker Desktop and use Docker Compose, or start a native PostgreSQL service with database aigc_forensics/user aigc/password aigc."
    }

    if (-not (Test-PortListening -Port 6379)) {
        Stop-WithMessage "Redis is not listening on localhost:6379. Install Docker Desktop and use Docker Compose, or start a native Redis service."
    }

    New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

    if (-not $SkipModelService) {
        if (Test-PortListening -Port 5010) {
            Write-Host "Model service port 5010 is already listening; skipping model service start."
        } else {
            $venvPython = Join-Path $RepoRoot ".venv-model-service\Scripts\python.exe"
            if (-not (Test-Path $venvPython)) {
                Stop-WithMessage "Model service virtual environment is missing at $venvPython."
            }

            $modelDir = Join-Path $RepoRoot "model-services\nonescape-mini"
            Start-StackProcess `
                -Name "nonescape-mini model service" `
                -WorkingDirectory $modelDir `
                -Command "& '$venvPython' -m uvicorn app.main:app --host 127.0.0.1 --port 5010" `
                -LogFile "model-service.log"
        }
    }

    if (-not $SkipBackend) {
        if (Test-PortListening -Port 8080) {
            Write-Host "Backend port 8080 is already listening; skipping backend start."
        } else {
            Assert-Command -Name "mvn"
            $backendDir = Join-Path $RepoRoot "backend-java"
            Start-StackProcess `
                -Name "Spring Boot backend" `
                -WorkingDirectory $backendDir `
                -Command "`$env:APP_MODEL_REGISTRY_NONESCAPE_MINI_ENDPOINT_URL='http://localhost:5010'; mvn spring-boot:run" `
                -LogFile "backend.log"
        }
    }

    if (-not $SkipFrontend) {
        if (Test-PortListening -Port 5173) {
            Write-Host "Frontend port 5173 is already listening; skipping frontend start."
        } else {
            Assert-Command -Name "npm"
            Start-StackProcess `
                -Name "Vite frontend" `
                -WorkingDirectory $RepoRoot `
                -Command "npm run dev -- --host 127.0.0.1" `
                -LogFile "frontend.log"
        }
    }

    Write-Host ""
    Write-Host "Local stack startup requested."
    Write-Host "Frontend:      http://127.0.0.1:5173/"
    Write-Host "Backend API:   http://127.0.0.1:8080/swagger-ui/index.html"
    Write-Host "Model health:  http://127.0.0.1:5010/health"
    Write-Host "Logs:          $LogDir"
} finally {
    Pop-Location
}
