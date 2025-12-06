// Diagnóstico de Estadísticas
// Ejecuta esto en la consola del navegador para verificar el flujo de datos

console.log('=== DIAGNÓSTICO DE ESTADÍSTICAS ===');

// 1. Verificar si hay partidos finalizados
const checkMatches = async () => {
    const { supabase } = await import('./lib/supabaseClient');

    console.log('\n1. Verificando partidos finalizados...');
    const { data: matches, error } = await supabase
        .from('matches')
        .select('id, match_date, status, team_id, season_id')
        .eq('status', 'finished')
        .order('match_date', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Error al consultar partidos:', error);
        return null;
    }

    console.log(`✅ Partidos finalizados encontrados: ${matches?.length || 0}`);
    console.table(matches);
    return matches;
};

// 2. Verificar estadísticas guardadas
const checkStats = async (matchId) => {
    const { supabase } = await import('./lib/supabaseClient');

    console.log(`\n2. Verificando estadísticas para partido ${matchId}...`);
    const { data: stats, error } = await supabase
        .from('match_player_set_stats')
        .select('*')
        .eq('match_id', matchId);

    if (error) {
        console.error('❌ Error al consultar estadísticas:', error);
        return null;
    }

    console.log(`✅ Registros de estadísticas encontrados: ${stats?.length || 0}`);
    console.table(stats);
    return stats;
};

// 3. Ejecutar diagnóstico completo
const runDiagnostic = async () => {
    const matches = await checkMatches();

    if (matches && matches.length > 0) {
        const firstMatch = matches[0];
        console.log(`\n📊 Analizando partido más reciente: ${firstMatch.id}`);
        await checkStats(firstMatch.id);
    } else {
        console.warn('⚠️ No se encontraron partidos finalizados');
    }

    console.log('\n=== FIN DEL DIAGNÓSTICO ===');
};

// Ejecutar
runDiagnostic();
