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

function getCardValues(t) {
  return t.get('card', 'shared', 'customFieldValues', {}).then(function (values) {
    return values;
  });
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
  'board-buttons': function (t, options) {
    return [{
      icon: GRAY_ICON,
      text: 'Custom Fields',
      callback: function (t) {
        return t.popup({
          title: 'Custom Fields Settings',
          url: './settings.html',
          height: 500
        });
      }
    }];
  },

  'card-back-section': function (t, options) {
    return getBoardFields(t).then(function (fields) {
      return {
        title: 'Custom Fields',
        icon: GRAY_ICON,
        content: {
          type: 'iframe',
          url: './card-back-section.html',
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
          badges.push({
            icon: field.type === 'checkbox' ? GRAY_ICON : null,
            text: field.name + ': ' + display,
            color: field.type === 'checkbox' && values[field.id] ? 'green' : null,
            refresh: 30
          });
        }
      });

      return badges;
    });
  },

  'show-settings': function (t, options) {
    return t.popup({
      title: 'Custom Fields Settings',
      url: './settings.html',
      height: 500
    });
  }
}, {
  appKey: 'your-trello-api-key',
  appName: 'Custom Fields Free'
});
