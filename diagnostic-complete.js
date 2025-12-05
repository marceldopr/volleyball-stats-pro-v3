// DIAGNÓSTICO COMPLETO DE ESTADÍSTICAS
// Copia y pega este código completo en la consola del navegador

(async () => {
    console.log('=== DIAGNÓSTICO DE ESTADÍSTICAS ===\n');

    // Importar supabase
    const { supabase } = await import('./src/lib/supabaseClient.js');

    // 1. Verificar partidos finalizados
    console.log('1️⃣ Consultando partidos finalizados...');
    const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select('id, match_date, status, team_id, season_id, opponent_name')
        .eq('status', 'finished')
        .order('match_date', { ascending: false })
        .limit(3);

    if (matchError) {
        console.error('❌ Error:', matchError);
        return;
    }

    console.log(`✅ Partidos encontrados: ${matches?.length || 0}`);
    console.table(matches);

    if (!matches || matches.length === 0) {
        console.warn('⚠️ No hay partidos finalizados. Registra un partido primero.');
        return;
    }

    const firstMatch = matches[0];
    console.log(`\n2️⃣ Analizando partido: ${firstMatch.id}`);

    // 2. Verificar estadísticas guardadas
    const { data: stats, error: statsError } = await supabase
        .from('match_player_set_stats')
        .select('*')
        .eq('match_id', firstMatch.id);

    if (statsError) {
        console.error('❌ Error:', statsError);
        return;
    }

    console.log(`✅ Registros de estadísticas: ${stats?.length || 0}`);
    if (stats && stats.length > 0) {
        console.table(stats.slice(0, 5));
    } else {
        console.warn('⚠️ No hay estadísticas guardadas para este partido');
        console.log('💡 Esto significa que el partido se guardó ANTES de las correcciones');
        console.log('💡 Solución: Registra un NUEVO partido de prueba');
        return;
    }

    // 3. Verificar jugadores
    const playerIds = [...new Set(stats.map(s => s.player_id))];
    console.log(`\n3️⃣ Consultando ${playerIds.length} jugadores...`);

    const { data: players, error: playersError } = await supabase
        .from('club_players')
        .select('id, first_name, last_name, jersey_number, main_position')
        .in('id', playerIds);

    if (playersError) {
        console.error('❌ Error:', playersError);
        return;
    }

    console.log(`✅ Jugadores encontrados: ${players?.length || 0}`);
    console.table(players);

    // 4. Resumen
    console.log('\n📊 RESUMEN:');
    console.log(`- Partidos finalizados: ${matches.length}`);
    console.log(`- Estadísticas del último partido: ${stats.length}`);
    console.log(`- Jugadores: ${players?.length || 0}`);

    if (stats.length > 0 && players && players.length > 0) {
        console.log('\n✅ TODO CORRECTO - Los datos están en la base de datos');
        console.log('💡 Si no aparecen en la UI, revisa la consola para errores de React');
    }

    console.log('\n=== FIN DEL DIAGNÓSTICO ===');
})();
