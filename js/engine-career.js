// Carrera del jugador humano: creacion, acciones, inscripciones, partidos, guardado
var TC = (typeof TC !== 'undefined') ? TC : {};
(function(){

  var SAVE_KEY = 'tenniscareer_save_v1';

  // Presupuesto total de puntos de atributos al crear el personaje
  TC.ATTR_BUDGET = 53;
  TC.ATTR_MIN = 3.0;
  TC.ATTR_MAX = 6.5;

  TC.ARCHETYPES = {
    sacador:   {label:'Sacador',      desc:'Saque y potencia. Letal en pistas rapidas.',
                attrs:{fh:5.8, bh:4.7, vol:5.6, dro:4.8, spd:4.7, sta:4.8, srv:6.5, pow:6.3, ret:4.8, con:5.0}},
    rallista:  {label:'Peloteador',   desc:'Solido de fondo, consistente. Clasico de polvo.',
                attrs:{fh:6.0, bh:5.8, vol:4.4, dro:5.0, spd:5.2, sta:5.7, srv:4.8, pow:4.8, ret:5.2, con:6.1}},
    contra:    {label:'Contraatacador', desc:'Velocidad, resto y aguante. Devuelve todo.',
                attrs:{fh:5.2, bh:5.3, vol:4.6, dro:4.8, spd:6.2, sta:6.2, srv:4.6, pow:4.6, ret:6.1, con:5.4}},
    completo:  {label:'Completo',     desc:'Sin puntos flacos ni fuertes. Adaptable.',
                attrs:{fh:5.3, bh:5.3, vol:5.3, dro:5.3, spd:5.3, sta:5.3, srv:5.3, pow:5.3, ret:5.3, con:5.3}}
  };

  // Crea el estado completo de una nueva carrera
  TC.newCareer = function(cfg, onProgress){
    var seed = (cfg.seed != null) ? cfg.seed : Math.floor(Math.random() * 2147483647);
    var w = TC.createWorld(seed);
    var state = {
      ver: 1,
      seed: seed,
      day: -365,               // pre-simulamos la temporada anterior
      players: w.players,
      humanId: null,
      schedule: [], active: [], finished: [],
      registrations: [],
      pendingMatch: null,
      action: 'train', trainFocus: 'fh',
      news: [], rankHistory: [], archive: [],
      seasonYear: null,
      career: {startYear: 2026, titles: [], bestRank: 9999, finalsQualified: 0, retired: false}
    };
    state.rng = TC.mulberry32(seed ^ 0x9E3779B9);

    // pre-simular la temporada 2025 para que el ranking arranque vivo
    TC.presimSeason(state);

    // dejar lista la temporada 2026 (envejecimiento + calendario) antes de que arranque la carrera
    TC._seasonRollover(state, state.rng);
    TC.buildSeason(state, 2026);

    // crear al humano
    var arch = TC.ARCHETYPES[cfg.archetype] || TC.ARCHETYPES.completo;
    var h = {id: state.players.length, name: cfg.name, country: cfg.country, age: 17, real: false,
             pref: cfg.pref || 'hard', energy: 100, form: 0, injury: null,
             results: [], pts: 0, rank: 9999, prevRank: 9999, wins: 0, losses: 0, titles: 0, curT: null,
             isHuman: true, hand: cfg.hand === 'Z' ? 'Z' : 'D'};
    var k;
    if(cfg.attrs){
      // atributos armados a mano: respetar limites por stat y presupuesto global
      var sum = 0;
      for(k in arch.attrs){
        var v = Math.max(TC.ATTR_MIN, Math.min(TC.ATTR_MAX, Math.round((cfg.attrs[k] || 4.5) * 10) / 10));
        h[k] = v; sum += v;
      }
      if(sum > TC.ATTR_BUDGET + 0.001){
        var scale = TC.ATTR_BUDGET / sum;
        for(k in arch.attrs) h[k] = Math.max(TC.ATTR_MIN, Math.round(h[k] * scale * 10) / 10);
      }
    } else {
      for(k in arch.attrs) h[k] = arch.attrs[k];
    }
    var snap = {};
    for(k in arch.attrs) snap[k] = h[k];
    h.prev = snap;
    state.players.push(h);
    state.humanId = h.id;

    TC.recomputeRankings(state);
    TC.pushNews(state, 'Pretemporada: ya podes inscribirte a los torneos de enero.', true);
    TC.pushNews(state, 'Empieza tu carrera profesional, ' + cfg.name + '. Tenes 17 anios. A demostrar!', true);
    return state;
  };

  // ================== INSCRIPCIONES ==================
  // Puede inscribirse? Devuelve {ok, reason}
  TC.canRegister = function(state, def){
    var h = state.players[state.humanId];
    var cat = TC.CATS[def.cat];
    if(def.started) return {ok:false, reason:'Ya arranco'};
    if(state.registrations.indexOf(def.id) >= 0) return {ok:false, reason:'Ya inscripto'};
    if(def.startDay - state.day < 2) return {ok:false, reason:'Cierre de inscripcion pasado'};
    if(def.cat === 'FINALS') return {ok:false, reason:'Clasificacion automatica (top 8)'};
    if(h.rank < cat.minRank) return {ok:false, reason:'Tu ranking es demasiado alto para esta categoria'};
    if(h.rank > cat.maxRank) return {ok:false, reason:'Necesitas ranking ' + cat.maxRank + ' o mejor'};
    if(h.injury && state.day + h.injury.days > def.startDay) return {ok:false, reason:'Lesionado hasta despues del inicio'};
    // superposicion de fechas con otras inscripciones o torneo en curso
    var conflicts = TC.overlapsWith(state, def);
    if(conflicts) return {ok:false, reason:'Se superpone con ' + conflicts};
    return {ok:true};
  };

  TC.overlapsWith = function(state, def){
    var s1 = def.startDay, e1 = def.startDay + def.dur - 1;
    // contra otras inscripciones
    for(var i = 0; i < state.registrations.length; i++){
      var other = findDef(state, state.registrations[i]);
      if(!other || other.id === def.id) continue;
      var s2 = other.startDay, e2 = other.startDay + other.dur - 1;
      if(s1 <= e2 && s2 <= e1) return other.name;
    }
    // contra el torneo que estoy jugando
    var h = state.players[state.humanId];
    if(h.curT){
      var t = findActive(state, h.curT);
      if(t && s1 <= t.endDay && t.startDay <= e1) return t.name;
    }
    return null;
  };

  function findDef(state, id){
    for(var i = 0; i < state.schedule.length; i++) if(state.schedule[i].id === id) return state.schedule[i];
    return null;
  }
  function findActive(state, id){
    for(var i = 0; i < state.active.length; i++) if(state.active[i].id === id) return state.active[i];
    return null;
  }
  TC.findDef = findDef;
  TC.findActive = findActive;

  // Aviso de dificultad: compara tu nivel contra el cuadro estimado del torneo
  TC.registerAdvice = function(state, def){
    var h = state.players[state.humanId];
    var ids = TC.previewEntrants(state, def);
    var myOv = TC.overall(h);
    var better = 0, n = 0;
    for(var i = 0; i < ids.length; i++){
      if(ids[i] === state.humanId || ids[i] == null) continue;
      n++;
      if(TC.overall(state.players[ids[i]]) > myOv) better++;
    }
    if(n < 8) return null;
    var pct = Math.round(better / n * 100);
    if(pct >= 80) return {level:'hard', pct: pct,
      msg:'Cuadro muy dificil: el ' + pct + '% de los inscriptos juega mejor que vos. Lo mas probable es que pierdas temprano.'};
    if(pct <= 15) return {level:'easy', pct: pct,
      msg:'Estas sobreclasificado: solo el ' + pct + '% del cuadro esta a tu altura o mejor. Vas a ganar pocos puntos para tu nivel.'};
    return null;
  };

  TC.register = function(state, defId){
    var def = findDef(state, defId);
    if(!def) return {ok:false, reason:'No existe'};
    var chk = TC.canRegister(state, def);
    if(!chk.ok) return chk;
    state.registrations.push(defId);
    return {ok:true};
  };

  TC.unregister = function(state, defId){
    var i = state.registrations.indexOf(defId);
    if(i >= 0) state.registrations.splice(i, 1);
  };

  // Limpia inscripciones de torneos ya empezados/pasados
  TC.cleanRegistrations = function(state){
    state.registrations = state.registrations.filter(function(id){
      var def = findDef(state, id);
      return def && !def.started && def.startDay >= state.day;
    });
  };

  // ================== AVANCE ==================
  // Avanza hasta el proximo evento. Devuelve {type: 'match'|'week'|'news', ...}
  TC.advance = function(state, mode){
    var maxDays = mode === 'week' ? 7 : (mode === 'nextTournament' ? 120 : 1);
    var startDay = state.day;
    for(var i = 0; i < maxDays; i++){
      if(state.pendingMatch) return {type:'match'};
      var r = TC.stepDay(state);
      TC.cleanRegistrations(state);
      if(r === 'pending') return {type:'match'};
      var h = state.players[state.humanId];
      if(mode === 'nextTournament'){
        // parar cuando arranca un torneo en el que estoy inscripto/jugando
        if(h.curT !== null) return {type:'tournament'};
        if(state.registrations.length === 0) {
          if(state.day - startDay >= 7) return {type:'idle'};
        }
      }
    }
    return {type: mode === 'week' ? 'week' : 'day'};
  };

  // Juega el partido pendiente del humano. Devuelve el registro para la UI.
  TC.playPendingMatch = function(state){
    var pm = state.pendingMatch;
    if(!pm) return null;
    var inst = findActive(state, pm.tid);
    var rng = state.rng;
    var m = TC.playWorldMatch(state, state.humanId, pm.oppId, inst, rng);

    // completar el registro pendiente
    var recs = inst.pendingRecords;
    for(var i = 0; i < recs.length; i++){
      if(recs[i].human && recs[i].w == null){
        recs[i].w = m.winnerId;
        recs[i].sc = m.score;
        break;
      }
    }
    state.pendingMatch = null;

    // cerrar la ronda (ahora sin pendientes)
    if(inst.isFinals){
      TC._finishFinalsDayPublic(state, inst, pm.round, recs, rng);
    } else {
      TC._finishRoundPublic(state, inst, pm.round, recs, rng);
    }

    var h = state.players[state.humanId];
    var won = m.winnerId === state.humanId;
    var injuryMsg = null;
    if(m.injury && m.injury.id === state.humanId){
      injuryMsg = m.injury.injury;
      TC.pushNews(state, 'Lesion: ' + injuryMsg.name + '. Parado ' + injuryMsg.days + ' dias.', true);
    }
    if(won && inst.done && inst.championId === state.humanId){
      state.career.titles.push({name: inst.name, cat: inst.cat, year: TC.dateOf(state.day).getUTCFullYear(), surf: inst.surf});
    }

    // el resto del dia sigue: rondas de otros torneos que quedaron sin jugar, y cierre del dia
    TC.playDayRounds(state);
    TC.finishDay(state);

    return {
      won: won,
      score: TC.scoreString(m.result, false), // siempre desde el punto de vista del jugador humano
      opp: state.players[pm.oppId],
      inst: inst,
      round: pm.round,
      injury: injuryMsg,
      duration: m.result.duration,
      energyAfter: h.energy,
      xp: (m.gains && m.gains[state.humanId]) || [],
      isChampion: inst.championId === state.humanId && inst.done
    };
  };

  // ================== GUARDADO ==================
  TC.save = function(state){
    try {
      var copy = {};
      for(var k in state){ if(k !== 'rng') copy[k] = state[k]; }
      copy.rngSeedNext = Math.floor(state.rng() * 2147483647); // continuidad aproximada
      localStorage.setItem(SAVE_KEY, JSON.stringify(copy));
      return true;
    } catch(e){ return false; }
  };

  TC.load = function(){
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if(!raw) return null;
      var state = JSON.parse(raw);
      state.rng = TC.mulberry32(state.rngSeedNext || 99999);
      // compat con partidas viejas: sortear potencial/declive si no existen
      if(state.players && state.players.length && state.players[0].pot === undefined){
        var rng = TC.mulberry32((state.seed || 1) ^ 0xBADA55);
        for(var i = 0; i < state.players.length; i++){
          if(!state.players[i].isHuman) TC._assignPotential(state.players[i], rng);
        }
      }
      // compat: mano habil
      if(state.players && state.players.length && state.players[0].hand === undefined){
        var rng2 = TC.mulberry32((state.seed || 1) ^ 0x1E77);
        for(var j = 0; j < state.players.length; j++){
          state.players[j].hand = state.players[j].isHuman ? 'D' : (rng2() < 0.13 ? 'Z' : 'D');
        }
      }
      return state;
    } catch(e){ return null; }
  };

  TC.hasSave = function(){ return !!localStorage.getItem(SAVE_KEY); };
  TC.deleteSave = function(){ localStorage.removeItem(SAVE_KEY); };
})();
