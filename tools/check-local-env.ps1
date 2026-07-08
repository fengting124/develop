[CmdletBinding()]
param(
    [switch]$Strict
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Results = New-Object System.Collections.Generic.List[object]

function Add-CheckResult {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][ValidateSet("OK", "WARN", "MISSING", "BLOCKED")][string]$Status,
        [Parameter(Mandatory = $true)][string]$Details,
        [bool]$Required = $false
    )

    $Results.Add([pscustomobject]@{
        Name = $Name
        Status = $Status
        Details = $Details
        Required = $Required
    }) | Out-Null
}

function Get-ToolPath {
    param([Parameter(Mandatory = $true)][string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -eq $command) {
        return $null
    }

    return $command.Source
}

function Get-FirstOutputLine {
    param([Parameter(Mandatory = $true)][scriptblock]$Command)

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $line = & $Command 2>&1 |
            ForEach-Object {
                if ($_ -is [System.Management.Automation.ErrorRecord]) {
                    $_.Exception.Message
                } else {
                    $_.ToString()
                }
            } |
            Select-Object -First 1
        if ($null -eq $line) {
            return ""
        }

        return $line.ToString()
    } catch {
        return "failed: $($_.Exception.Message)"
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
}

function Test-PortListening {
    param([Parameter(Mandatory = $true)][int]$Port)

    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if ($null -eq $connection) {
        return $null
    }

    return $connection.OwningProcess
}

function Add-RequiredToolCheck {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [string]$VersionCommand = ""
    )

    $path = Get-ToolPath $Name
    if ($null -eq $path) {
        Add-CheckResult -Name $Name -Status "MISSING" -Details "Required command is not on PATH." -Required $true
        return
    }

    if ([string]::IsNullOrWhiteSpace($VersionCommand)) {
        Add-CheckResult -Name $Name -Status "OK" -Details $path -Required $true
        return
    }

    $version = Get-FirstOutputLine ([scriptblock]::Create($VersionCommand))
    Add-CheckResult -Name $Name -Status "OK" -Details "$path ($version)" -Required $true
}

Push-Location $RepoRoot
try {
    Add-RequiredToolCheck -Name "git" -VersionCommand "git --version"
    Add-RequiredToolCheck -Name "gh" -VersionCommand "gh --version"
    Add-RequiredToolCheck -Name "node" -VersionCommand "node -v"
    Add-RequiredToolCheck -Name "npm" -VersionCommand "npm -v"
    Add-RequiredToolCheck -Name "java" -VersionCommand "java -version"
    Add-RequiredToolCheck -Name "javac" -VersionCommand "javac -version"
    Add-RequiredToolCheck -Name "mvn" -VersionCommand "mvn -version"

    $javaVersionLine = Get-FirstOutputLine { java -version }
    if ($javaVersionLine -match 'version "(\d+)') {
        $major = [int]$Matches[1]
        if ($major -eq 21) {
            Add-CheckResult -Name "jdk-target" -Status "OK" -Details "Project target is Java 21 and current runtime is Java $major." -Required $false
        } else {
            Add-CheckResult -Name "jdk-target" -Status "WARN" -Details "Project target is Java 21, current runtime is Java $major. Prefer JDK 21 LTS for reproducible backend builds." -Required $false
        }
    }

    $venvPython = Join-Path $RepoRoot ".venv-model-service\Scripts\python.exe"
    if (Test-Path $venvPython) {
        $pythonVersion = Get-FirstOutputLine { & $venvPython --version }
        Add-CheckResult -Name "model-service-venv" -Status "OK" -Details "$venvPython ($pythonVersion)" -Required $true
    } else {
        Add-CheckResult -Name "model-service-venv" -Status "MISSING" -Details "Expected .venv-model-service. Run: python -m venv .venv-model-service; .\.venv-model-service\Scripts\python -m pip install -r model-services\nonescape-mini\requirements.txt" -Required $true
    }

    foreach ($path in @(
        "package.json",
        "backend-java\pom.xml",
        "backend-java\src\main\resources\application.yml",
        "model-services\nonescape-mini\requirements.txt",
        "infra\docker-compose.yml"
    )) {
        if (Test-Path (Join-Path $RepoRoot $path)) {
            Add-CheckResult -Name $path -Status "OK" -Details "Found." -Required $true
        } else {
            Add-CheckResult -Name $path -Status "MISSING" -Details "Required project file is missing." -Required $true
        }
    }

    $dockerPath = Get-ToolPath "docker"
    $composePath = Get-ToolPath "docker-compose"
    if ($null -ne $dockerPath) {
        $dockerVersion = Get-FirstOutputLine { docker --version }
        $composeVersion = Get-FirstOutputLine { docker compose version }
        Add-CheckResult -Name "docker" -Status "OK" -Details "$dockerPath ($dockerVersion; $composeVersion)" -Required $false
    } elseif ($null -ne $composePath) {
        $composeVersion = Get-FirstOutputLine { docker-compose --version }
        Add-CheckResult -Name "docker-compose" -Status "OK" -Details "$composePath ($composeVersion)" -Required $false
    } else {
        Add-CheckResult -Name "docker" -Status "WARN" -Details "Docker is not installed. Recommended for PostgreSQL, Redis, backend, and model service orchestration." -Required $false
    }

    $psqlPath = Get-ToolPath "psql"
    if ($null -eq $psqlPath) {
        Add-CheckResult -Name "psql" -Status "WARN" -Details "PostgreSQL CLI is not on PATH. This is acceptable when using Docker Compose." -Required $false
    } else {
        Add-CheckResult -Name "psql" -Status "OK" -Details $psqlPath -Required $false
    }

    $redisCliPath = Get-ToolPath "redis-cli"
    if ($null -eq $redisCliPath) {
        Add-CheckResult -Name "redis-cli" -Status "WARN" -Details "Redis CLI is not on PATH. This is acceptable when using Docker Compose." -Required $false
    } else {
        Add-CheckResult -Name "redis-cli" -Status "OK" -Details $redisCliPath -Required $false
    }

    $portStates = @{}
    foreach ($port in @(5432, 6379, 8080, 5010, 5173)) {
        $listeningPid = Test-PortListening -Port $port
        $portStates[$port] = $listeningPid
        if ($null -eq $listeningPid) {
            Add-CheckResult -Name "port-$port" -Status "OK" -Details "Free." -Required $false
        } else {
            Add-CheckResult -Name "port-$port" -Status "WARN" -Details "Already listening, pid=$listeningPid. This may be expected if the local stack is running." -Required $false
        }
    }

    $hasDockerComposePath = ($null -ne $dockerPath) -or ($null -ne $composePath)
    $hasNativeInfrastructure = ($null -ne $portStates[5432]) -and ($null -ne $portStates[6379])
    if ($hasDockerComposePath) {
        Add-CheckResult -Name "full-stack-runtime" -Status "OK" -Details "Docker Compose can be used to start PostgreSQL, Redis, backend, and model service." -Required $false
    } elseif ($hasNativeInfrastructure) {
        Add-CheckResult -Name "full-stack-runtime" -Status "OK" -Details "Native PostgreSQL and Redis ports are already listening." -Required $false
    } else {
        Add-CheckResult -Name "full-stack-runtime" -Status "BLOCKED" -Details "No Docker Compose path and no listening PostgreSQL/Redis services were found. Install Docker Desktop with WSL2, or start native PostgreSQL and Redis services." -Required $true
    }

    Write-Host "Local environment check for $RepoRoot"
    Write-Host ""
    foreach ($result in $Results) {
        "{0,-8} {1,-34} {2}" -f "[$($result.Status)]", $result.Name, $result.Details
    }

    $requiredFailures = @($Results | Where-Object { $_.Required -and $_.Status -in @("MISSING", "BLOCKED") })
    $warnings = @($Results | Where-Object { $_.Status -eq "WARN" })

    Write-Host ""
    Write-Host "Summary: $($requiredFailures.Count) required blocker(s), $($warnings.Count) warning(s)."

    if ($Strict -and $requiredFailures.Count -gt 0) {
        exit 1
    }
} finally {
    Pop-Location
}
