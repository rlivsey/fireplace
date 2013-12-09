require('fireplace/transforms');
require('fireplace/store');
require('fireplace/debug');

Ember.onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name: 'store',

    initialize: function(container, application) {
      application.register('store:main', application.Store || FP.Store);

      // Eagerly generate the store so defaultStore is populated.
      // TODO: Do this in a finisher hook
      container.lookup('store:main');
    }
  });

  Application.initializer({
    name: 'transforms',

    initialize: function(container, application) {
      application.register('transform:boolean',   FP.BooleanTransform);
      application.register('transform:date',      FP.DateTransform);
      application.register('transform:timestamp', FP.TimestampTransform);
      application.register('transform:number',    FP.NumberTransform);
      application.register('transform:hash',      FP.HashTransform);
      application.register('transform:string',    FP.StringTransform);
    }
  });

  Application.initializer({
    name: 'dataAdapter',

    initialize: function(container, application) {
      application.register('dataAdapter:main', FP.DebugAdapter);
    }
  });

  Application.initializer({
    name: 'collections',

    initialize: function(container, application) {
      application.register('collection:object',  FP.ObjectCollection);
      application.register('collection:indexed', FP.IndexedCollection);
    }
  });

  Application.initializer({
    name: 'injectStore',

    initialize: function(container, application) {
      application.inject('controller',  'store', 'store:main');
      application.inject('route',       'store', 'store:main');
      application.inject('dataAdapter', 'store', 'store:main');
      application.inject('collection',  'store', 'store:main');
      application.inject('component',   'store', 'store:main');
    }
  });

});
