import './helpers/polyfill';

// make sure we're not using Firebase itself
window.MockFirebase.override();

import resolver from './helpers/resolver';
import {
  setResolver
} from 'ember-qunit';

setResolver(resolver);
