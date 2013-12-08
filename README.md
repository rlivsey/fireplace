# Fireplace

Fireplace is an [Ember.js](http://emberjs.com) adapter for [Firebase](http://firebase.com).

## Getting Started

Setup your Firebase root path:

```javascript
App.Store = FP.Store.extend({
  firebaseRoot: "https://your-firebase.firebaseio.com"
});
```

## Models & Attributes

Define a model by extending from `FP.Model` and giving it some attributes:

```javascript
App.Person = FP.Model.extend({
  firstName: FP.attr(),
  lastName: FP.attr()
});
```

Typing `FP.attr()` all the time can get a bit repetitive, so you can assign that to a variable
to reduce the amount of typing. All subsequent examples will assume this:

```javascript
var attr = FP.attr;
App.Person = FP.Model.extend({
  firstName: attr(),
  lastName: attr()
});
```

`FP.attr` takes a type which tells it how to transform to and from Firebase, and options.

Fireplace supports the following types out of the box:

* `string` (the default if no type is supplied)
* `boolean`
* `date` (iso8601 formatted date)
* `hash`
* `number`
* `timestamp` (the epoch returned from date.getTime())

### Custom Keys

You can change the key used to serialize the data to/from Firebase with the `key` option.
By default this is the underscored version of the name, so `firstName` maps to `first_name`.

For example, lets add a date of birth date attribute and map the lastName attribute to "surname":

```javascript
App.Person = FP.Model.extend({
  firstName: attr(),
  lastName: attr({key: "surname"}),
  dob: attr("date")
})
```

### Default Values

Attributes can have default values, specify this with the `default` option which can be either
the value itself or a function which returns the default value (good for dates etc...)

```javascript
App.Person = FP.Model.extend({
  firstName: attr({default: "John"}),
  lastName: attr({default: "Smith"}),
  createdAt: attr("date", {default: function() { return new Date(); }})
})
```

## Saving

Now that we've defined a basic model, let's save it to Firebase.

As with Ember Data, the `Store` is our access point into Fireplace and it's injected into all controllers
and routes.

We create an instance of a model with `store.createRecord` and then save it with `model.save()`:

```javascript
var person = this.store.createRecord("person", {
  firstName: "Bob",
  lastName: "Johnson"
});

person.save();
```

Now the model is saved, it's now live and any changes which occur in Firebase are reflected in the local instance.

Saving a model returns a promise, so we can wait for Firebase to confirm that the changes are saved like so:

```javascript
person.save().then(function(){
  // do something here, like transitioning to a route etc...
});
```

`Model#save` is a shortcut to `Store#saveRecord` so if you prefer to type more then the above example could
be re-written as:

```javascript
var person = this.store.createRecord("person", {
  firstName: "Bob",
  lastName: "Johnson"
});

this.store.saveRecord(person);
```

## Deleting

Simply call `delete` on a model to delete it.

As with saving, we return a promise so you can wait for Firebase to confirm that the save succeeded.

Likewise with saving, `Model#delete` is syntactic sugar for `Store#deleteRecord`.

## Finding

We've now saved some data to Firebase, lets go get it back out again.

All examples below use `store.fetch` as that returns a promise which works with Ember's router.
You can use `store.find` instead to immediately return a model / collection.

### Finding individual records

Let's say we've got a person saved with an ID of "123", we can fetch that with:

```javascript
this.store.fetch("person", "123");
```

Once resolved, the record will be live and update itself whenever Firebase updates.

If more data is required to build the Firebase reference (see customising references later) then
we can provide them as a 3rd argument:

Eg if a list of tasks is at `/projects/some-project/tasks/123` then we might do something like:

```javascript
this.store.fetch("task", "123", {project: someProject});
```

### Finding lists of records

To find every item in a list:

```javascript
this.store.fetch("person")
```

To limit to a number of records, or provide a start/end point then we can supply an options object:

```javascript
this.store.fetch("person", {limit: 10, startAt: "123", endAt: "456"})
```

If we need to provide more data to build the Firebase reference, then we provide them before the limit options:

```javascript
this.store.fetch("task", {project: someProject}, {limit: 10, startAt: "123", endAt: "456"})
```

## Relationships

### hasOne

```javascript
App.Person = FP.Model.extend({
  firstName: attr(),
  lastName: attr()
  address: FP.hasOne("address")
});

App.Address = FP.Model.address({
  street: attr(),
  city: attr(),
  postcode: attr()
});
```

This maps to the Firebase JSON of:

```javascript
{
  first_name: "John",
  last_name: "Watson",
  address: {
    street: "221B Baker Street",
    city: "London",
    postcode: "NW1 6XE"
  }
}
```

Firebase stores data in a tree structure, so Fireplace by default treats all relationships
as embedded. We can set the `embedded: false` option to change this:

```javascript
App.Person = FP.Model.extend({
  firstName: attr(),
  lastName: attr(),
  address: FP.hasOne("address", {embedded: false})
});
```

and now the JSON is:

```javascript
{
  first_name: "John",
  last_name: "Watson",
  address: 123
}
```

This assumes that the address is stored at `/addresses/123` where `123` is the ID of the address.

We'll cover configuring the path of the item in Firebase later.


### hasMany

Lets say our person lives in many different places, we can model this like so:

```javascript
App.Person = FP.Model.extend({
  firstName: attr(),
  lastName: attr(),
  address: FP.hasMany("address")
});

App.Address = FP.Model.address({
  street: attr(),
  city: attr(),
  postcode: attr()
});
```

The JSON for this is now:

```javascript
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
```

Again, we can change this to non-embedded by setting `{embedded: false}` to produce:

```javascript
{
  first_name: "The",
  last_name: "Queen",
  addresses: {
    123: true,
    456: true
  }
}
```

#### Storing additional data with a non-embedded relationship

By default the relationships are stored as `{id: true}`, but we can store information there too.

Lets say we have projects which have people as members and each member has an access level.

Because it's a `hasMany` relationship, we can't store the meta information for the relationship
on the model itself because that person object can belong to many different projects.

Instead we use a `MetaModel` which lets us store the information for this particular member.

```javascript
App.Project = FP.Model.extend({
  title: attr(),
  members: FP.hasMany("people", {embedded: false, as: "member"})
});

App.Member = FP.MetaModel.extend();
```

The JSON for this would now be something like:

```javascript
{
  title: "A project",
  members: {
    123: "admin",
    234: "member",
    345: "admin"
  }
}
```

The meta value is available on the meta model as `meta`:

```javascript
var member = project.get("firstObject");
member.get("meta"); => "admin"
```

To change this to something more descriptive, you can use `Ember.computed.alias`:

```javascript
App.Member = FP.MetaModel.extend({
  meta: Ember.computed.alias("accessLevel")
});
```

If you want to store more complex data on a relationship, you can give the `MetaModel` attributes
and relationships just like a normal model. All the same rules apply:

```javascript
App.Member = FP.MetaModel.extend({
  accessLevel: attr(),
  joinedAt: attr("date")
});
```

This would produce JSON like so:

```javascript
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
```

### Detached relationships

All the above examples assume that the associated object itself or its ID is stored with the parent,
but what if you want to store something completely separately? Here we can use detached relationships.

For example, lets say we stored people with their avatars completely separately in the tree because
we're storing the image data and we don't want to include that by default when we fetch a list of people.
We don't store the avatar ID with the person because maybe every person has an avatar, so the JSON's something like:

```javascript
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
```

We can model this like so:

```javascript
App.Person = FP.Model.extend({
  name: attr(),
  avatar: FP.hasOne("avatar", {detached: true})
});
```

By default this then looks for the avatar at `/avatars/{{id}}`, we'll look at how to change that later
should you want to store things in a different place.

Detached hasMany relationships are specified in a similar way, say a task can be assigned to multiple
people, but we want to be able to list them for a specific person. We could set this up in Firebase like so:

```javascript
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
```

Here we've got a list of people, a list of tasks and an index which maps each person to their tasks.

We can model this like so:

```javascript
App.Task = FP.Model.extend({
  title: attr(),
  assignees: FP.hasMany("people")
});

App.Person = FP.Model.extend({
  name: attr(),
  tasks: FP.hasMany("tasks", {detached: true, path: "tasks_by_person/%@"})
});
```

If the given `path` is a string, as it is here, it's run through Ember.String.fmt with the object's ID and
is appended to the model's root firebase path.

For complete control over the path you can provide a function and return either a string or a Firebase
reference:

```javascript
App.Person = FP.Model.extend({
  tasks: FP.hasMany("tasks", {
    detached: true,
    path: function() {
      return this.get("project").buildFirebaseReference().
        child("tasks/by-person").
        child(this.get("id"));
    }
  })
});
```

A detached hasMany is assumed to be an indexed collection, as opposed to a collection of the items itself.

## Priorities

If a model has a `priority` property, then that's used when saving to Firebase.

For example, lets say we want to order all people by their full name, last name first:

```javascript
App.Person = FP.Model.extend({
  firstName: attr(),
  lastName: attr(),
  priority: function(){
    return [this.get("firstName"), this.get("lastName")].join(" ").toLowerCase();
  }.property("firstName", "lastName")
})
```

Note that the priority here is a normal Ember property and not an `FP.attr`. That's because we're not
storing it as an attribute in the JSON.

The same applies to a `MetaModel` so you can order items in an indexed list.

For example, lets order a list of members by the date they were added to a project:

```javascript
App.Person = FP.Model.extend({
  firstName: attr(),
  lastName: attr()
})

App.Project = FP.Model.extend({
  title: attr(),
  members: hasMany("people", {as: "member"})
})

App.Member = FP.MetaModel.extend({
  createdAt: attr("date"),

  priority: function(){
    return this.get("createdAt").toISOString();
  }.property("createdAt")
})
```

## Customising where data is stored

By default Fireplace assumes that non-embedded records will be stored at the root of your store's Firebase reference
with each model type stored under its pluralized underscored name.

Embedded records are stored relative to their parent records.

For example, each `App.Person` is stored at `/people/id`.

To customise this you can override the `firebasePath` property on the model's class.

Let's change `App.Person` to store its data at `/member/profiles` instead of `/people`:

```javascript
App.Person.reopenClass({
  firebasePath: "member/profiles"
});
```

For more advanced customisations, you can set `firebasePath` to be a function.

Lets say we store each person under the project they are a member of, eg `/projects/123/people/456`:

```javascript
App.Person.reopenClass({
  firebasePath: function(options) {
    var projectID = options.get("project.id");
    return "projects/"+projectID+"/people";
  }
})
```

In this case, whenever we look for a person we'll need to provide the project and the model should have
a project property so that it knows where it is to be saved to.

```javascript
this.store.fetch("person", {project: someProject});
```

## Custom collections

There are two types of collection built in:

* `FP.ObjectCollection` - returned from finders and hasMany embedded relationships
* `FP.IndexedCollection` - returned from hasMany non-embedded / detached relationships

You can create a custom collection by extending either of these as a starting point.

For example, lets make a collection of objects which sets a random priority when items are added:

```javascript
App.RandomCollection = FP.ObjectCollection.extend({

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
```

We can now use this in queries:

```javascript
this.store.fetch("person", {collection: "random"})
```

and in relationships:

```javascript
App.Person = FP.Model.extend({
  tasks: hasMany("tasks", {collection: "random"})
});
```

## Ember Inspector

Fireplace supports the [Chrome Ember Inspector](https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi?hl=en)

## Building Fireplace

Fireplace uses [node.js](http://nodejs.org/) and [grunt](http://gruntjs.com/) as a build system,
These two libraries will need to be installed before building.

To build Fireplace, clone the repository, and run `npm install` to install build dependencies
and `grunt` to build the library.

Unminified and minified builds of Fireplace will be placed in the `dist`
directory.

## How to Run Unit Tests

### Setup

Fireplace uses [node.js](http://nodejs.org/) and [grunt](http://gruntjs.com/) as a build system
and test runner, and [bower](http://bower.io/) for dependency management.

If you have not used any of these tools before, you will need to run `npm install -g bower` and
`npm install -g grunt-cli` to be able to use them.

To test Fireplace run `npm install` to install build dependencies, `bower install` to install the
runtime dependencies and `grunt test` to execute the test suite headlessly via phantomjs.

If you prefer to run tests in a browser, you may start a development server using
`grunt develop`. Tests are available at http://localhost:8000/tests