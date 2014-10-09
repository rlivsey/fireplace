export function serializes(transform, from, to, message) {
  deepEqual(transform.serialize(from), to, message);
}

export function deserializes(transform, from, to, message) {
  deepEqual(transform.deserialize(from), to, message);
}

export function transforms(transform, from, to, message) {
  serializes(transform, from, to, (message ? "serializing: "+message : undefined));
  deserializes(transform, from, to, (message ? "deserializing: "+message : undefined));
}