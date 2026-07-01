/* global TrelloPowerUp */

var GRAY_ICON = './images/icon-gray.svg';
var WHITE_ICON = './images/icon-white.svg';

var FIELD_TYPES = {
  text: { label: 'Text', default: '' },
  number: { label: 'Number', default: null },
  date: { label: 'Date', default: null },
  checkbox: { label: 'Checkbox', default: false },
  dropdown: { label: 'Dropdown', default: '' },
  url: { label: 'URL', default: '' }
};

function getBoardFields(t) {
  return t.get('board', 'shared', 'customFields', []).then(function (fields) {
    return fields;
  });
}

function parseDescription(desc) {
  if (!desc) return {};
  var match = desc.match(/<!-- CUSTOM_FIELDS_START -->([\s\S]*?)<!-- CUSTOM_FIELDS_END -->/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]);
  } catch (e) {
    return {};
  }
}

function formatDescription(desc, fieldValues) {
  var json = JSON.stringify(fieldValues, null, 2);
  var block = '\n\n<!-- CUSTOM_FIELDS_START -->\n' + json + '\n<!-- CUSTOM_FIELDS_END -->\n';
  
  // Remove existing block if present
  var cleaned = desc ? desc.replace(/<!-- CUSTOM_FIELDS_START -->[\s\S]*?<!-- CUSTOM_FIELDS_END -->/g, '').trim() : '';
  
  // Add formatted display
  var display = '\n\n## Custom Fields\n\n';
  Object.keys(fieldValues).forEach(function(fieldId) {
    var value = fieldValues[fieldId];
    if (value !== null && value !== undefined && value !== '') {
      display += '- **' + fieldId + '**: ' + value + '\n';
    }
  });
  
  return cleaned + display + block;
}

function getCardValues(t) {
  return t.card('desc').then(function(card) {
    return parseDescription(card.desc);
  });
}

function saveCardValues(t, values) {
  return t.card('desc').then(function(card) {
    var newDesc = formatDescription(card.desc, values);
    return t.update({ desc: newDesc });
  });
}

function getBadgeColor(field, value) {
  if (field.type === 'checkbox') {
    return value ? 'green' : 'red';
  }
  switch (field.type) {
    case 'number':
      return 'sky';
    case 'date':
      return 'yellow';
    case 'dropdown':
      return 'pink';
    case 'url':
      return 'lime';
    default:
      return 'blue';
  }
}

function formatFieldValue(field, value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  switch (field.type) {
    case 'checkbox':
      return value ? 'Yes' : 'No';
    case 'dropdown':
      var option = (field.options || []).find(function (opt) {
        return opt.id === value;
      });
      return option ? option.label : value;
    case 'date':
      return new Date(value).toLocaleDateString();
    case 'url':
      return value;
    default:
      return String(value);
  }
}

TrelloPowerUp.initialize({
  'card-buttons': function (t, options) {
    return [{
      icon: GRAY_ICON,
      text: 'Custom Fields',
      condition: 'edit',
      callback: function (t) {
        return t.popup({
          title: 'Edit Custom Fields',
          url: './card-back-section.html',
          height: 400
        });
      }
    }];
  },

  'board-buttons': function (t, options) {
    return [{
      icon: GRAY_ICON,
      text: 'Custom Fields',
      callback: function (t) {
        return t.popup({
          title: 'Custom Fields Settings',
          url: BASE_URL + 'settings.html',
          height: 500
        });
      }
    }];
  },

  'card-back-section': function (t, options) {
    return getBoardFields(t).then(function (fields) {
      var sectionUrl = './card-back-section.html';
      if (typeof t.signUrl === 'function') {
        sectionUrl = t.signUrl(sectionUrl);
      }
      return {
        title: 'Custom Fields',
        icon: GRAY_ICON,
        content: {
          type: 'iframe',
          url: sectionUrl,
          height: Math.max(120, 40 + fields.length * 60)
        }
      };
    });
  },

  'card-badges': function (t, options) {
    return Promise.all([getBoardFields(t), getCardValues(t)]).then(function (results) {
      var fields = results[0];
      var values = results[1];
      var badges = [];

      fields.forEach(function (field) {
        var display = formatFieldValue(field, values[field.id]);
        if (display) {
          var color = getBadgeColor(field, values[field.id]);
          var badge = {
            text: field.name + ': ' + display,
            title: field.name + ': ' + display,
            color: color,
            refresh: 30
          };
          badges.push(badge);
        }
      });

      return badges;
    });
  },

  'card-detail-badges': function (t, options) {
    return Promise.all([getBoardFields(t), getCardValues(t)]).then(function (results) {
      var fields = results[0];
      var values = results[1];
      var badges = [];

      fields.forEach(function (field) {
        var rawValue = values[field.id];
        var display = formatFieldValue(field, rawValue);
        var color = getBadgeColor(field, rawValue);
        var badgeText = display ? (field.name + ': ' + display) : field.name;

        badges.push({
          text: badgeText,
          title: 'Click to edit ' + field.name,
          color: color,
          callback: function (t) {
            return t.popup({
              title: 'Edit ' + field.name,
              url: BASE_URL + 'edit-field.html',
              args: { fieldId: field.id },
              height: 220
            });
          }
        });
      });

      return badges;
    });
  },

  'show-settings': function (t, options) {
    return t.popup({
      title: 'Custom Fields Settings',
      url: BASE_URL + 'settings.html',
      height: 500
    });
  }
}, {
  appKey: 'your-trello-api-key',
  appName: 'Custom Fields Free'
});
