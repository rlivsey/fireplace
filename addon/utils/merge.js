// Ember.merge only supports 2 arguments
// Ember.assign isn't available in older Embers
// Ember.$.extend isn't available in Fastboot

import Ember from 'ember';

export default function(...objects) {
  let merged = {};
  objects.forEach(obj => {
    merged = Ember.merge(merged, obj);
  });
  return merged;
}