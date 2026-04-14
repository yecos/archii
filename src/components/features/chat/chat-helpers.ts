/* ===== Shared constants and helpers for chat sub-components ===== */

/* EMOJI SEARCH MAP — emoji → searchable keywords (Spanish + English) */
const _emojiMap: Record<string, string[]> = {
  // Smileys
  '😀':['cara','feliz','sonrisa','smile','face'],'😃':['cara','feliz','smile'],'😄':['cara','feliz','ojo','smile'],'😁':['cara','feliz','smile','grin'],'😅':['cara','sudor','awkward','jaja'],'🤣':['risa','llorar','rodar','rofl','lol'],'😂':['risa','lagrima','joy','lol'],'🙂':['cara','ligera','slight'],'😊':['cara','feliz','sonrisa','blush'],'😇':['cara','angel','halo','innocent'],'🥰':['cara','amor','corazon','hearts','adore'],'😍':['cara','ojos','corazon','love','heart eyes'],'🤩':['cara','estrellas','wow','star','excited'],'😘':['beso','corazon','kiss'],'😗':['beso','kiss'],'😚':['beso','kiss'],'😙':['beso','kiss'],'🥲':['cara','triste','sonrisa','sad smile'],'😋':['delicioso','lengua','yum','yummy','tasty'],'😛':['lengua','tongue'],'😜':['guiño','lengua','wink','tongue'],'🤪':['loco','loco','crazy','zany'],'😝':['lengua','ojos','squint'],'🤑':['dinero','money','rich'],'🤗':['abrazo','hug','cariño'],'🤭':['risa','tapar','giggle','shy'],'🤫':['silencio','secreto','quiet','secret','shh'],'🤔':['pensar','duda','think','hmm'],'🫡':['saludo','militar','salute'],'🤐':['cerrar','boca','zip','shut'],'🤨':['ceja','sospecha','skeptical','raised eyebrow'],'😐':['neutral','indiferente','meh'],'😑':['neutral','vacio','blank'],'😶':['silencio','mudo','silent','mute'],'🫥':['invisible','oculto','hidden'],'😏':['sonrisa','sarcasmo','smirk'],'😒':['desinteres','unamused','meh'],'🙄':['ojo','rodar','eye roll','whatever'],'😬':['dolor','grimace','awkward','cringe'],'🤥':['nariz','menta','pinocchio','liar'],'😌':['alivio','relajado','relieved','peace'],'😔':['triste','deprimido','sad','pensive'],'😪':['dormir','sleepy','asleep'],'🤤':['baba','drool','hungry'],'😴':['dormir','zzz','sleep','dormir'],'😷':['enfermo','mascarilla','mask','sick','covid'],'🤒':['termometro','fiebre','thermometer','sick'],'🤕':['curita','dolor','bandage','hurt','headache'],'🤢':['verde','nausea','nausea','sick'],'🤮':['vomito','puke','sick'],'🥵':['caliente','hot','heat','sweat'],'🥶':['frio','cold','freeze','ice'],'🥴':['mareado','dizzy','woozy'],'😵':['mareado','dizzy','knockout'],'🤯':['mente','explotar','mind blown','explosion','wow'],'🤠':['vaquero','cowboy','hat'],'🥳':['fiesta','celebrar','party','celebrate','birthday'],'🥸':['disfraz','disguise','incognito'],'😎':['cool','gafas','sunglasses'],'🤓':['nerd','estudioso','glasses','smart','geek'],'🧐':['lupa','monoculo','inspect','investigate'],
  // Gestos
  '👋':['hola','mano','hello','hi','wave'],'🤚':['mano','levantada','raised hand','stop'],'🖐️':['mano','five','high five'],'✋':['mano','alto','stop','high five'],'🖖':['saludo','vulcano','spock','greet'],'👌':['ok','perfecto','perfect','okay'],'🤌':['italia','pizza','pinch','italian'],'🤏':['poco','small','pinch','little'],'✌️':['paz','victoria','peace','victory','two'],'🤞':['cruz','suerte','luck','cross','fingers'],'🤟':['te amo','love you','rock'],'🤘':['rock','metal','heavy'],'🤙':['llamar','telefono','call','phone','hang loose'],'👈':['izquierda','left','point'],'👉':['derecha','right','point'],'👆':['arriba','up','point','above'],'👇':['abajo','down','point','below'],'☝️':['uno','uno','one','point up'],'👍':['ok','bien','like','good','thumbs up','si'],'👎':['no','mal','dislike','bad','thumbs down','no'],'✊':['puño','fist','fight','power'],'👊':['puño','golpe','punch','fist bump'],'🤛':['puño','izquierda','left fist'],'🤜':['puño','derecha','right fist'],'👏':['aplauso','bravo','clap','applause'],'🙌':['celebrar','juntas','celebrate','hands','yay'],'🫶':['amor','corazon','heart','love','fingers'],'👐':['manos','abiertas','open hands'],'🤲':['manos','rezar','pray','give','hands'],'🤝':['apreton','mano','handshake','deal','acuerdo'],'🙏':['rezar','por favor','gracias','please','thank you','pray'],
  // Corazones
  '❤️':['amor','corazon','rojo','love','heart','red'],'🧡':['amor','naranja','orange'],'💛':['amor','amarillo','yellow'],'💚':['amor','verde','green'],'💙':['amor','azul','blue'],'💜':['amor','violeta','purple'],'🖤':['amor','negro','black','dark'],'🤍':['amor','blanco','white'],'🤎':['amor','cafe','brown'],'💔':['roto','romper','broken','sad'],'❤️‍🔥':['corazon','fuego','fire','passion'],'❤️‍🩹':['corazon','curar','healing','recover'],'❣️':['corazon','exclamar','heart','exclamation'],'💕':['dos','corazones','two hearts'],'💞':['corazones','girar','revolving hearts'],'💓':['corazon','latir','beating heart'],'💗':['corazon','crecer','growing heart'],'💖':['corazones','brillante','sparkling hearts'],'💘':['corazon','flecha','cupid','arrow'],'💝':['corazon','lazo','ribbon','gift'],
  // Construcción
  '🏗️':['construccion','obra','construction','building'],'🏠':['casa','home','house'],'🏢':['edificio','oficina','office','building'],'📐':['regla','triangulo','triangle','ruler','measure'],'🔧':['llave','herramienta','wrench','tool','fix'],'🔨':['martillo','hammer','build'],'⚒️':['martillo','herramienta','hammer','tool'],'🪛':['destornillador','screwdriver','tool'],'⛏️':['pala','pico','pickaxe','dig','mine'],'🪚':['sierra','saw','cortar','cut'],'🔩':['tornillo','perno','bolt','nut'],'⚙️':['engranaje','configurar','gear','settings','configure'],'🧱':['ladrillo','brick','wall','muro'],'🪨':['piedra','roca','rock','stone'],'🪵':['madera','tronco','wood','log'],'🛖':['choza','cabaña','hut','cabin'],'🏘️':['casas','vecindario','houses','neighborhood'],'🏚️':['casa','abandonada','abandoned','ruin'],'🚧':['construccion','obra','precaucion','warning','construction'],
  // Naturaleza
  '🌳':['arbol','tree'],'🌲':['arbol','pino','pine','tree'],'🌴':['palmera','palm','tropical','beach'],'🌵':['cactus','desierto','desert'],'🌱':['brote','plantar','sprout','plant','new'],'🌿':['hoja','verde','leaf','green','nature'],'☘️':['trebol','shamrock','lucky'],'🍀':['trebol','suerte','four leaf','lucky'],'🍁':['hoja','maple','otono','autumn','fall'],'🍂':['hoja','otono','fallen leaf','autumn'],'🍃':['hoja','viento','wind','leaf'],'🍄':['hongo','seta','mushroom'],'🌾':['arroz','trigo','wheat','rice','harvest'],'💐':['ramo','flores','bouquet','flowers'],'🌷':['tulipan','tulip','flower'],'🌹':['rosa','rose','flower'],'🥀':['flor','marchita','wilted','dead flower'],'🌺':['hibisco','hibiscus','flower','tropical'],'🌸':['cerezo','sakura','cherry blossom','spring'],'🌼':['flor','margarita','flower'],'🌻':['girasol','sunflower','sun'],'🌞':['sol','sun','sunny','solar'],'🌙':['luna','moon','lunar','night'],'⭐':['estrella','star','favorito','favorite'],'🌈':['arcoiris','rainbow','color','colorful'],'💧':['gota','agua','water','drop','rain'],'🔥':['fuego','hot','fire','lit','trending'],'🌊':['ola','mar','ocean','wave','sea'],'❄️':['nieve','snow','cold','ice','winter'],'⚡':['rayo','trueno','electricidad','lightning','electric','energy'],
  // Comida
  '🍕':['pizza'],'🍔':['hamburguesa','burger','hamburgesa'],'🌭':['perro','caliente','hotdog','hot dog'],'🍟':['papas','fritas','french fries'],'🍿':['palomitas','popcorn','cine','movie'],'🧂':['sal','salt'],'🥨':['pretzel'],'🥯':['pan','bagel','bread'],'🍞':['pan','bread','toast'],'🥐':['croissant'],'🥖':['baguette','pan','bread'],'🧀':['queso','cheese'],'🥚':['huevo','egg'],'🍳':['huevo','frito','fried egg','cooking'],'🥞':['pancakes','hotcakes'],'🧇':['waffle'],'🥓':['tocino','bacon'],'🥩':['carne','steak','meat'],'🍗':['pollo','chicken','drumstick'],'🍖':['carne','meat','bone','ribs'],'🌮':['taco','mexicano'],'🌯':['burrito','wrap'],'🥙':['pita','gyros','shawarma'],'🧆':['falafel'],'🥗':['ensalada','salad','healthy','verde'],'🥘':['guiso','stew','cazuela'],'🍝':['pasta','espagueti','spaghetti','fideo'],'🍜':['sopa','ramen','noodles','fideos'],'🍲':['sopa','soup','caldo','hot pot'],'🍛':['curry','arroz','spicy'],'🍣':['sushi','roll','japones','japanese'],'🍱':['bento','japones','japanese','lunch'],
  // Objetos
  '💡':['idea','lampara','lightbulb','idea','bright','think'],'📱':['telefono','celular','phone','mobile','cell'],'💻':['computador','laptop','computer','pc'],'⌨️':['teclado','keyboard'],'🖥️':['pantalla','monitor','desktop','screen','computer'],'🖨️':['imprimir','impresora','printer','print'],'📷':['foto','camara','foto','camera','photo'],'📹':['video','camara','camcorder','video camera'],'🎥':['pelicula','cine','movie','film','cinema'],'📞':['telefono','call','phone'],'☎️':['telefono','phone','retro'],'📺':['television','tv','tele'],'📻':['radio','podcast'],'🎙️':['microfono','microphone','podcast','record'],'⏰':['alarma','reloj','alarm','clock','time','hora'],'📅':['calendario','date','calendario','schedule'],'📎':['clip','attach','attachment'],'📌':['pin','marcador','marker','pin','bookmark'],'✂️':['tijeras','cut','scissors','cortar'],'📁':['carpeta','folder','archivo','file'],'📂':['carpeta','folder','open'],'📊':['grafico','chart','bars','estadisticas','statistics'],'📈':['grafico','crecer','chart','growth','trend','up'],'📋':['lista','clipboard','checklist','task','tasks'],'📝':['notas','memo','notes','write','escribir'],'✏️':['lapiz','pencil','write','escribir'],'🖊️':['pluma','lapiz','pen','write'],'🔖':['marcador','bookmark','tag','etiqueta'],'💰':['dinero','money','cash','pagar','pay'],'💎':['diamante','gem','diamond','precioso','jewel'],'🔑':['llave','key','abrir','open','door'],'🔒':['candado','lock','cerrar','seguro','security','secure'],
  // Banderas
  '🇨🇴':['colombia','co'],'🇺🇸':['estados unidos','usa','eeuu','united states'],'🇪🇸':['españa','spain','espana'],'🇲🇽':['mexico','mx'],'🇦🇷':['argentina','ar'],'🇧🇷':['brasil','brazil','br'],'🇨🇱':['chile','cl'],'🇵🇪':['peru','pe'],'🇪🇨':['ecuador','ec'],'🇻🇪':['venezuela','ve'],'🇺🇾':['uruguay','uy'],'🇵🇾':['paraguay','py'],'🇧🇴':['bolivia','bo'],'🇵🇦':['panama','pa'],'🇨🇷':['costa rica','cr'],'🇬🇹':['guatemala','gt'],'🏳️':['bandera','blanca','white flag','peace','paz'],'🏴':['bandera','black flag','pirate'],'🏴‍☠️':['pirata','skull','crossbones','pirate'],
  // Extras (Frecuentes & Rápidos)
  '💯':['cien','perfecto','100','hundred','score','perfect'],'✅':['check','verde','ok','done','correcto','listo','aprobado'],'❌':['error','no','mal','wrong','cancel','fail','incorrecto'],'👀':['ojos','ver','mirar','eyes','look','see'],'💪':['fuerte','brazo','musculo','strong','arm','muscle','gym'],'✨':['brillo','estrella','sparkle','brillante','magic','new'],
};

/* Pre-computed search index: emoji → lowercase keywords string for fast matching */
const _emojiSearchIndex = new Map<string, string>();
for (const [emoji, keywords] of Object.entries(_emojiMap)) {
  _emojiSearchIndex.set(emoji, keywords.join(' '));
}

/** Search emojis by text query (supports Spanish & English keywords) */
export function searchEmojis(query: string): string[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const results: string[] = [];
  const seen = new Set<string>();
  for (const [emoji, keywords] of _emojiSearchIndex) {
    if (keywords.includes(q) && !seen.has(emoji)) {
      results.push(emoji);
      seen.add(emoji);
    }
  }
  return results;
}

/* EMOJI DATA */
export const EMOJI_CATEGORIES = [
  { name: 'Frecuentes', icon: '🕐', emojis: ['👍','❤️','😂','🔥','😮','😢','🙏','🎉','💯','✅','❌','👀','💪','🤝','✨'] },
  { name: 'Smileys', icon: '😀', emojis: ['😀','😃','😄','😁','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐'] },
  { name: 'Gestos', icon: '👋', emojis: ['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏'] },
  { name: 'Corazones', icon: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝'] },
  { name: 'Construcción', icon: '🏗️', emojis: ['🏗️','🏠','🏢','📐','🔧','🔨','⚒️','🪛','⛏️','🪚','🔩','⚙️','🧱','🪨','🪵','🛖','🏘️','🏚️','🚧'] },
  { name: 'Naturaleza', icon: '🌿', emojis: ['🌳','🌲','🌴','🌵','🌱','🌿','☘️','🍀','🍁','🍂','🍃','🍄','🌾','💐','🌷','🌹','🥀','🌺','🌸','🌼','🌻','🌞','🌙','⭐','🌈','💧','🔥','🌊','❄️','⚡'] },
  { name: 'Comida', icon: '🍕', emojis: ['🍕','🍔','🍟','🌭','🍿','🧂','🥨','🥯','🍞','🥐','🥖','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌮','🌯','🥙','🧆','🥗','🥘','🍝','🍜','🍲','🍛','🍣','🍱'] },
  { name: 'Objetos', icon: '💡', emojis: ['💡','📱','💻','⌨️','🖥️','🖨️','📷','📹','🎥','📞','☎️','📺','📻','🎙️','⏰','📅','📎','📌','✂️','📁','📂','📊','📈','📋','📝','✏️','🖊️','🔖','💰','💎','🔑','🔒'] },
  { name: 'Banderas', icon: '🇨🇴', emojis: ['🇨🇴','🇺🇸','🇪🇸','🇲🇽','🇦🇷','🇧🇷','🇨🇱','🇵🇪','🇪🇨','🇻🇪','🇺🇾','🇵🇾','🇧🇴','🇵🇦','🇨🇷','🇬🇹','🏳️','🏴','🏴‍☠️'] },
];

/* REACTION QUICK PICKS */
export const QUICK_REACTIONS = ['👍','❤️','😂','😮','😢','🔥','🙏','🎉'];

/* DATE FORMATTER */
export const formatDateLabel = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = today.getTime() - msgDay.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][date.getDay()];
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
};

/* AVATAR COLOR */
export const getAvatarHSL = (uid: string) => {
  let h = 0;
  for (let i = 0; i < (uid || '').length; i++) h = uid.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 55%, 45%)`;
};
