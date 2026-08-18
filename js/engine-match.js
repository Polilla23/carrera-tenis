// Motor de partidos: modelo punto a punto basado en probabilidad de ganar el punto al saque.
// Corrige los problemas del simulador original:
//  - el sacador tiene ventaja real (holds ~80% como en la ATP)
//  - la superficie compara con == (el original tenia "surface='grass'" que siempre daba hierba)
//  - sin DOM ni globales: funcion pura, simula un partido en microsegundos
var TC = (typeof TC !== 'undefined') ? TC : {};
(function(){

  // Pesos del juego de fondo por superficie (espiritu de los pesos del sim original, normalizados)
  var GW = {
    clay:  {fh:1.4, bh:1.4, vol:0.4, dro:1.0, spd:1.5, sta:1.4, pow:1.0, con:1.6},
    hard:  {fh:1.5, bh:1.5, vol:0.8, dro:0.7, spd:1.3, sta:1.2, pow:1.4, con:1.3},
    grass: {fh:1.5, bh:1.3, vol:1.4, dro:0.8, spd:1.2, sta:0.9, pow:1.6, con:1.0},
    indoor:{fh:1.6, bh:1.5, vol:1.1, dro:0.7, spd:1.1, sta:0.9, pow:1.6, con:1.2}
  };
  // Prob. base de ganar el punto sacando, jugadores iguales (calibrado con tasas ATP reales)
  var BASE_P = {clay:0.615, hard:0.645, grass:0.672, indoor:0.660};

  function groundRating(p, surf){
    var w = GW[surf], s = 0, tw = 0, k;
    for(k in w){ s += (p[k]||5) * w[k]; tw += w[k]; }
    return s / tw;
  }
  function prefBonus(p, surf){
    if(p.pref === 'all') return 0.15;
    return p.pref === surf ? 0.40 : 0;
  }
  function energyFactor(en){
    if(en == null) en = 100;
    en = Math.max(0, Math.min(100, en));
    var f = 0.84 + 0.16 * Math.pow(en/100, 0.6);
    if(en < 30) f -= ((30 - en) / 30) * 0.08; // fundido de verdad: el cuerpo no responde
    return f;
  }

  // Perfil efectivo para un partido (aplica energia, forma, superficie preferida y "dia de forma")
  function profile(p, surf, rng){
    var e = energyFactor(p.energy);
    var f = 1 + (p.form||0) * 0.03;
    var b = prefBonus(p, surf);
    var day = (rng() * 2 - 1) * 0.45; // el dia bueno/malo: hace posibles las sorpresas
    var lefty = p.hand === 'Z' ? 0.15 : 0; // el saque zurdo incomoda
    var hM = p.ht ? (p.ht - 185) / 25 : 0; // altura: mas saque, algo menos de resto y movilidad
    // el saque alto pega mas en superficies rapidas; el polvo castiga la falta de movilidad
    var hSrv = hM * (surf === 'grass' || surf === 'indoor' ? 0.55 : (surf === 'hard' ? 0.45 : 0.22));
    var hMov = hM * (surf === 'clay' ? 0.22 : 0.08);
    return {
      S: (p.srv*0.6 + p.pow*0.4 + b + day + lefty + hSrv) * e * f,  // saque
      R: (p.ret*0.55 + p.spd*0.2 + p.con*0.25 + b*0.5 + day - hM*0.18) * e * f, // resto
      G: (groundRating(p, surf) + b + day - hMov) * e * f,          // juego de fondo
      fatigueRate: Math.max(0.008, 0.028 - p.sta*0.0018) // desgaste por set (depende de resistencia)
    };
  }

  // Prob. de que el sacador gane el punto
  function pServe(surf, sv, rt, setsDone){
    var cs = 1 - setsDone * sv.fatigueRate;
    var cr = 1 - setsDone * rt.fatigueRate;
    var p = BASE_P[surf]
          + 0.026 * (sv.S * cs - rt.R * cr)
          + 0.010 * (sv.G * cs - rt.G * cr);
    return Math.max(0.30, Math.min(0.92, p));
  }

  function playGame(p, rng){ // devuelve true si el sacador gana; cuenta puntos
    var a = 0, b = 0, pts = 0;
    while(true){
      pts++;
      if(rng() < p) a++; else b++;
      if(a >= 4 && a - b >= 2) return {hold:true, pts:pts};
      if(b >= 4 && b - a >= 2) return {hold:false, pts:pts};
      if(a === 4 && b === 4){ a = 3; b = 3; } // deuce simplificado
    }
  }

  function playTiebreak(surf, pr0, pr1, server, setsDone, target, rng){
    var s0 = 0, s1 = 0, pts = 0, sv = server;
    var pA = pServe(surf, pr0, pr1, setsDone);
    var pB = pServe(surf, pr1, pr0, setsDone);
    while(true){
      pts++;
      var serverWins = rng() < (sv === 0 ? pA : pB);
      if(serverWins){ if(sv === 0) s0++; else s1++; }
      else { if(sv === 0) s1++; else s0++; }
      // rotacion de saque del tiebreak: 1 punto, luego de a 2
      if(pts % 2 === 1) sv = 1 - sv;
      if(s0 >= target && s0 - s1 >= 2) return {winner:0, pts:pts, score:[s0,s1]};
      if(s1 >= target && s1 - s0 >= 2) return {winner:1, pts:pts, score:[s0,s1]};
    }
  }

  // Simula un partido completo. p0/p1: jugadores {fh..con, pref, form, energy}
  // opts: {surface, bestOf, rng}
  TC.simMatch = function(p0, p1, opts){
    var surf = opts.surface;
    var bestOf = opts.bestOf || 3;
    var rng = opts.rng || Math.random;
    var need = Math.ceil(bestOf / 2);
    var pr0 = profile(p0, surf, rng), pr1 = profile(p1, surf, rng);

    var sets = [], sw0 = 0, sw1 = 0, totalPts = 0, totalGames = 0, tbs = 0;
    var server = rng() < 0.5 ? 0 : 1;

    while(sw0 < need && sw1 < need){
      var setsDone = sw0 + sw1;
      var g0 = 0, g1 = 0, tbScore = null;
      while(true){
        if(g0 === 6 && g1 === 6){
          var isLastSet = (setsDone === bestOf - 1);
          var tb = playTiebreak(surf, pr0, pr1, server, setsDone, isLastSet ? 10 : 7, rng);
          totalPts += tb.pts; tbs++;
          server = 1 - server;
          if(tb.winner === 0){ g0 = 7; } else { g1 = 7; }
          tbScore = tb.score;
          break;
        }
        var sv = server === 0 ? pr0 : pr1;
        var rt = server === 0 ? pr1 : pr0;
        var g = playGame(pServe(surf, sv, rt, setsDone), rng);
        totalPts += g.pts;
        var gameWinner = g.hold ? server : 1 - server;
        if(gameWinner === 0) g0++; else g1++;
        server = 1 - server;
        if((g0 >= 6 || g1 >= 6) && Math.abs(g0 - g1) >= 2) break;
      }
      totalGames += g0 + g1;
      sets.push({g:[g0,g1], tb:tbScore});
      if(g0 > g1) sw0++; else sw1++;
    }

    var winner = sw0 > sw1 ? 0 : 1;
    // Duracion estimada: ~40s por punto en polvo, un poco menos en rapidas
    var perPoint = surf === 'clay' ? 0.72 : (surf === 'grass' ? 0.58 : 0.65);
    var duration = Math.round(totalPts * perPoint + (sw0+sw1) * 4);

    return {
      winner: winner,
      sets: sets,
      setsWon: [sw0, sw1],
      totalGames: totalGames,
      totalPoints: totalPts,
      tiebreaks: tbs,
      duration: duration // minutos
    };
  };

  // Costo fisico de un partido (0-100 de energia)
  TC.matchEnergyCost = function(player, result, idx, surf){
    var setsPlayed = result.sets.length;
    var surfF = surf === 'clay' ? 1.15 : (surf === 'grass' ? 0.9 : (surf === 'indoor' ? 0.9 : 1.0));
    var staF = 1.35 - player.sta * 0.05;
    var cost = (4 + 2.2 * setsPlayed + 0.10 * result.totalGames) * staF * surfF;
    return Math.max(3, Math.round(cost));
  };

  // Riesgo de lesion post-partido: bajo 30% de energia se dispara (jugar fundido es una ruleta)
  TC.injuryRisk = function(player, energyAfter){
    var base = 0.012;
    var fragil = (10 - player.sta) * 0.06;
    var en = Math.max(0, energyAfter == null ? 100 : energyAfter);
    var fatiga = 1;
    if(en < 60 && en >= 30) fatiga = 1 + (60 - en) / 30;      // hasta 2x
    else if(en < 30) fatiga = 2 + ((30 - en) / 30) * 6;       // de 2x a 8x
    return base * (1 + fragil) * fatiga;
  };

  // Fundido, las lesiones ademas son mas graves (hasta 2.5x mas largas)
  TC.injuryDaysMult = function(en){
    en = Math.max(0, en == null ? 100 : en);
    return en >= 30 ? 1 : 1 + ((30 - en) / 30) * 1.5;
  };

  TC.energyFactor = energyFactor;
  TC.groundRating = groundRating;

  // Rating global aproximado (para seeds iniciales y UI)
  TC.overall = function(p){
    return (p.fh*1.3 + p.bh*1.3 + p.vol*0.6 + p.dro*0.5 + p.spd*1.1 + p.sta*1.1 +
            p.srv*1.4 + p.pow*1.1 + p.ret*1.1 + p.con*1.5) / 10.9;
  };
})();
