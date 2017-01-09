const path = require('path');
const Emitter = require('events');
const createModuleWatcher = require('./moduleWatcher');

// const opts = { encoding: 'utf-8', persistent: true };

function watch (rollup, options) {
  const watcher = new Emitter();
  watcher.close = close;

  const dests = options.dest
    ? [path.resolve(options.dest)]
    : options.targets.map(target => path.resolve(target.dest));

  const moduleWatcher = createModuleWatcher(options.chokidarOpts || {});
  moduleWatcher.setDests(dests);
  moduleWatcher.on('watch', triggerRebuild);

  let rebuildScheduled = false;
  let building = false;
  let closed = false;

  let timeout;
  let cache;

  // build on next tick, so consumers can listen for BUILD_START
  process.nextTick(build);

  return watcher;

  function triggerRebuild () {
    clearTimeout(timeout);
    rebuildScheduled = true;

    timeout = setTimeout(() => {
      if (!building) build();
    }, 50);
  }

  function build () {
    if (building || closed) return;
    rebuildScheduled = false;

    const start = Date.now();
    const initial = !moduleWatcher.isWatching();

    const buildOpts = Object.assign({}, options);
    if (cache) buildOpts.cache = cache;

    watcher.emit('event', { code: 'BUILD_START'});

    building = true;

    rollup.rollup(buildOpts)
      .then(bundle => {
        cache = bundle;
        return Promise.resolve(bundle);
      })
      .then(bundle => closed
        ? Promise.resolve(bundle)
        : moduleWatcher.update(bundle))
      .then(bundle => {
        return new Promise((resolve, reject) => {
          if (buildOpts.targets) {
            let p = [];
            for (let i = 0; i < buildOpts.targets.length; i++) {
              const target = buildOpts.targets[i];
              const mergedOpts = Object.assign({}, buildOpts, target);
              p.push(bundle.write(mergedOpts));
            }
            Promise.all(p)
              .then(() => resolve(bundle))
              .catch(reject);
          } else if (buildOpts.dest) {
            bundle.write(buildOpts)
              .then(() => resolve(bundle))
              .catch(reject);
          } else { // todo: in-memory generation with bundle.generate().code
            resolve(bundle);
          }
        });
      }, error => Promise.reject(error))
      .then(() => {
        building = false;
        watcher.emit('event', {
          code: 'BUILD_END',
          duration: Date.now() - start,
          initial
        });
      }, error => {
        building = false;
        watcher.emit('event', {
          code: 'ERROR',
          error
        });
      })
      .then(() => {
        if (rebuildScheduled && !closed) build();
      })
      .catch(error => {
        watcher.emit('event', {
          code: 'WATCHER_ERROR',
          error
        });
      });
  }

  function close () {
    if (closed) return;
    moduleWatcher.close();
    closed = true;
  }
}

module.exports = watch;
