---
title: "Finding"
permalink: finding
---

We've now saved some data to Firebase, lets go get it back out again.

All examples below use `store.fetch` as that returns a promise which works with Ember's router.
You can use `store.find` instead to immediately return a model / collection.

## Finding individual records

Let's say we've got a person saved with an ID of "123", we can fetch that with:

{% highlight javascript %}
this.store.fetch("person", "123");
{% endhighlight %}

Once resolved, the record will be live and update itself whenever Firebase updates.

If more data is required to build the Firebase reference (see customising references later) then
we can provide them as a 3rd argument:

Eg if a list of tasks is at `/projects/some-project/tasks/123` then we might do something like:

{% highlight javascript %}
this.store.fetch("task", "123", {project: someProject});
{% endhighlight %}

## Finding lists of records

To find every item in a list:

{% highlight javascript %}
this.store.fetch("person")
{% endhighlight %}

To limit to a number of records, or provide a start/end point then we can supply an options object:

{% highlight javascript %}
this.store.fetch("person", {limit: 10, startAt: "123", endAt: "456"})
{% endhighlight %}

If we need to provide more data to build the Firebase reference, then we provide them before the limit options:

{% highlight javascript %}
this.store.fetch("task", {project: someProject}, {limit: 10, startAt: "123", endAt: "456"})
{% endhighlight %}
