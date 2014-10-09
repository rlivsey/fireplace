import Ember from 'ember';

import Model from 'fireplace/model/model';
import one   from 'fireplace/relationships/has-one';
import many  from 'fireplace/relationships/has-many';

var get = Ember.get;

module("Relationships");

test("detects the type based on the property name if left blank", function() {
  var Person = Model.extend({
    foos:   many(),
    thing:  one(),
    others: many("foo"),
    other:  one("thing")
  });

  var relationships = get(Person, "relationships");

  equal(relationships.get("foos").type, "foo", "anonymous hasMany singularizes property name");
  equal(relationships.get("thing").type, "thing", "anonymous hasOne uses property name");

  equal(relationships.get("others").type, "foo", "named hasMany used defined name");
  equal(relationships.get("other").type, "thing", "named hasOne uses defined name");
});

