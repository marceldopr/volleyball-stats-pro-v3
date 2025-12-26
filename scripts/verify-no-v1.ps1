#!/usr/bin/env pwsh
# V1 Detection Script - Fails if any V1 references are found
# This script should be run in CI/CD to prevent V1 reintroduction

Write-Host "🔍 Scanning codebase for V1 references..." -ForegroundColor Cyan

$errors = @()
$warnings = @()

# Check 1: Search for "v1" or "V1" in code (case insensitive)
Write-Host "  → Checking for 'v1/V1' strings..."
$v1Matches = Select-String -Path "src/**/*.ts","src/**/*.tsx" -Pattern "\bv1\b|\bV1\b" -CaseSensitive:$false -Exclude "v1-elimination.test.ts","verify-no-v1.ps1"

if ($v1Matches) {
    $errors += "❌ Found V1 references in code:"
    $v1Matches | ForEach-Object {
        $errors += "   $($_.Path):$($_.LineNumber) - $($_.Line.Trim())"
    }
}

# Check 2: Search for "MatchV2DB" type (should be "Match")
Write-Host "  → Checking for 'MatchV2DB' type..."
$matchV2Matches = Select-String -Path "src/**/*.ts","src/**/*.tsx" -Pattern "MatchV2DB"

if ($matchV2Matches) {
    $errors += "❌ Found MatchV2DB type (should be 'Match'):"
    $matchV2Matches | ForEach-Object {
        $errors += "   $($_.Path):$($_.LineNumber)"
    }
}

# Check 3: Search for "engine" filters that check for 'v2'
Write-Host "  → Checking for unnecessary engine filters..."
$engineFilterMatches = Select-String -Path "src/**/*.ts","src/**/*.tsx" -Pattern "\.eq\('engine', 'v2'\)|engine === 'v2'|engine !== 'v2'"

if ($engineFilterMatches) {
    $warnings += "⚠️  Found engine filters (may be unnecessary now):"
    $engineFilterMatches | ForEach-Object {
        $warnings += "   $($_.Path):$($_.LineNumber)"
    }
}

# Check 4: Search for legacy column references
Write-Host "  → Checking for legacy column references..."
$legacyColumns = @('result', 'our_sets', 'opponent_sets')
foreach ($col in $legacyColumns) {
    $colMatches = Select-String -Path "src/**/*.ts","src/**/*.tsx" -Pattern "\b$col\b" -Exclude "SCHEMA.md","*.sql"
    
    if ($colMatches) {
        # Filter out comments and strings
        $realMatches = $colMatches | Where-Object { 
            $_.Line -notmatch "^\s*//" -and 
            $_.Line -notmatch "^\s*\*" 
        }
        
        if ($realMatches) {
            $errors += "❌ Found legacy column '$col' reference:"
            $realMatches | ForEach-Object {
                $errors += "   $($_.Path):$($_.LineNumber) - $($_.Line.Trim())"
            }
        }
    }
}

# Check 5: Verify V1BlockedRoute component is deleted
Write-Host "  → Checking for V1BlockedRoute component..."
if (Test-Path "src/components/routing/V1BlockedRoute.tsx") {
    $errors += "❌ V1BlockedRoute.tsx still exists! Should be deleted."
}

# Results
Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor White

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ SUCCESS: No V1 references found!" -ForegroundColor Green
    Write-Host "   Codebase is V1-free and ready for deployment." -ForegroundColor Green
    exit 0
}

if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "WARNINGS:" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
}

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "ERRORS:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    Write-Host ""
    Write-Host "❌ FAILED: V1 references found in codebase!" -ForegroundColor Red
    Write-Host "   Please remove all V1 references before deployment." -ForegroundColor Red
    exit 1
}

# If only warnings, exit 0 but show them
Write-Host "✅ PASSED (with warnings)" -ForegroundColor Yellow
exit 0
