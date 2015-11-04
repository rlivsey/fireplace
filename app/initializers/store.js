export default {
  name: 'fireplace:inject-store',

  initialize(container, application) {
    application.inject('controller',   'store', 'service:store');
    application.inject('route',        'store', 'service:store');
    application.inject('data-adapter', 'store', 'service:store');
    application.inject('collection',   'store', 'service:store');
    application.inject('component',    'store', 'service:store');
  }
};