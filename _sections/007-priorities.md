---
title: "Priorities"
permalink: priorities
---

If a model has a `priority` property, then that's used when saving to Firebase.

For example, lets say we want to order all people by their full name, last name first:

{% highlight javascript %}
// app/models/person.js
import {Model, attr} from 'fireplace';
export default Model.extend({
  firstName: attr(),
  lastName: attr(),
  priority: function(){
    return [this.get("firstName"), this.get("lastName")].join(" ").toLowerCase();
  }.property("firstName", "lastName")
})
{% endhighlight %}

Note that the priority here is a normal Ember property and not an `attr`. That's because we're not
storing it as an attribute in the JSON.

The same applies to a `MetaModel` so you can order items in an indexed list.

For example, lets order a list of members by the date they were added to a project:

{% highlight javascript %}
// app/models/person.js
import {Model, attr} from 'fireplace';
export default Model.extend({
  firstName: attr(),
  lastName: attr()
})

// app/models/project.js
import {Model, attr, hasMany} from 'fireplace';
export default Model.extend({
  title: attr(),
  members: hasMany("people", {as: "member"})
})

// app/models/member.js
import {MetaModel, attr} from 'fireplace';
export default MetaModel.extend({
  createdAt: attr("date"),

  priority: function(){
    return this.get("createdAt").toISOString();
  }.property("createdAt")
})
{% endhighlight %}
