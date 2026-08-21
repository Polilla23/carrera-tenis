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
      pl.loc = playerRegion(pl); // todos arrancan en casa
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
    var yStart = TC.dayOf(year, 1, 1);
    var w, start;

    // Challengers: calendario real 2026 (hasta 4 por semana, con paises y regiones reales)
    if(TC.CH_CALENDAR && TC.CH_CALENDAR.length){
      for(var c = 0; c < TC.CH_CALENDAR.length; c++){
        var ch = TC.CH_CALENDAR[c];
        sched.push({id:'chr' + c + '_' + year, baseId:'chr' + c, name: ch.name,
                    cat: ch.cat, surf: ch.surf, startDay: yStart + ch.w * 7, dur: 7,
                    region: ch.region, country: ch.country});
      }
    } else {
      // respaldo: challengers procedurales (partidas viejas sin el archivo de datos)
      var nCH = TC.CH_CITIES.length;
      for(w = 0; w < 46; w++){
        start = yStart + w * 7;
        var m0 = TC.dateOf(start).getUTCMonth() + 1;
        var sf = TC.SEASON_SURF[m0] || ['hard','clay','hard'];
        var i1 = (w * 2) % nCH, i2 = (w * 2 + 1) % nCH;
        sched.push({id:'ch125_' + year + '_' + w, baseId:'ch125_' + w, name:'Challenger de ' + TC.CH_CITIES[i1],
                    cat:'CH125', surf: sf[0], startDay: start, dur: 7, region: TC.CH_REGIONS[i1]});
        sched.push({id:'ch75_' + year + '_' + w, baseId:'ch75_' + w, name:'Challenger de ' + TC.CH_CITIES[i2],
                    cat:'CH75', surf: sf[1], startDay: start, dur: 7, region: TC.CH_REGIONS[i2]});
      }
    }

    // Futures ITF: dos M25 y dos M15 por semana, siempre en regiones distintas
    var nIT = TC.ITF_CITIES.length;
    function pickDistinct(base){
      var a = base % nIT, b = (base + 1) % nIT, guard = 0;
      while(TC.ITF_REGIONS[b] === TC.ITF_REGIONS[a] && guard++ < nIT){ b = (b + 1) % nIT; }
      return [a, b];
    }
    for(w = 0; w < 46; w++){
      start = yStart + w * 7;
      var p25 = pickDistinct(w * 3);
      var p15 = pickDistinct(w * 5 + 11);
      // cada sede ITF juega en su superficie real
      sched.push({id:'itf25a_' + year + '_' + w, baseId:'itf25a_' + w, name:'M25 ' + TC.ITF_CITIES[p25[0]],
                  cat:'ITF25', surf: TC.ITF_SURFS[p25[0]], startDay: start, dur: 6, region: TC.ITF_REGIONS[p25[0]]});
      sched.push({id:'itf25b_' + year + '_' + w, baseId:'itf25b_' + w, name:'M25 ' + TC.ITF_CITIES[p25[1]],
                  cat:'ITF25', surf: TC.ITF_SURFS[p25[1]], startDay: start, dur: 6, region: TC.ITF_REGIONS[p25[1]]});
      sched.push({id:'itf15a_' + year + '_' + w, baseId:'itf15a_' + w, name:'M15 ' + TC.ITF_CITIES[p15[0]],
                  cat:'ITF15', surf: TC.ITF_SURFS[p15[0]], startDay: start, dur: 6, region: TC.ITF_REGIONS[p15[0]]});
      sched.push({id:'itf15b_' + year + '_' + w, baseId:'itf15b_' + w, name:'M15 ' + TC.ITF_CITIES[p15[1]],
                  cat:'ITF15', surf: TC.ITF_SURFS[p15[1]], startDay: start, dur: 6, region: TC.ITF_REGIONS[p15[1]]});
    }
    sched.sort(function(a, b){ return a.startDay - b.startDay || catRank(a.cat) - catRank(b.cat); });
    state.schedule = sched;
    state.seasonYear = year;
    // foto de los rankings al arranque del año (para el recap y la "revelacion")
    var rsMap = {};
    for(var ri = 0; ri < state.players.length; ri++) rsMap[state.players[ri].id] = state.players[ri].rank;
    state.rankStart = {year: year, ranks: rsMap};
  };

  function catRank(c){ return {FINALS:0, GS:1, M1000:2, '500':3, '250':4, CH175:5, CH125:6, CH100:7, CH75:8, CH50:9, ITF25:10, ITF15:11}[c]; }

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
  TC.playerRegion = playerRegion;

  // Costo de energia por viajar al torneo (jet lag intercontinental)
  TC.travelCost = function(fromRegion, toRegion){
    if(!toRegion) return 1.5;
    if(!fromRegion || fromRegion === toRegion) return 1.5;
    return 9;
  };

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
  // superficie preferida + cercania geografica + donde esta parado ahora + gusto personal.
  // Los cabezas de serie se reparten parejo (alternados) para que los cuadros queden equilibrados.
  function chooseSibling(p, sibs){
    if(p.rank >= 1 && p.rank <= 20 && sibs.length > 1){
      var arr = sibs.slice().sort(function(a, b){ return a.id < b.id ? -1 : 1; });
      var idx = p.rank + Math.floor(sibs[0].startDay / 7);
      return arr[((idx % arr.length) + arr.length) % arr.length];
    }
    var best = null, bestScore = -Infinity;
    for(var i = 0; i < sibs.length; i++){
      var s = sibs[i];
      if(s._hn == null) s._hn = strHashNum(s.id);
      var score = h01(p.id, s._hn);                                  // gusto personal (0-1)
      if(s.surf === p.pref) score += 0.7;                             // su superficie
      if(s.region && s.region === playerRegion(p)) score += 0.55;     // cerca de casa
      if(s.region && p.loc && s.region === p.loc) score += 0.4;       // ya esta en ese continente
      if(score > bestScore){ bestScore = score; best = s; }
    }
    return best;
  }

  // Dia del primer partido de cuadro principal (los Masters largos debutan el dia 1)
  function firstMainDay(def){
    return def.startDay + TC.roundDays(TC.CATS[def.cat].draw, def.dur)[0];
  }

  // Sigue jugando otro torneo, pero ese termina antes de su primer partido aca:
  // puede anotarse igual y llegar tarde (como Montreal -> Cincinnati en la vida real)
  function canJoinLate(p, def, state){
    for(var i = 0; i < state.active.length; i++){
      var t = state.active[i];
      if(t.id === p.curT) return t.done || t.endDay < firstMainDay(def);
    }
    return false;
  }

  function eligible(p, def, state){
    var cat = TC.CATS[def.cat];
    if(p.injury) return false;
    if(p.curT !== null && !canJoinLate(p, def, state)) return false;
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

      // en futures y challengers, el cuadro es mayormente local: pocos cruzan el mundo por 15 puntos
      var isSmall = def.cat.indexOf('CH') === 0 || def.cat.indexOf('ITF') === 0;
      var travelerProb = def.cat.indexOf('ITF') === 0 ? 0.12 : 0.25;

      // los que entran directo a un GS/M1000 que se superpone con este torneo se reservan
      // para el grande (salvo una minoria que igual prefiere el chico, como en la vida real)
      var bigCut = 0;
      if(def.cat !== 'GS' && def.cat !== 'M1000'){
        for(var bi = 0; bi < state.schedule.length; bi++){
          var bd = state.schedule[bi];
          if(bd.cat !== 'GS' && bd.cat !== 'M1000') continue;
          var bQ = (TC.QUALI[bd.cat] && TC.QUALI[bd.cat].rounds) || 0;
          if(def.startDay <= bd.startDay + bd.dur - 1 && bd.startDay - bQ <= def.startDay + def.dur - 1){
            var bMax = TC.CATS[bd.cat].maxRank;
            if(bMax > bigCut) bigCut = bMax;
          }
        }
      }

      var pool = [], farPool = [];
      for(var i = 0; i < state.players.length; i++){
        var p = state.players[i];
        if(p.id === state.humanId) continue;
        if(!eligible(p, def, state)) continue;
        if(p.energy < 42 && def.cat !== 'GS') continue; // la IA se administra
        // los bien rankeados rara vez bajan a jugar categorias menores
        if(cat.idealMin && p.rank < cat.idealMin && rng() > 0.15) continue;
        // reservado para el GS/M1000 superpuesto (solo un 15% resigna el grande por este)
        if(bigCut && p.rank <= bigCut && h01(p.id + 424242, def._hn || (def._hn = strHashNum(def.id))) > 0.15) continue;
        // si hay varios torneos de esta categoria en la semana, cada uno va al que eligio
        if(sibs.length > 1 && chooseSibling(p, sibs).id !== def.id) continue;
        // algun buen jugador baja del 500 al 250 de la misma semana (preparacion, casa, etc)
        if(sib250 && p.rank <= 60 && h01(p.id + 7919, def._hn) < 0.08) continue;
        // y a veces un jugador simplemente se toma la semana libre
        if(h01(p.id + 104729, def._hn) < 0.06) continue;
        // torneo chico en otro continente: solo viaja una minoria
        if(isSmall && def.region && playerRegion(p) !== def.region && h01(p.id + 31337, def._hn) > travelerProb){
          farPool.push(p);
          continue;
        }
        pool.push(p);
      }
      // barajar antes de ordenar: los no rankeados (empate en 9999) entran en orden aleatorio
      for(var s = pool.length - 1; s > 0; s--){
        var sj = Math.floor(rng() * (s + 1));
        var st = pool[s]; pool[s] = pool[sj]; pool[sj] = st;
      }
      pool.sort(function(a, b){ return a.rank - b.rank; });
      var qcfg = TC.QUALI[def.cat];
      var humanDirect = humanRegistered && human && !human.injury && (!qcfg || human.rank <= cat.maxRank);
      var slots = cat.draw - (qcfg ? qcfg.q : 0) - (humanDirect ? 1 : 0);
      // si los locales no alcanzan, completan viajeros de otras regiones
      if(pool.length < slots && farPool.length){
        for(s = farPool.length - 1; s > 0; s--){
          sj = Math.floor(rng() * (s + 1));
          st = farPool[s]; farPool[s] = farPool[sj]; farPool[sj] = st;
        }
        farPool.sort(function(a, b){ return a.rank - b.rank; });
        pool = pool.concat(farPool.slice(0, slots - pool.length));
      }
      // los que pasaron todos los filtros pero no entraron por ranking van a la qualy
      var directOverflow = pool.slice(slots);
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
      if(humanDirect){
        entrants.push(state.humanId);
      }
      entrants.sort(function(a, b){ return state.players[a].rank - state.players[b].rank; });
    }

    if(entrants.length < 2) return null;
    var inst = TC.createTournament(def, def.startDay, entrants, rng);
    inst.region = def.region || null;
    inst.baseId = def.baseId || null;
    inst.entrants = entrants.slice();

    // fase previa (qualy) para los ATP: cuadro de q*4 con los siguientes del ranking
    var qc = TC.QUALI[def.cat];
    var allIn = entrants.slice();
    if(qc && def.cat !== 'FINALS'){
      var human2 = state.players[state.humanId];
      // para jugar la qualy tenes que estar libre (no se puede mientras jugas otro torneo)
      var humanQuali = humanRegistered && human2 && !human2.injury && human2.curT == null && entrants.indexOf(state.humanId) < 0;
      var inMain = {};
      for(var x = 0; x < entrants.length; x++) inMain[entrants[x]] = 1;
      // la qualy es de los que NO entran directo: primero los que quedaron justo afuera
      // del corte (y que ELIGIERON este torneo), despues los de ranking peor que el corte
      var qpool = (typeof directOverflow !== 'undefined' ? directOverflow : []).filter(function(op){
        return !inMain[op.id] && !op.injury && op.curT === null;
      });
      var inQ = {};
      qpool.forEach(function(op){ inQ[op.id] = 1; });
      for(var j = 0; j < state.players.length; j++){
        var qp = state.players[j];
        if(qp.id === state.humanId || inMain[qp.id] || inQ[qp.id]) continue;
        if(qp.injury || qp.curT !== null) continue;
        // solo ranking PEOR que el corte directo (los top que no estan es porque eligieron otro torneo)
        if(qp.rank <= cat.maxRank || qp.rank > qc.qMax) continue;
        if(qp.rank < cat.minRank) continue;
        if(qp.energy < 40) continue;
        // misma eleccion entre torneos hermanos y semana libre que en el cuadro principal
        if(typeof sibs !== 'undefined' && sibs.length > 1 && chooseSibling(qp, sibs).id !== def.id) continue;
        if(h01(qp.id + 104729, def._hn || 0) < 0.06) continue;
        qpool.push(qp);
      }
      qpool.sort(function(a, b){ return a.rank - b.rank; });
      var qRounds = qc.rounds || 2;
      var qDraw = qc.q * Math.pow(2, qRounds);
      var qslots = qDraw - (humanQuali ? 1 : 0);
      qpool = qpool.slice(0, qslots);
      var qids = qpool.map(function(p2){ return p2.id; });
      if(humanQuali) qids.push(state.humanId);
      qids.sort(function(a, b){ return state.players[a].rank - state.players[b].rank; });
      if(qids.length >= 2){
        inst.qEntrants = qids.slice();
        inst.qBracket = [TC.makeDraw(qids, qDraw, rng)];
        inst.qResults = [];
        inst.qRound = 0;
        inst.qDays = [];
        for(var qd = 0; qd < qRounds; qd++) inst.qDays.push(def.startDay - qRounds + qd);
        inst.qualifiers = [];
        inst.mainBuilt = false;
        inst.directs = entrants.slice();
        allIn = allIn.concat(qids);
      }
    }

    for(var e = 0; e < allIn.length; e++){
      if(allIn[e] == null) continue;
      var pe = state.players[allIn[e]];
      // si sigue jugando otro torneo (ej: la final de la semana pasada mientras aca
      // arranca la qualy), su incorporacion queda pendiente: no pisa curT ni viaja aun
      if(pe.curT != null && pe.curT !== inst.id){
        if(allIn[e] === state.humanId){ inst.humanJoinLater = true; }
        else { (inst.joinLater = inst.joinLater || []).push(allIn[e]); }
        continue;
      }
      pe.curT = inst.id;
      // el viaje al torneo cuesta energia (mucho mas si es otro continente)
      var from = pe.loc || playerRegion(pe);
      var tc = TC.travelCost(from, def.region);
      pe.energy = Math.max(0, pe.energy - tc);
      if(def.region) pe.loc = def.region;
      if(allIn[e] === state.humanId && tc > 5){
        pushNews(state, 'Vuelo largo a ' + (TC.REGION_LABEL[def.region] || '?') + ' para ' + def.name + ' (-' + tc + ' de energia)', true);
      }
    }
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

    var isSmall = def.cat.indexOf('CH') === 0 || def.cat.indexOf('ITF') === 0;
    var travelerProb = def.cat.indexOf('ITF') === 0 ? 0.12 : 0.25;
    // reservados para un GS/M1000 superpuesto (mismo criterio que el cuadro real)
    var bigCut = 0;
    if(def.cat !== 'GS' && def.cat !== 'M1000'){
      for(var bi2 = 0; bi2 < state.schedule.length; bi2++){
        var bd2 = state.schedule[bi2];
        if(bd2.cat !== 'GS' && bd2.cat !== 'M1000') continue;
        var bQ2 = (TC.QUALI[bd2.cat] && TC.QUALI[bd2.cat].rounds) || 0;
        if(def.startDay <= bd2.startDay + bd2.dur - 1 && bd2.startDay - bQ2 <= def.startDay + def.dur - 1){
          var bMax2 = TC.CATS[bd2.cat].maxRank;
          if(bMax2 > bigCut) bigCut = bMax2;
        }
      }
    }
    var pool = [], farPool = [];
    for(var i = 0; i < state.players.length; i++){
      var p = state.players[i];
      if(p.id === state.humanId) continue;
      if(p.rank < cat.minRank || p.rank > cat.maxRank) continue;
      if(cat.idealMin && p.rank < cat.idealMin) continue; // los top no suelen bajar
      if(p.injury && state.day + p.injury.days > def.startDay) continue;
      if(bigCut && p.rank <= bigCut && h01(p.id + 424242, def._hn || (def._hn = strHashNum(def.id))) > 0.15) continue;
      if(sibs.length > 1 && chooseSibling(p, sibs).id !== def.id) continue;
      if(sib250 && p.rank <= 60 && h01(p.id + 7919, def._hn) < 0.08) continue;
      if(h01(p.id + 104729, def._hn) < 0.06) continue;
      if(isSmall && def.region && playerRegion(p) !== def.region && h01(p.id + 31337, def._hn) > travelerProb){
        farPool.push(p);
        continue;
      }
      pool.push(p);
    }
    pool.sort(function(a, b){ return a.rank - b.rank; });
    var slots2 = cat.draw - (humanRegistered ? 1 : 0);
    if(pool.length < slots2 && farPool.length){
      farPool.sort(function(a, b){ return a.rank - b.rank; });
      pool = pool.concat(farPool.slice(0, slots2 - pool.length));
    }
    pool = pool.slice(0, slots2);
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
  var CAT_XP = {GS:2.0, M1000:1.6, '500':1.3, '250':1.1, CH175:1.0, CH125:0.9, CH100:0.85, CH75:0.8, CH50:0.7, ITF25:0.6, ITF15:0.5, FINALS:2.0};

  // Experiencia de partido: bumps a atributos aleatorios; devuelve la lista de mejoras
  function grantMatchXp(p, cat, isWinner, rng){
    var ageF;
    if(p.isHuman){
      // campana: de pibe absorbes poco (te falta cabeza), pico competitivo 23-27, despues ya lo viste todo
      ageF = p.age <= 19 ? 0.7 : (p.age <= 22 ? 1.05 : (p.age <= 27 ? 1.45 : (p.age <= 29 ? 0.8 : 0.2)));
    } else {
      ageF = p.age <= 21 ? 1.0 : (p.age <= 25 ? 0.6 : (p.age <= 28 ? 0.3 : 0.12));
    }
    var base = (p.isHuman ? 0.02 : 0.012) * (CAT_XP[cat] || 1) * ageF;
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

  // Ritmo de competencia: cuanto rinde el entrenamiento segun hace cuanto no jugas un partido oficial
  TC.rhythmOf = function(state, p){
    var last = p.lastMatchDay != null ? p.lastMatchDay : state.day - 7;
    var weeks = Math.max(0, (state.day - last) / 7);
    var mult = weeks <= 4 ? 1 : Math.max(0.3, 1 - 0.09 * (weeks - 4));
    return {weeks: weeks, mult: mult};
  };

  // Juega un partido entre dos jugadores del mundo, aplica energia/forma/lesion
  // isQuali: las fases previas se juegan SIEMPRE al mejor de 3 (aun en Grand Slams)
  TC.playWorldMatch = function(state, aId, bId, inst, rng, isQuali){
    var A = state.players[aId], B = state.players[bId];
    A.lastMatchDay = state.day;
    B.lastMatchDay = state.day;
    var result = TC.simMatch(playerForMatch(A), playerForMatch(B), {surface: inst.surf, bestOf: isQuali ? 3 : inst.bestOf, rng: rng});
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
    // titulo del humano: registrado ACA (cubre tambien finales ganadas por W.O.)
    if(isChampion && pid === state.humanId && state.career){
      state.career.titles.push({name: inst.name, cat: inst.cat, year: TC.dateOf(state.day).getUTCFullYear(), surf: inst.surf});
    }
    var entry = {day: state.day, pts: pts, tid: inst.id, name: inst.name, cat: inst.cat, rw: roundsWon, champ: !!isChampion, bid: inst.baseId || null};
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
    // participacion del humano (con su resultado, para poder filtrar "mis torneos")
    var my = null;
    if(state.humanId != null){
      var inMain = inst.entrants && inst.entrants.indexOf(state.humanId) >= 0;
      var inQ = inst.qEntrants && inst.qEntrants.indexOf(state.humanId) >= 0;
      if(inMain || inQ){
        my = {q: !inMain};
        var hh = state.players[state.humanId];
        for(var ri = hh.results.length - 1; ri >= 0; ri--){
          if(hh.results[ri].tid === inst.id){
            my.rw = hh.results[ri].rw;
            my.champ = !!hh.results[ri].champ;
            my.pts = hh.results[ri].pts;
            my.q = !!hh.results[ri].q;
            break;
          }
        }
      }
    }
    state.archive.push({
      my: my,
      y: TC.dateOf(inst.startDay).getUTCFullYear(),
      name: inst.name, cat: inst.cat, surf: inst.surf,
      region: inst.region || null,
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

  // Aviso cuando el humano gana o pierde por W.O. (que nunca sea silencioso)
  function notifyHumanWO(state, inst, records, roundLbl){
    if(state.humanId == null) return;
    for(var i = 0; i < records.length; i++){
      var rec = records[i];
      if(!rec.wo || !rec.p) continue;
      if(rec.p[0] !== state.humanId && rec.p[1] !== state.humanId) continue;
      var oppId = rec.p[0] === state.humanId ? rec.p[1] : rec.p[0];
      var oppN = oppId != null ? state.players[oppId].name : '?';
      if(rec.w === state.humanId){
        pushNews(state, oppN + ' se bajo lesionado: avanzas por W.O. en ' + inst.name + (roundLbl ? ' (' + roundLbl + ')' : '') + '.', true);
      } else {
        pushNews(state, 'No pudiste presentarte (lesion): derrota por W.O. ante ' + oppN + ' en ' + inst.name + '.', true);
      }
    }
  }

  function finishRound(state, inst, rIdx, records, rng){
    inst.pendingRecords = null;
    inst.results[rIdx] = records;
    notifyHumanWO(state, inst, records, TC.roundLabel(inst, rIdx));
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

  // ===== QUALY =====
  function awardQuali(state, pid, inst, qr, rec){
    var qc = TC.QUALI[inst.cat];
    var pts = (qc && qc.pts[qr]) || 0;
    var p = state.players[pid];
    var entry = {day: state.day, pts: pts, tid: inst.id, name: inst.name + ' (Q)', cat: inst.cat, rw: 0, champ: false, q: true, bid: inst.baseId};
    if(pid === state.humanId && rec && rec.p){
      var oppId = rec.p[0] === pid ? rec.p[1] : rec.p[0];
      if(oppId != null){
        entry.vs = state.players[oppId].name;
        entry.sc = rec.sc || (rec.wo ? 'W.O.' : '');
      }
    }
    p.results.push(entry);
    p.curT = null;
  }

  function playQualiRound(state, inst, qr, rng){
    var round = inst.qBracket[qr];
    var records = inst.qPendingRecords || null;
    var humanPending = false;
    if(!records){
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
            rec = {p:[a,b], w:null, human:true};
            humanPending = true;
          } else {
            var m = TC.playWorldMatch(state, a, b, inst, rng, true);
            rec = {p:[a,b], w: m.winnerId, sc: m.score};
          }
        }
        records.push(rec);
      }
    } else {
      humanPending = records.some(function(r){ return r.human && r.w == null; });
    }

    if(humanPending){
      inst.qPendingRecords = records;
      var hp = null;
      for(var j = 0; j < records.length; j++){
        if(records[j].human && records[j].w == null){ hp = records[j]; break; }
      }
      var opp = hp.p[0] === state.humanId ? hp.p[1] : hp.p[0];
      state.pendingMatch = {tid: inst.id, round: qr, oppId: opp, day: state.day, quali: true};
      return true;
    }

    finishQualiRound(state, inst, qr, records, rng);
    return false;
  }

  function finishQualiRound(state, inst, qr, records, rng){
    inst.qPendingRecords = null;
    inst.qResults[qr] = records;
    notifyHumanWO(state, inst, records, 'Qualy ronda ' + (qr + 1));
    var winners = [];
    for(var i = 0; i < records.length; i++){
      var rec = records[i];
      winners.push(rec.w);
      var loser = null;
      if(rec.p[0] != null && rec.p[1] != null){ loser = rec.p[0] === rec.w ? rec.p[1] : rec.p[0]; }
      if(loser != null) awardQuali(state, loser, inst, qr, rec);
    }
    inst.qRound = qr + 1;
    var qRounds = (TC.QUALI[inst.cat] && TC.QUALI[inst.cat].rounds) || 2;
    if(qr >= qRounds - 1){
      // clasificados al cuadro principal
      inst.qualifiers = winners.filter(function(w){ return w != null; });
      if(inst.qualifiers.indexOf(state.humanId) >= 0){
        pushNews(state, 'Clasificaste al cuadro principal de ' + inst.name + '!', true);
      }
    } else {
      inst.qBracket.push(winners);
    }
  }

  // Sorteo del cuadro principal: directos + clasificados de la qualy
  function buildMainDraw(state, inst, rng){
    var combined = inst.directs.concat(inst.qualifiers || []).filter(function(x){ return x != null; });
    combined.sort(function(a, b){ return state.players[a].rank - state.players[b].rank; });
    inst.bracket = [TC.makeDraw(combined, inst.drawSize, rng)];
    inst.results = [];
    inst.currentRound = 0;
    inst.entrants = combined.slice();
    inst.mainBuilt = true;
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
    notifyHumanWO(state, inst, records, rIdx <= 2 ? 'Round Robin' : (rIdx === 3 ? 'Semifinal' : 'Final'));
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
  TC._finishQualiRoundPublic = finishQualiRound;
  TC._seasonRollover = seasonRollover;

  // Puntos que el humano defiende en la proxima edicion de un torneo (los del año pasado)
  TC.defending = function(state, def){
    if(!def.baseId) return 0;
    var h = state.players[state.humanId];
    if(!h) return 0;
    var best = 0;
    for(var i = 0; i < h.results.length; i++){
      var r = h.results[i];
      if(r.bid === def.baseId && r.day < def.startDay - 200 && r.day > def.startDay - 500 && r.pts > best) best = r.pts;
    }
    return best;
  };

  // ================== RECAP DE TEMPORADA ==================
  function buildRecap(state, y){
    var arc = (state.archive || []).filter(function(e){ return e.y === y; });
    var ps = state.players, h = ps[state.humanId];
    var res = h.results.filter(function(r){ return TC.dateOf(r.day).getUTCFullYear() === y; });
    var wins = 0, losses = 0;
    res.forEach(function(r){ wins += r.rw || 0; if(!r.champ) losses++; });
    var titles = arc.filter(function(e){ return e.champId === state.humanId; })
                    .map(function(e){ return {name: e.name, cat: e.cat}; });
    var best = res.slice().sort(function(a, b){ return b.pts - a.pts; })[0] || null;
    var top5 = ps.filter(function(p){ return p.rank <= 5; })
                 .sort(function(a, b){ return a.rank - b.rank; })
                 .map(function(p){ return {id: p.id, name: p.name, rank: p.rank, pts: p.pts}; });
    var gs = arc.filter(function(e){ return e.cat === 'GS'; })
                .map(function(e){ return {t: e.name, c: e.champ, cid: e.champId}; });
    var fin = null;
    for(var i = 0; i < arc.length; i++) if(arc[i].cat === 'FINALS') fin = arc[i];
    var counts = {};
    arc.forEach(function(e){ if(e.champ && ['GS','M1000','500','250','FINALS'].indexOf(e.cat) >= 0){ counts[e.champ] = (counts[e.champ] || 0) + 1; } });
    var most = [];
    for(var k in counts) most.push({name: k, n: counts[k]});
    most.sort(function(a, b){ return b.n - a.n; });
    var rs = (state.rankStart && state.rankStart.ranks) || {};
    var climber = null;
    ps.forEach(function(p){
      if(p.isHuman || p.rank > 120) return;
      var st = rs[p.id];
      if(st == null) return;
      if(st >= 9999) st = 600;
      var d = st - p.rank;
      if(d > 40 && (!climber || d > climber.d)) climber = {id: p.id, name: p.name, d: d, from: st >= 600 ? 'NR' : st, to: p.rank};
    });
    var hs = rs[h.id];
    state.recap = {
      y: y,
      human: {
        rankStart: (hs == null || hs >= 9999) ? null : hs,
        rank: h.rank >= 9999 ? null : h.rank,
        pts: h.pts, wins: wins, losses: losses,
        titles: titles, best: best
      },
      top5: top5, gs: gs,
      finals: fin ? {c: fin.champ, cid: fin.champId} : null,
      most: most.slice(0, 3), climber: climber
    };
    state.recapNew = true;
  }

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

    // Cambio de temporada: el 26 de diciembre cierra el año y ya abre el calendario nuevo
    // (asi llegas fresco y con tiempo de inscribirte a los torneos del 1 de enero)
    var dt = TC.dateOf(state.day);
    var newYear = null;
    if(dt.getUTCMonth() === 11 && dt.getUTCDate() === 26) newYear = dt.getUTCFullYear() + 1;
    else if(dt.getUTCMonth() === 0 && dt.getUTCDate() === 1) newYear = dt.getUTCFullYear(); // respaldo para partidas viejas
    if(newYear && state.seasonYear !== newYear){
      if(state.seasonYear){
        // foto del ranking de fin de año (registro historico)
        var yTop = state.players.filter(function(p){ return p.rank !== 9999; })
                                .sort(function(a, b){ return a.rank - b.rank; });
        var snapTop = yTop.slice(0, 150).map(function(p){
          return {r: p.rank, n: p.name, c: p.country, p: p.pts, id: p.id, h: p.id === state.humanId};
        });
        if(state.humanId != null){
          var hu2 = state.players[state.humanId];
          if(hu2.rank !== 9999 && hu2.rank > 150){
            snapTop.push({r: hu2.rank, n: hu2.name, c: hu2.country, p: hu2.pts, id: hu2.id, h: true});
          }
        }
        state.rankArchive = state.rankArchive || [];
        state.rankArchive.push({y: state.seasonYear, top: snapTop});
        if(state.rankArchive.length > 25) state.rankArchive.shift();

        if(!state.presim && state.humanId != null) buildRecap(state, state.seasonYear);
        seasonRollover(state, rng);
      }
      TC.buildSeason(state, newYear);
      if(!state.presim) pushNews(state, 'Pretemporada: ya esta el calendario ' + newYear + '. Inscribite a los torneos de enero.', true);
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

    // Arrancan torneos de hoy (los ATP con qualy abren 2 dias antes del cuadro principal)
    for(var i = 0; i < state.schedule.length; i++){
      var def = state.schedule[i];
      var startEff = TC.QUALI[def.cat] ? def.startDay - (TC.QUALI[def.cat].rounds || 2) : def.startDay;
      if(startEff === state.day && !def.started){
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
      // fase previa (qualy) y sorteo del cuadro principal
      if(t.qBracket){
        var qr = t.qDays.indexOf(state.day);
        if(qr >= 0 && t.qRound === qr){
          if(playQualiRound(state, t, qr, rng)) return true;
        }
        if(!t.mainBuilt && state.day >= t.startDay){
          var qR = (TC.QUALI[t.cat] && TC.QUALI[t.cat].rounds) || 2;
          var guardq = 0;
          while(t.qRound < qR && guardq++ < 4){
            if(playQualiRound(state, t, t.qRound, rng)) return true;
          }
          if(t.qRound >= qR) buildMainDraw(state, t, rng);
        }
        if(!t.mainBuilt) continue;
      }
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

    // incorporacion pendiente: al quedar libre del torneo anterior, recien ahi viajas al proximo
    if(state.humanId != null){
      var hj = ps[state.humanId];
      if(hj.curT == null){
        for(var ji = 0; ji < state.active.length; ji++){
          var jt = state.active[ji];
          if(jt.humanJoinLater && !jt.done){
            jt.humanJoinLater = false;
            hj.curT = jt.id;
            var jFrom = hj.loc || playerRegion(hj);
            var jc = TC.travelCost(jFrom, jt.region);
            hj.energy = Math.max(0, hj.energy - jc);
            if(jt.region) hj.loc = jt.region;
            if(jc > 5) pushNews(state, 'Vuelo largo a ' + (TC.REGION_LABEL[jt.region] || '?') + ' para ' + jt.name + ' (-' + jc + ' de energia)', true);
            break;
          }
        }
      }
    }

    // IA con incorporacion pendiente: al quedar libre del torneo anterior, viaja y se suma
    for(var ai = 0; ai < state.active.length; ai++){
      var at = state.active[ai];
      if(!at.joinLater || !at.joinLater.length || at.done) continue;
      var still = [];
      for(var aj = 0; aj < at.joinLater.length; aj++){
        var ap = ps[at.joinLater[aj]];
        if(ap.curT != null){ still.push(at.joinLater[aj]); continue; }
        if(ap.injury) continue; // se lesiono en el otro torneo: su partido queda W.O.
        ap.curT = at.id;
        var aFrom = ap.loc || playerRegion(ap);
        ap.energy = Math.max(0, ap.energy - TC.travelCost(aFrom, at.region));
        if(at.region) ap.loc = at.region;
      }
      at.joinLater = still;
    }

    for(var i = 0; i < ps.length; i++){
      var p = ps[i];
      // semana sin torneo: vuelta a casa (el humano elige: casa, quedarse, o adelantarse al proximo destino)
      if(mod7(state.day) === 0 && p.curT === null){
        if(i !== state.humanId){
          p.loc = playerRegion(p);
        } else {
          var mode = state.stayMode || (state.stayAbroad ? 'stay' : 'home');
          if(mode === 'home'){
            p.loc = playerRegion(p);
          } else if(mode === 'next'){
            // viajar anticipado a la region del proximo torneo inscripto
            var target = null;
            for(var ri2 = 0; ri2 < state.registrations.length; ri2++){
              for(var si2 = 0; si2 < state.schedule.length; si2++){
                var sd2 = state.schedule[si2];
                if(sd2.id === state.registrations[ri2] && sd2.region && sd2.startDay > state.day){
                  if(!target || sd2.startDay < target.startDay) target = sd2;
                }
              }
            }
            if(target && target.region !== p.loc){
              var tcost = TC.travelCost(p.loc, target.region);
              p.energy = Math.max(0, p.energy - tcost);
              p.loc = target.region;
              pushNews(state, 'Viajaste anticipado a ' + (TC.REGION_LABEL[target.region] || '?') + ' para preparar ' + target.name + ' (-' + tcost + ' de energia)', true);
            }
          }
          // 'stay': se queda donde esta
        }
      }
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
          // el tiempo lesionado no cuenta como "falta de ritmo" (gracia de 3 semanas)
          if(p.lastMatchDay != null) p.lastMatchDay = Math.max(p.lastMatchDay, state.day - 21);
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
      // oxidado: mucho tiempo sin competir baja la forma del humano (volver cuesta)
      if(state.humanId != null){
        var hu = ps[state.humanId];
        if(!hu.injury && TC.rhythmOf(state, hu).weeks > 6){
          hu.form = Math.max(-0.5, hu.form - 0.08);
        }
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
      // curva de aprendizaje: de joven absorbes todo, de grande casi nada
      var ageF = p.age <= 19 ? 3.4 : (p.age <= 21 ? 2.6 : (p.age <= 24 ? 2.0 : (p.age <= 27 ? 1.15 : (p.age <= 30 ? 0.6 : (p.age <= 33 ? 0.25 : 0.08)))));
      var curve = Math.max(0.12, (10.6 - p[focus]) / 6);
      // cuanto mas fundido, menos rinde el entrenamiento
      var eff = 0.4 + 0.6 * Math.min(1, p.energy / 55);
      // sin ritmo de partidos oficiales, el entrenamiento rinde cada vez menos
      var ritmo = TC.rhythmOf(state, p).mult;
      p[focus] = Math.min(9.8, Math.round((p[focus] + 0.0095 * ageF * curve * eff * ritmo) * 10000) / 10000);
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
      // vacaciones + pretemporada: todos arrancan el año a full
      if(!p.injury) p.energy = Math.max(p.energy, 95);
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
