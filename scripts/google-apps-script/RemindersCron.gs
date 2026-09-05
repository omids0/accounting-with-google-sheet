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
    var note = String(row[3] || '').trim();
    var dueDate = String(row[4] || '').slice(0, 10);
    var amount = Number(row[6]) || 0;
    var daysBefore = Number(row[7]) || 0;
    var targetDue = addDaysIso_(today, daysBefore);

    if (dueDate !== targetDue) continue;

    var categoryLabel = PERSONAL_CATEGORY_LABELS_[category] || 'سایر';
    var notePart = note ? ' — ' + note : '';
    var amountPart = amount > 0 ? ' (' + formatMoney_(amount) + ')' : '';

    reminders.push({
      reference: 'personal_' + id + '_' + dueDate,
      title: 'یادآوری ' + categoryLabel,
      body: categoryLabel + notePart + amountPart + ' — موعد: ' + formatPersianDate_(dueDate),
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

function formatPersianDate_(iso) {
  try {
    var parts = iso.split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return Utilities.formatDate(d, TZ, 'yyyy/MM/dd');
  } catch (e) {
    return iso;
  }
}

/** برای تست دستی از Apps Script editor */
function testReminderCron() {
  runReminderCron();
}
