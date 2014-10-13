# Fireplace

Fireplace is an [Ember.js](http://emberjs.com) addon for [Firebase](http://firebase.com).

[![Build Status](https://travis-ci.org/rlivsey/fireplace.svg?branch=master)](https://travis-ci.org/rlivsey/fireplace)

## Installation

Install as an Ember CLI addon:

```
npm install --save-dev fireplace
```

Then run the generator to install dependencies (Firebase from Bower):

```
ember generate fireplace
```

## Quick Example

```javascript
// app/models/person.js
import {Model, attr, hasOne, hasMany} from 'fireplace';

export default Model.extend({
  firstName: attr(),
  lastName: attr(),
  age: attr("number"),
  avatar: hasOne()  
});
```

```javascript
// app/routes/people.js
import Ember from 'ember';
export default Ember.Route.extend({
  model: function() {
    // list all people
    return this.store.fetch("person");
  }
});
```

```javascript
// app/routes/person.js
import Ember from 'ember';
export default Ember.Route.extend({
  model: function(params) {
    return this.store.fetch("person", params.person_id);
  }
});
```

See the [documentation](http://livsey.org/fireplace) for more details.

### Development

## Installation

* `git clone` this repository
* `npm install`
* `bower install`

## Running

* `ember server`
* Visit your app at http://localhost:4200.

## Running Tests

* `ember test`
* `ember test --server`

## Building

* `ember build`

For more information on using ember-cli, visit [http://www.ember-cli.com/](http://www.ember-cli.com/).
