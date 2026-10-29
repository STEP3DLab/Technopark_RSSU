// Short concept contrasts; original wording checked against each linked source, 2026-10-29.
// These questions concern function and terminology, not structures selectable in the 3D mesh.
export const contrastPairs = [
  {
    id: 'artery-direction',
    prompt: 'Сосуд несёт кровь от сердца. Как он называется?',
    options: ['Артерия', 'Вена'],
    answer: 0,
    why: 'Название определяется направлением кровотока. Лёгочные артерии тоже идут от сердца, хотя несут кровь с низким содержанием кислорода.',
    source: 'https://www.nhlbi.nih.gov/health/heart/blood-flow',
    organId: 'heart'
  },
  {
    id: 'myocardium-supply',
    prompt: 'Что обеспечивает основное кровоснабжение сердечной мышцы?',
    options: ['Кровь внутри камер сердца', 'Коронарные артерии'],
    answer: 1,
    why: 'Коронарные артерии доставляют кровь к миокарду. Кровь, проходящая через камеры сердца, не заменяет этот путь.',
    source: 'https://www.nhlbi.nih.gov/health/heart/blood-flow',
    organId: 'heart'
  },
  {
    id: 'airway-gas-exchange',
    prompt: 'Где происходит основной газообмен с кровью?',
    options: ['В альвеолах', 'В главных бронхах'],
    answer: 0,
    why: 'Бронхи проводят воздух. В альвеолах кислород переходит в кровь капилляров, а углекислый газ — из крови в воздух.',
    source: 'https://www.nhlbi.nih.gov/health/lungs/respiratory-system',
    organId: 'airway'
  },
  {
    id: 'lung-lobes',
    prompt: 'У какого лёгкого три доли?',
    options: ['У левого', 'У правого'],
    answer: 1,
    why: 'Правое лёгкое имеет три доли, левое — две. Стороны называются относительно тела человека, а не экрана.',
    source: 'https://www.nhlbi.nih.gov/health/lungs/respiratory-system',
    organId: 'lungR'
  },
  {
    id: 'ureter-urethra',
    prompt: 'По чему моча поступает из почки в мочевой пузырь?',
    options: ['По мочеточнику', 'По мочеиспускательному каналу'],
    answer: 0,
    why: 'Мочеточник соединяет почку с пузырём. Мочеиспускательный канал выводит мочу из пузыря наружу.',
    source: 'https://www.niddk.nih.gov/health-information/urologic-diseases/urinary-tract-how-it-works',
    organId: 'bladder'
  },
  {
    id: 'filtration-reabsorption',
    prompt: 'Вода возвращается из фильтрата в кровь. Как называется процесс?',
    options: ['Фильтрация', 'Реабсорбция'],
    answer: 1,
    why: 'Фильтрация создаёт фильтрат из жидкости крови. Реабсорбция возвращает из фильтрата в кровь воду и нужные вещества.',
    source: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/25-5-physiology-of-urine-formation',
    organId: 'kidneyR'
  },
  {
    id: 'bile-production-storage',
    prompt: 'Какова основная роль желчного пузыря?',
    options: ['Накапливать и концентрировать желчь', 'Образовывать желчь'],
    answer: 0,
    why: 'Желчь образуется в печени. Желчный пузырь накапливает её, концентрирует и выделяет в пищеварительный тракт.',
    source: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/23-6-accessory-organs-in-digestion-the-liver-pancreas-and-gallbladder',
    organId: 'gallbladder'
  },
  {
    id: 'pancreas-food-path',
    prompt: 'Проходит ли пища через поджелудочную железу?',
    options: ['Да, между желудком и кишечником', 'Нет, железа выделяет секрет в кишечник'],
    answer: 1,
    why: 'Поджелудочная железа — вспомогательный орган пищеварения. Она направляет сок с ферментами и бикарбонатом в двенадцатиперстную кишку.',
    source: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/23-6-accessory-organs-in-digestion-the-liver-pancreas-and-gallbladder',
    organId: 'pancreas'
  }
];
