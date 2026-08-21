// Torneos: generacion de cuadros con seeds, calendarizacion de rondas por dia, y ATP Finals (round robin)
var TC = (typeof TC !== 'undefined') ? TC : {};
(function(){

  // Posiciones clasicas de seeds en el cuadro: slot i -> numero de seed
  function seedSlots(n){
    var arr = [1];
    while(arr.length < n){
      var m = arr.length * 2 + 1, next = [];
      for(var i = 0; i < arr.length; i++){ next.push(arr[i], m - arr[i]); }
      arr = next;
    }
    return arr;
  }

  function shuffle(a, rng){
    for(var i = a.length - 1; i > 0; i--){
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // entrants: array de ids ORDENADOS por ranking (mejor primero). Devuelve array de slots.
  TC.makeDraw = function(entrants, drawSize, rng){
    var numSeeds = Math.max(4, Math.floor(drawSize / 4));
    var slots = seedSlots(drawSize);
    var draw = new Array(drawSize).fill(null);
    var rest = entrants.slice(numSeeds);
    shuffle(rest, rng);
    var ri = 0;
    for(var i = 0; i < drawSize; i++){
      var seedNum = slots[i];
      if(seedNum <= numSeeds && seedNum <= entrants.length){
        draw[i] = entrants[seedNum - 1];
      } else {
        draw[i] = ri < rest.length ? rest[ri++] : null; // null = BYE
      }
    }
    return draw;
  };

  // Dias (offset desde inicio del torneo) en que se juega cada ronda
  TC.roundDays = function(drawSize, dur){
    var rounds = Math.round(Math.log(drawSize) / Math.log(2));
    // en eventos largos (Masters de 12 dias, Grand Slams) el cuadro principal debuta
    // el dia 1: la final del torneo anterior puede caer en el dia 0 (Montreal->Cincinnati)
    var lead = dur >= 11 ? 1 : 0;
    var days = [];
    for(var r = 0; r < rounds; r++){
      days.push(lead + Math.round(r * (dur - 1 - lead) / Math.max(1, rounds - 1)));
    }
    return days;
  };

  // Crea la instancia de un torneo activo
  TC.createTournament = function(def, startDay, entrants, rng){
    var cat = TC.CATS[def.cat];
    var drawSize = cat.draw;
    if(def.cat === 'FINALS'){
      return TC.createFinals(def, startDay, entrants, rng);
    }
    var draw = TC.makeDraw(entrants, drawSize, rng);
    return {
      id: def.id, name: def.name, cat: def.cat, surf: def.surf,
      startDay: startDay, endDay: startDay + def.dur - 1, dur: def.dur,
      drawSize: drawSize,
      roundDays: TC.roundDays(drawSize, def.dur),
      bracket: [draw],          // bracket[r] = ids de esa ronda
      results: [],              // results[r] = [{p:[id,id], w:id, score:[...], ...}]
      currentRound: 0,
      done: false,
      bestOf: def.cat === 'GS' ? 5 : 3
    };
  };

  TC.roundLabel = function(t, r){
    var players = t.drawSize / Math.pow(2, r);
    if(players <= 2) return 'Final';
    if(players <= 4) return 'Semifinal';
    if(players <= 8) return 'Cuartos';
    if(players <= 16) return 'Octavos';
    return 'Ronda de ' + players;
  };

  // ===== ATP Finals: 2 grupos de 4, round robin + semis + final =====
  TC.createFinals = function(def, startDay, entrants, rng){
    // entrants: top 8 en orden de ranking
    var gA = [entrants[0], entrants[3], entrants[4], entrants[7]];
    var gB = [entrants[1], entrants[2], entrants[5], entrants[6]];
    return {
      id: def.id, name: def.name, cat: 'FINALS', surf: def.surf,
      startDay: startDay, endDay: startDay + def.dur - 1, dur: def.dur,
      drawSize: 8, isFinals: true,
      groups: [gA, gB],
      rrWins: {}, rrPlayed: {},
      // 3 jornadas de RR (dias 0,2,4), semis dia 6, final dia 7
      roundDays: [0, 2, 4, 6, 7],
      rrPairings: [
        [[0,1],[2,3]],  // jornada 1 (indices dentro del grupo)
        [[0,2],[1,3]],  // jornada 2
        [[0,3],[1,2]]   // jornada 3
      ],
      results: [], currentRound: 0, done: false, bestOf: 3,
      sf: null, finalMatch: null, champion: null
    };
  };

  // Puntos de Finals: 200 por victoria RR, +400 semi, +500 final
  TC.finalsPoints = function(t, id){
    var pts = (t.rrWins[id] || 0) * 200;
    if(t.sf){
      if(t.sfWinners && t.sfWinners.indexOf(id) >= 0) pts += 400;
    }
    if(t.champion === id) pts += 500;
    return pts;
  };
})();
