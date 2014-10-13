---
title: "Custom Collections"
permalink: custom-collections
---

There are two types of collection built in:

* `ObjectCollection` - returned from finders and hasMany embedded relationships
* `IndexedCollection` - returned from hasMany non-embedded / detached relationships

You can create a custom collection by extending either of these as a starting point.

For example, lets make a collection of objects which sets a random priority when items are added:

{% highlight javascript %}
// app/collections/random.js
import {ObjectCollection} from 'fireplace';
export default ObjectCollection.extend({

  replaceContent: function(idx, numRemoved, objectsAdded) {
    var priority;
    objectsAdded.forEach(function(obj, i) {
      if (!obj.get("priority")) {
        priority = Math.random();
        obj.set("priority", priority);
      }
    });
    return this._super(idx, numRemoved, objectsAdded);
  }

});
{% endhighlight %}

We can now use this in queries:

{% highlight javascript %}
this.store.fetch("person", {collection: "random"})
{% endhighlight %}

and in relationships:

{% highlight javascript %}
// app/models/person.js
import {Model} from 'fireplace';
export default Model.extend({
  tasks: hasMany({collection: "random"})
});
{% endhighlight %}