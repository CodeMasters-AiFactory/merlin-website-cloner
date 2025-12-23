# Merlin Website Cloner - Initialization Script
# Based on Anthropic's "Effective Harnesses for Long-Running Agents" Framework
# Run this at the start of EVERY agent session

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  MERLIN WEBSITE CLONER - INIT" -ForegroundColor Cyan
Write-Host "  Autonomous Agent Framework v1.0" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
Write-Host "[1/8] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Node.js not found!" -ForegroundColor Red
    exit 1
}

# 2. Check npm
Write-Host "[2/8] Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "  ✅ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ npm not found!" -ForegroundColor Red
    exit 1
}

# 3. Check Git
Write-Host "[3/8] Checking Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "  ✅ $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Git not found!" -ForegroundColor Red
    exit 1
}

# 4. Check dependencies
Write-Host "[4/8] Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    $moduleCount = (Get-ChildItem "node_modules" -Directory).Count
    Write-Host "  ✅ node_modules exists ($moduleCount packages)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "  ✅ Dependencies installed" -ForegroundColor Green
}

# 5. Check .env file
Write-Host "[5/8] Checking environment..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "  ✅ .env file exists" -ForegroundColor Green
} else {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "  ⚠️  Created .env from .env.example" -ForegroundColor Yellow
        Write-Host "     Please update with your values!" -ForegroundColor Yellow
    } else {
        Write-Host "  ❌ No .env or .env.example found!" -ForegroundColor Red
    }
}

# 6. Check key framework files
Write-Host "[6/8] Checking framework files..." -ForegroundColor Yellow
$frameworkFiles = @(
    "feature_list.json",
    "claude-progress.txt",
    "rules/autonomous/24_7_AGENT_RULES.md",
    "rules/agents/initializer.md",
    "rules/agents/coding-agent.md"
)

foreach ($file in $frameworkFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Missing: $file" -ForegroundColor Red
    }
}

# 7. Check Git status
Write-Host "[7/8] Checking Git status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    $changeCount = ($gitStatus -split "`n").Count
    Write-Host "  ⚠️  $changeCount uncommitted changes" -ForegroundColor Yellow
} else {
    Write-Host "  ✅ Working tree clean" -ForegroundColor Green
}

# 8. Feature progress summary
Write-Host "[8/8] Loading feature progress..." -ForegroundColor Yellow
if (Test-Path "feature_list.json") {
    $featureData = Get-Content "feature_list.json" | ConvertFrom-Json
    $total = $featureData.features.Count
    $completed = ($featureData.features | Where-Object { $_.passes -eq $true }).Count
    $remaining = $total - $completed
    $percentage = [math]::Round(($completed / $total) * 100, 1)
    
    Write-Host "  📊 Progress: $completed / $total features ($percentage%)" -ForegroundColor Cyan
    Write-Host "  📋 Remaining: $remaining features" -ForegroundColor Cyan
    
    # Show next feature
    $nextFeature = $featureData.features | Where-Object { $_.passes -eq $false } | Select-Object -First 1
    if ($nextFeature) {
        Write-Host ""
        Write-Host "  🎯 Next Feature:" -ForegroundColor Yellow
        Write-Host "     ID: $($nextFeature.id)" -ForegroundColor White
        Write-Host "     Description: $($nextFeature.description)" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  ✅ INITIALIZATION COMPLETE" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. cat claude-progress.txt    # Read previous progress" -ForegroundColor White
Write-Host "  2. npm run dev                # Start development servers" -ForegroundColor White
Write-Host "  3. Work on next feature       # Follow 24_7_AGENT_RULES.md" -ForegroundColor White
Write-Host ""
