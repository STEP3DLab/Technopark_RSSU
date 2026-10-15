// Short UI summaries and visual lessons. Full sourced descriptions remain in data.js.
export const briefs = {
  heart:'Направляет кровь по двум кругам.', lungR:'Газообмен · три доли.', lungL:'Газообмен · две доли.',
  liver:'Образует желчь. Участвует в обмене веществ.', stomach:'Перемешивает пищу. Начинает расщепление белков.',
  pancreas:'Пищеварительные ферменты и гормоны.', gallbladder:'Накапливает и концентрирует желчь.',
  smallIntestine:'Пищеварение и всасывание питательных веществ.', colon:'Всасывание воды. Формирование каловых масс.',
  kidneyR:'Образует мочу. Регулирует внутреннюю среду.', kidneyL:'Образует мочу. Регулирует внутреннюю среду.',
  bladder:'Накапливает мочу.', brain:'Обработка информации и управление организмом.',
  spleen:'Фильтрация крови и иммунная защита.', airway:'Проводят воздух к лёгким.', thyroid:'Гормональная регуляция обмена веществ.'
};
export const lessons = [
  {id:'lungs',name:'Сравнить лёгкие',icon:'lungs',hint:'3 шага · форма',steps:[
    {title:'Пара, но не копии',text:'Сравните форму и место для сердца.',ids:['lungR','lungL'],selected:'lungR',theta:0},
    {title:'Справа — три доли',text:'Поверните лёгкое и найдите междолевые щели.',ids:['lungR'],selected:'lungR',theta:.2},
    {title:'Слева — две',text:'Найдите сердечную вырезку на переднем крае.',ids:['lungL'],selected:'lungL',theta:-.25}
  ]},
  {id:'depth',name:'Найти скрытое',icon:'layers',hint:'3 шага · глубина',steps:[
    {title:'Желудок впереди',text:'Поджелудочная железа находится за ним.',ids:['stomach','pancreas'],selected:'stomach',theta:0},
    {title:'Теперь сзади',text:'Ракурс открывает поджелудочную железу.',ids:['stomach','pancreas'],selected:'pancreas',theta:Math.PI},
    {title:'Рассмотрите железу',text:'Головка → тело → хвост. Вращайте модель.',ids:['pancreas'],selected:'pancreas',theta:.15}
  ]},
  {id:'bile',name:'Печень и желчь',icon:'link',hint:'2 шага · связь',steps:[
    {title:'Образуется в печени',text:'Найдите желчный пузырь на нижней поверхности.',ids:['liver','gallbladder'],selected:'liver',theta:.25,phi:1.95},
    {title:'Накапливается в пузыре',text:'Желчный пузырь хранит и концентрирует желчь.',ids:['gallbladder'],selected:'gallbladder',theta:.25}
  ]},
  {id:'urine',name:'От почек к пузырю',icon:'drop',hint:'2 шага · функция',steps:[
    {title:'Почки образуют мочу',text:'Вид сзади: сравните расположение почек.',ids:['kidneyR','kidneyL'],selected:'kidneyR',theta:Math.PI},
    {title:'Пузырь накапливает',text:'Моча поступает по мочеточникам. Они здесь не показаны.',ids:['bladder'],selected:'bladder',theta:0}
  ]}
];
const paths={
  home:'<path d="M3 10.5 12 3l9 7.5M5 9v11h14V9M9 20v-7h6v7"/>',
  layers:'<path d="m12 3 10 5-10 5L2 8l10-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  focus:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="4"/>',
  rotate:'<path d="M20 8a9 9 0 1 0 1 7M20 3v5h-5"/>',
  labels:'<path d="m3 19 6-14 6 14M5 14h8M17 10h5m-2-3v12"/>',
  skeleton:'<path d="M12 3v18M8 5h8M5 8l7 3 7-3M5 12l7 3 7-3M8 19l4-2 4 2"/>',
  play:'<path d="m9 5 11 7-11 7V5Z"/>',
  eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  heart:'<path d="M20.5 4.5c-3-3-7-1-8.5 1-1.5-2-5.5-4-8.5-1S2 11 4 13l8 8 8-8c2-2 3.5-5.5.5-8.5Z"/>',
  lungs:'<path d="M10 5C7 4 2 12 3 18c1 3 6 2 7-1V5Zm4 0c3-1 8 7 7 13-1 3-6 2-7-1V5ZM12 2v8m0 0-5 4m5-4 5 4"/>',
  link:'<path d="m10 8 3-3a5 5 0 0 1 7 7l-3 3m-3 1-3 3a5 5 0 0 1-7-7l3-3m2 6 6-6"/>',
  drop:'<path d="M12 2S4 10 4 15a8 8 0 0 0 16 0c0-5-8-13-8-13Z"/>',
  vr:'<path d="M4 6h16l2 12h-6l-4-4-4 4H2L4 6Z"/><circle cx="7" cy="11" r="2"/><circle cx="17" cy="11" r="2"/>'
};
export function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.focus}</svg>`}
