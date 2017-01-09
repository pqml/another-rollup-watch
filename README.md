# another-rollup-watch
This is a fork of [rollup/rollup-watch](http://github.com/rollup/rollup-watch).

## Features added
* _Not really a feature_ - chokidar is not optional
* Chokidar opt `usePolling` to `true` by default on Windows and Linux
* Use one Chokidar instance for all the watched files
* Stop watching a file if it's not a dependency anymore
* Remove `require-relative` from the dependencies
* Add some tests 

## Todo
* Proper `watch` object in the options passed to rollup-watch
* Add in-memory builds capability through the `watch` object