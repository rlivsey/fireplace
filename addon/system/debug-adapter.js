import Ember from 'ember';

import Model from '../model/model';

const get        = Ember.get;
const capitalize = Ember.String.capitalize;
const underscore = Ember.String.underscore;

export default Ember.DataAdapter.extend({
  getFilters() {
    return [
      { name: 'isLive',     desc: 'Live'    },
      { name: 'isNew',      desc: 'New'     }
    ];
  },

  detect(klass) {
    return klass !== Model && Model.detect(klass);
  },

  columnsForType(type) {
    const columns = [{ name: 'id', desc: 'Id' }];
    let count = 0;

    get(type, 'attributes').forEach((meta, name) => {
        if (count++ > this.attributeLimit) { return false; }
        const desc = capitalize(underscore(name).replace('_', ' '));
        columns.push({ name: name, desc: desc });
    });
    columns.push({name: 'fbPath', desc: 'Firebase Path'});
    return columns;
  },

  getRecords(type) {
    return this.get('store').all(type);
  },

  recordReferenceToString(record) {
    const ref  = record.buildFirebaseReference();
    const root = ref.root().toString();

    return ref.toString().slice(root.length);
  },

  getRecordColumnValues(record) {
    let count = 0;

    const columnValues = {
      id: get(record, 'id'),
      fbPath: this.recordReferenceToString(record)
    };

    record.eachAttribute(key => {
      if (count++ > this.attributeLimit) {
        return false;
      }
      const value = get(record, key);
      columnValues[key] = value;
    });

    return columnValues;
  },

  getRecordKeywords(record) {
    const keywords = Ember.A();
    const keys = Ember.A(['id']);

    record.eachAttribute(key => keys.push(key) );
    keys.forEach(key => keywords.push(get(record, key)) );

    return keywords;
  },

  getRecordFilterValues(record) {
    return {
      isLive:    record.get('isListeningToFirebase'),
      isNew:     record.get('isNew')
    };
  },

  getRecordColor(record) {
    let color = 'black';
    if (record.get('isListeningToFirebase')) {
      color = 'green';
    } else if (record.get('isNew')) {
      color = 'blue';
    }
    return color;
  },

  observeRecord(record, recordUpdated) {
    const releaseMethods = Ember.A();
    const keysToObserve  = Ember.A(['id', 'isListeningToFirebase', 'isNew']);

    record.eachAttribute(key => keysToObserve.push(key) );

    keysToObserve.forEach(key => {
      const handler = function() {
        recordUpdated(this.wrapRecord(record));
      };

      Ember.addObserver(record, key, handler);

      releaseMethods.push(() => {
        Ember.removeObserver(record, key, handler);
      });
    });

    return () => releaseMethods.forEach(fn => fn());
  }

});
