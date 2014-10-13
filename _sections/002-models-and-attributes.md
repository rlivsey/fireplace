---
title: "Models &amp; Attributes"
permalink: attributes
---

Define a model by extending from `Model` and giving it some attributes:

{% highlight javascript %}
// app/models/person.js
import {Model, attr} from 'fireplace';
export default Model.extend({
  firstName: attr(),
  lastName: attr()
});
{% endhighlight %}

`attr` takes a type which tells it how to transform to and from Firebase, and options.

Fireplace supports the following types out of the box:

* `string` (the default if no type is supplied)
* `boolean`
* `date` (iso8601 formatted date)
* `hash`
* `number`
* `timestamp` (the epoch returned from date.getTime())

## Custom Keys

You can change the key used to serialize the data to/from Firebase with the `key` option.
By default this is the underscored version of the name, so `firstName` maps to `first_name`.

For example, lets add a date of birth date attribute and map the lastName attribute to "surname":

{% highlight javascript %}
// app/models/person.js
import {Model, attr} from 'fireplace';
export default Model.extend({
  firstName: attr(),
  lastName: attr({key: "surname"}),
  dob: attr("date")
})
{% endhighlight %}

## Default Values

Attributes can have default values, specify this with the `default` option which can be either
the value itself or a function which returns the default value (good for dates etc...)

{% highlight javascript %}
// app/models/person.js
import {Model, attr} from 'fireplace';
export default Model.extend({
  firstName: attr({default: "John"}),
  lastName: attr({default: "Smith"}),
  createdAt: attr("date", {default: function() { return new Date(); }})
})
{% endhighlight %}

