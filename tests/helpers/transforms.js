window.QUnit.assert.serializes = function(transform, from, to, message) {
  this.deepEqual(transform.serialize(from), to, message);
};

window.QUnit.assert.deserializes = function(transform, from, to, message) {
  this.deepEqual(transform.deserialize(from), to, message);
};

window.QUnit.assert.transforms = function(transform, from, to, message) {
  this.serializes(transform, from, to, (message ? "serializing: "+message : undefined));
  this.deserializes(transform, from, to, (message ? "deserializing: "+message : undefined));
};