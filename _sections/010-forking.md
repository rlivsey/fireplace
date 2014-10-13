---
title: "Forking"
permalink: forking
---

You can fork the store to make changes which don't affect any existing data until you save.

For example, if you have an editing interface and you don't want changes to affect parts of the
page which are being displayed with that record's details then you can fork the store and
get a new copy of the record which is totally isolated:

{% highlight javascript %}
var person = this.store.find("person", 1);
var newStore = this.store.fork();
var personClone = newStore.find("person", 1);
{% endhighlight %}

When you save `personClone` then `person` will also update, but not until then.

We fork the store instead of just copying the record because this makes sure we have a completely fresh
cache & that all embedded records are also isolated.
