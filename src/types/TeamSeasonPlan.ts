export interface TeamSeasonPlanDB {
    id: string
    club_id: string
    season_id: string
    team_id: string
    created_by: string
    system_base: string | null
    sistema_defensivo: string | null
    sistema_ofensivo: string | null
    servicio: string | null
    objetivos: string | null
    definicion_grupo: string | null
    created_at: string
    updated_at: string
}
