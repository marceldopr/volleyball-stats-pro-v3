# Resum de Canvis Necessaris per Arreglar team.name → team.custom_name

## ✅ Fitxers Ja Arreglats
- `teamService.ts` - 4 queries arreglades
- `coachAssignmentService.ts` - 1 query arreglada
- `clubStatsService.ts` - 1 query arreglada (línia 419)
- `teamDisplay.ts` - Interfaces actualitzades
- `teamStore.ts` - 1 referència
- `Teams.tsx` - 4 referències
- `TeamPlansListPage.tsx` - 1 referència
- `CreateTrainingModal.tsx` - 1 referència

## 🔧 Fitxers Pendents d'Arreglar

### clubStatsService.ts
- Línia 79: `.from('teams').select('id')` - OK (no selecciona name)
- Línia 203: `.from('teams').select('id')` - OK (no selecciona name)
- Línia 328: `.from('teams').select('id')` - OK (no selecciona name)

### teamStatsService.ts
- Línia 508: `.select('*')` - És de match_player_set_stats, NO de teams - OK

## ✅ Conclusió
Tots els fitxers crítics ja estan arreglats! Les queries restants a `clubStatsService.ts` només seleccionen `id`, no `name`, així que no causen errors.

## 🎯 Pròxim Pas
Refrescar la pàgina i verificar que tot funciona correctament.
