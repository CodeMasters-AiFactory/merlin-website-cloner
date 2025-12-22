# Merlin Website Cloner - Initialization Script
# Run this at the start of each agent session
# Usage: .\init.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MERLIN WEBSITE CLONER - INIT SCRIPT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  ✗ Node.js not found!" -ForegroundColor Red
    exit 1
}

# Check npm
Write-Host "[2/5] Checking npm..." -ForegroundColor Yellow
$npmVersion = npm --version 2>$null
if ($npmVersion) {
    Write-Host "  ✓ npm: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "  ✗ npm not found!" -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
Write-Host "[3/5] Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
}

# Check .env file
Write-Host "[4/5] Checking environment..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "  ✓ .env file exists" -ForegroundColor Green
} else {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "  ✓ Created .env from .env.example" -ForegroundColor Yellow
    } else {
        Write-Host "  ✗ No .env file!" -ForegroundColor Red
    }
}

# Show project status
Write-Host "[5/5] Loading project status..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PROJECT STATUS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Read feature status
if (Test-Path "feature_list.json") {
    $features = Get-Content "feature_list.json" | ConvertFrom-Json
    $total = $features.features.Count
    $completed = ($features.features | Where-Object { $_.passes -eq $true }).Count
    $remaining = $total - $completed
    
    Write-Host "  Total Features: $total" -ForegroundColor White
    Write-Host "  Completed: $completed" -ForegroundColor Green
    Write-Host "  Remaining: $remaining" -ForegroundColor Yellow
} else {
    Write-Host "  ✗ feature_list.json not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RECENT GIT ACTIVITY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
git log --oneline -5 2>$null

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  READY TO START" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the development server:" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor Green
Write-Host ""
Write-Host "Linear Project:" -ForegroundColor White
Write-Host "  https://linear.app/code-masters/project/merlin-website-cloner-0102a6dc2777" -ForegroundColor Blue
Write-Host ""
