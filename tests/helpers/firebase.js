export function makeSnapshot(name, snapData, priority) {
  const data = {};
  data[name] = snapData;

  const fb = new window.MockFirebase("https://app.firebaseio.com", data);
  fb.autoFlush(true);

  let snapshot;
  if (priority !== undefined) {
    fb.child(name).setPriority(priority);
  }
  fb.child(name).once("value", function(s) { snapshot = s; });
  // fb.flush();

  return snapshot;
}

export function getSnapshot(fb, path) {
  let snapshot;
  fb.child(path).once("value", function(s) { snapshot = s; });
  // fb.flush();
  return snapshot;
}