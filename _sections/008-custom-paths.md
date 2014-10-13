---
title: "Custom Paths"
permalink: custom-paths
---

By default Fireplace assumes that non-embedded records will be stored at the root of your store's Firebase reference
with each model type stored under its pluralized underscored name.

Embedded records are stored relative to their parent records.

For example, each `App.Person` is stored at `/people/id`.

To customise this you can override the `firebasePath` property on the model's class.

Let's change `App.Person` to store its data at `/member/profiles` instead of `/people`:

{% highlight javascript %}
// app/models/person.js
import {Model} from 'fireplace';
var Person = Model.extend();
export default Person;

Person.reopenClass({
  firebasePath: "member/profiles"
});
{% endhighlight %}

Any handlebars style parameters will be expanded, so lets say we store each person under the project
they are a member of, eg `/projects/123/people/456`, then we can provide a path like so:

{% highlight javascript %}
Person.reopenClass({
  firebasePath: "projects/{{project.id}}/people"
});
{% endhighlight %}

In this case, whenever we look for a person we'll need to provide the project and the model should have
a project property so that it knows where it is to be saved to.

{% highlight javascript %}
this.store.fetch("person", {project: someProject});
{% endhighlight %}

Finally, for complete control you can specify a function, the equivalent to the template string above would be:

{% highlight javascript %}
Person.reopenClass({
  firebasePath: function(options) {
    var projectID = options.get("project.id");
    return "projects/"+projectID+"/people";
  }
})
{% endhighlight %}