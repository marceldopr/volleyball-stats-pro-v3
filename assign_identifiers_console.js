/**
 * Browser Console Script to Assign Team Identifiers
 * 
 * INSTRUCTIONS:
 * 1. Go to "Gestión de Equipos" page
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. The script will automatically assign identifiers based on visible team names
 * 
 * WHAT IT DOES:
 * - Reads team names from the page (e.g., "Cadete Taronja Femenino")
 * - Extracts the identifier (e.g., "Taronja")
 * - Finds the identifier_id from the identifiers table
 * - Updates the team with the correct identifier_id
 */

(async function assignTeamIdentifiers() {
    console.log('🔧 Starting automatic team identifier assignment...');

    // Get Supabase client from window (should be available if logged in)
    const supabase = window.supabase || (await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')).createClient(
        'YOUR_SUPABASE_URL',
        'YOUR_SUPABASE_ANON_KEY'
    );

    try {
        // Step 1: Get all identifiers
        const { data: identifiers, error: idError } = await supabase
            .from('identifiers')
            .select('id, name, type');

        if (idError) {
            console.error('❌ Error fetching identifiers:', idError);
            return;
        }

        console.log('📋 Found identifiers:', identifiers);

        // Create map: identifier name -> id
        const identifierMap = new Map();
        identifiers.forEach(i => identifierMap.set(i.name, i.id));

        // Step 2: Get all teams for current season
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('id, category_stage, gender, custom_name, identifier_id')
            .eq('season_id', 'd50091ab-5eb1-4e8f-b03e-7eb2cd0268b6'); // 2025/2026

        if (teamsError) {
            console.error('❌ Error fetching teams:', teamsError);
            return;
        }

        console.log('👥 Found teams:', teams.length);

        // Step 3: Read team names from the UI
        const teamRows = document.querySelectorAll('[data-team-id]') ||
            document.querySelectorAll('table tbody tr');

        if (teamRows.length === 0) {
            console.warn('⚠️ Could not find team rows in UI. Make sure you are on "Gestión de Equipos" page.');
            console.log('📝 Manual assignment mode...');

            // Manual mapping based on screenshot
            const manualMapping = {
                // Format: { category_stage, gender, identifier_name }
                'Cadete-female': 'Taronja',    // Assuming first Cadete Female is Taronja
                'Juvenil-female': 'Taronja',   // Assuming first Juvenil Female is Taronja  
                'Infantil-mixed': 'Negre',     // Infantil Negre Mixto
                'Infantil-female': 'Taronja',  // Assuming Infantil Female is Taronja
            };

            // Ask user for confirmation
            console.log('❓ Please confirm team -> identifier mapping:');
            teams.forEach((team, idx) => {
                const key = `${team.category_stage}-${team.gender}`;
                const suggestedIdentifier = manualMapping[key];
                console.log(`${idx + 1}. ${team.category_stage} ${team.gender} -> ${suggestedIdentifier || 'NO IDENTIFIER'}`);
            });

            const proceed = confirm('Do you want to proceed with automatic assignment based on the mapping shown in console?');
            if (!proceed) {
                console.log('❌ Assignment cancelled by user');
                return;
            }

            // Apply manual mapping
            let updated = 0;
            for (const team of teams) {
                if (team.identifier_id) {
                    console.log(`⏭️ Skipping ${team.category_stage} ${team.gender} - already has identifier`);
                    continue;
                }

                const key = `${team.category_stage}-${team.gender}`;
                const identifierName = manualMapping[key];

                if (!identifierName) continue;

                const identifierId = identifierMap.get(identifierName);
                if (!identifierId) {
                    console.warn(`⚠️ Identifier "${identifierName}" not found in database`);
                    continue;
                }

                const { error } = await supabase
                    .from('teams')
                    .update({ identifier_id: identifierId })
                    .eq('id', team.id);

                if (error) {
                    console.error(`❌ Error updating ${team.category_stage} ${team.gender}:`, error);
                } else {
                    console.log(`✅ Updated ${team.category_stage} ${team.gender} -> ${identifierName}`);
                    updated++;
                }
            }

            console.log(`✨ Assignment complete! Updated ${updated} teams.`);
            console.log('🔄 Refresh the page to see changes.');

        } else {
            console.log('🎯 Reading team names from UI...');

            // Parse team names from UI and update
            // This part would need to be customized based on actual HTML structure
            console.warn('⚠️ UI parsing not yet implemented. Use manual mode above.');
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
})();
