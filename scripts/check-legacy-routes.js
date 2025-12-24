#!/usr/bin/env node

/**
 * Legacy Route Detector
 * 
 * Pre-commit hook / CI check to prevent reintroduction of V1 legacy routes
 * 
 * Usage: node scripts/check-legacy-routes.js
 */

const fs = require('fs');
const path = require('path');

// Forbidden patterns
const FORBIDDEN_PATTERNS = [
    {
        pattern: /navigate\(['"`]\/matches\/new['"`]\)/g,
        message: 'Found legacy route: /matches/new - Use ROUTES.CREATE_MATCH or buildRoute.createMatch() instead',
    },
    {
        pattern: /navigate\(['"`]\/matches\/\$\{[^}]+\}\/live['"`]\)/g,
        message: 'Found legacy route: /matches/:id/live - Use ROUTES.LIVE_MATCH or buildRoute.liveMatch(id) instead',
    },
    {
        pattern: /navigate\(['"`]\/match-analysis-v2/g,
        message: 'Found legacy route: /match-analysis-v2 - Use ROUTES.MATCH_ANALYSIS or buildRoute.matchAnalysis(id) instead',
    },
    {
        pattern: /match\.engine\s*===?\s*['"`]v2['"`]/g,
        message: 'Found V1/V2 bifurcation: match.engine === "v2" - All matches are V2 now, remove conditional',
    },
    {
        pattern: /ConvocationManager/g,
        message: 'Found V1 component reference: ConvocationManager - Use ConvocationModal instead',
    },
    {
        pattern: /handleStartMatch/g,
        message: 'Found V1 handler: handleStartMatch - Use matchService.startMatch() directly',
    },
];

// Files to check
const EXTENSIONS_TO_CHECK = ['.ts', '.tsx', '.js', '.jsx'];
const DIRECTORIES_TO_SKIP = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
];

function shouldCheckFile(filePath) {
    if (DIRECTORIES_TO_SKIP.some(dir => filePath.includes(dir))) {
        return false;
    }

    const ext = path.extname(filePath);
    return EXTENSIONS_TO_CHECK.includes(ext);
}

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const violations = [];

    FORBIDDEN_PATTERNS.forEach(({ pattern, message }) => {
        const matches = content.match(pattern);
        if (matches) {
            violations.push({
                file: filePath,
                message,
                matches: matches.length,
            });
        }
    });

    return violations;
}

function walkDirectory(dir) {
    let violations = [];

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (!DIRECTORIES_TO_SKIP.includes(file)) {
                violations = violations.concat(walkDirectory(filePath));
            }
        } else if (shouldCheckFile(filePath)) {
            violations = violations.concat(checkFile(filePath));
        }
    }

    return violations;
}

// Main execution
console.log('🔍 Checking for legacy V1 routes...\n');

const srcDir = path.join(process.cwd(), 'src');
const violations = walkDirectory(srcDir);

if (violations.length > 0) {
    console.error('❌ Found legacy route violations:\n');

    violations.forEach(({ file, message, matches }) => {
        console.error(`📁 ${file}`);
        console.error(`   ${message} (${matches} occurrence${matches > 1 ? 's' : ''})\n`);
    });

    console.error(`Total violations: ${violations.length}\n`);
    console.error('💡 Fix these issues before committing. See src/config/routes.ts for correct usage.\n');

    process.exit(1);
} else {
    console.log('✅ No legacy routes detected. All good!\n');
    process.exit(0);
}
