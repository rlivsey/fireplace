(function(){

  var App, container;

  /**
    These tests ensure that Fireplace works with Ember.js' Application
    initialization and dependency injection APIs.
  */

  module("integration/Application - Injecting a Custom Store", {
    setup: function() {
      Ember.run(function() {
        App = Ember.Application.create({
          Store: FP.Store.extend({ isCustom: true }),
          FooController: Ember.Controller.extend(),
          ApplicationView: Ember.View.extend(),
          BazController: {},
          ApplicationController: Ember.View.extend()
        });
        App.setupForTesting();
      });

      container = App.__container__;
    },

    teardown: function() {
      Ember.run(function() {
        App.destroy();
      });
      Ember.BOOTED = false;
    }
  });

  test("If a Store property exists on an Ember.Application, it should be instantiated.", function() {
    ok(container.lookup('store:main').get('isCustom'), "the custom store was instantiated");
  });

  test("If a store is instantiated, it should be made available to each controller.", function() {
    var fooController = container.lookup('controller:foo');
    ok(fooController.get('store.isCustom'), "the custom store was injected");
  });

  module("integration/application - Injecting the Default Store", {
    setup: function() {
      Ember.run(function() {
        App = Ember.Application.create({
          FooController: Ember.Controller.extend(),
          ApplicationView: Ember.View.extend(),
          BazController: {},
          ApplicationController: Ember.View.extend()
        });
        App.setupForTesting();
      });

      container = App.__container__;
    },

    teardown: function() {
      Ember.run(function() {
        App.destroy();
      });
      Ember.BOOTED = false;
    }
  });

  test("If a Store property exists on an Ember.Application, it should be instantiated.", function() {
    ok(container.lookup('store:main') instanceof FP.Store, "the store was instantiated");
  });

  test("If a store is instantiated, it should be made available to each controller.", function() {
    var fooController = container.lookup('controller:foo');
    ok(fooController.get('store') instanceof FP.Store, "the store was injected");
  });

  test("the FP namespace should be accessible", function() {
    ok(Ember.Namespace.byName('FP') instanceof Ember.Namespace, "the FP namespace is accessible");
  });

})();