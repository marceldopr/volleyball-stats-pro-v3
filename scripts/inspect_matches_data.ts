
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import os from 'os'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectMatches() {
    console.log('--- Inspecting Matches Table ---')

    const { data: matches, error } = await supabase
        .from('matches')
        .select('id, match_date, status, result, home_away, opponent_name, team_id, actions')
        .order('match_date', { ascending: false })
        .limit(10)

    if (error) {
        console.error('Error fetching matches:', error)
        return
    }

    if (!matches || matches.length === 0) {
        console.log('No matches found.')
        return
    }

    console.log(`Found ${matches.length} recent matches:\n`)

    matches.forEach((m, index) => {
        const actionCount = Array.isArray(m.actions) ? m.actions.length : 0
        console.log(`Match #${index + 1}:`)
        console.log(`  ID: ${m.id}`)
        console.log(`  Date: ${m.match_date}`)
        console.log(`  Status: ${m.status}`)
        console.log(`  Result: "${m.result}" (IsNull: ${m.result === null})`)
        console.log(`  Home/Away: ${m.home_away}`)
        console.log(`  Opponent: ${m.opponent_name}`)
        console.log(`  Actions Count: ${actionCount}`)
        console.log('-----------------------------------')
    })
}

inspectMatches()
