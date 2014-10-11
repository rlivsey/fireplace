import Model   from './model/model';
import attr    from './model/attr';
import hasOne  from './relationships/has-one';
import hasMany from './relationships/has-many';
import Store   from './store';

import Collection         from './collections/base';
import ObjectCollection   from './collections/object';
import IndexedCollection  from './collections/indexed';


export {
  Model,
  attr,
  hasOne,
  hasMany,
  Store,
  Collection,
  ObjectCollection,
  IndexedCollection
};

export default Model;