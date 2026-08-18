// UI de la carrera: menu, creacion, pantalla principal con tabs, modal de partidos
var UI = {};
(function(){
  var S = null;              // estado del juego
  var tab = 'calendar';
  var calFilter = 'auto';
  var detailId = null;       // torneo abierto en el visor de detalle (def del calendario)
  var archInstId = null;     // torneo abierto desde el archivo (instancia)
  var archiveYear = null;    // anio seleccionado en el archivo
  var app;

  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  var SURF_LABEL = {clay:'Polvo', hard:'Dura', grass:'Hierba', indoor:'Indoor', all:'Neutral'};

  UI.init = function(){
    app = $('app');
    // ficha de jugador: cualquier nombre clickeable en toda la app
    document.addEventListener('click', function(e){
      var el = e.target.closest('[data-player]');
      if(el && S){ openPlayerModal(parseInt(el.dataset.player, 10)); }
    });
    showMenu();
  };

  // ================= MENU =================
  function showMenu(){
    var hasSave = TC.hasSave();
    app.innerHTML =
      '<div class="menu-screen">' +
        '<div class="menu-title">CARRERA <span class="ball">●</span> TENIS</div>' +
        '<div class="menu-sub">De los futures ITF al numero 1 del mundo</div>' +
        (hasSave ? '<button class="menu-btn primary" id="btn-continue">Continuar carrera</button>' : '') +
        '<button class="menu-btn' + (hasSave ? '' : ' primary') + '" id="btn-new">Nueva carrera</button>' +
        (hasSave ? '<button class="menu-btn danger" id="btn-delete">Borrar partida</button>' : '') +
      '</div>';
    if(hasSave){
      $('btn-continue').onclick = function(){
        S = TC.load();
        if(S){ startGame(); } else { alert('No se pudo cargar la partida'); }
      };
      $('btn-delete').onclick = function(){
        if(confirm('Seguro? Se borra la carrera guardada.')){ TC.deleteSave(); showMenu(); }
      };
    }
    $('btn-new').onclick = showCreate;
  }

  // ================= CREACION =================
  var createCfg = {archetype:'completo', pref:'hard', name:'', country:'ARG', attrs:null};
  function keepCreateInputs(){
    var n = $('c-name'), c = $('c-country');
    if(n) createCfg.name = n.value;
    if(c) createCfg.country = c.value;
  }
  function cfgAttrs(){
    if(!createCfg.attrs){
      var preset = TC.ARCHETYPES[createCfg.archetype].attrs, copy = {};
      for(var k in preset) copy[k] = preset[k];
      createCfg.attrs = copy;
    }
    return createCfg.attrs;
  }
  function cfgSum(){
    var s = 0, a = cfgAttrs();
    for(var k in a) s += a[k];
    return Math.round(s * 10) / 10;
  }
  function updateBudgetUI(){
    var used = cfgSum();
    var over = used > TC.ATTR_BUDGET + 0.001;
    var el = $('budget-used');
    if(el){
      el.textContent = used.toFixed(1);
      el.style.color = over ? 'var(--danger)' : (used < TC.ATTR_BUDGET - 0.05 ? 'var(--warn)' : 'var(--accent)');
    }
    var go = $('c-go');
    if(go) go.disabled = over;
  }
  function showCreate(){
    var archs = '';
    for(var k in TC.ARCHETYPES){
      var a = TC.ARCHETYPES[k];
      archs += '<div class="arch-card' + (createCfg.archetype===k?' sel':'') + '" data-arch="' + k + '">' +
        '<h4>' + a.label + '</h4><p>' + a.desc + '</p></div>';
    }
    var countries = TC.COUNTRIES.map(function(c){ return '<option' + (c===createCfg.country?' selected':'') + '>' + c + '</option>'; }).join('');
    var surfs = ['hard','clay','grass','indoor'].map(function(s){
      return '<button class="surf-btn' + (createCfg.pref===s?' sel':'') + '" data-surf="' + s + '">' + SURF_LABEL[s] + '</button>';
    }).join('');

    var attrs = cfgAttrs();
    var sliders = TC.ATTRS.map(function(a){
      return '<div class="slider-row">' +
        '<div class="an">' + TC.ATTR_LABEL[a] + '</div>' +
        '<input type="range" min="' + TC.ATTR_MIN + '" max="' + TC.ATTR_MAX + '" step="0.1" value="' + attrs[a] + '" data-slider="' + a + '">' +
        '<div class="av" id="sv-' + a + '">' + attrs[a].toFixed(1) + '</div>' +
      '</div>';
    }).join('');

    app.innerHTML =
      '<div class="create-box">' +
        '<h2>Nueva carrera</h2>' +
        '<div class="form-row"><label>Apellido, Nombre</label><input id="c-name" placeholder="Del Potro, Juan Martin" maxlength="30" value="' + esc(createCfg.name) + '"></div>' +
        '<div class="form-row"><label>Pais</label><select id="c-country">' + countries + '</select></div>' +
        '<div class="form-row"><label>Estilo base (carga un reparto sugerido)</label><div class="arch-grid" id="arch-grid">' + archs + '</div></div>' +
        '<div class="form-row"><label>Atributos — ajustalos a gusto (' + TC.ATTR_MIN.toFixed(1) + ' a ' + TC.ATTR_MAX.toFixed(1) + ' cada uno)</label>' +
          '<div id="sliders">' + sliders + '</div>' +
          '<div class="budget-line">Puntos usados: <b id="budget-used">' + cfgSum().toFixed(1) + '</b> / ' + TC.ATTR_BUDGET + '</div>' +
        '</div>' +
        '<div class="form-row"><label>Superficie preferida</label><div class="surf-row" id="surf-row">' + surfs + '</div></div>' +
        '<div style="display:flex;gap:10px;margin-top:22px">' +
          '<button class="btn" id="c-back">Volver</button>' +
          '<button class="btn primary" style="flex:1;padding:12px" id="c-go">Empezar carrera (17 anios)</button>' +
        '</div>' +
      '</div>';

    $('sliders').oninput = function(e){
      var a = e.target.dataset.slider;
      if(!a) return;
      cfgAttrs()[a] = parseFloat(e.target.value);
      $('sv-' + a).textContent = parseFloat(e.target.value).toFixed(1);
      updateBudgetUI();
    };
    updateBudgetUI();

    $('arch-grid').onclick = function(e){
      var card = e.target.closest('.arch-card');
      if(!card) return;
      keepCreateInputs();
      createCfg.archetype = card.dataset.arch;
      createCfg.attrs = null; // recargar el preset del estilo en los sliders
      showCreate();
    };
    $('surf-row').onclick = function(e){
      var b = e.target.closest('.surf-btn');
      if(!b) return;
      keepCreateInputs();
      createCfg.pref = b.dataset.surf;
      showCreate();
    };
    $('c-back').onclick = showMenu;
    $('c-go').onclick = function(){
      if(cfgSum() > TC.ATTR_BUDGET + 0.001) return;
      var name = $('c-name').value.trim() || 'Jugador, Nuevo';
      var country = $('c-country').value;
      var attrsCopy = {};
      for(var k in cfgAttrs()) attrsCopy[k] = cfgAttrs()[k];
      app.innerHTML = '<div class="loading-screen"><div class="spinner"></div><div>Simulando la temporada previa del circuito...</div></div>';
      setTimeout(function(){
        S = TC.newCareer({name:name, country:country, archetype:createCfg.archetype, pref:createCfg.pref, attrs:attrsCopy});
        TC.save(S);
        startGame();
      }, 60);
    };
  }

  // ================= JUEGO =================
  function human(){ return S.players[S.humanId]; }

  function startGame(){
    tab = 'calendar';
    render();
  }

  function render(){
    window.__tcState = S; // debug
    var h = human();
    app.innerHTML = renderTopbar(h) + renderTabs() + '<div class="panel" id="panel">' + renderTab() + '</div>' + renderActionBar();
    bindMain();
    if(tab === 'player') drawRankChart();
  }

  function fmtForm(f){
    if(f > 0.45) return '<span style="color:var(--accent2)">▲▲</span>';
    if(f > 0.12) return '<span style="color:var(--accent2)">▲</span>';
    if(f < -0.45) return '<span style="color:var(--danger)">▼▼</span>';
    if(f < -0.12) return '<span style="color:var(--danger)">▼</span>';
    return '<span style="color:var(--muted)">=</span>';
  }

  function initials(name){
    var parts = name.replace(',', '').split(/\s+/);
    return ((parts[1] || ' ')[0] || '') + (parts[0][0] || '');
  }

  function renderTopbar(h){
    var ecolor = h.energy > 70 ? 'var(--accent2)' : (h.energy > 40 ? 'var(--warn)' : 'var(--danger)');
    return '<div class="topbar">' +
      '<div class="avatar">' + esc(initials(h.name).toUpperCase()) + '</div>' +
      '<div class="who"><div class="nm">' + esc(h.name) + '</div><div class="cc">' + h.country + ' · ' + h.age + ' anios · ' + SURF_LABEL[h.pref] + '</div></div>' +
      '<div class="hero-rank"><div class="v">' + (h.rank === 9999 ? 'NR' : '#' + h.rank) + '</div><div class="l">Ranking</div></div>' +
      '<div class="stat"><div class="v">' + h.pts + '</div><div class="l">Puntos</div></div>' +
      '<div class="stat"><div class="v">' + fmtForm(h.form) + '</div><div class="l">Forma</div></div>' +
      '<div class="stat"><div class="ebar"><div style="width:' + Math.round(h.energy) + '%;background:' + ecolor + ';color:' + ecolor + '"></div></div>' +
        '<div class="l">Energia ' + Math.round(h.energy) + '%</div></div>' +
      (h.injury ? '<div class="injury-chip">LESION: ' + esc(h.injury.name) + ' (' + h.injury.days + 'd)</div>' : '') +
      '<div class="spacer"></div>' +
      '<div class="datechip">📅 ' + TC.fmtDate(S.day) + '</div>' +
      '<button class="btn small ghost" id="btn-menu">Menu</button>' +
    '</div>';
  }

  function renderTabs(){
    var tabs = [
      ['calendar','Calendario'], ['tournament','Torneo'], ['player','Jugador'],
      ['ranking','Ranking'], ['archive','Archivo'], ['history','Historial'], ['news','Noticias']
    ];
    var inT = playerTournament();
    return '<div class="tabs">' + tabs.map(function(t){
      var dot = (t[0]==='tournament' && inT) ? '<span class="dot"></span>' : '';
      return '<button class="tab' + (tab===t[0]?' on':'') + '" data-tab="' + t[0] + '">' + t[1] + dot + '</button>';
    }).join('') + '</div>';
  }

  function renderTab(){
    if(tab === 'calendar') return detailId ? renderTournamentDetail(detailId) : renderCalendar();
    if(tab === 'tournament') return renderTournament();
    if(tab === 'player') return renderPlayer();
    if(tab === 'ranking') return renderRanking();
    if(tab === 'archive') return archInstId ? renderArchiveDetail(archInstId) : renderArchive();
    if(tab === 'history') return renderHistory();
    if(tab === 'news') return renderNews();
    return '';
  }

  // ================= ARCHIVO HISTORICO =================
  function archiveName(id, name, champ){
    // el nombre queda "congelado" al momento del torneo; solo linkeamos si el jugador sigue siendo el mismo
    if(id != null && S.players[id] && S.players[id].name === name){
      return playerName(id, champ, true);
    }
    return champ ? '<b>' + esc(name || '?') + '</b>' : esc(name || '?');
  }

  function renderArchive(){
    var arc = S.archive || [];
    if(!arc.length) return '<p style="color:var(--muted)">Todavia no hay torneos terminados. (Las partidas empezadas antes de esta version no tienen archivo historico.)</p>';
    var years = [];
    for(var i = 0; i < arc.length; i++) if(years.indexOf(arc[i].y) < 0) years.push(arc[i].y);
    years.sort(function(a, b){ return b - a; });
    if(archiveYear == null || years.indexOf(archiveYear) < 0) archiveYear = years[0];

    var html = '<div class="cal-filters">' + years.map(function(y){
      return '<button class="chip' + (y === archiveYear ? ' on' : '') + '" data-ayear="' + y + '">' + y + '</button>';
    }).join('') + '</div>';

    var entries = arc.filter(function(e){ return e.y === archiveYear; })
                     .sort(function(a, b){ return a.startDay - b.startDay; });
    var lastMonth = -1;
    for(i = 0; i < entries.length; i++){
      var e = entries[i];
      var m = TC.dateOf(e.startDay).getUTCMonth();
      if(m !== lastMonth){
        html += '<div class="month-head">' + TC.MESES[m] + ' ' + e.y + '</div>';
        lastMonth = m;
      }
      var cat = TC.CATS[e.cat];
      var hasData = !!findFinishedInst(e.instId);
      var mine = e.champId === S.humanId ? ' reg' : '';
      html += '<div class="trow s-' + e.surf + mine + '">' +
        '<div class="dates">' + TC.fmtRange(e.startDay, e.startDay + e.dur - 1) + '</div>' +
        '<span class="badge" style="background:' + cat.color + '">' + esc(cat.label) + '</span>' +
        '<span class="sdot ' + e.surf + '"></span>' +
        '<div class="tname' + (hasData ? ' tlink" data-adetail="' + e.instId + '" title="Ver cuadro"' : '"') + '>' + esc(e.name) + '</div>' +
        '<div class="status">🏆 ' + archiveName(e.champId, e.champ, true) +
          (e.runner ? ' <span style="opacity:.65">d. ' + archiveName(e.runnerId, e.runner, false) + '</span>' : '') + '</div>' +
      '</div>';
    }
    return html;
  }

  function findFinishedInst(instId){
    for(var i = 0; i < S.finished.length; i++) if(S.finished[i].id === instId) return S.finished[i];
    return null;
  }

  function renderArchiveDetail(instId){
    var inst = findFinishedInst(instId);
    if(!inst){ archInstId = null; return renderArchive(); }
    var cat = TC.CATS[inst.cat];
    var html = '<button class="btn small ghost" id="btn-back-arch">← Volver al archivo</button>' +
      '<div class="tour-head" style="margin-top:10px"><h2>' + esc(inst.name) + '</h2>' +
      '<span class="badge" style="background:' + cat.color + '">' + cat.label + '</span>' +
      '<span class="sdot ' + inst.surf + '"></span> <span style="color:var(--muted)">' + SURF_LABEL[inst.surf] +
      ' · ' + TC.fmtRange(inst.startDay, inst.endDay) + ' · Cuadro de ' + inst.drawSize + '</span></div>';
    if(inst.championId != null){
      html += '<div class="champ-banner">🏆 Campeon: ' + playerName(inst.championId, true) + '</div>';
    }
    if(inst.isFinals) html += renderFinals(inst);
    else html += '<h3 class="section">Cuadro</h3>' + renderDraw(inst);
    html += entrantsTable({cat: inst.cat, id: inst.id}, inst);
    html += pointsTable({cat: inst.cat});
    return html;
  }

  // ================= CALENDARIO =================
  function catVisible(cat){
    if(calFilter === 'all') return true;
    if(calFilter === 'atp') return ['GS','M1000','500','250','FINALS'].indexOf(cat) >= 0;
    if(calFilter === 'ch') return cat === 'CH125' || cat === 'CH75';
    if(calFilter === 'itf') return cat === 'ITF25' || cat === 'ITF15';
    // auto: segun tu nivel
    var r = human().rank;
    if(r <= 120) return ['GS','M1000','500','250','FINALS'].indexOf(cat) >= 0;
    if(r <= 300) return ['250','CH125','CH75','GS','M1000','500'].indexOf(cat) >= 0;
    if(r <= 500) return ['CH125','CH75','ITF25'].indexOf(cat) >= 0;
    return ['ITF25','ITF15','CH75'].indexOf(cat) >= 0;
  }

  function renderCalendar(){
    var filters = [['auto','Para mi nivel'],['all','Todos'],['atp','ATP'],['ch','Challenger'],['itf','ITF']];
    var html = '<div class="cal-filters">' + filters.map(function(f){
      return '<button class="chip' + (calFilter===f[0]?' on':'') + '" data-filter="' + f[0] + '">' + f[1] + '</button>';
    }).join('') + '</div>';

    var byMonth = {};
    for(var i = 0; i < S.schedule.length; i++){
      var d = S.schedule[i];
      if(d.startDay + d.dur < S.day - 7) continue;         // pasado lejano no
      if(!catVisible(d.cat) && S.registrations.indexOf(d.id) < 0) continue;
      var m = TC.dateOf(d.startDay).getUTCMonth();
      (byMonth[m] = byMonth[m] || []).push(d);
    }
    var months = Object.keys(byMonth).map(Number).sort(function(a,b){return a-b;});
    if(!months.length) return html + '<p style="color:var(--muted)">No hay torneos visibles con este filtro.</p>';

    for(var mi = 0; mi < months.length; mi++){
      var m = months[mi];
      html += '<div class="month-head">' + TC.MESES[m] + ' ' + S.seasonYear + '</div>';
      var evs = byMonth[m].sort(function(a,b){ return a.startDay - b.startDay; });
      for(i = 0; i < evs.length; i++){
        html += renderTournamentRow(evs[i]);
      }
    }
    return html;
  }

  function renderTournamentRow(d){
    var cat = TC.CATS[d.cat];
    var isReg = S.registrations.indexOf(d.id) >= 0;
    var inst = d.instId ? TC.findActive(S, d.instId) : null;
    var isNow = S.day >= d.startDay && S.day <= d.startDay + d.dur - 1;
    var status = '', btn = '';

    if(d.startDay + d.dur - 1 < S.day){
      var fin = null;
      for(var i = 0; i < S.finished.length; i++) if(S.finished[i].id === d.instId){ fin = S.finished[i]; break; }
      status = fin && fin.championId != null ? 'Campeon: ' + esc(S.players[fin.championId].name) : 'Terminado';
    } else if(inst && !inst.done){
      status = 'En juego';
      if(inst.entrants && inst.entrants.indexOf(S.humanId) >= 0) status = 'Estas jugando';
    } else if(isReg){
      status = 'Inscripto';
      btn = '<button class="btn small" data-unreg="' + d.id + '">Bajarse</button>';
    } else {
      var chk = TC.canRegister(S, d);
      if(chk.ok){
        var daysLeft = d.startDay - S.day - 2;
        status = 'Cierra en ' + (daysLeft + 1) + 'd';
        btn = '<button class="btn small primary" data-reg="' + d.id + '">Inscribirse</button>';
      } else {
        status = chk.reason;
      }
    }

    return '<div class="trow s-' + d.surf + (isNow?' now':'') + (isReg?' reg':'') + '">' +
      '<div class="dates">' + TC.fmtRange(d.startDay, d.startDay + d.dur - 1) + '</div>' +
      '<span class="badge" style="background:' + cat.color + '">' + esc(cat.label) + '</span>' +
      '<span class="sdot ' + d.surf + '" title="' + SURF_LABEL[d.surf] + '"></span>' +
      '<div class="tname tlink" data-detail="' + d.id + '" title="Ver detalle del torneo">' + esc(d.name) + '</div>' +
      '<div class="status">' + status + '</div>' + btn +
    '</div>';
  }

  // ================= TORNEO =================
  function playerTournament(){
    var h = human();
    if(h.curT == null) return null;
    return TC.findActive(S, h.curT);
  }

  function renderTournament(){
    var t = playerTournament();
    if(!t){
      // mostrar el ultimo torneo del humano o el proximo inscripto
      var next = null;
      for(var i = 0; i < S.registrations.length; i++){
        var d = TC.findDef(S, S.registrations[i]);
        if(d && (!next || d.startDay < next.startDay)) next = d;
      }
      var html = '<p style="color:var(--muted)">No estas jugando ningun torneo ahora.</p>';
      if(next){
        html += '<div class="next-match" style="margin-top:12px"><div>Proximo: <b>' + esc(next.name) + '</b> — ' +
          TC.fmtRange(next.startDay, next.startDay + next.dur - 1) + ' (en ' + (next.startDay - S.day) + ' dias)</div></div>';
      }
      var lastT = null;
      for(i = 0; i < S.finished.length; i++){
        // buscar torneos donde participo el humano seria caro; mostramos el ultimo grande
        if(['GS','M1000','FINALS'].indexOf(S.finished[i].cat) >= 0){ lastT = S.finished[i]; break; }
      }
      if(lastT && lastT.championId != null){
        html += '<h3 class="section">Ultimo grande</h3><div class="trow"><div class="tname">' + esc(lastT.name) +
          '</div><div class="status">Campeon: ' + esc(S.players[lastT.championId].name) + '</div></div>';
      }
      return html;
    }
    return renderBracket(t);
  }

  function playerName(id, bold, noRank){
    if(id == null) return '<i style="color:var(--muted)">BYE</i>';
    var p = S.players[id];
    var inner = esc(p.name) + (!noRank && p.rank !== 9999 ? ' <span style="color:var(--muted);font-size:11px">#' + p.rank + '</span>' : '');
    var nm = '<span class="plink' + (id === S.humanId ? ' meplink' : '') + '" data-player="' + id + '">' + inner + '</span>';
    return bold ? '<b>' + nm + '</b>' : nm;
  }

  function renderBracket(t){
    var cat = TC.CATS[t.cat];
    var html = '<div class="tour-head"><h2>' + esc(t.name) + '</h2>' +
      '<span class="badge" style="background:' + cat.color + '">' + cat.label + '</span>' +
      '<span class="sdot ' + t.surf + '"></span> <span style="color:var(--muted)">' + SURF_LABEL[t.surf] +
      ' · ' + TC.fmtRange(t.startDay, t.endDay) + (t.bestOf === 5 ? ' · Al mejor de 5 sets' : '') + '</span></div>';

    if(t.isFinals) return html + renderFinals(t);

    // mi proximo partido
    if(S.pendingMatch && S.pendingMatch.tid === t.id){
      var opp = S.players[S.pendingMatch.oppId];
      html += '<div class="next-match"><div class="vs">' + TC.roundLabel(t, S.pendingMatch.round) + ': vs ' + playerName(opp.id) + '</div>' +
        '<div class="spacer"></div><button class="btn primary" id="btn-play2">Jugar ahora</button></div>';
    } else if(t.done && t.championId === S.humanId){
      html += '<div class="champ-banner">🏆 CAMPEON!</div>';
    } else {
      // sigo en el cuadro?
      var alive = t.bracket[t.bracket.length - 1].indexOf(S.humanId) >= 0 && !t.done;
      if(alive){
        html += '<div class="next-match"><div>Seguis en el cuadro. Proxima ronda: <b>' +
          TC.roundLabel(t, t.currentRound) + '</b> (dia ' + TC.fmtDate(t.startDay + t.roundDays[Math.min(t.currentRound, t.roundDays.length-1)]) + ')</div></div>';
      }
    }

    html += renderDraw(t);
    return html;
  }

  function seedOf(t, id){
    if(!t.entrants || id == null) return 0;
    var numSeeds = Math.max(4, Math.floor((t.drawSize || 32) / 4));
    var idx = t.entrants.indexOf(id);
    return (idx >= 0 && idx < numSeeds) ? idx + 1 : 0;
  }

  function nameWithSeed(t, id, bold){
    var s = seedOf(t, id);
    return playerName(id, bold) + (s ? ' <span style="color:var(--warn);font-size:11px">[' + s + ']</span>' : '');
  }

  // ===== LLAVE VISUAL =====
  function shortName(id){
    if(id == null) return null;
    var n = S.players[id].name;
    var comma = n.indexOf(',');
    return comma > 0 ? n.slice(0, comma) : n;
  }

  function bracketRow(t, id, isWinner, sc, isTbd){
    if(isTbd) return '<div class="brow"><span class="bseed"></span><span class="bname tbd">Por definir</span></div>';
    if(id == null) return '<div class="brow"><span class="bseed"></span><span class="bname tbd">BYE</span></div>';
    var s = seedOf(t, id);
    return '<div class="brow' + (isWinner ? ' winner' : '') + '">' +
      '<span class="bseed">' + (s || '') + '</span>' +
      '<span class="bname plink' + (id === S.humanId ? ' meplink' : '') + '" data-player="' + id + '">' + esc(shortName(id)) + '</span>' +
      (isWinner && sc ? '<span class="bsc">' + sc + '</span>' : '') +
    '</div>';
  }

  function bracketMatchCard(t, r, i){
    var round = t.bracket ? t.bracket[r] : null;
    var a = round ? round[2 * i] : undefined;
    var b = round ? round[2 * i + 1] : undefined;
    var tbd = round == null;
    var rec = (t.results && t.results[r]) ? t.results[r][i] : null;
    var w = rec ? rec.w : null;
    var sc = rec && rec.sc ? rec.sc : (rec && rec.wo ? 'W.O.' : '');
    var mine = a === S.humanId || b === S.humanId;
    return '<div class="bmatch' + (mine ? ' mine' : '') + '">' +
      bracketRow(t, a, w != null && w === a, sc, tbd) +
      bracketRow(t, b, w != null && w === b, sc, tbd) +
    '</div>';
  }

  // Llave visual desde la ronda rStart hasta la final, con conectores
  function renderVisualBracket(t, rStart){
    var totalR = Math.round(Math.log(t.drawSize) / Math.log(2));
    var html = '<div class="bracket-wrap"><div class="bracket">';
    for(var r = rStart; r < totalR; r++){
      var matches = t.drawSize / Math.pow(2, r + 1);
      var hasNext = r < totalR - 1;
      html += '<div class="bcol' + (hasNext ? ' haslink' : '') + (r > rStart ? ' linked' : '') + '">' +
        '<div class="bcol-title">' + TC.roundLabel(t, r) + '</div><div class="bcol-body">';
      if(matches === 1){
        html += '<div class="bpair"><div class="bslot">' + bracketMatchCard(t, r, 0) + '</div></div>';
      } else {
        for(var p = 0; p < matches; p += 2){
          html += '<div class="bpair">' +
            '<div class="bslot">' + bracketMatchCard(t, r, p) + '</div>' +
            '<div class="bslot">' + bracketMatchCard(t, r, p + 1) + '</div>' +
          '</div>';
        }
      }
      html += '</div></div>';
    }
    // columna del campeon
    html += '<div class="bchamp">' +
      (t.done && t.championId != null
        ? '<div class="cup">🏆</div><div class="clbl">Campeon</div><div class="cname">' + playerName(t.championId, false, true) + '</div>'
        : '<div class="cup" style="opacity:.25">🏆</div><div class="clbl" style="opacity:.5">Campeon</div>') +
    '</div>';
    return html + '</div></div>';
  }

  // Cuadro completo: rondas previas como lista + fase final como llave visual
  function renderDraw(t){
    if(!t.bracket) return '<p style="color:var(--muted)">No hay datos del cuadro de este torneo.</p>';
    var totalR = Math.round(Math.log(t.drawSize) / Math.log(2));
    var rStart = t.drawSize > 32 ? totalR - 4 : 0; // cuadros grandes: llave visual desde octavos
    var html = '';
    if(rStart > 0){
      html += '<h3 class="section">Rondas previas</h3>' + renderRoundsRange(t, 0, rStart);
      html += '<h3 class="section">Fase final</h3>';
    }
    html += renderVisualBracket(t, rStart);
    return html;
  }

  // rondas como lista plegable (usado para las rondas tempranas de cuadros grandes)
  function renderRounds(t){
    return renderRoundsRange(t, 0, t.bracket ? t.bracket.length : 0);
  }
  function renderRoundsRange(t, from, to){
    var html = '';
    if(!t.bracket) return '<p style="color:var(--muted)">No hay datos del cuadro de este torneo.</p>';
    for(var r = from; r < Math.min(to, t.bracket.length); r++){
      var open = (r === t.bracket.length - 1 && !t.done) ? ' open' : '';
      html += '<details class="round"' + open + '><summary>' + TC.roundLabel(t, r) +
        (t.results[r] ? '' : ' (por jugar)') + '</summary>';
      if(t.results[r]){
        for(var i = 0; i < t.results[r].length; i++){
          var rec = t.results[r][i];
          if(rec.p[0] == null && rec.p[1] == null) continue;
          var mine = rec.p[0] === S.humanId || rec.p[1] === S.humanId;
          var line;
          if(rec.bye){ line = nameWithSeed(t, rec.w, true) + ' — bye'; }
          else if(rec.wo){ line = nameWithSeed(t, rec.w, true) + ' gana por W.O.'; }
          else if(rec.w == null){ line = nameWithSeed(t, rec.p[0]) + ' vs ' + nameWithSeed(t, rec.p[1]) + ' — por jugar'; }
          else {
            var lId = rec.p[0] === rec.w ? rec.p[1] : rec.p[0];
            line = nameWithSeed(t, rec.w, true) + ' d. ' + nameWithSeed(t, lId) + ' &nbsp;<span style="color:var(--muted)">' + rec.sc + '</span>';
          }
          html += '<div class="mline' + (mine ? ' mine' : '') + '">' + line + '</div>';
        }
      } else {
        var round = t.bracket[r];
        for(i = 0; i < round.length; i += 2){
          if(round[i] == null && round[i+1] == null) continue;
          var mine2 = round[i] === S.humanId || round[i+1] === S.humanId;
          html += '<div class="mline' + (mine2 ? ' mine' : '') + '">' + nameWithSeed(t, round[i]) + ' vs ' + nameWithSeed(t, round[i+1]) + '</div>';
        }
      }
      html += '</details>';
    }
    return html;
  }

  // ============ VISOR DE CUALQUIER TORNEO ============
  function findInstAnywhere(def){
    if(!def.instId) return null;
    var t = TC.findActive(S, def.instId);
    if(t) return t;
    for(var i = 0; i < S.finished.length; i++) if(S.finished[i].id === def.instId) return S.finished[i];
    return null;
  }

  function pointsTable(def){
    var cat = TC.CATS[def.cat];
    var html = '<h3 class="section">Reparto de puntos</h3>';
    if(def.cat === 'FINALS'){
      return html + '<div class="trow"><div class="tname">Victoria en round robin</div><div class="status">200 pts c/u</div></div>' +
        '<div class="trow"><div class="tname">Semifinal ganada</div><div class="status">+400 pts</div></div>' +
        '<div class="trow"><div class="tname">Final ganada</div><div class="status">+500 pts</div></div>';
    }
    var rounds = Math.round(Math.log(cat.draw) / Math.log(2));
    var rows = '';
    for(var w = rounds; w >= 0; w--){
      var remaining = Math.pow(2, rounds - w);
      var label = w === rounds ? 'Campeon' :
                  remaining === 2 ? 'Finalista' :
                  remaining === 4 ? 'Semifinalista' :
                  remaining === 8 ? 'Cuartos de final' :
                  remaining === 16 ? 'Octavos de final' : 'Ronda de ' + remaining;
      var pts = cat.pts[Math.min(w, cat.pts.length - 1)] || 0;
      rows += '<div class="trow" style="padding:4px 10px"><div class="tname" style="font-weight:400">' + label + '</div>' +
        '<div class="status"><b>' + pts + '</b> pts</div></div>';
    }
    return html + rows;
  }

  function entrantsTable(def, inst){
    var ids = inst && inst.entrants ? inst.entrants : TC.previewEntrants(S, def);
    var provisional = !(inst && inst.entrants);
    var cat = TC.CATS[def.cat];
    var numSeeds = Math.max(4, Math.floor(cat.draw / 4));
    var html = '<h3 class="section">Inscriptos (' + ids.length + '/' + cat.draw + ')' +
      (provisional ? ' — lista provisional segun ranking actual' : '') + '</h3>';
    if(!ids.length) return html + '<p style="color:var(--muted)">Nadie todavia.</p>';
    html += '<table class="rank"><tr><th>Seed</th><th>Jugador</th><th>Pais</th><th>Edad</th><th style="text-align:right">Rank</th></tr>';
    for(var i = 0; i < ids.length; i++){
      var p = S.players[ids[i]];
      html += '<tr' + (ids[i] === S.humanId ? ' class="me"' : '') + '>' +
        '<td class="num">' + (i < numSeeds ? (i + 1) : '—') + '</td>' +
        '<td>' + playerName(p.id, false, true) + '</td>' +
        '<td>' + p.country + '</td><td>' + p.age + '</td>' +
        '<td style="text-align:right">' + (p.rank === 9999 ? 'NR' : '#' + p.rank) + '</td></tr>';
    }
    return html + '</table>';
  }

  function renderTournamentDetail(defId){
    var def = TC.findDef(S, defId);
    if(!def) { detailId = null; return renderCalendar(); }
    var cat = TC.CATS[def.cat];
    var inst = findInstAnywhere(def);
    var html = '<button class="btn small ghost" id="btn-back-cal">← Volver al calendario</button>' +
      '<div class="tour-head" style="margin-top:10px"><h2>' + esc(def.name) + '</h2>' +
      '<span class="badge" style="background:' + cat.color + '">' + cat.label + '</span>' +
      '<span class="sdot ' + def.surf + '"></span> <span style="color:var(--muted)">' + SURF_LABEL[def.surf] +
      ' · ' + TC.fmtRange(def.startDay, def.startDay + def.dur - 1) +
      ' · Cuadro de ' + cat.draw + (def.cat === 'GS' ? ' · Mejor de 5' : '') + '</span></div>';

    // estado + inscripcion
    if(!def.started){
      var chk = TC.canRegister(S, def);
      var isReg = S.registrations.indexOf(def.id) >= 0;
      if(isReg) html += '<div class="next-match">Estas inscripto. <button class="btn small" data-unreg="' + def.id + '" style="margin-left:10px">Bajarse</button></div>';
      else if(chk.ok) html += '<div class="next-match">Inscripcion abierta. <button class="btn small primary" data-reg="' + def.id + '" style="margin-left:10px">Inscribirse</button></div>';
      else html += '<div class="next-match" style="color:var(--muted)">' + chk.reason + '</div>';
    } else if(inst && inst.done){
      html += '<div class="champ-banner">🏆 Campeon: ' + playerName(inst.championId, true) + '</div>';
    }

    if(inst && inst.isFinals){
      html += renderFinals(inst);
    } else if(inst){
      html += '<h3 class="section">Cuadro</h3>' + renderDraw(inst);
    }
    html += entrantsTable(def, inst);
    html += pointsTable(def);
    return html;
  }

  function finalsKnockoutCard(t, records, i){
    if(!records || !records[i]) {
      return '<div class="bmatch"><div class="brow"><span class="bname tbd">Por definir</span></div><div class="brow"><span class="bname tbd">Por definir</span></div></div>';
    }
    var rec = records[i];
    var mine = rec.p[0] === S.humanId || rec.p[1] === S.humanId;
    var sc = rec.sc || (rec.wo ? 'W.O.' : '');
    return '<div class="bmatch' + (mine ? ' mine' : '') + '">' +
      bracketRow(t, rec.p[0], rec.w === rec.p[0], sc, false) +
      bracketRow(t, rec.p[1], rec.w === rec.p[1], sc, false) +
    '</div>';
  }

  function renderFinals(t){
    var html = '<div class="groups">';
    for(var g = 0; g < 2; g++){
      html += '<div class="gtable"><b>Grupo ' + (g === 0 ? 'A' : 'B') + '</b><table class="rank">';
      var st = TC.finalsStandings(t, g);
      for(var i = 0; i < st.length; i++){
        html += '<tr><td>' + playerName(st[i]) + '</td><td style="text-align:right">' + (t.rrWins[st[i]] || 0) + 'V</td></tr>';
      }
      html += '</table></div>';
    }
    html += '</div>';

    // mini llave de semis y final
    var sfRecs = null, fRecs = null;
    for(var k = 0; k < (t.results || []).length; k++){
      if(t.results[k].day === 3) sfRecs = t.results[k].records;
      if(t.results[k].day === 4) fRecs = t.results[k].records;
    }
    if(sfRecs || fRecs || t.sf){
      html += '<h3 class="section">Fase final</h3>' +
        '<div class="bracket-wrap"><div class="bracket">' +
        '<div class="bcol haslink"><div class="bcol-title">Semifinales</div><div class="bcol-body"><div class="bpair">' +
          '<div class="bslot">' + finalsKnockoutCard(t, sfRecs, 0) + '</div>' +
          '<div class="bslot">' + finalsKnockoutCard(t, sfRecs, 1) + '</div>' +
        '</div></div></div>' +
        '<div class="bcol linked"><div class="bcol-title">Final</div><div class="bcol-body"><div class="bpair">' +
          '<div class="bslot">' + finalsKnockoutCard(t, fRecs, 0) + '</div>' +
        '</div></div></div>' +
        '<div class="bchamp">' +
          (t.champion != null
            ? '<div class="cup">🏆</div><div class="clbl">Maestro</div><div class="cname">' + playerName(t.champion, false, true) + '</div>'
            : '<div class="cup" style="opacity:.25">🏆</div>') +
        '</div>' +
      '</div></div>';
    }
    if(S.pendingMatch && S.pendingMatch.tid === t.id){
      var opp = S.players[S.pendingMatch.oppId];
      html += '<div class="next-match" style="margin-top:12px"><div class="vs">vs ' + playerName(opp.id) + '</div>' +
        '<div class="spacer"></div><button class="btn primary" id="btn-play2">Jugar ahora</button></div>';
    }
    return html;
  }

  // ================= JUGADOR =================
  function renderPlayer(){
    var h = human();
    var html = '<div class="pstats">' +
      stat(h.rank === 9999 ? 'NR' : '#' + h.rank, 'Ranking') +
      stat(S.career.bestRank === 9999 ? '—' : '#' + S.career.bestRank, 'Mejor ranking') +
      stat(h.pts, 'Puntos') +
      stat(h.wins + '-' + h.losses, 'Victorias') +
      stat(S.career.titles.length, 'Titulos') +
      stat(TC.overall(h).toFixed(2), 'Nivel general') +
      stat(SURF_LABEL[h.pref], 'Superficie') +
      '</div>';

    html += '<h3 class="section">Ranking ultimo anio</h3><canvas id="rankchart" width="900" height="140"></canvas>';

    html += '<h3 class="section">Atributos — hace click para elegir el foco de entrenamiento (variacion del ultimo mes)</h3><div class="attr-grid">';
    for(var i = 0; i < TC.ATTRS.length; i++){
      var a = TC.ATTRS[i];
      html += '<div class="attr-row' + (S.trainFocus === a ? ' focus' : '') + '" data-attr="' + a + '" style="cursor:pointer">' +
        '<div class="an">' + TC.ATTR_LABEL[a] + (S.trainFocus === a ? ' 🎯' : '') + '</div>' +
        '<div class="abar"><div style="width:' + (h[a] * 10) + '%"></div></div>' +
        attrDelta(h, a) +
        '<div class="av">' + h[a].toFixed(1) + '</div></div>';
    }
    html += '</div>';

    html += '<h3 class="section">Mejores resultados (52 semanas)</h3>';
    var best = h.results.filter(function(r){ return r.pts > 0 && r.day > S.day - 364; })
                        .sort(function(a,b){ return b.pts - a.pts; }).slice(0, 10);
    if(!best.length) html += '<p style="color:var(--muted)">Todavia nada. A ganar partidos.</p>';
    for(i = 0; i < best.length; i++){
      html += '<div class="trow"><div class="dates">' + TC.fmtDate(best[i].day) + '</div>' +
        '<div class="tname">' + esc(best[i].name) + (best[i].champ ? ' 🏆' : '') + '</div>' +
        resultChip(best[i]) +
        '<div class="status"><b>' + best[i].pts + '</b> pts</div></div>';
    }

    html += '<div style="margin-top:24px"><button class="btn ghost" id="btn-retire" style="color:var(--danger)">Retirarme del tenis (fin de carrera)</button></div>';
    return html;
  }

  function stat(v, l){ return '<div class="stat"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>'; }

  // Variacion del atributo vs el snapshot mensual (▲ verde / ▼ rojo).
  // Siempre ocupa el mismo ancho para que las barras queden alineadas.
  function attrDelta(p, a){
    var inner = '';
    if(p.prev && p.prev[a] != null){
      var d = Math.round((p[a] - p.prev[a]) * 100) / 100;
      if(d >= 0.01) inner = '<span class="adelta up">▲' + d.toFixed(2) + '</span>';
      else if(d <= -0.01) inner = '<span class="adelta dn">▼' + Math.abs(d).toFixed(2) + '</span>';
    }
    return '<span class="adelta-slot">' + inner + '</span>';
  }

  // Chip con la ronda alcanzada en un resultado {cat, rw, champ}
  function resultChip(res){
    var label, cls = '';
    if(res.cat === 'FINALS'){
      label = res.champ ? 'Maestro' : 'Finals';
      if(res.champ) cls = 'champ';
    } else {
      var cat = TC.CATS[res.cat];
      if(!cat) return '';
      if(res.champ){ label = 'Campeon'; cls = 'champ'; }
      else {
        var remaining = cat.draw / Math.pow(2, res.rw || 0);
        if(remaining <= 2){ label = 'Finalista'; cls = 'finalist'; }
        else if(remaining <= 4) label = 'Semifinal';
        else if(remaining <= 8) label = 'Cuartos';
        else if(remaining <= 16) label = 'Octavos';
        else label = 'Ronda de ' + Math.round(remaining);
      }
    }
    return '<span class="rchip ' + cls + '">' + label + '</span>';
  }

  function drawRankChart(){
    var cv = $('rankchart');
    if(!cv) return;
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    var data = S.rankHistory.filter(function(d){ return d[1] != null && d[0] > S.day - 364; });
    if(data.length < 2){
      ctx.fillStyle = '#8494ab'; ctx.font = '13px sans-serif';
      ctx.fillText('Aun no hay historial de ranking', 20, H / 2);
      return;
    }
    var minR = Infinity, maxR = 0;
    data.forEach(function(d){ minR = Math.min(minR, d[1]); maxR = Math.max(maxR, d[1]); });
    minR = Math.max(1, minR - 5); maxR = maxR + 10;
    var x0 = data[0][0], x1 = data[data.length - 1][0];
    ctx.strokeStyle = '#c3f53c'; ctx.lineWidth = 2; ctx.beginPath();
    data.forEach(function(d, i){
      var x = 10 + (W - 20) * (d[0] - x0) / Math.max(1, x1 - x0);
      var y = 10 + (H - 30) * (d[1] - minR) / Math.max(1, maxR - minR);
      if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = '#8494ab'; ctx.font = '11px sans-serif';
    ctx.fillText('#' + minR, 12, 12);
    ctx.fillText('#' + maxR, 12, H - 8);
  }

  // ================= RANKING =================
  function renderRanking(){
    var h = human();
    var ranked = S.players.filter(function(p){ return p.rank !== 9999; })
                          .sort(function(a,b){ return a.rank - b.rank; });
    var html = '<table class="rank"><tr><th>#</th><th>Jugador</th><th>Pais</th><th>Edad</th><th style="text-align:right">Puntos</th></tr>';
    var shown = {};
    function row(p){
      if(shown[p.id]) return '';
      shown[p.id] = 1;
      var mv = '';
      if(p.prevRank !== 9999 && p.prevRank && p.prevRank !== p.rank){
        var d = p.prevRank - p.rank;
        mv = d > 0 ? '<span class="mv up">▲' + d + '</span>' : '<span class="mv dn">▼' + (-d) + '</span>';
      }
      return '<tr' + (p.id === S.humanId ? ' class="me"' : '') + '><td class="num">' + p.rank + '</td>' +
        '<td>' + playerName(p.id, false, true) + mv + '</td><td>' + p.country + '</td><td>' + p.age + '</td>' +
        '<td style="text-align:right">' + p.pts + '</td></tr>';
    }
    for(var i = 0; i < Math.min(100, ranked.length); i++) html += row(ranked[i]);
    if(h.rank !== 9999 && h.rank > 104){
      html += '<tr class="sep-row"><td colspan="5">···</td></tr>';
      for(i = Math.max(0, h.rank - 6); i < Math.min(ranked.length, h.rank + 5); i++) html += row(ranked[i]);
    } else if(h.rank === 9999){
      html += '<tr class="sep-row"><td colspan="5">Todavia no tenes ranking — suma puntos en torneos ITF</td></tr>';
    }
    html += '</table>';
    return html;
  }

  // ================= HISTORIAL / NOTICIAS =================
  function renderHistory(){
    var html = '<h3 class="section">Titulos (' + S.career.titles.length + ')</h3>';
    if(!S.career.titles.length) html += '<p style="color:var(--muted)">Vitrina vacia por ahora.</p>';
    for(var i = S.career.titles.length - 1; i >= 0; i--){
      var t = S.career.titles[i];
      var cat = TC.CATS[t.cat];
      html += '<div class="title-item">🏆 <span class="badge" style="background:' + cat.color + '">' + cat.label + '</span>' +
        '<b>' + esc(t.name) + '</b><span style="color:var(--muted)">' + t.year + '</span></div>';
    }
    html += '<h3 class="section">Carrera</h3><div class="pstats">' +
      stat(S.career.bestRank === 9999 ? '—' : '#' + S.career.bestRank, 'Mejor ranking') +
      stat(human().wins + '-' + human().losses, 'Record') +
      stat(TC.dateOf(S.day).getUTCFullYear() - S.career.startYear + 1, 'Temporada') +
      '</div>';
    return html;
  }

  function renderNews(){
    if(!S.news.length) return '<p style="color:var(--muted)">Sin novedades.</p>';
    return S.news.map(function(n){
      return '<div class="news-item' + (n.human ? ' mine' : '') + '"><span class="nd">' + TC.fmtDate(n.day) + '</span>' + esc(n.txt) + '</div>';
    }).join('');
  }

  // ================= ACTION BAR =================
  function pendingRoundLabel(){
    var pm = S.pendingMatch;
    if(!pm) return 'partido';
    var t = TC.findActive(S, pm.tid);
    if(!t) return 'partido';
    if(t.isFinals) return pm.round <= 2 ? 'Round Robin' : (pm.round === 3 ? 'Semifinal' : 'la FINAL');
    var lbl = TC.roundLabel(t, pm.round);
    return lbl === 'Final' ? 'la FINAL' : lbl;
  }

  function renderActionBar(){
    var h = human();
    var pending = !!S.pendingMatch;
    var focusOpts = TC.ATTRS.map(function(a){
      return '<option value="' + a + '"' + (S.trainFocus === a ? ' selected' : '') + '>' + TC.ATTR_LABEL[a] + '</option>';
    }).join('');
    var inTournament = h.curT != null;

    return '<div class="actionbar">' +
      (inTournament || pending ?
        '<span style="color:var(--muted)">En torneo — sin entrenamientos</span>'
        :
        '<div class="seg" id="mode-seg">' +
          '<button data-mode="train" class="' + (S.action === 'train' ? 'on' : '') + '">Entrenar</button>' +
          '<button data-mode="rest" class="' + (S.action === 'rest' ? 'on' : '') + '">Descansar</button>' +
        '</div>' +
        (S.action === 'train' ? '<select id="focus-sel">' + focusOpts + '</select>' : '')
      ) +
      (pending
        ? '<button class="advance-btn match" id="btn-advance">JUGAR ' + esc(pendingRoundLabel().toUpperCase()) + '</button>'
        : (inTournament
          ? '<button class="advance-btn" id="btn-advance">SIGUIENTE PARTIDO ▶</button>'
          : '<button class="advance-btn" id="btn-advance">AVANZAR SEMANA ▶</button>' +
            '<button class="btn" id="btn-next-t" title="Avanza hasta tu proximo torneo o partido">⏩ Proximo torneo</button>')
      ) +
    '</div>';
  }

  // ================= EVENTOS =================
  function bindMain(){
    document.querySelectorAll('.tab').forEach(function(b){
      b.onclick = function(){ tab = b.dataset.tab; detailId = null; archInstId = null; render(); };
    });
    var mb = $('btn-menu');
    if(mb) mb.onclick = function(){ TC.save(S); showMenu(); };

    var panel = $('panel');
    panel.onclick = function(e){
      var t = e.target;
      if(t.dataset.filter){ calFilter = t.dataset.filter; render(); return; }
      if(t.dataset.ayear){ archiveYear = parseInt(t.dataset.ayear, 10); render(); return; }
      if(t.id === 'btn-back-cal'){ detailId = null; render(); return; }
      if(t.id === 'btn-back-arch'){ archInstId = null; render(); return; }
      var al = t.closest('[data-adetail]');
      if(al){ archInstId = al.dataset.adetail; render(); return; }
      var dl = t.closest('[data-detail]');
      if(dl){ detailId = dl.dataset.detail; render(); return; }
      if(t.dataset.reg){
        var r = TC.register(S, t.dataset.reg);
        if(!r.ok) alert(r.reason);
        TC.save(S); render(); return;
      }
      if(t.dataset.unreg){ TC.unregister(S, t.dataset.unreg); TC.save(S); render(); return; }
      var ar = t.closest('.attr-row');
      if(ar && ar.dataset.attr){ S.trainFocus = ar.dataset.attr; S.action = 'train'; render(); return; }
      if(t.id === 'btn-play2'){ openMatchModal(); return; }
      if(t.id === 'btn-retire'){
        if(confirm('Seguro que queres retirarte? Fin de la carrera.')) retire();
        return;
      }
    };

    var seg = $('mode-seg');
    if(seg) seg.onclick = function(e){
      var b = e.target.closest('button');
      if(b){ S.action = b.dataset.mode; render(); }
    };
    var fs = $('focus-sel');
    if(fs) fs.onchange = function(){ S.trainFocus = fs.value; };

    $('btn-advance').onclick = function(){
      if(S.pendingMatch){ openMatchModal(); return; }
      doAdvance('week');
    };
    var nt = $('btn-next-t');
    if(nt) nt.onclick = function(){ doAdvance('nextTournament'); };
  }

  function doAdvance(mode){
    var ev = TC.advance(S, mode);
    TC.save(S);
    render();
    if(ev.type === 'match') openMatchModal();
  }

  // ================= MODAL DE PARTIDO =================
  function openModal(html){
    $('modal').innerHTML = html;
    $('modal-overlay').classList.remove('hidden');
  }
  function closeModal(){ $('modal-overlay').classList.add('hidden'); }

  // ================= FICHA DE JUGADOR =================
  function openPlayerModal(id){
    var p = S.players[id];
    if(!p) return;
    var mv = '';
    if(p.prevRank !== 9999 && p.prevRank && p.rank !== 9999 && p.prevRank !== p.rank){
      var d = p.prevRank - p.rank;
      mv = d > 0 ? ' <span class="mv up">▲' + d + '</span>' : ' <span class="mv dn">▼' + (-d) + '</span>';
    }
    var attrs = '';
    for(var i = 0; i < TC.ATTRS.length; i++){
      var a = TC.ATTRS[i];
      attrs += '<div class="attr-row"><div class="an">' + TC.ATTR_LABEL[a] + '</div>' +
        '<div class="abar"><div style="width:' + (p[a] * 10) + '%"></div></div>' +
        attrDelta(p, a) +
        '<div class="av">' + p[a].toFixed(1) + '</div></div>';
    }
    var recent = (p.results || []).slice(-6).reverse();
    var resHtml = '';
    for(i = 0; i < recent.length; i++){
      resHtml += '<div class="trow" style="padding:4px 10px"><div class="dates">' + TC.fmtDate(recent[i].day) + '</div>' +
        '<div class="tname" style="font-weight:400">' + esc(recent[i].name) + (recent[i].champ ? ' 🏆' : '') + '</div>' +
        resultChip(recent[i]) +
        '<div class="status"><b>' + recent[i].pts + '</b> pts</div></div>';
    }
    openModal(
      '<div>' +
        '<h2>' + esc(p.name) + (id === S.humanId ? ' <span style="color:var(--accent);font-size:13px">(vos)</span>' : '') + '</h2>' +
        '<div class="modal-note" style="margin-top:2px">' + p.country + ' · ' + p.age + ' anios · Prefiere ' + SURF_LABEL[p.pref] +
          ' · Nivel <span class="stars">' + starsOf(p) + '</span>' +
          (!p.isHuman && p.pot != null && p.age <= 23 ? ' · Potencial <span class="stars">' + starsVal(p.pot) + '</span>' : '') +
          (p.injury ? ' · <span style="color:var(--danger)">Lesionado: ' + esc(p.injury.name) + ' (' + p.injury.days + 'd)</span>' : '') + '</div>' +
        '<div class="pstats" style="margin:12px 0">' +
          stat((p.rank === 9999 ? 'NR' : '#' + p.rank) + mv, 'Ranking') +
          stat(p.pts, 'Puntos') +
          stat(p.wins + '-' + p.losses, 'Record') +
          stat(p.titles || 0, 'Titulos') +
          stat(fmtForm(p.form), 'Forma') +
          stat(Math.round(p.energy) + '%', 'Energia') +
        '</div>' +
        '<div class="attr-grid" style="grid-template-columns:1fr 1fr">' + attrs + '</div>' +
        (resHtml ? '<h3 class="section">Ultimos resultados</h3>' + resHtml : '') +
        '<div class="modal-actions"><button class="btn primary" id="pm-close">' +
          (S.pendingMatch ? 'Volver al partido' : 'Cerrar') + '</button></div>' +
      '</div>'
    );
    $('pm-close').onclick = function(){
      if(S.pendingMatch) openMatchModal();
      else { closeModal(); }
    };
  }

  function starsVal(v){
    var n = Math.max(1, Math.min(5, Math.round((v - 3.5) / 1.1)));
    var s = '';
    for(var i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    return s;
  }
  function starsOf(p){ return starsVal(TC.overall(p)); }

  function openMatchModal(){
    var pm = S.pendingMatch;
    if(!pm) return;
    var t = TC.findActive(S, pm.tid);
    var opp = S.players[pm.oppId];
    var h = human();
    var cat = TC.CATS[t.cat];
    openModal(
      '<div class="match-card">' +
        '<h2>' + esc(t.name) + '</h2>' +
        '<div class="tourinfo"><span class="badge" style="background:' + cat.color + '">' + cat.label + '</span> ' +
          (t.isFinals ? (pm.round <= 2 ? 'Round Robin' : pm.round === 3 ? 'Semifinal' : 'FINAL') : TC.roundLabel(t, pm.round)) +
          ' · ' + SURF_LABEL[t.surf] + (t.bestOf === 5 ? ' · Mejor de 5' : '') + '</div>' +
        '<div class="face2face">' +
          '<div class="f2f-p"><div class="nm" style="color:var(--accent)">' + esc(h.name) + '</div>' +
            '<div class="meta">' + (h.rank === 9999 ? 'NR' : '#' + h.rank) + ' · Energia ' + Math.round(h.energy) + '% · ' + fmtForm(h.form) + '</div></div>' +
          '<div class="f2f-vs">VS</div>' +
          '<div class="f2f-p"><div class="nm plink" data-player="' + opp.id + '" title="Ver ficha">' + esc(opp.name) + '</div>' +
            '<div class="meta">' + (opp.rank === 9999 ? 'NR' : '#' + opp.rank) + ' · ' + opp.country + ' · ' + opp.age + ' anios</div>' +
            '<div class="meta">Nivel <span class="stars">' + starsOf(opp) + '</span> · Prefiere ' + SURF_LABEL[opp.pref] + '</div></div>' +
        '</div>' +
        '<div class="modal-actions">' +
          '<button class="btn primary" id="m-play">Jugar el partido</button>' +
        '</div>' +
      '</div>'
    );
    $('m-play').onclick = playMatch;
  }

  function playMatch(){
    var pm = S.pendingMatch;
    var t = TC.findActive(S, pm.tid);
    var opp = S.players[pm.oppId];
    var res = TC.playPendingMatch(S);
    TC.save(S);

    var h = human();
    var setsArr = res.score.split(' ');
    openModal(
      '<div class="match-card">' +
        '<h2>' + esc(t.name) + '</h2>' +
        '<div class="tourinfo">' + esc(h.name) + ' vs ' + esc(opp.name) + '</div>' +
        '<div class="score-line" id="score-line"></div>' +
        '<div id="verdict-zone"></div>' +
        '<div class="modal-actions"><button class="btn" id="m-skip">Resultado ya</button></div>' +
      '</div>'
    );

    var i = 0;
    var revealed = false;
    var timer = setInterval(function(){
      if(i < setsArr.length){
        $('score-line').textContent = setsArr.slice(0, ++i).join('  ');
      } else {
        clearInterval(timer);
        showVerdict();
      }
    }, 850);

    function showVerdict(){
      if(revealed) return;
      revealed = true;
      clearInterval(timer);
      $('score-line').textContent = setsArr.join('  ');
      var vz = $('verdict-zone');
      var html = '<div class="verdict ' + (res.won ? 'win' : 'lose') + '">' +
        (res.won ? 'VICTORIA' : 'DERROTA') + '</div>' +
        '<div class="modal-note">Duracion: ' + Math.floor(res.duration / 60) + 'h ' + (res.duration % 60) + 'm · Energia restante: ' + Math.round(res.energyAfter) + '%</div>';
      if(res.xp && res.xp.length){
        html += '<div class="modal-note" style="color:var(--accent2)">Experiencia: ' +
          res.xp.map(function(g){ return TC.ATTR_LABEL[g.attr] + ' +' + g.amt.toFixed(3).replace(/0+$/, '').replace(/\.$/, ''); }).join(' · ') + '</div>';
      }
      if(res.isChampion) html += '<div class="champ-banner">🏆 CAMPEON DEL TORNEO!</div>';
      if(res.injury) html += '<div class="injury-note">Te lesionaste: ' + esc(res.injury.name) + ' — ' + res.injury.days + ' dias de baja</div>';
      vz.innerHTML = html;
      document.querySelector('.modal-actions').innerHTML = '<button class="btn primary" id="m-close">Continuar</button>';
      $('m-close').onclick = function(){ closeModal(); render(); };
    }
    $('m-skip').onclick = showVerdict;
  }

  // ================= RETIRO =================
  function retire(){
    var h = human();
    S.career.retired = true;
    TC.deleteSave();
    openModal(
      '<div class="match-card">' +
        '<h2>Fin de carrera</h2>' +
        '<div class="modal-note">' + esc(h.name) + ' se retira a los ' + h.age + ' anios.</div>' +
        '<div class="pstats" style="justify-content:center;margin:16px 0">' +
          stat(S.career.bestRank === 9999 ? '—' : '#' + S.career.bestRank, 'Mejor ranking') +
          stat(S.career.titles.length, 'Titulos') +
          stat(h.wins + '-' + h.losses, 'Record') +
        '</div>' +
        '<div class="modal-actions"><button class="btn primary" id="m-bye">Volver al menu</button></div>' +
      '</div>'
    );
    $('m-bye').onclick = function(){ closeModal(); showMenu(); };
  }
})();
