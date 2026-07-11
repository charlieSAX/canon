import { readFileSync, readdirSync, writeFileSync } from 'node:fs'

const dir = 'public/content/paintings'

const copy = {
  'arnolfini-portrait': {
    titleEs: 'El matrimonio Arnolfini',
    movement: 'early-netherlandish',
    mediumEs: 'Óleo sobre tabla de roble',
    es: {
      scene: 'Un mercader y una mujer se dan la mano en una alcoba de Brujas, rodeados por discretas pruebas de riqueza: naranjas junto a la ventana, una lámpara de latón, ropas forradas de piel y un perro pequeño. Todavía se discute si la escena registra una boda, unos esponsales o algo muy distinto.',
      craft: 'Van Eyck construyó la imagen con finas veladuras de óleo que dejan atravesar la luz y la devuelven; por eso el latón aún brilla y las telas conservan su peso. El espejo convexo del fondo comprime toda la habitación, y también dos figuras diminutas que entran, dentro de un círculo de cristal.',
      painter: 'Pintor de corte de Felipe el Bueno de Borgoña, Van Eyck fue célebre en toda Europa y convirtió el óleo en un instrumento de precisión asombrosa. Firmaba abiertamente cuando muchos pintores de tablas seguían siendo artesanos anónimos. Su lema, Als ich can, declaraba con falsa modestia: tan bien como puedo.',
      point: 'La pintura convierte una habitación privada en un rompecabezas sobre presencia, promesa, riqueza y testimonio.',
      fact: 'Sobre el espejo, con letras adornadas, el pintor escribió directamente en la pared: Johannes de eyck fuit hic 1434. Jan van Eyck estuvo aquí.'
    },
    pointEn: 'The painting turns a private room into a puzzle about presence, promise, wealth and the act of witnessing.',
    notables: [
      ['Only one candle burns in the chandelier, perhaps marking a sacred presence.', 'Solo arde una vela en la lámpara, quizá como señal de una presencia sagrada.'],
      ['The convex mirror contains ten tiny scenes from the Passion around its rim.', 'El marco del espejo convexo contiene diez escenas diminutas de la Pasión.'],
      ['The little dog can suggest fidelity, but it also advertises the couple\'s wealth.', 'El perro puede significar fidelidad, pero también anuncia la riqueza de la pareja.']
    ]
  },
  'garden-of-earthly-delights': {
    titleEs: 'El jardín de las delicias', movement: 'early-netherlandish', mediumEs: 'Óleo sobre tabla de roble, tríptico',
    es: {
      scene: 'De izquierda a derecha: el Edén, donde Dios presenta Eva a Adán; un jardín repleto de multitudes desnudas que montan aves, entran en frutas y nadan con monstruos; después, un infierno negro y ardiente donde los instrumentos torturan y un hombre árbol mira hacia atrás. Nada se ha explicado por completo.',
      craft: 'Bosco pinta cientos de figuras con cuidado de miniaturista y organiza el caos mediante el color: carne pálida dispersa sobre el verde central, luego fuego y hielo en el panel derecho. La forma de tríptico le permite desplegar el tiempo, desde la creación hasta sus consecuencias, como un argumento articulado con bisagras.',
      painter: 'Bosco vivió siempre en la ciudad brabanzona de Bolduque y fue un ciudadano respetado de una cofradía religiosa, no el loco que sugieren sus imágenes. Sus criaturas inventadas lo hicieron famoso. Felipe II lo coleccionó con pasión, por eso el gran tríptico está en Madrid. Se le atribuyen con seguridad unas veinticinco pinturas.',
      point: 'Deseo, abundancia y castigo forman una advertencia cuya clave exacta el pintor se negó a entregar.',
      fact: 'Cerradas, las puertas muestran el mundo en tonos grises de cristal: el globo en el tercer día de la creación, antes de los animales, de las personas y de todo lo que sucede dentro.'
    },
    pointEn: 'Desire, abundance and punishment form a warning whose exact key the painter refused to supply.',
    notables: [
      ['A transparent sphere encloses a couple, as fragile as the pleasure it contains.', 'Una esfera transparente encierra a una pareja, tan frágil como el placer que contiene.'],
      ['The tree-man in Hell carries a tavern inside his hollow body.', 'El hombre árbol del infierno lleva una taberna dentro de su cuerpo hueco.'],
      ['Music turns into punishment: a harp, lute and drum become instruments of torture.', 'La música se vuelve castigo: arpa, laúd y tambor se convierten en instrumentos de tortura.']
    ]
  },
  'girl-with-a-pearl-earring': {
    titleEs: 'La joven de la perla', movement: 'dutch-golden-age', mediumEs: 'Óleo sobre lienzo',
    es: {
      scene: 'Una joven gira por encima del hombro contra un fondo oscuro, con los labios entreabiertos, un turbante azul y dorado y una perla enorme. No hay habitación, mesa, carta ni ninguno de los recursos habituales de Vermeer. Solo el giro de una cabeza y una mirada que todavía no ha terminado.',
      craft: 'Es una tronie, un estudio de tipo y vestimenta, no un retrato encargado; esa libertad permitió a Vermeer simplificarlo todo. El rostro nace de transiciones suaves, casi sin dibujo. La perla son dos pinceladas, un punto brillante y un reflejo del cuello, y el ojo completa lo que falta.',
      painter: 'Vermeer trabajó despacio en Delft, dirigió un negocio de arte, tuvo muchos hijos y dejó quizá tres docenas de cuadros. Respetado en su ciudad, cayó en el olvido durante dos siglos hasta que la crítica francesa lo recuperó. Nadie documentó quién era la joven, y él nunca explicó sus silenciosas escenas domésticas.',
      point: 'Con casi nada, Vermeer convierte un instante de atención compartida en una presencia imposible de abandonar.',
      fact: 'Las imágenes técnicas recientes no encontraron gancho ni aro que sostenga la perla: cuelga de la nada, un fragmento de luz pintada que el ojo insiste en creer.'
    },
    pointEn: 'With almost nothing, Vermeer turns one instant of shared attention into a presence that is hard to leave.',
    notables: [
      ['The pearl has no contour; background and collar define its missing edges.', 'La perla no tiene contorno; el fondo y el cuello definen sus bordes ausentes.'],
      ['The blue of the turban came from costly natural ultramarine made with lapis lazuli.', 'El azul del turbante procede del caro ultramar natural, fabricado con lapislázuli.'],
      ['A green curtain once filled the background, but its pigments have faded almost black.', 'Una cortina verde llenaba el fondo, pero sus pigmentos se han oscurecido casi por completo.']
    ]
  },
  'las-meninas': {
    titleEs: 'Las meninas', movement: 'baroque', mediumEs: 'Óleo sobre lienzo',
    es: {
      scene: 'La infanta Margarita, de cinco años, ocupa el centro de una sala del palacio, atendida por dos meninas, una enana, un niño que molesta a un perro adormilado y una acompañante en la sombra. Velázquez está ante un lienzo enorme, pincel en alto, mirando directamente a quien acaba de entrar.',
      craft: 'El cuadro funciona por alusión. Un espejo al fondo guarda el débil reflejo de los reyes y los coloca, junto contigo, donde deberían estar los modelos. Pinceladas rápidas se convierten en encaje y luz al contemplarlas desde lejos, mientras la puerta abierta del fondo arrastra la mirada hacia el interior.',
      painter: 'Velázquez pasó su carrera en la corte de Felipe IV y ascendió de pintor a aposentador de palacio. Pintó papas, bufones y niños reales con la misma mirada serena. Cuando hizo esta obra buscaba reconocimiento como noble y no solo como artesano; la cruz de Santiago apareció sobre su pecho después.',
      point: 'La obra pregunta quién mira a quién y convierte la pintura, el poder y la presencia en el verdadero tema.',
      fact: 'Los reyes de España aparecen solo como una mancha en el espejo del fondo; toda la escena se organiza alrededor de dos personas que apenas están dentro del cuadro.'
    },
    pointEn: 'The work asks who is looking at whom, making painting, power and presence its real subjects.',
    notables: [
      ['The king and queen appear in the mirror, probably standing where the viewer stands.', 'Los reyes aparecen en el espejo, probablemente de pie en el lugar del espectador.'],
      ['The open door frames the queen\'s chamberlain, caught on a brilliantly lit stair.', 'La puerta enmarca al aposentador de la reina, detenido sobre una escalera luminosa.'],
      ['A boy nudges the mastiff with his foot, the scene\'s smallest burst of action.', 'Un niño empuja al mastín con el pie, el gesto más activo de toda la escena.']
    ]
  },
  'liberty-leading-the-people': {
    titleEs: 'La Libertad guiando al pueblo', movement: 'romanticism', mediumEs: 'Óleo sobre lienzo',
    es: {
      scene: 'Una mujer con el pecho descubierto y gorro frigio avanza sobre una barricada de cadáveres, con la tricolor y un mosquete. La acompañan un niño con pistolas, un obrero con sable y un burgués con sombrero de copa y escopeta. Las torres de Notre Dame asoman entre humo, polvo y movimiento.',
      craft: 'Delacroix funde reportaje y alegoría: hombres muertos pintados desde la morgue comparten lienzo con una Libertad de piel sucia y vello corporal. La pirámide de figuras sube desde los cadáveres hasta la bandera; su rojo, blanco y azul reaparece por toda la paleta. La pincelada permanece suelta, urgente y casi periodística.',
      painter: 'Gran colorista del Romanticismo francés, Delacroix pintó leones, matanzas y Marruecos mientras discutía cortésmente con Ingres y los clasicistas del dibujo. Presenció la Revolución de Julio pero no combatió. Escribió a su hermano que, si no había luchado por la patria, al menos pintaría para ella.',
      point: 'La revolución aparece como una alianza peligrosa entre personas reales y un ideal que exige cuerpos.',
      fact: 'La revolución no es la de 1789, sino la de julio de 1830, tres jornadas que derribaron a Carlos X. El niño de las pistolas alimentó después la figura de Gavroche en Los miserables.'
    },
    pointEn: 'Revolution appears as a dangerous alliance between real people and an ideal that demands bodies.',
    notables: [
      ['Notre Dame fixes the action in Paris, with a tiny tricolour on one tower.', 'Notre Dame sitúa la acción en París, con una tricolor diminuta sobre una torre.'],
      ['Liberty has an ideal profile but visible underarm hair and dirt on her skin.', 'La Libertad tiene perfil ideal, pero también vello en la axila y suciedad en la piel.'],
      ['The fallen man at lower left wears only one sock, a brutally ordinary detail.', 'El caído de la izquierda lleva un solo calcetín, un detalle brutalmente cotidiano.']
    ]
  },
  olympia: {
    titleEs: 'Olimpia', movement: 'realism', mediumEs: 'Óleo sobre lienzo',
    es: {
      scene: 'Una mujer desnuda se reclina sobre sábanas blancas, con una mano firme sobre el muslo, una cinta negra al cuello y una zapatilla colgando. Una criada trae un ramo, probablemente enviado por un cliente; un gato negro se arquea a los pies. Ella te mira sin prisa y sin vergüenza.',
      craft: 'La pose cita la Venus de Urbino de Tiziano, pero Manet elimina sus veladuras melosas: luz frontal y plana, bordes duros, grandes zonas de pintura y una mirada directa en vez del sueño de una diosa. La ofensa no fue tanto la desnudez como la modernidad; todos reconocían su profesión.',
      painter: 'Manet, parisino acomodado que deseaba medallas del Salón y no gloria bohemia, escandalizó una y otra vez a los jurados que cortejaba. Su pintura plana, rápida y urbana abrió el camino al impresionismo, aunque nunca expuso con el grupo. Tras su muerte, sus amigos compraron Olimpia para el Estado francés.',
      point: 'Manet sustituye la Venus disponible para la mirada por una mujer moderna que devuelve esa mirada y controla el encuentro.',
      fact: 'La modelo fue Victorine Meurent, pintora por derecho propio, que más tarde expuso en el mismo Salón que había abucheado su cuerpo en el lienzo de Manet.'
    },
    pointEn: 'Manet replaces a Venus available to the gaze with a modern woman who returns it and controls the encounter.',
    notables: [
      ['The black cat replaces the faithful dog in Titian\'s Venus of Urbino.', 'El gato negro sustituye al perro fiel de la Venus de Urbino de Tiziano.'],
      ['The orchid in Olympia\'s hair carried an openly sexual association for contemporary viewers.', 'La orquídea del cabello de Olimpia tenía una asociación sexual evidente para el público.'],
      ['The bouquet arrives wrapped in paper, like a delivery from a waiting client.', 'El ramo llega envuelto en papel, como un envío de un cliente que espera.']
    ]
  },
  'the-ambassadors': {
    titleEs: 'Los embajadores', movement: 'northern-renaissance', mediumEs: 'Óleo sobre tabla de roble',
    es: {
      scene: 'Dos jóvenes franceses en la corte inglesa, un terrateniente y un obispo, flanquean una mesa cubierta de globos, relojes solares, un laúd y un libro de himnos. Entre ambos, extendida por el suelo, hay una franja gris que se resiste a tomar forma. Los objetos registran incluso las edades de los retratados.',
      craft: 'Holbein pinta piel, terciopelo e instrumentos pulidos con exactitud fría, y después introduce una distorsión deliberada: la franja es una calavera alargada que solo recupera su forma desde el extremo derecho. Una cuerda rota del laúd y un crucifijo casi oculto repiten la advertencia. La técnica se llama anamorfosis.',
      painter: 'Nacido en Augsburgo y formado junto a su padre, Holbein triunfó primero en Basilea y después en Londres, donde fue pintor de Enrique VIII. Sus retratos fijaron los rostros de la corte Tudor con tal autoridad que todavía vemos a esas personas a través de sus ojos. Murió de peste hacia los cuarenta y cinco años.',
      point: 'Conocimiento, riqueza y diplomacia ocupan la escena, pero la muerte atraviesa todo aquello que los hombres dominan.',
      fact: 'Al mirar desde la derecha, casi pegado a la pared, la mancha gris del suelo se convierte en una calavera perfecta; vista de frente permanece ilegible.'
    },
    pointEn: 'Knowledge, wealth and diplomacy command the room, but death cuts across everything the men can master.',
    notables: [
      ['The broken lute string may evoke political and religious discord in Europe.', 'La cuerda rota del laúd puede aludir a la discordia política y religiosa europea.'],
      ['A crucifix peeks from behind the green curtain at the upper left.', 'Un crucifijo asoma detrás de la cortina verde en la esquina superior izquierda.'],
      ['The floor pattern copies the medieval Cosmati pavement in Westminster Abbey.', 'El suelo reproduce el pavimento medieval de estilo cosmatesco de la abadía de Westminster.']
    ]
  },
  'the-kiss': {
    titleEs: 'El beso', movement: 'vienna-secession', mediumEs: 'Óleo y pan de oro sobre lienzo',
    es: {
      scene: 'Al borde de un prado florido, una pareja arrodillada queda envuelta en un único manto de oro. Él se inclina para besarle la mejilla y sostiene su rostro; ella cierra los ojos, rodea la mano de él con los dedos y agarra el borde con los pies. Alrededor solo hay oro oscuro.',
      craft: 'Klimt, hijo de un grabador de oro, aplica auténtico pan de oro y distingue a los amantes solo con ornamentos: rectángulos negros y blancos para él, círculos y flores para ella, fundidos dentro de una silueta. Solo rostros, manos y pies conservan volumen de carne; todo lo demás se vuelve dibujo y superficie.',
      painter: 'Klimt dirigió la Secesión de Viena, cuyos artistas abandonaron el establishment conservador en 1897, y escandalizó la ciudad con dibujos eróticos y retratos dorados. El beso corona su fase dorada, mientras Viena inventaba el psicoanálisis, la música atonal y el diseño moderno. Nunca se casó, explicó poco y apenas salió de la ciudad.',
      point: 'El ornamento borra el mundo y convierte la intimidad de dos cuerpos en un icono público y casi sagrado.',
      fact: 'El Estado austriaco compró El beso en 1908, directamente del caballete y quizá antes de estar terminado, por 25.000 coronas, un precio enorme que resolvió de golpe la discusión sobre Klimt.'
    },
    pointEn: 'Ornament erases the world, turning the intimacy of two bodies into a public and almost sacred icon.',
    notables: [
      ['His rectangular pattern and her circular pattern begin to mingle near their hands.', 'El dibujo rectangular de él y el circular de ella empiezan a mezclarse junto a sus manos.'],
      ['Her bare toes curl over the edge of the flowered ground.', 'Los dedos desnudos de ella se curvan sobre el borde del suelo florido.'],
      ['The gold makes the painting resemble a Byzantine mosaic or religious icon.', 'El oro hace que el cuadro parezca un mosaico bizantino o un icono religioso.']
    ]
  },
  'the-night-watch': {
    titleEs: 'La ronda de noche', movement: 'dutch-golden-age', mediumEs: 'Óleo sobre lienzo',
    es: {
      scene: 'Una milicia cívica de Ámsterdam sale en tropel de un arco. El capitán Frans Banninck Cocq, vestido de negro, ordena marchar junto a su teniente de dorado; alrededor cargan y disparan mosquetes, arranca el tambor y una niña luminosa, con un pollo muerto al cinturón, queda atrapada entre la multitud.',
      craft: 'Los retratos de milicia solían mostrar filas de hombres sentados. Rembrandt ignoró esa norma y lanzó la compañía al movimiento, tallándola con luz teatral. Los dos oficiales y la extraña niña resplandecen mientras los demás negocian la sombra. El cuadro es una historia que se hace pasar por una lista de miembros.',
      painter: 'Hijo de un molinero de Leiden, Rembrandt se convirtió en el retratista más solicitado de Ámsterdam y pintó esta obra en la cima de su éxito, el año en que murió su esposa Saskia. Después cambió el gusto, gastó demasiado y quebró, pero siguió retratándose con una honestidad implacable hasta el final.',
      point: 'Un retrato colectivo se transforma en teatro cívico: identidad, jerarquía y acción capturadas en un instante inventado.',
      fact: 'En 1715 el lienzo fue recortado para caber en una pared del ayuntamiento. Las dos figuras y parte del puente perdidos a la izquierda solo se conocen gracias a una copia anterior.'
    },
    pointEn: 'A group portrait becomes civic theatre: identity, hierarchy and action caught inside one invented instant.',
    notables: [
      ['The captain\'s hand throws a shadow across the lieutenant\'s golden coat.', 'La mano del capitán proyecta su sombra sobre la casaca dorada del teniente.'],
      ['The girl carries a chicken whose claws echo the militia company\'s emblem.', 'La niña lleva un pollo cuyas garras evocan el emblema de la compañía.'],
      ['Despite its nickname, the scene takes place in daylight; dark varnish caused the mistake.', 'Pese al apodo, la escena ocurre de día; un barniz oscurecido provocó el error.']
    ]
  },
  'wanderer-above-the-sea-of-fog': {
    titleEs: 'Caminante sobre el mar de nubes', movement: 'romanticism', mediumEs: 'Óleo sobre lienzo',
    es: {
      scene: 'Un hombre con abrigo verde oscuro está de pie sobre una roca, de espaldas, con el pelo movido por el viento, y contempla un valle ahogado en niebla. Crestas y peñascos emergen del blanco como islas. Ha subido hasta allí; el cuadro muestra lo que la ascensión le ha concedido.',
      craft: 'La espalda vuelta es el recurso decisivo. Al negarte su rostro, entras en sus botas y el paisaje se convierte en experiencia, no en exhibición. Friedrich reunió formaciones rocosas de bocetos distintos, por lo que la montaña solo existe en la pintura. El horizonte alto deja que la niebla haga el trabajo.',
      painter: 'Friedrich, nacido en la costa báltica, dio al paisaje el peso que perdía la pintura religiosa: niebla, ruinas, árboles invernales y figuras solas como instrumentos del anhelo. Durante un tiempo fue célebre, después murió pobre y olvidado. Un siglo más tarde regresó como la voz esencial del Romanticismo alemán.',
      point: 'La conquista de la cima se vuelve incertidumbre: contemplar el mundo también significa enfrentarse a lo que no puede verse.',
      fact: 'La vista desde la cima es una ficción. Friedrich dibujó rocas en distintos lugares de las montañas de arenisca del Elba y las apiló para crear una montaña inexistente.'
    },
    pointEn: 'The conquered summit becomes uncertainty: looking over the world also means confronting what cannot be seen.',
    notables: [
      ['The figure is a Rückenfigur, a back-turned person who invites the viewer inside the scene.', 'La figura es un Rückenfigur, un personaje de espaldas que invita al espectador a entrar.'],
      ['Several rock formations come from different real sites in Saxony and Bohemia.', 'Varias formaciones rocosas proceden de lugares distintos de Sajonia y Bohemia.'],
      ['The walking stick marks a recent climb, while the polished coat resists easy realism.', 'El bastón indica una subida reciente, mientras el abrigo impecable evita un realismo sencillo.']
    ]
  }
}

for (const file of readdirSync(dir).filter((name) => name.endsWith('.json'))) {
  const path = `${dir}/${file}`
  const painting = JSON.parse(readFileSync(path, 'utf8'))
  if (painting.text?.en) continue
  const c = copy[painting.id]
  if (!c) throw new Error(`Missing v2 copy for ${painting.id}`)
  const migrated = {
    ...painting,
    title: { en: painting.title, es: c.titleEs },
    movement: c.movement,
    medium: { en: painting.medium, es: c.mediumEs },
    text: {
      en: { ...painting.text, point: c.pointEn },
      es: { scene: c.es.scene, craft: c.es.craft, painter: c.es.painter, point: c.es.point }
    },
    notables: c.notables.map(([en, es]) => ({ en, es })),
    fact: { en: painting.fact, es: c.es.fact },
    draft: false,
    tags: [c.movement, ...painting.tags.slice(1)]
  }
  writeFileSync(path, `${JSON.stringify(migrated, null, 2)}\n`)
}
