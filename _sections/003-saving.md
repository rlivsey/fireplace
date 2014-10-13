---
title: "Saving"
permalink: saving
---

Now that we've defined a basic model, let's save it to Firebase.

As with Ember Data, the `Store` is our access point into Fireplace and it's injected into all controllers
and routes.

We create an instance of a model with `store.createRecord` and then save it with `model.save()`:

{% highlight javascript %}
var person = this.store.createRecord("person", {
  firstName: "Bob",
  lastName: "Johnson"
});

person.save();
{% endhighlight %}

Now the model is saved, it's now live and any changes which occur in Firebase are reflected in the local instance.

Saving a model returns a promise, so we can wait for Firebase to confirm that the changes are saved like so:

{% highlight javascript %}
person.save().then(function(){
  // do something here, like transitioning to a route etc...
});
{% endhighlight %}

`Model#save` is a shortcut to `Store#saveRecord` so if you prefer to type more then the above example could
be re-written as:

{% highlight javascript %}
var person = this.store.createRecord("person", {
  firstName: "Bob",
  lastName: "Johnson"
});

this.store.saveRecord(person);
{% endhighlight %}