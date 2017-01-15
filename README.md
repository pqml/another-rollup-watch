# :mag_right: another-rollup-watch
This is a fork of [rollup/rollup-watch](http://github.com/rollup/rollup-watch).

* [Features Added](#features-added)
* [Installation](#installation)
* [API Usage](#api-usage)
* [Examples](#examples)
* [Usage with the Rollup CLI](#usage-with-the-rollup-cli)
* [License](#license)


<br>

## Features Added
* _Not really a feature_ - chokidar is **not** optional
* Chokidar opt `usePolling` to `true` by default on Windows and Linux
* Use one Chokidar instance for all the watched files
* Stop watching a file if it's not a dependency anymore
* Remove `require-relative` from the dependencies
* in-memory builds capability (with sourcemap support)
* Add some tests

<br>

## Installation
```sh
npm install -S pqml/another-rollup-watch
```

<br>

## API Usage

### `const watcher = rollupWatch([opts])`

Sets up a new instance of `another-rollup-watch`. <br>
The return value is an event emitter.

#### Rollup options

rollupWatch use the same base options as the `rollup.rollup` function. <br>
See the [Javascript API of Rollup](https://github.com/rollup/rollup/wiki/JavaScript-API#rolluprollup-options-) to learn more about the options you can pass to Rollup.

#### watch 
`Object` <br>
Contains options for the watcher. See its options below. 

#### watch.inMemory
`Boolean` (_Default: `false`_) <br> 
If true, all target bundles will be serve in memory through the `BUILD_END` event response

#### watch.write
`Boolean` (_Default: `true`_) <br> 
If true, all target bundles will be writed on disk. Set this to `false` with `watch.inMemory` set to `true` to serve bundles in memory only.

#### watch.chokidar (_Default: see below_)
`Object`
Contains options passed to the `chokidar` instance. See the [Chokidar API](https://github.com/paulmillr/chokidar#api) for more informations.
By default, `usePolling` is set to **false on osx** and to **true on windows and linux**. `ignoreInitial` is set to true.

### In-memory bundles
In-memory bundles are passed through the `event.bundles` object, at the `BUILD_END` event.
Each element in `event.bundles` is an object representing one of the targets / dest passed to rollup.

* `event.bundles[target].code` code of the `target` bundle
* `event.bundles[target].map` sourcemap of the `target` bundle

<br>

## Examples

#### Watch entry file and console.log each watch event
```javascript
const rollupWatch = require('another-rollup-watch');

const watcher = rollupWatch({
  entry: 'src/main.js',
  dest: 'dist/bundle.js',
  format: 'cjs',
});

watcher.on('event', (event) => {
    switch (event.code) {
        case 'BUILD_START':
            console.log('Starting a new build...');
            break;
        case 'BUILD_END':
            console.log('Bundled in ' + event.duration + 'ms');
            break;
        case 'BUILD_ERROR':
            console.error('An error has occured!');
            break;
    }
});
```

#### Bundle only in memory and console.log bundled code
```javascript
const rollupWatch = require('another-rollup-watch');

const watcher = rollupWatch({
  entry: 'src/main.js',
  dest: 'dist/bundle.js',
  format: 'cjs',
  watch: {
    write: false,
    inMemory: true
  }
});

watcher.on('event', (event) => {
    switch (event.code) {
        case 'BUILD_END':
            console.log('Bundled in ' + event.duration + 'ms');
            const bundles = event.bundles;
            for (let dest in bundles) {
                console.log('Bundle dest path:', dest);
                console.log('Bundle code:', bundles[dest].code);
                console.log('Bundle sourcemap:', bundles[dest].map);
            }
            break;
    }
});
```

<br>

## Usage with the Rollup CLI

With npm (and [yarn](https://github.com/yarnpkg) too), you can install a package directly from its github repo. The package will take the name of the repo. You can use that behaviour so Rollup will see this `rollup-watch` as the [original rollup-watch by Rich Harris](https://github.com/rollup/rollup-watch).

#### Installation from the github repo

##### Using SSH (recommanded)
```sh
npm install -S pqml/rollup-watch
```

##### Force the usage of HTTPS
```sh
npm install -S git+https://github.com/pqml/rollup-watch.git
```

This way you can continue to use `rollup -c -w` to enable this fork with the Rollup CLI.

<br>

## License
MIT