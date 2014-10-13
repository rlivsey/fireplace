---
title: "Relationships"
permalink: relationships
---

## hasOne

{% highlight javascript %}
// app/models/person.js
import {Model, attr, hasOne} from 'fireplace';
export default Model.extend({
  firstName: attr(),
  lastName: attr()
  address: hasOne()
});

// app/models/address.js
import {Model, attr} from 'fireplace';
export default Model.extend({
  street: attr(),
  city: attr(),
  postcode: attr()
});
{% endhighlight %}

This maps to the Firebase JSON of:

{% highlight javascript %}
{
  first_name: "John",
  last_name: "Watson",
  address: {
    street: "221B Baker Street",
    city: "London",
    postcode: "NW1 6XE"
  }
}
{% endhighlight %}

By default `hasOne` guesses the name of the associated type based on the name of the property,
in this case `address`.

If you want to call the property something different to the model type, pass its name as the first argument:

{% highlight javascript %}
// app/models/person.js
import {Model, hasOne} from 'fireplace';
export default Model.extend({
  residence: hasOne("address")
});
{% endhighlight %}

Firebase stores data in a tree structure, so Fireplace by default treats all relationships
as embedded. We can set the `embedded: false` option to change this:

{% highlight javascript %}
// app/models/person.js
import {Model, attr, hasOne} from 'fireplace';
export default Model.extend({
  firstName: attr(),
  lastName: attr(),
  address: hasOne({embedded: false})
});
{% endhighlight %}

and now the JSON is:

{% highlight javascript %}
{
  first_name: "John",
  last_name: "Watson",
  address: 123
}
{% endhighlight %}

This assumes that the address is stored at `/addresses/123` where `123` is the ID of the address.

We'll cover configuring the path of the item in Firebase later.


## hasMany

Lets say our person lives in many different places, we can model this like so:

{% highlight javascript %}
// app/models/person.js
import {Model, attr, hasMany} from 'fireplace';
export default Model.extend({
  firstName: attr(),
  lastName: attr(),
  addresses: hasMany()
});

// app/models/address.js
import {Model, attr} from 'fireplace';
export default Model.extend({
  street: attr(),
  city: attr(),
  postcode: attr()
});
{% endhighlight %}

The JSON for this is now:

{% highlight javascript %}
{
  first_name: "The",
  last_name: "Queen",
  addresses: {
    123: {
      street: "Buckingham Palace",
      city: "London",
      postcode: "SW1A 1AA"
    },
    456: {
      street: "Windsor Castle",
      city: "London",
      postcode: "SL4 1NJ"
    }
  }
}
{% endhighlight %}

Like hasOne, `hasMany` guesses the name of the associated type based on the singular name of the property,
in this case `addresses` -> `address`.

If you want to call the property something different to the model type, pass its name as the first argument:

{% highlight javascript %}
// app/models/person.js
import {hasOne} from 'fireplace';
export default Model.extend({
  residences: hasOne("address")
});
{% endhighlight %}

Again, we can change this to non-embedded by setting `{embedded: false}` to produce:

{% highlight javascript %}
{
  first_name: "The",
  last_name: "Queen",
  addresses: {
    123: true,
    456: true
  }
}
{% endhighlight %}

### Storing additional data with a non-embedded relationship

By default the relationships are stored as `{id: true}`, but we can store information there too.

Lets say we have projects which have people as members and each member has an access level.

Because it's a `hasMany` relationship, we can't store the meta information for the relationship
on the model itself because that person object can belong to many different projects.

Instead we use a `MetaModel` which lets us store the information for this particular member.

{% highlight javascript %}
// app/models/project.js
import {Model, attr, hasMany} from 'fireplace';
export default Model.extend({
  title: attr(),
  members: hasMany("people", {embedded: false, as: "member"})
});

// app/models/member.js
import {MetaModel} from 'fireplace';
export default MetaModel.extend();
{% endhighlight %}

The JSON for this would now be something like:

{% highlight javascript %}
{
  title: "A project",
  members: {
    123: "admin",
    234: "member",
    345: "admin"
  }
}
{% endhighlight %}

The meta value is available on the meta model as `meta`:

{% highlight javascript %}
var member = project.get("firstObject");
member.get("meta"); => "admin"
{% endhighlight %}

To change this to something more descriptive, you can use `Ember.computed.alias`:

{% highlight javascript %}
// app/models/member.js
import Ember from 'ember';
import {MetaModel} from 'fireplace';
export default MetaModel.extend({
  accessLevel: Ember.computed.alias("meta")
});
{% endhighlight %}

If you want to store more complex data on a relationship, you can give the `MetaModel` attributes
and relationships just like a normal model. All the same rules apply:

{% highlight javascript %}
// app/models/member.js
import {MetaModel, attr} from 'fireplace';
export default MetaModel.extend({
  accessLevel: attr(),
  joinedAt: attr("date")
});
{% endhighlight %}

This would produce JSON like so:

{% highlight javascript %}
{
  title: "A project",
  members: {
    123: {
      access_level: "admin",
      joined_at: "2012-11-24T15:00:00"
    },
    234: {
      access_level: "member",
      joined_at: "2012-12-11T14:30:00"
    }
  }
}
{% endhighlight %}

Keep in mind that, when using `MetaModel`s, you have to set the actual model as the `content` property on the `MetaModel` and then add the `MetaModel` to the parent's collection like in this sample:

{% highlight javascript %}
// project and person (of class People) are loaded already
var member = store.createRecord('member', {
  accessLevel: "admin",
  joinedAt: new Date(),
  content: person // the actual "content" of this relationship
});

project.get('members').addObject(member);
project.save();
{% endhighlight %}

When loading projects and getting members, the `MetaModel`'s properties are available on the *real* member (instance of `People`) as if they were a part of it.

## Detached relationships

All the above examples assume that the associated object itself or its ID is stored with the parent,
but what if you want to store something completely separately? Here we can use detached relationships.

For example, lets say we stored people with their avatars completely separately in the tree because
we're storing the image data and we don't want to include that by default when we fetch a list of people.
We don't store the avatar ID with the person because maybe every person has an avatar, so the JSON's something like:

{% highlight javascript %}
{
  people: {
    123: {
      name: "John Smith"
    }
  },
  avatars: {
    123: {
      filename: "an-image.png",
      data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
    }
  }
}
{% endhighlight %}

We can model this like so:

{% highlight javascript %}
// app/models/person.js
import {Model, attr, hasOne} from 'fireplace';
export default Model.extend({
  name: attr(),
  avatar: hasOne({detached: true})
});
{% endhighlight %}

By default this then looks for the avatar at `/avatars/{{id}}`, we'll look at how to change that later
should you want to store things in a different place.

Detached hasMany relationships are specified in a similar way, say a task can be assigned to multiple
people, but we want to be able to list them for a specific person. We could set this up in Firebase like so:

{% highlight javascript %}
{
  people: {
    123: {
      name: "Tom Ford"
    },
    234: {
      name: "Paul Smith"
    },
  },
  tasks_by_person: {
    123: {
      345: true,
      456: true
    },
    234: {
      345: true
    }
  },
  tasks: {
    345: {
      title: "A task assigned to both people",
      assignees: {
        123: true,
        234: true
      }
    },
    456: {
      title: "A task assigned to one person",
      assignees: {
        123: true
      }
    }
  }
}
{% endhighlight %}

Here we've got a list of people, a list of tasks and an index which maps each person to their tasks.

We can model this like so:

{% highlight javascript %}
// app/models/task.js
import {Model, attr, hasMany} from 'fireplace';
export default Model.extend({
  title: attr(),
  assignees: hasMany("people")
});

// app/models/person.js
import {Model, attr, hasMany} from 'fireplace';
export default Model.extend({
  name: attr(),
  tasks: hasMany({detached: true, path: "tasks_by_person/{{id}}"})
});
{% endhighlight %}

If the given `path` is a string, as it is here, it's expanded and appended to the root Firebase path.

For complete control over the path you can provide a function and return either a string or a Firebase
reference:

{% highlight javascript %}
// app/models/person.js
import {Model, hasMany} from 'fireplace';
export default Model.extend({
  tasks: hasMany({
    detached: true,
    path: function() {
      return this.get("project").buildFirebaseReference().
        child("tasks/by-person").
        child(this.get("id"));
    }
  })
});
{% endhighlight %}

A detached hasMany is assumed to be an indexed collection, as opposed to a collection of the items itself.
