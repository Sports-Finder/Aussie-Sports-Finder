/**
 * Patches react-native's DOMRectReadOnly.js to remove private class fields
 * (#x, #y, #width, #height) which hermesc on the iOS 26 SDK rejects with
 * "private properties are not supported".
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

// Replace private class fields with underscore-prefixed regular properties.
// This is semantically identical for all callers in the RN codebase.
const patched = `/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Patched by scripts/patch-react-native.js to remove private class fields
 * (#x, #y, #width, #height) which hermesc on iOS 26 SDK does not support.
 *
 * @flow strict
 * @format
 */

import {setPlatformObject} from '../webidl/PlatformObjects';

// flowlint sketchy-null:off, unsafe-getters-setters:off

export interface DOMRectInit {
  x?: ?number;
  y?: ?number;
  width?: ?number;
  height?: ?number;
}

function castToNumber(value: mixed): number {
  return value ? Number(value) : 0;
}

export default class DOMRectReadOnly {
  _x: number;
  _y: number;
  _width: number;
  _height: number;

  constructor(x: ?number, y: ?number, width: ?number, height: ?number) {
    this._x = 0;
    this._y = 0;
    this._width = 0;
    this._height = 0;
    this.__setInternalX(x);
    this.__setInternalY(y);
    this.__setInternalWidth(width);
    this.__setInternalHeight(height);
  }

  get x(): number { return this._x; }
  get y(): number { return this._y; }
  get width(): number { return this._width; }
  get height(): number { return this._height; }

  get top(): number {
    const height = this._height;
    const y = this._y;
    return height < 0 ? y + height : y;
  }

  get right(): number {
    const width = this._width;
    const x = this._x;
    return width < 0 ? x : x + width;
  }

  get bottom(): number {
    const height = this._height;
    const y = this._y;
    return height < 0 ? y : y + height;
  }

  get left(): number {
    const width = this._width;
    const x = this._x;
    return width < 0 ? x + width : x;
  }

  toJSON(): {
    x: number,
    y: number,
    width: number,
    height: number,
    top: number,
    left: number,
    bottom: number,
    right: number,
  } {
    const {x, y, width, height, top, left, bottom, right} = this;
    return {x, y, width, height, top, left, bottom, right};
  }

  static fromRect(rect?: ?DOMRectInit): DOMRectReadOnly {
    if (!rect) return new DOMRectReadOnly();
    return new DOMRectReadOnly(rect.x, rect.y, rect.width, rect.height);
  }

  __getInternalX(): number { return this._x; }
  __getInternalY(): number { return this._y; }
  __getInternalWidth(): number { return this._width; }
  __getInternalHeight(): number { return this._height; }

  __setInternalX(x: ?number) { this._x = castToNumber(x); }
  __setInternalY(y: ?number) { this._y = castToNumber(y); }
  __setInternalWidth(width: ?number) { this._width = castToNumber(width); }
  __setInternalHeight(height: ?number) { this._height = castToNumber(height); }
}

setPlatformObject(DOMRectReadOnly, {
  clone: rect => new DOMRectReadOnly(rect.x, rect.y, rect.width, rect.height),
});
`;

fs.writeFileSync(targetFile, patched, 'utf8');
console.log('[patch-react-native] Patched DOMRectReadOnly.js successfully.');
