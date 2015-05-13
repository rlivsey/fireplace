import Ember from 'ember';

import Model from '../model/model';

var get        = Ember.get;
var capitalize = Ember.String.capitalize;
var underscore = Ember.String.underscore;

// Map#forEach argument order changed - https://github.com/emberjs/data/issues/2323
var LEGACY_MAP = Ember.Map.prototype.forEach.length === 2;

export default Ember.DataAdapter.extend({
  getFilters: function() {
    return [
      { name: 'isLive',     desc: 'Live'    },
      { name: 'isNew',      desc: 'New'     }
    ];
  },

  detect: function(klass) {
    return klass !== Model && Model.detect(klass);
  },

  columnsForType: function(type) {
    var columns = [{ name: 'id', desc: 'Id' }], count = 0, self = this;
    get(type, 'attributes').forEach(function(meta, name) {
        if (LEGACY_MAP) { var tmp = name; name = meta; meta = tmp; }
        if (count++ > self.attributeLimit) { return false; }
        var desc = capitalize(underscore(name).replace('_', ' '));
        columns.push({ name: name, desc: desc });
    });
    columns.push({name: 'fbPath', desc: 'Firebase Path'});
    return columns;
  },

  getRecords: function(type) {
    return this.get('store').all(type);
  },

  recordReferenceToString: function(record) {
    var ref  = record.buildFirebaseReference(),
        root = ref.root().toString();

    return ref.toString().slice(root.length);
  },

  getRecordColumnValues: function(record) {
    var self  = this,
        count = 0;

    var columnValues = {
      id: get(record, 'id'),
      fbPath: this.recordReferenceToString(record)
    };

    record.eachAttribute(function(key) {
      if (count++ > self.attributeLimit) {
        return false;
      }
      var value = get(record, key);
      columnValues[key] = value;
    });
    return columnValues;
  },

  getRecordKeywords: function(record) {
    var keywords = Ember.A(), keys = Ember.A(['id']);
    record.eachAttribute(function(key) {
      keys.push(key);
    });
    keys.forEach(function(key) {
      keywords.push(get(record, key));
    });
    return keywords;
  },

  getRecordFilterValues: function(record) {
    return {
      isLive:    record.get('isListeningToFirebase'),
      isNew:     record.get('isNew')
    };
  },

  getRecordColor: function(record) {
    var color = 'black';
    if (record.get('isListeningToFirebase')) {
      color = 'green';
    } else if (record.get('isNew')) {
      color = 'blue';
    }
    return color;
  },

  observeRecord: function(record, recordUpdated) {
    var releaseMethods = Ember.A(), self = this,
        keysToObserve = Ember.A(['id', 'isListeningToFirebase', 'isNew']);

    record.eachAttribute(function(key) {
      keysToObserve.push(key);
    });

    keysToObserve.forEach(function(key) {
      var handler = function() {
        recordUpdated(self.wrapRecord(record));
      };
      Ember.addObserver(record, key, handler);
      releaseMethods.push(function() {
        Ember.removeObserver(record, key, handler);
      });
    });

    var release = function() {
      releaseMethods.forEach(function(fn) { fn(); } );
    };

    return release;
  }

});
