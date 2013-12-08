(function(){

  var get = Ember.get;

  module("Relationships");

  test("detects the type based on the property name if left blank", function() {
    var Person = FP.Model.extend({
      foos: FP.hasMany(),
      thing: FP.hasOne(),
      others: FP.hasMany("foo"),
      other: FP.hasOne("thing")
    });

    var relationships = get(Person, "relationships");

    equal(relationships.get("foos").type, "foo", "anonymous hasMany singularizes property name");
    equal(relationships.get("thing").type, "thing", "anonymous hasOne uses property name");

    equal(relationships.get("others").type, "foo", "named hasMany used defined name");
    equal(relationships.get("other").type, "thing", "named hasOne uses defined name");
  });

})();