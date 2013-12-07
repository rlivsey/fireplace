FP.MutableSnapshot = function(snapshot) {
  this.snapshot = snapshot;
  this.data = snapshot ? snapshot.val() : {};
};

FP.MutableSnapshot.prototype.name = function() {
  return this.snapshot.name();
};

FP.MutableSnapshot.prototype.val = function() {
  return this.data;
};

FP.MutableSnapshot.prototype.getPriority = function() {
  return this.snapshot.getPriority();
};

FP.MutableSnapshot.prototype.numChildren = function() {
  return this.snapshot.numChildren();
};

FP.MutableSnapshot.prototype.ref = function() {
  return this.snapshot.ref();
};

FP.MutableSnapshot.prototype.set = function(key, value) {
  this.data[key] = value;
  return value;
};

// NOTE - currently only used for associations which we don't care about data changes
// so we return original snapshot child
// TODO - this should probably wrap in its own MutableSnapshot
FP.MutableSnapshot.prototype.child = function(key) {
  return this.snapshot.child(key);
};