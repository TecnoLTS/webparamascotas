export type SeoGuide = {
  slug: string
  title: string
  description: string
  h1: string
  updatedAt: string
  readingTime: string
  audience: string
  intro: string
  sections: Array<{ heading: string; body: string }>
  relatedLinks: Array<{ label: string; href: string }>
}

export const SEO_GUIDES: SeoGuide[] = [
  {
    slug: 'mejor-alimento-para-perros-adultos',
    title: 'Mejor alimento para perros adultos en Ecuador',
    description: 'Guia para elegir alimento para perros adultos por tamano, actividad, marca y presentacion disponible en Ecuador.',
    h1: 'Como elegir alimento para perros adultos',
    updatedAt: '2026-05-06',
    readingTime: '4 min',
    audience: 'Perros adultos',
    intro: 'Un perro adulto necesita energia estable, buena digestion y una formula adecuada a su tamano y rutina diaria.',
    sections: [
      {
        heading: 'Empieza por tamano y actividad',
        body: 'Los perros pequenos suelen necesitar croquetas y porciones distintas a las de razas medianas o grandes. Si tu perro camina mucho o es muy activo, revisa formulas con energia suficiente.',
      },
      {
        heading: 'Revisa marca, etapa y presentacion',
        body: 'Busca alimento marcado para adulto y compara presentaciones segun frecuencia de compra. Marcas como Dog Chow, Pro-Can, NutraPro, Avant, Cani o Wellness pueden aparecer segun stock.',
      },
      {
        heading: 'Haz cambios graduales',
        body: 'Cuando cambies de alimento, mezcla el anterior y el nuevo durante varios dias para reducir molestias digestivas.',
      },
    ],
    relatedLinks: [
      { label: 'Comprar alimento para perros', href: '/tienda/alimento-perros' },
      { label: 'Ver todo el alimento', href: '/tienda/alimento' },
    ],
  },
  {
    slug: 'alimento-para-cachorros-guia',
    title: 'Alimento para cachorros: guia de compra en Ecuador',
    description: 'Consejos para comprar alimento para cachorros en Ecuador y elegir opciones por raza, tamano y etapa.',
    h1: 'Alimento para cachorros: que revisar antes de comprar',
    updatedAt: '2026-05-06',
    readingTime: '4 min',
    audience: 'Cachorros',
    intro: 'Los cachorros estan en crecimiento y necesitan formulas especificas para su etapa, no solo una porcion menor de alimento adulto.',
    sections: [
      {
        heading: 'Busca formulas para cachorro',
        body: 'La etiqueta debe indicar cachorro o puppy. Tambien conviene revisar si la formula esta pensada para razas pequenas, medianas o grandes.',
      },
      {
        heading: 'Compra presentaciones que puedas almacenar bien',
        body: 'El alimento debe mantenerse cerrado, seco y lejos del calor. Una presentacion adecuada evita perdida de frescura.',
      },
      {
        heading: 'Consulta si hay sensibilidad digestiva',
        body: 'Si el cachorro presenta diarrea, vomito o rechazo persistente, consulta con un veterinario antes de insistir con el mismo alimento.',
      },
    ],
    relatedLinks: [
      { label: 'Alimento para perros', href: '/tienda/alimento-perros' },
      { label: 'Comida humeda para perros', href: '/tienda/comida-humeda-perros' },
    ],
  },
  {
    slug: 'alimento-para-gatos-adultos',
    title: 'Alimento para gatos adultos en Ecuador',
    description: 'Como elegir alimento para gatos adultos, comida seca, humeda y snacks segun rutina y preferencia.',
    h1: 'Como elegir alimento para gatos adultos',
    updatedAt: '2026-05-06',
    readingTime: '4 min',
    audience: 'Gatos adultos',
    intro: 'Los gatos adultos necesitan una dieta que apoye energia, pelaje, hidratacion y una rutina estable de comidas.',
    sections: [
      {
        heading: 'Identifica etapa y preferencia',
        body: 'Elige productos para gato adulto y observa si prefiere alimento seco, humedo o una combinacion de ambos.',
      },
      {
        heading: 'Alterna sin improvisar',
        body: 'La comida humeda puede aportar variedad e hidratacion, pero conviene mantener porciones coherentes y no duplicar calorias.',
      },
      {
        heading: 'Compara marcas y sabores',
        body: 'Cat Chow, Pro-Cat, Purina, Felix o NutraPro pueden estar disponibles segun stock. Revisa sabor, peso y precio por presentacion.',
      },
    ],
    relatedLinks: [
      { label: 'Alimento para gatos', href: '/tienda/alimento-gatos' },
      { label: 'Comida humeda para gatos', href: '/tienda/comida-humeda-gatos' },
    ],
  },
  {
    slug: 'alimento-para-gatitos',
    title: 'Alimento para gatitos en Ecuador',
    description: 'Guia rapida para comprar alimento para gatitos y elegir productos de crecimiento con stock en Ecuador.',
    h1: 'Alimento para gatitos: guia rapida',
    updatedAt: '2026-05-06',
    readingTime: '3 min',
    audience: 'Gatitos',
    intro: 'Un gatito necesita alimento formulado para crecimiento, con porciones pequenas y cambios graduales.',
    sections: [
      {
        heading: 'Compra por etapa',
        body: 'Busca productos que indiquen gatito o kitten. No todos los alimentos para gato adulto cubren necesidades de crecimiento.',
      },
      {
        heading: 'Cuida la transicion',
        body: 'Introduce alimento nuevo poco a poco y observa apetito, energia y digestion durante los primeros dias.',
      },
      {
        heading: 'Elige presentaciones practicas',
        body: 'Las presentaciones pequenas ayudan a probar tolerancia antes de comprar formatos grandes.',
      },
    ],
    relatedLinks: [
      { label: 'Alimento para gatos', href: '/tienda/alimento-gatos' },
      { label: 'Productos para gatos', href: '/tienda/gatos' },
    ],
  },
  {
    slug: 'comida-humeda-para-perros-beneficios',
    title: 'Comida humeda para perros: beneficios y compra online',
    description: 'Cuando usar comida humeda para perros, como combinarla con alimento seco y donde comprar en Ecuador.',
    h1: 'Comida humeda para perros: cuando conviene',
    updatedAt: '2026-05-06',
    readingTime: '4 min',
    audience: 'Perros',
    intro: 'La comida humeda puede ser util para aportar variedad, mejorar palatabilidad o complementar la dieta de tu perro.',
    sections: [
      {
        heading: 'Ideal para variedad',
        body: 'Muchos perros aceptan mejor sabores humedos como pollo, carne, cordero o salmon. Es util cuando buscas estimular apetito.',
      },
      {
        heading: 'Controla la porcion total',
        body: 'Si combinas alimento seco y humedo, ajusta cantidades para evitar exceso de calorias.',
      },
      {
        heading: 'Revisa etapa y especie',
        body: 'Elige comida humeda para perros adultos o cachorros segun corresponda. No uses productos de gato para perro ni al reves.',
      },
    ],
    relatedLinks: [
      { label: 'Comida humeda para perros', href: '/tienda/comida-humeda-perros' },
      { label: 'Alimento para perros', href: '/tienda/alimento-perros' },
    ],
  },
  {
    slug: 'comida-humeda-para-gatos-beneficios',
    title: 'Comida humeda para gatos: guia de compra',
    description: 'Beneficios de la comida humeda para gatos, sabores frecuentes y compra online en Ecuador.',
    h1: 'Comida humeda para gatos: que tener en cuenta',
    updatedAt: '2026-05-06',
    readingTime: '4 min',
    audience: 'Gatos',
    intro: 'La comida humeda para gatos ayuda a sumar variedad y puede apoyar la hidratacion dentro de una dieta equilibrada.',
    sections: [
      {
        heading: 'Revisa sabor y textura',
        body: 'Los gatos pueden ser selectivos. Atun, salmon, pescado blanco, pollo o pavo son sabores comunes segun disponibilidad.',
      },
      {
        heading: 'Combina con alimento seco',
        body: 'Puedes combinar alimento seco y humedo manteniendo porciones adecuadas para peso y edad.',
      },
      {
        heading: 'Compra segun stock real',
        body: 'Verifica disponibilidad en la ficha antes de finalizar la compra, especialmente si tu gato acepta pocos sabores.',
      },
    ],
    relatedLinks: [
      { label: 'Comida humeda para gatos', href: '/tienda/comida-humeda-gatos' },
      { label: 'Alimento para gatos', href: '/tienda/alimento-gatos' },
    ],
  },
  {
    slug: 'snacks-para-gatos-como-elegir',
    title: 'Snacks para gatos: como elegir premios',
    description: 'Consejos para elegir snacks para gatos y usarlos como premios sin afectar la alimentacion principal.',
    h1: 'Snacks para gatos: premios con moderacion',
    updatedAt: '2026-05-06',
    readingTime: '3 min',
    audience: 'Gatos',
    intro: 'Los snacks para gatos funcionan mejor como premio ocasional, no como reemplazo del alimento completo.',
    sections: [
      {
        heading: 'Usalos para reforzar rutinas',
        body: 'Un snack puede ayudar en juegos, entrenamiento suave o momentos de vinculo con tu gato.',
      },
      {
        heading: 'Mira ingredientes y porcion',
        body: 'Respeta la cantidad recomendada y evita abusar de premios, sobre todo en gatos sedentarios.',
      },
      {
        heading: 'Prueba sabores poco a poco',
        body: 'Si cambias de snack, observa tolerancia y preferencia antes de comprar varias unidades.',
      },
    ],
    relatedLinks: [
      { label: 'Snacks para gatos', href: '/tienda/snacks-gatos' },
      { label: 'Productos para gatos', href: '/tienda/gatos' },
    ],
  },
  {
    slug: 'como-cambiar-alimento-de-perro-o-gato',
    title: 'Como cambiar el alimento de tu perro o gato',
    description: 'Metodo gradual para cambiar alimento de perros o gatos y reducir molestias digestivas.',
    h1: 'Como cambiar el alimento sin hacerlo de golpe',
    updatedAt: '2026-05-06',
    readingTime: '4 min',
    audience: 'Perros y gatos',
    intro: 'Cambiar alimento de forma brusca puede causar rechazo o molestias. Una transicion gradual suele funcionar mejor.',
    sections: [
      {
        heading: 'Haz una mezcla progresiva',
        body: 'Durante varios dias mezcla alimento actual y nuevo, aumentando poco a poco la proporcion del nuevo.',
      },
      {
        heading: 'Observa digestion y apetito',
        body: 'Si aparecen sintomas persistentes, pausa el cambio y consulta con un veterinario.',
      },
      {
        heading: 'No cambies muchas cosas a la vez',
        body: 'Evita introducir alimento nuevo, snacks nuevos y comida humeda nueva el mismo dia si tu mascota es sensible.',
      },
    ],
    relatedLinks: [
      { label: 'Alimento para mascotas', href: '/tienda/alimento' },
      { label: 'Alimento para perros', href: '/tienda/alimento-perros' },
      { label: 'Alimento para gatos', href: '/tienda/alimento-gatos' },
    ],
  },
  {
    slug: 'raciones-de-alimento-para-perros',
    title: 'Raciones de alimento para perros',
    description: 'Como interpretar porciones de alimento para perros por peso, edad y actividad.',
    h1: 'Raciones de alimento para perros: puntos clave',
    updatedAt: '2026-05-06',
    readingTime: '3 min',
    audience: 'Perros',
    intro: 'La racion correcta depende de peso, etapa, actividad y calorias del alimento elegido.',
    sections: [
      {
        heading: 'Usa la tabla del empaque',
        body: 'Cada marca tiene densidad calorica distinta. La tabla del empaque es el primer punto de referencia.',
      },
      {
        heading: 'Ajusta segun condicion corporal',
        body: 'Si tu perro sube o baja de peso, revisa porcion, premios y actividad. Un veterinario puede ayudarte a ajustar.',
      },
      {
        heading: 'Cuenta snacks y comida humeda',
        body: 'Los premios y complementos tambien suman calorias, asi que deben considerarse dentro del total diario.',
      },
    ],
    relatedLinks: [
      { label: 'Alimento para perros', href: '/tienda/alimento-perros' },
      { label: 'Comida humeda para perros', href: '/tienda/comida-humeda-perros' },
    ],
  },
  {
    slug: 'marcas-de-alimento-para-mascotas-en-ecuador',
    title: 'Marcas de alimento para mascotas en Ecuador',
    description: 'Marcas de alimento para perros y gatos disponibles en ParaMascotasEC segun stock publicado.',
    h1: 'Marcas de alimento para mascotas disponibles',
    updatedAt: '2026-05-06',
    readingTime: '4 min',
    audience: 'Perros y gatos',
    intro: 'Comparar marcas ayuda a encontrar una opcion estable para recompra, etapa y presupuesto.',
    sections: [
      {
        heading: 'Marcas para perros',
        body: 'Dog Chow, Pro-Can, NutraPro, Avant, Cani, Wellness, Mimma y otras marcas pueden estar disponibles segun inventario.',
      },
      {
        heading: 'Marcas para gatos',
        body: 'Cat Chow, Pro-Cat, NutraPro, Purina, Felix y otras opciones aparecen cuando estan publicadas con stock.',
      },
      {
        heading: 'Elige por necesidad, no solo por marca',
        body: 'La mejor opcion depende de etapa, tamano, preferencias, salud digestiva y presupuesto.',
      },
    ],
    relatedLinks: [
      { label: 'Alimento para mascotas', href: '/tienda/alimento' },
      { label: 'Productos por marca', href: '/tienda/marcas/nutrapro' },
    ],
  },
  {
    slug: 'alimento-para-perros-razas-pequenas',
    title: 'Alimento para perros de razas pequenas',
    description: 'Consejos para elegir alimento para perros de razas pequenas en Ecuador.',
    h1: 'Alimento para perros de razas pequenas',
    updatedAt: '2026-05-06',
    readingTime: '3 min',
    audience: 'Perros pequenos',
    intro: 'Los perros pequenos suelen necesitar croquetas, porciones y energia adaptadas a su tamano.',
    sections: [
      {
        heading: 'Busca formulas por tamano',
        body: 'Las opciones para razas pequenas suelen facilitar masticacion y control de porciones.',
      },
      {
        heading: 'Evita sobrealimentar',
        body: 'Por su tamano, pequenos excesos diarios pueden afectar peso. Mide raciones y premios.',
      },
      {
        heading: 'Compra presentaciones practicas',
        body: 'Presentaciones pequenas o medianas ayudan a mantener frescura si el consumo mensual es bajo.',
      },
    ],
    relatedLinks: [
      { label: 'Alimento para perros', href: '/tienda/alimento-perros?query=razas%20peque%C3%B1as' },
      { label: 'Productos para perros', href: '/tienda/perros' },
    ],
  },
  {
    slug: 'alimento-para-perros-razas-medianas-grandes',
    title: 'Alimento para perros medianos y grandes',
    description: 'Como elegir alimento para perros de razas medianas y grandes por etapa y actividad.',
    h1: 'Alimento para perros de razas medianas y grandes',
    updatedAt: '2026-05-06',
    readingTime: '3 min',
    audience: 'Perros medianos y grandes',
    intro: 'Los perros medianos y grandes necesitan formulas que acompanen energia, articulaciones y peso saludable.',
    sections: [
      {
        heading: 'Revisa etapa y tamano',
        body: 'Adulto, cachorro y raza grande no son lo mismo. La etapa correcta es clave para porciones y nutrientes.',
      },
      {
        heading: 'Considera actividad diaria',
        body: 'Un perro activo puede requerir distinta energia que uno sedentario. Ajusta porcion y consulta si hay cambios de peso.',
      },
      {
        heading: 'Planifica recompra',
        body: 'Las presentaciones grandes pueden convenir si tienes buen almacenamiento y consumo constante.',
      },
    ],
    relatedLinks: [
      { label: 'Alimento para perros', href: '/tienda/alimento-perros?query=razas%20medianas%20grandes' },
      { label: 'Alimento para mascotas', href: '/tienda/alimento' },
    ],
  },
]

export const SEO_GUIDE_BY_SLUG = new Map(SEO_GUIDES.map((guide) => [guide.slug, guide]))
