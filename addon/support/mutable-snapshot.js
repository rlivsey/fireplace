var MutableSnapshot = function(snapshot) {
  this.snapshot = snapshot;
  this.children = {};
};

export default MutableSnapshot;

MutableSnapshot.prototype.name = function() {
  if (!this.snapshot) { return null; }
  return this.snapshot.name();
};

MutableSnapshot.prototype.val = function() {
  if (!this.snapshot) { return null; }
  return this.snapshot.val();
};

MutableSnapshot.prototype.getPriority = function() {
  if (!this.snapshot) { return null; }
  return this.snapshot.getPriority();
};

MutableSnapshot.prototype.numChildren = function() {
  if (!this.snapshot) { return 0; }
  return this.snapshot.numChildren();
};

MutableSnapshot.prototype.ref = function() {
  if (!this.snapshot) { return null; }
  return this.snapshot.ref();
};

MutableSnapshot.prototype.setChild = function(key, snapshot) {
  this.children[key] = snapshot;
};

MutableSnapshot.prototype.child = function(key) {
  var childSnapshot;
  if (this.children.hasOwnProperty(key)) {
    childSnapshot = this.children[key];
  } else if (this.snapshot) {
    childSnapshot = this.snapshot.child(key);
  }
  return new MutableSnapshot(childSnapshot);
};
