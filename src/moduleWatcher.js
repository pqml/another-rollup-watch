const os = require('os');
const path = require('path');
const fs = require('fs');
const Emitter = require('events');
const chokidar = require('chokidar');

const defaultOpts = {
  ignoreInitial: true,
  usePolling: os.platform() !== 'darwin'
  //cwd: process.cwd()
};

function moduleWatcher (userOpts) {
  const api = new Emitter();
  api.isWatching = isWatching;
  api.setDests = setDests;
  api.update = update;
  api.close = close;

  const opts = Object.assign({}, defaultOpts, userOpts || {});
  let watched = {};
  let cachedCode = {};
  let dests = [];
  let created = false;
  let closed = false;
  let watcher = null;

  return api;

  function onWatch (event, modulePath) {
    modulePath = path.resolve(opts.cwd, modulePath);
    const modules = watched[modulePath];
    if (!modules) return;
    if (event === 'rename' || event === 'unlink') {
      remove(modulePath);
      api.emit('watch');
    } else {
      fs.readFile(modulePath, 'utf-8', (err, data) => {
        //if (err) {} // TODO: handle error
        let changed = false;
        modules.forEach(moduleId => {
          if (cachedCode[moduleId] && cachedCode[moduleId] !== data) {
            changed = true;
            cachedCode[moduleId] = data;
          }
        });
        if (changed) api.emit('watch');
      });
    }
  }

  function initWatcher (firstPathToWatch) {
    if (created) return;
    watcher = chokidar.watch(firstPathToWatch, opts);
    watcher.on('all', onWatch);
    created = true;
  }

  function createNewWatchedList (bundle) {
    let newWatched = {};
    let newCachedCode = {};
    let promises = [];
    for (let i = 0; i < bundle.modules.length; i++) {
      promises.push(new Promise((resolve, reject) => {
        const moduleObj = bundle.modules[i];
        const id = moduleObj.id;

        // throw error if module file is one of the entry file
        if (dests.indexOf(id) !== -1) {
          return reject(new Error('Cannot import the generated bundle'));
        }

        // skip plugin helper module
        if (/\0/.test(id)) return resolve();

        fs.realpath(id, (err, modulePath) => {
          // file doesn't "physically" exist, don't add it
          if (err) return resolve();

          // add module to the newWatched object
          if (!newWatched[modulePath]) newWatched[modulePath] = [];
          if (newWatched[modulePath].indexOf(id) === -1) {
            newWatched[modulePath].push(id);
          }

          // add code of the module to the newCachedCode object
          if (!newCachedCode[id]) {
            newCachedCode[id] = moduleObj.originalCode;
          }

          return resolve();
        });
      }));
    }
    return new Promise((resolve, reject) => {
      Promise.all(promises)
        .then(() => {
          // update cachedCode object
          cachedCode = newCachedCode;
          resolve(newWatched);
        })
        .catch(reject);
    });
  }

  function update (bundle) {
    return new Promise((resolve, reject) => {
      createNewWatchedList(bundle)
        .then((newWatched) => {
          // remove modules from watched that are not used anymore
          for (let rpath in watched) {
            watched[rpath] = watched[rpath].filter(moduleId => {
              if (newWatched[rpath]) {
                const indexInNewWatched = newWatched[rpath].indexOf(moduleId);
                if (indexInNewWatched !== -1) {
                  // remove from newWatched to keep only non-watched modules
                  newWatched[rpath].splice(indexInNewWatched, 1);
                  return true;
                }
              }
              return false;
            });
          }

          // add new modules in watched
          for (let rpath in newWatched) {
            // skip empty newWatched items (nothing changed since last bundle)
            if (newWatched[rpath].length === 0) continue;
            // if rpath isn't watched, add it in watched object and watch it
            if (!watched[rpath]) add(rpath);
            watched[rpath] = watched[rpath].concat(newWatched[rpath]);
          }

          // stop watching unused files
          for (let rpath in watched) {
            if (watched[rpath].length === 0) {
              remove(rpath);
            }
          }
          resolve(bundle);
        })
        .catch(reject);
    });
  }

  function setDests (_dests) {
    dests = _dests || [];
  }

  function isWatching () {
    return created;
  }

  function add (modulePath) {
    if (watched[modulePath]) return;
    if (!created) initWatcher(modulePath);
    else watcher.add(modulePath);
    watched[modulePath] = [];
  }

  function remove (modulePath) {
    if (!watched[modulePath]) return;
    watcher.unwatch(modulePath);
    delete watched[modulePath];
  }

  function close () {
    if (closed) return;
    if (created) watcher.close();
    closed = true;
  }
}

module.exports = moduleWatcher;
