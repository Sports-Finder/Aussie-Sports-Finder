/**
 * Patches react-native's DOMRectReadOnly.js to remove private class fields
 * (#x, #y, #width, #height) which hermesc on the iOS 26 SDK rejects with
 * "private properties are not supported".
 *
 * The replacement is plain JavaScript with no Flow/TypeScript annotations so
 * hermesc receives clean bytecode regardless of Babel configuration.
 *
 * Runs automatically via the `postinstall` script so EAS always applies it
 * after `pnpm install`.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Locate the react-native package root regardless of pnpm store layout.
let rnRoot;
try {
  rnRoot = path.dirname(require.resolve('react-native/package.json'));
} catch (e) {
  console.log('[patch-react-native] react-native not found, skipping patch.');
  process.exit(0);
}

const targetFile = path.join(
  rnRoot,
  'src/private/webapis/geometry/DOMRectReadOnly.js'
);

if (!fs.existsSync(targetFile)) {
  console.log('[patch-react-native] DOMRectReadOnly.js not found, skipping patch.');
  process.exit(0);
}

const original = fs.readFileSync(targetFile, 'utf8');

// Already patched (idempotent).
if (!original.includes('#x')) {
  console.log('[patch-react-native] DOMRectReadOnly.js already patched, skipping.');
  process.exit(0);
}

// Plain JavaScript — no Flow annotations, no private class fields.
// Semantically identical to the original for all RN internal callers.
const patched = `/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Patched by scripts/patch-react-native.js — private class fields replaced
 * with plain properties so hermesc on the iOS 26 SDK can compile the file.
 *
 * @format
 */

import {setPlatformObject} from '../webidl/PlatformObjects';

function castToNumber(value) {
  return value ? Number(value) : 0;
}

export default class DOMRectReadOnly {
  constructor(x, y, width, height) {
    this._x = 0;
    this._y = 0;
    this._width = 0;
    this._height = 0;
    this._x = castToNumber(x);
    this._y = castToNumber(y);
    this._width = castToNumber(width);
    this._height = castToNumber(height);
  }

  get x() { return this._x; }
  get y() { return this._y; }
  get width() { return this._width; }
  get height() { return this._height; }

  get top() {
    var height = this._height;
    var y = this._y;
    return height < 0 ? y + height : y;
  }

  get right() {
    var width = this._width;
    var x = this._x;
    return width < 0 ? x : x + width;
  }

  get bottom() {
    var height = this._height;
    var y = this._y;
    return height < 0 ? y : y + height;
  }

  get left() {
    var width = this._width;
    var x = this._x;
    return width < 0 ? x + width : x;
  }

  toJSON() {
    var x = this.x;
    var y = this.y;
    var width = this.width;
    var height = this.height;
    var top = this.top;
    var left = this.left;
    var bottom = this.bottom;
    var right = this.right;
    return {x: x, y: y, width: width, height: height, top: top, left: left, bottom: bottom, right: right};
  }

  static fromRect(rect) {
    if (!rect) { return new DOMRectReadOnly(); }
    return new DOMRectReadOnly(rect.x, rect.y, rect.width, rect.height);
  }

  __getInternalX() { return this._x; }
  __getInternalY() { return this._y; }
  __getInternalWidth() { return this._width; }
  __getInternalHeight() { return this._height; }

  __setInternalX(x) { this._x = castToNumber(x); }
  __setInternalY(y) { this._y = castToNumber(y); }
  __setInternalWidth(width) { this._width = castToNumber(width); }
  __setInternalHeight(height) { this._height = castToNumber(height); }
}

setPlatformObject(DOMRectReadOnly, {
  clone: function(rect) {
    return new DOMRectReadOnly(rect.x, rect.y, rect.width, rect.height);
  },
});
`;

fs.writeFileSync(targetFile, patched, 'utf8');
console.log('[patch-react-native] Patched DOMRectReadOnly.js successfully.');
