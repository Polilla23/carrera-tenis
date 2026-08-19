// UI de la carrera: menu, creacion, pantalla principal con tabs, modal de partidos
var UI = {};
(function(){
  var S = null;              // estado del juego
  var tab = 'calendar';
  var calFilter = 'auto';
  var calSub = 'all';        // sub-filtro de categoria (250/500/M1000/GS o CH50..CH175 o ITF15/25)
  var calMonth = 'all';      // filtro de mes del calendario
  var calSurf = 'all';       // filtro de superficie del calendario
  var calRegion = 'all';     // filtro de region del calendario
  var archiveRegion = 'all'; // filtro de region del archivo
  var archivePlayed = 'all'; // 'all' | 'mine' (solo torneos que jugue)
  var detailId = null;       // torneo abierto en el visor de detalle (def del calendario)
  var archInstId = null;     // torneo abierto desde el archivo (instancia)
  var archiveYear = null;    // anio seleccionado en el archivo
  var archiveMonth = 'all';  // mes (0-11) o 'all'
  var archiveSurf = 'all';   // superficie o 'all'
  var archiveCat = 'all';    // grupo: 'all' | 'atp' | 'ch' | 'itf'
  var archiveSub = 'all';    // sub-categoria dentro del grupo
  var chartRange = '1y';     // rango del grafico de ranking: 3m | 1y | all
  var weekReport = null;     // cambios de atributos desde el ultimo avance
  var app;

  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  var SURF_LABEL = {clay:'Polvo', hard:'Dura', grass:'Hierba', indoor:'Indoor', all:'Neutral'};
  var SURF_COLOR = {clay:'var(--clay)', hard:'var(--hard)', grass:'var(--grass)', indoor:'var(--indoor)', all:'var(--muted)'};

  // punto de superficie con tooltip CSS (los title nativos se esconden al hacer click)
  function sdotHtml(s){
    return '<span class="sdot ' + s + '" data-tip="Superficie: ' + SURF_LABEL[s] + '"></span>';
  }
  // nombre de superficie con su color y puntito
  function surfHtml(s){
    var dot = s === 'all' ? '' : '<span class="sdot ' + s + '" style="display:inline-block;vertical-align:-1px;margin-right:5px"></span>';
    return dot + '<span style="color:' + SURF_COLOR[s] + ';font-weight:700">' + SURF_LABEL[s] + '</span>';
  }

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
  var createCfg = {archetype:'completo', pref:'hard', name:'', country:'ARG', attrs:null, hand:'D', ht:183};
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
        '<div class="form-row"><label>Mano habil</label><div class="surf-row" id="hand-row">' +
          '<button class="surf-btn' + (createCfg.hand === 'D' ? ' sel' : '') + '" data-hand="D">Diestro</button>' +
          '<button class="surf-btn' + (createCfg.hand === 'Z' ? ' sel' : '') + '" data-hand="Z">Zurdo</button>' +
        '</div></div>' +
        '<div class="form-row"><label>Altura — mas alto: mejor saque, algo menos de resto y movilidad</label>' +
          '<div class="slider-row"><div class="an">Altura</div>' +
          '<input type="range" min="165" max="211" step="1" value="' + createCfg.ht + '" id="c-ht">' +
          '<div class="av" style="width:52px" id="c-ht-v">' + (createCfg.ht / 100).toFixed(2) + 'm</div></div>' +
        '</div>' +
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
    $('hand-row').onclick = function(e){
      var b = e.target.closest('.surf-btn');
      if(!b) return;
      keepCreateInputs();
      createCfg.hand = b.dataset.hand;
      showCreate();
    };
    $('c-ht').oninput = function(){
      createCfg.ht = parseInt(this.value, 10);
      $('c-ht-v').textContent = (createCfg.ht / 100).toFixed(2) + 'm';
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
        S = TC.newCareer({name:name, country:country, archetype:createCfg.archetype, pref:createCfg.pref, attrs:attrsCopy, hand:createCfg.hand, ht:createCfg.ht});
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
      '<div class="who"><div class="nm">' + esc(h.name) + '</div><div class="cc">' + h.country + ' · ' + h.age + ' anios · <span class="stars">' + starsOf(h) + '</span></div></div>' +
      '<div class="hero-rank"><div class="v">' + (h.rank === 9999 ? 'NR' : '#' + h.rank) + '</div><div class="l">Ranking</div></div>' +
      '<div class="stat"><div class="v">' + h.pts + '</div><div class="l">Puntos</div></div>' +
      '<div class="stat"><div class="v">' + fmtForm(h.form) + '</div><div class="l">Forma</div></div>' +
      '<div class="stat"><div class="ebar"><div style="width:' + Math.round(h.energy) + '%;background:' + ecolor + ';color:' + ecolor + '"></div></div>' +
        '<div class="l">Energia ' + Math.round(h.energy) + '%</div></div>' +
      (weekReport && weekReport.length ?
        '<div class="stat"><div class="v" style="font-size:12px;font-weight:700">' +
          weekReport.map(function(g){
            return '<span style="color:' + (g.d > 0 ? 'var(--accent2)' : 'var(--danger)') + '">' +
              (g.d > 0 ? '▲' : '▼') + Math.abs(g.d).toFixed(2) + ' ' + TC.ATTR_LABEL[g.a] + '</span>';
          }).join(' · ') +
        '</div><div class="l">Esta semana</div></div>' : '') +
      (h.injury ? '<div class="injury-chip">LESION: ' + esc(h.injury.name) + ' (' + h.injury.days + 'd)</div>' : '') +
      '<div class="spacer"></div>' +
      '<div class="datechip">📅 ' + TC.fmtDate(S.day) + '</div>' +
      '<button class="btn small ghost" id="btn-menu">Menu</button>' +
    '</div>';
  }

  function renderTabs(){
    var tabs = [
      ['calendar','Calendario'], ['agenda','Agenda'], ['tournament','Torneo'], ['player','Jugador'],
      ['ranking','Ranking'], ['h2h','H2H'], ['archive','Archivo'], ['history','Historial'], ['news','Noticias']
    ];
    var inT = playerTournament();
    return '<div class="tabs">' + tabs.map(function(t){
      var dot = (t[0]==='tournament' && inT) ? '<span class="dot"></span>' : '';
      return '<button class="tab' + (tab===t[0]?' on':'') + '" data-tab="' + t[0] + '">' + t[1] + dot + '</button>';
    }).join('') + '</div>';
  }

  // Ubicacion legible de un torneo: pais y/o continente
  function geoOf(d){
    var c = d.country || TC.EVENT_COUNTRY[d.baseId];
    var r = d.region ? TC.REGION_LABEL[d.region] : null;
    if(c && r) return c + ' · ' + r;
    return c || r || '';
  }

  // ================= AGENDA =================
  function renderAgenda(){
    var h = human();
    var home = TC.REGION_LABEL[TC.playerRegion(h)] || '?';
    var loc = TC.REGION_LABEL[h.loc || TC.playerRegion(h)] || home;
    var html = '<div class="pstats">' +
      stat('📍 ' + loc, 'Estas en') +
      stat('🏠 ' + home + ' (' + h.country + ')', 'Casa') +
      stat(Math.round(h.energy) + '%', 'Energia') +
      '</div>';

    // linea de tiempo: torneo actual + inscripciones futuras
    var items = [];
    var cur = playerTournament();
    if(cur) items.push({def: {name: cur.name, cat: cur.cat, surf: cur.surf, startDay: cur.startDay, dur: cur.dur, region: cur.region, baseId: (cur.id || '').replace(/_\d+$/, ''), id: cur.id}, active: true});
    for(var i = 0; i < S.registrations.length; i++){
      var d = TC.findDef(S, S.registrations[i]);
      if(d) items.push({def: d, active: false});
    }
    items.sort(function(a, b){ return a.def.startDay - b.def.startDay; });

    if(!items.length){
      return html + '<h3 class="section">Proximos viajes</h3>' +
        '<p style="color:var(--muted)">No tenes torneos por delante. Inscribite desde el calendario y aca vas a ver el plan de viajes, el jet lag y los dias de descanso entre torneo y torneo.</p>';
    }

    html += '<h3 class="section">Tu gira</h3>';
    var prevLoc = h.loc || TC.playerRegion(h);
    var prevEnd = S.day;
    for(i = 0; i < items.length; i++){
      var def = items[i].def;
      // dias libres antes
      var gap = def.startDay - prevEnd;
      if(gap > 0 && !items[i].active){
        html += '<div class="agenda-leg">💤 ' + gap + ' dia' + (gap === 1 ? '' : 's') + ' libre' + (gap === 1 ? '' : 's') +
          ' <span style="color:var(--muted)">(descansando recuperas hasta +' + Math.min(100, Math.round(gap * 8)) + ' de energia)</span></div>';
      }
      // viaje
      if(!items[i].active){
        var cost = TC.travelCost(prevLoc, def.region);
        var far = cost > 5;
        html += '<div class="agenda-leg' + (far ? ' far' : '') + '">' +
          (far ? '✈️ Vuelo largo: ' : '🚗 Viaje corto: ') +
          (TC.REGION_LABEL[prevLoc] || '?') + ' → ' + (TC.REGION_LABEL[def.region] || '?') +
          ' <b style="color:' + (far ? 'var(--danger)' : 'var(--muted)') + '">−' + cost + ' energia</b></div>';
      }
      // torneo
      html += renderTournamentRow(def);
      prevLoc = def.region || prevLoc;
      prevEnd = def.startDay + def.dur;
    }

    // consejo si hay saltos de continente seguidos
    var jumps = 0;
    var pl = h.loc || TC.playerRegion(h);
    for(i = 0; i < items.length; i++){
      if(items[i].def.region && items[i].def.region !== pl) jumps++;
      pl = items[i].def.region || pl;
    }
    if(jumps >= 2){
      html += '<div class="agenda-leg far" style="margin-top:10px">⚠️ Tu gira cruza continentes ' + jumps + ' veces. Cada vuelo largo cuesta 9 de energia: pensa el orden de tus torneos.</div>';
    }
    return html;
  }

  function renderTab(){
    if(tab === 'calendar') return detailId ? renderTournamentDetail(detailId) : renderCalendar();
    if(tab === 'agenda') return renderAgenda();
    if(tab === 'tournament') return renderTournament();
    if(tab === 'player') return renderPlayer();
    if(tab === 'ranking') return renderRanking();
    if(tab === 'archive') return archInstId ? renderArchiveDetail(archInstId) : renderArchive();
    if(tab === 'h2h') return renderH2H();
    if(tab === 'history') return renderHistory();
    if(tab === 'news') return renderNews();
    return '';
  }

  // ================= HEAD TO HEAD =================
  function h2hLabel(rec){
    if(rec.w > rec.l) return '<span style="color:var(--accent2);font-weight:800">' + rec.w + '-' + rec.l + ' a favor</span>';
    if(rec.l > rec.w) return '<span style="color:var(--danger);font-weight:800">' + rec.w + '-' + rec.l + ' en contra</span>';
    return '<span style="color:var(--muted);font-weight:800">' + rec.w + '-' + rec.l + '</span>';
  }

  function renderH2H(){
    var hh = S.h2h || {};
    var ids = Object.keys(hh);
    if(!ids.length) return '<p style="color:var(--muted)">Todavia no jugaste contra nadie (desde que existe el historial). Cada partido va sumando tu head-to-head contra ese rival.</p>';
    ids.sort(function(a, b){ return (hh[b].w + hh[b].l) - (hh[a].w + hh[a].l); });
    var html = '<h3 class="section">Tus rivalidades (' + ids.length + ' rivales)</h3>' +
      '<table class="rank"><tr><th>Rival</th><th>H2H</th><th>Ultimo partido</th></tr>';
    for(var i = 0; i < ids.length; i++){
      var id = parseInt(ids[i], 10);
      var rec = hh[ids[i]];
      var p = S.players[id];
      var nm = (p && p.name === rec.name) ? playerName(id, false, false) : esc(rec.name);
      var last = rec.last ? (rec.last.won ? 'G' : 'P') + ' ' + esc(rec.last.sc) + ' <span style="color:var(--muted)">· ' + esc(rec.last.tname) + ' · ' + TC.fmtDate(rec.last.day) + '</span>' : '—';
      html += '<tr><td>' + nm + '</td><td>' + h2hLabel(rec) + '</td><td style="font-size:12px">' + last + '</td></tr>';
    }
    return html + '</table>';
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

    var html = '<div class="cal-filters">' +
      '<button class="chip' + (archivePlayed === 'all' ? ' on' : '') + '" data-aplayed="all">Todos los torneos</button>' +
      '<button class="chip' + (archivePlayed === 'mine' ? ' on' : '') + '" data-aplayed="mine">🎾 Jugados por mi</button>' +
    '</div>';
    html += '<div class="cal-filters">' + years.map(function(y){
      return '<button class="chip' + (y === archiveYear ? ' on' : '') + '" data-ayear="' + y + '">' + y + '</button>';
    }).join('') + '</div>';

    // filtros: mes, superficie, categoria
    html += '<div class="cal-filters">' +
      '<button class="chip' + (archiveMonth === 'all' ? ' on' : '') + '" data-amonth="all">Todo el anio</button>' +
      TC.MESES.map(function(m, i){
        return '<button class="chip' + (archiveMonth === i ? ' on' : '') + '" data-amonth="' + i + '">' + m.slice(0, 3) + '</button>';
      }).join('') + '</div>';
    html += '<div class="cal-filters">' +
      '<button class="chip' + (archiveSurf === 'all' ? ' on' : '') + '" data-asurf="all">Todas</button>' +
      ['clay','hard','grass','indoor'].map(function(s){
        return '<button class="chip' + (archiveSurf === s ? ' on' : '') + '" data-asurf="' + s + '">' + SURF_LABEL[s] + '</button>';
      }).join('') +
      '<span style="width:14px"></span>' +
      [['all','Toda categoria'],['atp','ATP'],['ch','Challenger'],['itf','ITF']].map(function(c){
        return '<button class="chip' + (archiveCat === c[0] ? ' on' : '') + '" data-acat="' + c[0] + '">' + c[1] + '</button>';
      }).join('') +
      (SUBCATS[archiveCat] ?
        '<span style="width:10px"></span>' +
        '<button class="chip' + (archiveSub === 'all' ? ' on' : '') + '" data-asub="all">Todos</button>' +
        SUBCATS[archiveCat].map(function(sc){
          return '<button class="chip' + (archiveSub === sc[0] ? ' on' : '') + '" data-asub="' + sc[0] + '">' + sc[1] + '</button>';
        }).join('') : '') +
      '</div>';
    html += '<div class="cal-filters">' +
      '<button class="chip' + (archiveRegion === 'all' ? ' on' : '') + '" data-aregion="all">Todas las regiones</button>' +
      Object.keys(TC.REGION_LABEL).map(function(r){
        return '<button class="chip' + (archiveRegion === r ? ' on' : '') + '" data-aregion="' + r + '">' + TC.REGION_LABEL[r] + '</button>';
      }).join('') + '</div>';

    function catMatches(cat){
      if(archiveCat === 'all') return true;
      if(archiveCat === 'atp') return ['GS','M1000','500','250','FINALS'].indexOf(cat) >= 0 && subMatches(cat, archiveSub);
      if(archiveCat === 'ch') return cat.indexOf('CH') === 0 && subMatches(cat, archiveSub);
      if(archiveCat === 'itf') return cat.indexOf('ITF') === 0 && subMatches(cat, archiveSub);
      return true;
    }

    var entries = arc.filter(function(e){
      if(e.y !== archiveYear) return false;
      if(archivePlayed === 'mine' && !e.my) return false;
      if(archiveMonth !== 'all' && TC.dateOf(e.startDay).getUTCMonth() !== archiveMonth) return false;
      if(archiveSurf !== 'all' && e.surf !== archiveSurf) return false;
      if(archiveRegion !== 'all' && e.region !== archiveRegion) return false;
      if(!catMatches(e.cat)) return false;
      return true;
    }).sort(function(a, b){ return a.startDay - b.startDay; });
    if(!entries.length) html += '<p style="color:var(--muted);margin-top:10px">Ningun torneo coincide con estos filtros.</p>';
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
      var mine = e.champId === S.humanId ? ' reg' : (e.my ? ' played' : '');
      var myChip = '';
      if(e.my){
        if(e.my.champ) myChip = '<span class="rchip champ">Campeon</span>';
        else if(e.my.rw == null) myChip = '<span class="rchip">Jugado</span>';
        else if(e.my.q) myChip = '<span class="rchip">Qualy</span>';
        else myChip = resultChip({cat: e.cat, rw: e.my.rw, champ: false});
      }
      html += '<div class="trow s-' + e.surf + mine + '">' +
        '<div class="dates">' + TC.fmtRange(e.startDay, e.startDay + e.dur - 1) + '</div>' +
        '<span class="badge" style="background:' + cat.color + '">' + esc(cat.label) + '</span>' +
        sdotHtml(e.surf) +
        '<div class="tname' + (hasData ? ' tlink" data-adetail="' + e.instId + '" title="Ver cuadro"' : '"') + '>' + esc(e.name) + '</div>' +
        myChip +
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
  // sub-categorias de cada grupo de filtro
  var SUBCATS = {
    atp: [['250','250'],['500','500'],['M1000','Masters 1000'],['GS','Grand Slam']],
    ch:  [['CH50','50'],['CH75','75'],['CH100','100'],['CH125','125'],['CH175','175']],
    itf: [['ITF15','M15'],['ITF25','M25']]
  };
  function subMatches(cat, sub){
    if(sub === 'all') return true;
    if(sub === 'M1000') return cat === 'M1000' || cat === 'FINALS';
    return cat === sub;
  }

  function catVisible(cat){
    if(calFilter === 'all') return true;
    if(calFilter === 'atp') return ['GS','M1000','500','250','FINALS'].indexOf(cat) >= 0 && subMatches(cat, calSub);
    if(calFilter === 'ch') return cat.indexOf('CH') === 0 && subMatches(cat, calSub);
    if(calFilter === 'itf') return cat.indexOf('ITF') === 0 && subMatches(cat, calSub);
    // auto: segun tu nivel
    var r = human().rank;
    if(r <= 120) return ['GS','M1000','500','250','FINALS','CH175'].indexOf(cat) >= 0;
    if(r <= 300) return ['250','500','M1000','GS','CH175','CH125','CH100','CH75'].indexOf(cat) >= 0;
    if(r <= 500) return ['250','CH125','CH100','CH75','CH50','ITF25'].indexOf(cat) >= 0;
    return ['ITF25','ITF15','CH50','CH75'].indexOf(cat) >= 0;
  }

  // Descripcion de cada categoria para tooltips y leyenda
  var CAT_DIFF = {
    ITF15:  'El escalon de entrada: juveniles y jugadores fuera del top 450.',
    ITF25:  'Futures fuertes: nivel de rank 300-700.',
    CH50:   'Challengers de entrada: nivel de rank 280-900.',
    CH75:   'Challengers chicos: nivel de rank 200-500.',
    CH100:  'Challengers medianos: nivel de rank 150-450.',
    CH125:  'Challengers grandes: nivel de rank 100-350.',
    CH175:  'Los super-challengers: casi nivel ATP, rank 60-250.',
    '250':  'Circuito ATP: nivel top 150 (o via qualy).',
    '500':  'Torneos grandes del tour: nivel top 80.',
    M1000:  'Los nueve Masters: nivel top 85, casi todos los cracks.',
    GS:     'Los cuatro grandes: top 110, al mejor de 5 sets.',
    FINALS: 'Solo los 8 mejores del mundo.'
  };
  function badgeTitle(catKey){
    var cat = TC.CATS[catKey];
    var champ = catKey === 'FINALS' ? 1500 : cat.pts[cat.pts.length - 1];
    return cat.label + ' — Campeon: ' + champ + ' pts. ' + (CAT_DIFF[catKey] || '');
  }
  function badgeHtml(catKey){
    var cat = TC.CATS[catKey];
    return '<span class="badge" style="background:' + cat.color + '" title="' + esc(badgeTitle(catKey)) + '">' + esc(cat.label) + '</span>';
  }

  function renderCalendar(){
    var filters = [['auto','Para mi nivel'],['all','Todos'],['atp','ATP'],['ch','Challenger'],['itf','ITF']];
    var html = '<div class="cal-filters">' + filters.map(function(f){
      return '<button class="chip' + (calFilter===f[0]?' on':'') + '" data-filter="' + f[0] + '">' + f[1] + '</button>';
    }).join('') +
    // sub-filtro segun el grupo elegido (ATP -> 250/500/1000/GS, Challenger -> 50..175, ITF -> M15/M25)
    (SUBCATS[calFilter] ?
      '<span style="width:10px"></span>' +
      '<button class="chip' + (calSub === 'all' ? ' on' : '') + '" data-csub="all">Todos</button>' +
      SUBCATS[calFilter].map(function(sc){
        return '<button class="chip' + (calSub === sc[0] ? ' on' : '') + '" data-csub="' + sc[0] + '">' + sc[1] + '</button>';
      }).join('') : '') +
    '</div>';

    // filtros de mes y superficie
    html += '<div class="cal-filters">' +
      '<button class="chip' + (calMonth === 'all' ? ' on' : '') + '" data-cmonth="all">Todos los meses</button>' +
      TC.MESES.map(function(m, i){
        return '<button class="chip' + (calMonth === i ? ' on' : '') + '" data-cmonth="' + i + '">' + m.slice(0, 3) + '</button>';
      }).join('') + '</div>';
    html += '<div class="cal-filters">' +
      '<button class="chip' + (calSurf === 'all' ? ' on' : '') + '" data-csurf="all">Todas las superficies</button>' +
      ['clay','hard','grass','indoor'].map(function(s){
        return '<button class="chip' + (calSurf === s ? ' on' : '') + '" data-csurf="' + s + '">' + SURF_LABEL[s] + '</button>';
      }).join('') +
      '<span style="width:14px"></span>' +
      '<button class="chip' + (calRegion === 'all' ? ' on' : '') + '" data-cregion="all">Todas las regiones</button>' +
      Object.keys(TC.REGION_LABEL).map(function(r){
        return '<button class="chip' + (calRegion === r ? ' on' : '') + '" data-cregion="' + r + '">' + TC.REGION_LABEL[r] + '</button>';
      }).join('') + '</div>';

    // leyenda de categorias, de mas facil a mas dificil
    html += '<details class="legend"><summary>¿Que significa cada categoria? (de mas facil a mas dificil)</summary>';
    var order = ['ITF15','ITF25','CH50','CH75','CH100','CH125','CH175','250','500','M1000','GS','FINALS'];
    for(var li = 0; li < order.length; li++){
      var ck = order[li], cat = TC.CATS[ck];
      var champPts = ck === 'FINALS' ? 1500 : cat.pts[cat.pts.length - 1];
      html += '<div class="legend-row">' + badgeHtml(ck) +
        '<span class="legend-desc">' + esc(CAT_DIFF[ck]) + '</span>' +
        '<span class="legend-pts">🏆 ' + champPts + ' pts</span></div>';
    }
    html += '<div class="legend-row" style="border-top:1px solid var(--line);margin-top:4px">' +
      '<span style="font-size:12px;color:var(--muted);font-weight:700">Superficies:</span>' +
      ['clay','hard','grass','indoor'].map(function(s){
        return '<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px"><span class="sdot ' + s + '"></span>' + SURF_LABEL[s] + '</span>';
      }).join('') + '</div>';
    html += '</details>';

    var byMonth = {};
    for(var i = 0; i < S.schedule.length; i++){
      var d = S.schedule[i];
      if(d.startDay + d.dur < S.day - 7) continue;         // pasado lejano no
      if(!catVisible(d.cat) && S.registrations.indexOf(d.id) < 0) continue;
      var m = TC.dateOf(d.startDay).getUTCMonth();
      if(calMonth !== 'all' && m !== calMonth) continue;
      if(calSurf !== 'all' && d.surf !== calSurf) continue;
      if(calRegion !== 'all' && d.region !== calRegion) continue;
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
        var qc = TC.QUALI[d.cat];
        var viaQ = qc && S.players[S.humanId].rank > TC.CATS[d.cat].maxRank;
        btn = '<button class="btn small primary" data-reg="' + d.id + '">' + (viaQ ? 'Inscribirse (Qualy)' : 'Inscribirse') + '</button>';
      } else {
        status = chk.reason;
      }
    }
    var dfd = !d.started ? TC.defending(S, d) : 0;
    var dfdHtml = dfd > 0 ? '<span class="rchip" style="border-color:var(--warn);color:var(--warn)" title="Puntos que hiciste en la edicion pasada: vencen esta semana">Defendes ' + dfd + '</span>' : '';

    return '<div class="trow s-' + d.surf + (isNow?' now':'') + (isReg?' reg':'') + '">' +
      '<div class="dates">' + TC.fmtRange(d.startDay, d.startDay + d.dur - 1) + '</div>' +
      badgeHtml(d.cat) +
      sdotHtml(d.surf) +
      '<div class="tname tlink" data-detail="' + d.id + '" title="Ver detalle del torneo">' + esc(d.name) +
        (geoOf(d) ? ' <span class="tgeo">📍 ' + esc(geoOf(d)) + '</span>' : '') + '</div>' +
      dfdHtml +
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

  // Fase previa (qualy) como lista plegable
  function renderQualiSection(t){
    if(!t.qBracket) return '';
    var html = '<h3 class="section">Fase previa (Qualy) — ' + (t.qualifiers && t.qualifiers.length ? t.qualifiers.length + ' clasificados' : 'en juego') + '</h3>';
    for(var qr = 0; qr < t.qBracket.length; qr++){
      html += '<details class="round"' + (qr === t.qBracket.length - 1 && (!t.qResults || !t.qResults[qr]) ? ' open' : '') + '><summary>Qualy — ronda ' + (qr + 1) + '</summary>';
      var recs = t.qResults && t.qResults[qr];
      if(recs){
        for(var i = 0; i < recs.length; i++){
          var rec = recs[i];
          if(rec.p[0] == null && rec.p[1] == null) continue;
          var mine = rec.p[0] === S.humanId || rec.p[1] === S.humanId;
          var line;
          if(rec.bye){ line = playerName(rec.w, true) + ' — bye'; }
          else if(rec.wo){ line = playerName(rec.w, true) + ' gana por W.O.'; }
          else if(rec.w == null){ line = playerName(rec.p[0]) + ' vs ' + playerName(rec.p[1]) + ' — por jugar'; }
          else {
            var lId = rec.p[0] === rec.w ? rec.p[1] : rec.p[0];
            line = playerName(rec.w, true) + ' d. ' + playerName(lId) + ' &nbsp;<span style="color:var(--muted)">' + (rec.sc || '') + '</span>';
          }
          html += '<div class="mline' + (mine ? ' mine' : '') + '">' + line + '</div>';
        }
      } else {
        var round = t.qBracket[qr];
        for(i = 0; i < round.length; i += 2){
          if(round[i] == null && round[i + 1] == null) continue;
          var mine2 = round[i] === S.humanId || round[i + 1] === S.humanId;
          html += '<div class="mline' + (mine2 ? ' mine' : '') + '">' + playerName(round[i]) + ' vs ' + playerName(round[i + 1]) + '</div>';
        }
      }
      html += '</details>';
    }
    return html;
  }

  // Cuadro completo: qualy + rondas previas como lista + fase final como llave visual
  function renderDraw(t){
    var html = renderQualiSection(t);
    if(t.qBracket && !t.mainBuilt){
      return html + '<p style="color:var(--muted)">El cuadro principal se sortea cuando termine la qualy.</p>';
    }
    if(!t.bracket) return html + '<p style="color:var(--muted)">No hay datos del cuadro de este torneo.</p>';
    var totalR = Math.round(Math.log(t.drawSize) / Math.log(2));
    var rStart = t.drawSize > 32 ? totalR - 4 : 0; // cuadros grandes: llave visual desde octavos
    if(rStart > 0){
      html += '<h3 class="section">Rondas previas</h3>' + renderRoundsRange(t, 0, rStart);
      html += '<h3 class="section">Fase final</h3>';
    } else if(t.qBracket){
      html += '<h3 class="section">Cuadro principal</h3>';
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
      ' · Cuadro de ' + cat.draw + (def.cat === 'GS' ? ' · Mejor de 5' : '') +
      (geoOf(def) ? ' · 📍 ' + esc(geoOf(def)) : '') + '</span></div>';

    // estado + inscripcion
    if(!def.started){
      var chk = TC.canRegister(S, def);
      var isReg = S.registrations.indexOf(def.id) >= 0;
      var adv = TC.registerAdvice(S, def);
      var advHtml = adv ? '<div style="color:' + (adv.level === 'hard' ? 'var(--danger)' : 'var(--warn)') + ';font-size:12px;font-weight:700;margin-top:6px">' +
        (adv.level === 'hard' ? '⚠️ ' : '💤 ') + esc(adv.msg) + '</div>' : '';
      if(isReg) html += '<div class="next-match"><div>Estas inscripto.' + advHtml + '</div><div class="spacer"></div><button class="btn small" data-unreg="' + def.id + '">Bajarse</button></div>';
      else if(chk.ok) html += '<div class="next-match"><div>Inscripcion abierta.' + advHtml + '</div><div class="spacer"></div><button class="btn small primary" data-reg="' + def.id + '">Inscribirse</button></div>';
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
      stat('<span class="stars">' + starsOf(h) + '</span>', 'Calidad') +
      stat(TC.overall(h).toFixed(2), 'Nivel general') +
      stat(surfHtml(h.pref), 'Superficie') +
      stat(h.hand === 'Z' ? 'Zurdo' : 'Diestro', 'Mano') +
      stat(h.ht ? (h.ht / 100).toFixed(2) + 'm' : '—', 'Altura') +
      '</div>';

    html += '<h3 class="section">Evolucion del ranking</h3>' +
      '<div class="cal-filters" style="margin-bottom:8px">' +
        [['3m','3 meses'],['1y','1 anio'],['all','Toda la carrera']].map(function(r){
          return '<button class="chip' + (chartRange === r[0] ? ' on' : '') + '" data-crange="' + r[0] + '">' + r[1] + '</button>';
        }).join('') +
      '</div>' +
      '<canvas id="rankchart" width="1000" height="170"></canvas>';

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
      html += resultRow(best[i]);
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

  // Fila de resultado con categoria, ronda, rival y marcador
  function resultRow(r){
    var detail = '';
    if(r.vs){
      detail = '<div style="font-size:11px;color:var(--muted);margin-top:2px">' +
        (r.champ ? '🏆 Vencio a ' : 'Cayo con ') + esc(r.vs) + (r.sc ? ' · ' + esc(r.sc) : '') + '</div>';
    }
    return '<div class="trow"><div class="dates">' + TC.fmtDate(r.day) + '</div>' +
      badgeHtml(r.cat) +
      '<div class="tname">' + esc(r.name) + (r.champ ? ' 🏆' : '') + detail + '</div>' +
      resultChip(r) +
      '<div class="status"><b>' + r.pts + '</b> pts</div></div>';
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

  function drawRankChart(hoverIdx){
    var cv = $('rankchart');
    if(!cv) return;
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    var padL = 46, padR = 14, padT = 12, padB = 24;
    ctx.clearRect(0, 0, W, H);

    var span = chartRange === '3m' ? 91 : (chartRange === '1y' ? 364 : 99999);
    var data = S.rankHistory.filter(function(d){ return d[1] != null && d[0] > S.day - span; });
    if(data.length < 2){
      ctx.fillStyle = '#8494ab'; ctx.font = '13px Inter, sans-serif';
      ctx.fillText('Aun no hay historial de ranking en este periodo', 20, H / 2);
      return;
    }
    var minR = Infinity, maxR = 0;
    data.forEach(function(d){ minR = Math.min(minR, d[1]); maxR = Math.max(maxR, d[1]); });
    minR = Math.max(1, minR - 3); maxR = maxR + 5;
    var x0 = data[0][0], x1 = data[data.length - 1][0];
    function X(day){ return padL + (W - padL - padR) * (day - x0) / Math.max(1, x1 - x0); }
    function Y(rank){ return padT + (H - padT - padB) * (rank - minR) / Math.max(1, maxR - minR); }

    // grilla horizontal: mejor / medio / peor
    var gridRanks = [minR, Math.round((minR + maxR) / 2), maxR];
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.fillStyle = '#8494ab'; ctx.font = '10px Inter, sans-serif';
    gridRanks.forEach(function(r){
      var y = Y(r);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillText('#' + r, 6, y + 3);
    });

    // ticks del eje X segun el rango: meses o anios
    var d0 = TC.dateOf(x0), d1 = TC.dateOf(x1);
    var totalDays = x1 - x0;
    var ticks = [];
    if(totalDays <= 400){
      // un tick por mes
      var t = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1));
      while(t <= d1){
        ticks.push({day: TC.dayOf(t.getUTCFullYear(), t.getUTCMonth() + 1, 1),
                    label: TC.MESES[t.getUTCMonth()].slice(0, 3) + (t.getUTCMonth() === 0 ? ' ' + String(t.getUTCFullYear()).slice(2) : '')});
        t = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 1));
      }
      if(totalDays > 200){ ticks = ticks.filter(function(_, i){ return i % 2 === 0; }); }
    } else {
      // un tick por anio
      for(var y2 = d0.getUTCFullYear() + 1; y2 <= d1.getUTCFullYear(); y2++){
        ticks.push({day: TC.dayOf(y2, 1, 1), label: String(y2)});
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ticks.forEach(function(tk){
      var x = X(tk.day);
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, H - padB); ctx.stroke();
      ctx.fillText(tk.label, x - 10, H - 8);
    });

    // la linea de ranking
    ctx.strokeStyle = '#c8f31d'; ctx.lineWidth = 2; ctx.beginPath();
    data.forEach(function(d, i){
      if(i === 0) ctx.moveTo(X(d[0]), Y(d[1])); else ctx.lineTo(X(d[0]), Y(d[1]));
    });
    ctx.stroke();

    // punto final + rank actual
    var last = data[data.length - 1];
    ctx.fillStyle = '#c8f31d';
    ctx.beginPath(); ctx.arc(X(last[0]), Y(last[1]), 3.5, 0, 7); ctx.fill();
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('#' + last[1], Math.min(X(last[0]) + 7, W - 40), Y(last[1]) - 6);

    // hover: crosshair + cajita con ranking y fecha del punto apuntado
    if(hoverIdx != null && data[hoverIdx]){
      var hp = data[hoverIdx];
      var hx = X(hp[0]), hy = Y(hp[1]);
      ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(hx, padT); ctx.lineTo(hx, H - padB); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#c8f31d';
      ctx.beginPath(); ctx.arc(hx, hy, 3, 0, 7); ctx.fill();
      var label = '#' + hp[1] + ' · ' + TC.fmtDate(hp[0]) + (hp[2] != null ? ' · ' + hp[2] + ' pts' : '');
      ctx.font = 'bold 12px Inter, sans-serif';
      var tw = ctx.measureText(label).width;
      var bx = Math.max(padL, Math.min(hx - tw / 2 - 8, W - tw - 20));
      var by = hy - 34 < padT ? hy + 12 : hy - 34;
      ctx.fillStyle = 'rgba(10,14,18,.95)';
      ctx.strokeStyle = 'rgba(255,255,255,.2)';
      roundRect(ctx, bx, by, tw + 16, 22, 6);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#eef2f7';
      ctx.fillText(label, bx + 8, by + 15);
    }

    // interaccion: buscar el punto mas cercano al mouse o al dedo
    function pickPoint(clientX){
      var rect = cv.getBoundingClientRect();
      var mx = (clientX - rect.left) * (cv.width / rect.width);
      var bestI = null, bestD = 34;
      for(var i = 0; i < data.length; i++){
        var d = Math.abs(X(data[i][0]) - mx);
        if(d < bestD){ bestD = d; bestI = i; }
      }
      return bestI;
    }
    cv.onmousemove = function(e){
      var bestI = pickPoint(e.clientX);
      if(bestI !== hoverIdx) drawRankChart(bestI);
    };
    cv.onmouseleave = function(){ drawRankChart(); };
    cv.ontouchstart = cv.ontouchmove = function(e){
      if(!e.touches || !e.touches.length) return;
      e.preventDefault();
      var bestI = pickPoint(e.touches[0].clientX);
      if(bestI !== hoverIdx) drawRankChart(bestI);
    };
    cv.ontouchend = function(){ setTimeout(function(){ drawRankChart(); }, 1400); };
  }

  function roundRect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
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
    if(S.recap){
      html += '<div style="margin-top:14px"><button class="btn" id="btn-recap">📋 Ver resumen de la temporada ' + S.recap.y + '</button></div>';
    }
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
    if(pm.quali) return 'Qualy ' + (pm.round + 1) + 'a ronda';
    if(t.isFinals) return pm.round <= 2 ? 'Round Robin' : (pm.round === 3 ? 'Semifinal' : 'la FINAL');
    var lbl = TC.roundLabel(t, pm.round);
    return lbl === 'Final' ? 'la FINAL' : lbl;
  }

  // Selector de donde pasar las semanas libres: casa / quedarse / adelantarse al proximo torneo
  function nextRegDef(){
    var best = null;
    for(var i = 0; i < S.registrations.length; i++){
      var d = TC.findDef(S, S.registrations[i]);
      if(d && d.region && d.startDay > S.day && (!best || d.startDay < best.startDay)) best = d;
    }
    return best;
  }

  function renderStaySeg(h){
    var mode = S.stayMode || (S.stayAbroad ? 'stay' : 'home');
    var home = TC.playerRegion(h);
    var next = nextRegDef();
    var away = h.loc && h.loc !== home;
    var canNext = next && next.region !== (h.loc || home);
    if(!away && !canNext) return '';
    var html = '<div class="seg" id="stay-seg" title="Donde pasas las semanas libres: el proximo viaje sale desde ahi">' +
      '<button data-staymode="home" class="' + (mode === 'home' ? 'on' : '') + '">🏠 Casa</button>';
    if(away) html += '<button data-staymode="stay" class="' + (mode === 'stay' ? 'on' : '') + '">📍 Quedarme en ' + (TC.REGION_LABEL[h.loc] || '?') + '</button>';
    if(canNext) html += '<button data-staymode="next" class="' + (mode === 'next' ? 'on' : '') + '" title="Viajar antes y aclimatarte donde jugas ' + esc(next.name) + '">✈️ Adelantarme a ' + (TC.REGION_LABEL[next.region] || '?') + '</button>';
    return html + '</div>';
  }

  function renderActionBar(){
    var h = human();
    var pending = !!S.pendingMatch;
    var focusOpts = TC.ATTRS.map(function(a){
      return '<option value="' + a + '"' + (S.trainFocus === a ? ' selected' : '') + '>' + TC.ATTR_LABEL[a] + '</option>';
    }).join('');
    var inTournament = h.curT != null;

    return '<div class="actionbar">' +
      (h.injury ?
        '<span style="color:var(--danger);font-weight:700">🏥 Lesionado (' + h.injury.days + 'd) — solo queda recuperarse</span>'
        : (inTournament || pending ?
        '<span style="color:var(--muted)">En torneo — sin entrenamientos</span>'
        :
        '<div class="seg" id="mode-seg">' +
          '<button data-mode="train" class="' + (S.action === 'train' ? 'on' : '') + '">Entrenar</button>' +
          '<button data-mode="rest" class="' + (S.action === 'rest' ? 'on' : '') + '">Descansar</button>' +
        '</div>' +
        (S.action === 'train' ? '<select id="focus-sel">' + focusOpts + '</select>' : '') +
        renderStaySeg(h))
      ) +
      (!h.injury && h.energy < 30 ? '<span style="color:var(--danger);font-size:12px;font-weight:800">⚠️ FUNDIDO: riesgo alto de lesion grave</span>' : '') +
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
      if(t.dataset.filter){ calFilter = t.dataset.filter; calSub = 'all'; render(); return; }
      if(t.dataset.csub){ calSub = t.dataset.csub; render(); return; }
      if(t.dataset.cmonth != null){ calMonth = t.dataset.cmonth === 'all' ? 'all' : parseInt(t.dataset.cmonth, 10); render(); return; }
      if(t.dataset.csurf){ calSurf = t.dataset.csurf; render(); return; }
      if(t.dataset.cregion){ calRegion = t.dataset.cregion; render(); return; }
      if(t.dataset.aregion){ archiveRegion = t.dataset.aregion; render(); return; }
      if(t.dataset.aplayed){ archivePlayed = t.dataset.aplayed; render(); return; }
      if(t.dataset.crange){ chartRange = t.dataset.crange; render(); return; }
      if(t.dataset.ayear){ archiveYear = parseInt(t.dataset.ayear, 10); render(); return; }
      if(t.dataset.amonth != null){ archiveMonth = t.dataset.amonth === 'all' ? 'all' : parseInt(t.dataset.amonth, 10); render(); return; }
      if(t.dataset.asurf){ archiveSurf = t.dataset.asurf; render(); return; }
      if(t.dataset.acat){ archiveCat = t.dataset.acat; archiveSub = 'all'; render(); return; }
      if(t.dataset.asub){ archiveSub = t.dataset.asub; render(); return; }
      if(t.id === 'btn-back-cal'){ detailId = null; render(); return; }
      if(t.id === 'btn-back-arch'){ archInstId = null; render(); return; }
      var al = t.closest('[data-adetail]');
      if(al){ archInstId = al.dataset.adetail; render(); return; }
      var dl = t.closest('[data-detail]');
      if(dl){ detailId = dl.dataset.detail; render(); return; }
      if(t.dataset.reg){
        var def = TC.findDef(S, t.dataset.reg);
        var adv = def ? TC.registerAdvice(S, def) : null;
        if(adv){ openAdviceModal(t.dataset.reg, adv); return; }
        doRegister(t.dataset.reg);
        return;
      }
      if(t.dataset.unreg){ TC.unregister(S, t.dataset.unreg); TC.save(S); render(); return; }
      var ar = t.closest('.attr-row');
      if(ar && ar.dataset.attr){ S.trainFocus = ar.dataset.attr; S.action = 'train'; render(); return; }
      if(t.id === 'btn-play2'){ openMatchModal(); return; }
      if(t.id === 'btn-recap'){ openRecapModal(); return; }
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
    var stseg = $('stay-seg');
    if(stseg) stseg.onclick = function(e){
      var b = e.target.closest('button');
      if(b && b.dataset.staymode){
        S.stayMode = b.dataset.staymode;
        S.stayAbroad = S.stayMode === 'stay'; // compat
        TC.save(S); render();
      }
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
    var h = human();
    var before = {};
    TC.ATTRS.forEach(function(a){ before[a] = h[a]; });
    var ev = TC.advance(S, mode);
    // recap de fin de temporada, una sola vez
    if(S.recapNew){
      S.recapNew = false;
      setTimeout(openRecapModal, 80);
    }
    // que cambio en tus atributos desde el ultimo avance
    weekReport = TC.ATTRS.map(function(a){
      return {a: a, d: Math.round((h[a] - before[a]) * 1000) / 1000};
    }).filter(function(x){ return Math.abs(x.d) >= 0.001; })
      .sort(function(x, y){ return Math.abs(y.d) - Math.abs(x.d); })
      .slice(0, 3);
    TC.save(S);
    render();
    if(ev.type === 'match') openMatchModal();
  }

  // ================= INSCRIPCION =================
  function doRegister(defId){
    var r = TC.register(S, defId);
    if(!r.ok) alert(r.reason);
    TC.save(S);
    render();
  }

  // Aviso de dificultad con el estilo del juego (en vez del confirm nativo)
  function openAdviceModal(defId, adv){
    var def = TC.findDef(S, defId);
    if(!def) return;
    var cat = TC.CATS[def.cat];
    var hard = adv.level === 'hard';
    openModal(
      '<div class="match-card">' +
        '<div style="font-size:44px;line-height:1">' + (hard ? '⚠️' : '💤') + '</div>' +
        '<h2 style="margin-top:8px">' + (hard ? 'Cuadro muy dificil' : 'Sobreclasificado') + '</h2>' +
        '<div class="tourinfo">' + badgeHtml(def.cat) + ' &nbsp;' + esc(def.name) + ' · ' +
          TC.fmtRange(def.startDay, def.startDay + def.dur - 1) + '</div>' +
        '<div class="modal-note" style="font-size:14px;max-width:420px;margin:14px auto;color:' +
          (hard ? 'var(--danger)' : 'var(--warn)') + '">' + esc(adv.msg) + '</div>' +
        '<div class="modal-actions">' +
          '<button class="btn" id="adv-cancel">Mejor no</button>' +
          '<button class="btn primary" id="adv-go">Inscribirme igual</button>' +
        '</div>' +
      '</div>'
    );
    $('adv-cancel').onclick = closeModal;
    $('adv-go').onclick = function(){
      closeModal();
      doRegister(defId);
    };
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
      resHtml += resultRow(recent[i]);
    }
    openModal(
      '<div>' +
        '<h2>' + esc(p.name) + (id === S.humanId ? ' <span style="color:var(--accent);font-size:13px">(vos)</span>' : '') + '</h2>' +
        '<div class="modal-note" style="margin-top:2px">' + p.country + ' · ' + p.age + ' anios · ' + (p.ht ? (p.ht / 100).toFixed(2) + 'm · ' : '') + (p.hand === 'Z' ? 'Zurdo' : 'Diestro') + ' · Prefiere ' + surfHtml(p.pref) +
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

  // Logo de categoria (imagenes heredadas del Sim_v3.1 original)
  var GS_IMG = {ausopen:'AustralianOpen', rolandgarros:'RG', wimbledon:'WB', usopen:'USOpen'};
  var CAT_IMG = {M1000:'ATP1000', '500':'ATP500', '250':'ATP250', FINALS:'ATPFinals',
                 CH175:'Challenger175', CH125:'Challenger125', CH100:'Challenger100',
                 CH75:'Challenger75', CH50:'Challenger50', ITF25:'Future', ITF15:'Future'};
  function catImg(t){
    if(t.cat === 'GS'){
      var b = (t.baseId || t.id || '').replace(/_\d+$/, '');
      return 'img/' + (GS_IMG[b] || 'AustralianOpen') + '.png';
    }
    return CAT_IMG[t.cat] ? 'img/' + CAT_IMG[t.cat] + '.png' : null;
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
    var pimg = catImg(t);
    openModal(
      '<div class="match-card">' +
        (pimg ? '<img class="cat-logo big" src="' + pimg + '" alt="">' : '') +
        '<h2>' + esc(t.name) + '</h2>' +
        '<div class="tourinfo"><span class="badge" style="background:' + cat.color + '">' + cat.label + '</span> ' +
          (pm.quali ? 'QUALY — ronda ' + (pm.round + 1) + ' de 2' :
            (t.isFinals ? (pm.round <= 2 ? 'Round Robin' : pm.round === 3 ? 'Semifinal' : 'FINAL') : TC.roundLabel(t, pm.round))) +
          ' · ' + SURF_LABEL[t.surf] + (t.bestOf === 5 && !pm.quali ? ' · Mejor de 5' : '') + '</div>' +
        '<div class="face2face">' +
          '<div class="f2f-p"><div class="nm" style="color:var(--accent)">' + esc(h.name) + '</div>' +
            '<div class="meta">' + (h.rank === 9999 ? 'NR' : '#' + h.rank) + ' · Energia ' + Math.round(h.energy) + '% · ' + fmtForm(h.form) + '</div>' +
            '<div class="meta">Nivel <span class="stars">' + starsOf(h) + '</span></div></div>' +
          '<div class="f2f-vs">VS</div>' +
          '<div class="f2f-p"><div class="nm plink" data-player="' + opp.id + '" title="Ver ficha">' + esc(opp.name) + '</div>' +
            '<div class="meta">' + (opp.rank === 9999 ? 'NR' : '#' + opp.rank) + ' · ' + opp.country + ' · ' + opp.age + ' anios · Energia ' + Math.round(opp.energy) + '% · ' + fmtForm(opp.form) + '</div>' +
            '<div class="meta">Nivel <span class="stars">' + starsOf(opp) + '</span> · Prefiere ' + surfHtml(opp.pref) + '</div>' +
            (S.h2h && S.h2h[opp.id] ? '<div class="meta">H2H: ' + h2hLabel(S.h2h[opp.id]) + '</div>' : '') + '</div>' +
        '</div>' +
        (h.energy < 30 ? '<div class="injury-note">⚠️ Estas fundido (' + Math.round(h.energy) + '%): jugar asi multiplica el riesgo de una lesion de meses</div>' : '') +
        '<div class="modal-actions">' +
          '<button class="btn primary" id="m-play">Jugar el partido</button>' +
        '</div>' +
      '</div>'
    );
    $('m-play').onclick = playMatch;
  }

  // Parsea "6-4 3-6 7-6(4)" (mis games primero) a sets estructurados
  function parseScoreSets(score){
    return score.split(/\s+/).filter(Boolean).map(function(s){
      var tb = s.match(/\((\d+)\)$/);
      var g = s.replace(/\(\d+\)$/, '').split('-').map(Number);
      return {me: g[0], op: g[1], tb: tb ? tb[1] : null};
    });
  }

  function playMatch(){
    var pm = S.pendingMatch;
    var t = TC.findActive(S, pm.tid);
    var opp = S.players[pm.oppId];
    var res = TC.playPendingMatch(S);
    TC.save(S);

    var h = human();
    var sets = parseScoreSets(res.score);
    var maxSets = t.bestOf === 5 && !res.quali ? 5 : 3;
    var img = catImg(t);

    function sbRow(name, who, isMe){
      var cells = '';
      for(var i = 0; i < maxSets; i++){
        cells += '<td class="g" id="sb-' + who + '-' + i + '"></td>';
      }
      return '<tr><td class="sbn' + (isMe ? ' me' : '') + '">' + esc(name) + '</td>' + cells + '</tr>';
    }

    openModal(
      '<div class="match-card">' +
        '<div class="court c-' + t.surf + '">' +
          '<div class="court-head">' +
            (img ? '<img class="cat-logo" src="' + img + '" alt="">' : '') +
            '<div class="court-tname">' + esc(t.name) + (res.quali ? ' · QUALY' : '') + '</div>' +
          '</div>' +
          '<table class="sb">' + sbRow(h.name, 'h', true) + sbRow(opp.name, 'o', false) + '</table>' +
        '</div>' +
        '<div id="verdict-zone"></div>' +
        '<div class="modal-actions"><button class="btn" id="m-skip">Resultado ya</button></div>' +
      '</div>'
    );

    var i = 0;
    var revealed = false;
    function fillSet(idx){
      var st = sets[idx];
      var ch = $('sb-h-' + idx), co = $('sb-o-' + idx);
      if(!ch || !co) return;
      ch.innerHTML = st.me + (st.tb && st.me > st.op ? '<sup>' + st.tb + '</sup>' : '');
      co.innerHTML = st.op + (st.tb && st.op > st.me ? '<sup>' + st.tb + '</sup>' : '');
      if(st.me > st.op) ch.classList.add('winset'); else co.classList.add('winset');
    }
    var timer = setInterval(function(){
      if(i < sets.length){
        fillSet(i++);
      } else {
        clearInterval(timer);
        showVerdict();
      }
    }, 850);

    function showVerdict(){
      if(revealed) return;
      revealed = true;
      clearInterval(timer);
      for(var k = 0; k < sets.length; k++) fillSet(k);
      var vz = $('verdict-zone');
      var html = '<div class="verdict ' + (res.won ? 'win' : 'lose') + '">' +
        (res.won ? 'VICTORIA' : 'DERROTA') + '</div>' +
        '<div class="modal-note">Duracion: ' + Math.floor(res.duration / 60) + 'h ' + (res.duration % 60) + 'm · Energia restante: ' + Math.round(res.energyAfter) + '%</div>';
      if(res.xp && res.xp.length){
        html += '<div class="modal-note" style="color:var(--accent2)">Experiencia: ' +
          res.xp.map(function(g){ return TC.ATTR_LABEL[g.attr] + ' +' + g.amt.toFixed(3).replace(/0+$/, '').replace(/\.$/, ''); }).join(' · ') + '</div>';
      }
      if(res.qualified) html += '<div class="champ-banner" style="font-size:19px;color:var(--accent2)">🎟️ CLASIFICASTE AL CUADRO PRINCIPAL!</div>';
      if(res.isChampion) html += '<div class="champ-banner">🏆 CAMPEON DEL TORNEO!</div>';
      if(res.injury) html += '<div class="injury-note">Te lesionaste: ' + esc(res.injury.name) + ' — ' + res.injury.days + ' dias de baja</div>';
      vz.innerHTML = html;
      document.querySelector('.modal-actions').innerHTML = '<button class="btn primary" id="m-close">Continuar</button>';
      $('m-close').onclick = function(){ closeModal(); render(); };
    }
    $('m-skip').onclick = showVerdict;
  }

  // ================= RECAP DE TEMPORADA =================
  function openRecapModal(){
    var r = S.recap;
    if(!r) return;
    var hu = r.human;
    var html = '<div>' +
      '<h2 style="text-align:center">Resumen ' + r.y + '</h2>' +
      '<h3 class="section">Tu anio</h3>' +
      '<div class="pstats">' +
        stat((hu.rankStart ? '#' + hu.rankStart : 'NR') + ' → ' + (hu.rank ? '#' + hu.rank : 'NR'), 'Ranking') +
        stat(hu.wins + '-' + hu.losses, 'Record') +
        stat(hu.titles.length, 'Titulos') +
        stat(hu.pts, 'Puntos') +
      '</div>';
    if(hu.titles.length){
      html += hu.titles.map(function(t){ return '<div class="title-item">🏆 ' + badgeHtml(t.cat) + ' <b>' + esc(t.name) + '</b></div>'; }).join('');
    }
    if(hu.best && hu.best.pts > 0 && !hu.titles.length){
      html += '<div class="modal-note">Tu mejor resultado: ' + esc(hu.best.name) + ' (' + hu.best.pts + ' pts)</div>';
    }
    html += '<h3 class="section">El anio del circuito</h3>';
    if(r.top5 && r.top5.length){
      html += '<table class="rank">' + r.top5.map(function(p){
        return '<tr><td class="num">' + p.rank + '</td><td>' + esc(p.name) + '</td><td style="text-align:right">' + p.pts + ' pts</td></tr>';
      }).join('') + '</table>';
    }
    if(r.gs && r.gs.length){
      html += '<h3 class="section">Grand Slams</h3>' + r.gs.map(function(g){
        return '<div class="trow" style="padding:5px 10px"><div class="tname" style="font-weight:600">' + esc(g.t) + '</div><div class="status">🏆 ' + esc(g.c || '?') + '</div></div>';
      }).join('');
    }
    if(r.finals) html += '<div class="trow" style="padding:5px 10px"><div class="tname" style="font-weight:600">ATP Finals</div><div class="status">🏆 ' + esc(r.finals.c || '?') + '</div></div>';
    if(r.most && r.most.length){
      html += '<div class="modal-note">Mas titulos ATP: ' + r.most.map(function(m){ return esc(m.name) + ' (' + m.n + ')'; }).join(' · ') + '</div>';
    }
    if(r.climber){
      html += '<div class="modal-note" style="color:var(--accent2)">📈 Revelacion del anio: ' + esc(r.climber.name) + ' (' + (r.climber.from === 'NR' ? 'NR' : '#' + r.climber.from) + ' → #' + r.climber.to + ')</div>';
    }
    html += '<div class="modal-actions"><button class="btn primary" id="recap-close">Cerrar</button></div></div>';
    openModal(html);
    $('recap-close').onclick = closeModal;
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
