var DataStore = (function () {
  var PREFIX = 'aiDept_';

  function _getKey(collection) {
    return PREFIX + collection;
  }

  function _read(collection) {
    var raw = localStorage.getItem(_getKey(collection));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function _write(collection, data) {
    localStorage.setItem(_getKey(collection), JSON.stringify(data));
  }

  function _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function getAll(collection) {
    return _read(collection) || [];
  }

  function getById(collection, id) {
    var items = getAll(collection);
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  function getObject(collection) {
    return _read(collection) || {};
  }

  function setObject(collection, obj) {
    _write(collection, obj);
  }

  function create(collection, item) {
    var items = getAll(collection);
    var newItem = Object.assign({}, item, { id: _generateId() });
    items.push(newItem);
    _write(collection, items);
    return newItem;
  }

  function update(collection, id, updates) {
    var items = getAll(collection);
    var updated = items.map(function (item) {
      if (item.id === id) {
        return Object.assign({}, item, updates);
      }
      return item;
    });
    _write(collection, updated);
    return getById(collection, id);
  }

  function remove(collection, id) {
    var items = getAll(collection);
    var filtered = items.filter(function (item) {
      return item.id !== id;
    });
    _write(collection, filtered);
  }

  function seed(collection, data, force) {
    var existing = _read(collection);
    if (!existing || force) {
      _write(collection, data);
    }
  }

  function seedObject(collection, data, force) {
    var existing = _read(collection);
    if (!existing || force) {
      _write(collection, data);
    }
  }

  function count(collection) {
    return getAll(collection).length;
  }

  function exportAll() {
    var result = {};
    var keys = ['notices', 'professors', 'curriculum', 'gallery', 'stats', 'contact'];
    keys.forEach(function (key) {
      var raw = localStorage.getItem(_getKey(key));
      if (raw) {
        result[key] = JSON.parse(raw);
      }
    });
    return result;
  }

  function importAll(data) {
    Object.keys(data).forEach(function (key) {
      _write(key, data[key]);
    });
  }

  function clearAll() {
    var keys = ['notices', 'professors', 'curriculum', 'gallery', 'stats', 'contact', 'admin'];
    keys.forEach(function (key) {
      localStorage.removeItem(_getKey(key));
    });
  }

  function getStorageSize() {
    var total = 0;
    var keys = ['notices', 'professors', 'curriculum', 'gallery', 'stats', 'contact', 'admin'];
    keys.forEach(function (key) {
      var raw = localStorage.getItem(_getKey(key));
      if (raw) {
        total += raw.length * 2;
      }
    });
    return total;
  }

  return {
    getAll: getAll,
    getById: getById,
    getObject: getObject,
    setObject: setObject,
    create: create,
    update: update,
    remove: remove,
    seed: seed,
    seedObject: seedObject,
    count: count,
    exportAll: exportAll,
    importAll: importAll,
    clearAll: clearAll,
    getStorageSize: getStorageSize
  };
})();
