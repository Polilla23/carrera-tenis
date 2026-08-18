// Mundo: jugadores, calendario de temporada, tick diario, rankings, lesiones, envejecimiento
var TC = (typeof TC !== 'undefined') ? TC : {};
(function(){

  var DAY0_UTC = Date.UTC(2026, 0, 1); // dia 0 = 1 de enero 2026 (arranque de carrera)
  TC.dateOf = function(day){ return new Date(DAY0_UTC + day * 86400000); };
  TC.dayOf = function(y, m, d){ return Math.round((Date.UTC(y, m - 1, d) - DAY0_UTC) / 86400000); };
  var MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  TC.fmtDate = function(day){
    var dt = TC.dateOf(day);
    return dt.getUTCDate() + ' ' + MESES[dt.getUTCMonth()].slice(0,3) + ' ' + dt.getUTCFullYear();
  };
  TC.fmtRange = function(a, b){
    var d1 = TC.dateOf(a), d2 = TC.dateOf(b);
    if(d1.getUTCMonth() === d2.getUTCMonth())
      return d1.getUTCDate() + '–' + d2.getUTCDate() + ' ' + MESES[d1.getUTCMonth()];
    return d1.getUTCDate() + ' ' + MESES[d1.getUTCMonth()].slice(0,3) + ' – ' + d2.getUTCDate() + ' ' + MESES[d2.getUTCMonth()].slice(0,3);
  };
  TC.MESES = MESES;

  function mod7(d){ return ((d % 7) + 7) % 7; }

  // ================== GENERACION DEL MUNDO ==================
  var ATTRS = ['fh','bh','vol','dro','spd','sta','srv','pow','ret','con'];
  TC.ATTRS = ATTRS;
  TC.ATTR_LABEL = {fh:'Derecha', bh:'Reves', vol:'Volea', dro:'Dejada', spd:'Velocidad', sta:'Resistencia', srv:'Servicio', pow:'Potencia', ret:'Resto', con:'Consistencia'};

  function rnd(rng, a, b){ return a + rng() * (b - a); }

  function genPlayer(rng, tier, id){
    var nm = TC.genName(rng);
    var base, age;
    if(tier === 'top'){ base = rnd(rng, 6.6, 8.0); age = Math.floor(rnd(rng, 21, 31)); }
    else if(tier === 'mid'){ base = rnd(rng, 5.2, 6.8); age = Math.floor(rnd(rng, 19, 32)); }
    else if(tier === 'low'){ base = rnd(rng, 3.8, 5.6); age = Math.floor(rnd(rng, 17, 27)); }
    else { base = rnd(rng, 3.2, 4.9); age = Math.floor(rnd(rng, 16, 22)); } // juveniles
    var p = {id:id, name:nm.name, country:nm.country, age:age, real:false};
    for(var i = 0; i < ATTRS.length; i++){
      p[ATTRS[i]] = Math.round(Math.max(1.5, Math.min(9.7, base + rnd(rng, -1.1, 1.1))) * 10) / 10;
    }
    var surfs = ['hard','hard','clay','clay','grass','indoor','all'];
    p.pref = surfs[Math.floor(rng() * surfs.length)];
    p.hand = rng() < 0.13 ? 'Z' : 'D'; // ~13% zurdos, como en el circuito real
    p.ht = rollHeight(rng);
    return p;
  }

  // Altura en cm: campana alrededor de 1.85 con alguna torre ocasional
  function rollHeight(rng){
    var ht = Math.round(184 + (rng() + rng() - 1) * 15);
    if(rng() < 0.06) ht += 6 + Math.round(rng() * 6); // los sacadores gigantes existen
    return Math.max(165, Math.min(211, ht));
  }
  TC._rollHeight = rollHeight;

  // Potencial: techo de nivel sorteado por partida. Estrellas con rango chico,
  // desconocidos con rango amplio (y a veces una joya oculta). declAge: cuando arranca el declive.
  function assignPotential(p, rng){
    var ov = TC.overall(p);
    var ageF = p.age <= 21 ? 1.4 : (p.age <= 24 ? 1.0 : (p.age <= 27 ? 0.5 : 0.15));
    var spread = (10 - ov) * 0.25; // cuanto mas crack, menos margen de sorpresa
    var pot = ov + (0.05 + rng() * spread) * ageF;
    if(p.age <= 23 && rng() < 0.08) pot += 0.8 + rng() * 1.4; // joya oculta
    p.pot = Math.min(9.6, Math.round(pot * 100) / 100);
    p.declAge = 30 + Math.floor(rng() * 5); // el fisico empieza a ceder entre los 30 y los 34
  }
  TC._assignPotential = assignPotential;

  TC.createWorld = function(seed){
    var rng = mulberry32(seed || 12345);
    var players = [];
    // Plantel real del Sim_v3.1 original
    for(var i = 0; i < TC.ROSTER.length; i++){
      var r = TC.ROSTER[i];
      var p = {id: players.length, name: r.n, country: r.c, real: true,
               age: Math.floor(rnd(rng, 22, 33)), pref: r.pref,
               hand: rng() < 0.13 ? 'Z' : 'D', ht: rollHeight(rng)};
      for(var a = 0; a < ATTRS.length; a++) p[ATTRS[a]] = r[ATTRS[a]];
      players.push(p);
    }
    // Ficticios para dar profundidad al circuito
    for(i = 0; i < 40; i++)  players.push(genPlayer(rng, 'top', players.length));
    for(i = 0; i < 130; i++) players.push(genPlayer(rng, 'mid', players.length));
    for(i = 0; i < 140; i++) players.push(genPlayer(rng, 'low', players.length));
    for(i = 0; i < 150; i++) players.push(genPlayer(rng, 'junior', players.length));

    for(i = 0; i < players.length; i++){
      var pl = players[i];
      pl.energy = 100; pl.form = Math.round(rnd(rng, -0.3, 0.3) * 100) / 100;
      pl.injury = null; pl.results = []; pl.pts = 0; pl.rank = 9999; pl.prevRank = 9999;
      pl.wins = 0; pl.losses = 0; pl.titles = 0; pl.curT = null;
      var snap = {};
      for(var a2 = 0; a2 < ATTRS.length; a2++) snap[ATTRS[a2]] = pl[ATTRS[a2]];
      pl.prev = snap;
      assignPotential(pl, rng);
    }
    return {players: players, rngState: (seed || 12345) >>> 0};
  };

  function mulberry32(a){
    return function(){
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  TC.mulberry32 = mulberry32;

  // ================== CALENDARIO DE TEMPORADA ==================
  TC.buildSeason = function(state, year){
    var sched = [];
    for(var i = 0; i < TC.ATP_CALENDAR.length; i++){
      var def = TC.ATP_CALENDAR[i];
      sched.push({
        id: def.id + '_' + year, baseId: def.id, name: def.name, cat: def.cat,
        surf: def.surf, startDay: TC.dayOf(year, def.m, def.d), dur: def.dur,
        region: TC.EVENT_REGION[def.id] || null
      });
    }
    // Challengers y Futures procedurales: cada semana del anio (ene-nov)
    var yStart = TC.dayOf(year, 1, 1);
    var nCH = TC.CH_CITIES.length, nIT = TC.ITF_CITIES.length;
    for(var w = 0; w < 46; w++){
      var start = yStart + w * 7;
      var month = TC.dateOf(start).getUTCMonth() + 1;
      var surfs = TC.SEASON_SURF[month] || ['hard','clay','hard'];
      sched.push({id:'ch125_' + year + '_' + w, baseId:'ch125_' + w, name:'Challenger de ' + TC.CH_CITIES[(w * 2) % nCH],
                  cat:'CH125', surf: surfs[0], startDay: start, dur: 7});
      sched.push({id:'ch75_' + year + '_' + w, baseId:'ch75_' + w, name:'Challenger de ' + TC.CH_CITIES[(w * 2 + 1) % nCH],
                  cat:'CH75', surf: surfs[1], startDay: start, dur: 7});
      sched.push({id:'itf25_' + year + '_' + w, baseId:'itf25_' + w, name:'M25 ' + TC.ITF_CITIES[w % nIT],
                  cat:'ITF25', surf: surfs[2], startDay: start, dur: 6});
      sched.push({id:'itf15_' + year + '_' + w, baseId:'itf15_' + w, name:'M15 ' + TC.ITF_CITIES[(w + 11) % nIT],
                  cat:'ITF15', surf: surfs[(w) % 3], startDay: start, dur: 6});
    }
    sched.sort(function(a, b){ return a.startDay - b.startDay || catRank(a.cat) - catRank(b.cat); });
    state.schedule = sched;
    state.seasonYear = year;
  };

  function catRank(c){ return {FINALS:0, GS:1, M1000:2, '500':3, '250':4, CH125:5, CH75:6, ITF25:7, ITF15:8}[c]; }

  // ================== RANKINGS ==================
  TC.recomputeRankings = function(state){
    var cutoff = state.day - 363;
    var ps = state.players, i;
    for(i = 0; i < ps.length; i++){
      var res = ps[i].results, v = [];
      for(var j = 0; j < res.length; j++){
        if(res[j].day > cutoff && res[j].day <= state.day && res[j].pts > 0) v.push(res[j].pts);
      }
      v.sort(function(a, b){ return b - a; });
      var s = 0, n = Math.min(18, v.length);
      for(j = 0; j < n; j++) s += v[j];
      ps[i].pts = s;
    }
    var order = [];
    for(i = 0; i < ps.length; i++) if(ps[i].pts > 0) order.push(ps[i]);
    order.sort(function(a, b){ return b.pts - a.pts || (TC.overall(b) - TC.overall(a)); });
    for(i = 0; i < ps.length; i++){ ps[i].prevRank = ps[i].rank; }
    for(i = 0; i < ps.length; i++){ if(ps[i].pts <= 0) ps[i].rank = 9999; }
    for(i = 0; i < order.length; i++){ order[i].rank = i + 1; }
  };

  // ================== ENTRADA A TORNEOS ==================
  // Region de cada pais (para que la IA prefiera torneos cerca de casa)
  var REGION_OF = {
    ARG:'sam', BRA:'sam', CHI:'sam', URU:'sam', COL:'sam', PER:'sam', ECU:'sam', BOL:'sam', PAR:'sam', VEN:'sam',
    USA:'nam', CAN:'nam', MEX:'nam',
    AUS:'oce', NZL:'oce',
    JPN:'asia', CHN:'asia', KOR:'asia', IND:'asia', TPE:'asia', THA:'asia', INA:'asia', KAZ:'asia', UZB:'asia',
    SUD:'afr', RSA:'afr', MAR:'afr', EGY:'afr', TUN:'afr'
    // el resto (Europa y este europeo) cae en 'eur' por defecto
  };
  function playerRegion(p){ return REGION_OF[p.country] || 'eur'; }

  function strHashNum(s){
    var h = 0;
    for(var i = 0; i < s.length; i++){ h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; }
    return h;
  }
  // ruido determinista por (jugador, torneo): estable dentro de la semana, distinto entre torneos
  function h01(a, b){
    var x = Math.imul(a + 1, 73856093) ^ Math.imul(b + 1, 19349663);
    x = Math.imul(x ^ (x >>> 13), 0x5bd1e995);
    x ^= x >>> 15;
    return (x >>> 0) / 4294967296;
  }

  // Entre torneos "hermanos" (misma categoria, misma semana), cada jugador elige el suyo:
  // superficie preferida + cercania geografica + gusto personal
  function chooseSibling(p, sibs){
    var best = null, bestScore = -Infinity;
    for(var i = 0; i < sibs.length; i++){
      var s = sibs[i];
      if(s._hn == null) s._hn = strHashNum(s.id);
      var score = h01(p.id, s._hn);                                  // gusto personal (0-1)
      if(s.surf === p.pref) score += 0.7;                             // su superficie
      if(s.region && s.region === playerRegion(p)) score += 0.55;     // cerca de casa
      if(score > bestScore){ bestScore = score; best = s; }
    }
    return best;
  }

  function eligible(p, def, state){
    var cat = TC.CATS[def.cat];
    if(p.injury) return false;
    if(p.curT !== null) return false;
    var rank = p.rank;
    if(rank < cat.minRank) return false;
    if(rank > cat.maxRank) return false;
    return true;
  }

  function startTournament(state, def, rng){
    var cat = TC.CATS[def.cat];
    var human = state.players[state.humanId];
    var humanRegistered = state.registrations.indexOf(def.id) >= 0;
    var entrants = [];

    if(def.cat === 'FINALS'){
      // top 8 del ranking, automatico
      var top = state.players.slice().sort(function(a, b){ return (a.rank || 9999) - (b.rank || 9999); }).slice(0, 8);
      for(var k = 0; k < top.length; k++){ if(top[k].curT === null && !top[k].injury) entrants.push(top[k].id); }
      if(entrants.length < 8){
        var extra = state.players.slice().sort(function(a, b){ return a.rank - b.rank; });
        for(k = 0; k < extra.length && entrants.length < 8; k++){
          if(entrants.indexOf(extra[k].id) < 0 && extra[k].curT === null && !extra[k].injury) entrants.push(extra[k].id);
        }
      }
      if(state.humanId != null && entrants.indexOf(state.humanId) >= 0){
        pushNews(state, 'Te clasificaste a las ATP Finals!', true);
      }
    } else {
      // torneos hermanos: misma categoria y misma semana (el jugador elige uno)
      var sibs = [];
      var sib250 = null;
      for(var si = 0; si < state.schedule.length; si++){
        var sd = state.schedule[si];
        if(sd.startDay !== def.startDay) continue;
        if(sd.cat === def.cat) sibs.push(sd);
        if(def.cat === '500' && sd.cat === '250') sib250 = sd;
      }
      if(def._hn == null) def._hn = strHashNum(def.id);

      var pool = [];
      for(var i = 0; i < state.players.length; i++){
        var p = state.players[i];
        if(p.id === state.humanId) continue;
        if(!eligible(p, def, state)) continue;
        if(p.energy < 42 && def.cat !== 'GS') continue; // la IA se administra
        // los bien rankeados rara vez bajan a jugar categorias menores
        if(cat.idealMin && p.rank < cat.idealMin && rng() > 0.15) continue;
        // si hay varios torneos de esta categoria en la semana, cada uno va al que eligio
        if(sibs.length > 1 && chooseSibling(p, sibs).id !== def.id) continue;
        // algun buen jugador baja del 500 al 250 de la misma semana (preparacion, casa, etc)
        if(sib250 && p.rank <= 60 && h01(p.id + 7919, def._hn) < 0.08) continue;
        // y a veces un jugador simplemente se toma la semana libre
        if(h01(p.id + 104729, def._hn) < 0.06) continue;
        pool.push(p);
      }
      // barajar antes de ordenar: los no rankeados (empate en 9999) entran en orden aleatorio
      for(var s = pool.length - 1; s > 0; s--){
        var sj = Math.floor(rng() * (s + 1));
        var st = pool[s]; pool[s] = pool[sj]; pool[sj] = st;
      }
      pool.sort(function(a, b){ return a.rank - b.rank; });
      var slots = cat.draw - (humanRegistered ? 1 : 0);
      pool = pool.slice(0, slots);
      // si falta gente, completar con "qualifiers" (ranking peor que el corte)
      if(pool.length < slots){
        var quali = [];
        for(i = 0; i < state.players.length; i++){
          var q = state.players[i];
          if(q.id === state.humanId || q.injury || q.curT !== null) continue;
          if(pool.indexOf(q) >= 0) continue;
          if(q.rank < cat.minRank) continue;
          if(q.rank <= cat.maxRank) continue; // ya considerado
          if(q.energy < 35) continue;
          quali.push(q);
        }
        quali.sort(function(a, b){ return a.rank - b.rank; });
        pool = pool.concat(quali.slice(0, slots - pool.length));
      }
      for(i = 0; i < pool.length; i++) entrants.push(pool[i].id);
      if(humanRegistered && human && !human.injury){
        entrants.push(state.humanId);
      }
      entrants.sort(function(a, b){ return state.players[a].rank - state.players[b].rank; });
    }

    if(entrants.length < 2) return null;
    var inst = TC.createTournament(def, def.startDay, entrants, rng);
    for(var e = 0; e < entrants.length; e++){
      if(entrants[e] != null) state.players[entrants[e]].curT = inst.id;
    }
    inst.entrants = entrants.slice();
    return inst;
  }

  // Lista provisional de inscriptos para un torneo que todavia no arranco (segun ranking actual)
  TC.previewEntrants = function(state, def){
    var cat = TC.CATS[def.cat];
    var humanRegistered = state.registrations.indexOf(def.id) >= 0;
    var ids = [];
    if(def.cat === 'FINALS'){
      var top = state.players.slice().sort(function(a, b){ return (a.rank || 9999) - (b.rank || 9999); }).slice(0, 8);
      for(var k = 0; k < top.length; k++) ids.push(top[k].id);
      return ids;
    }
    // misma logica de eleccion entre torneos hermanos que al armar el cuadro real
    var sibs = [];
    var sib250 = null;
    for(var si = 0; si < state.schedule.length; si++){
      var sd = state.schedule[si];
      if(sd.startDay !== def.startDay) continue;
      if(sd.cat === def.cat) sibs.push(sd);
      if(def.cat === '500' && sd.cat === '250') sib250 = sd;
    }
    if(def._hn == null) def._hn = strHashNum(def.id);

    var pool = [];
    for(var i = 0; i < state.players.length; i++){
      var p = state.players[i];
      if(p.id === state.humanId) continue;
      if(p.rank < cat.minRank || p.rank > cat.maxRank) continue;
      if(cat.idealMin && p.rank < cat.idealMin) continue; // los top no suelen bajar
      if(p.injury && state.day + p.injury.days > def.startDay) continue;
      if(sibs.length > 1 && chooseSibling(p, sibs).id !== def.id) continue;
      if(sib250 && p.rank <= 60 && h01(p.id + 7919, def._hn) < 0.08) continue;
      if(h01(p.id + 104729, def._hn) < 0.06) continue;
      pool.push(p);
    }
    pool.sort(function(a, b){ return a.rank - b.rank; });
    pool = pool.slice(0, cat.draw - (humanRegistered ? 1 : 0));
    for(i = 0; i < pool.length; i++) ids.push(pool[i].id);
    if(humanRegistered) ids.push(state.humanId);
    ids.sort(function(a, b){ return state.players[a].rank - state.players[b].rank; });
    return ids;
  };

  // ================== PARTIDOS ==================
  function playerForMatch(p){
    return {fh:p.fh, bh:p.bh, vol:p.vol, dro:p.dro, spd:p.spd, sta:p.sta, srv:p.srv,
            pow:p.pow, ret:p.ret, con:p.con, pref:p.pref, form:p.form, energy:p.energy, hand:p.hand, ht:p.ht};
  }

  function scoreString(result, winnerFirst){
    var out = [];
    for(var i = 0; i < result.sets.length; i++){
      var s = result.sets[i], g0 = s.g[0], g1 = s.g[1];
      if(winnerFirst && result.winner === 1){ var t = g0; g0 = g1; g1 = t; }
      var str = g0 + '-' + g1;
      if(s.tb){
        var loserTb = Math.min(s.tb[0], s.tb[1]);
        str += '(' + loserTb + ')';
      }
      out.push(str);
    }
    return out.join(' ');
  }
  TC.scoreString = scoreString;

  var INJURIES = [
    {n:'molestias en el hombro', min:4, max:10, w:20},
    {n:'lumbalgia', min:5, max:12, w:18},
    {n:'molestias abdominales', min:7, max:16, w:14},
    {n:'inflamacion en el codo', min:7, max:20, w:12},
    {n:'esguince de tobillo', min:10, max:28, w:12},
    {n:'molestias en la muneca', min:10, max:24, w:10},
    {n:'inflamacion de rodilla', min:14, max:35, w:8},
    {n:'desgarro muscular', min:21, max:45, w:6}
  ];
  function rollInjury(rng, mult){
    var tw = 0, i;
    for(i = 0; i < INJURIES.length; i++) tw += INJURIES[i].w;
    var x = rng() * tw;
    for(i = 0; i < INJURIES.length; i++){
      x -= INJURIES[i].w;
      if(x <= 0) break;
    }
    var inj = INJURIES[Math.min(i, INJURIES.length - 1)];
    var d = Math.round((inj.min + rng() * (inj.max - inj.min)) * (mult || 1));
    d = Math.min(100, d);
    return {name: inj.n, days: d, total: d};
  }

  // Escala de experiencia por categoria: ganar en un GS ensenia mas que en un future
  var CAT_XP = {GS:2.0, M1000:1.6, '500':1.3, '250':1.1, CH125:0.9, CH75:0.8, ITF25:0.6, ITF15:0.5, FINALS:2.0};

  // Experiencia de partido: bumps a atributos aleatorios; devuelve la lista de mejoras
  function grantMatchXp(p, cat, isWinner, rng){
    var ageF = p.age <= 21 ? 1.0 : (p.age <= 25 ? 0.6 : (p.age <= 28 ? 0.3 : 0.12));
    var base = 0.012 * (CAT_XP[cat] || 1) * ageF;
    // la IA que ya toco su techo casi no crece mas por partidos (el humano no tiene techo)
    if(!p.isHuman && p.pot != null && TC.overall(p) >= p.pot) base *= 0.15;
    var n = isWinner ? 2 : 1;
    var gains = [];
    for(var i = 0; i < n; i++){
      var attr = ATTRS[Math.floor(rng() * ATTRS.length)];
      var amt = Math.round(base * (0.7 + rng() * 0.6) * 1000) / 1000;
      if(amt <= 0) continue;
      var before = p[attr];
      p[attr] = Math.min(9.8, Math.round((p[attr] + amt) * 1000) / 1000);
      if(p[attr] > before) gains.push({attr: attr, amt: Math.round((p[attr] - before) * 1000) / 1000});
    }
    return gains;
  }

  // Juega un partido entre dos jugadores del mundo, aplica energia/forma/lesion
  TC.playWorldMatch = function(state, aId, bId, inst, rng){
    var A = state.players[aId], B = state.players[bId];
    var result = TC.simMatch(playerForMatch(A), playerForMatch(B), {surface: inst.surf, bestOf: inst.bestOf, rng: rng});
    var winner = result.winner === 0 ? A : B;
    var loser = result.winner === 0 ? B : A;

    A.energy = Math.max(0, A.energy - TC.matchEnergyCost(A, result, 0, inst.surf));
    B.energy = Math.max(0, B.energy - TC.matchEnergyCost(B, result, 1, inst.surf));
    winner.form = Math.min(1, winner.form + 0.06);
    loser.form = Math.max(-1, loser.form - 0.05);
    winner.wins++; loser.losses++;

    // experiencia: avanzar en torneos te hace crecer (mas en categorias grandes)
    var gains = {};
    gains[winner.id] = grantMatchXp(winner, inst.cat, true, rng);
    gains[loser.id] = grantMatchXp(loser, inst.cat, false, rng);

    // riesgo de lesion post-partido (jugar fundido multiplica probabilidad Y gravedad)
    var newInjury = null;
    var pInj = TC.injuryRisk(loser, loser.energy);
    if(rng() < pInj){ loser.injury = rollInjury(rng, TC.injuryDaysMult(loser.energy)); newInjury = {id: loser.id, injury: loser.injury}; }
    else {
      pInj = TC.injuryRisk(winner, winner.energy);
      if(rng() < pInj * 0.8){ winner.injury = rollInjury(rng, TC.injuryDaysMult(winner.energy)); newInjury = {id: winner.id, injury: winner.injury}; }
    }
    return {result: result, winnerId: winner.id, loserId: loser.id, score: scoreString(result, true), injury: newInjury, gains: gains};
  };

  function bumpRandomAttr(p, amt, rng){
    var a = ATTRS[Math.floor(rng() * ATTRS.length)];
    p[a] = Math.min(9.8, Math.round((p[a] + amt) * 1000) / 1000);
  }

  // ================== RONDAS ==================
  function awardResult(state, pid, inst, roundsWon, isChampion, rec){
    var cat = TC.CATS[inst.cat];
    var pts = 0;
    if(inst.cat === 'FINALS'){ pts = TC.finalsPoints(inst, pid); }
    else {
      var arr = cat.pts;
      pts = arr[Math.min(roundsWon, arr.length - 1)] || 0;
    }
    var p = state.players[pid];
    var entry = {day: state.day, pts: pts, tid: inst.id, name: inst.name, cat: inst.cat, rw: roundsWon, champ: !!isChampion};
    // para el humano guardamos el detalle del ultimo partido (rival y marcador)
    if(pid === state.humanId && rec && rec.p){
      var oppId = rec.p[0] === pid ? rec.p[1] : rec.p[0];
      if(oppId != null){
        entry.vs = state.players[oppId].name;
        entry.sc = rec.sc || (rec.wo ? 'W.O.' : '');
      }
    }
    p.results.push(entry);
    p.curT = null;
    if(isChampion){
      p.titles++;
      if(pid === state.humanId || inst.cat === 'GS' || inst.cat === 'M1000' || inst.cat === 'FINALS'){
        pushNews(state, p.name + ' gana ' + inst.name, pid === state.humanId);
      }
    }
  }

  function totalRounds(inst){ return Math.round(Math.log(inst.drawSize) / Math.log(2)); }

  // Registro historico permanente (liviano): campeon y finalista con nombre "congelado"
  function archivePush(state, inst, runnerId){
    state.archive = state.archive || [];
    state.archive.push({
      y: TC.dateOf(inst.startDay).getUTCFullYear(),
      name: inst.name, cat: inst.cat, surf: inst.surf,
      startDay: inst.startDay, dur: inst.dur,
      champId: inst.championId != null ? inst.championId : null,
      champ: inst.championId != null ? state.players[inst.championId].name : null,
      runnerId: runnerId != null ? runnerId : null,
      runner: runnerId != null ? state.players[runnerId].name : null,
      instId: inst.id
    });
  }

  // Juega la ronda del dia. Devuelve true si quedo pendiente el partido del humano.
  function playRoundDay(state, inst, rIdx, rng){
    if(inst.done) return false;
    if(inst.isFinals) return playFinalsDay(state, inst, rIdx, rng);
    if(inst.currentRound !== rIdx) return false;

    var round = inst.bracket[rIdx];
    var records = inst.pendingRecords || [];
    var humanPending = false;
    var startPair = 0;

    if(!inst.pendingRecords){
      records = [];
      for(var i = 0; i < round.length; i += 2){
        var a = round[i], b = round[i + 1];
        var rec = null;
        if(a == null && b == null){ rec = {p:[null,null], w:null, bye:true}; }
        else if(a == null){ rec = {p:[null,b], w:b, bye:true}; }
        else if(b == null){ rec = {p:[a,null], w:a, bye:true}; }
        else {
          var pa = state.players[a], pb = state.players[b];
          if(pa.injury && pb.injury){ rec = {p:[a,b], w: rng() < 0.5 ? a : b, wo:true}; }
          else if(pa.injury){ rec = {p:[a,b], w:b, wo:true}; }
          else if(pb.injury){ rec = {p:[a,b], w:a, wo:true}; }
          else if(a === state.humanId || b === state.humanId){
            // partido del humano: queda pendiente
            rec = {p:[a,b], w:null, human:true};
            humanPending = true;
          } else {
            var m = TC.playWorldMatch(state, a, b, inst, rng);
            rec = {p:[a,b], w: m.winnerId, sc: m.score};
          }
        }
        records.push(rec);
      }
    } else {
      humanPending = records.some(function(r){ return r.human && r.w == null; });
    }

    if(humanPending){
      inst.pendingRecords = records;
      var hp = null;
      for(var j = 0; j < records.length; j++){
        if(records[j].human && records[j].w == null){ hp = records[j]; break; }
      }
      var opp = hp.p[0] === state.humanId ? hp.p[1] : hp.p[0];
      state.pendingMatch = {tid: inst.id, round: rIdx, oppId: opp, day: state.day};
      return true;
    }

    finishRound(state, inst, rIdx, records, rng);
    return false;
  }

  function finishRound(state, inst, rIdx, records, rng){
    inst.pendingRecords = null;
    inst.results[rIdx] = records;
    var winners = [];
    var nR = totalRounds(inst);
    for(var i = 0; i < records.length; i++){
      var rec = records[i];
      winners.push(rec.w);
      // el perdedor queda eliminado: puntos por ronda alcanzada
      var loser = null;
      if(rec.p[0] != null && rec.p[1] != null){ loser = rec.p[0] === rec.w ? rec.p[1] : rec.p[0]; }
      if(loser != null) awardResult(state, loser, inst, rIdx, false, rec);
    }
    inst.currentRound = rIdx + 1;
    if(winners.length === 1){
      if(winners[0] != null) awardResult(state, winners[0], inst, nR, true, records[0]);
      inst.done = true;
      inst.championId = winners[0];
      // finalista para el archivo
      var fRec = records[0];
      var runnerId = null;
      if(fRec && fRec.p[0] != null && fRec.p[1] != null){
        runnerId = fRec.p[0] === winners[0] ? fRec.p[1] : fRec.p[0];
      }
      archivePush(state, inst, runnerId);
    } else {
      inst.bracket.push(winners);
    }
  }

  // ===== dia de ATP Finals =====
  function playFinalsDay(state, inst, rIdx, rng){
    if(inst.playedDays && inst.playedDays.indexOf(rIdx) >= 0) return false;
    inst.playedDays = inst.playedDays || [];
    var records = inst.pendingRecords || null;
    var humanPending = false;
    var matches = [];

    if(rIdx <= 2){
      for(var g = 0; g < 2; g++){
        var pair = inst.rrPairings[rIdx];
        for(var m = 0; m < pair.length; m++){
          var a = inst.groups[g][pair[m][0]], b = inst.groups[g][pair[m][1]];
          matches.push([a, b]);
        }
      }
    } else if(rIdx === 3){
      var stA = finalsStandings(inst, 0), stB = finalsStandings(inst, 1);
      inst.sf = [[stA[0], stB[1]], [stB[0], stA[1]]];
      matches = inst.sf;
    } else {
      if(!inst.sfWinners || inst.sfWinners.length < 2){ inst.done = true; return false; }
      matches = [[inst.sfWinners[0], inst.sfWinners[1]]];
    }

    if(!records){
      records = [];
      for(var i = 0; i < matches.length; i++){
        var pa = state.players[matches[i][0]], pb = state.players[matches[i][1]];
        var rec;
        if(pa.injury){ rec = {p: matches[i].slice(), w: matches[i][1], wo: true}; }
        else if(pb.injury){ rec = {p: matches[i].slice(), w: matches[i][0], wo: true}; }
        else if(matches[i][0] === state.humanId || matches[i][1] === state.humanId){
          rec = {p: matches[i].slice(), w: null, human: true};
          humanPending = true;
        } else {
          var mm = TC.playWorldMatch(state, matches[i][0], matches[i][1], inst, rng);
          rec = {p: matches[i].slice(), w: mm.winnerId, sc: mm.score};
        }
        records.push(rec);
      }
    } else {
      humanPending = records.some(function(r){ return r.human && r.w == null; });
    }

    if(humanPending){
      inst.pendingRecords = records;
      inst.pendingDay = rIdx;
      var hp = records.filter(function(r){ return r.human && r.w == null; })[0];
      var opp = hp.p[0] === state.humanId ? hp.p[1] : hp.p[0];
      state.pendingMatch = {tid: inst.id, round: rIdx, oppId: opp, day: state.day, finals: true};
      return true;
    }

    finishFinalsDay(state, inst, rIdx, records, rng);
    return false;
  }

  function finishFinalsDay(state, inst, rIdx, records, rng){
    inst.pendingRecords = null;
    inst.playedDays.push(rIdx);
    inst.results.push({day: rIdx, records: records});
    for(var i = 0; i < records.length; i++){
      var rec = records[i], w = rec.w;
      if(rIdx <= 2){
        inst.rrWins[w] = (inst.rrWins[w] || 0) + 1;
        var l = rec.p[0] === w ? rec.p[1] : rec.p[0];
        inst.rrSD = inst.rrSD || {};
      } else if(rIdx === 3){
        inst.sfWinners = inst.sfWinners || [];
        inst.sfWinners.push(w);
      } else {
        inst.champion = w;
        inst.done = true;
        // otorgar puntos a los 8
        var all = inst.groups[0].concat(inst.groups[1]);
        for(var k = 0; k < all.length; k++){
          awardResult(state, all[k], inst, 0, all[k] === w, rec.p.indexOf(all[k]) >= 0 ? rec : null);
        }
        inst.championId = w;
        archivePush(state, inst, rec.p[0] === w ? rec.p[1] : rec.p[0]);
      }
    }
    inst.currentRound = rIdx + 1;
  }

  function finalsStandings(inst, g){
    return inst.groups[g].slice().sort(function(a, b){
      return (inst.rrWins[b] || 0) - (inst.rrWins[a] || 0);
    });
  }
  TC.finalsStandings = finalsStandings;
  TC._finishRoundPublic = finishRound;
  TC._finishFinalsDayPublic = finishFinalsDay;
  TC._seasonRollover = seasonRollover;

  // ================== TICK DIARIO ==================
  function pushNews(state, txt, isHuman){
    if(state.presim && !isHuman) {
      // durante la pre-simulacion solo guardamos lo grande
    }
    state.news.unshift({day: state.day, txt: txt, human: !!isHuman});
    if(state.news.length > 60) state.news.pop();
  }
  TC.pushNews = pushNews;

  // Avanza un dia. Devuelve 'pending' si el humano tiene partido por jugar, si no null.
  TC.stepDay = function(state){
    var rng = state.rng;

    // Nueva temporada el 1 de enero
    var dt = TC.dateOf(state.day);
    if(dt.getUTCMonth() === 0 && dt.getUTCDate() === 1){
      var year = dt.getUTCFullYear();
      if(state.seasonYear !== year){
        if(state.seasonYear) seasonRollover(state, rng);
        TC.buildSeason(state, year);
        if(!state.presim) pushNews(state, 'Arranca la temporada ' + year, false);
      }
    }

    // Rankings cada 7 dias
    if(mod7(state.day) === 0){
      TC.recomputeRankings(state);
      if(state.humanId != null){
        var h = state.players[state.humanId];
        state.rankHistory.push([state.day, h.rank === 9999 ? null : h.rank, h.pts]);
        if(state.rankHistory.length > 700) state.rankHistory.shift();
        if(state.career && h.rank < state.career.bestRank) state.career.bestRank = h.rank;
      }
    }

    // Arrancan torneos de hoy
    for(var i = 0; i < state.schedule.length; i++){
      var def = state.schedule[i];
      if(def.startDay === state.day && !def.started){
        def.started = true;
        var inst = startTournament(state, def, rng);
        if(inst){ state.active.push(inst); def.instId = inst.id; }
      }
    }

    // Rondas de hoy
    if(TC.playDayRounds(state)) return 'pending';

    TC.finishDay(state);
    return null;
  };

  // Juega todas las rondas programadas para hoy. Devuelve true si hay partido humano pendiente.
  TC.playDayRounds = function(state){
    var rng = state.rng;
    for(var i = 0; i < state.active.length; i++){
      var t = state.active[i];
      if(t.done) continue;
      var off = state.day - t.startDay;
      var rIdx = t.roundDays.indexOf(off);
      if(rIdx >= 0){
        var pending = playRoundDay(state, t, rIdx, rng);
        if(pending) return true;
      }
      // seguridad: torneo vencido sin terminar -> resolverlo ya
      if(!t.done && state.day > t.endDay){
        var guard = 0;
        while(!t.done && guard++ < 12){
          var r = t.isFinals ? (t.playedDays ? t.playedDays.length : 0) : t.currentRound;
          if(playRoundDay(state, t, t.isFinals ? [0,1,2,3,4].filter(function(d){return !t.playedDays || t.playedDays.indexOf(d)<0;})[0] : r, rng)) return true;
        }
      }
    }
    return false;
  };

  // Segunda mitad del dia (despues de resolver partidos): recuperacion, entrenamientos, limpieza
  TC.finishDay = function(state){
    var rng = state.rng;
    var ps = state.players;

    for(var i = 0; i < ps.length; i++){
      var p = ps[i];
      if(p.injury){
        p.injury.days--;
        // parado se recupera lento, y el fisico se atrofia dia a dia
        p.energy = Math.min(100, p.energy + 2.5);
        p.spd = Math.max(1, Math.round((p.spd - 0.004) * 10000) / 10000);
        p.sta = Math.max(1, Math.round((p.sta - 0.004) * 10000) / 10000);
        p.con = Math.max(1, Math.round((p.con - 0.0015) * 10000) / 10000);
        if(p.injury.days <= 0){
          if(i === state.humanId) pushNews(state, 'Te recuperaste de la lesion. Volves a media maquina: cuidate unos dias.', true);
          p.injury = null;
          p.form = Math.max(-1, p.form - 0.2);
          p.energy = Math.min(p.energy, 55); // nadie vuelve al 100% de una lesion
        }
        continue;
      }
      if(i === state.humanId){
        humanDaily(state, p, rng);
      } else {
        // la IA descansa/entrena sola
        if(p.curT === null){
          p.energy = Math.min(100, p.energy + 5.5);
        } else {
          p.energy = Math.min(100, p.energy + 3.5);
        }
      }
    }

    // deriva semanal de forma: la mala racha no dura para siempre
    if(mod7(state.day) === 3){
      for(i = 0; i < ps.length; i++){
        var noise = (i === state.humanId) ? (rng() - 0.5) * 0.15 : (rng() - 0.5) * 0.3;
        ps[i].form = Math.max(-1, Math.min(1, ps[i].form * 0.8 + noise));
      }
    }

    // entrenamiento semanal simulado de la IA: crecen hacia su potencial, decaen desde su declAge
    if(mod7(state.day) === 1){
      for(i = 0; i < ps.length; i++){
        if(i === state.humanId) continue;
        var q = ps[i];
        if(q.injury) continue;
        var declAge = q.declAge || 31;
        if(q.age >= declAge){
          var dec = 0.0022 * (q.age - declAge + 1);
          q.spd = Math.max(1, q.spd - dec);
          q.sta = Math.max(1, q.sta - dec);
          if(q.age >= declAge + 2) q.pow = Math.max(1, q.pow - dec * 0.4);
        } else if(q.pot != null){
          var gap = q.pot - TC.overall(q);
          if(gap > 0.02){
            var rate = q.age <= 19 ? 0.10 : (q.age <= 21 ? 0.08 : (q.age <= 23 ? 0.055 : (q.age <= 26 ? 0.025 : 0.008)));
            var amt = rate * Math.min(1, gap / 1.2);
            bumpRandomAttr(q, amt * 0.6, rng);
            bumpRandomAttr(q, amt * 0.4, rng);
          }
        }
      }
    }

    // snapshot mensual de atributos: para mostrar subidas/bajadas de cada jugador
    if(((state.day % 28) + 28) % 28 === 0){
      for(i = 0; i < ps.length; i++){
        var sp = ps[i], snap = {};
        for(var ai = 0; ai < ATTRS.length; ai++) snap[ATTRS[ai]] = sp[ATTRS[ai]];
        sp.prev = snap;
      }
    }

    // limpiar torneos terminados (se guardan completos para poder ver sus cuadros)
    for(i = state.active.length - 1; i >= 0; i--){
      if(state.active[i].done && state.day > state.active[i].endDay){
        state.finished.unshift(compactTournament(state.active[i]));
        if(state.finished.length > 260) state.finished.pop();
        state.active.splice(i, 1);
      }
    }

    state.day++;
  };

  function compactTournament(t){
    var c = {};
    for(var k in t){ if(k !== 'pendingRecords' && k !== 'pendingDay') c[k] = t[k]; }
    return c;
  }

  function humanDaily(state, p, rng){
    if(p.curT !== null){
      p.energy = Math.min(100, p.energy + 5);
      return;
    }
    if(state.action === 'train'){
      var focus = state.trainFocus || 'fh';
      // entrenar cansa de verdad: no se puede entrenar infinito sin descansar
      p.energy = Math.max(0, p.energy - 2.2);
      var ageF = p.age <= 20 ? 2.2 : (p.age <= 24 ? 1.4 : (p.age <= 28 ? 0.8 : (p.age <= 31 ? 0.35 : 0.12)));
      var curve = Math.max(0.1, (10.2 - p[focus]) / 6);
      // cuanto mas fundido, menos rinde el entrenamiento
      var eff = 0.4 + 0.6 * Math.min(1, p.energy / 55);
      p[focus] = Math.min(9.8, Math.round((p[focus] + 0.006 * ageF * curve * eff) * 10000) / 10000);
      // riesgo de lesion entrenando: crece fuerte con el cansancio
      var riskT = p.energy < 45 ? 0.002 + ((45 - p.energy) / 45) * 0.02 : 0.0004;
      if(rng() < riskT){
        p.injury = rollInjury(rng, TC.injuryDaysMult(p.energy));
        pushNews(state, 'Te lesionaste entrenando' + (p.energy < 30 ? ' fundido' : '') + ': ' + p.injury.name + ' (' + p.injury.days + ' dias)', true);
      }
    } else {
      p.energy = Math.min(100, p.energy + 8);
      p.form = Math.max(-1, Math.min(1, p.form + 0.01));
    }
  }

  // ================== FIN DE TEMPORADA ==================
  function seasonRollover(state, rng){
    var ps = state.players;
    for(var i = 0; i < ps.length; i++){
      var p = ps[i];
      p.age++;
      // podar resultados viejos
      var cutoff = state.day - 400;
      p.results = p.results.filter(function(r){ return r.day > cutoff; });

      if(i === state.humanId){
        // declive fisico natural
        if(p.age > 30){
          var dec = 0.06 * (p.age - 30);
          p.spd = Math.max(1, p.spd - dec);
          p.sta = Math.max(1, p.sta - dec);
          p.pow = Math.max(1, p.pow - dec * 0.6);
        }
        continue;
      }
      // deriva IA anual: plus de pretemporada hacia el potencial / declive del veterano
      var declA = p.declAge || 31;
      if(p.age >= declA){
        var d = 0.035 * (p.age - declA + 1);
        p.spd = Math.max(1, p.spd - d * (0.7 + rng() * 0.6));
        p.sta = Math.max(1, p.sta - d * (0.7 + rng() * 0.6));
        if(p.age >= declA + 2){
          p.pow = Math.max(1, p.pow - d * 0.4);
          p.fh = Math.max(1, p.fh - d * 0.2);
        }
      } else if(p.pot != null){
        var gapY = p.pot - TC.overall(p);
        if(gapY > 0 && p.age <= 26){
          var k;
          for(k = 0; k < 2; k++) bumpRandomAttr(p, Math.min(0.15, gapY * 0.08) + rng() * 0.05, rng);
        }
      }
      // retiros: renace como juvenil del mismo pais (la nueva generacion)
      if(p.age > 36 || (p.age > 33 && TC.overall(p) < 5.4 && p.rank > 400)){
        var peakOv = TC.overall(p); // el nivel que tuvo el que se va
        var nm = TC.genNameFor(p.country, rng);
        var was = p.name;
        p.name = nm.name; p.age = 17; p.real = false; // p.country se mantiene
        var base = 3.8 + rng() * 1.9;
        for(k = 0; k < ATTRS.length; k++){
          p[ATTRS[k]] = Math.round(Math.max(1.5, base + (rng() * 2.2 - 1.1)) * 10) / 10;
        }
        var surfs = ['hard','hard','clay','clay','grass','indoor','all'];
        p.pref = surfs[Math.floor(rng() * surfs.length)];
        p.hand = rng() < 0.13 ? 'Z' : 'D';
        p.ht = rollHeight(rng);
        p.results = []; p.pts = 0; p.rank = 9999; p.wins = 0; p.losses = 0; p.titles = 0;
        p.form = 0; p.energy = 100; p.injury = null; p.curT = null;
        assignPotential(p, rng); // sortea su propio destino...
        // ...pero a veces la promesa del pais apunta al nivel del que se retiro
        if(rng() < 0.35){
          p.pot = Math.min(9.6, Math.max(p.pot, Math.round((peakOv - 0.8 + rng() * 1.2) * 100) / 100));
        }
        if(!state.presim && was) pushNews(state, was + ' se retira del circuito. En ' + p.country + ' ya suena su relevo: ' + p.name, false);
      }
    }
  }

  // ================== PRE-SIMULACION ==================
  // Corre la temporada previa y frena el 28 de diciembre: la pretemporada es tuya
  // (asi llegas a inscribirte en los torneos que arrancan el 1 de enero)
  TC.presimSeason = function(state){
    state.presim = true;
    var guard = 0;
    while(state.day < -4 && guard++ < 500){
      var r = TC.stepDay(state);
      if(r === 'pending'){ throw new Error('pending sin humano en presim'); }
    }
    state.presim = false;
    state.news = [];
  };
})();
