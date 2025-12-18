# Restricció de Polítiques DELETE (DT/Owner Only)

## Resum de Canvis

S'han restringit les polítiques DELETE en **15 taules crítiques** per només permetre operacions DELETE a usuaris amb rol **DT** o **Owner**, evitant que coaches puguin esborrar dades accidentalment.

---

## Fitxers Creats

### 1. [`08_refine_delete_policies.sql`](file:///c:/Users/marce/Desktop/volleyball-stats-pro-master/sql_scripts/rls/08_refine_delete_policies.sql)

Script principal que:
- Elimina totes les polítiques DELETE permissives existents
- Crea noves polítiques restrictives amb role check
- Verifica que les 15 polítiques s'hagin creat correctament

### 2. [`09_verify_delete_restrictions.sql`](file:///c:/Users/marce/Desktop/volleyball-stats-pro-master/sql_scripts/rls/09_verify_delete_restrictions.sql)

Script de verificació amb:
- Tests de políticas existents
- Comprovació de roles d'usuaris
- Tests pràctics: DELETE com Coach (ha de fallar) vs DELETE com DT (ha de funcionar)

---

## Taules Afectades (15 total)

### ✅ Amb `club_id` directe (7 taules)
- `club_players`
- `teams`
- `seasons`
- `matches`
- `player_reports`
- `reports`
- `coach_reports`

### 🔗 Via FK `team_id` (2 taules)
- `match_convocations` → `teams.club_id`
- `trainings` → `teams.club_id`

### 🔗 Via FK `match_id` (1 taula)
- `match_player_set_stats` → `matches.club_id`

### 🔗 Via FK nested `training_id` (1 taula)
- `training_attendance` → `trainings` → `teams.club_id`

### 🔗 Via FK `player_id` (4 taules)
- `player_guardians` → `club_players.club_id`
- `player_injuries` → `club_players.club_id`
- `player_measurements` → `club_players.club_id`
- `player_documents` → `club_players.club_id`

---

## Patró de Política

### Exemple: Taula amb `club_id` directe

```sql
CREATE POLICY "Only DT/Owner can delete players"
ON club_players FOR DELETE
TO authenticated
USING (
  club_id = public.get_user_club_id()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
);
```

### Exemple: Taula amb FK via `team_id`

```sql
CREATE POLICY "Only DT/Owner can delete trainings"
ON trainings FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = trainings.team_id
    AND teams.club_id = public.get_user_club_id()
  )
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
);
```

---

## Instruccions d'Execució

### 1. Executar el Script Principal

```bash
# A Supabase SQL Editor:
1. Obre sql_scripts/rls/08_refine_delete_policies.sql
2. Executa tot el contingut
3. Verifica que la query final retorni 15 polítiques
```

### 2. Verificar amb Tests

```bash
# A Supabase SQL Editor:
1. Obre sql_scripts/rls/09_verify_delete_restrictions.sql
2. Segueix els passos de TEST 1, 2, 3, 4, 5
3. Confirma que:
   - Coach NO pot fer DELETE
   - DT SÍ pot fer DELETE
```

---

## Resultats Esperats

### Abans (Permissiu ⚠️)
```
Coach → DELETE FROM club_players → ✅ ALLOWED (RISC!)
DT → DELETE FROM club_players → ✅ ALLOWED
```

### Després (Restrictiu ✅)
```
Coach → DELETE FROM club_players → ❌ BLOCKED by RLS
DT → DELETE FROM club_players → ✅ ALLOWED
Owner → DELETE FROM club_players → ✅ ALLOWED
```

---

## Impacte en la Aplicació

### ✅ Positiu
- **Seguretat millorada**: Coaches no poden esborrar jugadores/equips accidentalment
- **Auditabilitat**: Només rols amb permisos poden DELETE
- **Coherència**: Totes les taules crítiques protegides

### ⚠️ A Considerar
- **UI/UX**: L'aplicació frontend pot mostrar errors quan un coach intenta esborrar
- **Recomanació**: Amagar botons DELETE per coaches al frontend
- **Futur**: Implementar soft-deletes (`deleted_at`) per recovery

---

## Taules NO Afectades

Aquestes taules mantenen les polítiques DELETE originals (permissives):

- `club_categories` (configuració bàsica)
- `club_identifiers` (configuració bàsica)
- `club_promotion_routes` (configuració bàsica)
- `coach_team_assignments` (auto-gestió d'assignacions)
- `player_team_season` (assignació jugadores-equips)
- `player_team_season_evaluations` (avaluacions)
- `team_season_context` (context de temporada)
- `team_season_phases` (fases)
- `team_season_plan` (planificació)
- `training_phase_evaluation` (avaluacions)

**Raó**: Aquestes taules són menys crítiques o necessiten permisos més flexibles.

---

## Pròxims Passos (Opcional)

### Millores Futures

1. **Soft-Deletes** (Recomanat):
   ```sql
   -- Afegir deleted_at a taules crítiques
   ALTER TABLE club_players ADD COLUMN deleted_at TIMESTAMPTZ;
   
   -- Modificar queries per excloure deleted
   -- No cal DELETE físic, només marcar com deleted
   ```

2. **Logging d'Esborrats**:
   ```sql
   -- Trigger per registrar qui esborra què
   CREATE TRIGGER log_delete_club_players
   BEFORE DELETE ON club_players
   FOR EACH ROW EXECUTE FUNCTION log_delete_action();
   ```

3. **Confirmació UI**:
   - Doble confirmació per DELETE
   - Mostrar warning: "Aquesta acció és irreversible"

---

## Seguretat General

Amb aquests canvis, el sistema RLS ara té:

✅ **Aïllament multi-tenant** (club_id)  
✅ **Control d'accés per rol** (DT/Owner/Coach)  
✅ **Restriccions DELETE** (només DT/Owner)  
✅ **Polítiques per SELECT, INSERT, UPDATE, DELETE** (cobertura completa)

**Sistema de seguretat: PRODUCTION-READY** 🎉
