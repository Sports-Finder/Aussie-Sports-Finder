/**
 * Patched version of react-native's DOMRectReadOnly.js.
 * The original uses private class fields (#x, #y, #width, #height) which
 * hermesc on the iOS 26 SDK rejects. This version uses regular underscore-
 * prefixed properties instead — identical behaviour, hermesc-compatible.
 *
 * Original: react-native/src/private/webapis/geometry/DOMRectReadOnly.js
 */

'use strict';

// $FlowFixMe[unsupported-syntax] — CJS interop for Metro patching
const { setPlatformObject } = require('../webidl/PlatformObjects');

function castToNumber(value) {
  return value ? Number(value) : 0;
}

class DOMRectReadOnly {
  constructor(x, y, width, height) {
    this._x = 0;
    this._y = 0;
    this._width = 0;
    this._height = 0;
    this.__setInternalX(x);
    this.__setInternalY(y);
    this.__setInternalWidth(width);
    this.__setInternalHeight(height);
  }

  get x() { return this._x; }
  get y() { return this._y; }
  get width() { return this._width; }
  get height() { return this._height; }

  get top() {
    const height = this._height;
    const y = this._y;
    return height < 0 ? y + height : y;
  }

  get right() {
    const width = this._width;
    const x = this._x;
    return width < 0 ? x : x + width;
  }

  get bottom() {
    const height = this._height;
    const y = this._y;
    return height < 0 ? y : y + height;
  }

  get left() {
    const width = this._width;
    const x = this._x;
    return width < 0 ? x + width : x;
  }

  toJSON() {
    const { x, y, width, height, top, left, bottom, right } = this;
    return { x, y, width, height, top, left, bottom, right };
  }

  static fromRect(rect) {
    if (!rect) return new DOMRectReadOnly();
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
  clone: rect => new DOMRectReadOnly(rect.x, rect.y, rect.width, rect.height),
});

module.exports = DOMRectReadOnly;
module.exports.default = DOMRectReadOnly;
