/**
 * Обработчик заявок СКБ Технопарка РГСУ для Google Apps Script.
 * Размещается как веб-приложение с доступом для всех пользователей.
 */

const ИДЕНТИФИКАТОР_ТАБЛИЦЫ = '10HuqcXa6wYpKbukH1fXnfuRvSJHNeYRQmw1DEvpe0tg';
const ЛИСТ_ЗАЯВОК = 'Заявки';
const ПОЧТА_ТЕХНОПАРКА = 'technopark@rgsu.net';
const ПАПКА_ФАЙЛОВ = 'Файлы заявок СКБ РГСУ';
const ЧАСОВОЙ_ПОЯС = 'Europe/Moscow';
const МАКСИМАЛЬНЫЙ_РАЗМЕР_ФАЙЛА = 4 * 1024 * 1024;
const РАЗРЕШЕННЫЕ_РАСШИРЕНИЯ = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'zip'];

const ЗАГОЛОВКИ = [
  'Номер заявки', 'Дата и время', 'Тип обращения', 'Имя и фамилия',
  'Электронная почта', 'Телефон', 'Организация или институт',
  'Вид учебной работы', 'Институт и курс', 'Тема или идея',
  'Научный руководитель', 'Срок защиты', 'Описание задачи',
  'Ссылка на файл', 'Адрес страницы', 'Источник кнопки', 'Согласие',
  'Статус', 'Дата уведомления', 'Примечание'
];

function doGet() {
  return ответJson_({
    ok: true,
    service: 'Заявки СКБ Технопарка РГСУ',
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  const блокировка = LockService.getScriptLock();
  try {
    блокировка.waitLock(10000);
    const данные = разобратьЗапрос_(e);

    if (очистить_(данные.website, 200)) {
      return ответJson_({ ok: true, id: 'СКБ-ПРИНЯТО' });
    }

    проверитьДанные_(данные);
    const номер = нормализоватьНомер_(данные.submission_id) || создатьНомер_();
    const лист = получитьЛист_();
    const существующаяСтрока = найтиСтроку_(лист, номер);
    if (существующаяСтрока > 0) {
      return ответJson_({ ok: true, id: номер, duplicate: true });
    }

    const файл = сохранитьФайл_(данные.attachment, номер);
    const сейчас = new Date();
    const строка = построитьСтроку_(данные, номер, сейчас, файл.url);
    лист.appendRow(строка);
    const номерСтроки = лист.getLastRow();

    let уведомлениеОтправлено = false;
    let предупреждение = '';
    try {
      отправитьУведомление_(данные, номер, сейчас, файл);
      уведомлениеОтправлено = true;
      лист.getRange(номерСтроки, 19).setValue(сейчас);
    } catch (ошибкаПочты) {
      предупреждение = 'Заявка сохранена, письмо не отправлено: ' + String(ошибкаПочты);
      лист.getRange(номерСтроки, 20).setValue(предупреждение.slice(0, 1000));
    }

    return ответJson_({
      ok: true,
      id: номер,
      emailSent: уведомлениеОтправлено,
      warning: предупреждение
    });
  } catch (ошибка) {
    return ответJson_({ ok: false, error: String(ошибка.message || ошибка) });
  } finally {
    if (блокировка.hasLock()) блокировка.releaseLock();
  }
}

function разобратьЗапрос_(e) {
  const исходныйТекст = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  const данные = JSON.parse(исходныйТекст);
  if (!данные || typeof данные !== 'object') throw new Error('Некорректный формат обращения');
  return данные;
}

function проверитьДанные_(данные) {
  const имя = очистить_(данные.name, 160);
  const почта = очистить_(данные.email, 220);
  const задача = очистить_(данные.task, 2000);
  const тип = очистить_(данные.type, 20);

  if (!имя) throw new Error('Не указаны имя и фамилия');
  if (!/^\S+@\S+\.\S+$/.test(почта)) throw new Error('Некорректная электронная почта');
  if (!задача) throw new Error('Не описана задача');
  if (данные.consent !== 'yes') throw new Error('Не получено согласие на обработку данных');
  if (тип !== 'student' && тип !== 'partner') throw new Error('Некорректный тип обращения');
  if (тип === 'student' && !очистить_(данные.student_topic, 300)) throw new Error('Не указана тема или идея');
  if (тип === 'partner' && !очистить_(данные.organization, 300)) throw new Error('Не указана организация');
}

function получитьЛист_() {
  const таблица = SpreadsheetApp.openById(ИДЕНТИФИКАТОР_ТАБЛИЦЫ);
  let лист = таблица.getSheetByName(ЛИСТ_ЗАЯВОК);
  if (!лист) лист = таблица.insertSheet(ЛИСТ_ЗАЯВОК);
  const текущие = лист.getRange(1, 1, 1, ЗАГОЛОВКИ.length).getDisplayValues()[0];
  if (текущие.join('|') !== ЗАГОЛОВКИ.join('|')) {
    лист.getRange(1, 1, 1, ЗАГОЛОВКИ.length).setValues([ЗАГОЛОВКИ]);
    лист.setFrozenRows(1);
  }
  return лист;
}

function построитьСтроку_(данные, номер, сейчас, ссылкаНаФайл) {
  const студент = данные.type === 'student';
  return [
    номер,
    сейчас,
    студент ? 'Студент' : 'Организация',
    очистить_(данные.name, 160),
    очистить_(данные.email, 220),
    очистить_(данные.phone, 80),
    студент ? очистить_(данные.faculty, 300) : очистить_(данные.organization, 300),
    студент ? очистить_(данные.student_work_type, 200) : '',
    студент ? очистить_(данные.faculty, 300) : '',
    студент ? очистить_(данные.student_topic, 300) : '',
    студент ? очистить_(данные.supervisor, 300) : '',
    студент ? очистить_(данные.deadline, 40) : '',
    очистить_(данные.task, 2000),
    ссылкаНаФайл || '',
    очистить_(данные.source_url, 1000),
    очистить_(данные.source_cta, 300),
    'Да',
    'Новая',
    '',
    ''
  ];
}

function сохранитьФайл_(вложение, номер) {
  if (!вложение || !вложение.base64 || !вложение.name) return { url: '', blob: null };
  const имя = безопасноеИмяФайла_(вложение.name);
  const расширение = имя.includes('.') ? имя.split('.').pop().toLowerCase() : '';
  if (РАЗРЕШЕННЫЕ_РАСШИРЕНИЯ.indexOf(расширение) === -1) throw new Error('Недопустимый формат файла');

  const байты = Utilities.base64Decode(String(вложение.base64));
  if (байты.length > МАКСИМАЛЬНЫЙ_РАЗМЕР_ФАЙЛА) throw new Error('Размер файла превышает 4 МБ');
  const тип = очистить_(вложение.type, 120) || 'application/octet-stream';
  const объект = Utilities.newBlob(байты, тип, номер + ' — ' + имя);
  const папки = DriveApp.getFoldersByName(ПАПКА_ФАЙЛОВ);
  const папка = папки.hasNext() ? папки.next() : DriveApp.createFolder(ПАПКА_ФАЙЛОВ);
  const файл = папка.createFile(объект);
  файл.setDescription('Материалы к заявке ' + номер);
  return { url: файл.getUrl(), blob: объект };
}

function отправитьУведомление_(данные, номер, сейчас, файл) {
  const студент = данные.type === 'student';
  const тема = студент
    ? 'Новая заявка ' + номер + ': практическая часть учебного проекта'
    : 'Новая заявка ' + номер + ': задача организации';
  const поля = [
    ['Номер заявки', номер],
    ['Дата и время', Utilities.formatDate(сейчас, ЧАСОВОЙ_ПОЯС, 'dd.MM.yyyy HH:mm')],
    ['Тип обращения', студент ? 'Студент' : 'Организация'],
    ['Имя и фамилия', очистить_(данные.name, 160)],
    ['Электронная почта', очистить_(данные.email, 220)],
    ['Телефон', очистить_(данные.phone, 80)],
    ['Организация', очистить_(данные.organization, 300)],
    ['Вид учебной работы', очистить_(данные.student_work_type, 200)],
    ['Институт и курс', очистить_(данные.faculty, 300)],
    ['Тема или идея', очистить_(данные.student_topic, 300)],
    ['Научный руководитель', очистить_(данные.supervisor, 300)],
    ['Срок защиты', очистить_(данные.deadline, 40)],
    ['Описание задачи', очистить_(данные.task, 2000)],
    ['Источник', очистить_(данные.source_url, 1000)],
    ['Кнопка', очистить_(данные.source_cta, 300)],
    ['Файл', файл.url || 'Не приложен']
  ].filter(function(пара) { return пара[1]; });

  const текст = поля.map(function(пара) { return пара[0] + ': ' + пара[1]; }).join('\n\n');
  const строки = поля.map(function(пара) {
    return '<tr><th style="padding:8px 12px;text-align:left;vertical-align:top;background:#eef3f6">' +
      экранировать_(пара[0]) + '</th><td style="padding:8px 12px;vertical-align:top">' +
      экранировать_(пара[1]).replace(/\n/g, '<br>') + '</td></tr>';
  }).join('');
  const параметры = {
    to: ПОЧТА_ТЕХНОПАРКА,
    subject: тема,
    body: текст,
    htmlBody: '<h2 style="color:#073b5d">Новая заявка в СКБ Технопарка РГСУ</h2><table style="border-collapse:collapse;font:14px Arial,sans-serif">' + строки + '</table>',
    name: 'Сайт СКБ Технопарка РГСУ',
    replyTo: очистить_(данные.email, 220)
  };
  if (файл.blob) параметры.attachments = [файл.blob];
  MailApp.sendEmail(параметры);
}

function найтиСтроку_(лист, номер) {
  if (лист.getLastRow() < 2) return -1;
  const найдено = лист.getRange(2, 1, лист.getLastRow() - 1, 1)
    .createTextFinder(номер)
    .matchEntireCell(true)
    .findNext();
  return найдено ? найдено.getRow() : -1;
}

function создатьНомер_() {
  const дата = Utilities.formatDate(new Date(), ЧАСОВОЙ_ПОЯС, 'yyyyMMdd-HHmmss');
  const хвост = Utilities.getUuid().replace(/-/g, '').slice(0, 4).toUpperCase();
  return 'СКБ-' + дата + '-' + хвост;
}

function нормализоватьНомер_(значение) {
  const номер = String(значение || '').toUpperCase().replace(/[^A-ZА-ЯЁ0-9-]/g, '').slice(0, 80);
  return номер.indexOf('СКБ-') === 0 ? номер : '';
}

function безопасноеИмяФайла_(имя) {
  return String(имя || 'файл').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 180);
}

function очистить_(значение, длина) {
  return String(значение || '').trim().slice(0, длина || 1000);
}

function экранировать_(значение) {
  return String(значение || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ответJson_(данные) {
  return ContentService.createTextOutput(JSON.stringify(данные))
    .setMimeType(ContentService.MimeType.JSON);
}
