// naive deep equal

export default function deepEqual(a, b) {
  if (a === b) {
    return true;
  }

  if (typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }

  for (let prop in a) {
    if (!deepEqual(a[prop], b[prop])) {
      return false;
    }
  }

  for (let prop in b) {
    if (!a.hasOwnProperty(prop)) {
      return false;
    }
  }

  return true;
}