#!/usr/bin/env node

/**
 * Legacy Code Elimination Verification Script
 * 
 * Scans codebase for ANY legacy references and exits with error if found
 * Cross-platform (Windows/macOS/Linux)
 */

import { readFileSync, readdirSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const REPO_ROOT = join(__dirname, '..')

// Patterns to search for (CRITICAL - добави V1 може tornar)
const FORBIDDEN_PATTERNS = [
    { pattern: /\bv1\b/gi, name: 'v1/V1 reference' },
    { pattern: /\bMatchV2DB\b/g, name: 'MatchV2DB type' },
    { pattern: /\bour_sets\b/g, name: 'our_sets legacy field' },
    { pattern: /\bopponent_sets\b/g, name: 'opponent_sets legacy field' },
    { pattern: /matches\.result\b/g, name: 'matches.result legacy field' },
]

// Directories to scan (excludes 'scripts' to avoid self-scanning)
const SCAN_DIRS = ['src', 'sql_scripts']

// File extensions to check (excludes .md documentation files)
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.sql']

// Files/patterns to exclude (legitimate references)
const EXCLUDE_PATTERNS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'verify-no-v1', // Self-reference
    'final_verification.md', // Documentation
    'v1_elimination_plan.md', // Documentation
    'auditoria_exhaustiva.md', // Documentation
    '99_eliminate_v1_completely.sql', // Migration script that DROPs legacy fields
    'force_test_v1_constraints.sql', // Test script that validates constraints
]

let totalFiles = 0
let scannedFiles = 0
const violations = []

function shouldExclude(path) {
    // Extract basename for checking
    const pathLower = path.toLowerCase()
    const basename = path.split(/[\\/]/).pop() || ''

    return EXCLUDE_PATTERNS.some(pattern => {
        if (pattern.includes('.')) {
            // File pattern - check basename
            return basename.includes(pattern)
        }
        // Directory pattern - check full path
        return pathLower.includes(pattern.toLowerCase())
    })
}

function scanDirectory(dirPath) {
    try {
        const entries = readdirSync(dirPath, { withFileTypes: true })

        for (const entry of entries) {
            const fullPath = join(dirPath, entry.name)

            if (shouldExclude(fullPath)) continue

            if (entry.isDirectory()) {
                scanDirectory(fullPath)
            } else if (entry.isFile() && EXTENSIONS.includes(extname(entry.name))) {
                scanFile(fullPath)
            }
        }
    } catch (error) {
        console.error(`Error scanning directory ${dirPath}:`, error.message)
    }
}

function scanFile(filePath) {
    totalFiles++

    try {
        const content = readFileSync(filePath, 'utf8')
        scannedFiles++

        for (const { pattern, name } of FORBIDDEN_PATTERNS) {
            const matches = content.match(pattern)

            if (matches) {
                // Get line numbers
                const lines = content.split('\n')
                const matchedLines = []

                lines.forEach((line, index) => {
                    if (pattern.test(line)) {
                        matchedLines.push({
                            line: index + 1,
                            content: line.trim().substring(0, 100) // First 100 chars
                        })
                    }
                })

                violations.push({
                    file: filePath.replace(REPO_ROOT, ''),
                    pattern: name,
                    count: matches.length,
                    lines: matchedLines
                })
            }
        }
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error.message)
    }
}

function printResults() {
    console.log('\n═══════════════════════════════════════')
    console.log('    LEGACY CODE VERIFICATION')
    console.log('═══════════════════════════════════════\n')

    console.log(`📁 Scanned: ${scannedFiles} / ${totalFiles} files`)
    console.log(`📂 Directories: ${SCAN_DIRS.join(', ')}`)
    console.log('')

    if (violations.length === 0) {
        console.log('✅ SUCCESS: No legacy references found!')
        console.log('   Codebase is clean and safe to deploy.\n')
        console.log('═══════════════════════════════════════\n')
        return 0
    }

    console.log(`❌ FAILED: Found ${violations.length} violation(s)\n`)

    for (const violation of violations) {
        console.log(`\n🚨 ${violation.pattern}`)
        console.log(`   File: ${violation.file}`)
        console.log(`   Occurrences: ${violation.count}`)

        violation.lines.forEach(({ line, content }) => {
            console.log(`   Line ${line}: ${content}`)
        })
    }

    console.log('\n═══════════════════════════════════════')
    console.log('❌ Legacy references detected!')
    console.log('   Please remove all legacy references before deployment.')
    console.log('═══════════════════════════════════════\n')

    return 1
}

// Main execution
console.log('🔍 Scanning codebase for legacy references...\n')

for (const dir of SCAN_DIRS) {
    const dirPath = join(REPO_ROOT, dir)
    console.log(`  → Scanning ${dir}/`)
    scanDirectory(dirPath)
}

const exitCode = printResults()
process.exit(exitCode)
