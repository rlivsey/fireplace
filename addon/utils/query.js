import {
  QUERY_OPTIONS
} from '../collections/base';

export function extractQueryOptions(options) {
  const query = {};
  QUERY_OPTIONS.forEach(key => {
    if (options.hasOwnProperty(key)) {
      query[key] = options[key];
    }
  });
  return query;
}

export function hasQueryOptions(options) {
  return QUERY_OPTIONS.filter(option => options.hasOwnProperty(option)).length > 0;
}