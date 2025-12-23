# Supabase Database Schema

**Last updated:** 2025-12-17

Aquest document conté l'estructura completa de la base de dades Supabase del projecte Volleyball Stats Pro.

---

## Taules Principals

### Players & Teams
- **`club_players`** - Jugadores del club (birth_date, positions, height_cm, weight_kg, etc.)
- **`teams`** - Equips (custom_name, category_stage, gender, identifier_id, etc.)
- **`player_team_season`** - Relació jugadora-equip per temporada
- **`player_secondary_assignments`** - Assignacions secundàries de jugadores (dobles fitxes)

### Matches & Stats
- **`matches`** - Partits (opponent_name, match_date, status, actions [jsonb], etc.)
- **`match_convocations`** - Convocatòries per partit
- **`match_player_set_stats`** - Estadístiques per jugadora i set

### Evaluations & Reports
- **`player_team_season_evaluations`** - Avaluacions de jugadores (1-5 scale)
- **`player_reports`** - Informes de jugadores
- **`coach_reports`** - Informes d'entrenadors

### Training
- **`trainings`** - Sessions d'entrenament (title, date, notes)
- **`training_attendance`** - Assistència als entrenaments
- **`training_schedules`** - Horaris d'entrenament per equip (days, times, spaces)

### Structure & Organization
- **`clubs`** - Clubs (name, acronym)
- **`seasons`** - Temporades (reference_date, is_current)
- **`club_categories`** - Categories del club (gender, min_age, max_age)
- **`club_identifiers`** - Identificadors d'equips (A, B, C, etc.)
- **`spaces`** - Espais/pistes del club (name, type, capacity)

### User Management
- **`profiles`** - Usuaris (club_id, full_name, role)
- **`coaches`** - Entrenadors (first_name, last_name, profile_id, status, approval_status, approved_at, approved_by_profile_id)
- **`coach_team_season`** - Assignacions entrenador-equip-temporada (coach_id, team_id, season_id, role_in_team)
- **`coach_team_assignments`** - ⚠️ DEPRECATED - Usar `coach_team_season` en su lugar

---

## Schema Complet (Taula-Camp)

| Taula | Camp | Tipus | Nullable |
|-------|------|-------|----------|
| club_categories | id | uuid | NOT NULL |
| club_categories | club_id | uuid | NOT NULL |
| club_categories | name | character varying | NOT NULL |
| club_categories | code | character varying | NULL |
| club_categories | gender | character varying | NOT NULL |
| club_categories | min_age | integer | NULL |
| club_categories | max_age | integer | NULL |
| club_categories | sort_order | integer | NOT NULL |
| club_categories | is_active | boolean | NOT NULL |
| club_categories | created_at | timestamp with time zone | NOT NULL |
| club_categories | updated_at | timestamp with time zone | NOT NULL |
| club_identifiers | id | uuid | NOT NULL |
| club_identifiers | club_id | uuid | NOT NULL |
| club_identifiers | name | character varying | NOT NULL |
| club_identifiers | type | character varying | NOT NULL |
| club_identifiers | color_hex | character varying | NULL |
| club_identifiers | code | character varying | NULL |
| club_identifiers | is_active | boolean | NOT NULL |
| club_identifiers | sort_order | integer | NOT NULL |
| club_identifiers | created_at | timestamp with time zone | NOT NULL |
| club_identifiers | updated_at | timestamp with time zone | NOT NULL |
| club_players | id | uuid | NOT NULL |
| club_players | club_id | uuid | NOT NULL |
| club_players | first_name | text | NOT NULL |
| club_players | last_name | text | NOT NULL |
| club_players | birth_date | date | NOT NULL |
| club_players | main_position | text | NULL |
| club_players | secondary_position | text | NULL |
| club_players | dominant_hand | text | NULL |
| club_players | height_cm | numeric | NULL |
| club_players | notes | text | NULL |
| club_players | is_active | boolean | NULL |
| club_players | created_at | timestamp with time zone | NULL |
| club_players | updated_at | timestamp with time zone | NULL |
| club_players | gender | text | NOT NULL |
| club_players | weight_kg | integer | NULL |
| club_players | phone | text | NULL |
| club_players | email | text | NULL |
| club_players | notes_admin | text | NULL |
| club_promotion_routes | id | uuid | NOT NULL |
| club_promotion_routes | club_id | uuid | NOT NULL |
| club_promotion_routes | gender | text | NOT NULL |
| club_promotion_routes | from_category_id | uuid | NOT NULL |
| club_promotion_routes | from_identifier_id | uuid | NULL |
| club_promotion_routes | to_category_id | uuid | NOT NULL |
| club_promotion_routes | to_identifier_id | uuid | NULL |
| club_promotion_routes | is_active | boolean | NULL |
| club_promotion_routes | created_at | timestamp with time zone | NULL |
| club_promotion_routes | updated_at | timestamp with time zone | NULL |
| clubs | id | uuid | NOT NULL |
| clubs | name | text | NOT NULL |
| clubs | created_at | timestamp with time zone | NULL |
| clubs | acronym | text | NULL |
| clubs | metadata | jsonb | NULL |
| clubs | updated_at | timestamp with time zone | NULL |
| coach_reports | id | uuid | NOT NULL |
| coach_reports | club_id | uuid | NOT NULL |
| coach_reports | coach_id | uuid | NOT NULL |
| coach_reports | season_id | uuid | NOT NULL |
| coach_reports | created_by | uuid | NOT NULL |
| coach_reports | asistencia | integer | NOT NULL |
| coach_reports | metodologia | integer | NOT NULL |
| coach_reports | comunicacion | integer | NOT NULL |
| coach_reports | clima_equipo | integer | NOT NULL |
| coach_reports | notas | text | NULL |
| coach_reports | fecha | date | NOT NULL |
| coach_reports | created_at | timestamp with time zone | NULL |
| coach_reports | updated_at | timestamp with time zone | NULL |
| coaches | id | uuid | NOT NULL |
| coaches | club_id | uuid | NOT NULL |
| coaches | profile_id | uuid | NULL |
| coaches | first_name | text | NOT NULL |
| coaches | last_name | text | NOT NULL |
| coaches | status | text | NOT NULL |
| coaches | photo_url | text | NULL |
| coaches | phone | text | NULL |
| coaches | email | text | NULL |
| coaches | notes_internal | text | NULL |
| coaches | created_at | timestamp with time zone | NOT NULL |
| coaches | updated_at | timestamp with time zone | NOT NULL |
| coaches | approval_status | text | NOT NULL |
| coaches | approved_at | timestamp with time zone | NULL |
| coaches | approved_by_profile_id | uuid | NULL |
| coach_team_season | id | uuid | NOT NULL |
| coach_team_season | coach_id | uuid | NOT NULL |
| coach_team_season | team_id | uuid | NOT NULL |
| coach_team_season | season_id | uuid | NOT NULL |
| coach_team_season | role_in_team | text | NULL |
| coach_team_season | date_from | date | NULL |
| coach_team_season | date_to | date | NULL |
| coach_team_season | created_at | timestamp with time zone | NOT NULL |
| coach_team_assignments | id | uuid | NOT NULL |
| coach_team_assignments | user_id | uuid | NOT NULL |
| coach_team_assignments | team_id | uuid | NOT NULL |
| coach_team_assignments | season_id | uuid | NOT NULL |
| coach_team_assignments | role_in_team | text | NULL |
| coach_team_assignments | created_at | timestamp with time zone | NOT NULL |
| coach_team_assignments | updated_at | timestamp with time zone | NOT NULL |
| match_convocations | id | uuid | NOT NULL |
| match_convocations | match_id | uuid | NOT NULL |
| match_convocations | player_id | uuid | NOT NULL |
| match_convocations | team_id | uuid | NOT NULL |
| match_convocations | season_id | uuid | NOT NULL |
| match_convocations | status | text | NOT NULL |
| match_convocations | role_in_match | text | NULL |
| match_convocations | reason_not_convoked | text | NULL |
| match_convocations | notes | text | NULL |
| match_convocations | created_at | timestamp with time zone | NOT NULL |
| match_convocations | updated_at | timestamp with time zone | NOT NULL |
| match_player_set_stats | id | uuid | NOT NULL |
| match_player_set_stats | match_id | uuid | NOT NULL |
| match_player_set_stats | player_id | uuid | NOT NULL |
| match_player_set_stats | team_id | uuid | NOT NULL |
| match_player_set_stats | season_id | uuid | NOT NULL |
| match_player_set_stats | set_number | integer | NOT NULL |
| match_player_set_stats | serves | integer | NOT NULL |
| match_player_set_stats | aces | integer | NOT NULL |
| match_player_set_stats | serve_errors | integer | NOT NULL |
| match_player_set_stats | receptions | integer | NOT NULL |
| match_player_set_stats | reception_errors | integer | NOT NULL |
| match_player_set_stats | attacks | integer | NOT NULL |
| match_player_set_stats | kills | integer | NOT NULL |
| match_player_set_stats | attack_errors | integer | NOT NULL |
| match_player_set_stats | blocks | integer | NOT NULL |
| match_player_set_stats | block_errors | integer | NOT NULL |
| match_player_set_stats | digs | integer | NOT NULL |
| match_player_set_stats | digs_errors | integer | NOT NULL |
| match_player_set_stats | sets | integer | NOT NULL |
| match_player_set_stats | set_errors | integer | NOT NULL |
| match_player_set_stats | notes | text | NULL |
| match_player_set_stats | created_at | timestamp with time zone | NOT NULL |
| match_player_set_stats | updated_at | timestamp with time zone | NOT NULL |
| matches | id | uuid | NOT NULL |
| matches | club_id | uuid | NOT NULL |
| matches | season_id | uuid | NOT NULL |
| matches | team_id | uuid | NOT NULL |
| matches | opponent_name | text | NOT NULL |
| matches | competition_name | text | NULL |
| matches | match_date | timestamp with time zone | NOT NULL |
| matches | location | text | NULL |
| matches | home_away | text | NOT NULL |
| matches | status | text | NOT NULL |
| matches | result | text | NULL |
| matches | notes | text | NULL |
| matches | created_at | timestamp with time zone | NOT NULL |
| matches | updated_at | timestamp with time zone | NOT NULL |
| matches | actions | jsonb | NULL |
| matches | our_sets | smallint | NULL |
| matches | opponent_sets | smallint | NULL |
| matches | engine | text | NULL |
| matches | match_time | text | NULL |
| player_documents | id | uuid | NOT NULL |
| player_documents | player_id | uuid | NOT NULL |
| player_documents | federation_ok | boolean | NULL |
| player_documents | image_consent | boolean | NULL |
| player_documents | medical_cert_ok | boolean | NULL |
| player_documents | notes | text | NULL |
| player_documents | updated_at | timestamp with time zone | NULL |
| player_guardians | id | uuid | NOT NULL |
| player_guardians | player_id | uuid | NOT NULL |
| player_guardians | full_name | text | NOT NULL |
| player_guardians | relationship | text | NOT NULL |
| player_guardians | phone | text | NULL |
| player_guardians | email | text | NULL |
| player_guardians | is_primary | boolean | NULL |
| player_guardians | created_at | timestamp with time zone | NULL |
| player_injuries | id | uuid | NOT NULL |
| player_injuries | player_id | uuid | NOT NULL |
| player_injuries | season_id | uuid | NULL |
| player_injuries | start_date | date | NOT NULL |
| player_injuries | end_date | date | NULL |
| player_injuries | injury_type | text | NULL |
| player_injuries | notes | text | NULL |
| player_injuries | is_active | boolean | NULL |
| player_injuries | created_at | timestamp with time zone | NULL |
| player_measurements | id | uuid | NOT NULL |
| player_measurements | player_id | uuid | NOT NULL |
| player_measurements | season_id | uuid | NULL |
| player_measurements | measured_at | date | NOT NULL |
| player_measurements | height_cm | numeric | NULL |
| player_measurements | weight_kg | numeric | NULL |
| player_measurements | vertical_jump_cm | numeric | NULL |
| player_measurements | wingspan_cm | numeric | NULL |
| player_measurements | notes | text | NULL |
| player_measurements | created_at | timestamp with time zone | NULL |
| player_reports | id | uuid | NOT NULL |
| player_reports | club_id | uuid | NOT NULL |
| player_reports | player_id | uuid | NOT NULL |
| player_reports | team_id | uuid | NOT NULL |
| player_reports | season_id | uuid | NOT NULL |
| player_reports | match_id | uuid | NULL |
| player_reports | report_date | date | NOT NULL |
| player_reports | created_by | uuid | NOT NULL |
| player_reports | sections | jsonb | NOT NULL |
| player_reports | final_comment | text | NULL |
| player_reports | created_at | timestamp with time zone | NOT NULL |
| player_reports | updated_at | timestamp with time zone | NOT NULL |
| player_team_season | id | uuid | NOT NULL |
| player_team_season | player_id | uuid | NOT NULL |
| player_team_season | team_id | uuid | NOT NULL |
| player_team_season | season_id | uuid | NOT NULL |
| player_team_season | jersey_number | text | NULL |
| player_team_season | role | text | NULL |
| player_team_season | expected_category | text | NULL |
| player_team_season | current_category | text | NULL |
| player_team_season | status | text | NULL |
| player_team_season | notes | text | NULL |
| player_team_season | created_at | timestamp with time zone | NULL |
| player_team_season | updated_at | timestamp with time zone | NULL |
| player_team_season | position | text | NULL |
| player_team_season | has_injury | boolean | NULL |
| player_secondary_assignments | id | uuid | NOT NULL |
| player_secondary_assignments | club_id | uuid | NOT NULL |
| player_secondary_assignments | season_id | uuid | NOT NULL |
| player_secondary_assignments | player_id | uuid | NOT NULL |
| player_secondary_assignments | team_id | uuid | NOT NULL |
| player_secondary_assignments | jersey_number | text | NULL |
| player_secondary_assignments | valid_from | date | NULL |
| player_secondary_assignments | valid_to | date | NULL |
| player_secondary_assignments | notes | text | NULL |
| player_secondary_assignments | created_by | uuid | NULL |
| player_secondary_assignments | created_at | timestamp with time zone | NULL |
| player_secondary_assignments | updated_at | timestamp with time zone | NULL |
| player_team_season_evaluations | id | uuid | NOT NULL |
| player_team_season_evaluations | player_id | uuid | NOT NULL |
| player_team_season_evaluations | team_id | uuid | NOT NULL |
| player_team_season_evaluations | season_id | uuid | NOT NULL |
| player_team_season_evaluations | phase | text | NOT NULL |
| player_team_season_evaluations | service_rating | smallint | NULL |
| player_team_season_evaluations | reception_rating | smallint | NULL |
| player_team_season_evaluations | attack_rating | smallint | NULL |
| player_team_season_evaluations | block_rating | smallint | NULL |
| player_team_season_evaluations | defense_rating | smallint | NULL |
| player_team_season_evaluations | error_impact_rating | smallint | NULL |
| player_team_season_evaluations | role_in_team | text | NULL |
| player_team_season_evaluations | competitive_mindset | character varying | NULL |
| player_team_season_evaluations | coach_recommendation | character varying | NULL |
| player_team_season_evaluations | created_by | uuid | NULL |
| player_team_season_evaluations | created_at | timestamp with time zone | NULL |
| player_team_season_evaluations | updated_at | timestamp with time zone | NULL |
| profiles | id | uuid | NOT NULL |
| profiles | club_id | uuid | NOT NULL |
| profiles | full_name | text | NULL |
| profiles | role | text | NULL |
| profiles | created_at | timestamp with time zone | NULL |
| reports | id | uuid | NOT NULL |
| reports | club_id | uuid | NOT NULL |
| reports | player_id | uuid | NOT NULL |
| reports | author_user_id | uuid | NOT NULL |
| reports | date | date | NOT NULL |
| reports | title | text | NOT NULL |
| reports | content | text | NOT NULL |
| reports | created_at | timestamp with time zone | NULL |
| reports | updated_at | timestamp with time zone | NULL |
| seasons | id | uuid | NOT NULL |
| seasons | club_id | uuid | NOT NULL |
| seasons | name | text | NOT NULL |
| seasons | start_date | date | NULL |
| seasons | end_date | date | NULL |
| seasons | is_current | boolean | NULL |
| seasons | created_at | timestamp with time zone | NULL |
| seasons | updated_at | timestamp with time zone | NULL |
| seasons | reference_date | date | NOT NULL |
| seasons | status | text | NULL |
| spaces | id | uuid | NOT NULL |
| spaces | club_id | uuid | NOT NULL |
| spaces | name | text | NOT NULL |
| spaces | type | text | NOT NULL |
| spaces | capacity | integer | NULL |
| spaces | notes | text | NULL |
| spaces | is_active | boolean | NULL |
| spaces | created_at | timestamp with time zone | NULL |
| spaces | updated_at | timestamp with time zone | NULL |
| team_season_context | id | uuid | NOT NULL |
| team_season_context | team_id | uuid | NOT NULL |
| team_season_context | season_id | uuid | NOT NULL |
| team_season_context | primary_goal | text | NULL |
| team_season_context | secondary_goals | ARRAY | NULL |
| team_season_context | training_focus | ARRAY | NULL |
| team_season_context | role_hierarchy | text | NULL |
| team_season_context | default_rotation_notes | text | NULL |
| team_season_context | internal_rules | ARRAY | NULL |
| team_season_context | staff_notes | text | NULL |
| team_season_context | created_at | timestamp with time zone | NULL |
| team_season_context | updated_at | timestamp with time zone | NULL |
| team_season_phases | id | uuid | NOT NULL |
| team_season_phases | team_id | uuid | NOT NULL |
| team_season_phases | season_id | uuid | NOT NULL |
| team_season_phases | phase_number | integer | NOT NULL |
| team_season_phases | phase_name | text | NOT NULL |
| team_season_phases | primary_objective | text | NULL |
| team_season_phases | secondary_objectives | ARRAY | NULL |
| team_season_phases | technical_priorities | ARRAY | NULL |
| team_season_phases | risks_weaknesses | text | NULL |
| team_season_phases | kpi | text | NULL |
| team_season_phases | created_at | timestamp with time zone | NULL |
| team_season_phases | updated_at | timestamp with time zone | NULL |
| team_season_plan | id | uuid | NOT NULL |
| team_season_plan | club_id | uuid | NOT NULL |
| team_season_plan | season_id | uuid | NOT NULL |
| team_season_plan | team_id | uuid | NOT NULL |
| team_season_plan | created_by | uuid | NOT NULL |
| team_season_plan | system_base | text | NULL |
| team_season_plan | sistema_defensivo | text | NULL |
| team_season_plan | sistema_ofensivo | text | NULL |
| team_season_plan | servicio | text | NULL |
| team_season_plan | objetivos | text | NULL |
| team_season_plan | definicion_grupo | text | NULL |
| team_season_plan | created_at | timestamp with time zone | NULL |
| team_season_plan | updated_at | timestamp with time zone | NULL |
| teams | id | uuid | NOT NULL |
| teams | club_id | uuid | NOT NULL |
| teams | custom_name | text | NULL |
| teams | category | text | NULL |
| teams | age_group | text | NULL |
| teams | created_at | timestamp with time zone | NULL |
| teams | season_id | uuid | NULL |
| teams | gender | text | NULL |
| teams | competition_level | text | NULL |
| teams | head_coach_id | uuid | NULL |
| teams | assistant_coach_id | uuid | NULL |
| teams | notes | text | NULL |
| teams | updated_at | timestamp with time zone | NULL |
| teams | category_stage | text | NOT NULL |
| teams | division_name | text | NULL |
| teams | team_suffix | text | NULL |
| teams | identifier_id | uuid | NULL |
| training_attendance | id | uuid | NOT NULL |
| training_attendance | training_id | uuid | NOT NULL |
| training_attendance | player_id | uuid | NOT NULL |
| training_attendance | status | text | NOT NULL |
| training_attendance | reason | text | NULL |
| training_attendance | created_at | timestamp with time zone | NOT NULL |
| training_attendance | updated_at | timestamp with time zone | NOT NULL |
| training_phase_evaluation | id | uuid | NOT NULL |
| training_phase_evaluation | team_id | uuid | NOT NULL |
| training_phase_evaluation | season_id | uuid | NOT NULL |
| training_phase_evaluation | phase_id | uuid | NOT NULL |
| training_phase_evaluation | status | text | NOT NULL |
| training_phase_evaluation | reasons | text | NOT NULL |
| training_phase_evaluation | match_impact | text | NULL |
| training_phase_evaluation | next_adjustments | text | NOT NULL |
| training_phase_evaluation | created_at | timestamp with time zone | NULL |
| training_phase_evaluation | updated_at | timestamp with time zone | NULL |
| training_phase_evaluation | dominant_weakness | text | NULL |
| training_phase_evaluation | trend | text | NULL |
| training_schedules | id | uuid | NOT NULL |
| training_schedules | club_id | uuid | NOT NULL |
| training_schedules | season_id | uuid | NOT NULL |
| training_schedules | team_id | uuid | NOT NULL |
| training_schedules | team_name | text | NOT NULL |
| training_schedules | days | ARRAY | NOT NULL |
| training_schedules | start_time | text | NOT NULL |
| training_schedules | end_time | text | NOT NULL |
| training_schedules | preferred_space | text | NOT NULL |
| training_schedules | alternative_spaces | ARRAY | NULL |
| training_schedules | period | text | NOT NULL |
| training_schedules | custom_start_date | text | NULL |
| training_schedules | custom_end_date | text | NULL |
| training_schedules | is_active | boolean | NULL |
| training_schedules | created_at | timestamp with time zone | NULL |
| training_schedules | updated_at | timestamp with time zone | NULL |
| trainings | id | uuid | NOT NULL |
| trainings | team_id | uuid | NOT NULL |
| trainings | date | timestamp with time zone | NOT NULL |
| trainings | title | text | NULL |
| trainings | notes | text | NULL |
| trainings | created_by | uuid | NULL |
| trainings | created_at | timestamp with time zone | NOT NULL |
| trainings | updated_at | timestamp with time zone | NOT NULL |

---

## Notes Importants

### Camps Clau a Recordar
- **`teams.custom_name`** (NO `name`)
- **`matches.opponent_name`** (NO `opponent`)
- **`trainings`** (NO `training_sessions`)
- **`club_players`** conté les jugadores (NO la taula `players`)

### Relacions Principals
- Jugadores → Equips: `player_team_season`
- Entrenadors → Equips: `coach_team_season` (⚠️ nou sistema, reemplaza `coach_team_assignments`)
- Usuaris → Entrenadors: `coaches.profile_id` → `profiles.id`
- Partits → Estadístiques: `match_player_set_stats`

---

**Per actualitzar aquest document:**
Executa `sql_scripts/export_schema_complete.sql` a Supabase i reemplaça la secció "Schema Complet".
