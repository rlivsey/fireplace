# CHANGELOG

## Master

## v0.2.3

* Fix Model#toFirebaseJSON for Ember 1.8.0

## v0.2.2

* pass Model#firebasePath function result through path expansion
* add Model#firebasePathOptions to more easily change options passed to firebasePath

## v0.2.1

* Fix race condition when listening to firebase

## v0.2.0

* Added `fetch` to collections to return a promise which resolves when their content is fully loaded
* Store fetch for query now waits for content to be loaded instead of just a collection's index

## v0.1.1

* exported transforms under app namespace

## v0.1.0

* Converted to Ember CLI addon
* Converted to ES6 modules
* Changed store injection initializer name to 'fireplace:inject-store'