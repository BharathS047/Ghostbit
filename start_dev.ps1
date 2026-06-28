# Local dev startup script — runs backend and frontend concurrently

# Load backend env vars from .env.local
$envFile = Join-Path $PSScriptRoot "ghostbit\backend\.env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match '^\s*[^#]\S+=.*' } | ForEach-Object {
        $key, $value = $_ -split '=', 2
        $key = $key.Trim()
        $value = $value.Trim()
        if ($key) { [System.Environment]::SetEnvironmentVariable($key, $value, 'Process') }
    }
    Write-Host "[dev] Loaded env from $envFile" -ForegroundColor Cyan
}

# Start backend in background
$backendJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location $root
    & python -m uvicorn ghostbit.backend.main:app --host 0.0.0.0 --port 8000 --reload
} -ArgumentList $PSScriptRoot

Write-Host "[dev] Backend starting on http://localhost:8000" -ForegroundColor Green

# Brief pause so backend can bind before frontend starts
Start-Sleep -Seconds 2

# Start frontend
Write-Host "[dev] Frontend starting on http://localhost:3000" -ForegroundColor Green
$frontendDir = Join-Path $PSScriptRoot "ghostbit\frontend"
Push-Location $frontendDir
try {
    npm run dev
} finally {
    Pop-Location
    Stop-Job $backendJob
    Remove-Job $backendJob
}
