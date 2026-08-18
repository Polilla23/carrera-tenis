# Carrera de Tenis

Juego web de carrera tenística: arrancás con 17 años sin ranking y tenés que llegar
a lo más alto jugando futures ITF, challengers y el circuito ATP completo.

Sucesor del `Sim_v3.1` original (2011): reusa su plantel de jugadores y el espíritu
de sus atributos, pero con un motor de simulación nuevo.

## Cómo jugar

**Opción 1:** doble click en `index.html` (funciona en Chrome/Edge/Firefox).

**Opción 2 (si el navegador bloquea algo):**
```
node server.js
```
y abrir http://localhost:8123

La partida se guarda sola en el navegador (localStorage) cada vez que avanzás.

## El juego

- **Calendario ATP real** (estructura temporada 2026): 4 Grand Slams, 9 Masters 1000,
  ATP 500/250, ATP Finals, más challengers y futures ITF procedurales todas las semanas.
- Los torneos **duran días reales** (los GS 14 días, los Masters 12, etc.) y pueden
  superponerse: solo podés inscribirte si no se pisan las fechas y tu ranking entra en el corte.
- **Ranking ATP de 52 semanas**: los puntos vencen al año exacto, cuentan tus mejores 18 resultados.
- **Energía**: cada partido cansa según sets y games jugados (y la superficie). Entrenar
  te deja a media máquina; descansar te recupera. Llegar fundido a un torneo se paga.
- **Lesiones**: el riesgo sube con el cansancio y la baja resistencia. De días a meses de baja.
- **Forma**: rachas de confianza que suben con victorias y decaen solas.
- **Progresión**: entrenás un atributo a la vez. De joven (17-20) crecés rápido; después
  de los 30, el físico decae. Cada partido jugado da experiencia (más en categorías grandes,
  más si ganás) y se muestra qué mejoraste al terminar.
- **Visor de torneos**: click en cualquier torneo del calendario para ver inscriptos con
  seeds y ranking, el cuadro completo ronda por ronda, y el reparto de puntos.
- **Ficha de jugadores**: click en cualquier nombre (ranking, cuadros, rivales) para ver
  sus atributos, forma, energía, récord y últimos resultados.
- El **mundo vive solo**: ~620 jugadores IA juegan todos los torneos, entrenan cada semana
  (los jóvenes mejoran, los veteranos decaen), se cansan, se lesionan (las lesiones largas
  dejan secuela física), envejecen, se retiran y son reemplazados por juveniles.

## El motor (para curiosos)

- Modelo punto a punto al saque: probabilidad base por superficie (~64% en dura, como la ATP
  real) ajustada por saque/resto/fondo de ambos jugadores, cansancio dentro del partido,
  energía previa, forma y "día bueno/malo".
- Calibrado: jugadores iguales ganan 50%, 1 punto de atributo de ventaja ≈ 79% de victoria,
  el favorito es más sólido al mejor de 5 que al mejor de 3.
- 10.000 partidos se simulan en ~60ms: el mundo entero avanza sin que lo notes.

## Archivos

| Archivo | Qué hace |
|---|---|
| `js/data-roster.js` | Plantel extraído del Sim_v3.1 original (161 jugadores) |
| `js/data-names.js` | Generador de nombres para el resto del circuito |
| `js/data-calendar.js` | Calendario ATP + categorías, puntos y cortes de entrada |
| `js/engine-match.js` | Motor de partidos punto a punto |
| `js/engine-tournament.js` | Cuadros, seeds, rondas por día, ATP Finals (round robin) |
| `js/engine-world.js` | Mundo: tick diario, rankings, lesiones, envejecimiento |
| `js/engine-career.js` | Carrera: creación, inscripciones, guardado |
| `js/ui.js` | Toda la interfaz |
