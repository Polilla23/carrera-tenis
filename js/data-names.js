// Generador de nombres ficticios para completar el circuito (challengers, futures, juveniles)
var TC = (typeof TC !== 'undefined') ? TC : {};
(function(){
  var POOLS = {
    latam: {
      cc: ['ARG','ARG','BRA','CHI','COL','URU','PER','ECU','BOL','PAR','MEX'],
      first: ['Juan','Santiago','Mateo','Facundo','Tomas','Franco','Nicolas','Agustin','Lucas','Joaquin','Bruno','Thiago','Felipe','Diego','Gonzalo','Ignacio','Marcelo','Rodrigo','Sebastian','Emiliano','Valentin','Camilo','Andres','Pablo','Hernan'],
      last: ['Gomez','Fernandez','Rodriguez','Lopez','Diaz','Martinez','Perez','Sosa','Romero','Alvarez','Torres','Ruiz','Ramirez','Flores','Acosta','Medina','Herrera','Aguirre','Pereyra','Molina','Ortiz','Silva','Rojas','Castro','Vega','Cabrera','Ponce','Villalba','Ferreyra','Quiroga']
    },
    euro: {
      cc: ['ESP','ESP','FRA','FRA','ITA','ITA','GER','SUI','AUT','BEL','HOL','POR','SWE','NOR','DEN','FIN','GBR','IRL'],
      first: ['Pau','Marc','Alex','Hugo','Theo','Louis','Antoine','Matteo','Lorenzo','Luca','Giulio','Jonas','Felix','Maximilian','Lukas','David','Martin','Erik','Oscar','Henrik','Oliver','Jack','Harry','Tiago','Joao','Rafael','Adrian','Julien','Nils','Emil'],
      last: ['Garcia','Moreno','Navarro','Dupont','Moreau','Lefevre','Rossi','Ricci','Colombo','Ferrari','Weber','Fischer','Wagner','Keller','Huber','Jansen','De Vries','Silva','Costa','Larsson','Berg','Nilsson','Hansen','Virtanen','Smith','Taylor','Clarke','Walsh','Meyer','Roux']
    },
    esteuro: {
      cc: ['SRB','CRO','RUS','RUS','CZE','SLQ','POL','UCR','RUM','BUL','HUN','GRE','LTU','LET','EST','GEO','KAZ'],
      first: ['Nikola','Marko','Ivan','Dmitri','Andrei','Sergei','Mikhail','Pavel','Jan','Tomas','Petr','Jakub','Piotr','Andriy','Stefan','Viktor','Aleksandar','Milos','Vladimir','Georgi','Levan','Timur','Artem','Bogdan','Matej'],
      last: ['Petrovic','Jovanovic','Kovac','Horvat','Ivanov','Petrov','Volkov','Sokolov','Novak','Dvorak','Svoboda','Kowalski','Nowak','Shevchenko','Popescu','Dimitrov','Nagy','Papadopoulos','Kazlauskas','Ozolins','Tamm','Beridze','Nurlanov','Kuznetsov','Moroz']
    },
    anglo: {
      cc: ['USA','USA','USA','AUS','AUS','CAN','GBR','SUD','NZL'],
      first: ['Tyler','Brandon','Austin','Connor','Dylan','Ethan','Mason','Logan','Ryan','Cody','Blake','Chase','Jordan','Trevor','Kyle','Liam','Noah','Aiden','Cooper','Hunter','Jake','Sam','Ben','Max','Charlie'],
      last: ['Johnson','Williams','Brown','Jones','Miller','Davis','Wilson','Anderson','Thomas','Moore','Martin','Thompson','White','Harris','Clark','Lewis','Walker','Hall','Young','King','Wright','Scott','Baker','Adams','Mitchell']
    },
    asia: {
      cc: ['JPN','JPN','CHN','KOR','IND','TPE','THA','INA'],
      first: ['Kei','Yuki','Taro','Hiroki','Shintaro','Kaito','Ren','Sota','Wei','Cheng','Hao','Jun','Min-ho','Ji-sung','Rohan','Arjun','Rahul','Somchai','Adi','Yosuke'],
      last: ['Tanaka','Suzuki','Watanabe','Ito','Yamamoto','Nakamura','Kobayashi','Kato','Wang','Li','Zhang','Chen','Liu','Kim','Park','Lee','Sharma','Patel','Singh','Wongsawat']
    }
  };
  var REGIONS = ['latam','euro','euro','esteuro','anglo','asia'];
  TC.genName = function(rng){
    var pool = POOLS[REGIONS[Math.floor(rng()*REGIONS.length)]];
    var f = pool.first[Math.floor(rng()*pool.first.length)];
    var l = pool.last[Math.floor(rng()*pool.last.length)];
    var c = pool.cc[Math.floor(rng()*pool.cc.length)];
    return {name: l + ', ' + f, country: c};
  };

  // Nombre plausible para un pais concreto (para regens que heredan nacionalidad)
  TC.genNameFor = function(country, rng){
    var poolKey = null;
    for(var k in POOLS){
      if(POOLS[k].cc.indexOf(country) >= 0){ poolKey = k; break; }
    }
    var pool = POOLS[poolKey] || POOLS[REGIONS[Math.floor(rng()*REGIONS.length)]];
    var f = pool.first[Math.floor(rng()*pool.first.length)];
    var l = pool.last[Math.floor(rng()*pool.last.length)];
    return {name: l + ', ' + f, country: country};
  };
  TC.COUNTRIES = ['ARG','BRA','CHI','URU','COL','MEX','ESP','FRA','ITA','GER','SUI','AUT','GBR','USA','CAN','AUS','SRB','CRO','RUS','CZE','POL','JPN','CHN','KOR','IND','SUD','HOL','BEL','POR','SWE'];
  // Ciudades para challengers/futures procedurales (con su region alineada)
  TC.CH_CITIES = ['Tigre','Rosario','Cordoba','Sao Paulo','Campinas','Santiago','Lima','Bogota','Guayaquil','Salzburgo','Praga','Brno','Szczecin','Sevilla','Murcia','Girona','Oeiras','Braga','Pau','Lyon','Aix-en-Provence','Biella','Trieste','Verona','Heilbronn','Ismaning','Lugano','Ortisei','Sarajevo','Banja Luka','Bucarest','Iasi','Kiev','Astana','Pune','Chennai','Yokohama','Kobe','Taipei','Busan','Guangzhou','Shenzhen','Cary','Champaign','Tiburon','Knoxville','Charlottesville','Puerto Vallarta','Monterrey','Canberra','Burnie','Playford','Nottingham','Ilkley','Surbiton'];
  TC.CH_REGIONS = ['sam','sam','sam','sam','sam','sam','sam','sam','sam','eur','eur','eur','eur','eur','eur','eur','eur','eur','eur','eur','eur','eur','eur','eur','eur','eur','eur','eur','eur','eur','eur','eur','eur','asia','asia','asia','asia','asia','asia','asia','asia','asia','nam','nam','nam','nam','nam','nam','nam','oce','oce','oce','eur','eur','eur'];
  TC.ITF_CITIES = ['Villa Maria','Junin','Bauru','Temuco','Cochabamba','Asuncion','Manacor','Antalya','Monastir','Sharm El Sheikh','Kazan','Vilnius','Tallin','Oslo','Helsinki','Jakarta','Nonthaburi','Cancun','Santo Domingo','Naples FL','Orange Park','Edmonton','Traralgon','Mildura','Hua Hin','Colombo','Nairobi','Tunez','Rabat','Luanda'];
  TC.ITF_REGIONS = ['sam','sam','sam','sam','sam','sam','eur','eur','afr','afr','eur','eur','eur','eur','eur','asia','asia','nam','nam','nam','nam','nam','oce','oce','asia','asia','afr','afr','afr','afr'];
})();
