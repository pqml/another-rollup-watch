const assert = require( 'assert' );
const sander = require( 'sander' );
const rollup = require( 'rollup' );
const watch = require( '..' );

describe('another-rollup-watch', () => {
  beforeEach(() => sander.rimraf('test/_tmp'));

  function run (file) {
    const resolved = require.resolve(file);
    delete require.cache[resolved];
    return require(resolved);
  }

  function sequence (watcher, events) {
    return new Promise((fulfil, reject) => {
      function go (event) {
        const next = events.shift();
        if (!next) {

          fulfil();

        } else if (typeof next === 'string') {

          watcher.once('event', event => {
            if (event.code !== next) {
              reject(new Error(`Expected ${next} event, got ${event.code}`));
            } else {
              go(event);
            }
          });

        } else {

          Promise.resolve()
            .then(() => next(event))
            .then(go)
            .catch(reject);
        }
      }

      go();
    });
  }

  it('watches a file', () => {
    return sander.copydir('test/fixtures/basic').to('test/_tmp/basic').then(() => {
      const watcher = watch(rollup, {
        entry: 'test/_tmp/basic/main.js',
        dest: 'test/_tmp/basic/bundle.js',
        format: 'cjs'
      });

      return sequence(watcher, [
        'BUILD_START',
        'BUILD_END',
        () => {
          assert.equal(run('./_tmp/basic/bundle.js' ), 42);
          sander.writeFileSync('test/_tmp/basic/main.js', 'export default 43;');
        },
        'BUILD_START',
        'BUILD_END',
        () => {
          assert.equal(run('./_tmp/basic/bundle.js'), 43);
          watcher.close();
        }
      ]);
    });
  });

  it('watches a dependency', () => {
    return sander.copydir('test/fixtures/dep').to('test/_tmp/dep').then(() => {

      const watcher = watch(rollup, {
        entry: 'test/_tmp/dep/main.js',
        dest: 'test/_tmp/dep/bundle.js',
        format: 'cjs'
      });

      return sequence(watcher, [
        'BUILD_START',
        'BUILD_END',
        () => {
          assert.equal(run('./_tmp/dep/bundle.js' ), 42);
          sander.writeFileSync('test/_tmp/dep/dep.js', 'export default 43;');
        },
        'BUILD_START',
        'BUILD_END',
        () => {
          assert.equal(run('./_tmp/dep/bundle.js'), 43);
          watcher.close();
        }
      ]);

    });
  });

  it('recovers from an error', () => {
    return sander.copydir('test/fixtures/basic' ).to('test/_tmp/basic').then(() => {
      const watcher = watch(rollup, {
        entry: 'test/_tmp/basic/main.js',
        dest: 'test/_tmp/basic/bundle.js',
        format: 'cjs'
      });

      return sequence(watcher, [
        'BUILD_START',
        'BUILD_END',
        () => {
          assert.equal(run( './_tmp/basic/bundle.js' ), 42);
          sander.writeFileSync('test/_tmp/basic/main.js', 'export nope;');
        },
        'BUILD_START',
        'ERROR',
        () => {
          sander.writeFileSync('test/_tmp/basic/main.js', 'export default 43;');
        },
        'BUILD_START',
        'BUILD_END',
        () => {
          assert.equal(run( './_tmp/basic/bundle.js'), 43);
          watcher.close();
        }
      ]);

    });
  });

  it('refuses to watch the output file (#15)', () => {
    return sander.copydir('test/fixtures/basic').to( 'test/_tmp/basic').then(() => {
      const watcher = watch(rollup, {
        entry: 'test/_tmp/basic/main.js',
        dest: 'test/_tmp/basic/bundle.js',
        format: 'cjs'
      });

      return sequence(watcher, [
        'BUILD_START',
        'BUILD_END',
        () => {
          assert.equal(run('./_tmp/basic/bundle.js' ), 42);
          sander.writeFileSync('test/_tmp/basic/main.js', `import './bundle.js'`);
        },
        'BUILD_START',
        'ERROR',
        event => {
          assert.equal(event.error.message, 'Cannot import the generated bundle');
          sander.writeFileSync('test/_tmp/basic/main.js', 'export default 43;');
        },
        'BUILD_START',
        'BUILD_END',
        () => {
          assert.equal(run( './_tmp/basic/bundle.js'), 43);
          watcher.close();
        }
      ]);
    });
  });

  it('allows to watch the output file when serving only in memory', () => {
    return sander.copydir('test/fixtures/basic').to( 'test/_tmp/basic').then(() => {
      const watcher = watch(rollup, {
        entry: 'test/_tmp/basic/main.js',
        dest: 'test/_tmp/basic/main.js',
        format: 'cjs',
        watch: {
          inMemory: true,
          write: false
        }
      });

      return sequence(watcher, [
        'BUILD_START',
        'BUILD_END',
        () => {
          watcher.close();
        }
      ]);
    });
  });

  it('doesn\'t watches a removed dependency', () => {
    return sander.copydir('test/fixtures/dep').to('test/_tmp/dep').then(() => {
      const watcher = watch( rollup, {
        entry: 'test/_tmp/dep/main.js',
        dest: 'test/_tmp/dep/bundle.js',
        format: 'cjs'
      });

      return sequence( watcher, [
        'BUILD_START',
        'BUILD_END',
        () => {
          assert.equal(run( './_tmp/dep/bundle.js' ), 42);
          sander.writeFileSync('test/_tmp/dep/main.js', 'export default 43;');
        },
        'BUILD_START',
        'BUILD_END',
        () => {
          assert.equal(run('./_tmp/dep/bundle.js'), 43);
          sander.writeFileSync('test/_tmp/dep/dep.js', 'export default 44;');
        },
        () => {
          return new Promise((resolve, reject) => {
            let timer = setTimeout(() => resolve(), 250);
            watcher.once('event', event => {
              if (event.code === 'BUILD_START') {
                clearTimeout(timer);
                reject(new Error('Continue to watch the dependency'));
              }
            });
          });
        },
        () => {
          watcher.close();
        }
      ]);
    });
  });

  it('builds in memory', () => {
    return sander.copydir( 'test/fixtures/basic' ).to( 'test/_tmp/basic' ).then(() => {

      const watcher = watch( rollup, {
        entry: 'test/_tmp/basic/main.js',
        dest: 'test/_tmp/basic/bundle.js',
        format: 'cjs',
        watch: {
          inMemory: true,
          write: false
        }
      });

      return sequence(watcher, [
        'BUILD_START',
        'BUILD_END',
        event => {
          assert(event.bundles !== undefined, 'No in-memory support');
          assert.equal(event.bundles['test/_tmp/basic/bundle.js'].code,
            '\'use strict\';\n\nvar main = 42;\n\nmodule.exports = main;\n');
          watcher.close();
        }
      ]);
    });
  });

  it('builds multiple targets in memory', () => {
    return sander.copydir('test/fixtures/multiple').to('test/_tmp/multiple').then(() => {
      const watcher = watch(rollup, {
        entry: 'test/_tmp/multiple/main.js',
        targets: [
          { dest: 'test/_tmp/multiple/bundle.cjs.js', format: 'cjs' },
          { dest: 'test/_tmp/multiple/bundle.es.js', format: 'es' }
        ],
        watch: {
          inMemory: true,
          write: false
        }
      });

      return sequence(watcher, [
        'BUILD_START',
        'BUILD_END',
        (event) => {
          assert(event.bundles !== undefined, 'No in-memory support');
          assert.equal(event.bundles['test/_tmp/multiple/bundle.cjs.js'].code,
            '\'use strict\';\n\nconsole.log(\'test\');\n');
          assert.equal(event.bundles['test/_tmp/multiple/bundle.es.js'].code,
            'console.log(\'test\');\n');
        }
      ]);
    });
  });

});
