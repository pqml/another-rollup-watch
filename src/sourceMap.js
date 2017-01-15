'use strict';

function toString (sourcemap) {
  return JSON.stringify(sourcemap);
}

function toUrl (sourcemap) {
  const b64 = new Buffer(toString(sourcemap)).toString('base64');
  return 'data:application/json;charset=utf-8;base64,' + b64;
}

module.exports = {
  toString,
  toUrl
};
