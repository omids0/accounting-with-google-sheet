/**
 * یادآوری سررسیدها و یادآوری روزانه — Google Apps Script (cron رایگان)
 *
 * نصب:
 * 1. Google Sheet → Extensions → Apps Script
 * 2. این فایل را paste کنید
 * 3. Project Settings → Script properties:
 *    PUSH_WORKER_URL = https://....workers.dev
 *    PUSH_WORKER_SECRET = همان secret Worker
 * 4. Triggers → Add Trigger → runReminderCron → Time-driven → Every 15 minutes
 */

var SHEET_REMINDERS = 'یادآوری';
var SHEET_PUSH = 'ناتیف';
var SHEET_LOG = 'یادآوری_ثبت';
var SHEET_INSTALLMENTS = 'اقساط';
var SHEET_CHECKS = 'چک‌ها';
var SHEET_DANG = 'دنگ';
var SHEET_PERSONAL = 'مواعد_شخصی';
var SHEET_VEHICLE_DEADLINE = 'موعد_خودرو';
var SHEET_VEHICLE_PERIODIC = 'سرویس_خودرو';
var SHEET_VEHICLES = 'خودرو';
var SHEET_ACTIVITY = 'فعالیت';
var TZ = 'Asia/Tehran';

function runReminderCron() {
  var props = PropertiesService.getScriptProperties();
  var workerUrl = props.getProperty('PUSH_WORKER_URL');
  var workerSecret = props.getProperty('PUSH_WORKER_SECRET');
  if (!workerUrl || !workerSecret) {
    throw new Error('PUSH_WORKER_URL or PUSH_WORKER_SECRET is missing');
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rules = readReminderRules_(ss);
  var subscriptions = readPushSubscriptions_(ss);
  if (!subscriptions.length) return;

  var sentCount = 0;

  sentCount += processDueDateRule_(ss, workerUrl, workerSecret, subscriptions, rules, 'installments', findInstallmentReminders_);
  sentCount += processDueDateRule_(ss, workerUrl, workerSecret, subscriptions, rules, 'checks', findCheckReminders_);
  sentCount += processDueDateRule_(ss, workerUrl, workerSecret, subscriptions, rules, 'dang', findDangReminders_);

  var personalRule = rules.filter(function (r) {
    return r.kind === 'personal' && r.enabled;
  })[0];
  if (personalRule && isReminderWindow_(personalRule.hour, personalRule.minute)) {
    var personalReminders = findPersonalReminders_(ss);
    sentCount += sendReminders_(ss, workerUrl, workerSecret, subscriptions, personalReminders, 'personal');
  }

  var vehicleDeadlineRule = rules.filter(function (r) {
    return r.kind === 'vehicle-deadline' && r.enabled;
  })[0];
  if (vehicleDeadlineRule && isReminderWindow_(vehicleDeadlineRule.hour, vehicleDeadlineRule.minute)) {
    var vehicleDeadlineReminders = findVehicleDeadlineReminders_(ss);
    sentCount += sendReminders_(
      ss,
      workerUrl,
      workerSecret,
      subscriptions,
      vehicleDeadlineReminders,
      'vehicle-deadline'
    );
  }

  var vehiclePeriodicRule = rules.filter(function (r) {
    return r.kind === 'vehicle-periodic-service' && r.enabled;
  })[0];
  if (vehiclePeriodicRule && isReminderWindow_(vehiclePeriodicRule.hour, vehiclePeriodicRule.minute)) {
    var vehiclePeriodicReminders = findVehiclePeriodicReminders_(ss);
    sentCount += sendReminders_(
      ss,
      workerUrl,
      workerSecret,
      subscriptions,
      vehiclePeriodicReminders,
      'vehicle-periodic-service'
    );
  }

  var dailyRule = rules.filter(function (r) {
    return r.kind === 'daily' && r.enabled;
  })[0];
  if (dailyRule && isReminderWindow_(dailyRule.hour, dailyRule.minute)) {
    var dailyReminders = findDailyEngagementReminders_(ss);
    sentCount += sendReminders_(ss, workerUrl, workerSecret, subscriptions, dailyReminders, 'daily');
  }

  if (sentCount > 0) {
    Logger.log('Sent ' + sentCount + ' reminder batch(es)');
  }
}

function processDueDateRule_(ss, workerUrl, workerSecret, subscriptions, rules, kind, finder) {
  var rule = rules.filter(function (r) {
    return r.kind === kind && r.enabled;
  })[0];
  if (!rule || !isReminderWindow_(rule.hour, rule.minute)) return 0;

  var reminders = finder(ss, rule);
  return sendReminders_(ss, workerUrl, workerSecret, subscriptions, reminders, kind);
}

function sendReminders_(ss, workerUrl, workerSecret, subscriptions, reminders, logKind) {
  var sentCount = 0;
  reminders.forEach(function (item) {
    if (wasAlreadySent_(ss, item.reference)) return;

    var payload = {
      title: item.title,
      body: item.body,
      url: '/',
      subscriptions: subscriptions,
    };

    var ok = postToWorker_(workerUrl, workerSecret, payload);
    if (ok) {
      logSent_(ss, logKind, item.reference);
      sentCount += 1;
    }
  });
  return sentCount;
}

function readReminderRules_(ss) {
  var sheet = ss.getSheetByName(SHEET_REMINDERS);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var rules = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var kind = String(row[0] || '').trim();
    if (!kind) continue;
    rules.push({
      kind: kind,
      enabled: parseBool_(row[1]),
      daysBefore: Number(row[2]) || 0,
      hour: Number(row[3]) || 9,
      minute: Number(row[4]) || 0,
    });
  }
  return rules;
}

function readPushSubscriptions_(ss) {
  var sheet = ss.getSheetByName(SHEET_PUSH);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var subs = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var endpoint = String(row[0] || '').trim();
    var p256dh = String(row[1] || '').trim();
    var auth = String(row[2] || '').trim();
    if (!endpoint || !p256dh || !auth) continue;
    subs.push({ endpoint: endpoint, keys: { p256dh: p256dh, auth: auth } });
  }
  return subs;
}

function readActivity_(ss) {
  var sheet = ss.getSheetByName(SHEET_ACTIVITY);
  if (!sheet) return { lastOpen: '', lastOperation: '' };
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { lastOpen: '', lastOperation: '' };
  var row = values[1];
  return {
    lastOpen: String(row[0] || '').slice(0, 10),
    lastOperation: String(row[1] || '').slice(0, 10),
  };
}

function findDailyEngagementReminders_(ss) {
  var activity = readActivity_(ss);
  if (!activity.lastOpen) return [];

  var today = formatIsoDate_(new Date());
  var yesterday = addDaysIso_(today, -1);

  if (activity.lastOpen >= yesterday) return [];
  if (activity.lastOperation && activity.lastOperation >= yesterday) return [];

  var reference = 'daily_' + yesterday;
  return [{
    reference: reference,
    title: 'حسابداری شخصی',
    body:
      'دیروز به اپ سر نزدید و ثبت مالی هم نداشتید. اگر چیزی از قلم افتاده، همین الان بیایید ' +
      'حساب\u200cوکتابتان را به\u200cروز کنید — دیر نشده!',
  }];
}

function findInstallmentReminders_(ss, rule) {
  var sheet = ss.getSheetByName(SHEET_INSTALLMENTS);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var today = formatIsoDate_(new Date());
  var targetDue = addDaysIso_(today, rule.daysBefore);
  var reminders = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var planId = String(row[0] || '').trim();
    if (!planId) continue;

    var title = String(row[2] || '').trim() || 'قسط';
    var amount = Number(row[3]) || 0;
    var paymentsRaw = String(row[8] || '').trim();
    if (!paymentsRaw) continue;

    var payments;
    try {
      payments = JSON.parse(paymentsRaw);
    } catch (e) {
      continue;
    }

    for (var j = 0; j < payments.length; j++) {
      var payment = payments[j];
      if (payment.paid) continue;
      var dueDate = String(payment.dueDate || '').slice(0, 10);
      if (dueDate !== targetDue) continue;

      var reference = planId + '_p' + payment.n + '_' + dueDate;
      reminders.push({
        reference: reference,
        title: 'یادآوری قسط',
        body: title + ' — قسط ' + payment.n + ' (' + formatMoney_(amount) + ') — موعد: ' + formatPersianDate_(dueDate),
      });
    }
  }

  return reminders;
}

function findCheckReminders_(ss, rule) {
  var sheet = ss.getSheetByName(SHEET_CHECKS);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var today = formatIsoDate_(new Date());
  var targetDue = addDaysIso_(today, rule.daysBefore);
  var reminders = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id = String(row[0] || '').trim();
    if (!id) continue;

    if (parseBool_(row[7])) continue;

    var dueDate = String(row[6] || '').slice(0, 10);
    if (dueDate !== targetDue) continue;

    var checkNumber = String(row[2] || '').trim();
    var counterparty = String(row[3] || '').trim();
    var amount = Number(row[4]) || 0;
    var label = counterparty || checkNumber || 'چک';
    var numberPart = checkNumber ? ' — شماره ' + checkNumber : '';

    reminders.push({
      reference: 'check_' + id + '_' + dueDate,
      title: 'یادآوری چک',
      body: label + numberPart + ' (' + formatMoney_(amount) + ') — سررسید: ' + formatPersianDate_(dueDate),
    });
  }

  return reminders;
}

function findDangReminders_(ss, rule) {
  var sheet = ss.getSheetByName(SHEET_DANG);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var today = formatIsoDate_(new Date());
  var targetDue = addDaysIso_(today, rule.daysBefore);
  var reminders = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id = String(row[0] || '').trim();
    if (!id) continue;

    var legacy = row[4] !== '' && !isNaN(Number(row[4]));
    var title = String(row[2] || '').trim() || 'بدهی';
    var counterparty = legacy ? String(row[3] || '').trim() : String(row[4] || '').trim();
    var category = legacy ? 'سایر' : String(row[3] || '').trim();
    var amount = legacy ? Number(row[4]) || 0 : Number(row[5]) || 0;
    var dueDate = legacy ? String(row[5] || '').slice(0, 10) : String(row[6] || '').slice(0, 10);
    var paidRaw = legacy ? row[7] : row[8];

    if (parseBool_(paidRaw)) continue;
    if (dueDate !== targetDue) continue;

    var subtitle = counterparty || category || 'بدهی';

    reminders.push({
      reference: 'dang_' + id + '_' + dueDate,
      title: 'یادآوری بدهی',
      body: title + ' (' + subtitle + ') — ' + formatMoney_(amount) + ' — موعد: ' + formatPersianDate_(dueDate),
    });
  }

  return reminders;
}

var PERSONAL_CATEGORY_LABELS_ = {
  bill: 'قبض',
  insurance: 'بیمه',
  tax: 'مالیات',
  subscription: 'اشتراک',
  other: 'سایر',
};

function findVehicleDeadlineReminders_(ss) {
  var sheet = ss.getSheetByName(SHEET_VEHICLE_DEADLINE);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var vehicleTitles = readVehicleTitles_(ss);
  var today = formatIsoDate_(new Date());
  var reminders = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id = String(row[0] || '').trim();
    if (!id) continue;
    if (!parseBool_(row[9] ?? 'true')) continue;
    if (!parseBool_(row[10] ?? 'false')) continue;

    var vehicleId = String(row[1] || '').trim();
    var category = String(row[3] || '').trim() || 'موعد';
    var endDate = String(row[5] || '').slice(0, 10);
    var amount = Number(row[6]) || 0;
    var daysBefore = Number(row[11]) || 3;
    var targetDue = addDaysIso_(today, daysBefore);

    if (endDate !== targetDue) continue;

    var vehicleTitle = vehicleTitles[vehicleId] || 'خودرو';
    var amountPart = amount > 0 ? ' (' + formatMoney_(amount) + ')' : '';

    reminders.push({
      reference: 'vehicle_deadline_' + id + '_' + endDate,
      title: 'یادآوری موعد خودرو',
      body:
        vehicleTitle +
        ' — ' +
        category +
        amountPart +
        ' — پایان: ' +
        formatPersianDate_(endDate),
    });
  }

  return reminders;
}

function findVehiclePeriodicReminders_(ss) {
  var sheet = ss.getSheetByName(SHEET_VEHICLE_PERIODIC);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var vehicleTitles = readVehicleTitles_(ss);
  var vehicleMileages = readVehicleMileages_(ss);
  var today = formatIsoDate_(new Date());
  var reminders = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id = String(row[0] || '').trim();
    if (!id) continue;
    if (!parseBool_(row[12] ?? 'true')) continue;
    if (!parseBool_(row[13] ?? 'true')) continue;

    var vehicleId = String(row[1] || '').trim();
    var serviceType = String(row[3] || '').trim() || 'سرویس';
    var nextKm = Number(row[6]) || 0;
    var thresholdKm = Number(row[14]) || 500;
    var vehicleMileage = vehicleMileages[vehicleId] || 0;
    var remainingKm = nextKm - vehicleMileage;

    if (remainingKm > thresholdKm) continue;

    var vehicleTitle = vehicleTitles[vehicleId] || 'خودرو';
    var remainingLabel =
      remainingKm < 0
        ? 'گذشته از موعد'
        : remainingKm.toLocaleString('fa-IR') + ' km مانده';

    reminders.push({
      reference: 'vehicle_periodic_' + id + '_' + today,
      title: 'یادآوری سرویس دوره‌ای',
      body:
        vehicleTitle +
        ' — ' +
        serviceType +
        ' — ' +
        remainingLabel +
        ' (بعدی: ' +
        nextKm.toLocaleString('fa-IR') +
        ' km)',
    });
  }

  return reminders;
}

function readVehicleMileages_(ss) {
  var sheet = ss.getSheetByName(SHEET_VEHICLES);
  if (!sheet) return {};
  var values = sheet.getDataRange().getValues();
  var mileages = {};
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id = String(row[0] || '').trim();
    if (!id) continue;
    mileages[id] = Number(row[3]) || 0;
  }
  return mileages;
}

function readVehicleTitles_(ss) {
  var sheet = ss.getSheetByName(SHEET_VEHICLES);
  if (!sheet) return {};
  var values = sheet.getDataRange().getValues();
  var titles = {};
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id = String(row[0] || '').trim();
    if (!id) continue;
    titles[id] = String(row[2] || '').trim() || 'خودرو';
  }
  return titles;
}

function findPersonalReminders_(ss) {
  var sheet = ss.getSheetByName(SHEET_PERSONAL);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var today = formatIsoDate_(new Date());
  var reminders = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id = String(row[0] || '').trim();
    if (!id) continue;
    if (!parseBool_(row[8])) continue;

    var category = String(row[2] || '').trim();
    var title = String(row[3] || '').trim();
    var dueDate = String(row[4] || '').slice(0, 10);
    var amount = Number(row[6]) || 0;
    var daysBefore = Number(row[7]) || 0;
    var targetDue = addDaysIso_(today, daysBefore);

    if (dueDate !== targetDue) continue;

    var categoryLabel = PERSONAL_CATEGORY_LABELS_[category] || 'سایر';
    var displayTitle = title || categoryLabel;
    var amountPart = amount > 0 ? ' (' + formatMoney_(amount) + ')' : '';

    reminders.push({
      reference: 'personal_' + id + '_' + dueDate,
      title: 'یادآوری ' + displayTitle,
      body: displayTitle + ' (' + categoryLabel + ')' + amountPart + ' — موعد: ' + formatPersianDate_(dueDate),
    });
  }

  return reminders;
}

function wasAlreadySent_(ss, reference) {
  var sheet = ss.getSheetByName(SHEET_LOG);
  if (!sheet) return false;
  var today = formatIsoDate_(new Date());
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0] || '') === today && String(values[i][2] || '') === reference) {
      return true;
    }
  }
  return false;
}

function logSent_(ss, kind, reference) {
  var sheet = ss.getSheetByName(SHEET_LOG);
  if (!sheet) return;
  sheet.appendRow([
    formatIsoDate_(new Date()),
    kind,
    reference,
    new Date().toISOString(),
  ]);
}

function postToWorker_(url, secret, payload) {
  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  var code = response.getResponseCode();
  return code >= 200 && code < 300;
}

function isReminderWindow_(hour, minute) {
  var now = new Date();
  var h = Number(Utilities.formatDate(now, TZ, 'H'));
  var m = Number(Utilities.formatDate(now, TZ, 'm'));
  return h === hour && m >= minute && m < minute + 15;
}

function parseBool_(value) {
  var v = String(value || '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'بله';
}

function formatIsoDate_(date) {
  return Utilities.formatDate(date, TZ, 'yyyy-MM-dd');
}

function addDaysIso_(iso, days) {
  var parts = iso.split('-');
  var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setDate(d.getDate() + days);
  return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
}

function formatMoney_(amount) {
  return Number(amount || 0).toLocaleString('fa-IR') + ' تومان';
}

/** Jalali years where the 33-year leap cycle pattern shifts (Birashk / jalaali-js algorithm). */
var JALALI_LEAP_BREAKS_ = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394,
  2456, 3178
];

function divFloor_(a, b) {
  return Math.trunc(a / b);
}

function modFloor_(a, b) {
  return a - Math.trunc(a / b) * b;
}

function jalaliCalendarInfo_(jy) {
  var gy = jy + 621;
  var leapJ = -14;
  var jp = JALALI_LEAP_BREAKS_[0];
  var jump = 0;
  var i;

  for (i = 1; i < JALALI_LEAP_BREAKS_.length; i++) {
    var jm = JALALI_LEAP_BREAKS_[i];

    jump = jm - jp;

    if (jy < jm) break;

    leapJ += divFloor_(jump, 33) * 8 + divFloor_(modFloor_(jump, 33), 4);
    jp = jm;
  }

  var n = jy - jp;

  leapJ += divFloor_(n, 33) * 8 + divFloor_(modFloor_(n, 33) + 3, 4);

  if (modFloor_(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  var leapG = divFloor_(gy, 4) - divFloor_((divFloor_(gy, 100) + 1) * 3, 4) - 150;
  var march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + divFloor_(jump + 4, 33) * 33;

  var leap = modFloor_(modFloor_(n + 1, 33) - 1, 4);

  if (leap === -1) leap = 4;

  return { leap: leap, gy: gy, march: march };
}

function gregorianToJdn_(gy, gm, gd) {
  var base =
    divFloor_((gy + divFloor_(gm - 8, 6) + 100100) * 1461, 4) +
    divFloor_(153 * modFloor_(gm + 9, 12) + 2, 5) +
    gd -
    34840408;

  return base - divFloor_(divFloor_(gy + 100100 + divFloor_(gm - 8, 6), 100) * 3, 4) + 752;
}

function jdnToGregorian_(jdn) {
  var j = 4 * jdn + 139361631;

  j += divFloor_(divFloor_(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;

  var i = divFloor_(modFloor_(j, 1461), 4) * 5 + 308;
  var gd = divFloor_(modFloor_(i, 153), 5) + 1;
  var gm = modFloor_(divFloor_(i, 153), 12) + 1;
  var gy = divFloor_(j, 1461) - 100100 + divFloor_(8 - gm, 6);

  return { gy: gy, gm: gm, gd: gd };
}

function jdnToJalali_(jdn) {
  var gy = jdnToGregorian_(jdn).gy;
  var year = gy - 621;
  var info = jalaliCalendarInfo_(year);
  var k = jdn - gregorianToJdn_(gy, 3, info.march);

  if (k >= 0) {
    if (k <= 185) {
      return { year: year, month: 1 + divFloor_(k, 31), day: modFloor_(k, 31) + 1 };
    }

    k -= 186;
  } else {
    year -= 1;
    k += 179;

    if (info.leap === 1) k += 1;
  }

  return { year: year, month: 7 + divFloor_(k, 30), day: modFloor_(k, 30) + 1 };
}

function dateToJalali_(gy, gm, gd) {
  return jdnToJalali_(gregorianToJdn_(gy, gm, gd));
}

var PERSIAN_DIGITS_ = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function toPersianDigits_(value) {
  return String(value).replace(/[0-9]/g, function (digit) {
    return PERSIAN_DIGITS_[Number(digit)];
  });
}

function pad2_(n) {
  return n < 10 ? '0' + n : String(n);
}

function formatPersianDate_(iso) {
  try {
    var parts = iso.split('-');
    var jalali = dateToJalali_(Number(parts[0]), Number(parts[1]), Number(parts[2]));

    return toPersianDigits_(jalali.year + '/' + pad2_(jalali.month) + '/' + pad2_(jalali.day));
  } catch (e) {
    return iso;
  }
}

/** برای تست دستی از Apps Script editor */
function testReminderCron() {
  runReminderCron();
}
