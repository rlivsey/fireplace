FP.MutableSnapshot = function(snapshot) {
  this.snapshot = snapshot;
  this.children = {};
};

FP.MutableSnapshot.prototype.name = function() {
  if (!this.snapshot) { return null; }
  return this.snapshot.name();
};

FP.MutableSnapshot.prototype.val = function() {
  if (!this.snapshot) { return null; }
  return this.snapshot.val();
};

FP.MutableSnapshot.prototype.getPriority = function() {
  if (!this.snapshot) { return null; }
  return this.snapshot.getPriority();
};

FP.MutableSnapshot.prototype.numChildren = function() {
  if (!this.snapshot) { return 0; }
  return this.snapshot.numChildren();
};

FP.MutableSnapshot.prototype.ref = function() {
  if (!this.snapshot) { return null; }
  return this.snapshot.ref();
};

FP.MutableSnapshot.prototype.setChild = function(key, snapshot) {
  this.children[key] = snapshot;
};

FP.MutableSnapshot.prototype.child = function(key) {
  var childSnapshot;
  if (this.children.hasOwnProperty(key)) {
    childSnapshot = this.children[key];
  } else if (this.snapshot) {
    childSnapshot = this.snapshot.child(key);
  }
  return new FP.MutableSnapshot(childSnapshot);
};
