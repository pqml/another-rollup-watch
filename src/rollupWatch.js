const path = require('path');
const Emitter = require('events');
const createModuleWatcher = require('./moduleWatcher');
const sourceMap = require('./sourceMap');

const defaultOpts = {
  chokidar: {},
  inMemory: false,
  write: true
};

function watch (rollup, _options) {
  const watcher = new Emitter();
  watcher.close = close;

  const options = Object.assign({}, _options || {});
  const watchOptions = Object.assign({}, defaultOpts, options.watch || {});
  if (options.watch) delete options.watch;

  const dests = options.dest
    ? [path.resolve(options.dest)]
    : options.targets.map(target => path.resolve(target.dest));

  const moduleWatcher = createModuleWatcher(watchOptions || {});
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

  function createInMemory (bundle, opts) {
    const res = bundle.generate(opts);
    let inMemoryNewFiles = {};
    let code = res.code;

    if (opts.sourceMap === true) {
      const mapPath = opts.sourceMapFile || opts.dest + '.map';
      code += '\n//# sourceMappingURL=' + mapPath;
      inMemoryNewFiles[mapPath] = sourceMap.toString(res.map);
    } else if (opts.sourceMap === 'inline') {
      code += '\n//# sourceMappingURL=' + sourceMap.toUrl(res.map);
    }

    inMemoryNewFiles[opts.dest] = code;
    return inMemoryNewFiles;
  }

  function build () {
    if (building || closed) return;
    rebuildScheduled = false;

    const start = Date.now();
    const initial = !moduleWatcher.isWatching();
    const inMemoryFiles = {};
    const buildOpts = Object.assign({}, options);

    if (cache) buildOpts.cache = cache;

    // start building - emit the BUILD_START event
    watcher.emit('event', { code: 'BUILD_START'});
    building = true;

    // rollup
    rollup.rollup(buildOpts)

      // put the new bundle in cache
      .then(bundle => {
        cache = bundle;
        return Promise.resolve(bundle);
      })

      // update (add and remove) the list of watched modules
      .then(bundle => closed
        ? Promise.resolve(bundle)
        : moduleWatcher.update(bundle))

      // write target files
      .then(bundle => {
        return new Promise((resolve, reject) => {

          // multiple output destinations
          if (buildOpts.targets) {
            let p = [];
            for (let i = 0; i < buildOpts.targets.length; i++) {
              const targetOpts = buildOpts.targets[i];
              const mergedOpts = Object.assign({}, buildOpts, targetOpts);
              if (watchOptions.inMemory) {
                const newInMemoryFiles = createInMemory(bundle, mergedOpts);
                Object.assign(inMemoryFiles, newInMemoryFiles);
              }
              if (watchOptions.write) {
                p.push(bundle.write(mergedOpts));
              }
            }
            Promise.all(p)
              .then(() => resolve(bundle))
              .catch(reject);

          // single output destination
          } else if (buildOpts.dest) {
            if (watchOptions.inMemory) {
              const newInMemoryFiles = createInMemory(bundle, buildOpts);
              Object.assign(inMemoryFiles, newInMemoryFiles);
            }
            if (watchOptions.write) {
              bundle.write(buildOpts)
                .then(() => resolve(bundle))
                .catch(reject);
            } else {
              return resolve(bundle);
            }

          // if no destination, we don't bundle anything
          // maybe it's better to reject with an error ?
          } else {
            resolve(bundle);
          }
        });
      }, error => Promise.reject(error))

      // end building - emit BUILD_END or ERROR
      .then(() => {
        building = false;
        watcher.emit('event', {
          code: 'BUILD_END',
          duration: Date.now() - start,
          initial: initial,
          files: inMemoryFiles
        });
      }, error => {
        building = false;
        watcher.emit('event', {
          code: 'ERROR',
          error: error
        });
      })

      // direct rebuilding if a rebuild is scheduled
      .then(() => {
        if (rebuildScheduled && !closed) build();
      })

      // WIP - special event for handle internal rollup-watch errors
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
