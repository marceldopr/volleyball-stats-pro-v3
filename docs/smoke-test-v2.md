# Smoke Test V2 - LiveMatchScoutingV2

**Duració estimada**: 10-15 minuts  
**Objectiu**: Verificar fluxos crítics després dels refactors de hooks

---

## Precondicions

- [ ] Aplicació en mode desenvolupament (`npm run dev`)
- [ ] Base de dades accessible (Supabase)
- [ ] Temporada activa amb equip configurat
- [ ] Mínim 12 jugadores disponibles (6 titulars + 6 suplents)

---

## Test Cases

### TC1: Validació C5 - Sense Convocatòria
**Objectiu**: Verificar guard C5 (no entrar sense jugadores)

1. Crear un partit nou (sense convocatòria)
2. Intentar "Ver en Vivo"
3. **EXPECT**: Toast error + redirect a `/matches`
4. **PASS/FAIL**: ___

---

### TC2: Flux Complet - Partit 3 Sets
**Objectiu**: Flux bàsic de principi a fi

**Setup**:
1. Crear partit amb convocatòria (12+ jugadores)
2. "Ver en Vivo"

**Steps**:
1. [ ] Modal starters s'obre automàticament
2. [ ] Seleccionar 6 titulars + líbero (si set 1, triar qui serveix)
3. [ ] Confirmar → modal tanca → rotació visible amb 6 jugadores
4. [ ] Registrar punt (botó "Punto ataque") → s'obre modal selecció jugadora
5. [ ] Seleccionar jugadora → punt registra (score +1)
6. [ ] Registrar 25 punts (o els que calguin) → modal "Resumen de Set" s'obre
7. [ ] Confirmar set → nou set comença
8. [ ] Repetir set 2 (starters ja estan) → finalitzar set 2
9. [ ] Set 3 → finalitzar partit (2-0 o 2-1)
10. [ ] Modal "Match Finished" apareix amb estadístiques
11. [ ] Clicar "Ver Análisis" → redirigeix a anàlisi
12. [ ] Tornar a `/matches` → partit mostra status "finished"

**PASS/FAIL**: ___

---

### TC3: Timeouts - Límit 2 per Equip/Set
**Objectiu**: Verificar límit FIVB de timeouts

1. Entrar partit actiu
2. Clicar botó "T.M." local → 1r cercle s'il·lumina
3. Clicar botó "T.M." local → 2n cercle s'il·lumina
4. **EXPECT**: Botó disabled (opacitat 30%)
5. Avançar al següent set
6. **EXPECT**: Cercles reset a buit, botó enabled
7. **PASS/FAIL**: ___

---

### TC4: Substitució Regular
**Objectiu**: Substitució bàsica funciona

1. Partit actiu amb lineup configurat
2. Clicar botó "CAMBIO" (banc inferior)
3. Modal substitució s'obre amb:
   - Rotació actual (6 jugadores)
   - Jugadores al banc
4. Seleccionar jugadora on-court → seleccionar suplent
5. Confirmar substitució
6. **EXPECT**: 
   - Modal tanca
   - Rotació actualitzada amb nova jugadora
   - Timeline mostra "Cambio"
7. **PASS/FAIL**: ___

---

### TC5: Swap Líbero Instantani
**Objectiu**: Botó líbero ràpid funciona

1. Partit actiu amb líbero seleccionat
2. Clicar botó "LÍBERO" (banc inferior, purple)
3. **EXPECT**: 
   - Líbero entra/surt automàticament
   - NO s'obre modal
   - Rotació actualitzada
   - Timeline mostra "Cambio líbero"
4. **PASS/FAIL**: ___

---

### TC6: Recepció Modal - Auto-open
**Objectiu**: Modal recepció s'obre automàticament

1. Estat: rival està servint
2. Registrar "Punto ataque" (nostre)
3. **EXPECT**: 
   - Modal recepció s'obre
   - 6 jugadores visibles (rotació rebedora)
   - Escala 0-4
4. Seleccionar jugadora + rating
5. **EXPECT**: Modal tanca, punt registrat
6. **PASS/FAIL**: ___

---

### TC7: Set 5 - Elecció de Servei
**Objectiu**: Set decisiu demana qui serveix

1. Arribar a set 5 (2-2)
2. Modal starters s'obre
3. **EXPECT**: 
   - Botons "Servimos" / "Recibimos" visibles
   - Obligatori seleccionar abans de continuar
4. Triar i confirmar
5. **EXPECT**: Set 5 comença amb elecció correcta
6. **PASS/FAIL**: ___

---

### TC8: Undo Després de Substitució
**Objectiu**: Undo reverteix substitució

1. Fer una substitució
2. Clicar botó "DESHACER" (banc inferior)
3. **EXPECT**: 
   - Jugadora anterior torna
   - Timeline event eliminat
   - Comptador de substitucions correcte
4. **PASS/FAIL**: ___

---

### TC9: Exit amb Save
**Objectiu**: Sortir i guardar estat

1. Partit actiu (mid-set)
2. Clicar botó "SALIR" (banc inferior, vermell)
3. Modal "Exit" s'obre
4. Confirmar "Guardar y salir"
5. **EXPECT**: 
   - Redirigeix a `/matches`
   - Partit mostra status "in_progress"
6. Reobrir "Ver en Vivo"
7. **EXPECT**: 
   - Score/set correctes
   - Timeline intacta
   - Rotació idèntica
8. **PASS/FAIL**: ___

---

### TC10: Match Finished - Auto-save
**Objectiu**: Partit finalitzat es guarda automàticament

1. Finalitzar partit (ex: 2-0)
2. Modal "Match Finished" amb stats
3. Tancar modal (o clicar fora)
4. **EXPECT**: 
   - Banner "Read-only" apareix
   - Botons disabled
   - Botó UNDO actiu
5. Sortir i tornar a `/matches`
6. **EXPECT**: Status = "finished", resultat visible
7. **PASS/FAIL**: ___

---

## Edge Cases Crítics

### E1: Undo a Inici de Set
1. Iniciar set → registrar 1 punt
2. Undo
3. **EXPECT**: Encara al mateix set, score 0-0
4. **PASS/FAIL**: ___

### E2: Bottom Actions amb Match Finished
1. Partit finalitzat (read-only)
2. **EXPECT**: 
   - Botó CAMBIO disabled
   - Botó LÍBERO disabled
   - Botó DESHACER enabled (si hi ha events)
   - Botó SALIR enabled
3. **PASS/FAIL**: ___

### E3: Timeline Toggle
1. Clicar botó timeline (centre, banc inferior)
2. **EXPECT**: Timeline s'expandeix/col·lapsa
3. Últim event mostra info jugadora (si n'hi ha)
4. **PASS/FAIL**: ___

---

## Notes Finals

- **Total Pass**: ___ / 13
- **Blockers trobats**: _______________
- **Observacions**: _______________
