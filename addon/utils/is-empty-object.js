export default function isEmptyObject(obj) {
  var name;
  for (name in obj) {
    return false;
  }
  return true;
}