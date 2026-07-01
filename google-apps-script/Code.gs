/**
 * Trello Custom Fields to Google Sheets Exporter
 *
 * 1. Copy this script into a new Google Apps Script project
 *    (https://script.google.com)
 * 2. Update CONFIG below with your Trello API key, token, and board ID
 * 3. Run exportTrelloBoard() manually, or create a button/menu trigger
 * 4. Authorize the script when prompted
 */

var CONFIG = {
  TRELLO_KEY: 'YOUR_TRELLO_API_KEY',
  TRELLO_TOKEN: 'YOUR_TRELLO_TOKEN',
  BOARD_ID: 'YOUR_BOARD_ID'
};

// The plugin ID is assigned by Trello when you register your Power-Up.
// The parsers below will try to auto-detect the correct plugin data entry,
// but you can set this explicitly if needed.
var PLUGIN_ID = null;

/**
 * Main export function. Call this to refresh the Google Sheet.
 */
function exportTrelloBoard() {
  var board = fetchTrello('boards/' + CONFIG.BOARD_ID, {
    lists: 'open',
    cards: 'visible',
    card_pluginData: 'true',
    board_pluginData: 'true',
    members: 'all',
    organization: 'false',
    fields: 'name,url'
  });

  var lists = arrayToMap(board.lists || [], 'id');
  var members = arrayToMap(board.members || [], 'id');
  var customFieldDefinitions = parseCustomFieldDefinitions(board.pluginData);
  var cards = board.cards || [];

  var sheet = getOrCreateSheet('Trello Export');
  sheet.clear();

  var headers = buildHeaders(customFieldDefinitions);
  sheet.appendRow(headers);

  var rows = cards.map(function (card) {
    return buildCardRow(card, lists, members, customFieldDefinitions);
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.autoResizeColumns(1, headers.length);
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Exported ' + rows.length + ' cards.',
    'Trello Export Complete'
  );
}

/**
 * Build column headers based on custom field definitions.
 */
function buildHeaders(customFieldDefinitions) {
  var headers = [
    'Card Name',
    'Card URL',
    'List',
    'Members',
    'Labels',
    'Due Date',
    'Description'
  ];

  customFieldDefinitions.forEach(function (field) {
    headers.push(field.name + ' (' + field.type + ')');
  });

  return headers;
}

/**
 * Build one row for a card.
 */
function buildCardRow(card, lists, members, customFieldDefinitions) {
  var listName = lists[card.idList] ? lists[card.idList].name : '';
  var memberNames = (card.idMembers || [])
    .map(function (id) {
      return members[id] ? members[id].fullName : id;
    })
    .join(', ');
  var labelNames = (card.labels || [])
    .map(function (label) {
      return label.name;
    })
    .join(', ');
  var dueDate = card.due ? new Date(card.due) : '';
  var cardValues = parseCardCustomValues(card.pluginData);

  var row = [
    card.name,
    card.shortUrl || card.url,
    listName,
    memberNames,
    labelNames,
    dueDate,
    card.desc || ''
  ];

  customFieldDefinitions.forEach(function (field) {
    var rawValue = cardValues[field.id];
    row.push(formatCustomFieldValue(field, rawValue));
  });

  return row;
}

/**
 * Format a custom field value for display in the sheet.
 */
function formatCustomFieldValue(field, rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return '';
  }

  switch (field.type) {
    case 'checkbox':
      return rawValue ? 'Yes' : 'No';
    case 'dropdown':
      var option = (field.options || []).find(function (opt) {
        return opt.id === rawValue;
      });
      return option ? option.label : rawValue;
    case 'date':
      return new Date(rawValue).toLocaleDateString();
    default:
      return rawValue;
  }
}

/**
 * Parse board pluginData to extract custom field definitions.
 */
function parseCustomFieldDefinitions(pluginData) {
  var entry = findPluginDataEntry(pluginData, 'customFields');
  if (!entry) {
    return [];
  }
  return entry.customFields || [];
}

/**
 * Parse card pluginData to extract custom field values.
 */
function parseCardCustomValues(pluginData) {
  var entry = findPluginDataEntry(pluginData, 'customFieldValues');
  if (!entry) {
    return {};
  }
  return entry.customFieldValues || {};
}

/**
 * Find a pluginData entry by plugin ID or by looking for a specific key in the value.
 */
function findPluginDataEntry(pluginData, key) {
  if (!pluginData || !pluginData.length) {
    return null;
  }

  for (var i = 0; i < pluginData.length; i++) {
    var item = pluginData[i];
    if (PLUGIN_ID && item.idPlugin !== PLUGIN_ID) {
      continue;
    }
    if (!item.value) {
      continue;
    }
    try {
      var parsed = JSON.parse(item.value);
      if (parsed && typeof parsed[key] !== 'undefined') {
        return parsed;
      }
    } catch (e) {
      // Ignore invalid JSON
    }
  }

  return null;
}

/**
 * Generic Trello API fetch.
 */
function fetchTrello(endpoint, params) {
  var baseUrl = 'https://api.trello.com/1/' + endpoint;
  var queryParams = Object.assign({}, params, {
    key: CONFIG.TRELLO_KEY,
    token: CONFIG.TRELLO_TOKEN
  });

  var queryString = Object.keys(queryParams)
    .map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(queryParams[key]);
    })
    .join('&');

  var url = baseUrl + '?' + queryString;
  var response = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
  var status = response.getResponseCode();

  if (status >= 400) {
    throw new Error('Trello API error (' + status + '): ' + response.getContentText());
  }

  return JSON.parse(response.getContentText());
}

/**
 * Helper: convert array to object keyed by id.
 */
function arrayToMap(arr, key) {
  var map = {};
  arr.forEach(function (item) {
    map[item[key]] = item;
  });
  return map;
}

/**
 * Helper: get or create a sheet by name.
 */
function getOrCreateSheet(name) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  return sheet;
}

/**
 * Optional: add a menu to the Google Sheet for easy export.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Trello')
    .addItem('Export Board', 'exportTrelloBoard')
    .addToUi();
}
