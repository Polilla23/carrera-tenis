// Calendario ATP (estructura temporada 2026). Fechas: [mes, dia] de inicio + duracion en dias.
// cat: GS | M1000 | 500 | 250 | CH125 | CH75 | ITF25 | ITF15 | FINALS
var TC = (typeof TC !== 'undefined') ? TC : {};
(function(){

  // Torneos fijos del circuito ATP
  TC.ATP_CALENDAR = [
    {id:'brisbane',   name:'Brisbane International',      cat:'250',   surf:'hard',   m:1,  d:1,  dur:7},
    {id:'hongkong',   name:'Hong Kong Open',              cat:'250',   surf:'hard',   m:1,  d:1,  dur:7},
    {id:'adelaide',   name:'Adelaide International',      cat:'250',   surf:'hard',   m:1,  d:8,  dur:7},
    {id:'auckland',   name:'ASB Classic (Auckland)',      cat:'250',   surf:'hard',   m:1,  d:8,  dur:7},
    {id:'ausopen',    name:'Australian Open',             cat:'GS',    surf:'hard',   m:1,  d:15, dur:14},
    {id:'montpellier',name:'Open Occitanie (Montpellier)',cat:'250',   surf:'indoor', m:1,  d:30, dur:7},
    {id:'cordoba',    name:'Cordoba Open',                cat:'250',   surf:'clay',   m:1,  d:30, dur:7},
    {id:'dallas',     name:'Dallas Open',                 cat:'500',   surf:'indoor', m:2,  d:6,  dur:7},
    {id:'rotterdam',  name:'ABN AMRO Open (Rotterdam)',   cat:'500',   surf:'indoor', m:2,  d:6,  dur:7},
    {id:'buenosaires',name:'Argentina Open (Buenos Aires)',cat:'250',  surf:'clay',   m:2,  d:13, dur:7},
    {id:'delray',     name:'Delray Beach Open',           cat:'250',   surf:'hard',   m:2,  d:13, dur:7},
    {id:'marseille',  name:'Open 13 (Marsella)',          cat:'250',   surf:'indoor', m:2,  d:13, dur:7},
    {id:'rio',        name:'Rio Open',                    cat:'500',   surf:'clay',   m:2,  d:20, dur:7},
    {id:'doha',       name:'Qatar Open (Doha)',           cat:'500',   surf:'hard',   m:2,  d:20, dur:7},
    {id:'dubai',      name:'Dubai Championships',         cat:'500',   surf:'hard',   m:2,  d:27, dur:7},
    {id:'acapulco',   name:'Abierto Mexicano (Acapulco)', cat:'500',   surf:'hard',   m:2,  d:27, dur:7},
    {id:'santiago',   name:'Chile Open (Santiago)',       cat:'250',   surf:'clay',   m:2,  d:27, dur:7},
    {id:'indianwells',name:'BNP Paribas Open (Indian Wells)',cat:'M1000',surf:'hard', m:3,  d:8,  dur:12},
    {id:'miami',      name:'Miami Open',                  cat:'M1000', surf:'hard',   m:3,  d:22, dur:12},
    {id:'marrakech',  name:'Grand Prix Hassan II (Marrakech)',cat:'250',surf:'clay',  m:4,  d:5,  dur:7},
    {id:'houston',    name:'US Clay Court (Houston)',     cat:'250',   surf:'clay',   m:4,  d:5,  dur:7},
    {id:'bucarest',   name:'Tiriac Open (Bucarest)',      cat:'250',   surf:'clay',   m:4,  d:5,  dur:7},
    {id:'montecarlo', name:'Monte-Carlo Masters',         cat:'M1000', surf:'clay',   m:4,  d:13, dur:8},
    {id:'barcelona',  name:'Barcelona Open',              cat:'500',   surf:'clay',   m:4,  d:22, dur:7},
    {id:'munich',     name:'BMW Open (Munich)',           cat:'500',   surf:'clay',   m:4,  d:22, dur:7},
    {id:'madrid',     name:'Madrid Open',                 cat:'M1000', surf:'clay',   m:4,  d:30, dur:12},
    {id:'roma',       name:'Italian Open (Roma)',         cat:'M1000', surf:'clay',   m:5,  d:13, dur:12},
    {id:'hamburgo',   name:'Hamburg Open',                cat:'500',   surf:'clay',   m:5,  d:26, dur:6},
    {id:'ginebra',    name:'Geneva Open',                 cat:'250',   surf:'clay',   m:5,  d:26, dur:6},
    {id:'rolandgarros',name:'Roland Garros',              cat:'GS',    surf:'clay',   m:6,  d:1,  dur:14},
    {id:'stuttgart',  name:'Boss Open (Stuttgart)',       cat:'250',   surf:'grass',  m:6,  d:16, dur:7},
    {id:'hertogenbosch',name:'Libema Open (Den Bosch)',   cat:'250',   surf:'grass',  m:6,  d:16, dur:7},
    {id:'halle',      name:'Halle Open',                  cat:'500',   surf:'grass',  m:6,  d:23, dur:7},
    {id:'queens',     name:"Queen's Club (Londres)",      cat:'500',   surf:'grass',  m:6,  d:23, dur:7},
    {id:'mallorca',   name:'Mallorca Championships',      cat:'250',   surf:'grass',  m:6,  d:30, dur:6},
    {id:'eastbourne', name:'Eastbourne International',    cat:'250',   surf:'grass',  m:6,  d:30, dur:6},
    {id:'wimbledon',  name:'Wimbledon',                   cat:'GS',    surf:'grass',  m:7,  d:7,  dur:14},
    {id:'bastad',     name:'Nordea Open (Bastad)',        cat:'250',   surf:'clay',   m:7,  d:22, dur:7},
    {id:'gstaad',     name:'Swiss Open (Gstaad)',         cat:'250',   surf:'clay',   m:7,  d:22, dur:7},
    {id:'loscabos',   name:'Los Cabos Open',              cat:'250',   surf:'hard',   m:7,  d:22, dur:7},
    {id:'umag',       name:'Croatia Open (Umag)',         cat:'250',   surf:'clay',   m:7,  d:29, dur:7},
    {id:'kitzbuhel',  name:'Generali Open (Kitzbuhel)',   cat:'250',   surf:'clay',   m:7,  d:29, dur:7},
    {id:'washington', name:'DC Open (Washington)',        cat:'500',   surf:'hard',   m:7,  d:29, dur:7},
    {id:'canada',     name:'Canadian Open (Toronto)',     cat:'M1000', surf:'hard',   m:8,  d:6,  dur:12},
    {id:'cincinnati', name:'Cincinnati Open',             cat:'M1000', surf:'hard',   m:8,  d:19, dur:12},
    {id:'winstonsalem',name:'Winston-Salem Open',         cat:'250',   surf:'hard',   m:9,  d:1,  dur:6},
    {id:'usopen',     name:'US Open',                     cat:'GS',    surf:'hard',   m:9,  d:8,  dur:14},
    {id:'chengdu',    name:'Chengdu Open',                cat:'250',   surf:'hard',   m:9,  d:24, dur:7},
    {id:'hangzhou',   name:'Hangzhou Open',               cat:'250',   surf:'hard',   m:9,  d:24, dur:7},
    {id:'tokio',      name:'Japan Open (Tokio)',          cat:'500',   surf:'hard',   m:10, d:1,  dur:7},
    {id:'beijing',    name:'China Open (Beijing)',        cat:'500',   surf:'hard',   m:10, d:1,  dur:7},
    {id:'shanghai',   name:'Shanghai Masters',            cat:'M1000', surf:'hard',   m:10, d:9,  dur:12},
    {id:'almaty',     name:'Almaty Open',                 cat:'250',   surf:'indoor', m:10, d:22, dur:6},
    {id:'bruselas',   name:'European Open (Bruselas)',    cat:'250',   surf:'indoor', m:10, d:22, dur:6},
    {id:'estocolmo',  name:'Stockholm Open',              cat:'250',   surf:'indoor', m:10, d:22, dur:6},
    {id:'viena',      name:'Erste Bank Open (Viena)',     cat:'500',   surf:'indoor', m:10, d:29, dur:6},
    {id:'basilea',    name:'Swiss Indoors (Basilea)',     cat:'500',   surf:'indoor', m:10, d:29, dur:6},
    {id:'paris',      name:'Paris Masters',               cat:'M1000', surf:'indoor', m:11, d:5,  dur:7},
    {id:'metz',       name:'Moselle Open (Metz)',         cat:'250',   surf:'indoor', m:11, d:13, dur:6},
    {id:'atenas',     name:'Hellenic Championship (Atenas)',cat:'250', surf:'indoor', m:11, d:13, dur:6},
    {id:'finals',     name:'ATP Finals (Turin)',          cat:'FINALS',surf:'indoor', m:11, d:22, dur:8}
  ];

  // Region geografica de cada torneo ATP (para que la IA elija torneos cercanos/afines)
  TC.EVENT_REGION = {
    brisbane:'oce', hongkong:'asia', adelaide:'oce', auckland:'oce', ausopen:'oce',
    montpellier:'eur', cordoba:'sam', dallas:'nam', rotterdam:'eur', buenosaires:'sam',
    delray:'nam', marseille:'eur', rio:'sam', doha:'asia', dubai:'asia', acapulco:'nam',
    santiago:'sam', indianwells:'nam', miami:'nam', marrakech:'afr', houston:'nam',
    bucarest:'eur', montecarlo:'eur', barcelona:'eur', munich:'eur', madrid:'eur',
    roma:'eur', hamburgo:'eur', ginebra:'eur', rolandgarros:'eur', stuttgart:'eur',
    hertogenbosch:'eur', halle:'eur', queens:'eur', mallorca:'eur', eastbourne:'eur',
    wimbledon:'eur', bastad:'eur', gstaad:'eur', loscabos:'nam', umag:'eur',
    kitzbuhel:'eur', washington:'nam', canada:'nam', cincinnati:'nam', winstonsalem:'nam',
    usopen:'nam', chengdu:'asia', hangzhou:'asia', tokio:'asia', beijing:'asia',
    shanghai:'asia', almaty:'asia', bruselas:'eur', estocolmo:'eur', viena:'eur',
    basilea:'eur', paris:'eur', metz:'eur', atenas:'eur', finals:'eur'
  };

  // Configuracion por categoria: draw, puntos por ronda alcanzada (indice = partidos ganados),
  // corte de entrada (mejor ranking aceptado / peor ranking aceptado)
  TC.CATS = {
    GS:     {draw:128, pts:[10,45,90,180,360,720,1200,2000], minRank:1,   maxRank:110,  color:'#c9a227', label:'Grand Slam'},
    M1000:  {draw:64,  pts:[10,50,100,200,400,650,1000],     minRank:1,   maxRank:85,   color:'#b23b3b', label:'Masters 1000'},
    '500':  {draw:32,  pts:[0,50,100,200,330,500],           minRank:1,   maxRank:80,   color:'#2e6da4', label:'ATP 500'},
    '250':  {draw:32,  pts:[0,25,50,100,165,250],            minRank:1,   maxRank:150,  color:'#3a8f5f', label:'ATP 250'},
    CH125:  {draw:32,  pts:[0,14,25,45,75,125],              minRank:40,  maxRank:450,  idealMin:100, color:'#8a6d3b', label:'Challenger 125'},
    CH75:   {draw:32,  pts:[0,8,14,25,44,75],                minRank:80,  maxRank:800,  idealMin:200, color:'#9c7c4c', label:'Challenger 75'},
    ITF25:  {draw:32,  pts:[0,2,4,8,14,25],                  minRank:300, maxRank:99999,idealMin:350, color:'#6c757d', label:'ITF M25'},
    ITF15:  {draw:32,  pts:[0,1,2,5,9,15],                   minRank:450, maxRank:99999,idealMin:500, color:'#7d868e', label:'ITF M15'},
    FINALS: {draw:8,   pts:null,                             minRank:1,   maxRank:8,    color:'#4b3b8f', label:'ATP Finals'}
  };

  // Superficie tipica de la gira segun el mes (para challengers/futures procedurales)
  TC.SEASON_SURF = {
    1:['hard','hard','clay'], 2:['clay','hard','indoor'], 3:['hard','clay','clay'],
    4:['clay','clay','hard'], 5:['clay','clay','clay'],   6:['grass','clay','hard'],
    7:['clay','hard','clay'], 8:['hard','hard','clay'],   9:['hard','clay','hard'],
    10:['indoor','hard','clay'], 11:['indoor','indoor','clay']
  };
})();
