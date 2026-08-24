/**
 * یادآوری اقساط — Google Apps Script (cron رایگان)
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
  var installmentRule = rules.filter(function (r) { return r.kind === 'installments' && r.enabled; })[0];
  if (!installmentRule) return;

  if (!isReminderWindow_(installmentRule.hour, installmentRule.minute)) return;

  var reminders = findInstallmentReminders_(ss, installmentRule);
  if (!reminders.length) return;

  var subscriptions = readPushSubscriptions_(ss);
  if (!subscriptions.length) return;

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
      logSent_(ss, item.reference);
      sentCount += 1;
    }
  });

  if (sentCount > 0) {
    Logger.log('Sent ' + sentCount + ' reminder batch(es)');
  }
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

function logSent_(ss, reference) {
  var sheet = ss.getSheetByName(SHEET_LOG);
  if (!sheet) return;
  sheet.appendRow([
    formatIsoDate_(new Date()),
    'installments',
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
