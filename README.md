# :mag_right::cyclone: another-rollup-watch

[![Build Status](https://ci.appveyor.com/api/projects/status/gbly7xetfdom66n9/branch/master?svg=true)](https://ci.appveyor.com/project/pqml/another-rollup-watch/branch/master)
[![Build Status](https://secure.travis-ci.org/pqml/another-rollup-watch.svg?branch=master)](https://travis-ci.org/pqml/another-rollup-watch)

<br>

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
npm install -S another-rollup-watch
```

To use this fork with the Rollup CLI, see [Usage with the Rollup CLI](#usage-with-the-rollup-cli)

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
In-memory bundles and sourcemaps (if needed) are passed through the `event.files` object, at the `BUILD_END` event.

#### `event.files[targetPath]`
`String` <br>
Content of the output file wich has `targetPath` as path.
<br>

#### In-memory sourcemaps
If `options.sourceMap` is set to true, the sourceMap will be available in `event.files` as well. <br>
If `options.sourceMap` is set to inline, another-rollup-watch will automaticly add sourcemap into the bundled files.

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

#### Bundle only in memory and console.log bundled files
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
            const files = event.files;
            for (let dest in files) {
                console.log('File path:', dest);
                console.log('File content:', files[dest]);
            }
            break;
    }
});
```

<br>

## Usage with the Rollup CLI

With npm (and [yarn](https://github.com/yarnpkg) too), you can install a package directly from its github repo. The package will take the name of the repo. I made a "alias" of `another-rollup-watch` called `rollup-watch` so you can use that behaviour. ([→ see the rollup-watch gist](https://gist.github.com/pqml/5a8d9d6acc1d18e04b8fd9d22f3ca046))

#### Installation from the github repo

##### Using SSH (recommanded)
```sh
npm i -S gist:5a8d9d6acc1d18e04b8fd9d22f3ca046
```

##### Force the usage of HTTPS
```sh
npm i -S git+https://gist.github.com/pqml/5a8d9d6acc1d18e04b8fd9d22f3ca046
```

This way you can continue to use `rollup -c -w`. Rollup will use the "fake" `rollup-watch` insteand of the original one.

<br>

## License
MIT
