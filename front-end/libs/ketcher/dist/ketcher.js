/****************************************************************************
 * Copyright (C) 2009-2017. EPAM Systems.
 *
 * This file may be distributed and/or modified under the terms of the
 * GNU Affero General Public License version 3 as published by the Free
 * Software Foundation and appearing in the file LICENSE included in
 * the packaging of this file.
 *
 * This file is provided AS IS with NO WARRANTY OF ANY KIND, INCLUDING THE
 * WARRANTY OF DESIGN, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
 ***************************************************************************/

(function(f) {
    if (typeof exports === "object" && typeof module !== "undefined") {
        module.exports = f()
    } else if (typeof define === "function" && define.amd) {
        define([], f)
    } else {
        var g;
        if (typeof window !== "undefined") {
            g = window
        } else if (typeof global !== "undefined") {
            g = global
        } else if (typeof self !== "undefined") {
            g = self
        } else {
            g = this
        }
        g.ketcher = f()
    }
})(function() {
    var define, module, exports;
    return (function e(t, n, r) {
        function s(o, u) {
            if (!n[o]) {
                if (!t[o]) {
                    var a = typeof require == "function" && require;
                    if (!u && a) return a(o, !0);
                    if (i) return i(o, !0);
                    var f = new Error("Cannot find module '" + o + "'");
                    throw f.code = "MODULE_NOT_FOUND", f
                }
                var l = n[o] = {
                    exports: {}
                };
                t[o][0].call(l.exports, function(e) {
                    var n = t[o][1][e];
                    return s(n ? n : e)
                }, l, l.exports, e, t, n, r)
            }
            return n[o].exports
        }
        var i = typeof require == "function" && require;
        for (var o = 0; o < r.length; o++) s(r[o]);
        return s
    })({
        1: [function(require, module, exports) {
            /* FileSaver.js
             * A saveAs() FileSaver implementation.
             * 1.1.20150716
             *
             * By Eli Grey, http://eligrey.com
             * License: X11/MIT
             *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
             */

            /*global self */
            /*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

            /*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

            var saveAs = saveAs || (function(view) {
                "use strict";
                // IE <10 is explicitly unsupported
                if (typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
                    return;
                }
                var
                    doc = view.document
                    // only get URL when necessary in case Blob.js hasn't overridden it yet
                    ,
                    get_URL = function() {
                        return view.URL || view.webkitURL || view;
                    },
                    save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a"),
                    can_use_save_link = "download" in save_link,
                    click = function(node) {
                        var event = new MouseEvent("click");
                        node.dispatchEvent(event);
                    },
                    webkit_req_fs = view.webkitRequestFileSystem,
                    req_fs = view.requestFileSystem || webkit_req_fs || view.mozRequestFileSystem,
                    throw_outside = function(ex) {
                        (view.setImmediate || view.setTimeout)(function() {
                            throw ex;
                        }, 0);
                    },
                    force_saveable_type = "application/octet-stream",
                    fs_min_size = 0
                    // See https://code.google.com/p/chromium/issues/detail?id=375297#c7 and
                    // https://github.com/eligrey/FileSaver.js/commit/485930a#commitcomment-8768047
                    // for the reasoning behind the timeout and revocation flow
                    ,
                    arbitrary_revoke_timeout = 500 // in ms
                    ,
                    revoke = function(file) {
                        var revoker = function() {
                            if (typeof file === "string") { // file is an object URL
                                get_URL().revokeObjectURL(file);
                            } else { // file is a File
                                file.remove();
                            }
                        };
                        if (view.chrome) {
                            revoker();
                        } else {
                            setTimeout(revoker, arbitrary_revoke_timeout);
                        }
                    },
                    dispatch = function(filesaver, event_types, event) {
                        event_types = [].concat(event_types);
                        var i = event_types.length;
                        while (i--) {
                            var listener = filesaver["on" + event_types[i]];
                            if (typeof listener === "function") {
                                try {
                                    listener.call(filesaver, event || filesaver);
                                } catch (ex) {
                                    throw_outside(ex);
                                }
                            }
                        }
                    },
                    auto_bom = function(blob) {
                        // prepend BOM for UTF-8 XML and text/* types (including HTML)
                        if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
                            return new Blob(["\ufeff", blob], {
                                type: blob.type
                            });
                        }
                        return blob;
                    },
                    FileSaver = function(blob, name, no_auto_bom) {
                        if (!no_auto_bom) {
                            blob = auto_bom(blob);
                        }
                        // First try a.download, then web filesystem, then object URLs
                        var
                            filesaver = this,
                            type = blob.type,
                            blob_changed = false,
                            object_url, target_view, dispatch_all = function() {
                                dispatch(filesaver, "writestart progress write writeend".split(" "));
                            }
                            // on any filesys errors revert to saving with object URLs
                            ,
                            fs_error = function() {
                                // don't create more object URLs than needed
                                if (blob_changed || !object_url) {
                                    object_url = get_URL().createObjectURL(blob);
                                }
                                if (target_view) {
                                    target_view.location.href = object_url;
                                } else {
                                    var new_tab = view.open(object_url, "_blank");
                                    if (new_tab == undefined && typeof safari !== "undefined") {
                                        //Apple do not allow window.open, see http://bit.ly/1kZffRI
                                        view.location.href = object_url
                                    }
                                }
                                filesaver.readyState = filesaver.DONE;
                                dispatch_all();
                                revoke(object_url);
                            },
                            abortable = function(func) {
                                return function() {
                                    if (filesaver.readyState !== filesaver.DONE) {
                                        return func.apply(this, arguments);
                                    }
                                };
                            },
                            create_if_not_found = {
                                create: true,
                                exclusive: false
                            },
                            slice;
                        filesaver.readyState = filesaver.INIT;
                        if (!name) {
                            name = "download";
                        }
                        if (can_use_save_link) {
                            object_url = get_URL().createObjectURL(blob);
                            save_link.href = object_url;
                            save_link.download = name;
                            setTimeout(function() {
                                click(save_link);
                                dispatch_all();
                                revoke(object_url);
                                filesaver.readyState = filesaver.DONE;
                            });
                            return;
                        }
                        // Object and web filesystem URLs have a problem saving in Google Chrome when
                        // viewed in a tab, so I force save with application/octet-stream
                        // http://code.google.com/p/chromium/issues/detail?id=91158
                        // Update: Google errantly closed 91158, I submitted it again:
                        // https://code.google.com/p/chromium/issues/detail?id=389642
                        if (view.chrome && type && type !== force_saveable_type) {
                            slice = blob.slice || blob.webkitSlice;
                            blob = slice.call(blob, 0, blob.size, force_saveable_type);
                            blob_changed = true;
                        }
                        // Since I can't be sure that the guessed media type will trigger a download
                        // in WebKit, I append .download to the filename.
                        // https://bugs.webkit.org/show_bug.cgi?id=65440
                        if (webkit_req_fs && name !== "download") {
                            name += ".download";
                        }
                        if (type === force_saveable_type || webkit_req_fs) {
                            target_view = view;
                        }
                        if (!req_fs) {
                            fs_error();
                            return;
                        }
                        fs_min_size += blob.size;
                        req_fs(view.TEMPORARY, fs_min_size, abortable(function(fs) {
                            fs.root.getDirectory("saved", create_if_not_found, abortable(function(dir) {
                                var save = function() {
                                    dir.getFile(name, create_if_not_found, abortable(function(file) {
                                        file.createWriter(abortable(function(writer) {
                                            writer.onwriteend = function(event) {
                                                target_view.location.href = file.toURL();
                                                filesaver.readyState = filesaver.DONE;
                                                dispatch(filesaver, "writeend", event);
                                                revoke(file);
                                            };
                                            writer.onerror = function() {
                                                var error = writer.error;
                                                if (error.code !== error.ABORT_ERR) {
                                                    fs_error();
                                                }
                                            };
                                            "writestart progress write abort".split(" ").forEach(function(event) {
                                                writer["on" + event] = filesaver["on" + event];
                                            });
                                            writer.write(blob);
                                            filesaver.abort = function() {
                                                writer.abort();
                                                filesaver.readyState = filesaver.DONE;
                                            };
                                            filesaver.readyState = filesaver.WRITING;
                                        }), fs_error);
                                    }), fs_error);
                                };
                                dir.getFile(name, {
                                    create: false
                                }, abortable(function(file) {
                                    // delete file if it already exists
                                    file.remove();
                                    save();
                                }), abortable(function(ex) {
                                    if (ex.code === ex.NOT_FOUND_ERR) {
                                        save();
                                    } else {
                                        fs_error();
                                    }
                                }));
                            }), fs_error);
                        }), fs_error);
                    },
                    FS_proto = FileSaver.prototype,
                    saveAs = function(blob, name, no_auto_bom) {
                        return new FileSaver(blob, name, no_auto_bom);
                    };
                // IE 10+ (native saveAs)
                if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
                    return function(blob, name, no_auto_bom) {
                        if (!no_auto_bom) {
                            blob = auto_bom(blob);
                        }
                        return navigator.msSaveOrOpenBlob(blob, name || "download");
                    };
                }

                FS_proto.abort = function() {
                    var filesaver = this;
                    filesaver.readyState = filesaver.DONE;
                    dispatch(filesaver, "abort");
                };
                FS_proto.readyState = FS_proto.INIT = 0;
                FS_proto.WRITING = 1;
                FS_proto.DONE = 2;

                FS_proto.error =
                    FS_proto.onwritestart =
                    FS_proto.onprogress =
                    FS_proto.onwrite =
                    FS_proto.onabort =
                    FS_proto.onerror =
                    FS_proto.onwriteend =
                    null;

                return saveAs;
            }(
                typeof self !== "undefined" && self || typeof window !== "undefined" && window || this.content
            ));
            // `self` is undefined in Firefox for Android content script context
            // while `this` is nsIContentFrameMessageManager
            // with an attribute `content` that corresponds to the window

            if (typeof module !== "undefined" && module.exports) {
                module.exports.saveAs = saveAs;
            } else if ((typeof define !== "undefined" && define !== null) && (define.amd != null)) {
                define([], function() {
                    return saveAs;
                });
            }

        }, {}],
        2: [function(require, module, exports) {
            /// keymage.js - Javascript keyboard bindings handling
            /// http://github.com/piranha/keymage
            ///
            /// (c) 2012-2016 Alexander Solovyov under terms of ISC License

            (function(define, undefined) {
                define(function() {
                    var VERSION = '1.1.3';
                    var isOsx = typeof navigator !== 'undefined' &&
                        ~navigator.userAgent.indexOf('Mac OS X');

                    // Defining all keys
                    var MODPROPS = ['shiftKey', 'ctrlKey', 'altKey', 'metaKey'];
                    var MODS = {
                        'shift': 'shift',
                        'ctrl': 'ctrl',
                        'control': 'ctrl',
                        'alt': 'alt',
                        'option': 'alt',
                        'win': 'meta',
                        'cmd': 'meta',
                        'super': 'meta',
                        'meta': 'meta',
                        // default modifier for os x is cmd and for others is ctrl
                        'defmod': isOsx ? 'meta' : 'ctrl'
                    };
                    var MODORDER = ['shift', 'ctrl', 'alt', 'meta'];
                    var MODNUMS = [16, 17, 18, 91];

                    var KEYS = {
                        'backspace': 8,
                        'tab': 9,
                        'enter': 13,
                        'return': 13,
                        'pause': 19,
                        'caps': 20,
                        'capslock': 20,
                        'escape': 27,
                        'esc': 27,
                        'space': 32,
                        'pgup': 33,
                        'pageup': 33,
                        'pgdown': 34,
                        'pagedown': 34,
                        'end': 35,
                        'home': 36,
                        'ins': 45,
                        'insert': 45,
                        'del': 46,
                        'delete': 46,

                        'left': 37,
                        'up': 38,
                        'right': 39,
                        'down': 40,

                        '*': 106,
                        '+': 107,
                        'plus': 107,
                        'minus': 109,
                        ';': 186,
                        '=': 187,
                        ',': 188,
                        '-': 189,
                        '.': 190,
                        '/': 191,
                        '`': 192,
                        '[': 219,
                        '\\': 220,
                        ']': 221,
                        "'": 222
                    };

                    var i;
                    // numpad
                    for (i = 0; i < 10; i++) {
                        KEYS['num-' + i] = i + 95;
                    }
                    // top row 0-9
                    for (i = 0; i < 10; i++) {
                        KEYS[i.toString()] = i + 48;
                    }
                    // f1-f24
                    for (i = 1; i < 25; i++) {
                        KEYS['f' + i] = i + 111;
                    }
                    // alphabet
                    for (i = 65; i < 91; i++) {
                        KEYS[String.fromCharCode(i).toLowerCase()] = i;
                    }

                    // Reverse key codes
                    var KEYREV = {};
                    for (var k in KEYS) {
                        var val = KEYS[k];
                        if (!KEYREV[val] || KEYREV[val].length < k.length) {
                            KEYREV[val] = k;
                        }
                    }

                    // -----------------------
                    // Actual work is done here

                    var currentScope = '';
                    var allChains = {};

                    function parseKeyString(keystring) {
                        var bits = keystring.split(/-(?!$)/);
                        var button = bits[bits.length - 1];
                        var key = {
                            code: KEYS[button]
                        };

                        if (!key.code) {
                            throw 'Unknown key "' + button + '" in keystring "' +
                                keystring + '"';
                        }

                        var mod;
                        for (var i = 0; i < bits.length - 1; i++) {
                            button = bits[i];
                            mod = MODS[button];
                            if (!mod) {
                                throw 'Unknown modifier "' + button + '" in keystring "' +
                                    keystring + '"';
                            }
                            key[mod] = true;
                        }

                        return key;
                    }

                    function stringifyKey(key) {
                        var s = '';
                        for (var i = 0; i < MODORDER.length; i++) {
                            if (key[MODORDER[i]]) {
                                s += MODORDER[i] + '-';
                            }
                        }
                        s += KEYREV[key.code];
                        return s;
                    }

                    function normalizeKeyChain(keychainString) {
                        var keychain = [];
                        var keys = keychainString.split(' ');

                        for (var i = 0; i < keys.length; i++) {
                            var key = parseKeyString(keys[i]);
                            key = stringifyKey(key);
                            keychain.push(key);
                        }

                        keychain.original = keychainString;
                        return keychain;
                    }

                    function eventKeyString(e) {
                        var key = {
                            code: e.keyCode
                        };
                        for (var i = 0; i < MODPROPS.length; i++) {
                            var mod = MODPROPS[i];
                            if (e[mod]) {
                                key[mod.slice(0, mod.length - 3)] = true;
                            }
                        }
                        return stringifyKey(key);
                    }

                    function getNestedChains(chains, scope) {
                        for (var i = 0; i < scope.length; i++) {
                            var bit = scope[i];

                            if (bit) {
                                chains = chains[bit];
                            }

                            if (!chains) {
                                break;
                            }
                        }
                        return chains;
                    }

                    var sequence = [];

                    function dispatch(e) {
                        // Skip all modifiers
                        if (~MODNUMS.indexOf(e.keyCode)) {
                            return;
                        }

                        var seq = sequence.slice();
                        seq.push(eventKeyString(e));
                        var scope = currentScope.split('.');
                        var matched, chains, key;

                        for (var i = scope.length; i >= 0; i--) {
                            chains = getNestedChains(allChains, scope.slice(0, i));
                            if (!chains) {
                                continue;
                            }
                            matched = true;
                            for (var j = 0; j < seq.length; j++) {
                                key = seq[j];
                                if (!chains[key]) {
                                    matched = false;
                                    break;
                                }
                                chains = chains[key];
                            }

                            if (matched) {
                                break;
                            }
                        }

                        var definitionScope = scope.slice(0, i).join('.');
                        var preventDefault = chains.preventDefault;

                        // partial match, save the sequence
                        if (matched && !chains.handlers) {
                            sequence = seq;
                            if (preventDefault) {
                                e.preventDefault();
                            }
                            return;
                        }

                        if (matched) {
                            for (i = 0; i < chains.handlers.length; i++) {
                                var handler = chains.handlers[i];
                                var options = handler._keymage;

                                var res = handler.call(options.context, e, {
                                    shortcut: options.original,
                                    scope: currentScope,
                                    definitionScope: definitionScope
                                });

                                if (res === false || preventDefault) {
                                    e.preventDefault();
                                }
                            }
                        }

                        // either matched or not, drop the sequence
                        sequence = [];
                    }

                    function getHandlers(scope, keychain, fn) {
                        var bits = scope.split('.');
                        var chains = allChains;
                        bits = bits.concat(keychain);

                        for (var i = 0, l = bits.length; i < l; i++) {
                            var bit = bits[i];
                            if (!bit) continue;

                            chains = chains[bit] || (chains[bit] = {});
                            if (fn && fn._keymage.preventDefault) {
                                chains.preventDefault = true;
                            }

                            if (i === l - 1) {
                                var handlers = chains.handlers || (chains.handlers = []);
                                return handlers;
                            }
                        }
                    }

                    function assignKey(scope, keychain, fn) {
                        var handlers = getHandlers(scope, keychain, fn);
                        handlers.push(fn);
                    }

                    function unassignKey(scope, keychain, fn) {
                        var handlers = getHandlers(scope, keychain);
                        var idx = handlers.indexOf(fn);
                        if (~idx) {
                            handlers.splice(idx, 1);
                        }
                    }

                    function parsed(scope, keychain, fn, options) {
                        if (keychain === undefined && fn === undefined) {
                            return function(keychain, fn) {
                                return keymage(scope, keychain, fn);
                            };
                        }

                        if (typeof keychain === 'function') {
                            options = fn;
                            fn = keychain;
                            keychain = scope;
                            scope = '';
                        }

                        var normalized = normalizeKeyChain(keychain);

                        return [scope, normalized, fn, options];
                    }

                    // optional arguments: scope, options.
                    function keymage(scope, keychain, fn, options) {
                        var args = parsed(scope, keychain, fn, options);
                        fn = args[2];
                        options = args[3];
                        fn._keymage = options || {};
                        fn._keymage.original = keychain;
                        assignKey.apply(null, args);

                        return function() {
                            unassignKey.apply(null, args);
                        };
                    }

                    keymage.unbind = function(scope, keychain, fn) {
                        var args = parsed(scope, keychain, fn);
                        unassignKey.apply(null, args);
                    };

                    keymage.parse = parseKeyString;
                    keymage.stringify = stringifyKey;

                    keymage.bindings = allChains;

                    keymage.setScope = function(scope) {
                        currentScope = scope ? scope : '';
                    };

                    keymage.getScope = function() {
                        return currentScope;
                    };

                    keymage.pushScope = function(scope) {
                        currentScope = (currentScope ? currentScope + '.' : '') + scope;
                        return currentScope;
                    };

                    keymage.popScope = function(scope) {
                        var i;

                        if (!scope) {
                            i = currentScope.lastIndexOf('.');
                            scope = currentScope.slice(i + 1);
                            currentScope = i == -1 ? '' : currentScope.slice(0, i);
                            return scope;
                        }

                        currentScope = currentScope.replace(
                            new RegExp('(^|\\.)' + scope + '(\\.|$).*'), '');
                        return scope;
                    };

                    keymage.version = VERSION;

                    window.addEventListener('keydown', dispatch, false);

                    return keymage;
                });
            })(typeof define !== 'undefined' ? define : function(factory) {
                if (typeof module !== 'undefined') {
                    module.exports = factory();
                } else {
                    window.keymage = factory();
                }
            });

        }, {}],
        3: [function(require, module, exports) {
            (function(root) {

                // Use polyfill for setImmediate for performance gains
                var asap = (typeof setImmediate === 'function' && setImmediate) ||
                    function(fn) {
                        setTimeout(fn, 1);
                    };

                // Polyfill for Function.prototype.bind
                function bind(fn, thisArg) {
                    return function() {
                        fn.apply(thisArg, arguments);
                    }
                }

                var isArray = Array.isArray || function(value) {
                    return Object.prototype.toString.call(value) === "[object Array]"
                };

                function Promise(fn) {
                    if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new');
                    if (typeof fn !== 'function') throw new TypeError('not a function');
                    this._state = null;
                    this._value = null;
                    this._deferreds = []

                    doResolve(fn, bind(resolve, this), bind(reject, this))
                }

                function handle(deferred) {
                    var me = this;
                    if (this._state === null) {
                        this._deferreds.push(deferred);
                        return
                    }
                    asap(function() {
                        var cb = me._state ? deferred.onFulfilled : deferred.onRejected
                        if (cb === null) {
                            (me._state ? deferred.resolve : deferred.reject)(me._value);
                            return;
                        }
                        var ret;
                        try {
                            ret = cb(me._value);
                        } catch (e) {
                            deferred.reject(e);
                            return;
                        }
                        deferred.resolve(ret);
                    })
                }

                function resolve(newValue) {
                    try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
                        if (newValue === this) throw new TypeError('A promise cannot be resolved with itself.');
                        if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
                            var then = newValue.then;
                            if (typeof then === 'function') {
                                doResolve(bind(then, newValue), bind(resolve, this), bind(reject, this));
                                return;
                            }
                        }
                        this._state = true;
                        this._value = newValue;
                        finale.call(this);
                    } catch (e) {
                        reject.call(this, e);
                    }
                }

                function reject(newValue) {
                    this._state = false;
                    this._value = newValue;
                    finale.call(this);
                }

                function finale() {
                    for (var i = 0, len = this._deferreds.length; i < len; i++) {
                        handle.call(this, this._deferreds[i]);
                    }
                    this._deferreds = null;
                }

                function Handler(onFulfilled, onRejected, resolve, reject) {
                    this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
                    this.onRejected = typeof onRejected === 'function' ? onRejected : null;
                    this.resolve = resolve;
                    this.reject = reject;
                }

                /**
                 * Take a potentially misbehaving resolver function and make sure
                 * onFulfilled and onRejected are only called once.
                 *
                 * Makes no guarantees about asynchrony.
                 */
                function doResolve(fn, onFulfilled, onRejected) {
                    var done = false;
                    try {
                        fn(function(value) {
                            if (done) return;
                            done = true;
                            onFulfilled(value);
                        }, function(reason) {
                            if (done) return;
                            done = true;
                            onRejected(reason);
                        })
                    } catch (ex) {
                        if (done) return;
                        done = true;
                        onRejected(ex);
                    }
                }

                Promise.prototype['catch'] = function(onRejected) {
                    return this.then(null, onRejected);
                };

                Promise.prototype.then = function(onFulfilled, onRejected) {
                    var me = this;
                    return new Promise(function(resolve, reject) {
                        handle.call(me, new Handler(onFulfilled, onRejected, resolve, reject));
                    })
                };

                Promise.all = function() {
                    var args = Array.prototype.slice.call(arguments.length === 1 && isArray(arguments[0]) ? arguments[0] : arguments);

                    return new Promise(function(resolve, reject) {
                        if (args.length === 0) return resolve([]);
                        var remaining = args.length;

                        function res(i, val) {
                            try {
                                if (val && (typeof val === 'object' || typeof val === 'function')) {
                                    var then = val.then;
                                    if (typeof then === 'function') {
                                        then.call(val, function(val) {
                                            res(i, val)
                                        }, reject);
                                        return;
                                    }
                                }
                                args[i] = val;
                                if (--remaining === 0) {
                                    resolve(args);
                                }
                            } catch (ex) {
                                reject(ex);
                            }
                        }
                        for (var i = 0; i < args.length; i++) {
                            res(i, args[i]);
                        }
                    });
                };

                Promise.resolve = function(value) {
                    if (value && typeof value === 'object' && value.constructor === Promise) {
                        return value;
                    }

                    return new Promise(function(resolve) {
                        resolve(value);
                    });
                };

                Promise.reject = function(value) {
                    return new Promise(function(resolve, reject) {
                        reject(value);
                    });
                };

                Promise.race = function(values) {
                    return new Promise(function(resolve, reject) {
                        for (var i = 0, len = values.length; i < len; i++) {
                            values[i].then(resolve, reject);
                        }
                    });
                };

                /**
                 * Set the immediate function to execute callbacks
                 * @param fn {function} Function to execute
                 * @private
                 */
                Promise._setImmediateFn = function _setImmediateFn(fn) {
                    asap = fn;
                };

                if (typeof module !== 'undefined' && module.exports) {
                    module.exports = Promise;
                } else if (!root.Promise) {
                    root.Promise = Promise;
                }

            })(this);
        }, {}],
        4: [function(require, module, exports) {
            'use strict';
            var strictUriEncode = require('strict-uri-encode');

            exports.extract = function(str) {
                return str.split('?')[1] || '';
            };

            exports.parse = function(str) {
                if (typeof str !== 'string') {
                    return {};
                }

                str = str.trim().replace(/^(\?|#|&)/, '');

                if (!str) {
                    return {};
                }

                return str.split('&').reduce(function(ret, param) {
                    var parts = param.replace(/\+/g, ' ').split('=');
                    // Firefox (pre 40) decodes `%3D` to `=`
                    // https://github.com/sindresorhus/query-string/pull/37
                    var key = parts.shift();
                    var val = parts.length > 0 ? parts.join('=') : undefined;

                    key = decodeURIComponent(key);

                    // missing `=` should be `null`:
                    // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
                    val = val === undefined ? null : decodeURIComponent(val);

                    if (!ret.hasOwnProperty(key)) {
                        ret[key] = val;
                    } else if (Array.isArray(ret[key])) {
                        ret[key].push(val);
                    } else {
                        ret[key] = [ret[key], val];
                    }

                    return ret;
                }, {});
            };

            exports.stringify = function(obj) {
                return obj ? Object.keys(obj).sort().map(function(key) {
                    var val = obj[key];

                    if (Array.isArray(val)) {
                        return val.sort().map(function(val2) {
                            return strictUriEncode(key) + '=' + strictUriEncode(val2);
                        }).join('&');
                    }

                    return strictUriEncode(key) + '=' + strictUriEncode(val);
                }).filter(function(x) {
                    return x.length > 0;
                }).join('&') : '';
            };

        }, {
            "strict-uri-encode": 5
        }],
        5: [function(require, module, exports) {
            'use strict';
            module.exports = function(str) {
                return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
                    return '%' + c.charCodeAt(0).toString(16).toUpperCase();
                });
            };

        }, {}],
        6: [function(require, module, exports) {
            var xhrFactory = (function getXHRfactory(factories) {
                for (var i = 0, xhr, X, len = factories.length; i < len; i++) {
                    try {
                        X = factories[i];
                        xhr = X();
                        return window.XMLHttpRequest ? X : window.XMLHttpRequest = X;
                    } catch (e) {
                        continue;
                    }
                }
            })([
                function() {
                    return new XMLHttpRequest();
                }, // IE10+,FF,Chrome,Opera,Safari
                function() {
                    return new ActiveXObject("Msxml3.");
                }, // IE9
                function() {
                    return new ActiveXObject("Msxml2.XMLHTTP.6.0");
                }, // IE8
                function() {
                    return new ActiveXObject("Msxml2.XMLHTTP.3.0");
                }, // IE7
                function() {
                    return new ActiveXObject("Msxml2.XMLHTTP");
                }, // IE6
                function() {
                    return new ActiveXObject("Microsoft.XMLHTTP");
                }, // IE5
                function() {
                    return null;
                }
            ]);
            module.exports = function getXHR() {
                return xhrFactory();
            }

        }, {}],
        7: [function(require, module, exports) {
            function formEncodeString(e) {
                return e.replace(/[^ !'()~\*]*/g, encodeURIComponent).replace(/ /g, "+").replace(/[!'()~\*]/g, function(e) {
                    return "%" + ("0" + e.charCodeAt(0).toString(16)).slice(-2).toUpperCase()
                })
            }

            function formEncode(e) {
                var r = [];
                for (var n in e) e.hasOwnProperty(n) && r.push(encodeURIComponent(n) + "=" + formEncodeString(e[n]));
                return r.join("&")
            }

            function unwrap(e) {
                var r = e.responseText,
                    n = r.substring(r.indexOf("\n") + 1);
                if (r.startsWith("Ok.")) return n;
                throw Error("Unknown server error: " + r)
            }

            function api(e) {
                function r(r, n) {
                    function t(e, n, t) {
                        return {
                            method: r,
                            url: o.url,
                            sync: t,
                            params: n,
                            data: e && formEncode(e),
                            headers: e && {
                                "Content-Type": "application/x-www-form-urlencoded"
                            }
                        }
                    }
                    var o = function(e, r) {
                        return ajax(t(e, r)).then(unwrap)
                    };
                    return o.sync = function(e, r) {
                        return unwrap(ajax(t(e, r, !0)))
                    }, o.url = e + n, o
                }
                return {
                    inchi: r("POST", "getinchi"),
                    molfile: r("POST", "getmolfile"),
                    aromatize: r("POST", "aromatize"),
                    dearomatize: r("POST", "dearomatize"),
                    calculateCip: r("POST", "calculate_cip"),
                    automap: r("POST", "automap"),
                    layout_smiles: r("GET", "layout"),
                    layout: r("POST", "layout"),
                    smiles: r("POST", "smiles"),
                    save: r("POST", "save"),
                    knocknock: function() {
                        return ajax(e + "knocknock").then(function(e) {
                            if ("You are welcome!" !== e.responseText) throw Error("Server is not compatible")
                        })
                    }
                }
            }
            var ajax = require("./util/ajax.js");
            module.exports = api;

        }, {
            "./util/ajax.js": 37
        }],
        8: [function(require, module, exports) {
            (function(global) {
                var Map = require("../util/map"),
                    Vec2 = require("../util/vec2");
                require("./element"), require("./struct");
                var chem = global.chem = global.chem || {};
                chem.CisTrans = function(e, t, n) {
                    this.molecule = e, this.bonds = new Map, this.getNeighbors = t, this.context = n
                }, chem.CisTrans.PARITY = {
                    NONE: 0,
                    CIS: 1,
                    TRANS: 2
                }, chem.CisTrans.prototype.each = function(e, t) {
                    this.bonds.each(e, t)
                }, chem.CisTrans.prototype.getParity = function(e) {
                    return this.bonds.get(e).parity
                }, chem.CisTrans.prototype.getSubstituents = function(e) {
                    return this.bonds.get(e).substituents
                }, chem.CisTrans.prototype.sameside = function(e, t, n, r) {
                    var o = Vec2.diff(e, t),
                        i = new Vec2(-o.y, o.x);
                    if (!i.normalize()) return 0;
                    var a = Vec2.diff(n, e),
                        s = Vec2.diff(r, t);
                    if (!a.normalize()) return 0;
                    if (!s.normalize()) return 0;
                    var u = Vec2.dot(a, i),
                        c = Vec2.dot(s, i);
                    return Math.abs(u) < .001 || Math.abs(c) < .001 ? 0 : u * c > 0 ? 1 : -1
                }, chem.CisTrans.prototype._sameside = function(e, t, n, r) {
                    return this.sameside(this.molecule.atoms.get(e).pp, this.molecule.atoms.get(t).pp, this.molecule.atoms.get(n).pp, this.molecule.atoms.get(r).pp)
                }, chem.CisTrans.prototype._sortSubstituents = function(e) {
                    var t = this.molecule.atoms.get(e[0]).pureHydrogen(),
                        n = e[1] < 0 || this.molecule.atoms.get(e[1]).pureHydrogen(),
                        r = this.molecule.atoms.get(e[2]).pureHydrogen(),
                        o = e[3] < 0 || this.molecule.atoms.get(e[3]).pureHydrogen();
                    return t && n ? !1 : r && o ? !1 : (n ? e[1] = -1 : t ? (e[0] = e[1], e[1] = -1) : e[0] > e[1] && e.swap(0, 1), o ? e[3] = -1 : r ? (e[2] = e[3], e[3] = -1) : e[2] > e[3] && e.swap(2, 3), !0)
                }, chem.CisTrans.prototype.isGeomStereoBond = function(e, t) {
                    var n = this.molecule.bonds.get(e);
                    if (n.type != chem.Struct.BOND.TYPE.DOUBLE) return !1;
                    var r = this.molecule.atoms.get(n.begin).label,
                        o = this.molecule.atoms.get(n.end).label;
                    if ("C" != r && "N" != r && "Si" != r && "Ge" != r) return !1;
                    if ("C" != o && "N" != o && "Si" != o && "Ge" != o) return !1;
                    var i = this.getNeighbors.call(this.context, n.begin),
                        a = this.getNeighbors.call(this.context, n.end);
                    if (i.length < 2 || i.length > 3 || a.length < 2 || a.length > 3) return !1;
                    t[0] = -1, t[1] = -1, t[2] = -1, t[3] = -1;
                    var s, u;
                    for (s = 0; s < i.length; s++)
                        if (u = i[s], u.bid != e) {
                            if (this.molecule.bonds.get(u.bid).type != chem.Struct.BOND.TYPE.SINGLE) return !1; - 1 == t[0] ? t[0] = u.aid : t[1] = u.aid
                        }
                    for (s = 0; s < a.length; s++)
                        if (u = a[s], u.bid != e) {
                            if (this.molecule.bonds.get(u.bid).type != chem.Struct.BOND.TYPE.SINGLE) return !1; - 1 == t[2] ? t[2] = u.aid : t[3] = u.aid
                        }
                    return -1 != t[1] && -1 != this._sameside(n.begin, n.end, t[0], t[1]) ? !1 : -1 != t[3] && -1 != this._sameside(n.begin, n.end, t[2], t[3]) ? !1 : !0
                }, chem.CisTrans.prototype.build = function(e) {
                    this.molecule.bonds.each(function(t, n) {
                        var r = this.bonds.set(t, {
                            parity: 0,
                            substituents: new Array(4)
                        });
                        if ((!Object.isArray(e) || !e[t]) && this.isGeomStereoBond(t, r.substituents) && this._sortSubstituents(r.substituents)) {
                            var o = this._sameside(n.begin, n.end, r.substituents[0], r.substituents[2]);
                            1 == o ? r.parity = chem.CisTrans.PARITY.CIS : -1 == o && (r.parity = chem.CisTrans.PARITY.TRANS)
                        }
                    }, this)
                };

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../util/map": 40,
            "../util/vec2": 43,
            "./element": 10,
            "./struct": 16
        }],
        9: [function(require, module, exports) {
            (function(global) {
                var Set = require("../util/set");
                require("../util/"), require("./element");
                var chem = global.chem = global.chem || {},
                    util = global.util;
                chem.Dfs = function(e, t, n, r) {
                    this.molecule = e, this.atom_data = t, this.components = n, this.nComponentsInReactants = -1, this.nReactants = r, this.vertices = new Array(this.molecule.atoms.count()), this.molecule.atoms.each(function(e) {
                        this.vertices[e] = new chem.Dfs.VertexDesc
                    }, this), this.edges = new Array(this.molecule.bonds.count()), this.molecule.bonds.each(function(e) {
                        this.edges[e] = new chem.Dfs.EdgeDesc
                    }, this), this.v_seq = []
                }, chem.Dfs.VertexDesc = function() {
                    this.dfs_state = 0, this.parent_vertex = 0, this.parent_edge = 0, this.branches = 0
                }, chem.Dfs.EdgeDesc = function() {
                    this.opening_cycles = 0, this.closing_cycle = 0
                }, chem.Dfs.SeqElem = function(e, t, n) {
                    this.idx = e, this.parent_vertex = t, this.parent_edge = n
                }, chem.Dfs.prototype.walk = function() {
                    for (var e, t, n = [], r = 0, o = 0;;) {
                        if (n.length < 1) {
                            for (var i = -1, a = function(e) {
                                    return 0 == this.vertices[e].dfs_state ? (i = e, !0) : !1
                                }; r < this.components.length && -1 == i;) i = Set.find(this.components[r], a, this), null === i && (i = -1, r++, r == this.nReactants && (this.nComponentsInReactants = o));
                            if (-1 > i && this.molecule.atoms.find(a, this), -1 == i) break;
                            this.vertices[i].parent_vertex = -1, this.vertices[i].parent_edge = -1, n.push(i), o++
                        }
                        var s = n.pop(),
                            u = this.vertices[s].parent_vertex,
                            c = new chem.Dfs.SeqElem(s, u, this.vertices[s].parent_edge);
                        this.v_seq.push(c), this.vertices[s].dfs_state = 2;
                        var l = this.atom_data[s];
                        for (e = 0; e < l.neighbours.length; e++) {
                            var d = l.neighbours[e].aid,
                                p = l.neighbours[e].bid;
                            if (d != u)
                                if (2 == this.vertices[d].dfs_state) {
                                    for (this.edges[p].closing_cycle = 1, t = s; - 1 != t && this.vertices[t].parent_vertex != d;) t = this.vertices[t].parent_vertex;
                                    if (-1 == t) throw new Error("cycle unwind error");
                                    this.edges[this.vertices[t].parent_edge].opening_cycles++, this.vertices[s].branches++, c = new chem.Dfs.SeqElem(d, s, p), this.v_seq.push(c)
                                } else {
                                    if (1 == this.vertices[d].dfs_state) {
                                        if (t = n.indexOf(d), -1 == t) throw new Error("internal: removing vertex from stack");
                                        n.splice(t, 1);
                                        var f = this.vertices[d].parent_vertex;
                                        f >= 0 && this.vertices[f].branches--
                                    }
                                    this.vertices[s].branches++, this.vertices[d].parent_vertex = s, this.vertices[d].parent_edge = p, this.vertices[d].dfs_state = 1, n.push(d)
                                }
                        }
                    }
                }, chem.Dfs.prototype.edgeClosingCycle = function(e) {
                    return 0 != this.edges[e].closing_cycle
                }, chem.Dfs.prototype.numBranches = function(e) {
                    return this.vertices[e].branches
                }, chem.Dfs.prototype.numOpeningCycles = function(e) {
                    return this.edges[e].opening_cycles
                }, chem.Dfs.prototype.toString = function() {
                    var e = "";
                    return this.v_seq.each(function(t) {
                        e += t.idx + " -> "
                    }), e += "*"
                };

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../util/": 39,
            "../util/set": 42,
            "./element": 10
        }],
        10: [function(require, module, exports) {
            function el(e, t, r, n, o) {
                return {
                    label: e,
                    period: t,
                    group: r,
                    putHydrogenOnTheLeft: n,
                    color: o || "#000000"
                }
            }
            var Map = require("../util/map"),
                element = new Map({
                    1: el("H", 1, 1, !1, "#000000"),
                    2: el("He", 1, 8, !1, "#d9ffff"),
                    3: el("Li", 2, 1, !1, "#cc80ff"),
                    4: el("Be", 2, 2, !1, "#c2ff00"),
                    5: el("B", 2, 3, !1, "#ffb5b5"),
                    6: el("C", 2, 4, !1, "#000000"),
                    7: el("N", 2, 5, !1, "#304ff7"),
                    8: el("O", 2, 6, !0, "#ff0d0d"),
                    9: el("F", 2, 7, !0, "#8fe04f"),
                    10: el("Ne", 2, 8, !1, "#b3e3f5"),
                    11: el("Na", 3, 1, !1, "#ab5cf2"),
                    12: el("Mg", 3, 2, !1, "#8aff00"),
                    13: el("Al", 3, 3, !1, "#bfa6a6"),
                    14: el("Si", 3, 4, !1, "#f0c7a1"),
                    15: el("P", 3, 5, !1, "#ff8000"),
                    16: el("S", 3, 6, !0, "#d9a61a"),
                    17: el("Cl", 3, 7, !0, "#1fd01f"),
                    18: el("Ar", 3, 8, !1, "#80d1e3"),
                    19: el("K", 4, 1, !1, "#8f40d4"),
                    20: el("Ca", 4, 2, !1, "#3dff00"),
                    21: el("Sc", 4, 3, !1, "#e6e6e6"),
                    22: el("Ti", 4, 4, !1, "#bfc2c7"),
                    23: el("V", 4, 5, !1, "#a6a6ab"),
                    24: el("Cr", 4, 6, !1, "#8a99c7"),
                    25: el("Mn", 4, 7, !1, "#9c7ac7"),
                    26: el("Fe", 4, 8, !1, "#e06633"),
                    27: el("Co", 4, 8, !1, "#f08fa1"),
                    28: el("Ni", 4, 8, !1, "#4fd14f"),
                    29: el("Cu", 4, 1, !1, "#c78033"),
                    30: el("Zn", 4, 2, !1, "#7d80b0"),
                    31: el("Ga", 4, 3, !1, "#c28f8f"),
                    32: el("Ge", 4, 4, !1, "#668f8f"),
                    33: el("As", 4, 5, !1, "#bd80e3"),
                    34: el("Se", 4, 6, !0, "#ffa100"),
                    35: el("Br", 4, 7, !0, "#a62929"),
                    36: el("Kr", 4, 8, !1, "#5cb8d1"),
                    37: el("Rb", 5, 1, !1, "#702eb0"),
                    38: el("Sr", 5, 2, !1, "#00ff00"),
                    39: el("Y", 5, 3, !1, "#94ffff"),
                    40: el("Zr", 5, 4, !1, "#94e0e0"),
                    41: el("Nb", 5, 5, !1, "#73c2c9"),
                    42: el("Mo", 5, 6, !1, "#54b5b5"),
                    43: el("Tc", 5, 7, !1, "#3b9e9e"),
                    44: el("Ru", 5, 8, !1, "#248f8f"),
                    45: el("Rh", 5, 8, !1, "#0a7d8c"),
                    46: el("Pd", 5, 8, !1, "#006985"),
                    47: el("Ag", 5, 1, !1, "#bfbfbf"),
                    48: el("Cd", 5, 2, !1, "#ffd98f"),
                    49: el("In", 5, 3, !1, "#a67573"),
                    50: el("Sn", 5, 4, !1, "#668080"),
                    51: el("Sb", 5, 5, !1, "#9e63b5"),
                    52: el("Te", 5, 6, !1, "#d47a00"),
                    53: el("I", 5, 7, !0, "#940094"),
                    54: el("Xe", 5, 8, !1, "#429eb0"),
                    55: el("Cs", 6, 1, !1, "#57178f"),
                    56: el("Ba", 6, 2, !1, "#00c900"),
                    57: el("La", 6, 3, !1, "#70d4ff"),
                    58: el("Ce", 6, 3, !1, "#ffffc7"),
                    59: el("Pr", 6, 3, !1, "#d9ffc7"),
                    60: el("Nd", 6, 3, !1, "#c7ffc7"),
                    61: el("Pm", 6, 3, !1, "#a3ffc7"),
                    62: el("Sm", 6, 3, !1, "#8fffc7"),
                    63: el("Eu", 6, 3, !1, "#61ffc7"),
                    64: el("Gd", 6, 3, !1, "#45ffc7"),
                    65: el("Tb", 6, 3, !1, "#30ffc7"),
                    66: el("Dy", 6, 3, !1, "#1fffc7"),
                    67: el("Ho", 6, 3, !1, "#00ff9c"),
                    68: el("Er", 6, 3, !1, "#00e675"),
                    69: el("Tm", 6, 3, !1, "#00d452"),
                    70: el("Yb", 6, 3, !1, "#00bf38"),
                    71: el("Lu", 6, 3, !1, "#00ab24"),
                    72: el("Hf", 6, 4, !1, "#4dc2ff"),
                    73: el("Ta", 6, 5, !1, "#4da6ff"),
                    74: el("W", 6, 6, !1, "#2194d6"),
                    75: el("Re", 6, 7, !1, "#267dab"),
                    76: el("Os", 6, 8, !1, "#266696"),
                    77: el("Ir", 6, 8, !1, "#175487"),
                    78: el("Pt", 6, 8, !1, "#d1d1e0"),
                    79: el("Au", 6, 1, !1, "#ffd124"),
                    80: el("Hg", 6, 2, !1, "#b8b8d1"),
                    81: el("Tl", 6, 3, !1, "#a6544d"),
                    82: el("Pb", 6, 4, !1, "#575961"),
                    83: el("Bi", 6, 5, !1, "#9e4fb5"),
                    84: el("Po", 6, 6, !1, "#ab5c00"),
                    85: el("At", 6, 7, !1, "#754f45"),
                    86: el("Rn", 6, 8, !1, "#428296"),
                    87: el("Fr", 7, 1, !1, "#420066"),
                    88: el("Ra", 7, 2, !1, "#007d00"),
                    89: el("Ac", 7, 3, !1, "#70abfa"),
                    90: el("Th", 7, 3, !1, "#00baff"),
                    91: el("Pa", 7, 3, !1, "#00a1ff"),
                    92: el("U", 7, 3, !1, "#008fff"),
                    93: el("Np", 7, 3, !1, "#0080ff"),
                    94: el("Pu", 7, 3, !1, "#006bff"),
                    95: el("Am", 7, 3, !1, "#545cf2"),
                    96: el("Cm", 7, 3, !1, "#785ce3"),
                    97: el("Bk", 7, 3, !1, "#8a4fe3"),
                    98: el("Cf", 7, 3, !1, "#a136d4"),
                    99: el("Es", 7, 3, !1, "#b31fd4"),
                    100: el("Fm", 7, 3, !1, "#000000"),
                    101: el("Md", 7, 3, !1, "#000000"),
                    102: el("No", 7, 3, !1, "#000000"),
                    103: el("Lr", 7, 3, !1, "#000000"),
                    104: el("Rf", 7, 4, !1, "#4dc2ff"),
                    105: el("Db", 7, 5, !1, "#4da6ff"),
                    106: el("Sg", 7, 6, !1, "#2194d6"),
                    107: el("Bh", 7, 7, !1, "#267dab"),
                    108: el("Hs", 7, 8, !1, "#266696"),
                    109: el("Mt", 7, 8, !1, "#175487"),
                    110: el("Ds", 7, 8, !1, "#d1d1e0"),
                    111: el("Rg", 7, 1, !1, "#ffd124"),
                    112: el("Cn", 7, 2, !1, "#b8b8d1"),
                    113: el("Uut", 7, 3, !1),
                    114: el("Fl", 7, 4, !1),
                    115: el("Uup", 7, 5, !1),
                    116: el("Lv", 7, 6, !1),
                    117: el("Uus", 7, 7, !1),
                    118: el("Uuo", 7, 8, !1)
                }),
                labelMap = null;
            element.getElementByLabel = function(e) {
                return labelMap || (labelMap = {}, element.each(function(e, t) {
                    labelMap[t.label] = e - 0
                })), labelMap[e] || null
            }, module.exports = element;

        }, {
            "../util/map": 40
        }],
        11: [function(require, module, exports) {
            (function(global) {
                require("./struct"), require("./cis_trans"), require("./dfs"), require("./molfile"), require("./sgroup"), require("./smiles"), require("./stereocenters"), require("./struct_valence"), global.chem = global.chem || {};

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "./cis_trans": 8,
            "./dfs": 9,
            "./molfile": 12,
            "./sgroup": 13,
            "./smiles": 14,
            "./stereocenters": 15,
            "./struct": 16,
            "./struct_valence": 17
        }],
        12: [function(require, module, exports) {
            (function(global) {
                var Map = require("../util/map"),
                    Set = require("../util/set"),
                    Vec2 = require("../util/vec2"),
                    element = require("./element"),
                    util = require("../util"),
                    chem = global.chem = global.chem || {};
                chem.Molfile = function() {}, chem.Molfile.loadRGroupFragments = !0, chem.Molfile.parseDecimalInt = function(e) {
                    var t = parseInt(e, 10);
                    return isNaN(t) ? 0 : t
                }, chem.Molfile.partitionLine = function(e, t, r) {
                    for (var n = [], o = 0, i = 0; o < t.length; ++o) n.push(e.slice(i, i + t[o])), r && i++, i += t[o];
                    return n
                }, chem.Molfile.partitionLineFixed = function(e, t, r) {
                    for (var n = [], o = 0; o < e.length; o += t) n.push(e.slice(o, o + t)), r && o++;
                    return n
                }, chem.Molfile.parseCTFile = function(e) {
                    var t = Array.isArray(e) ? e : util.splitNewlines(e),
                        r = null;
                    return r = 0 == t[0].search("\\$RXN") ? chem.Molfile.parseRxn(t) : chem.Molfile.parseMol(t), r.initHalfBonds(), r.initNeighbors(), r.markFragments(), r
                }, chem.Molfile.fmtInfo = {
                    bondTypeMap: {
                        1: chem.Struct.BOND.TYPE.SINGLE,
                        2: chem.Struct.BOND.TYPE.DOUBLE,
                        3: chem.Struct.BOND.TYPE.TRIPLE,
                        4: chem.Struct.BOND.TYPE.AROMATIC,
                        5: chem.Struct.BOND.TYPE.SINGLE_OR_DOUBLE,
                        6: chem.Struct.BOND.TYPE.SINGLE_OR_AROMATIC,
                        7: chem.Struct.BOND.TYPE.DOUBLE_OR_AROMATIC,
                        8: chem.Struct.BOND.TYPE.ANY
                    },
                    bondStereoMap: {
                        0: chem.Struct.BOND.STEREO.NONE,
                        1: chem.Struct.BOND.STEREO.UP,
                        4: chem.Struct.BOND.STEREO.EITHER,
                        6: chem.Struct.BOND.STEREO.DOWN,
                        3: chem.Struct.BOND.STEREO.CIS_TRANS
                    },
                    v30bondStereoMap: {
                        0: chem.Struct.BOND.STEREO.NONE,
                        1: chem.Struct.BOND.STEREO.UP,
                        2: chem.Struct.BOND.STEREO.EITHER,
                        3: chem.Struct.BOND.STEREO.DOWN
                    },
                    bondTopologyMap: {
                        0: chem.Struct.BOND.TOPOLOGY.EITHER,
                        1: chem.Struct.BOND.TOPOLOGY.RING,
                        2: chem.Struct.BOND.TOPOLOGY.CHAIN
                    },
                    countsLinePartition: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 6],
                    atomLinePartition: [10, 10, 10, 1, 3, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
                    bondLinePartition: [3, 3, 3, 3, 3, 3, 3],
                    atomListHeaderPartition: [3, 1, 1, 4, 1, 1],
                    atomListHeaderLength: 11,
                    atomListHeaderItemLength: 4,
                    chargeMap: [0, 3, 2, 1, 0, -1, -2, -3],
                    valenceMap: [void 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0],
                    implicitHydrogenMap: [void 0, 0, 1, 2, 3, 4],
                    v30atomPropMap: {
                        CHG: "charge",
                        RAD: "radical",
                        MASS: "isotope",
                        VAL: "explicitValence",
                        HCOUNT: "hCount",
                        INVRET: "invRet",
                        SUBST: "substitutionCount",
                        UNSAT: "unsaturatedAtom",
                        RBCNT: "ringBondCount"
                    },
                    rxnItemsPartition: [3, 3, 3]
                }, chem.Molfile.parseAtomLine = function(e) {
                    var t = chem.Molfile,
                        r = t.partitionLine(e, t.fmtInfo.atomLinePartition),
                        n = {
                            pp: new Vec2(parseFloat(r[0]), -parseFloat(r[1])),
                            label: r[4].strip(),
                            explicitValence: t.fmtInfo.valenceMap[t.parseDecimalInt(r[10])],
                            massDifference: t.parseDecimalInt(r[5]),
                            charge: t.fmtInfo.chargeMap[t.parseDecimalInt(r[6])],
                            hCount: t.parseDecimalInt(t.parseDecimalInt(r[8])),
                            stereoCare: 0 != t.parseDecimalInt(r[9]),
                            aam: t.parseDecimalInt(r[14]),
                            invRet: t.parseDecimalInt(r[15]),
                            exactChangeFlag: 0 != t.parseDecimalInt(r[16])
                        };
                    return new chem.Struct.Atom(n)
                }, chem.Molfile.stripV30 = function(e) {
                    if ("M  V30 " != e.slice(0, 7)) throw Error("Prefix invalid");
                    return e.slice(7)
                }, chem.Molfile.parseAtomLineV3000 = function(e) {
                    var t, r, n, o, i, a = chem.Molfile;
                    t = a.spaceparsplit(e);
                    var s = {
                            pp: new Vec2(parseFloat(t[2]), -parseFloat(t[3])),
                            aam: t[5].strip()
                        },
                        l = t[1].strip();
                    if ('"' == l.charAt(0) && '"' == l.charAt(l.length - 1) && (l = l.substr(1, l.length - 2)), "]" == l.charAt(l.length - 1)) {
                        l = l.substr(0, l.length - 1);
                        var c = {};
                        if (c.notList = !1, "NOT [" == l.substr(0, 5)) c.notList = !0, l = l.substr(5);
                        else {
                            if ("[" != l.charAt(0)) throw "Error: atom list expected, found '" + l + "'";
                            l = l.substr(1)
                        }
                        c.ids = a.labelsListToIds(l.split(",")), s.atomList = new chem.Struct.AtomList(c), s.label = "L#"
                    } else s.label = l;
                    for (t.splice(0, 6), i = 0; i < t.length; ++i)
                        if (r = a.splitonce(t[i], "="), n = r[0], o = r[1], n in a.fmtInfo.v30atomPropMap) {
                            var u = a.parseDecimalInt(o);
                            if ("VAL" == n) {
                                if (0 == u) continue; - 1 == u && (u = 0)
                            }
                            s[a.fmtInfo.v30atomPropMap[n]] = u
                        } else if ("RGROUPS" == n) {
                        o = o.strip().substr(1, o.length - 2);
                        var d = o.split(" ").slice(1);
                        s.rglabel = 0;
                        for (var p = 0; p < d.length; ++p) s.rglabel |= 1 << d[p] - 1
                    } else "ATTCHPT" == n && (s.attpnt = o.strip() - 0);
                    return new chem.Struct.Atom(s)
                }, chem.Molfile.parseBondLineV3000 = function(e) {
                    var t, r, n, o, i, a = chem.Molfile;
                    t = a.spaceparsplit(e);
                    var s = {
                        begin: a.parseDecimalInt(t[2]) - 1,
                        end: a.parseDecimalInt(t[3]) - 1,
                        type: a.fmtInfo.bondTypeMap[a.parseDecimalInt(t[1])]
                    };
                    for (t.splice(0, 4), i = 0; i < t.length; ++i) r = a.splitonce(t[i], "="), n = r[0], o = r[1], "CFG" == n ? (s.stereo = a.fmtInfo.v30bondStereoMap[a.parseDecimalInt(o)], s.type == chem.Struct.BOND.TYPE.DOUBLE && s.stereo == chem.Struct.BOND.STEREO.EITHER && (s.stereo = chem.Struct.BOND.STEREO.CIS_TRANS)) : "TOPO" == n ? s.topology = a.fmtInfo.bondTopologyMap[a.parseDecimalInt(o)] : "RXCTR" == n ? s.reactingCenterStatus = a.parseDecimalInt(o) : "STBOX" == n && (s.stereoCare = a.parseDecimalInt(o));
                    return new chem.Struct.Bond(s)
                }, chem.Molfile.parseBondLine = function(e) {
                    var t = chem.Molfile,
                        r = t.partitionLine(e, t.fmtInfo.bondLinePartition),
                        n = {
                            begin: t.parseDecimalInt(r[0]) - 1,
                            end: t.parseDecimalInt(r[1]) - 1,
                            type: t.fmtInfo.bondTypeMap[t.parseDecimalInt(r[2])],
                            stereo: t.fmtInfo.bondStereoMap[t.parseDecimalInt(r[3])],
                            topology: t.fmtInfo.bondTopologyMap[t.parseDecimalInt(r[5])],
                            reactingCenterStatus: t.parseDecimalInt(r[6])
                        };
                    return new chem.Struct.Bond(n)
                }, chem.Molfile.parseAtomListLine = function(e) {
                    for (var t = chem.Molfile, r = t.partitionLine(e, t.fmtInfo.atomListHeaderPartition), n = t.parseDecimalInt(r[0]) - 1, o = "T" == r[2].strip(), i = t.parseDecimalInt(r[4].strip()), a = e.slice(t.fmtInfo.atomListHeaderLength), s = [], l = t.fmtInfo.atomListHeaderItemLength, c = 0; i > c; ++c) s[c] = t.parseDecimalInt(a.slice(c * l, (c + 1) * l - 1));
                    return {
                        aid: n,
                        atomList: new chem.Struct.AtomList({
                            notList: o,
                            ids: s
                        })
                    }
                }, chem.Molfile.readKeyValuePairs = function(e, t) {
                    for (var r = chem.Molfile, n = {}, o = r.partitionLineFixed(e, 3, !0), i = r.parseDecimalInt(o[0]), a = 0; i > a; ++a) n[r.parseDecimalInt(o[2 * a + 1]) - 1] = t ? o[2 * a + 2].strip() : r.parseDecimalInt(o[2 * a + 2]);
                    return n
                }, chem.Molfile.readKeyMultiValuePairs = function(e, t) {
                    for (var r = chem.Molfile, n = [], o = r.partitionLineFixed(e, 3, !0), i = r.parseDecimalInt(o[0]), a = 0; i > a; ++a) n.push([r.parseDecimalInt(o[2 * a + 1]) - 1, t ? o[2 * a + 2].strip() : r.parseDecimalInt(o[2 * a + 2])]);
                    return n
                }, chem.Molfile.labelsListToIds = function(e) {
                    for (var t = [], r = 0; r < e.length; ++r) t.push(element.getElementByLabel(e[r].strip()));
                    return t
                }, chem.Molfile.parsePropertyLineAtomList = function(e, t) {
                    var r = chem.Molfile,
                        n = r.parseDecimalInt(e[1]) - 1,
                        o = r.parseDecimalInt(e[2]),
                        i = "T" == e[4].strip(),
                        a = r.labelsListToIds(t.slice(0, o)),
                        s = {};
                    return s[n] = new chem.Struct.AtomList({
                        notList: i,
                        ids: a
                    }), s
                }, chem.Molfile.initSGroup = function(e, t) {
                    var r = chem.Molfile,
                        n = r.readKeyValuePairs(t, !0);
                    for (var o in n) {
                        var i = n[o];
                        if (!(i in chem.SGroup.TYPES)) throw new Error("Unsupported S-group type");
                        var a = new chem.SGroup(i);
                        a.number = o, e[o] = a
                    }
                }, chem.Molfile.applySGroupProp = function(e, t, r, n, o) {
                    var i = chem.Molfile,
                        a = i.readKeyValuePairs(r, !n);
                    for (var s in a)(o ? e[s] : e[s].data)[t] = a[s]
                }, chem.Molfile.toIntArray = function(e) {
                    for (var t = chem.Molfile, r = [], n = 0; n < e.length; ++n) r[n] = t.parseDecimalInt(e[n]);
                    return r
                }, chem.Molfile.applySGroupArrayProp = function(e, t, r, n) {
                    var o = chem.Molfile,
                        i = o.parseDecimalInt(r.slice(1, 4)) - 1,
                        a = o.parseDecimalInt(r.slice(4, 8)),
                        s = o.toIntArray(o.partitionLineFixed(r.slice(8), 3, !0));
                    if (s.length != a) throw new Error("File format invalid");
                    n && util.apply(s, function(e) {
                        return e + n
                    }), e[i][t] = e[i][t].concat(s)
                }, chem.Molfile.applyDataSGroupName = function(e, t) {
                    e.data.fieldName = t
                }, chem.Molfile.applyDataSGroupQuery = function(e, t) {
                    e.data.query = t
                }, chem.Molfile.applyDataSGroupQueryOp = function(e, t) {
                    e.data.queryOp = t
                }, chem.Molfile.applyDataSGroupDesc = function(e, t) {
                    var r = chem.Molfile,
                        n = r.partitionLine(t, [4, 31, 2, 20, 2, 3], !1),
                        o = r.parseDecimalInt(n[0]) - 1,
                        i = n[1].strip(),
                        a = n[2].strip(),
                        s = n[3].strip(),
                        l = n[4].strip(),
                        c = n[5].strip(),
                        u = e[o];
                    u.data.fieldType = a, u.data.fieldName = i, u.data.units = s, u.data.query = l, u.data.queryOp = c
                }, chem.Molfile.applyDataSGroupInfo = function(e, t) {
                    var r = chem.Molfile,
                        n = r.partitionLine(t, [10, 10, 4, 1, 1, 1, 3, 3, 3, 3, 2, 3, 2], !1),
                        o = parseFloat(n[0]),
                        i = parseFloat(n[1]),
                        a = "A" == n[3].strip(),
                        s = "A" == n[4].strip(),
                        l = "U" == n[5].strip(),
                        c = n[7].strip();
                    c = "ALL" == c ? -1 : r.parseDecimalInt(c);
                    var u = n[10].strip(),
                        d = r.parseDecimalInt(n[11].strip());
                    e.pp = new Vec2(o, -i), e.data.attached = a, e.data.absolute = s, e.data.showUnits = l, e.data.nCharsToDisplay = c, e.data.tagChar = u, e.data.daspPos = d
                }, chem.Molfile.applyDataSGroupInfoLine = function(e, t) {
                    var r = chem.Molfile,
                        n = r.parseDecimalInt(t.substr(0, 4)) - 1,
                        o = e[n];
                    r.applyDataSGroupInfo(o, t.substr(5))
                }, chem.Molfile.applyDataSGroupData = function(e, t, r) {
                    e.data.fieldValue = (e.data.fieldValue || "") + t, r && (e.data.fieldValue = util.stripRight(e.data.fieldValue), e.data.fieldValue.startsWith('"') && e.data.fieldValue.endsWith('"') && (e.data.fieldValue = e.data.fieldValue.substr(1, e.data.fieldValue.length - 2)))
                }, chem.Molfile.applyDataSGroupDataLine = function(e, t, r) {
                    var n = chem.Molfile,
                        o = n.parseDecimalInt(t.substr(0, 5)) - 1,
                        i = t.substr(5),
                        a = e[o];
                    n.applyDataSGroupData(a, i, r)
                }, chem.Molfile.parsePropertyLines = function(e, t, r, n, o, i) {
                    for (var a = chem.Molfile, s = new Map; n > r;) {
                        var l = t[r];
                        if ("A" == l.charAt(0)) s.get("label") || s.set("label", new Map), s.get("label").set(a.parseDecimalInt(l.slice(3, 6)) - 1, t[++r]);
                        else if ("M" == l.charAt(0)) {
                            var c = l.slice(3, 6),
                                u = l.slice(6);
                            if ("END" == c) break;
                            if ("CHG" == c) s.get("charge") || s.set("charge", new Map), s.get("charge").update(a.readKeyValuePairs(u));
                            else if ("RAD" == c) s.get("radical") || s.set("radical", new Map), s.get("radical").update(a.readKeyValuePairs(u));
                            else if ("ISO" == c) s.get("isotope") || s.set("isotope", new Map), s.get("isotope").update(a.readKeyValuePairs(u));
                            else if ("RBC" == c) s.get("ringBondCount") || s.set("ringBondCount", new Map), s.get("ringBondCount").update(a.readKeyValuePairs(u));
                            else if ("SUB" == c) s.get("substitutionCount") || s.set("substitutionCount", new Map), s.get("substitutionCount").update(a.readKeyValuePairs(u));
                            else if ("UNS" == c) s.get("unsaturatedAtom") || s.set("unsaturatedAtom", new Map), s.get("unsaturatedAtom").update(a.readKeyValuePairs(u));
                            else if ("RGP" == c) {
                                s.get("rglabel") || s.set("rglabel", new Map);
                                for (var d = s.get("rglabel"), p = a.readKeyMultiValuePairs(u), h = 0; h < p.length; h++) {
                                    var f = p[h];
                                    d.set(f[0], (d.get(f[0]) || 0) | 1 << f[1] - 1)
                                }
                            } else if ("LOG" == c) {
                                u = u.slice(4);
                                var m = a.parseDecimalInt(u.slice(0, 3).strip()),
                                    g = a.parseDecimalInt(u.slice(4, 7).strip()),
                                    v = a.parseDecimalInt(u.slice(8, 11).strip()),
                                    b = u.slice(12).strip(),
                                    S = {};
                                g > 0 && (S.ifthen = g), S.resth = 1 == v, S.range = b, i[m] = S
                            } else if ("APO" == c) s.get("attpnt") || s.set("attpnt", new Map), s.get("attpnt").update(a.readKeyValuePairs(u));
                            else if ("ALS" == c) {
                                s.get("atomList") || s.set("atomList", new Map);
                                var w = a.parsePropertyLineAtomList(a.partitionLine(u, [1, 3, 3, 1, 1, 1]), a.partitionLineFixed(u.slice(10), 4, !1));
                                s.get("atomList").update(w), s.get("label") || s.set("label", new Map);
                                for (var A in w) s.get("label").set(A, "L#")
                            } else if ("STY" == c) a.initSGroup(o, u);
                            else if ("SST" == c) a.applySGroupProp(o, "subtype", u);
                            else if ("SLB" == c) a.applySGroupProp(o, "label", u, !0);
                            else if ("SPL" == c) a.applySGroupProp(o, "parent", u, !0, !0);
                            else if ("SCN" == c) a.applySGroupProp(o, "connectivity", u);
                            else if ("SAL" == c) a.applySGroupArrayProp(o, "atoms", u, -1);
                            else if ("SBL" == c) a.applySGroupArrayProp(o, "bonds", u, -1);
                            else if ("SPA" == c) a.applySGroupArrayProp(o, "patoms", u, -1);
                            else if ("SMT" == c) {
                                var y = a.parseDecimalInt(u.slice(0, 4)) - 1;
                                o[y].data.subscript = u.slice(4).strip()
                            } else "SDT" == c ? a.applyDataSGroupDesc(o, u) : "SDD" == c ? a.applyDataSGroupInfoLine(o, u) : "SCD" == c ? a.applyDataSGroupDataLine(o, u, !1) : "SED" == c && a.applyDataSGroupDataLine(o, u, !0)
                        }++r
                    }
                    return s
                }, chem.Molfile.applyAtomProp = function(e, t, r) {
                    t.each(function(t, n) {
                        e.get(t)[r] = n
                    })
                }, chem.Molfile.parseCTabV2000 = function(e, t) {
                    var r, n = new chem.Struct,
                        o = chem.Molfile,
                        i = o.parseDecimalInt(t[0]),
                        a = o.parseDecimalInt(t[1]),
                        s = o.parseDecimalInt(t[2]);
                    n.isChiral = 0 != o.parseDecimalInt(t[4]);
                    var l = o.parseDecimalInt(t[5]),
                        c = o.parseDecimalInt(t[10]),
                        u = 0,
                        d = e.slice(u, u + i);
                    u += i;
                    var p = e.slice(u, u + a);
                    u += a;
                    var h = e.slice(u, u + s);
                    u += s + l;
                    var f = d.map(o.parseAtomLine);
                    for (r = 0; r < f.length; ++r) n.atoms.add(f[r]);
                    var m = p.map(o.parseBondLine);
                    for (r = 0; r < m.length; ++r) n.bonds.add(m[r]);
                    var g = h.map(o.parseAtomListLine);
                    g.each(function(e) {
                        n.atoms.get(e.aid).atomList = e.atomList, n.atoms.get(e.aid).label = "L#"
                    });
                    var v = {},
                        b = {},
                        S = o.parsePropertyLines(n, e, u, Math.min(e.length, u + c), v, b);
                    S.each(function(e, t) {
                        o.applyAtomProp(n.atoms, t, e)
                    });
                    var w, A = {};
                    for (w in v) {
                        var y = v[w];
                        if ("DAT" === y.type && 0 === y.atoms.length) {
                            var O = v[w].parent;
                            if (O >= 0) {
                                var C = v[O - 1];
                                "GEN" === C.type && (y.atoms = util.array(C.atoms))
                            }
                        }
                    }
                    for (w in v) chem.SGroup.addGroup(n, v[w], A);
                    var D = [];
                    for (w in v) chem.SGroup.filter(n, v[w], A), 0 != v[w].atoms.length || v[w].allAtoms || D.push(w);
                    for (r = 0; r < D.length; ++r) n.sGroupForest.remove(D[r]), n.sgroups.remove(D[r]);
                    for (var x in b) n.rgroups.set(x, new chem.Struct.RGroup(b[x]));
                    return n
                }, chem.Molfile.spaceparsplit = function(e) {
                    var t, r, n = [],
                        o = 0,
                        i = -1,
                        a = e.toArray(),
                        s = !1;
                    for (r = 0; r < e.length; ++r) t = a[r], "(" == t ? o++ : ")" == t && o--, '"' == t && (s = !s), s || " " != a[r] || 0 != o || (r > i + 1 && n.push(e.slice(i + 1, r)), i = r);
                    return r > i + 1 && n.push(e.slice(i + 1, r)), i = r, n
                }, chem.Molfile.splitonce = function(e, t) {
                    var r = e.indexOf(t);
                    return [e.slice(0, r), e.slice(r + 1)]
                }, chem.Molfile.splitSGroupDef = function(e) {
                    for (var t = [], r = 0, n = !1, o = 0; o < e.length; ++o) {
                        var i = e.charAt(o);
                        '"' == i ? n = !n : n || ("(" == i ? r++ : ")" == i ? r-- : " " == i && 0 == r && (t.push(e.slice(0, o)), e = e.slice(o + 1).strip(), o = 0))
                    }
                    if (0 != r) throw "Brace balance broken. S-group properies invalid!";
                    return e.length > 0 && t.push(e.strip()), t
                }, chem.Molfile.parseBracedNumberList = function(e, t) {
                    if (!e) return null;
                    var r = [];
                    e = e.strip(), e = e.substr(1, e.length - 2);
                    var n = e.split(" ");
                    t = t || 0;
                    for (var o = 1; o < n.length; ++o) r.push(n[o] - 0 + t);
                    return r
                }, chem.Molfile.v3000parseCollection = function(e, t, r) {
                    for (r++;
                        "M  V30 END COLLECTION" != t[r].strip();) r++;
                    return r++, r
                }, chem.Molfile.v3000parseSGroup = function(e, t, r, n, o) {
                    var i = chem.Molfile,
                        a = "";
                    for (o++; o < t.length;) {
                        if (a = i.stripV30(t[o++]).strip(), "END SGROUP" == a.strip()) return o;
                        for (;
                            "-" == a.charAt(a.length - 1);) a = (a.substr(0, a.length - 1) + i.stripV30(t[o++])).strip();
                        var s = i.splitSGroupDef(a),
                            l = s[1],
                            c = new chem.SGroup(l);
                        c.number = s[0] - 0, c.type = l, c.label = s[2] - 0, r[c.number] = c;
                        for (var u = {}, d = 3; d < s.length; ++d) {
                            var p = i.splitonce(s[d], "=");
                            if (2 != p.length) throw "A record of form AAA=BBB or AAA=(...) expected, got '" + s[d] + "'";
                            var h = p[0];
                            h in u || (u[h] = []), u[h].push(p[1])
                        }
                        c.atoms = i.parseBracedNumberList(u.ATOMS[0], -1), u.PATOMS && (c.patoms = i.parseBracedNumberList(u.PATOMS[0], -1)), c.bonds = u.BONDS ? i.parseBracedNumberList(u.BONDS[0], -1) : [];
                        var f = u.BRKXYZ;
                        if (c.brkxyz = [], f)
                            for (var m = 0; m < f.length; ++m) c.brkxyz.push(i.parseBracedNumberList(f[m]));
                        u.MULT && (c.data.subscript = u.MULT[0] - 0), u.LABEL && (c.data.subscript = u.LABEL[0].strip()), u.CONNECT && (c.data.connectivity = u.CONNECT[0].toLowerCase()), u.FIELDDISP && i.applyDataSGroupInfo(c, util.stripQuotes(u.FIELDDISP[0])), u.FIELDDATA && i.applyDataSGroupData(c, u.FIELDDATA[0], !0), u.FIELDNAME && i.applyDataSGroupName(c, u.FIELDNAME[0]), u.QUERYTYPE && i.applyDataSGroupQuery(c, u.QUERYTYPE[0]), u.QUERYOP && i.applyDataSGroupQueryOp(c, u.QUERYOP[0]), chem.SGroup.addGroup(e, c, n)
                    }
                    throw new Error("S-group declaration incomplete.")
                }, chem.Molfile.parseCTabV3000 = function(e, t) {
                    var r = new chem.Struct,
                        n = chem.Molfile,
                        o = 0;
                    if ("M  V30 BEGIN CTAB" != e[o++].strip()) throw Error("CTAB V3000 invalid");
                    if ("M  V30 COUNTS" != e[o].slice(0, 13)) throw Error("CTAB V3000 invalid");
                    var i = e[o].slice(14).split(" ");
                    if (r.isChiral = 1 == n.parseDecimalInt(i[4]), o++, "M  V30 BEGIN ATOM" == e[o].strip()) {
                        o++;
                        for (var a; o < e.length && (a = n.stripV30(e[o++]).strip(), "END ATOM" != a);) {
                            for (;
                                "-" == a.charAt(a.length - 1);) a = (a.substring(0, a.length - 1) + n.stripV30(e[o++])).strip();
                            r.atoms.add(n.parseAtomLineV3000(a))
                        }
                        if ("M  V30 BEGIN BOND" == e[o].strip())
                            for (o++; o < e.length && (a = n.stripV30(e[o++]).strip(), "END BOND" != a);) {
                                for (;
                                    "-" == a.charAt(a.length - 1);) a = (a.substring(0, a.length - 1) + n.stripV30(e[o++])).strip();
                                r.bonds.add(n.parseBondLineV3000(a))
                            }
                        for (var s = {}, l = {};
                            "M  V30 END CTAB" != e[o].strip();)
                            if ("M  V30 BEGIN COLLECTION" == e[o].strip()) o = n.v3000parseCollection(r, e, o);
                            else {
                                if ("M  V30 BEGIN SGROUP" != e[o].strip()) throw Error("CTAB V3000 invalid");
                                o = n.v3000parseSGroup(r, e, s, l, o)
                            }
                    }
                    if ("M  V30 END CTAB" != e[o++].strip()) throw Error("CTAB V3000 invalid");
                    return t || n.readRGroups3000(r, e.slice(o)), r
                }, chem.Molfile.readRGroups3000 = function(e, t) {
                    for (var r = {}, n = {}, o = 0, i = chem.Molfile; o < t.length && 0 == t[o].search("M  V30 BEGIN RGROUP");) {
                        var a = t[o++].split(" ").pop();
                        for (r[a] = [], n[a] = {};;) {
                            var s = t[o].strip();
                            if (0 != s.search("M  V30 RLOGIC")) {
                                if ("M  V30 BEGIN CTAB" != s) throw Error("CTAB V3000 invalid");
                                for (var l = 0; l < t.length && "M  V30 END CTAB" != t[o + l].strip(); ++l);
                                var c = t.slice(o, o + l + 1),
                                    u = this.parseCTabV3000(c, !0);
                                if (r[a].push(u), o = o + l + 1, "M  V30 END RGROUP" == t[o].strip()) {
                                    o++;
                                    break
                                }
                            } else {
                                s = s.slice(13);
                                var d = s.strip().split(/\s+/g),
                                    p = i.parseDecimalInt(d[0]),
                                    h = i.parseDecimalInt(d[1]),
                                    f = d.slice(2).join(" "),
                                    m = {};
                                p > 0 && (m.ifthen = p), m.resth = 1 == h, m.range = f, n[a] = m, o++
                            }
                        }
                    }
                    for (var g in r)
                        for (var v = 0; v < r[g].length; ++v) {
                            var b = r[g][v];
                            b.rgroups.set(g, new chem.Struct.RGroup(n[g]));
                            var S = b.frags.add(new chem.Struct.Fragment);
                            b.rgroups.get(g).frags.add(S), b.atoms.each(function(e, t) {
                                t.fragment = S
                            }), b.mergeInto(e)
                        }
                }, chem.Molfile.parseMol = function(e) {
                    if (0 == e[0].search("\\$MDL")) return this.parseRg2000(e);
                    var t = this.parseCTab(e.slice(3));
                    return t.name = e[0].strip(), t
                }, chem.Molfile.parseCTab = function(e) {
                    var t = chem.Molfile,
                        r = t.partitionLine(e[0], t.fmtInfo.countsLinePartition),
                        n = r[11].strip();
                    if (e = e.slice(1), "V2000" == n) return this.parseCTabV2000(e, r);
                    if ("V3000" == n) return this.parseCTabV3000(e, !chem.Molfile.loadRGroupFragments);
                    throw Error("Molfile version unknown: " + n)
                }, chem.MolfileSaver = function(e) {
                    this.molecule = null, this.molfile = null, this.v3000 = e || !1
                }, chem.MolfileSaver.prototype.prepareSGroups = function(e, t) {
                    var r = this.molecule;
                    r.sgroups;
                    var n = [],
                        o = 0;
                    util.each(this.molecule.sGroupForest.getSGroupsBFS().reverse(), function(i) {
                        var a = r.sgroups.get(i),
                            s = !1;
                        try {
                            a.prepareForSaving(r)
                        } catch (l) {
                            if (!e || "number" != typeof l.id) throw l;
                            s = !0
                        }(s || !t && /^INDIGO_.+_DESC$/i.test(a.data.fieldName)) && (o += s, n.push(a.id))
                    }, this), o && alert("WARNING: " + o + " invalid S-groups were detected. They will be omitted.");
                    for (var i = 0; i < n.length; ++i) r.sGroupDelete(n[i]);
                    return r
                }, chem.MolfileSaver.getComponents = function(e) {
                    var t = e.findConnectedComponents(!0),
                        r = [],
                        n = null;
                    e.rxnArrows.each(function(e, t) {
                        n = t.pp.x
                    }), e.rxnPluses.each(function(e, t) {
                        r.push(t.pp.x)
                    }), null != n && r.push(n), r.sort(function(e, t) {
                        return e - t
                    });
                    var o, i = [];
                    for (o = 0; o < t.length; ++o) {
                        for (var a = e.getCoordBoundingBox(t[o]), s = Vec2.lc2(a.min, .5, a.max, .5), l = 0; s.x > r[l];) ++l;
                        i[l] = i[l] || {}, Set.mergeIn(i[l], t[o])
                    }
                    var c = [],
                        u = [],
                        d = [];
                    for (o = 0; o < i.length; ++o) i[o] ? (a = e.getCoordBoundingBox(i[o]), s = Vec2.lc2(a.min, .5, a.max, .5), s.x < n ? u.push(i[o]) : d.push(i[o])) : c.push("");
                    return {
                        reactants: u,
                        products: d
                    }
                }, chem.MolfileSaver.prototype.getCTab = function(e, t) {
                    return this.molecule = e.clone(), this.molfile = "", this.writeCTab2000(t), this.molfile
                }, chem.MolfileSaver.prototype.saveMolecule = function(e, t, r, n) {
                    if (this.reaction = e.rxnArrows.count() > 0, e.rxnArrows.count() > 1) throw new Error("Reaction may not contain more than one arrow");
                    if (this.molfile = "", this.reaction) {
                        if (e.rgroups.count() > 0) throw new Error("Unable to save the structure - reactions with r-groups are not supported at the moment");
                        var o = chem.MolfileSaver.getComponents(e),
                            i = o.reactants,
                            a = o.products,
                            s = i.concat(a);
                        this.molfile = "$RXN\n\n\n\n" + util.paddedInt(i.length, 3) + util.paddedInt(a.length, 3) + util.paddedInt(0, 3) + "\n";
                        for (var l = 0; l < s.length; ++l) {
                            var c = new chem.MolfileSaver(!1),
                                u = e.clone(s[l], null, !0),
                                d = c.saveMolecule(u, !1, !0);
                            this.molfile += "$MOL\n" + d
                        }
                        return this.molfile
                    }
                    if (e.rgroups.count() > 0) {
                        if (!r) {
                            var p = new chem.MolfileSaver(!1).getCTab(e.getScaffold(), e.rgroups);
                            return this.molfile = "$MDL  REV  1\n$MOL\n$HDR\n\n\n\n$END HDR\n", this.molfile += "$CTAB\n" + p + "$END CTAB\n", e.rgroups.each(function(t, r) {
                                this.molfile += "$RGP\n", this.writePaddedNumber(t, 3), this.molfile += "\n", r.frags.each(function(t, r) {
                                    var n = new chem.MolfileSaver(!1).getCTab(e.getFragment(r));
                                    this.molfile += "$CTAB\n" + n + "$END CTAB\n"
                                }, this), this.molfile += "$END RGP\n"
                            }, this), this.molfile += "$END MOL\n", this.molfile
                        }
                        e = e.getScaffold()
                    }
                    return this.molecule = e.clone(), this.prepareSGroups(t, n), this.writeHeader(), this.writeCTab2000(), this.molfile
                }, chem.MolfileSaver.prototype.writeHeader = function() {
                    var e = new Date;
                    this.writeCR(), this.writeWhiteSpace(2), this.write("Ketcher"), this.writeWhiteSpace(), this.writeCR((e.getMonth() + 1).toPaddedString(2) + e.getDate().toPaddedString(2) + (e.getFullYear() % 100).toPaddedString(2) + e.getHours().toPaddedString(2) + e.getMinutes().toPaddedString(2) + "2D 1   1.00000     0.00000     0"), this.writeCR()
                }, chem.MolfileSaver.prototype.write = function(e) {
                    this.molfile += e
                }, chem.MolfileSaver.prototype.writeCR = function(e) {
                    0 == arguments.length && (e = ""), this.molfile += e + "\n"
                }, chem.MolfileSaver.prototype.writeWhiteSpace = function(e) {
                    0 == arguments.length && (e = 1), e.times(function() {
                        this.write(" ")
                    }, this)
                }, chem.MolfileSaver.prototype.writePadded = function(e, t) {
                    this.write(e), this.writeWhiteSpace(t - e.length)
                }, chem.MolfileSaver.prototype.writePaddedNumber = function(e, t) {
                    var r = (e - 0).toString();
                    this.writeWhiteSpace(t - r.length), this.write(r)
                }, chem.MolfileSaver.prototype.writePaddedFloat = function(e, t, r) {
                    this.write(util.paddedFloat(e, t, r))
                }, chem.MolfileSaver.prototype.writeCTab2000Header = function() {
                    this.writePaddedNumber(this.molecule.atoms.count(), 3), this.writePaddedNumber(this.molecule.bonds.count(), 3), this.writePaddedNumber(0, 3), this.writeWhiteSpace(3), this.writePaddedNumber(this.molecule.isChiral ? 1 : 0, 3), this.writePaddedNumber(0, 3), this.writeWhiteSpace(12), this.writePaddedNumber(999, 3), this.writeCR(" V2000")
                }, chem.MolfileSaver.prototype.writeCTab2000 = function(e) {
                    this.writeCTab2000Header(), this.mapping = {};
                    var t = 1,
                        r = [],
                        n = [];
                    for (this.molecule.atoms.each(function(e, o) {
                            this.writePaddedFloat(o.pp.x, 10, 4), this.writePaddedFloat(-o.pp.y, 10, 4), this.writePaddedFloat(0, 10, 4), this.writeWhiteSpace();
                            var i = o.label;
                            null != o.atomList ? (i = "L", r.push(e)) : null == element.getElementByLabel(i) && -1 == ["A", "Q", "X", "*", "R#"].indexOf(i) && (i = "C", n.push(e)), this.writePadded(i, 3), this.writePaddedNumber(0, 2), this.writePaddedNumber(0, 3), this.writePaddedNumber(0, 3), Object.isUndefined(o.hCount) && (o.hCount = 0), this.writePaddedNumber(o.hCount, 3), Object.isUndefined(o.stereoCare) && (o.stereoCare = 0), this.writePaddedNumber(o.stereoCare, 3), this.writePaddedNumber(o.explicitValence < 0 ? 0 : 0 == o.explicitValence ? 15 : o.explicitValence, 3), this.writePaddedNumber(0, 3), this.writePaddedNumber(0, 3), this.writePaddedNumber(0, 3), Object.isUndefined(o.aam) && (o.aam = 0), this.writePaddedNumber(o.aam, 3), Object.isUndefined(o.invRet) && (o.invRet = 0), this.writePaddedNumber(o.invRet, 3), Object.isUndefined(o.exactChangeFlag) && (o.exactChangeFlag = 0), this.writePaddedNumber(o.exactChangeFlag, 3), this.writeCR(), this.mapping[e] = t, t++
                        }, this), this.bondMapping = {}, t = 1, this.molecule.bonds.each(function(e, r) {
                            this.bondMapping[e] = t++, this.writePaddedNumber(this.mapping[r.begin], 3), this.writePaddedNumber(this.mapping[r.end], 3), this.writePaddedNumber(r.type, 3), Object.isUndefined(r.stereo) && (r.stereo = 0), this.writePaddedNumber(r.stereo, 3), this.writeWhiteSpace(3), Object.isUndefined(r.topology) && (r.topology = 0), this.writePaddedNumber(r.topology, 3), Object.isUndefined(r.reactingCenterStatus) && (r.reactingCenterStatus = 0), this.writePaddedNumber(r.reactingCenterStatus, 3), this.writeCR()
                        }, this); n.length > 0;) this.write("A  "), this.writePaddedNumber(n[0] + 1, 3), this.writeCR(), this.writeCR(this.molecule.atoms.get(n[0]).label), n.splice(0, 1);
                    var o = new Array,
                        i = new Array,
                        a = new Array,
                        s = new Array,
                        l = new Array,
                        c = new Array,
                        u = new Array,
                        d = new Array,
                        p = new Array;
                    this.molecule.atoms.each(function(e, t) {
                        if (0 != t.charge && o.push([e, t.charge]), 0 != t.isotope && i.push([e, t.isotope]), 0 != t.radical && a.push([e, t.radical]), null != t.rglabel && "R#" == t.label)
                            for (var r = 0; 32 > r; r++) t.rglabel & 1 << r && s.push([e, r + 1]);
                        null != t.attpnt && c.push([e, t.attpnt]), 0 != t.ringBondCount && u.push([e, t.ringBondCount]), 0 != t.substitutionCount && p.push([e, t.substitutionCount]), 0 != t.unsaturatedAtom && d.push([e, t.unsaturatedAtom])
                    }), e && e.each(function(e, t) {
                        if (t.resth || t.ifthen > 0 || t.range.length > 0) {
                            var r = "  1 " + util.paddedInt(e, 3) + " " + util.paddedInt(t.ifthen, 3) + " " + util.paddedInt(t.resth ? 1 : 0, 3) + "   " + t.range;
                            l.push(r)
                        }
                    });
                    var h = function(e, t) {
                        for (; t.length > 0;) {
                            for (var r = new Array; t.length > 0 && r.length < 8;) r.push(t[0]), t.splice(0, 1);
                            this.write(e), this.writePaddedNumber(r.length, 3), r.each(function(e) {
                                this.writeWhiteSpace(), this.writePaddedNumber(this.mapping[e[0]], 3), this.writeWhiteSpace(), this.writePaddedNumber(e[1], 3)
                            }, this), this.writeCR()
                        }
                    };
                    h.call(this, "M  CHG", o), h.call(this, "M  ISO", i), h.call(this, "M  RAD", a), h.call(this, "M  RGP", s);
                    for (var f = 0; f < l.length; ++f) this.write("M  LOG" + l[f] + "\n");
                    if (h.call(this, "M  APO", c), h.call(this, "M  RBC", u), h.call(this, "M  SUB", p), h.call(this, "M  UNS", d), r.length > 0)
                        for (f = 0; f < r.length; ++f) {
                            var m = r[f],
                                g = this.molecule.atoms.get(m).atomList;
                            this.write("M  ALS"), this.writePaddedNumber(m + 1, 4), this.writePaddedNumber(g.ids.length, 3), this.writeWhiteSpace(), this.write(g.notList ? "T" : "F");
                            for (var v = g.labelList(), b = 0; b < v.length; ++b) this.writeWhiteSpace(), this.writePadded(v[b], 3);
                            this.writeCR()
                        }
                    var S = {},
                        w = 1,
                        A = {},
                        y = this.molecule.sGroupForest.getSGroupsBFS();
                    util.each(y, function(e) {
                        A[w] = e, S[e] = w++
                    }, this);
                    for (var O = 1; w > O; ++O) {
                        var C = A[O],
                            D = this.molecule.sgroups.get(C);
                        this.write("M  STY"), this.writePaddedNumber(1, 3), this.writeWhiteSpace(1), this.writePaddedNumber(O, 3), this.writeWhiteSpace(1), this.writePadded(D.type, 3), this.writeCR(), this.write("M  SLB"), this.writePaddedNumber(1, 3), this.writeWhiteSpace(1), this.writePaddedNumber(O, 3), this.writeWhiteSpace(1), this.writePaddedNumber(O, 3), this.writeCR();
                        var x = this.molecule.sGroupForest.parent.get(C);
                        if (x >= 0 && (this.write("M  SPL"), this.writePaddedNumber(1, 3), this.writeWhiteSpace(1), this.writePaddedNumber(O, 3), this.writeWhiteSpace(1), this.writePaddedNumber(S[x], 3), this.writeCR()), "SRU" == D.type && D.data.connectivity) {
                            var M = "";
                            M += " ", M += util.stringPadded(O.toString(), 3), M += " ", M += util.stringPadded(D.data.connectivity, 3, !0), this.write("M  SCN"), this.writePaddedNumber(1, 3), this.write(M.toUpperCase()), this.writeCR()
                        }
                        "SRU" == D.type && (this.write("M  SMT "), this.writePaddedNumber(O, 3), this.writeWhiteSpace(), this.write(D.data.subscript || "n"), this.writeCR()), this.writeCR(D.saveToMolfile(this.molecule, S, this.mapping, this.bondMapping))
                    }
                    this.writeCR("M  END")
                }, chem.Molfile.parseRxn = function(e) {
                    var t = chem.Molfile,
                        r = e[0].strip().split(" ");
                    return r.length > 1 && "V3000" == r[1] ? t.parseRxn3000(e) : t.parseRxn2000(e)
                }, chem.Molfile.parseRxn2000 = function(e) {
                    var t = chem.Molfile;
                    e = e.slice(4);
                    var r = t.partitionLine(e[0], t.fmtInfo.rxnItemsPartition),
                        n = r[0] - 0,
                        o = r[1] - 0,
                        i = r[2] - 0;
                    e = e.slice(1);
                    for (var a = []; e.length > 0 && "$MOL" == e[0].substr(0, 4);) {
                        e = e.slice(1);
                        for (var s = 0; s < e.length && "$MOL" != e[s].substr(0, 4);) s++;
                        a.push(chem.Molfile.parseMol(e.slice(0, s))), e = e.slice(s)
                    }
                    return t.rxnMerge(a, n, o, i)
                }, chem.Molfile.parseRxn3000 = function(e) {
                    var t = chem.Molfile;
                    e = e.slice(4);
                    for (var r = e[0].split(/\s+/g).slice(3), n = r[0] - 0, o = r[1] - 0, i = r.length > 2 ? r[2] - 0 : 0, a = function(e) {
                            util.assert(e, "CTab format invalid")
                        }, s = function(t) {
                            for (var r = t; r < e.length; ++r)
                                if ("M  V30 END CTAB" == e[r].strip()) return r;
                            a(!1)
                        }, l = function(t) {
                            for (var r = t; r < e.length; ++r)
                                if ("M  V30 END RGROUP" == e[r].strip()) return r;
                            a(!1)
                        }, c = [], u = [], d = null, p = [], h = 0; h < e.length; ++h) {
                        var f = e[h].strip();
                        if (f.startsWith("M  V30 COUNTS"));
                        else {
                            if ("M  END" == f) break;
                            if ("M  V30 BEGIN PRODUCT" == f) a(null == d), d = u;
                            else if ("M  V30 END PRODUCT" == f) a(d === u), d = null;
                            else if ("M  V30 BEGIN REACTANT" == f) a(null == d), d = c;
                            else if ("M  V30 END REACTANT" == f) a(d === c), d = null;
                            else if (f.startsWith("M  V30 BEGIN RGROUP")) {
                                a(null == d);
                                var m = l(h);
                                p.push(e.slice(h, m + 1)), h = m
                            } else {
                                if ("M  V30 BEGIN CTAB" != f) throw new Error("line unrecognized: " + f);
                                var m = s(h);
                                d.push(e.slice(h, m + 1)), h = m
                            }
                        }
                    }
                    for (var g = [], v = c.concat(u), m = 0; m < v.length; ++m) {
                        var b = chem.Molfile.parseCTabV3000(v[m], r);
                        g.push(b)
                    }
                    var S = t.rxnMerge(g, n, o, i);
                    return t.readRGroups3000(S, function(e) {
                        for (var t = [], r = 0; r < e.length; ++r) t = t.concat(e[r]);
                        return t
                    }(p)), S
                }, chem.Molfile.rxnMerge = function(e, t, r) {
                    chem.Molfile;
                    var n, o = new chem.Struct,
                        i = [],
                        a = [],
                        s = [],
                        l = [],
                        c = [],
                        u = [],
                        d = {
                            cnt: 0,
                            totalLength: 0
                        };
                    for (n = 0; n < e.length; ++n) {
                        var p = e[n],
                            h = p.getBondLengthData();
                        d.cnt += h.cnt, d.totalLength += h.totalLength
                    }
                    var f = 1 / (0 == d.cnt ? 1 : d.totalLength / d.cnt);
                    for (n = 0; n < e.length; ++n) p = e[n], p.scale(f);
                    for (n = 0; n < e.length; ++n) {
                        p = e[n];
                        var m = p.getCoordBoundingBoxObj();
                        if (m) {
                            var g = t > n ? chem.Struct.FRAGMENT.REACTANT : t + r > n ? chem.Struct.FRAGMENT.PRODUCT : chem.Struct.FRAGMENT.AGENT;
                            g == chem.Struct.FRAGMENT.REACTANT ? (i.push(m), l.push(p)) : g == chem.Struct.FRAGMENT.AGENT ? (a.push(m), c.push(p)) : g == chem.Struct.FRAGMENT.PRODUCT && (s.push(m), u.push(p)), p.atoms.each(function(e, t) {
                                t.rxnFragmentType = g
                            })
                        }
                    }
                    var v = 0,
                        b = function(e, t, r, n, o) {
                            var i = new Vec2(n - r.min.x, o ? 1 - r.min.y : -(r.min.y + r.max.y) / 2);
                            return t.atoms.each(function(e, t) {
                                t.pp.add_(i)
                            }), t.sgroups.each(function(e, t) {
                                t.pp && t.pp.add_(i)
                            }), r.min.add_(i), r.max.add_(i), t.mergeInto(e), r.max.x - r.min.x
                        };
                    for (n = 0; n < l.length; ++n) v += b(o, l[n], i[n], v, !1) + 2;
                    for (v += 2, n = 0; n < c.length; ++n) v += b(o, c[n], a[n], v, !0) + 2;
                    for (v += 2, n = 0; n < u.length; ++n) v += b(o, u[n], s[n], v, !1) + 2;
                    var S, w, A, y, O = null,
                        C = null;
                    for (n = 0; n < i.length - 1; ++n) S = i[n], w = i[n + 1], A = (S.max.x + w.min.x) / 2, y = (S.max.y + S.min.y + w.max.y + w.min.y) / 4, o.rxnPluses.add(new chem.Struct.RxnPlus({
                        pp: new Vec2(A, y)
                    }));
                    for (n = 0; n < i.length; ++n) 0 == n ? (O = {}, O.max = new Vec2(i[n].max), O.min = new Vec2(i[n].min)) : (O.max = Vec2.max(O.max, i[n].max), O.min = Vec2.min(O.min, i[n].min));
                    for (n = 0; n < s.length - 1; ++n) S = s[n], w = s[n + 1], A = (S.max.x + w.min.x) / 2, y = (S.max.y + S.min.y + w.max.y + w.min.y) / 4, o.rxnPluses.add(new chem.Struct.RxnPlus({
                        pp: new Vec2(A, y)
                    }));
                    for (n = 0; n < s.length; ++n) 0 == n ? (C = {}, C.max = new Vec2(s[n].max), C.min = new Vec2(s[n].min)) : (C.max = Vec2.max(C.max, s[n].max), C.min = Vec2.min(C.min, s[n].min));
                    if (S = O, w = C, S || w) {
                        var D = S ? new Vec2(S.max.x, (S.max.y + S.min.y) / 2) : null,
                            x = w ? new Vec2(w.min.x, (w.max.y + w.min.y) / 2) : null,
                            M = 3;
                        D || (D = new Vec2(x.x - M, x.y)), x || (x = new Vec2(D.x + M, D.y)), o.rxnArrows.add(new chem.Struct.RxnArrow({
                            pp: Vec2.lc2(D, .5, x, .5)
                        }))
                    } else o.rxnArrows.add(new chem.Struct.RxnArrow({
                        pp: new Vec2(0, 0)
                    }));
                    return o.isReaction = !0, o
                }, chem.Molfile.rgMerge = function(e, t) {
                    var r = new chem.Struct;
                    e.mergeInto(r, null, null, !1, !0);
                    for (var n in t)
                        for (var o = 0; o < t[n].length; ++o) {
                            var i = t[n][o];
                            i.rgroups.set(n, new chem.Struct.RGroup);
                            var a = i.frags.add(new chem.Struct.Fragment);
                            i.rgroups.get(n).frags.add(a), i.atoms.each(function(e, t) {
                                t.fragment = a
                            }), i.mergeInto(r)
                        }
                    return r
                }, chem.Molfile.parseRg2000 = function(e) {
                    var t = chem.Molfile;
                    if (e = e.slice(7), "$CTAB" != e[0].strip()) throw new Error("RGFile format invalid");
                    for (var r = 1;
                        "$" != e[r].charAt(0);) r++;
                    if ("$END CTAB" != e[r].strip()) throw new Error("RGFile format invalid");
                    var n = e.slice(1, r);
                    e = e.slice(r + 1);
                    for (var o = {};;) {
                        if (0 == e.length) throw new Error("Unexpected end of file");
                        var i = e[0].strip();
                        if ("$END MOL" == i) {
                            e = e.slice(1);
                            break
                        }
                        if ("$RGP" != i) throw new Error("RGFile format invalid");
                        var a = e[1].strip() - 0;
                        for (o[a] = [], e = e.slice(2);;) {
                            if (0 == e.length) throw new Error("Unexpected end of file");
                            if (i = e[0].strip(), "$END RGP" == i) {
                                e = e.slice(1);
                                break
                            }
                            if ("$CTAB" != i) throw new Error("RGFile format invalid");
                            for (r = 1;
                                "$" != e[r].charAt(0);) r++;
                            if ("$END CTAB" != e[r].strip()) throw new Error("RGFile format invalid");
                            o[a].push(e.slice(1, r)), e = e.slice(r + 1)
                        }
                    }
                    var s = chem.Molfile.parseCTab(n),
                        l = {};
                    if (chem.Molfile.loadRGroupFragments)
                        for (var c in o) {
                            l[c] = [];
                            for (var u = 0; u < o[c].length; ++u) l[c].push(chem.Molfile.parseCTab(o[c][u]))
                        }
                    return t.rgMerge(s, l)
                };

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../util": 39,
            "../util/map": 40,
            "../util/set": 42,
            "../util/vec2": 43,
            "./element": 10
        }],
        13: [function(require, module, exports) {
            (function(global) {
                var Box2Abs = require("../util/box2abs"),
                    Map = require("../util/map"),
                    Set = require("../util/set"),
                    Vec2 = require("../util/vec2"),
                    util = require("../util");
                require("./element"), require("../rnd/restruct_rendering");
                var chem = global.chem = global.chem || {},
                    rnd = global.rnd;
                chem.SGroup = function(e) {
                    if (!(e && e in chem.SGroup.TYPES)) throw new Error("Invalid or unsupported s-group type");
                    this.type = e, this.id = -1, chem.SGroup.equip(this, e), this.label = -1, this.bracketBox = null, this.bracketDir = new Vec2(1, 0), this.areas = [], this.highlight = !1, this.highlighting = null, this.selected = !1, this.selectionPlate = null, this.atoms = [], this.patoms = [], this.bonds = [], this.xBonds = [], this.neiAtoms = [], this.pp = null, this.data = {
                        mul: 1,
                        connectivity: "ht",
                        name: "",
                        subscript: "n",
                        attached: !1,
                        absolute: !0,
                        showUnits: !1,
                        nCharsToDisplay: -1,
                        tagChar: "",
                        daspPos: 1,
                        fieldType: "F",
                        fieldName: "",
                        fieldValue: "",
                        units: "",
                        query: "",
                        queryOp: ""
                    }
                }, chem.SGroup.prototype.getAttr = function(e) {
                    return this.data[e]
                }, chem.SGroup.prototype.getAttrs = function() {
                    var e = {};
                    for (var t in this.data) e[t] = this.data[t];
                    return e
                }, chem.SGroup.prototype.setAttr = function(e, t) {
                    var r = this.data[e];
                    return this.data[e] = t, r
                }, chem.SGroup.prototype.checkAttr = function(e, t) {
                    return this.data[e] == t
                }, chem.SGroup.equip = function(e, t) {
                    var r = chem.SGroup.TYPES[t];
                    for (var n in r) e[n] = r[n]
                }, chem.SGroup.numberArrayToString = function(e, t) {
                    for (var r = util.stringPadded(e.length, 3), n = 0; n < e.length; ++n) r += " " + util.stringPadded(t[e[n]], 3);
                    return r
                }, chem.SGroup.addGroup = function(e, t, r) {
                    t.id = e.sgroups.add(t), t.postLoad(e, r);
                    for (var n = 0; n < t.atoms.length; ++n) e.atoms.has(t.atoms[n]) && Set.add(e.atoms.get(t.atoms[n]).sgs, t.id);
                    return e.sGroupForest.insert(t.id), t.id
                }, chem.SGroup.bracketsToMolfile = function(e, t, r) {
                    var n = [],
                        o = [],
                        i = Set.fromList(t.atoms);
                    chem.SGroup.getCrossBonds(n, o, e, i), chem.SGroup.bracketPos(t, null, e, o);
                    for (var a = t.bracketBox, s = t.bracketDir, l = s.rotateSC(1, 0), c = chem.SGroup.getBracketParameters(e, o, i, a, s, l, null, t.id), u = [], d = 0; d < c.length; ++d) {
                        for (var h = c[d], p = h.c.addScaled(h.n, -.5 * h.h).yComplement(), m = h.c.addScaled(h.n, .5 * h.h).yComplement(), f = "M  SDI " + r + util.paddedInt(4, 3), g = [p.x, p.y, m.x, m.y], v = 0; v < g.length; ++v) f += util.paddedFloat(g[v], 10, 4);
                        u.push(f)
                    }
                    return u
                }, chem.SGroup.filterAtoms = function(e, t) {
                    for (var r = [], n = 0; n < e.length; ++n) {
                        var o = e[n];
                        "number" != typeof t[o] ? r.push(o) : t[o] >= 0 ? r.push(t[o]) : r.push(-1)
                    }
                    return r
                }, chem.SGroup.removeNegative = function(e) {
                    for (var t = [], r = 0; r < e.length; ++r) e[r] >= 0 && t.push(e[r]);
                    return t
                }, chem.SGroup.filter = function(e, t, r) {
                    t.atoms = chem.SGroup.removeNegative(chem.SGroup.filterAtoms(t.atoms, r))
                }, chem.SGroup.clone = function(e, t) {
                    var r = new chem.SGroup(e.type);
                    for (var n in e.data) r.data[n] = e.data[n];
                    return r.atoms = util.mapArray(e.atoms, t), r.pp = e.pp, r.bracketBox = e.bracketBox, r.patoms = null, r.bonds = null, r.allAtoms = e.allAtoms, r
                }, chem.SGroup.addAtom = function(e, t) {
                    e.atoms.push(t)
                }, chem.SGroup.removeAtom = function(e, t) {
                    for (var r = 0; r < e.atoms.length; ++r)
                        if (e.atoms[r] === t) return e.atoms.splice(r, 1), void 0;
                    throw new Error("The atom is not found in the given s-group")
                }, chem.SGroup.getCrossBonds = function(e, t, r, n) {
                    r.bonds.each(function(r, o) {
                        Set.contains(n, o.begin) && Set.contains(n, o.end) ? util.isNull(e) || e.push(r) : (Set.contains(n, o.begin) || Set.contains(n, o.end)) && (util.isNull(t) || t.push(r))
                    }, this)
                }, chem.SGroup.bracketPos = function(e, t, r, n) {
                    var o = e.atoms;
                    if (n && 2 === n.length) {
                        var i = r.bonds.get(n[0]),
                            a = r.bonds.get(n[1]),
                            s = i.getCenter(r),
                            l = a.getCenter(r);
                        e.bracketDir = Vec2.diff(l, s).normalized()
                    } else e.bracketDir = new Vec2(1, 0);
                    var c = e.bracketDir,
                        u = c.rotateSC(1, 0),
                        d = null,
                        h = [];
                    util.each(o, function(e) {
                        var n = r.atoms.get(e),
                            o = t ? t.ctab.atoms.get(e).visel.boundingBox : null,
                            i = new Vec2(n.pp);
                        if (util.isNull(o)) {
                            o = new Box2Abs(i, i);
                            var a = new Vec2(.05 * 3, .05 * 3);
                            o = o.extend(a, a)
                        } else o = o.translate((t.offset || new Vec2).negated()).transform(t.scaled2obj, t);
                        h.push(o)
                    }, this), util.each(r.sGroupForest.children.get(e.id), function(e) {
                        var r = t ? t.ctab.sgroups.get(e).visel.boundingBox : null;
                        util.isNull(r) || (r = r.translate((t.offset || new Vec2).negated()).transform(t.scaled2obj, t), h.push(r))
                    }, this), util.each(h, function(e) {
                        var t = null;
                        util.each([e.p0.x, e.p1.x], function(r) {
                            util.each([e.p0.y, e.p1.y], function(e) {
                                var n = new Vec2(r, e),
                                    o = new Vec2(Vec2.dot(n, c), Vec2.dot(n, u));
                                t = util.isNull(t) ? new Box2Abs(o, o) : t.include(o)
                            }, this)
                        }, this), d = util.isNull(d) ? t : Box2Abs.union(d, t)
                    }, this);
                    var p = new Vec2(.2, .4);
                    util.isNull(d) || (d = d.extend(p, p)), e.bracketBox = d
                }, chem.SGroup.drawBrackets = function(e, t, r, n, o, i, a, s, l, c, u) {
                    for (var d = chem.SGroup.getBracketParameters(t.ctab.molecule, n, o, i, a, s, t, r.id), h = -1, p = 0; p < d.length; ++p) {
                        var m = d[p],
                            f = chem.SGroup.drawBracket(t, t.paper, t.styles, m.d, m.n, m.c, m.w, m.h);
                        e.push(f), (0 > h || d[h].d.x < m.d.x || d[h].d.x == m.d.x && d[h].d.y > m.d.y) && (h = p)
                    }
                    var g = d[h],
                        v = function(r, n) {
                            var o = t.ps(g.c.addScaled(g.n, n * g.h)),
                                i = t.paper.text(o.x, o.y, r).attr({
                                    font: t.settings.font,
                                    "font-size": t.settings.fontszsub
                                });
                            u && i.attr(u);
                            var a = Box2Abs.fromRelBox(rnd.relBox(i.getBBox())),
                                s = Math.max(Vec2.shiftRayBox(o, g.d.negated(), a), 3) + 2;
                            i.translateAbs(s * g.d.x, s * g.d.y), e.push(i)
                        };
                    l && v(l, .5), c && v(c, -.5)
                }, chem.SGroup.drawBracket = function(e, t, r, n, o, i, a, s) {
                    a = a || .25, s = s || 1;
                    var l = i.addScaled(o, -.5 * s),
                        c = i.addScaled(o, .5 * s),
                        u = l.addScaled(n, -a),
                        d = c.addScaled(n, -a);
                    return l = e.obj2scaled(l), c = e.obj2scaled(c), u = e.obj2scaled(u), d = e.obj2scaled(d), t.path("M {0}, {1} L {2} , {3} L {4} , {5} L {6} , {7}", u.x, u.y, l.x, l.y, c.x, c.y, d.x, d.y).attr(r.sgroupBracketStyle)
                }, chem.SGroup.getBracketParameters = function(e, t, r, n, o, i, a, s) {
                    var l = function(e, t, r, n) {
                            this.c = e, this.d = t, this.n = t.rotateSC(1, 0), this.w = r, this.h = n
                        },
                        c = [];
                    return t.length < 2 ? function() {
                        o = o || new Vec2(1, 0), i = i || o.rotateSC(1, 0);
                        var e = Math.min(.25, .3 * n.sz().x),
                            t = Vec2.lc2(o, n.p0.x, i, .5 * (n.p0.y + n.p1.y)),
                            r = Vec2.lc2(o, n.p1.x, i, .5 * (n.p0.y + n.p1.y)),
                            a = n.sz().y;
                        c.push(new l(t, o.negated(), e, a), new l(r, o, e, a))
                    }() : 2 === t.length ? function() {
                        var r = e.bonds.get(t[0]),
                            n = e.bonds.get(t[1]),
                            o = r.getCenter(e),
                            i = n.getCenter(e),
                            u = -1,
                            d = -1,
                            h = -1,
                            p = -1,
                            m = Vec2.centre(o, i),
                            f = Vec2.diff(i, o).normalized(),
                            g = f.negated(),
                            v = f.rotateSC(1, 0),
                            S = v.negated();
                        util.each(e.sGroupForest.children.get(s), function(e) {
                            var t = a ? a.ctab.sgroups.get(e).visel.boundingBox : null;
                            util.isNull(t) || (t = t.translate((a.offset || new Vec2).negated()).transform(a.scaled2obj, a), u = Math.max(u, Vec2.shiftRayBox(o, g, t)), d = Math.max(d, Vec2.shiftRayBox(i, f, t)), h = Math.max(h, Vec2.shiftRayBox(m, v, t)), p = Math.max(p, Vec2.shiftRayBox(m, S, t)))
                        }, this), u = Math.max(u + .2, 0), d = Math.max(d + .2, 0), h = Math.max(Math.max(h, p) + .1, 0);
                        var b = .25,
                            w = 1.5 + h;
                        c.push(new l(o.addScaled(g, u), g, b, w), new l(i.addScaled(f, d), f, b, w))
                    }() : function() {
                        for (var n = 0; n < t.length; ++n) {
                            var o = e.bonds.get(t[n]),
                                i = o.getCenter(e),
                                a = Set.contains(r, o.begin) ? o.getDir(e) : o.getDir(e).negated();
                            c.push(new l(i, a, .2, 1))
                        }
                    }(), c
                }, chem.SGroup.getObjBBox = function(e, t) {
                    if (0 == e.length) throw new Error("Atom list is empty");
                    for (var r = t.atoms.get(e[0]).pp, n = new Box2Abs(r, r), o = 1; o < e.length; ++o) {
                        var i = e[o],
                            a = t.atoms.get(i),
                            s = a.pp;
                        n = n.include(s)
                    }
                    return n
                }, chem.SGroup.makeAtomBondLines = function(e, t, r, n) {
                    if (!r) return [];
                    for (var o = [], i = 0; i < Math.floor((r.length + 14) / 15); ++i) {
                        for (var a = Math.min(r.length - 15 * i, 15), s = "M  " + e + " " + t + " " + util.paddedInt(a, 2), l = 0; a > l; ++l) s += " " + util.paddedInt(n[r[15 * i + l]], 3);
                        o.push(s)
                    }
                    return o
                }, chem.SGroup.getAtoms = function(e, t) {
                    if (!t.allAtoms) return t.atoms;
                    var r = [];
                    return e.atoms.each(function(e) {
                        r.push(e)
                    }), r
                }, chem.SGroup.getBonds = function(e, t) {
                    var r = chem.SGroup.getAtoms(e, t),
                        n = [];
                    return e.bonds.each(function(e, t) {
                        r.indexOf(t.begin) >= 0 && r.indexOf(t.end) >= 0 && n.push(e)
                    }), n
                }, chem.SGroup.GroupMul = {
                    draw: function(e) {
                        var t = e.render,
                            r = t.paper.set(),
                            n = [],
                            o = [],
                            i = Set.fromList(this.atoms);
                        chem.SGroup.getCrossBonds(n, o, e.molecule, i), chem.SGroup.bracketPos(this, t, e.molecule, o);
                        var a = this.bracketBox,
                            s = this.bracketDir,
                            l = s.rotateSC(1, 0);
                        return this.areas = [a], chem.SGroup.drawBrackets(r, t, this, o, i, a, s, l, this.data.mul), r
                    },
                    saveToMolfile: function(e, t, r, n) {
                        var o = util.stringPadded(t[this.id], 3),
                            i = [];
                        i = i.concat(chem.SGroup.makeAtomBondLines("SAL", o, util.idList(this.atomSet), r)), i = i.concat(chem.SGroup.makeAtomBondLines("SPA", o, util.idList(this.parentAtomSet), r)), i = i.concat(chem.SGroup.makeAtomBondLines("SBL", o, this.bonds, n));
                        var a = "M  SMT " + o + " " + this.data.mul;
                        return i.push(a), i = i.concat(chem.SGroup.bracketsToMolfile(e, this, o)), i.join("\n")
                    },
                    prepareForSaving: function(e) {
                        var t;
                        this.atoms.sort(), this.atomSet = Set.fromList(this.atoms), this.parentAtomSet = Set.clone(this.atomSet);
                        var r = [],
                            n = [];
                        if (e.bonds.each(function(e, t) {
                                Set.contains(this.parentAtomSet, t.begin) && Set.contains(this.parentAtomSet, t.end) ? r.push(e) : (Set.contains(this.parentAtomSet, t.begin) || Set.contains(this.parentAtomSet, t.end)) && n.push(e)
                            }, this), 0 != n.length && 2 != n.length) throw {
                            id: this.id,
                            "error-type": "cross-bond-number",
                            message: "Unsupported cross-bonds number"
                        };
                        var o = -1,
                            i = -1,
                            a = null;
                        if (2 == n.length) {
                            var s = e.bonds.get(n[0]);
                            o = Set.contains(this.parentAtomSet, s.begin) ? s.begin : s.end;
                            var l = e.bonds.get(n[1]);
                            i = Set.contains(this.parentAtomSet, l.begin) ? l.begin : l.end, a = l
                        }
                        var c = null,
                            u = o,
                            d = [];
                        for (t = 0; t < this.data.mul - 1; ++t)
                            if (c = {}, util.each(this.atoms, function(t) {
                                    var r = e.atoms.get(t),
                                        n = e.atoms.add(new chem.Struct.Atom(r));
                                    d.push(n), this.atomSet[n] = 1, c[t] = n
                                }, this), util.each(r, function(t) {
                                    var r = e.bonds.get(t),
                                        n = new chem.Struct.Bond(r);
                                    n.begin = c[n.begin], n.end = c[n.end], e.bonds.add(n)
                                }, this), null != a) {
                                var h = new chem.Struct.Bond(a);
                                h.begin = u, h.end = c[i], e.bonds.add(h), u = c[o]
                            }
                        if (util.each(d, function(t) {
                                util.each(e.sGroupForest.getPathToRoot(this.id).reverse(), function(r) {
                                    e.atomAddToSGroup(r, t)
                                }, this)
                            }, this), u >= 0) {
                            var p = e.bonds.get(n[0]);
                            p.begin == o ? p.begin = u : p.end = u
                        }
                        this.bonds = n
                    },
                    postLoad: function(e, t) {
                        this.data.mul = this.data.subscript - 0;
                        var r = {};
                        this.atoms = chem.SGroup.filterAtoms(this.atoms, t), this.patoms = chem.SGroup.filterAtoms(this.patoms, t);
                        for (var n = 1; n < this.data.mul; ++n)
                            for (var o = 0; o < this.patoms.length; ++o) {
                                var i = this.atoms[n * this.patoms.length + o];
                                if (!(0 > i)) {
                                    if (this.patoms[o] < 0) throw new Error("parent atom missing");
                                    r[i] = this.patoms[o]
                                }
                            }
                        this.patoms = chem.SGroup.removeNegative(this.patoms);
                        var a = util.identityMap(this.patoms),
                            s = [];
                        e.bonds.each(function(e, t) {
                            var n = t.begin in r,
                                o = t.end in r;
                            n && o || n && t.end in a || o && t.begin in a ? s.push(e) : n ? t.begin = r[t.begin] : o && (t.end = r[t.end])
                        }, this);
                        for (var l = 0; l < s.length; ++l) e.bonds.remove(s[l]);
                        for (var c in r) e.atoms.remove(c), t[c] = -1;
                        this.atoms = this.patoms, this.patoms = null
                    }
                }, chem.SGroup.GroupSru = {
                    draw: function(e) {
                        var t = e.render,
                            r = t.paper.set(),
                            n = [],
                            o = [],
                            i = Set.fromList(this.atoms);
                        chem.SGroup.getCrossBonds(n, o, e.molecule, i), chem.SGroup.bracketPos(this, t, e.molecule, o);
                        var a = this.bracketBox,
                            s = this.bracketDir,
                            l = s.rotateSC(1, 0);
                        this.areas = [a];
                        var c = this.data.connectivity || "eu";
                        "ht" == c && (c = "");
                        var u = this.data.subscript || "n";
                        return chem.SGroup.drawBrackets(r, t, this, o, i, a, s, l, u, c), r
                    },
                    saveToMolfile: function(e, t, r, n) {
                        var o = util.stringPadded(t[this.id], 3),
                            i = [];
                        return i = i.concat(chem.SGroup.makeAtomBondLines("SAL", o, this.atoms, r)), i = i.concat(chem.SGroup.makeAtomBondLines("SBL", o, this.bonds, n)), i = i.concat(chem.SGroup.bracketsToMolfile(e, this, o)), i.join("\n")
                    },
                    prepareForSaving: function(e) {
                        var t = [];
                        if (e.bonds.each(function(r, n) {
                                var o = e.atoms.get(n.begin),
                                    i = e.atoms.get(n.end);
                                (Set.contains(o.sgs, this.id) && !Set.contains(i.sgs, this.id) || Set.contains(i.sgs, this.id) && !Set.contains(o.sgs, this.id)) && t.push(r)
                            }, this), 0 != t.length && 2 != t.length) throw {
                            id: this.id,
                            "error-type": "cross-bond-number",
                            message: "Unsupported cross-bonds number"
                        };
                        this.bonds = t
                    },
                    postLoad: function() {
                        this.data.connectivity = (this.data.connectivity || "EU").strip().toLowerCase()
                    }
                }, chem.SGroup.GroupSup = {
                    draw: function(e) {
                        var t = e.render,
                            r = t.paper.set(),
                            n = [],
                            o = [],
                            i = Set.fromList(this.atoms);
                        chem.SGroup.getCrossBonds(n, o, e.molecule, i), chem.SGroup.bracketPos(this, t, e.molecule, o);
                        var a = this.bracketBox,
                            s = this.bracketDir,
                            l = s.rotateSC(1, 0);
                        return this.areas = [a], chem.SGroup.drawBrackets(r, t, this, o, i, a, s, l, this.data.name, null, {
                            "font-style": "italic"
                        }), r
                    },
                    saveToMolfile: function(e, t, r, n) {
                        var o = util.stringPadded(t[this.id], 3),
                            i = [];
                        return i = i.concat(chem.SGroup.makeAtomBondLines("SAL", o, this.atoms, r)), i = i.concat(chem.SGroup.makeAtomBondLines("SBL", o, this.bonds, n)), this.data.name && "" != this.data.name && i.push("M  SMT " + o + " " + this.data.name), i.join("\n")
                    },
                    prepareForSaving: function(e) {
                        var t = [];
                        e.bonds.each(function(r, n) {
                            var o = e.atoms.get(n.begin),
                                i = e.atoms.get(n.end);
                            (Set.contains(o.sgs, this.id) && !Set.contains(i.sgs, this.id) || Set.contains(i.sgs, this.id) && !Set.contains(o.sgs, this.id)) && t.push(r)
                        }, this), this.bonds = t
                    },
                    postLoad: function() {
                        this.data.name = (this.data.subscript || "").strip(), this.data.subscript = ""
                    }
                }, chem.SGroup.GroupGen = {
                    draw: function(e) {
                        var t = e.render;
                        t.settings, t.styles;
                        var r = t.paper,
                            n = r.set(),
                            o = [],
                            i = [],
                            a = Set.fromList(this.atoms);
                        chem.SGroup.getCrossBonds(o, i, e.molecule, a), chem.SGroup.bracketPos(this, t, e.molecule, i);
                        var s = this.bracketBox,
                            l = this.bracketDir,
                            c = l.rotateSC(1, 0);
                        return this.areas = [s], chem.SGroup.drawBrackets(n, t, this, i, a, s, l, c), n
                    },
                    saveToMolfile: function(e, t, r, n) {
                        var o = util.stringPadded(t[this.id], 3),
                            i = [];
                        return i = i.concat(chem.SGroup.makeAtomBondLines("SAL", o, this.atoms, r)), i = i.concat(chem.SGroup.makeAtomBondLines("SBL", o, this.bonds, n)), i = i.concat(chem.SGroup.bracketsToMolfile(e, this, o)), i.join("\n")
                    },
                    prepareForSaving: function() {},
                    postLoad: function() {}
                }, chem.SGroup.getMassCentre = function(e, t) {
                    for (var r = new Vec2, n = 0; n < t.length; ++n) r = r.addScaled(e.atoms.get(t[n]).pp, 1 / t.length);
                    return r
                }, chem.SGroup.setPos = function(e, t, r) {
                    t.pp = r
                }, chem.SGroup.GroupDat = {
                    showValue: function(e, t, r, n) {
                        var o = e.text(t.x, t.y, r.data.fieldValue).attr({
                                font: n.font,
                                "font-size": n.fontsz
                            }),
                            i = o.getBBox(),
                            a = e.rect(i.x - 1, i.y - 1, i.width + 2, i.height + 2, 3, 3).attr({
                                fill: "#fff",
                                stroke: "#fff"
                            }),
                            s = e.set();
                        return s.push(a, o.toFront()), s
                    },
                    draw: function(e) {
                        var t, r = e.render,
                            n = r.settings,
                            o = r.paper,
                            i = o.set(),
                            a = chem.SGroup.getAtoms(e, this);
                        chem.SGroup.bracketPos(this, r, e.molecule), this.areas = this.bracketBox ? [this.bracketBox] : [], null == this.pp && chem.SGroup.setPos(e, this, this.bracketBox.p1.add(new Vec2(.5, .5)));
                        var s = this.pp.scaled(n.scaleFactor);
                        if (this.data.attached)
                            for (t = 0; t < a.length; ++t) {
                                var l = e.atoms.get(a[t]),
                                    c = r.ps(l.a.pp),
                                    u = l.visel.boundingBox;
                                null != u && (c.x = Math.max(c.x, u.p1.x)), c.x += n.lineWidth;
                                var d = this.showValue(o, c, this, n),
                                    h = rnd.relBox(d.getBBox());
                                d.translateAbs(.5 * h.width, -.3 * h.height), i.push(d);
                                var p = Box2Abs.fromRelBox(rnd.relBox(d.getBBox()));
                                p = p.transform(r.scaled2obj, r), this.areas.push(p)
                            } else {
                                var m = this.showValue(o, s, this, n),
                                    f = rnd.relBox(m.getBBox());
                                m.translateAbs(.5 * f.width, -.5 * f.height), i.push(m);
                                var g = Box2Abs.fromRelBox(rnd.relBox(m.getBBox()));
                                this.dataArea = g.transform(r.scaled2obj, r), e.sgroupData.has(this.id) || e.sgroupData.set(this.id, new rnd.ReDataSGroupData(this))
                            }
                        return i
                    },
                    saveToMolfile: function(e, t, r) {
                        var n = util.stringPadded(t[this.id], 3),
                            o = this.data,
                            i = this.pp;
                        o.absolute || (i = i.sub(chem.SGroup.getMassCentre(e, this.atoms)));
                        var a = [];
                        a = a.concat(chem.SGroup.makeAtomBondLines("SAL", n, this.atoms, r));
                        var s = "M  SDT " + n + " " + util.stringPadded(o.fieldName, 30, !0) + util.stringPadded(o.fieldType, 2) + util.stringPadded(o.units, 20, !0) + util.stringPadded(o.query, 2) + util.stringPadded(o.queryOp, 3);
                        a.push(s);
                        var l = "M  SDD " + n + " " + util.paddedFloat(i.x, 10, 4) + util.paddedFloat(-i.y, 10, 4) + "    " + (o.attached ? "A" : "D") + (o.absolute ? "A" : "R") + (o.showUnits ? "U" : " ") + "   " + (o.nCharnCharsToDisplay >= 0 ? util.paddedInt(o.nCharnCharsToDisplay, 3) : "ALL") + "  1   " + util.stringPadded(o.tagChar, 1) + "  " + util.paddedInt(o.daspPos, 1) + "  ";
                        a.push(l);
                        var c = util.normalizeNewlines(o.fieldValue).replace(/\n*$/, ""),
                            u = 69;
                        return c.split("\n").each(function(e) {
                            for (; e.length > u;) a.push("M  SCD " + n + " " + e.slice(0, u)), e = e.slice(u);
                            a.push("M  SED " + n + " " + e)
                        }), a.join("\n")
                    },
                    prepareForSaving: function(e) {
                        this.atoms = chem.SGroup.getAtoms(e, this)
                    },
                    postLoad: function(e) {
                        this.data.absolute || (this.pp = this.pp.add(chem.SGroup.getMassCentre(e, this.atoms)))
                    }
                }, chem.SGroup.TYPES = {
                    MUL: chem.SGroup.GroupMul,
                    SRU: chem.SGroup.GroupSru,
                    SUP: chem.SGroup.GroupSup,
                    DAT: chem.SGroup.GroupDat,
                    GEN: chem.SGroup.GroupGen
                }, chem.SGroupForest = function(e) {
                    this.parent = new Map, this.children = new Map, this.children.set(-1, []), this.molecule = e
                }, chem.SGroupForest.prototype.getSGroupsBFS = function() {
                    var e = [],
                        t = [],
                        r = -1;
                    for (t = util.array(this.children.get(-1)); t.length > 0;) {
                        var r = t.shift();
                        t = t.concat(this.children.get(r)), e.push(r)
                    }
                    return e
                }, chem.SGroupForest.prototype.getAtomSets = function() {
                    return this.molecule.sgroups.map(function(e, t) {
                        return Set.fromList(t.atoms)
                    })
                }, chem.SGroupForest.prototype.getAtomSetRelations = function(e, t, r) {
                    var n = new Map,
                        o = new Map,
                        r = this.getAtomSets();
                    r.unset(e), r.each(function(e, r) {
                        o.set(e, Set.subset(t, r)), n.set(e, Set.subset(r, t) && !Set.eq(r, t))
                    }, this);
                    var i = r.findAll(function(e) {
                        return o.get(e) ? util.findIndex(this.children.get(e), function(e) {
                            return o.get(e)
                        }, this) >= 0 ? !1 : !0 : !1
                    }, this);
                    util.assert(i.length <= 1);
                    var a = r.findAll(function(e) {
                        return n.get(e) && !n.get(this.parent.get(e))
                    }, this);
                    return {
                        children: a,
                        parent: 0 === i.length ? -1 : i[0]
                    }
                }, chem.SGroupForest.prototype.getPathToRoot = function(e) {
                    for (var t = [], r = e; r >= 0; r = this.parent.get(r)) util.assert(t.indexOf(r) < 0, "SGroupForest: loop detected"), t.push(r);
                    return t
                }, chem.SGroupForest.prototype.validate = function() {
                    var e = this.getAtomSets();
                    this.molecule.sgroups.each(function(e) {
                        this.getPathToRoot(e)
                    }, this);
                    var t = !0;
                    return this.parent.each(function(r, n) {
                        n >= 0 && !Set.subset(e.get(r), e.get(n)) && (t = !1)
                    }, this), this.children.each(function(r) {
                        for (var n = this.children.get(r), o = 0; o < n.length; ++o)
                            for (var i = o + 1; i < n.length; ++i) Set.disjoint(e.get(n[o]), e.get(n[i])) || (t = !1)
                    }, this), t
                }, chem.SGroupForest.prototype.insert = function(e, t, r) {
                    util.assert(!this.parent.has(e), "sgid already present in the forest"), util.assert(!this.children.has(e), "sgid already present in the forest"), util.assert(this.validate(), "s-group forest invalid");
                    var n = this.getAtomSets(),
                        o = Set.fromList(this.molecule.sgroups.get(e).atoms);
                    if (util.isUndefined(t) || util.isUndefined(r)) {
                        var i = this.getAtomSetRelations(e, o, n);
                        t = i.parent, r = i.children
                    }
                    return util.each(r, function(t) {
                        util.assert(1 === util.arrayRemoveByValue(this.children.get(this.parent.get(t)), t)), this.parent.set(t, e)
                    }, this), this.children.set(e, r), this.parent.set(e, t), this.children.get(t).push(e), util.assert(this.validate(), "s-group forest invalid"), {
                        parent: t,
                        children: r
                    }
                }, chem.SGroupForest.prototype.remove = function(e) {
                    util.assert(this.parent.has(e), "sgid is not in the forest"), util.assert(this.children.has(e), "sgid is not in the forest"), util.assert(this.validate(), "s-group forest invalid");
                    var t = this.parent.get(e);
                    util.each(this.children.get(e), function(e) {
                        this.parent.set(e, t), this.children.get(t).push(e)
                    }, this), util.assert(1 === util.arrayRemoveByValue(this.children.get(t), e)), this.children.unset(e), this.parent.unset(e), util.assert(this.validate(), "s-group forest invalid")
                };

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../rnd/restruct_rendering": 24,
            "../util": 39,
            "../util/box2abs": 38,
            "../util/map": 40,
            "../util/set": 42,
            "../util/vec2": 43,
            "./element": 10
        }],
        14: [function(require, module, exports) {
            (function(global) {
                var Set = require("../util/set");
                require("./struct");
                var util = require("../util"),
                    chem = global.chem = global.chem || {};
                chem.SmilesSaver = function() {
                    this.smiles = "", this._written_atoms = [], this._written_components = 0, this.ignore_errors = !1
                }, chem.SmilesSaver._Atom = function(e) {
                    this.neighbours = [], this.aromatic = !1, this.lowercase = !1, this.chirality = 0, this.branch_cnt = 0, this.paren_written = !1, this.h_count = e, this.parent = -1
                }, chem.SmilesSaver.prototype.isBondInRing = function(e) {
                    if (util.isUndefined(this.inLoop) || util.isNull(this.inLoop)) throw new Error("Init this.inLoop prior to calling this method");
                    return this.inLoop[e]
                }, chem.SmilesSaver.prototype.saveMolecule = function(e, t) {
                    var r, n, i;
                    Object.isUndefined(t) || (this.ignore_errors = t), e = e.clone(), e.initHalfBonds(), e.initNeighbors(), e.sortNeighbors(), e.setImplicitHydrogen(), e.sgroups.each(function(t, r) {
                        if ("MUL" == r.type) try {
                            r.prepareForSaving(e)
                        } catch (n) {
                            throw {
                                message: "Bad s-group (" + n.message + ")"
                            }
                        } else if (!this.ignore_errors) throw new Error("SMILES data format doesn't support s-groups")
                    }, this), this.atoms = new Array(e.atoms.count()), e.atoms.each(function(e, t) {
                        this.atoms[e] = new chem.SmilesSaver._Atom(t.implicitH)
                    }, this);
                    var o = ["B", "C", "N", "O", "P", "S", "Se", "As"];
                    e.bonds.each(function(t, r) {
                        r.type == chem.Struct.BOND.TYPE.AROMATIC && (this.atoms[r.begin].aromatic = !0, -1 != o.indexOf(e.atoms.get(r.begin).label) && (this.atoms[r.begin].lowercase = !0), this.atoms[r.end].aromatic = !0, -1 != o.indexOf(e.atoms.get(r.end).label) && (this.atoms[r.end].lowercase = !0)), this.atoms[r.begin].neighbours.push({
                            aid: r.end,
                            bid: t
                        }), this.atoms[r.end].neighbours.push({
                            aid: r.begin,
                            bid: t
                        })
                    }, this), this.inLoop = function() {
                        e.prepareLoopStructure();
                        var t = Set.empty();
                        e.loops.each(function(r, n) {
                            n.hbs.length <= 6 && Set.mergeIn(t, Set.fromList(util.map(n.hbs, function(t) {
                                return e.halfBonds.get(t).bid
                            }, this)))
                        }, this);
                        var r = {};
                        return Set.each(t, function(e) {
                            r[e] = 1
                        }, this), r
                    }(), this._touched_cistransbonds = 0, this._markCisTrans(e);
                    var a = chem.MolfileSaver.getComponents(e),
                        s = a.reactants.concat(a.products),
                        c = new chem.Dfs(e, this.atoms, s, a.reactants.length);
                    for (c.walk(), this.atoms.each(function(e) {
                            e.neighbours.clear()
                        }, this), r = 0; r < c.v_seq.length; r++) {
                        var l = c.v_seq[r],
                            u = l.idx,
                            d = l.parent_edge,
                            h = l.parent_vertex;
                        if (d >= 0) {
                            var p = this.atoms[u],
                                m = c.numOpeningCycles(d);
                            for (n = 0; m > n; n++) this.atoms[h].neighbours.push({
                                aid: -1,
                                bid: -1
                            });
                            if (c.edgeClosingCycle(d)) {
                                for (i = 0; i < p.neighbours.length; i++)
                                    if (-1 == p.neighbours[i].aid) {
                                        p.neighbours[i].aid = h, p.neighbours[i].bid = d;
                                        break
                                    }
                                if (i == p.neighbours.length) throw new Error("internal: can not put closing bond to its place")
                            } else p.neighbours.push({
                                aid: h,
                                bid: d
                            }), p.parent = h;
                            this.atoms[h].neighbours.push({
                                aid: u,
                                bid: d
                            })
                        }
                    }
                    try {
                        var f = new chem.Stereocenters(e, function(e) {
                            return this.atoms[e].neighbours
                        }, this);
                        f.buildFromBonds(this.ignore_errors), f.each(function(e, t) {
                            var r = -1; - 1 == t.pyramid[3] && (r = 3);
                            var o = new Array(4),
                                a = 0,
                                s = this.atoms[e];
                            if (-1 != s.parent)
                                for (i = 0; 4 > i; i++)
                                    if (t.pyramid[i] == s.parent) {
                                        o[a++] = i;
                                        break
                                    }
                            for (-1 != r && (o[a++] = r), n = 0; n != s.neighbours.length; n++)
                                if (s.neighbours[n].aid != s.parent)
                                    for (i = 0; 4 > i; i++)
                                        if (s.neighbours[n].aid == t.pyramid[i]) {
                                            if (a >= 4) throw new Error("internal: pyramid overflow");
                                            o[a++] = i;
                                            break
                                        }
                            if (4 == a) a = o[0], o[0] = o[1], o[1] = o[2], o[2] = o[3], o[3] = a;
                            else if (3 != a) throw new Error("cannot calculate chirality");
                            this.atoms[e].chirality = chem.Stereocenters.isPyramidMappingRigid(o) ? 1 : 2
                        }, this)
                    } catch (g) {
                        alert("Warning: " + g.message)
                    }
                    var b = [];
                    b.push(0);
                    var v = !0;
                    for (r = 0; r < c.v_seq.length; r++) {
                        l = c.v_seq[r], u = l.idx, d = l.parent_edge, h = l.parent_vertex;
                        var S = !0;
                        if (h >= 0) {
                            for (c.numBranches(h) > 1 && this.atoms[h].branch_cnt > 0 && this.atoms[h].paren_written && (this.smiles += ")"), m = c.numOpeningCycles(d), n = 0; m > n; n++) {
                                for (i = 1; i < b.length && -1 != b[i]; i++);
                                i == b.length ? b.push(h) : b[i] = h, this._writeCycleNumber(i)
                            }
                            if (h >= 0) {
                                var w = c.numBranches(h);
                                if (w > 1 && this.atoms[h].branch_cnt < w - 1 && (c.edgeClosingCycle(d) ? this.atoms[h].paren_written = !1 : (this.smiles += "(", this.atoms[h].paren_written = !0)), this.atoms[h].branch_cnt++, this.atoms[h].branch_cnt > w) throw new Error("unexpected branch")
                            }
                            var A = e.bonds.get(d),
                                y = !0,
                                x = 0;
                            if (A.type == chem.Struct.BOND.TYPE.SINGLE && (x = this._calcBondDirection(e, d, h)), 1 == x && u == A.end || 2 == x && u == A.begin ? this.smiles += "/" : 2 == x && u == A.end || 1 == x && u == A.begin ? this.smiles += "\\" : A.type == chem.Struct.BOND.TYPE.ANY ? this.smiles += "~" : A.type == chem.Struct.BOND.TYPE.DOUBLE ? this.smiles += "=" : A.type == chem.Struct.BOND.TYPE.TRIPLE ? this.smiles += "#" : A.type != chem.Struct.BOND.TYPE.AROMATIC || this.atoms[A.begin].lowercase && this.atoms[A.end].lowercase && this.isBondInRing(d) ? A.type == chem.Struct.BOND.TYPE.SINGLE && this.atoms[A.begin].aromatic && this.atoms[A.end].aromatic ? this.smiles += "-" : y = !1 : this.smiles += ":", c.edgeClosingCycle(d)) {
                                for (n = 1; n < b.length && b[n] != u; n++);
                                if (n == b.length) throw new Error("cycle number not found");
                                this._writeCycleNumber(n), b[n] = -1, S = !1
                            }
                        } else v || (this.smiles += this._written_components == c.nComponentsInReactants ? ">>" : "."), v = !1, this._written_components++;
                        S && (this._writeAtom(e, u, this.atoms[u].aromatic, this.atoms[u].lowercase, this.atoms[u].chirality), this._written_atoms.push(l.idx))
                    }
                    return this.comma = !1, this._writeRadicals(e), this.comma && (this.smiles += "|"), this.smiles
                }, chem.SmilesSaver.prototype._writeCycleNumber = function(e) {
                    if (e > 0 && 10 > e) this.smiles += e;
                    else if (e >= 10 && 100 > e) this.smiles += "%" + e;
                    else {
                        if (!(e >= 100 && 1e3 > e)) throw new Error("bad cycle number: " + e);
                        this.smiles += "%%" + e
                    }
                }, chem.SmilesSaver.prototype._writeAtom = function(e, t, r, n, i) {
                    var o = e.atoms.get(t),
                        a = !1,
                        s = -1,
                        c = 0;
                    if ("A" == o.label) return this.smiles += "*", void 0;
                    if ("R" == o.label || "R#" == o.label) return this.smiles += "[*]", void 0;
                    c = o.aam, "C" != o.label && "P" != o.label && "N" != o.label && "S" != o.label && "O" != o.label && "Cl" != o.label && "F" != o.label && "Br" != o.label && "B" != o.label && "I" != o.label && (a = !0), (o.explicitValence >= 0 || 0 != o.radical || i > 0 || r && "C" != o.label && "O" != o.label || r && "C" == o.label && this.atoms[t].neighbours.length < 3 && 0 == this.atoms[t].h_count) && (s = this.atoms[t].h_count);
                    var l = o.label;
                    if (o.atomList && !o.atomList.notList ? (l = o.atomList.label(), a = !1) : o.isPseudo() || o.atomList && o.atomList.notList ? (l = "*", a = !0) : (i || 0 != o.charge || o.isotope > 0 || s >= 0 || c > 0) && (a = !0), a && (-1 == s && (s = this.atoms[t].h_count), this.smiles += "["), o.isotope > 0 && (this.smiles += o.isotope), this.smiles += n ? l.toLowerCase() : l, i > 0 && (this.smiles += 1 == i ? "@" : "@@", o.implicitH > 1)) throw new Error(o.implicitH + " implicit H near stereocenter");
                    "H" != o.label && (s > 1 || 0 == s && !a ? this.smiles += "H" + s : 1 == s && (this.smiles += "H")), o.charge > 1 ? this.smiles += "+" + o.charge : o.charge < -1 ? this.smiles += o.charge : 1 == o.charge ? this.smiles += "+" : -1 == o.charge && (this.smiles += "-"), c > 0 && (this.smiles += ":" + c), a && (this.smiles += "]")
                }, chem.SmilesSaver.prototype._markCisTrans = function(e) {
                    this.cis_trans = new chem.CisTrans(e, function(e) {
                        return this.atoms[e].neighbours
                    }, this), this.cis_trans.build(), this._dbonds = new Array(e.bonds.count()), e.bonds.each(function(e) {
                        this._dbonds[e] = {
                            ctbond_beg: -1,
                            ctbond_end: -1,
                            saved: 0
                        }
                    }, this), this.cis_trans.each(function(t, r) {
                        var n = e.bonds.get(t);
                        if (0 != r.parity && !this.isBondInRing(t)) {
                            var i = this.atoms[n.begin].neighbours,
                                o = this.atoms[n.end].neighbours,
                                a = !0,
                                s = !0;
                            if (i.each(function(r) {
                                    r.bid != t && e.bonds.get(r.bid).type == chem.Struct.BOND.TYPE.SINGLE && (a = !1)
                                }, this), o.each(function(r) {
                                    r.bid != t && e.bonds.get(r.bid).type == chem.Struct.BOND.TYPE.SINGLE && (s = !1)
                                }, this), a || s) return;
                            i.each(function(r) {
                                r.bid != t && (e.bonds.get(r.bid).begin == n.begin ? this._dbonds[r.bid].ctbond_beg = t : this._dbonds[r.bid].ctbond_end = t)
                            }, this), o.each(function(r) {
                                r.bid != t && (e.bonds.get(r.bid).begin == n.end ? this._dbonds[r.bid].ctbond_beg = t : this._dbonds[r.bid].ctbond_end = t)
                            }, this)
                        }
                    }, this)
                }, chem.SmilesSaver.prototype._updateSideBonds = function(e, t) {
                    var r = e.bonds.get(t),
                        n = this.cis_trans.getSubstituents(t),
                        i = this.cis_trans.getParity(t),
                        o = [-1, -1, -1, -1];
                    o[0] = e.findBondId(n[0], r.begin), -1 != n[1] && (o[1] = e.findBondId(n[1], r.begin)), o[2] = e.findBondId(n[2], r.end), -1 != n[3] && (o[3] = e.findBondId(n[3], r.end));
                    var a = 0,
                        s = 0,
                        c = 0,
                        l = 0;
                    if (0 != this._dbonds[o[0]].saved && (1 == this._dbonds[o[0]].saved && e.bonds.get(o[0]).begin == r.begin || 2 == this._dbonds[o[0]].saved && e.bonds.get(o[0]).end == r.begin ? a++ : s++), -1 != o[1] && 0 != this._dbonds[o[1]].saved && (2 == this._dbonds[o[1]].saved && e.bonds.get(o[1]).begin == r.begin || 1 == this._dbonds[o[1]].saved && e.bonds.get(o[1]).end == r.begin ? a++ : s++), 0 != this._dbonds[o[2]].saved && (1 == this._dbonds[o[2]].saved && e.bonds.get(o[2]).begin == r.end || 2 == this._dbonds[o[2]].saved && e.bonds.get(o[2]).end == r.end ? c++ : l++), -1 != o[3] && 0 != this._dbonds[o[3]].saved && (2 == this._dbonds[o[3]].saved && e.bonds.get(o[3]).begin == r.end || 1 == this._dbonds[o[3]].saved && e.bonds.get(o[3]).end == r.end ? c++ : l++), i == chem.CisTrans.PARITY.CIS ? (a += c, s += l) : (a += l, s += c), a > 0 && s > 0) throw new Error("incompatible cis-trans configuration");
                    return 0 == a && 0 == s ? !1 : (a > 0 && (this._dbonds[o[0]].saved = e.bonds.get(o[0]).begin == r.begin ? 1 : 2, -1 != o[1] && (this._dbonds[o[1]].saved = e.bonds.get(o[1]).begin == r.begin ? 2 : 1), this._dbonds[o[2]].saved = e.bonds.get(o[2]).begin == r.end == (i == chem.CisTrans.PARITY.CIS) ? 1 : 2, -1 != o[3] && (this._dbonds[o[3]].saved = e.bonds.get(o[3]).begin == r.end == (i == chem.CisTrans.PARITY.CIS) ? 2 : 1)), s > 0 && (this._dbonds[o[0]].saved = e.bonds.get(o[0]).begin == r.begin ? 2 : 1, -1 != o[1] && (this._dbonds[o[1]].saved = e.bonds.get(o[1]).begin == r.begin ? 1 : 2), this._dbonds[o[2]].saved = e.bonds.get(o[2]).begin == r.end == (i == chem.CisTrans.PARITY.CIS) ? 2 : 1, -1 != o[3] && (this._dbonds[o[3]].saved = e.bonds.get(o[3]).begin == r.end == (i == chem.CisTrans.PARITY.CIS) ? 1 : 2)), !0)
                }, chem.SmilesSaver.prototype._calcBondDirection = function(e, t, r) {
                    var n;
                    if (-1 == this._dbonds[t].ctbond_beg && -1 == this._dbonds[t].ctbond_end) return 0;
                    if (e.bonds.get(t).type != chem.Struct.BOND.TYPE.SINGLE) throw new Error("internal: directed bond type " + e.bonds.get(t).type);
                    for (;;) {
                        if (n = 0, this.cis_trans.each(function(t, r) {
                                0 == r.parity || this.isBondInRing(t) || this._updateSideBonds(e, t) && n++
                            }, this), n == this._touched_cistransbonds) break;
                        this._touched_cistransbonds = n
                    }
                    return 0 == this._dbonds[t].saved && (this._dbonds[t].saved = r == e.bonds.get(t).begin ? 1 : 2), this._dbonds[t].saved
                }, chem.SmilesSaver.prototype._writeRadicals = function(e) {
                    var t, r, n = new Array(this._written_atoms.length);
                    for (t = 0; t < this._written_atoms.size(); t++)
                        if (!n[t]) {
                            var i = e.atoms.get(this._written_atoms[t]).radical;
                            if (0 != i)
                                for (this.comma ? this.smiles += "," : (this.smiles += " |", this.comma = !0), this.smiles += i == chem.Struct.ATOM.RADICAL.SINGLET ? "^3:" : i == chem.Struct.ATOM.RADICAL.DOUPLET ? "^1:" : "^4:", this.smiles += t, r = t + 1; r < this._written_atoms.length; r++) e.atoms.get(this._written_atoms[r]).radical == i && (n[r] = !0, this.smiles += "," + r)
                        }
                };

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../util": 39,
            "../util/set": 42,
            "./struct": 16
        }],
        15: [function(require, module, exports) {
            (function(global) {
                var Map = require("../util/map"),
                    Set = require("../util/set"),
                    Vec2 = require("../util/vec2"),
                    util = require("../util");
                require("./struct");
                var chem = global.chem = global.chem || {};
                chem.Stereocenters = function(e, t, r) {
                    this.molecule = e, this.atoms = new Map, this.getNeighbors = t, this.context = r
                }, chem.Stereocenters.prototype.each = function(e, t) {
                    this.atoms.each(e, t)
                }, chem.Stereocenters.prototype.buildFromBonds = function(e) {
                    var t = this.molecule.atoms,
                        r = this.molecule.bonds,
                        n = Set.empty();
                    t.each(function(e) {
                        var i = this.getNeighbors.call(this.context, e);
                        if (2 != i.length) return !1;
                        var o = i[0],
                            a = i[1];
                        if (util.findIndex([e, o.aid, a.aid], function(e) {
                                return ["C", "Si"].indexOf(t.get(e).label) < 0
                            }, this) >= 0) return !1;
                        if (util.findIndex([o.bid, a.bid], function(e) {
                                return r.get(e).type != chem.Struct.BOND.TYPE.DOUBLE
                            }, this) >= 0) return !1;
                        var s = util.findAll(this.getNeighbors.call(this.context, o.aid), function(t) {
                                return t.aid != e
                            }, this),
                            c = util.findAll(this.getNeighbors.call(this.context, a.aid), function(t) {
                                return t.aid != e
                            }, this);
                        return s.length < 1 || s.length > 2 || c.length < 1 || c.length > 2 ? !1 : util.findIndex(s.concat(c), function(e) {
                            return r.get(e.bid).type != chem.Struct.BOND.TYPE.SINGLE
                        }, this) >= 0 ? !1 : util.findIndex(s.concat(c), function(e) {
                            return r.get(e.bid).stereo == chem.Struct.BOND.STEREO.EITHER
                        }, this) >= 0 ? !1 : (Set.add(n, o.aid), Set.add(n, a.aid), void 0)
                    }, this), Set.size(n) > 0 && alert("This structure may contain allenes, which cannot be represented in the SMILES notation. Relevant stereo-information will be discarded."), t.each(function(t) {
                        if (!Set.contains(n, t)) {
                            var r = this.getNeighbors.call(this.context, t),
                                i = !1;
                            r.find(function(e) {
                                var r = this.molecule.bonds.get(e.bid);
                                return r.type != chem.Struct.BOND.TYPE.SINGLE || r.begin != t || r.stereo != chem.Struct.BOND.STEREO.UP && r.stereo != chem.Struct.BOND.STEREO.DOWN ? !1 : (i = !0, !0)
                            }, this), i && (e ? this._buildOneCenter(t) : this._buildOneCenter(t))
                        }
                    }, this)
                }, chem.Stereocenters.allowed_stereocenters = [{
                    elem: "C",
                    charge: 0,
                    degree: 3,
                    n_double_bonds: 0,
                    implicit_degree: 4
                }, {
                    elem: "C",
                    charge: 0,
                    degree: 4,
                    n_double_bonds: 0,
                    implicit_degree: 4
                }, {
                    elem: "Si",
                    charge: 0,
                    degree: 3,
                    n_double_bonds: 0,
                    implicit_degree: 4
                }, {
                    elem: "Si",
                    charge: 0,
                    degree: 4,
                    n_double_bonds: 0,
                    implicit_degree: 4
                }, {
                    elem: "N",
                    charge: 1,
                    degree: 3,
                    n_double_bonds: 0,
                    implicit_degree: 4
                }, {
                    elem: "N",
                    charge: 1,
                    degree: 4,
                    n_double_bonds: 0,
                    implicit_degree: 4
                }, {
                    elem: "N",
                    charge: 0,
                    degree: 3,
                    n_double_bonds: 0,
                    implicit_degree: 3
                }, {
                    elem: "S",
                    charge: 0,
                    degree: 4,
                    n_double_bonds: 2,
                    implicit_degree: 4
                }, {
                    elem: "S",
                    charge: 1,
                    degree: 3,
                    n_double_bonds: 0,
                    implicit_degree: 3
                }, {
                    elem: "S",
                    charge: 0,
                    degree: 3,
                    n_double_bonds: 1,
                    implicit_degree: 3
                }, {
                    elem: "P",
                    charge: 0,
                    degree: 3,
                    n_double_bonds: 0,
                    implicit_degree: 3
                }, {
                    elem: "P",
                    charge: 1,
                    degree: 4,
                    n_double_bonds: 0,
                    implicit_degree: 4
                }, {
                    elem: "P",
                    charge: 0,
                    degree: 4,
                    n_double_bonds: 1,
                    implicit_degree: 4
                }], chem.Stereocenters.prototype._buildOneCenter = function(e) {
                    var t = this.molecule.atoms.get(e),
                        r = this.getNeighbors.call(this.context, e),
                        n = r.length,
                        i = -1,
                        o = {
                            group: 0,
                            type: 0,
                            pyramid: new Array(4)
                        },
                        a = 0,
                        s = new Array(4),
                        c = 0,
                        l = 0;
                    o.pyramid[0] = -1, o.pyramid[1] = -1, o.pyramid[2] = -1, o.pyramid[3] = -1;
                    var u = 0;
                    if (n > 4) throw new Error("stereocenter with %d bonds are not supported" + n);
                    if (r.each(function(e) {
                            var r = this.molecule.atoms.get(e.aid),
                                n = this.molecule.bonds.get(e.bid);
                            if (s[a] = {
                                    edge_idx: e.bid,
                                    nei_idx: e.aid,
                                    rank: e.aid,
                                    vec: Vec2.diff(r.pp, t.pp).yComplement()
                                }, r.pureHydrogen() ? (u++, s[a].rank = 1e4) : "H" == r.label && (s[a].rank = 5e3), !s[a].vec.normalize()) throw new Error("zero bond length");
                            if (n.type == chem.Struct.BOND.TYPE.TRIPLE) throw new Error("non-single bonds not allowed near stereocenter");
                            if (n.type == chem.Struct.BOND.TYPE.AROMATIC) throw new Error("aromatic bonds not allowed near stereocenter");
                            n.type == chem.Struct.BOND.TYPE.DOUBLE && l++, a++
                        }, this), chem.Stereocenters.allowed_stereocenters.find(function(e) {
                            return e.elem == t.label && e.charge == t.charge && e.degree == n && e.n_double_bonds == l ? (i = e.implicit_degree, !0) : !1
                        }, this), -1 == i) throw new Error("unknown stereocenter configuration: " + t.label + ", charge " + t.charge + ", " + n + " bonds (" + l + " double)");
                    if (4 == n && u > 1) throw new Error(u + " hydrogens near stereocenter");
                    if (3 == n && 4 == i && u > 0) throw new Error("have hydrogen(s) besides implicit hydrogen near stereocenter");
                    if (4 == n) {
                        s[0].rank > s[1].rank && s.swap(0, 1), s[1].rank > s[2].rank && s.swap(1, 2), s[2].rank > s[3].rank && s.swap(2, 3), s[1].rank > s[2].rank && s.swap(1, 2), s[0].rank > s[1].rank && s.swap(0, 1), s[1].rank > s[2].rank && s.swap(1, 2);
                        var d = -1,
                            h = -1,
                            p = -1,
                            m = -1,
                            f = 0;
                        for (a = 0; 4 > a; a++) {
                            var g = this._getBondStereo(e, s[a].edge_idx);
                            if (g == chem.Struct.BOND.STEREO.UP || g == chem.Struct.BOND.STEREO.DOWN) {
                                d = a, f = g;
                                break
                            }
                        }
                        if (-1 == d) throw new Error("none of 4 bonds going from stereocenter is stereobond");
                        var b, S;
                        if (-1 == h && (b = chem.Stereocenters._xyzzy(s[d].vec, s[(d + 1) % 4].vec, s[(d + 2) % 4].vec), S = chem.Stereocenters._xyzzy(s[d].vec, s[(d + 1) % 4].vec, s[(d + 3) % 4].vec), (3 == b + S || 12 == b + S) && (h = (d + 1) % 4, p = (d + 2) % 4, m = (d + 3) % 4)), -1 == h && (b = chem.Stereocenters._xyzzy(s[d].vec, s[(d + 2) % 4].vec, s[(d + 1) % 4].vec), S = chem.Stereocenters._xyzzy(s[d].vec, s[(d + 2) % 4].vec, s[(d + 3) % 4].vec), (3 == b + S || 12 == b + S) && (h = (d + 2) % 4, p = (d + 1) % 4, m = (d + 3) % 4)), -1 == h && (b = chem.Stereocenters._xyzzy(s[d].vec, s[(d + 3) % 4].vec, s[(d + 1) % 4].vec), S = chem.Stereocenters._xyzzy(s[d].vec, s[(d + 3) % 4].vec, s[(d + 2) % 4].vec), (3 == b + S || 12 == b + S) && (h = (d + 3) % 4, p = (d + 2) % 4, m = (d + 1) % 4)), -1 == h) throw new Error("internal error: can not find opposite bond");
                        if (f == chem.Struct.BOND.STEREO.UP && this._getBondStereo(e, s[h].edge_idx) == chem.Struct.BOND.STEREO.DOWN) throw new Error("stereo types of the opposite bonds mismatch");
                        if (f == chem.Struct.BOND.STEREO.DOWN && this._getBondStereo(e, s[h].edge_idx) == chem.Struct.BOND.STEREO.UP) throw new Error("stereo types of the opposite bonds mismatch");
                        if (f == this._getBondStereo(e, s[p].edge_idx)) throw new Error("stereo types of non-opposite bonds match");
                        if (f == this._getBondStereo(e, s[m].edge_idx)) throw new Error("stereo types of non-opposite bonds match");
                        c = 3 == d || 3 == h ? f : f == chem.Struct.BOND.STEREO.UP ? chem.Struct.BOND.STEREO.DOWN : chem.Struct.BOND.STEREO.UP, D = chem.Stereocenters._sign(s[0].vec, s[1].vec, s[2].vec), c == chem.Struct.BOND.STEREO.UP && D > 0 || c == chem.Struct.BOND.STEREO.DOWN && 0 > D ? (o.pyramid[0] = s[0].nei_idx, o.pyramid[1] = s[1].nei_idx, o.pyramid[2] = s[2].nei_idx) : (o.pyramid[0] = s[0].nei_idx, o.pyramid[1] = s[2].nei_idx, o.pyramid[2] = s[1].nei_idx), o.pyramid[3] = s[3].nei_idx
                    } else if (3 == n) {
                        s[0].rank > s[1].rank && s.swap(0, 1), s[1].rank > s[2].rank && s.swap(1, 2), s[0].rank > s[1].rank && s.swap(0, 1);
                        var v = this._getBondStereo(e, s[0].edge_idx),
                            w = this._getBondStereo(e, s[1].edge_idx),
                            y = this._getBondStereo(e, s[2].edge_idx),
                            A = 0,
                            x = 0;
                        if (A += v == chem.Struct.BOND.STEREO.UP ? 1 : 0, A += w == chem.Struct.BOND.STEREO.UP ? 1 : 0, A += y == chem.Struct.BOND.STEREO.UP ? 1 : 0, x += v == chem.Struct.BOND.STEREO.DOWN ? 1 : 0, x += w == chem.Struct.BOND.STEREO.DOWN ? 1 : 0, x += y == chem.Struct.BOND.STEREO.DOWN ? 1 : 0, 4 == i) {
                            if (3 == A) throw new Error("all 3 bonds up near stereoatom");
                            if (3 == x) throw new Error("all 3 bonds down near stereoatom");
                            if (0 == A && 0 == x) throw new Error("no up/down bonds near stereoatom -- indefinite case");
                            if (1 == A && 1 == x) throw new Error("one bond up, one bond down -- indefinite case");
                            if (f = 0, 2 == A) c = chem.Struct.BOND.STEREO.DOWN;
                            else if (2 == x) c = chem.Struct.BOND.STEREO.UP;
                            else {
                                for (d = -1, p = -1, m = -1, a = 0; 3 > a; a++)
                                    if (C = this._getBondStereo(e, s[a].edge_idx), C == chem.Struct.BOND.STEREO.UP || C == chem.Struct.BOND.STEREO.DOWN) {
                                        d = a, f = C, p = (a + 1) % 3, m = (a + 2) % 3;
                                        break
                                    }
                                if (-1 == d) throw new Error("internal error: can not find up or down bond");
                                var O = chem.Stereocenters._xyzzy(s[p].vec, s[m].vec, s[d].vec);
                                if (3 == O || 4 == O) throw new Error("degenerate case for 3 bonds near stereoatom");
                                c = 1 == O ? f : f == chem.Struct.BOND.STEREO.UP ? chem.Struct.BOND.STEREO.DOWN : chem.Struct.BOND.STEREO.UP
                            }
                            var D = chem.Stereocenters._sign(s[0].vec, s[1].vec, s[2].vec);
                            c == chem.Struct.BOND.STEREO.UP && D > 0 || c == chem.Struct.BOND.STEREO.DOWN && 0 > D ? (o.pyramid[0] = s[0].nei_idx, o.pyramid[1] = s[1].nei_idx, o.pyramid[2] = s[2].nei_idx) : (o.pyramid[0] = s[0].nei_idx, o.pyramid[1] = s[2].nei_idx, o.pyramid[2] = s[1].nei_idx), o.pyramid[3] = -1
                        } else {
                            var C;
                            if (x > 0 && A > 0) throw new Error("one bond up, one bond down -- indefinite case");
                            if (0 == x && 0 == A) throw new Error("no up-down bonds attached to stereocenter");
                            C = A > 0 ? 1 : -1, (1 == chem.Stereocenters._xyzzy(s[0].vec, s[1].vec, s[2].vec) || 1 == chem.Stereocenters._xyzzy(s[0].vec, s[2].vec, s[1].vec) || 1 == chem.Stereocenters._xyzzy(s[2].vec, s[1].vec, s[0].vec)) && (C = -C), D = chem.Stereocenters._sign(s[0].vec, s[1].vec, s[2].vec), D == C ? (o.pyramid[0] = s[0].nei_idx, o.pyramid[1] = s[2].nei_idx, o.pyramid[2] = s[1].nei_idx) : (o.pyramid[0] = s[0].nei_idx, o.pyramid[1] = s[1].nei_idx, o.pyramid[2] = s[2].nei_idx), o.pyramid[3] = -1
                        }
                    }
                    this.atoms.set(e, o)
                }, chem.Stereocenters.prototype._getBondStereo = function(e, t) {
                    var r = this.molecule.bonds.get(t);
                    return e != r.begin ? 0 : r.stereo
                }, chem.Stereocenters._xyzzy = function(e, t, r) {
                    var n = .001,
                        i = Vec2.cross(e, t),
                        o = Vec2.dot(e, t),
                        a = Vec2.cross(e, r),
                        s = Vec2.dot(e, r);
                    if (Math.abs(i) < n) {
                        if (Math.abs(a) < n) throw new Error("degenerate case -- bonds overlap");
                        return a > 0 ? 4 : 8
                    }
                    return -n * n > i * a ? 2 : o > s ? 2 : 1
                }, chem.Stereocenters._sign = function(e, t, r) {
                    var n = (e.x - r.x) * (t.y - r.y) - (e.y - r.y) * (t.x - r.x),
                        i = .001;
                    if (n > i) return 1;
                    if (-i > n) return -1;
                    throw new Error("degenerate triangle")
                }, chem.Stereocenters.isPyramidMappingRigid = function(e) {
                    var t = e.clone(),
                        r = !0;
                    return t[0] > t[1] && (t.swap(0, 1), r = !r), t[1] > t[2] && (t.swap(1, 2), r = !r), t[2] > t[3] && (t.swap(2, 3), r = !r), t[1] > t[2] && (t.swap(1, 2), r = !r), t[0] > t[1] && (t.swap(0, 1), r = !r), t[1] > t[2] && (t.swap(1, 2), r = !r), r
                };

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../util": 39,
            "../util/map": 40,
            "../util/set": 42,
            "../util/vec2": 43,
            "./struct": 16
        }],
        16: [function(require, module, exports) {
            (function(global) {
                var Map = require("../util/map"),
                    Pool = require("../util/pool"),
                    Set = require("../util/set"),
                    Vec2 = require("../util/vec2"),
                    util = require("../util"),
                    element = require("./element"),
                    chem = global.chem = global.chem || {};
                chem.Struct = function() {
                    this.atoms = new Pool, this.bonds = new Pool, this.sgroups = new Pool, this.halfBonds = new Map, this.loops = new Pool, this.isChiral = !1, this.isReaction = !1, this.rxnArrows = new Pool, this.rxnPluses = new Pool, this.frags = new Pool, this.rgroups = new Map, this.name = "", this.sGroupForest = new chem.SGroupForest(this)
                }, chem.Struct.prototype.hasRxnProps = function() {
                    return this.atoms.find(function(e, t) {
                        return t.hasRxnProps()
                    }, this) >= 0 || this.bonds.find(function(e, t) {
                        return t.hasRxnProps()
                    }, this) >= 0
                }, chem.Struct.prototype.hasRxnArrow = function() {
                    return this.rxnArrows.count() > 0
                }, chem.Struct.prototype.addRxnArrowIfNecessary = function() {
                    var e = !this.hasRxnArrow() && this.hasRxnProps();
                    return e && this.rxnArrows.add(new chem.Struct.RxnArrow), e
                }, chem.Struct.prototype.getSGroupsInAtomSet = function(e) {
                    var t = new Hash;
                    util.each(e, function(e) {
                        var n = Set.list(this.atoms.get(e).sgs);
                        n.each(function(e) {
                            var n = t.get(e);
                            Object.isUndefined(n) ? n = 1 : n++, t.set(e, n)
                        }, this)
                    }, this);
                    var n = [];
                    return t.each(function(e) {
                        var t = parseInt(e.key, 10),
                            r = this.sgroups.get(t),
                            o = chem.SGroup.getAtoms(this, r);
                        e.value == o.length && n.push(t)
                    }, this), n
                }, chem.Struct.prototype.isBlank = function() {
                    return 0 === this.atoms.count() && 0 === this.rxnArrows.count() && 0 === this.rxnPluses.count() && !this.isChiral
                }, chem.Struct.prototype.toLists = function() {
                    var e = {},
                        t = [];
                    this.atoms.each(function(n, r) {
                        e[n] = t.length, t.push(r)
                    });
                    var n = [];
                    return this.bonds.each(function(t, r) {
                        var o = new chem.Struct.Bond(r);
                        o.begin = e[r.begin], o.end = e[r.end], n.push(o)
                    }), {
                        atoms: t,
                        bonds: n
                    }
                }, chem.Struct.prototype.clone = function(e, t, n, r) {
                    var o = new chem.Struct;
                    return this.mergeInto(o, e, t, n, !1, r)
                }, chem.Struct.prototype.getScaffold = function() {
                    var e = Set.empty();
                    return this.atoms.each(function(t) {
                        Set.add(e, t)
                    }, this), this.rgroups.each(function(t, n) {
                        n.frags.each(function(t, n) {
                            this.atoms.each(function(t, r) {
                                r.fragment == n && Set.remove(e, t)
                            }, this)
                        }, this)
                    }, this), this.clone(e)
                }, chem.Struct.prototype.getFragmentIds = function(e) {
                    var t = Set.empty();
                    return this.atoms.each(function(n, r) {
                        r.fragment == e && Set.add(t, n)
                    }, this), t
                }, chem.Struct.prototype.getFragment = function(e) {
                    return this.clone(this.getFragmentIds(e))
                }, chem.Struct.prototype.mergeInto = function(e, t, n, r, o, i) {
                    t = t || Set.keySetInt(this.atoms), n = n || Set.keySetInt(this.bonds), n = Set.filter(n, function(e) {
                        var n = this.bonds.get(e);
                        return Set.contains(t, n.begin) && Set.contains(t, n.end)
                    }, this);
                    var a = {};
                    this.atoms.each(function(e, n) {
                        Set.contains(t, e) && (a[n.fragment] = 1)
                    });
                    var s = {};
                    this.frags.each(function(t, n) {
                        a[t] && (s[t] = e.frags.add(n.clone()))
                    }), this.rgroups.each(function(t, n) {
                        var r = o;
                        if (r || (n.frags.each(function(e, t) {
                                a[t] && (r = !0)
                            }), r)) {
                            var i = e.rgroups.get(t);
                            i ? n.frags.each(function(e, t) {
                                a[t] && i.frags.add(s[t])
                            }) : e.rgroups.set(t, n.clone(s))
                        }
                    }), ("undefined" == typeof i || null === i) && (i = {}), this.atoms.each(function(n, r) {
                        Set.contains(t, n) && (i[n] = e.atoms.add(r.clone(s)))
                    });
                    var u = {};
                    return this.bonds.each(function(t, r) {
                        Set.contains(n, t) && (u[t] = e.bonds.add(r.clone(i)))
                    }), this.sgroups.each(function(n, r) {
                        var o;
                        for (o = 0; o < r.atoms.length; ++o)
                            if (!Set.contains(t, r.atoms[o])) return;
                        r = chem.SGroup.clone(r, i, u);
                        var a = e.sgroups.add(r);
                        for (r.id = a, o = 0; o < r.atoms.length; ++o) Set.add(e.atoms.get(r.atoms[o]).sgs, a);
                        e.sGroupForest.insert(r.id)
                    }), e.isChiral = this.isChiral, r || (e.isReaction = this.isReaction, this.rxnArrows.each(function(t, n) {
                        e.rxnArrows.add(n.clone())
                    }), this.rxnPluses.each(function(t, n) {
                        e.rxnPluses.add(n.clone())
                    })), e
                }, chem.Struct.prototype.findBondId = function(e, t) {
                    var n = -1;
                    return this.bonds.find(function(r, o) {
                        return o.begin == e && o.end == t || o.begin == t && o.end == e ? (n = r, !0) : !1
                    }, this), n
                }, chem.Struct.ATOM = {
                    RADICAL: {
                        NONE: 0,
                        SINGLET: 1,
                        DOUPLET: 2,
                        TRIPLET: 3
                    }
                }, chem.Struct.radicalElectrons = function(e) {
                    if (e -= 0, e == chem.Struct.ATOM.RADICAL.NONE) return 0;
                    if (e == chem.Struct.ATOM.RADICAL.DOUPLET) return 1;
                    if (e == chem.Struct.ATOM.RADICAL.SINGLET || e == chem.Struct.ATOM.RADICAL.TRIPLET) return 2;
                    throw new Error("Unknown radical value")
                }, chem.Struct.BOND = {
                    TYPE: {
                        SINGLE: 1,
                        DOUBLE: 2,
                        TRIPLE: 3,
                        AROMATIC: 4,
                        SINGLE_OR_DOUBLE: 5,
                        SINGLE_OR_AROMATIC: 6,
                        DOUBLE_OR_AROMATIC: 7,
                        ANY: 8
                    },
                    STEREO: {
                        NONE: 0,
                        UP: 1,
                        EITHER: 4,
                        DOWN: 6,
                        CIS_TRANS: 3
                    },
                    TOPOLOGY: {
                        EITHER: 0,
                        RING: 1,
                        CHAIN: 2
                    },
                    REACTING_CENTER: {
                        NOT_CENTER: -1,
                        UNMARKED: 0,
                        CENTER: 1,
                        UNCHANGED: 2,
                        MADE_OR_BROKEN: 4,
                        ORDER_CHANGED: 8,
                        MADE_OR_BROKEN_AND_CHANGED: 12
                    }
                }, chem.Struct.FRAGMENT = {
                    NONE: 0,
                    REACTANT: 1,
                    PRODUCT: 2,
                    AGENT: 3
                }, chem.Struct.Atom = function(e) {
                    var t = chem.Struct.Atom.attrGetDefault;
                    if (!(e && "label" in e)) throw new Error("label must be specified!");
                    this.label = e.label, this.fragment = Object.isUndefined(e.fragment) ? -1 : e.fragment, util.ifDef(this, e, "isotope", t("isotope")), util.ifDef(this, e, "radical", t("radical")), util.ifDef(this, e, "charge", t("charge")), util.ifDef(this, e, "rglabel", t("rglabel")), util.ifDef(this, e, "attpnt", t("attpnt")), util.ifDef(this, e, "explicitValence", t("explicitValence")), this.valence = 0, this.implicitH = 0, this.pp = Object.isUndefined(e.pp) ? new Vec2 : new Vec2(e.pp), this.sgs = {}, util.ifDef(this, e, "ringBondCount", t("ringBondCount")), util.ifDef(this, e, "substitutionCount", t("substitutionCount")), util.ifDef(this, e, "unsaturatedAtom", t("unsaturatedAtom")), util.ifDef(this, e, "hCount", t("hCount")), util.ifDef(this, e, "aam", t("aam")), util.ifDef(this, e, "invRet", t("invRet")), util.ifDef(this, e, "exactChangeFlag", t("exactChangeFlag")), util.ifDef(this, e, "rxnFragmentType", -1), this.atomList = Object.isUndefined(e.atomList) || null == e.atomList ? null : new chem.Struct.AtomList(e.atomList), this.neighbors = [], this.badConn = !1
                }, chem.Struct.Atom.getAttrHash = function(e) {
                    var t = new Hash;
                    for (var n in chem.Struct.Atom.attrlist) "undefined" != typeof e[n] && t.set(n, e[n]);
                    return t
                }, chem.Struct.Atom.attrGetDefault = function(e) {
                    if (e in chem.Struct.Atom.attrlist) return chem.Struct.Atom.attrlist[e];
                    throw new Error("Attribute unknown")
                }, chem.Struct.Atom.attrlist = {
                    label: "C",
                    isotope: 0,
                    radical: 0,
                    charge: 0,
                    explicitValence: -1,
                    ringBondCount: 0,
                    substitutionCount: 0,
                    unsaturatedAtom: 0,
                    hCount: 0,
                    atomList: null,
                    invRet: 0,
                    exactChangeFlag: 0,
                    rglabel: null,
                    attpnt: null,
                    aam: 0
                }, chem.Struct.Atom.prototype.clone = function(e) {
                    var t = new chem.Struct.Atom(this);
                    return e && this.fragment in e && (t.fragment = e[this.fragment]), t
                }, chem.Struct.Atom.prototype.isQuery = function() {
                    return null != this.atomList || "A" == this.label || this.attpnt || this.hCount
                }, chem.Struct.Atom.prototype.pureHydrogen = function() {
                    return "H" == this.label && 0 == this.isotope
                }, chem.Struct.Atom.prototype.isPlainCarbon = function() {
                    return "C" == this.label && 0 == this.isotope && 0 == this.radical && 0 == this.charge && this.explicitValence < 0 && 0 == this.ringBondCount && 0 == this.substitutionCount && 0 == this.unsaturatedAtom && 0 == this.hCount && !this.atomList
                }, chem.Struct.Atom.prototype.isPseudo = function() {
                    return !this.atomList && !this.rglabel && !element.getElementByLabel(this.label)
                }, chem.Struct.Atom.prototype.hasRxnProps = function() {
                    return !(!this.invRet && !this.exactChangeFlag && util.isNull(this.attpnt) && !this.aam)
                }, chem.Struct.AtomList = function(e) {
                    if (!(e && "notList" in e && "ids" in e)) throw new Error("'notList' and 'ids' must be specified!");
                    this.notList = e.notList, this.ids = e.ids
                }, chem.Struct.AtomList.prototype.labelList = function() {
                    for (var e = [], t = 0; t < this.ids.length; ++t) e.push(element.get(this.ids[t]).label);
                    return e
                }, chem.Struct.AtomList.prototype.label = function() {
                    var e = "[" + this.labelList().join(",") + "]";
                    return this.notList && (e = "!" + e), e
                }, chem.Struct.AtomList.prototype.equals = function(e) {
                    return this.notList == e.notList && (this.ids || []).sort().toString() == (e.ids || []).sort().toString()
                }, chem.Struct.Bond = function(e) {
                    if (!(e && "begin" in e && "end" in e && "type" in e)) throw new Error("'begin', 'end' and 'type' properties must be specified!");
                    this.begin = e.begin, this.end = e.end, this.type = e.type, util.ifDef(this, e, "stereo", chem.Struct.BOND.STEREO.NONE), util.ifDef(this, e, "topology", chem.Struct.BOND.TOPOLOGY.EITHER), util.ifDef(this, e, "reactingCenterStatus", 0), this.hb1 = null, this.hb2 = null, this.len = 0, this.center = new Vec2, this.sb = 0, this.sa = 0, this.angle = 0
                }, chem.Struct.Bond.attrlist = {
                    type: chem.Struct.BOND.TYPE.SINGLE,
                    stereo: chem.Struct.BOND.STEREO.NONE,
                    topology: chem.Struct.BOND.TOPOLOGY.EITHER,
                    reactingCenterStatus: 0
                }, chem.Struct.Bond.getAttrHash = function(e) {
                    var t = new Hash;
                    for (var n in chem.Struct.Bond.attrlist) "undefined" != typeof e[n] && t.set(n, e[n]);
                    return t
                }, chem.Struct.Bond.attrGetDefault = function(e) {
                    if (e in chem.Struct.Bond.attrlist) return chem.Struct.Bond.attrlist[e];
                    throw new Error("Attribute unknown")
                }, chem.Struct.Bond.prototype.hasRxnProps = function() {
                    return !!this.reactingCenterStatus
                }, chem.Struct.Bond.prototype.getCenter = function(e) {
                    var t = e.atoms.get(this.begin).pp,
                        n = e.atoms.get(this.end).pp;
                    return Vec2.lc2(t, .5, n, .5)
                }, chem.Struct.Bond.prototype.getDir = function(e) {
                    var t = e.atoms.get(this.begin).pp,
                        n = e.atoms.get(this.end).pp;
                    return n.sub(t).normalized()
                }, chem.Struct.Bond.prototype.clone = function(e) {
                    var t = new chem.Struct.Bond(this);
                    return e && (t.begin = e[t.begin], t.end = e[t.end]), t
                }, chem.Struct.Bond.prototype.findOtherEnd = function(e) {
                    if (e == this.begin) return this.end;
                    if (e == this.end) return this.begin;
                    throw new Error("bond end not found")
                }, chem.HalfBond = function(e, t, n) {
                    if (3 != arguments.length) throw new Error("Invalid parameter number!");
                    this.begin = e - 0, this.end = t - 0, this.bid = n - 0, this.dir = new Vec2, this.norm = new Vec2, this.ang = 0, this.p = new Vec2, this.loop = -1, this.contra = -1, this.next = -1, this.leftSin = 0, this.leftCos = 0, this.leftNeighbor = 0, this.rightSin = 0, this.rightCos = 0, this.rightNeighbor = 0
                }, chem.Struct.prototype.initNeighbors = function() {
                    this.atoms.each(function(e, t) {
                        t.neighbors = []
                    }), this.bonds.each(function(e, t) {
                        var n = this.atoms.get(t.begin),
                            r = this.atoms.get(t.end);
                        n.neighbors.push(t.hb1), r.neighbors.push(t.hb2)
                    }, this)
                }, chem.Struct.prototype.bondInitHalfBonds = function(e, t) {
                    t = t || this.bonds.get(e), t.hb1 = 2 * e, t.hb2 = 2 * e + 1, this.halfBonds.set(t.hb1, new chem.HalfBond(t.begin, t.end, e)), this.halfBonds.set(t.hb2, new chem.HalfBond(t.end, t.begin, e));
                    var n = this.halfBonds.get(t.hb1),
                        r = this.halfBonds.get(t.hb2);
                    n.contra = t.hb2, r.contra = t.hb1
                }, chem.Struct.prototype.halfBondUpdate = function(e) {
                    var t = this.halfBonds.get(e),
                        n = this.atoms.get(t.begin).pp,
                        r = this.atoms.get(t.end).pp,
                        o = Vec2.diff(r, n).normalized();
                    t.dir = Vec2.dist(r, n) > 1e-4 ? o : new Vec2(1, 0), t.norm = t.dir.turnLeft(), t.ang = t.dir.oxAngle(), t.loop < 0 && (t.loop = -1)
                }, chem.Struct.prototype.initHalfBonds = function() {
                    this.halfBonds.clear(), this.bonds.each(this.bondInitHalfBonds, this)
                }, chem.Struct.prototype.setHbNext = function(e, t) {
                    this.halfBonds.get(this.halfBonds.get(e).contra).next = t
                }, chem.Struct.prototype.halfBondSetAngle = function(e, t) {
                    var n = this.halfBonds.get(e),
                        r = this.halfBonds.get(t);
                    r.rightCos = n.leftCos = Vec2.dot(r.dir, n.dir), r.rightSin = n.leftSin = Vec2.cross(r.dir, n.dir), n.leftNeighbor = t, r.rightNeighbor = e
                }, chem.Struct.prototype.atomAddNeighbor = function(e) {
                    var t = this.halfBonds.get(e),
                        n = this.atoms.get(t.begin),
                        r = 0;
                    for (r = 0; r < n.neighbors.length && !(this.halfBonds.get(n.neighbors[r]).ang > t.ang); ++r);
                    n.neighbors.splice(r, 0, e);
                    var o = n.neighbors[(r + 1) % n.neighbors.length],
                        i = n.neighbors[(r + n.neighbors.length - 1) % n.neighbors.length];
                    this.setHbNext(i, e), this.setHbNext(e, o), this.halfBondSetAngle(e, i), this.halfBondSetAngle(o, e)
                }, chem.Struct.prototype.atomSortNeighbors = function(e) {
                    var t = this.atoms.get(e);
                    t.neighbors = t.neighbors.sortBy(function(e) {
                        return this.halfBonds.get(e).ang
                    }, this);
                    var n;
                    for (n = 0; n < t.neighbors.length; ++n) this.halfBonds.get(this.halfBonds.get(t.neighbors[n]).contra).next = t.neighbors[(n + 1) % t.neighbors.length];
                    for (n = 0; n < t.neighbors.length; ++n) this.halfBondSetAngle(t.neighbors[(n + 1) % t.neighbors.length], t.neighbors[n])
                }, chem.Struct.prototype.sortNeighbors = function(e) {
                    var t = function(e) {
                        this.atomSortNeighbors(e)
                    };
                    util.isNullOrUndefined(e) ? this.atoms.each(t, this) : util.each(e, t, this)
                }, chem.Struct.prototype.atomUpdateHalfBonds = function(e) {
                    for (var t = this.atoms.get(e).neighbors, n = 0; n < t.length; ++n) {
                        var r = t[n];
                        this.halfBondUpdate(r), this.halfBondUpdate(this.halfBonds.get(r).contra)
                    }
                }, chem.Struct.prototype.updateHalfBonds = function(e) {
                    var t = function(e) {
                        this.atomUpdateHalfBonds(e)
                    };
                    util.isNullOrUndefined(e) ? this.atoms.each(t, this) : util.each(e, t, this)
                }, chem.Struct.prototype.sGroupsRecalcCrossBonds = function() {
                    this.sgroups.each(function(e, t) {
                        t.xBonds = [], t.neiAtoms = []
                    }, this), this.bonds.each(function(e, t) {
                        var n = this.atoms.get(t.begin),
                            r = this.atoms.get(t.end);
                        Set.each(n.sgs, function(n) {
                            if (!Set.contains(r.sgs, n)) {
                                var o = this.sgroups.get(n);
                                o.xBonds.push(e), util.arrayAddIfMissing(o.neiAtoms, t.end)
                            }
                        }, this), Set.each(r.sgs, function(r) {
                            if (!Set.contains(n.sgs, r)) {
                                var o = this.sgroups.get(r);
                                o.xBonds.push(e), util.arrayAddIfMissing(o.neiAtoms, t.begin)
                            }
                        }, this)
                    }, this)
                }, chem.Struct.prototype.sGroupDelete = function(e) {
                    for (var t = this.sgroups.get(e), n = 0; n < t.atoms.length; ++n) Set.remove(this.atoms.get(t.atoms[n]).sgs, e);
                    this.sGroupForest.remove(e), this.sgroups.remove(e)
                }, chem.Struct.itemSetPos = function(e, t) {
                    e.pp = t
                }, chem.Struct.prototype._itemSetPos = function(e, t, n, r) {
                    chem.Struct.itemSetPos(this[e].get(t), n, r)
                }, chem.Struct.prototype._atomSetPos = function(e, t, n) {
                    this._itemSetPos("atoms", e, t, n)
                }, chem.Struct.prototype._rxnPlusSetPos = function(e, t, n) {
                    this._itemSetPos("rxnPluses", e, t, n)
                }, chem.Struct.prototype._rxnArrowSetPos = function(e, t, n) {
                    this._itemSetPos("rxnArrows", e, t, n)
                }, chem.Struct.prototype.getCoordBoundingBox = function(e) {
                    var t = null,
                        n = function(e) {
                            t ? (t.min = Vec2.min(t.min, e), t.max = Vec2.max(t.max, e)) : t = {
                                min: e,
                                max: e
                            }
                        },
                        r = "undefined" == typeof e;
                    return this.atoms.each(function(t, o) {
                        (r || Set.contains(e, t)) && n(o.pp)
                    }), r && (this.rxnPluses.each(function(e, t) {
                        n(t.pp)
                    }), this.rxnArrows.each(function(e, t) {
                        n(t.pp)
                    })), !t && r && (t = {
                        min: new Vec2(0, 0),
                        max: new Vec2(1, 1)
                    }), t
                }, chem.Struct.prototype.getCoordBoundingBoxObj = function() {
                    var e = null,
                        t = function(t) {
                            e ? (e.min = Vec2.min(e.min, t), e.max = Vec2.max(e.max, t)) : e = {
                                min: new Vec2(t),
                                max: new Vec2(t)
                            }
                        };
                    return this.atoms.each(function(e, n) {
                        t(n.pp)
                    }), e
                }, chem.Struct.prototype.getBondLengthData = function() {
                    var e = 0,
                        t = 0;
                    return this.bonds.each(function(n, r) {
                        e += Vec2.dist(this.atoms.get(r.begin).pp, this.atoms.get(r.end).pp), t++
                    }, this), {
                        cnt: t,
                        totalLength: e
                    }
                }, chem.Struct.prototype.getAvgBondLength = function() {
                    var e = this.getBondLengthData();
                    return e.cnt > 0 ? e.totalLength / e.cnt : -1
                }, chem.Struct.prototype.getAvgClosestAtomDistance = function() {
                    var e, t, n, r = 0,
                        o = 0,
                        i = this.atoms.keys();
                    for (t = 0; t < i.length; ++t) {
                        for (e = -1, n = 0; n < i.length; ++n) n != t && (o = Vec2.dist(this.atoms.get(i[n]).pp, this.atoms.get(i[t]).pp), (0 > e || e > o) && (e = o));
                        r += e
                    }
                    return i.length > 0 ? r / i.length : -1
                }, chem.Struct.prototype.checkBondExists = function(e, t) {
                    var n = !1;
                    return this.bonds.each(function(r, o) {
                        (o.begin == e && o.end == t || o.end == e && o.begin == t) && (n = !0)
                    }, this), n
                }, chem.Loop = function(e, t, n) {
                    this.hbs = e, this.dblBonds = 0, this.aromatic = !0, this.convex = n || !1, e.each(function(e) {
                        var n = t.bonds.get(t.halfBonds.get(e).bid);
                        n.type != chem.Struct.BOND.TYPE.AROMATIC && (this.aromatic = !1), n.type == chem.Struct.BOND.TYPE.DOUBLE && this.dblBonds++
                    }, this)
                }, chem.Struct.RxnPlus = function(e) {
                    e = e || {}, this.pp = e.pp ? new Vec2(e.pp) : new Vec2
                }, chem.Struct.RxnPlus.prototype.clone = function() {
                    return new chem.Struct.RxnPlus(this)
                }, chem.Struct.RxnArrow = function(e) {
                    e = e || {}, this.pp = e.pp ? new Vec2(e.pp) : new Vec2
                }, chem.Struct.RxnArrow.prototype.clone = function() {
                    return new chem.Struct.RxnArrow(this)
                }, chem.Struct.prototype.findConnectedComponent = function(e) {
                    for (var t = {}, n = [e], r = Set.empty(); n.length > 0;) ! function() {
                        var e = n.pop();
                        t[e] = 1, Set.add(r, e);
                        for (var o = this.atoms.get(e), i = 0; i < o.neighbors.length; ++i) {
                            var a = this.halfBonds.get(o.neighbors[i]).end;
                            Set.contains(r, a) || n.push(a)
                        }
                    }.apply(this);
                    return r
                }, chem.Struct.prototype.findConnectedComponents = function(e) {
                    this.halfBonds.count() || (this.initHalfBonds(), this.initNeighbors(), this.updateHalfBonds(this.atoms.keys()), this.sortNeighbors(this.atoms.keys()));
                    var t = {};
                    this.atoms.each(function(e) {
                        t[e] = -1
                    }, this);
                    var n = [];
                    return this.atoms.each(function(r, o) {
                        if ((e || o.fragment < 0) && t[r] < 0) {
                            var i = this.findConnectedComponent(r);
                            n.push(i), Set.each(i, function(e) {
                                t[e] = 1
                            }, this)
                        }
                    }, this), n
                }, chem.Struct.prototype.markFragment = function(e) {
                    var t = this.frags.add(new chem.Struct.Fragment);
                    Set.each(e, function(e) {
                        this.atoms.get(e).fragment = t
                    }, this)
                }, chem.Struct.prototype.markFragmentByAtomId = function(e) {
                    this.markFragment(this.findConnectedComponent(e))
                }, chem.Struct.prototype.markFragments = function() {
                    for (var e = this.findConnectedComponents(), t = 0; t < e.length; ++t) this.markFragment(e[t])
                }, chem.Struct.Fragment = function() {}, chem.Struct.Fragment.prototype.clone = function() {
                    return Object.clone(this)
                }, chem.Struct.Fragment.getAtoms = function(e, t) {
                    var n = [];
                    return e.atoms.each(function(e, r) {
                        r.fragment == t && n.push(e)
                    }, this), n
                }, chem.Struct.RGroup = function(e) {
                    e = e || {}, this.frags = new Pool, this.resth = e.resth || !1, this.range = e.range || "", this.ifthen = e.ifthen || 0
                }, chem.Struct.RGroup.prototype.getAttrs = function() {
                    return {
                        resth: this.resth,
                        range: this.range,
                        ifthen: this.ifthen
                    }
                }, chem.Struct.RGroup.findRGroupByFragment = function(e, t) {
                    var n;
                    return e.each(function(e, r) {
                        Object.isUndefined(r.frags.keyOf(t)) || (n = e)
                    }), n
                }, chem.Struct.RGroup.prototype.clone = function(e) {
                    var t = new chem.Struct.RGroup(this);
                    return this.frags.each(function(n, r) {
                        t.frags.add(e ? e[r] : r)
                    }), t
                }, chem.Struct.prototype.scale = function(e) {
                    1 != e && (this.atoms.each(function(t, n) {
                        n.pp = n.pp.scaled(e)
                    }, this), this.rxnPluses.each(function(t, n) {
                        n.pp = n.pp.scaled(e)
                    }, this), this.rxnArrows.each(function(t, n) {
                        n.pp = n.pp.scaled(e)
                    }, this), this.sgroups.each(function(t, n) {
                        n.pp = n.pp ? n.pp.scaled(e) : null
                    }, this))
                }, chem.Struct.prototype.rescale = function() {
                    var e = this.getAvgBondLength();
                    0 > e && !this.isReaction && (e = this.getAvgClosestAtomDistance()), .001 > e && (e = 1);
                    var t = 1 / e;
                    this.scale(t)
                }, chem.Struct.prototype.loopHasSelfIntersections = function(e) {
                    for (var t = 0; t < e.length; ++t)
                        for (var n = this.halfBonds.get(e[t]), r = this.atoms.get(n.begin).pp, o = this.atoms.get(n.end).pp, i = Set.fromList([n.begin, n.end]), a = t + 2; a < e.length; ++a) {
                            var s = this.halfBonds.get(e[a]);
                            if (!Set.contains(i, s.begin) && !Set.contains(i, s.end)) {
                                var u = this.atoms.get(s.begin).pp,
                                    c = this.atoms.get(s.end).pp;
                                if (Vec2.segmentIntersection(r, o, u, c)) return !0
                            }
                        }
                    return !1
                }, chem.Struct.prototype.partitionLoop = function(e) {
                    var t = [],
                        n = !0;
                    e: for (; n;) {
                        for (var r = {}, o = 0; o < e.length; ++o) {
                            var i = e[o],
                                a = this.halfBonds.get(i).begin,
                                s = this.halfBonds.get(i).end;
                            if (s in r) {
                                var u = r[s],
                                    c = e.slice(u, o + 1);
                                t.push(c), o < e.length && e.splice(u, o - u + 1);
                                continue e
                            }
                            r[a] = o
                        }
                        n = !1, t.push(e)
                    }
                    return t
                }, chem.Struct.prototype.halfBondAngle = function(e, t) {
                    var n = this.halfBonds.get(e),
                        r = this.halfBonds.get(t);
                    return Math.atan2(Vec2.cross(n.dir, r.dir), Vec2.dot(n.dir, r.dir))
                }, chem.Struct.prototype.loopIsConvex = function(e) {
                    for (var t = 0; t < e.length; ++t) {
                        var n = this.halfBondAngle(e[t], e[(t + 1) % e.length]);
                        if (n > 0) return !1
                    }
                    return !0
                }, chem.Struct.prototype.loopIsInner = function(e) {
                    for (var t = 2 * Math.PI, n = 0; n < e.length; ++n) {
                        var r = e[n],
                            o = e[(n + 1) % e.length],
                            i = this.halfBonds.get(o),
                            a = this.halfBondAngle(r, o);
                        t += i.contra == e[n] ? Math.PI : a
                    }
                    return Math.abs(t) < Math.PI
                }, chem.Struct.prototype.findLoops = function() {
                    var e, t, n, r, o = [],
                        i = Set.empty();
                    return this.halfBonds.each(function(a, s) {
                        if (-1 == s.loop)
                            for (e = a, t = 0, n = []; t <= this.halfBonds.count(); e = this.halfBonds.get(e).next, ++t) {
                                if (t > 0 && e == a) {
                                    var u = this.partitionLoop(n);
                                    util.each(u, function(e) {
                                        this.loopIsInner(e) && !this.loopHasSelfIntersections(e) ? (r = util.arrayMin(e), this.loops.set(r, new chem.Loop(e, this, this.loopIsConvex(e)))) : r = -2, e.each(function(e) {
                                            this.halfBonds.get(e).loop = r, Set.add(i, this.halfBonds.get(e).bid)
                                        }, this), r >= 0 && o.push(r)
                                    }, this);
                                    break
                                }
                                n.push(e)
                            }
                    }, this), {
                        newLoops: o,
                        bondsToMark: Set.list(i)
                    }
                }, chem.Struct.prototype.prepareLoopStructure = function() {
                    this.initHalfBonds(), this.initNeighbors(), this.updateHalfBonds(this.atoms.keys()), this.sortNeighbors(this.atoms.keys()), this.findLoops()
                }, chem.Struct.prototype.atomAddToSGroup = function(e, t) {
                    chem.SGroup.addAtom(this.sgroups.get(e), t), Set.add(this.atoms.get(t).sgs, e)
                };

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../util": 39,
            "../util/map": 40,
            "../util/pool": 41,
            "../util/set": 42,
            "../util/vec2": 43,
            "./element": 10
        }],
        17: [function(require, module, exports) {
            (function(global) {
                var util = require("../util"),
                    element = require("./element");
                require("./struct");
                var chem = global.chem = global.chem || {};
                chem.Struct.prototype.calcConn = function(e) {
                    for (var t = 0, r = this.atoms.get(e), n = !1, i = 0; i < r.neighbors.length; ++i) {
                        var o = this.halfBonds.get(r.neighbors[i]),
                            a = this.bonds.get(o.bid);
                        switch (a.type) {
                            case chem.Struct.BOND.TYPE.SINGLE:
                                t += 1;
                                break;
                            case chem.Struct.BOND.TYPE.DOUBLE:
                                t += 2;
                                break;
                            case chem.Struct.BOND.TYPE.TRIPLE:
                                t += 3;
                                break;
                            case chem.Struct.BOND.TYPE.AROMATIC:
                                t += 1, n = !0;
                                break;
                            default:
                                return -1
                        }
                    }
                    return n && (t += 1), t
                }, chem.Struct.Atom.prototype.calcValence = function(e) {
                    var t = this,
                        r = t.charge,
                        n = t.label;
                    if (t.isQuery()) return this.implicitH = 0, !0;
                    var i = element.getElementByLabel(n);
                    if (null == i) return this.implicitH = 0, !0;
                    var o = element.get(i).group,
                        a = chem.Struct.radicalElectrons(t.radical),
                        s = e,
                        c = 0,
                        l = Math.abs(r);
                    return 1 == o ? ("H" == n || "Li" == n || "Na" == n || "K" == n || "Rb" == n || "Cs" == n || "Fr" == n) && (s = 1, c = 1 - a - e - l) : 3 == o ? "B" == n || "Al" == n || "Ga" == n || "In" == n ? -1 == r ? (s = 4, c = 4 - a - e) : (s = 3, c = 3 - a - e - l) : "Tl" == n && (-1 == r ? 2 >= a + e ? (s = 2, c = 2 - a - e) : (s = 4, c = 4 - a - e) : -2 == r ? 3 >= a + e ? (s = 3, c = 3 - a - e) : (s = 5, c = 5 - a - e) : 1 >= a + e + l ? (s = 1, c = 1 - a - e - l) : (s = 3, c = 3 - a - e - l)) : 4 == o ? "C" == n || "Si" == n || "Ge" == n ? (s = 4, c = 4 - a - e - l) : ("Sn" == n || "Pb" == n) && (2 >= e + a + l ? (s = 2, c = 2 - a - e - l) : (s = 4, c = 4 - a - e - l)) : 5 == o ? "N" == n || "P" == n ? 1 == r ? (s = 4, c = 4 - a - e) : 2 == r ? (s = 3, c = 3 - a - e) : "N" == n || 3 >= a + e + l ? (s = 3, c = 3 - a - e - l) : (s = 5, c = 5 - a - e - l) : ("Bi" == n || "Sb" == n || "As" == n) && (1 == r ? 2 >= a + e && "As" != n ? (s = 2, c = 2 - a - e) : (s = 4, c = 4 - a - e) : 2 == r ? (s = 3, c = 3 - a - e) : 3 >= a + e ? (s = 3, c = 3 - a - e - l) : (s = 5, c = 5 - a - e - l)) : 6 == o ? "O" == n ? r >= 1 ? (s = 3, c = 3 - a - e) : (s = 2, c = 2 - a - e - l) : "S" == n || "Se" == n || "Po" == n ? 1 == r ? 3 >= e ? (s = 3, c = 3 - a - e) : (s = 5, c = 5 - a - e) : 2 >= e + a + l ? (s = 2, c = 2 - a - e - l) : 4 >= e + a + l ? (s = 4, c = 4 - a - e - l) : (s = 6, c = 6 - a - e - l) : "Te" == n && (-1 == r ? 2 >= e && (s = 2, c = 2 - a - e - l) : (0 == r || 2 == r) && (2 >= e ? (s = 2, c = 2 - a - e - l) : 4 >= e ? (s = 4, c = 4 - a - e - l) : 0 == r && 6 >= e ? (s = 6, c = 6 - a - e - l) : c = -1)) : 7 == o && ("F" == n ? (s = 1, c = 1 - a - e - l) : ("Cl" == n || "Br" == n || "I" == n || "At" == n) && (1 == r ? 2 >= e ? (s = 2, c = 2 - a - e) : (3 == e || 5 == e || e >= 7) && (c = -1) : 0 == r && (1 >= e ? (s = 1, c = 1 - a - e) : 2 == e || 4 == e || 6 == e ? 1 == a ? (s = e, c = 0) : c = -1 : e > 7 && (c = -1)))), this.valence = s, this.implicitH = c, this.implicitH < 0 ? (this.valence = e, this.implicitH = 0, this.badConn = !0, !1) : !0
                }, chem.Struct.Atom.prototype.calcValenceMinusHyd = function(e) {
                    var t = this,
                        r = t.charge,
                        n = t.label,
                        i = element.getElementByLabel(n);
                    if (null == i) throw new Error("Element " + n + " unknown");
                    if (0 > i) return this.implicitH = 0, null;
                    var o = element.get(i).group,
                        a = chem.Struct.radicalElectrons(t.radical);
                    if (3 == o) {
                        if (("B" == n || "Al" == n || "Ga" == n || "In" == n) && -1 == r && 4 >= a + e) return a + e
                    } else if (5 == o) {
                        if ("N" == n || "P" == n) {
                            if (1 == r) return a + e;
                            if (2 == r) return a + e
                        } else if ("Sb" == n || "Bi" == n || "As" == n) {
                            if (1 == r) return a + e;
                            if (2 == r) return a + e
                        }
                    } else if (6 == o) {
                        if ("O" == n) {
                            if (r >= 1) return a + e
                        } else if (("S" == n || "Se" == n || "Po" == n) && 1 == r) return a + e
                    } else if (7 == o && ("Cl" == n || "Br" == n || "I" == n || "At" == n) && 1 == r) return a + e;
                    return a + e + Math.abs(r)
                }, chem.Struct.prototype.calcImplicitHydrogen = function(e) {
                    var t = this.calcConn(e),
                        r = this.atoms.get(e);
                    if (r.badConn = !1, 0 > t || r.isQuery()) return r.implicitH = 0, void 0;
                    if (r.explicitValence >= 0) {
                        var n = element.getElementByLabel(r.label);
                        r.implicitH = 0, null != n && (r.implicitH = r.explicitValence - r.calcValenceMinusHyd(t), r.implicitH < 0 && (r.implicitH = 0, r.badConn = !0))
                    } else r.calcValence(t)
                }, chem.Struct.prototype.setImplicitHydrogen = function(e) {
                    var t = function(e) {
                        this.calcImplicitHydrogen(e)
                    };
                    util.isNullOrUndefined(e) ? this.atoms.each(t, this) : util.each(e, t, this)
                };

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../util": 39,
            "./element": 10,
            "./struct": 16
        }],
        18: [function(require, module, exports) {
            (function(global) {
                function getSmiles(e) {
                    var t = ui.standalone || e,
                        i = t ? new chem.SmilesSaver : new chem.MolfileSaver,
                        r = i.saveMolecule(ui.ctab, !0);
                    return t ? r : ketcher.server.smiles.sync({
                        moldata: r
                    })
                }

                function getMolfile() {
                    var e = new chem.MolfileSaver;
                    return e.saveMolecule(ui.ctab, !0)
                }

                function setMolecule(e) {
                    Object.isString(e) && ui.loadMolecule(e)
                }

                function addFragment(e) {
                    Object.isString(e) && ui.loadFragment(e)
                }

                function showMolfile(e, t, i) {
                    var r = util.extend({
                            bondLength: 75,
                            showSelectionRegions: !1,
                            showBondIds: !1,
                            showHalfBondIds: !1,
                            showLoopIds: !1,
                            showAtomIds: !1,
                            autoScale: !1,
                            autoScaleMargin: 4,
                            hideImplicitHydrogen: !1
                        }, i),
                        l = new rnd.Render(e, r.bondLength, r);
                    if (t) {
                        var n = chem.Molfile.parseCTFile(t);
                        l.setMolecule(n)
                    }
                    return l.update(), l
                }

                function onStructChange(e) {
                    util.assert(e), ui.render.addStructChangeHandler(e)
                }
                var queryString = require("query-string"),
                    util = require("./util"),
                    api = require("./api.js");
                require("./ui"), require("./chem"), require("./rnd");
                var ui = global.ui,
                    chem = global.chem,
                    rnd = global.rnd;
                window.onload = function() {
                    var e = queryString.parse(document.location.search);
                    e.api_path && (ketcher.api_path = e.api_path), ketcher.server = api(ketcher.api_path), ui.init(util.extend({}, e), ketcher.server)
                };
                var ketcher = module.exports = {
                    version: "2.0.0-alpha.3",
                    api_path: "",
                    build_date: "2017-01-02 14-19-48",
                    build_number: null,
                    build_options: "__BUILD_NUMBER__",
                    getSmiles: getSmiles,
                    getMolfile: getMolfile,
                    setMolecule: setMolecule,
                    addFragment: addFragment,
                    showMolfile: showMolfile,
                    onStructChange: onStructChange
                };
            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "./api.js": 7,
            "./chem": 11,
            "./rnd": 21,
            "./ui": 34,
            "./util": 39,
            "query-string": 4
        }],
        19: [function(require, module, exports) {
            (function(global) {
                var Raphael = (typeof window !== "undefined" ? window['Raphael'] : typeof global !== "undefined" ? global['Raphael'] : null),
                    Vec2 = require("./util/vec2");
                Raphael.el.translateAbs = function(e, t) {
                    this.delta = this.delta || new Vec2, this.delta.x += e - 0, this.delta.y += t - 0, this.transform("t" + this.delta.x.toString() + "," + this.delta.y.toString())
                }, Raphael.st.translateAbs = function(e, t) {
                    this.forEach(function(r) {
                        r.translateAbs(e, t)
                    })
                }, module.exports = Raphael;

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "./util/vec2": 43
        }],
        20: [function(require, module, exports) {
            (function(global) {
                function bondFlipRequired(e, t) {
                    return t.type == chem.Struct.BOND.TYPE.SINGLE && e.stereo == chem.Struct.BOND.STEREO.NONE && t.stereo != chem.Struct.BOND.STEREO.NONE && ui.ctab.atoms.get(e.begin).neighbors.length < ui.ctab.atoms.get(e.end).neighbors.length
                }
                var Set = require("../util/set"),
                    Vec2 = require("../util/vec2"),
                    Action = require("../ui/action"),
                    element = require("../chem/element"),
                    util = require("../util");
                require("../chem"), require("./restruct"), require("../ui");
                var rnd = global.rnd = global.rnd || {},
                    chem = global.chem = global.chem || {},
                    ui = global.ui;
                rnd.Editor = function(e) {
                    this.render = e, this._selectionHelper = new rnd.Editor.SelectionHelper(this)
                }, rnd.Editor.prototype.selectAll = function() {
                    var e = {};
                    for (var t in rnd.ReStruct.maps) e[t] = ui.render.ctab[t].ikeys();
                    this._selectionHelper.setSelection(e)
                }, rnd.Editor.prototype.deselectAll = function() {
                    this._selectionHelper.setSelection()
                }, rnd.Editor.prototype.hasSelection = function(e) {
                    if ("selection" in this._selectionHelper)
                        for (var t in this._selectionHelper.selection)
                            if (this._selectionHelper.selection[t].length > 0 && (!e || "sgroupData" !== t)) return !0;
                    return !1
                }, rnd.Editor.prototype.getSelection = function(e) {
                    var t = {};
                    if ("selection" in this._selectionHelper)
                        for (var r in this._selectionHelper.selection) t[r] = this._selectionHelper.selection[r].slice(0);
                    if (e) {
                        var n = this.render.ctab.molecule;
                        "bonds" in t && t.bonds.each(function(e) {
                            var r = n.bonds.get(e);
                            t.atoms = t.atoms || [], t.atoms.indexOf(r.begin) < 0 && t.atoms.push(r.begin), t.atoms.indexOf(r.end) < 0 && t.atoms.push(r.end)
                        }, this), "atoms" in t && "bonds" in t && n.bonds.each(function(e) {
                            if (!("bonds" in t) || t.bonds.indexOf(e) < 0) {
                                var r = n.bonds.get(e);
                                t.atoms.indexOf(r.begin) >= 0 && t.atoms.indexOf(r.end) >= 0 && (t.bonds = t.bonds || [], t.bonds.push(e))
                            }
                        }, this)
                    }
                    return t
                }, rnd.Editor.prototype.getSelectionStruct = function() {
                    console.assert(ui.ctab == this.render.ctab.molecule, "Another ctab");
                    var e = ui.ctab,
                        t = this.getSelection(!0),
                        r = e.clone(Set.fromList(t.atoms), Set.fromList(t.bonds), !0);
                    return e.rxnArrows.each(function(e, n) {
                        -1 != t.rxnArrows.indexOf(e) && r.rxnArrows.add(n.clone())
                    }), e.rxnPluses.each(function(e, n) {
                        -1 != t.rxnPluses.indexOf(e) && r.rxnPluses.add(n.clone())
                    }), r.isReaction = e.isReaction && (r.rxnArrows.count() || r.rxnPluses.count()), r
                }, rnd.Editor.SelectionHelper = function(e) {
                    this.editor = e
                }, rnd.Editor.SelectionHelper.prototype.setSelection = function(e, t) {
                    if (!("selection" in this && t)) {
                        this.selection = {};
                        for (var r in rnd.ReStruct.maps) this.selection[r] = []
                    }
                    if (e && "id" in e && "map" in e && (e[e.map] = e[e.map] || []).push(e.id), e)
                        for (var n in this.selection)
                            if (n in e)
                                for (var o = 0; o < e[n].length; o++) this.selection[n].indexOf(e[n][o]) < 0 && this.selection[n].push(e[n][o]);
                    this.editor.render.setSelection(this.selection), this.editor.render.update(), ui.updateClipboardButtons()
                }, rnd.Editor.SelectionHelper.prototype.isSelected = function(e) {
                    var t = this.editor.render,
                        r = t.ctab;
                    if ("frags" == e.map || "rgroups" == e.map) {
                        var n = "frags" == e.map ? r.frags.get(e.id).fragGetAtoms(t, e.id) : r.rgroups.get(e.id).getAtoms(t);
                        return !Object.isUndefined(this.selection.atoms) && Set.subset(Set.fromList(n), Set.fromList(this.selection.atoms))
                    }
                    return "selection" in this && !Object.isUndefined(this.selection[e.map]) && this.selection[e.map].indexOf(e.id) > -1
                }, rnd.Editor.EditorTool = function(e) {
                    this.editor = e
                }, rnd.Editor.EditorTool.prototype.processEvent = function(e, t, r) {
                    if ("touches" in t && 1 != t.touches.length) {
                        if ("lastEvent" in this.OnMouseDown0) return this.OnMouseUp0(t, r)
                    } else {
                        if (e + "0" in this) return this[e + "0"](t, r);
                        if (e in this) return this[e](t, r);
                        console.log("EditorTool.dispatchEvent: event '" + e + "' is not handled.")
                    }
                }, rnd.Editor.EditorTool.prototype.OnMouseDown = function() {}, rnd.Editor.EditorTool.prototype.OnMouseMove = function() {}, rnd.Editor.EditorTool.prototype.OnMouseUp = function() {}, rnd.Editor.EditorTool.prototype.OnClick = function() {}, rnd.Editor.EditorTool.prototype.OnDblClick = function() {}, rnd.Editor.EditorTool.prototype.OnMouseLeave = function() {
                    this.OnCancel()
                }, rnd.Editor.EditorTool.prototype.OnKeyPress = function() {}, rnd.Editor.EditorTool.prototype.OnCancel = function() {}, rnd.Editor.EditorTool.prototype.OnMouseDown0 = function(e) {
                    return ui.hideBlurredControls() ? !0 : (this.OnMouseDown0.lastEvent = e, this.OnMouseMove0.lastEvent = e, "OnMouseDown" in this ? this.OnMouseDown(e) : void 0)
                }, rnd.Editor.EditorTool.prototype.OnMouseMove0 = function(e) {
                    return this.OnMouseMove0.lastEvent = e, "OnMouseMove" in this ? this.OnMouseMove(e) : void 0
                }, rnd.Editor.EditorTool.prototype.OnMouseUp0 = function(e) {
                    if (!("lastEvent" in this.OnMouseDown0)) return !0;
                    "lastEvent" in this.OnMouseMove0 && (e = Object.clone(e), e.pageX = this.OnMouseMove0.lastEvent.pageX, e.pageY = this.OnMouseMove0.lastEvent.pageY);
                    try {
                        if ("OnMouseUp" in this) return this.OnMouseUp(e)
                    } finally {
                        delete this.OnMouseDown0.lastEvent
                    }
                }, rnd.Editor.EditorTool.atom_label_map = {
                    atom_tool_any: "A",
                    atom_tool_h: "H",
                    atom_tool_c: "C",
                    atom_tool_n: "N",
                    atom_tool_o: "O",
                    atom_tool_s: "S",
                    atom_tool_p: "P",
                    atom_tool_f: "F",
                    atom_tool_br: "Br",
                    atom_tool_cl: "Cl",
                    atom_tool_i: "I"
                }, rnd.Editor.EditorTool.prototype.OnKeyPress0 = function(e, t) {
                    if ("rgroup_tool_label" === t && "lastEvent" in this.OnMouseMove0) return rnd.Editor.RGroupAtomTool.prototype.OnMouseUp.call(this, this.OnMouseMove0.lastEvent);
                    if (t in rnd.Editor.EditorTool.atom_label_map) {
                        var r = rnd.Editor.EditorTool.atom_label_map[t],
                            n = this.editor.getSelection();
                        if (n && "atoms" in n && n.atoms.length > 0) return ui.addUndoAction(Action.fromAtomsAttrs(n.atoms, {
                            label: r
                        }, !0), !0), ui.render.update(), !0;
                        var o = this.editor.render.findItem(this.OnMouseMove0.lastEvent);
                        if (o) return o.label = {
                            label: r
                        }, "atoms" === o.map ? ui.addUndoAction(Action.fromAtomsAttrs(o.id, o.label, !0), !0) : -1 == o.id && ui.addUndoAction(Action.fromAtomAddition(ui.page2obj(this.OnMouseMove0.lastEvent), o.label), !0), ui.render.update(), !0
                    }
                    return "OnKeyPress" in this ? this.OnKeyPress(e) : !1
                }, rnd.Editor.EditorTool.prototype._calcAngle = function(e, t) {
                    var r = Vec2.diff(t, e),
                        n = Math.atan2(r.y, r.x),
                        o = 0 > n ? -1 : 1,
                        i = Math.floor(Math.abs(n) / (Math.PI / 12)) * (Math.PI / 12);
                    return n = o * (i + (Math.abs(n) - i < Math.PI / 24 ? 0 : Math.PI / 12))
                }, rnd.Editor.EditorTool.prototype._calcNewAtomPos = function(e, t) {
                    var r = new Vec2(1, 0).rotate(this._calcAngle(e, t));
                    return r.add_(e), r
                }, rnd.Editor.EditorTool.HoverHelper = function(e) {
                    this.editorTool = e
                }, rnd.Editor.EditorTool.HoverHelper.prototype.hover = function(e) {
                    e && "Canvas" == e.type && (e = null), "ci" in this && (!e || this.ci.type != e.type || this.ci.id != e.id) && (this.editorTool.editor.render.highlightObject(this.ci, !1), delete this.ci), e && this.editorTool.editor.render.highlightObject(e, !0) && (this.ci = e)
                }, rnd.Editor.LassoTool = function(e, t, r) {
                    this.editor = e, this._hoverHelper = new rnd.Editor.EditorTool.HoverHelper(this), this._lassoHelper = new rnd.Editor.LassoTool.LassoHelper(t || 0, e, r), this._sGroupHelper = new rnd.Editor.SGroupTool.SGroupHelper(e)
                }, rnd.Editor.LassoTool.prototype = new rnd.Editor.EditorTool, rnd.Editor.LassoTool.prototype.OnMouseDown = function(e) {
                    var t = this.editor.render,
                        r = t.ctab,
                        n = r.molecule;
                    this._hoverHelper.hover(null);
                    var o = this._lassoHelper.fragment || e.ctrlKey,
                        i = this.editor.render.findItem(e, o ? ["frags", "sgroups", "sgroupData", "rgroups", "rxnArrows", "rxnPluses", "chiralFlags"] : ["atoms", "bonds", "sgroups", "sgroupData", "rgroups", "rxnArrows", "rxnPluses", "chiralFlags"]);
                    if (i && "Canvas" != i.type) {
                        if (this._hoverHelper.hover(null), "onShowLoupe" in this.editor.render && this.editor.render.onShowLoupe(!0), !this.editor._selectionHelper.isSelected(i))
                            if ("frags" == i.map) {
                                var s = r.frags.get(i.id);
                                this.editor._selectionHelper.setSelection({
                                    atoms: s.fragGetAtoms(t, i.id),
                                    bonds: s.fragGetBonds(t, i.id)
                                }, e.shiftKey)
                            } else if ("sgroups" == i.map) {
                            var a = r.sgroups.get(i.id).item;
                            this.editor._selectionHelper.setSelection({
                                atoms: chem.SGroup.getAtoms(n, a),
                                bonds: chem.SGroup.getBonds(n, a)
                            }, e.shiftKey)
                        } else if ("rgroups" == i.map) {
                            var l = r.rgroups.get(i.id);
                            this.editor._selectionHelper.setSelection({
                                atoms: l.getAtoms(t),
                                bonds: l.getBonds(t)
                            }, e.shiftKey)
                        } else this.editor._selectionHelper.setSelection(i, e.shiftKey);
                        if (this.dragCtx = {
                                item: i,
                                xy0: ui.page2obj(e)
                            }, "atoms" == i.map && !ui.is_touch) {
                            var c = this;
                            this.dragCtx.timeout = setTimeout(function() {
                                delete c.dragCtx, c.editor._selectionHelper.setSelection(null), ui.showLabelEditor(i.id)
                            }, 750), this.dragCtx.stopTapping = function() {
                                "timeout" in c.dragCtx && (clearTimeout(c.dragCtx.timeout), delete c.dragCtx.timeout)
                            }
                        }
                    } else this._lassoHelper.fragment || this._lassoHelper.begin(e);
                    return !0
                }, rnd.Editor.LassoTool.prototype.OnMouseMove = function(e) {
                    if ("dragCtx" in this) {
                        if ("stopTapping" in this.dragCtx && this.dragCtx.stopTapping(), this.dragCtx.action && (this.dragCtx.action.perform(), this.editor.render.update()), this.dragCtx.action = Action.fromMultipleMove(this.editor.getSelection(!0), ui.page2obj(e).sub(this.dragCtx.xy0)), ["atoms"].indexOf(this.dragCtx.item.map) >= 0) {
                            var t = this.editor.render.findItem(e, [this.dragCtx.item.map], this.dragCtx.item);
                            this._hoverHelper.hover(t.map == this.dragCtx.item.map ? t : null)
                        }
                        this.editor.render.update()
                    } else this._lassoHelper.running() ? this.editor._selectionHelper.setSelection(this._lassoHelper.addPoint(e), e.shiftKey) : this._hoverHelper.hover(this.editor.render.findItem(e, this._lassoHelper.fragment || e.ctrlKey ? ["frags", "sgroups", "sgroupData", "rgroups", "rxnArrows", "rxnPluses", "chiralFlags"] : ["atoms", "bonds", "sgroups", "sgroupData", "rgroups", "rxnArrows", "rxnPluses", "chiralFlags"]));
                    return !0
                }, rnd.Editor.LassoTool.prototype.OnMouseUp = function(e) {
                    if ("dragCtx" in this) {
                        if ("stopTapping" in this.dragCtx && this.dragCtx.stopTapping(), ["atoms"].indexOf(this.dragCtx.item.map) >= 0) {
                            var t = this.editor.render.findItem(e, [this.dragCtx.item.map], this.dragCtx.item);
                            t.map == this.dragCtx.item.map && (this._hoverHelper.hover(null), this.editor._selectionHelper.setSelection(), this.dragCtx.action = this.dragCtx.action ? Action.fromAtomMerge(this.dragCtx.item.id, t.id).mergeWith(this.dragCtx.action) : Action.fromAtomMerge(this.dragCtx.item.id, t.id))
                        }
                        ui.addUndoAction(this.dragCtx.action, !0), this.editor.render.update(), delete this.dragCtx
                    } else this._lassoHelper.running() ? this.editor._selectionHelper.setSelection(this._lassoHelper.end(), e.shiftKey) : this._lassoHelper.fragment && this.editor._selectionHelper.setSelection();
                    return !0
                }, rnd.Editor.LassoTool.prototype.OnDblClick = function(e) {
                    var t = this.editor.render.findItem(e);
                    if ("atoms" == t.map) {
                        this.editor._selectionHelper.setSelection(t);
                        var r = ui.ctab.atoms.get(t.id);
                        "R#" == r.label ? rnd.Editor.RGroupAtomTool.prototype.OnMouseUp.call(this, e) : "L#" == r.label ? ui.showElemTable({
                            selection: r,
                            onOk: function(e) {
                                return r.label == e.label && r.atomList.equals(e.atomList) || (ui.addUndoAction(Action.fromAtomsAttrs(t.id, e)), ui.render.update()), !0
                            }.bind(this)
                        }) : (element.getElementByLabel(r.label) || 121) < 120 ? ui.showAtomProperties(t.id) : ui.showReaGenericsTable({
                            values: [r.label],
                            onOk: function(e) {
                                var n = e.values[0];
                                return r.label != n && (ui.addUndoAction(Action.fromAtomsAttrs(t.id, {
                                    label: n
                                })), ui.render.update()), !0
                            }.bind(this)
                        })
                    } else "bonds" == t.map ? (this.editor._selectionHelper.setSelection(t), ui.showBondProperties(t.id)) : "sgroups" == t.map && (this.editor._selectionHelper.setSelection(t), this._sGroupHelper.showPropertiesDialog(t.id));
                    return !0
                }, rnd.Editor.LassoTool.prototype.OnCancel = function() {
                    "dragCtx" in this ? ("stopTapping" in this.dragCtx && this.dragCtx.stopTapping(), ui.addUndoAction(this.dragCtx.action, !0), this.editor.render.update(), delete this.dragCtx) : this._lassoHelper.running() && this.editor._selectionHelper.setSelection(this._lassoHelper.end()), this._hoverHelper.hover(null)
                }, rnd.Editor.LassoTool.LassoHelper = function(e, t, r) {
                    this.mode = e, this.fragment = r, this.editor = t
                }, rnd.Editor.LassoTool.LassoHelper.prototype.getSelection = function() {
                    if (0 == this.mode) return ui.render.getElementsInPolygon(this.points);
                    if (1 == this.mode) return ui.render.getElementsInRectangle(this.points[0], this.points[1]);
                    throw new Error("Selector mode unknown")
                }, rnd.Editor.LassoTool.LassoHelper.prototype.begin = function(e) {
                    this.points = [ui.page2obj(e)], 1 == this.mode && this.points.push(this.points[0])
                }, rnd.Editor.LassoTool.LassoHelper.prototype.running = function() {
                    return "points" in this
                }, rnd.Editor.LassoTool.LassoHelper.prototype.addPoint = function(e) {
                    return this.running() ? (0 == this.mode ? (this.points.push(ui.page2obj(e)), this.editor.render.drawSelectionPolygon(this.points)) : 1 == this.mode && (this.points = [this.points[0], ui.page2obj(e)], this.editor.render.drawSelectionRectangle(this.points[0], this.points[1])), this.getSelection()) : !1
                }, rnd.Editor.LassoTool.LassoHelper.prototype.end = function() {
                    var e = this.getSelection();
                    return "points" in this && (this.editor.render.drawSelectionPolygon(null), delete this.points), e
                }, rnd.Editor.EraserTool = function(e, t) {
                    this.editor = e, this.maps = ["atoms", "bonds", "rxnArrows", "rxnPluses", "sgroups", "sgroupData", "chiralFlags"], this._hoverHelper = new rnd.Editor.EditorTool.HoverHelper(this), this._lassoHelper = new rnd.Editor.LassoTool.LassoHelper(t || 0, e)
                }, rnd.Editor.EraserTool.prototype = new rnd.Editor.EditorTool, rnd.Editor.EraserTool.prototype.OnMouseDown = function(e) {
                    var t = this.editor.render.findItem(e, this.maps);
                    t && "Canvas" != t.type || this._lassoHelper.begin(e)
                }, rnd.Editor.EraserTool.prototype.OnMouseMove = function(e) {
                    this._lassoHelper.running() ? this.editor._selectionHelper.setSelection(this._lassoHelper.addPoint(e)) : this._hoverHelper.hover(this.editor.render.findItem(e, this.maps))
                }, rnd.Editor.EraserTool.prototype.OnMouseUp = function(e) {
                    var event = new CustomEvent("rubberUsed", { "detail": "The undo button was pressed" });
                    document.dispatchEvent(event);
                    if (this._lassoHelper.running()) ui.addUndoAction(Action.fromFragmentDeletion(this._lassoHelper.end(e))), this.editor.deselectAll(), ui.render.update();
                    else {
                        var t = this.editor.render.findItem(e, this.maps);
                        if (t && "Canvas" != t.type) {
                            if (this._hoverHelper.hover(null), "atoms" == t.map) ui.addUndoAction(Action.fromAtomDeletion(t.id));
                            else if ("bonds" == t.map) ui.addUndoAction(Action.fromBondDeletion(t.id));
                            else if ("sgroups" == t.map || "sgroupData" == t.map) ui.addUndoAction(Action.fromSgroupDeletion(t.id));
                            else if ("rxnArrows" == t.map) ui.addUndoAction(Action.fromArrowDeletion(t.id));
                            else if ("rxnPluses" == t.map) ui.addUndoAction(Action.fromPlusDeletion(t.id));
                            else {
                                if ("chiralFlags" != t.map) return console.log("EraserTool: unable to delete the object " + t.map + "[" + t.id + "]"), void 0;
                                ui.addUndoAction(Action.fromChiralFlagDeletion())
                            }
                            this.editor.deselectAll(), ui.render.update()
                        }
                    }
                }, rnd.Editor.AtomTool = function(e, t) {
                    this.editor = e, this.atomProps = t, this.bondProps = {
                        type: 1,
                        stereo: chem.Struct.BOND.STEREO.NONE
                    }, this._hoverHelper = new rnd.Editor.EditorTool.HoverHelper(this)
                }, rnd.Editor.AtomTool.prototype = new rnd.Editor.EditorTool, rnd.Editor.AtomTool.prototype.OnMouseDown = function(e) {
                    this._hoverHelper.hover(null);
                    var t = this.editor.render.findItem(e, ["atoms"]);
                    t && "Canvas" != t.type ? "atoms" == t.map && (this.dragCtx = {
                        item: t,
                        xy0: ui.page2obj(e)
                    }) : this.dragCtx = {
                        xy0: ui.page2obj(e)
                    }
                }, rnd.Editor.AtomTool.prototype.OnMouseMove = function(e) {
                    var t = this.editor,
                        r = t.render;
                    if ("dragCtx" in this && "item" in this.dragCtx) {
                        var n = this.dragCtx,
                            o = this._calcNewAtomPos(r.atomGetPos(n.item.id), ui.page2obj(e));
                        "action" in n && n.action.perform();
                        var i = Action.fromBondAddition(this.bondProps, n.item.id, Object.clone(this.atomProps), o, o);
                        n.action = i[0], n.aid2 = i[2], r.update()
                    } else this._hoverHelper.hover(r.findItem(e, ["atoms"]))
                }, rnd.Editor.AtomTool.prototype.OnMouseUp = function(e) {
                    if ("dragCtx" in this) {
                        var t = this.dragCtx;
                        ui.addUndoAction("action" in t ? t.action : "item" in t ? Action.fromAtomsAttrs(t.item.id, this.atomProps, !0) : Action.fromAtomAddition(ui.page2obj(e), this.atomProps), !0), this.editor.render.update(), delete this.dragCtx
                    }
                }, rnd.Editor.BondTool = function(e, t) {
                    this.editor = e, this.atomProps = {
                        label: "C"
                    }, this.bondProps = t, this.plainBondTypes = [chem.Struct.BOND.TYPE.SINGLE, chem.Struct.BOND.TYPE.DOUBLE, chem.Struct.BOND.TYPE.TRIPLE], this._hoverHelper = new rnd.Editor.EditorTool.HoverHelper(this)
                }, rnd.Editor.BondTool.prototype = new rnd.Editor.EditorTool, rnd.Editor.BondTool.prototype.OnMouseDown = function(e) {
                    return this._hoverHelper.hover(null), this.dragCtx = {
                        xy0: ui.page2obj(e),
                        item: this.editor.render.findItem(e, ["atoms", "bonds"])
                    }, this.dragCtx.item && "Canvas" != this.dragCtx.item.type || delete this.dragCtx.item, !0
                }, rnd.Editor.BondTool.prototype.OnMouseMove = function(e) {
                    var t = this.editor,
                        r = t.render;
                    if ("dragCtx" in this) {
                        var n = this.dragCtx;
                        if (!("item" in n) || "atoms" == n.item.map) {
                            "action" in n && n.action.perform();
                            var o, i, s, a;
                            "item" in n && "atoms" == n.item.map ? (o = n.item.id, i = r.findItem(e, ["atoms"], n.item)) : (o = this.atomProps, s = n.xy0, i = r.findItem(e, ["atoms"]));
                            var l = Number.MAX_VALUE;
                            if (i && "atoms" == i.map) i = i.id;
                            else {
                                i = this.atomProps;
                                var c = ui.page2obj(e);
                                l = Vec2.dist(n.xy0, c), s ? a = this._calcNewAtomPos(s, c) : s = this._calcNewAtomPos(r.atomGetPos(o), c)
                            }
                            return l > .3 ? n.action = Action.fromBondAddition(this.bondProps, o, i, s, a)[0] : delete n.action, r.update(), !0
                        }
                    }
                    return this._hoverHelper.hover(r.findItem(e, ["atoms", "bonds"])), !0
                }, rnd.Editor.BondTool.prototype.OnMouseUp = function(e) {
                    if ("dragCtx" in this) {
                        var t = this.dragCtx;
                        if ("action" in t) ui.addUndoAction(t.action);
                        else if ("item" in t) {
                            if ("atoms" == t.item.map) ui.addUndoAction(Action.fromBondAddition(this.bondProps, t.item.id)[0]);
                            else if ("bonds" == t.item.map) {
                                var r = Object.clone(this.bondProps),
                                    n = ui.ctab.bonds.get(t.item.id);
                                if (r.stereo != chem.Struct.BOND.STEREO.NONE && n.type == chem.Struct.BOND.TYPE.SINGLE && r.type == chem.Struct.BOND.TYPE.SINGLE && n.stereo == r.stereo) ui.addUndoAction(Action.fromBondFlipping(t.item.id));
                                else {
                                    if (r.type === chem.Struct.BOND.TYPE.SINGLE && n.stereo === chem.Struct.BOND.STEREO.NONE && r.stereo === chem.Struct.BOND.STEREO.NONE) {
                                        var o = this.plainBondTypes.indexOf(r.type) >= 0 ? this.plainBondTypes : null;
                                        o && (r.type = o[(o.indexOf(n.type) + 1) % o.length])
                                    }
                                    ui.addUndoAction(Action.fromBondAttrs(t.item.id, r, bondFlipRequired(n, r)), !0)
                                }
                            }
                        } else {
                            var i = ui.page2obj(e),
                                s = new Vec2(.5, 0).rotate(this.bondProps.type == chem.Struct.BOND.TYPE.SINGLE ? -Math.PI / 6 : 0),
                                a = Action.fromBondAddition(this.bondProps, {
                                    label: "C"
                                }, {
                                    label: "C"
                                }, {
                                    x: i.x - s.x,
                                    y: i.y - s.y
                                }, {
                                    x: i.x + s.x,
                                    y: i.y + s.y
                                });
                            ui.addUndoAction(a[0])
                        }
                        this.editor.render.update(), delete this.dragCtx
                    }
                    return !0
                }, rnd.Editor.ChainTool = function(e) {
                    this.editor = e, this._hoverHelper = new rnd.Editor.EditorTool.HoverHelper(this)
                }, rnd.Editor.ChainTool.prototype = new rnd.Editor.EditorTool, rnd.Editor.ChainTool.prototype.OnMouseDown = function(e) {
                    return this._hoverHelper.hover(null), this.dragCtx = {
                        xy0: ui.page2obj(e),
                        item: this.editor.render.findItem(e, ["atoms"])
                    }, this.dragCtx.item && "Canvas" != this.dragCtx.item.type || delete this.dragCtx.item, !0
                }, rnd.Editor.ChainTool.prototype.OnMouseMove = function(e) {
                    var t = this.editor,
                        r = t.render;
                    if ("dragCtx" in this) {
                        var n = this.dragCtx;
                        "action" in n && n.action.perform();
                        var o = "item" in n ? r.atomGetPos(n.item.id) : n.xy0,
                            i = ui.page2obj(e);
                        return n.action = Action.fromChain(o, this._calcAngle(o, i), Math.ceil(Vec2.diff(i, o).length()), "item" in n ? n.item.id : null), r.update(), !0
                    }
                    return this._hoverHelper.hover(r.findItem(e, ["atoms"])), !0
                }, rnd.Editor.ChainTool.prototype.OnMouseUp = function() {
                    return "dragCtx" in this && ("action" in this.dragCtx && ui.addUndoAction(this.dragCtx.action), delete this.dragCtx), !0
                }, rnd.Editor.ChainTool.prototype.OnCancel = function() {
                    this.OnMouseUp()
                }, rnd.Editor.TemplateTool = function(e, t) {
                    if (this.editor = e, this.template = t, !this.template.molecule) {
                        var r = chem.Molfile.parseCTFile(this.template.molfile);
                        r.rescale();
                        var n = new Vec2;
                        r.atoms.each(function(e, t) {
                            n.add_(t.pp)
                        }), this.template.molecule = r, this.template.xy0 = n.scaled(1 / r.atoms.count()), this.template.angle0 = this._calcAngle(r.atoms.get(this.template.aid).pp, this.template.xy0);
                        var o = r.bonds.get(this.template.bid);
                        this.template.sign = this._getSign(r, o, this.template.xy0)
                    }
                    this._hoverHelper = new rnd.Editor.EditorTool.HoverHelper(this)
                }, rnd.Editor.TemplateTool.prototype = new rnd.Editor.EditorTool, rnd.Editor.TemplateTool.prototype._getSign = function(e, t, r) {
                    var n = e.atoms.get(t.begin).pp,
                        o = e.atoms.get(t.end).pp,
                        i = Vec2.cross(Vec2.diff(n, o), Vec2.diff(r, o));
                    return i > 0 ? 1 : 0 > i ? -1 : 0
                }, rnd.Editor.TemplateTool.prototype.OnMouseDown = function(e) {
                    var t = this.editor,
                        r = t.render;
                    this._hoverHelper.hover(null), this.dragCtx = {
                        xy0: ui.page2obj(e),
                        item: r.findItem(e, ["atoms", "bonds"])
                    };
                    var n = this.dragCtx,
                        o = n.item;
                    if (o && "Canvas" != o.type) {
                        if ("bonds" == o.map) {
                            var i = r.ctab.molecule,
                                s = new Vec2,
                                a = i.bonds.get(o.id),
                                l = r.atomGetAttr(a.begin, "fragment"),
                                c = i.getFragmentIds(l),
                                d = 0,
                                u = i.halfBonds.get(a.hb1).loop;
                            if (0 > u && (u = i.halfBonds.get(a.hb2).loop), u >= 0) {
                                var h = i.loops.get(u).hbs;
                                h.each(function(e) {
                                    s.add_(i.atoms.get(i.halfBonds.get(e).begin).pp), d++
                                })
                            } else Set.each(c, function(e) {
                                s.add_(i.atoms.get(e).pp), d++
                            });
                            n.v0 = s.scaled(1 / d);
                            var p = this._getSign(i, a, n.v0);
                            n.sign1 = p || 1, n.sign2 = this.template.sign
                        }
                    } else delete n.item;
                    return !0
                }, rnd.Editor.TemplateTool.prototype.OnMouseMove = function(e) {
                    var t = this.editor,
                        r = t.render;
                    if ("dragCtx" in this) {
                        var n, o, i, s = this.dragCtx,
                            a = s.item,
                            l = ui.page2obj(e);
                        if (s.mouse_moved = !0, a && "Canvas" != a.type) {
                            if ("atoms" == a.map) n = r.atomGetPos(a.id), i = Vec2.dist(n, l) > 1;
                            else if ("bonds" == a.map) {
                                var c = r.ctab.molecule,
                                    d = c.bonds.get(a.id),
                                    u = this._getSign(c, d, l);
                                return s.sign1 * this.template.sign > 0 && (u = -u), u == s.sign2 && s.action || ("action" in s && s.action.perform(), s.sign2 = u, s.action = Action.fromTemplateOnBond(a.id, this.template, this._calcAngle, s.sign1 * s.sign2 > 0), r.update()), !0
                            }
                        } else n = s.xy0;
                        o = this._calcAngle(n, l);
                        var h = Math.round(180 / Math.PI * o);
                        if ("angle" in s && s.angle == h) {
                            if (!("extra_bond" in s)) return !0;
                            if (s.extra_bond == i) return !0
                        }
                        return "action" in s && s.action.perform(), s.angle = h, a && "Canvas" != a.type ? "atoms" == a.map && (s.action = Action.fromTemplateOnAtom(a.id, o, i, this.template, this._calcAngle), s.extra_bond = i) : s.action = Action.fromTemplateOnCanvas(n, o, this.template), r.update(), !0
                    }
                    return this._hoverHelper.hover(r.findItem(e, ["atoms", "bonds"])), !0
                }, rnd.Editor.TemplateTool.prototype.OnMouseUp = function() {
                    var e = this.editor,
                        t = e.render;
                    if ("dragCtx" in this) {
                        var r = this.dragCtx,
                            n = r.item;
                        if (!r.action) {
                            if (n && "Canvas" != n.type)
                                if ("atoms" == n.map) {
                                    var o = t.atomGetDegree(n.id);
                                    if (o > 1) r.action = Action.fromTemplateOnAtom(n.id, null, !0, this.template, this._calcAngle);
                                    else if (1 == o) {
                                        var i = t.ctab.molecule,
                                            s = i.halfBonds.get(i.atoms.get(n.id).neighbors[0]).end,
                                            a = i.atoms.get(n.id),
                                            l = i.atoms.get(s);
                                        r.action = Action.fromTemplateOnAtom(n.id, this._calcAngle(l.pp, a.pp), !1, this.template, this._calcAngle)
                                    } else r.action = Action.fromTemplateOnAtom(n.id, 0, !1, this.template, this._calcAngle)
                                } else "bonds" == n.map && (r.action = Action.fromTemplateOnBond(n.id, this.template, this._calcAngle, r.sign1 * r.sign2 > 0));
                            else r.action = Action.fromTemplateOnCanvas(r.xy0, 0, this.template);
                            t.update()
                        }
                        "action" in this.dragCtx && (this.dragCtx.action.isDummy() || ui.addUndoAction(this.dragCtx.action)), delete this.dragCtx
                    }
                }, rnd.Editor.TemplateTool.prototype.OnCancel = function() {
                    this.OnMouseUp()
                }, rnd.Editor.ChargeTool = function(e, t) {
                    this.editor = e, this.charge = t, this._hoverHelper = new rnd.Editor.EditorTool.HoverHelper(this)
                }, rnd.Editor.ChargeTool.prototype = new rnd.Editor.EditorTool, rnd.Editor.ChargeTool.prototype.OnMouseMove = function(e) {
                    var t = this.editor.render.findItem(e, ["atoms"]);
                    return t && "atoms" == t.map && null != element.getElementByLabel(ui.ctab.atoms.get(t.id).label) ? this._hoverHelper.hover(t) : this._hoverHelper.hover(null), !0
                }, rnd.Editor.ChargeTool.prototype.OnMouseUp = function(e) {
                    var t = this.editor,
                        r = t.render,
                        n = r.findItem(e, ["atoms"]);
                    return n && "atoms" == n.map && null != element.getElementByLabel(ui.ctab.atoms.get(n.id).label) && (this._hoverHelper.hover(null), ui.addUndoAction(Action.fromAtomsAttrs(n.id, {
                        charge: r.ctab.molecule.atoms.get(n.id).charge + this.charge
                    })), r.update()), !0
                }, rnd.Editor.RGroupAtomTool = function(e) {
                    this.editor = e, this._hoverHelper = new rnd.Editor.EditorTool.HoverHelper(this)
                }, rnd.Editor.RGroupAtomTool.prototype = new rnd.Editor.EditorTool, rnd.Editor.RGroupAtomTool.prototype.OnMouseMove = function(e) {
                    this._hoverHelper.hover(this.editor.render.findItem(e, ["atoms"]))
                }, rnd.Editor.RGroupAtomTool.prototype.OnMouseUp = function(e) {
                    function t(e) {
                        for (var t = [], r = 0; 32 > r; r++)
                            if (e & 1 << r) {
                                var n = "R" + (r + 1);
                                t.push(n)
                            }
                        return t
                    }

                    function r(e) {
                        var t = 0;
                        return e.values.forEach(function(e) {
                            var r = e.substr(1) - 1;
                            t |= 1 << r
                        }), t
                    }
                    var n = this.editor.render.findItem(e, ["atoms"]);
                    if (!n || "Canvas" == n.type) return this._hoverHelper.hover(null), ui.showRGroupTable({
                        mode: "multiple",
                        onOk: function(e) {
                            e = r(e), e && (ui.addUndoAction(Action.fromAtomAddition(ui.page2obj(this.OnMouseMove0.lastEvent), {
                                label: "R#",
                                rglabel: e
                            }), !0), ui.render.update())
                        }.bind(this)
                    }), !0;
                    if (n && "atoms" == n.map) {
                        this._hoverHelper.hover(null);
                        var o = this.editor.render.ctab.molecule.atoms.get(n.id),
                            i = o.label,
                            s = o.rglabel;
                        return ui.showRGroupTable({
                            mode: "multiple",
                            values: t(s),
                            onOk: function(e) {
                                if (e = r(e), s != e || "R#" != i) {
                                    var t = Object.clone(chem.Struct.Atom.attrlist);
                                    e ? (t.label = "R#", t.rglabel = e, t.aam = o.aam) : (t.label = "C", t.aam = o.aam), ui.addUndoAction(Action.fromAtomsAttrs(n.id, t), !0), ui.render.update()
                                }
                            }.bind(this)
                        }), !0
                    }
                }, rnd.Editor.RGroupFragmentTool = function(e) {
                    this.editor = e, this._hoverHelper = new rnd.Editor.EditorTool.HoverHelper(this)
                }, rnd.Editor.RGroupFragmentTool.prototype = new rnd.Editor.EditorTool, rnd.Editor.RGroupFragmentTool.prototype.OnMouseMove = function(e) {
                    this._hoverHelper.hover(this.editor.render.findItem(e, ["frags", "rgroups"]))
                }, rnd.Editor.RGroupFragmentTool.prototype.OnMouseUp = function(e) {
                    var t = this.editor.render.findItem(e, ["frags", "rgroups"]);
                    if (t && "frags" == t.map) {
                        this._hoverHelper.hover(null);
                        var r = chem.Struct.RGroup.findRGroupByFragment(this.editor.render.ctab.molecule.rgroups, t.id);
                        return ui.showRGroupTable({
                            values: r && ["R" + r],
                            onOk: function(e) {
                                console.assert(e.values.length <= 1, "Too much elements"), e = e.values.length ? e.values[0].substr(1) - 0 : 0, r != e && (ui.addUndoAction(Action.fromRGroupFragment(e, t.id), !0), ui.render.update())
                            }.bind(this)
                        }), !0
                    }
                    if (t && "rgroups" == t.map) {
                        this._hoverHelper.hover(null);
                        var n = this.editor.render.ctab.molecule.rgroups.get(t.id),
                            o = 0;
                        this.editor.render.ctab.molecule.rgroups.each(function(e) {
                            o |= 1 << e - 1
                        });
                        var i = {
                            occurrence: n.range,
                            resth: n.resth,
                            ifthen: n.ifthen
                        };
                        return ui.showRLogicTable({
                            rgid: t.id,
                            rlogic: i,
                            rgmask: o,
                            onOk: function(e) {
                                var r = {};
                                if (i.occurrence != e.occurrence) {
                                    var n = e.occurrence.split(",").all(function(e) {
                                        return e.match(/^[>,<,=]?[0-9]+$/g) || e.match(/^[0-9]+\-[0-9]+$/g)
                                    });
                                    if (!n) return alert("Bad occurrence value"), !1;
                                    r.range = e.occurrence
                                }
                                return i.resth != e.resth && (r.resth = e.resth), i.ifthen != e.ifthen && (r.ifthen = e.ifthen), ("range" in r || "resth" in r || "ifthen" in r) && (ui.addUndoAction(Action.fromRGroupAttrs(t.id, r)), this.editor.render.update()), !0
                            }.bind(this)
                        }), !0
                    }
                }, rnd.Editor.APointTool = function(e) {
                    this.editor = e, this._hoverHelper = new rnd.Editor.EditorTool.HoverHelper(this)
                }, rnd.Editor.APointTool.prototype = new rnd.Editor.EditorTool, rnd.Editor.APointTool.prototype.OnMouseMove = function(e) {
                    this._hoverHelper.hover(this.editor.render.findItem(e, ["atoms"]))
                }, rnd.Editor.APointTool.prototype.OnMouseUp = function(e) {
                    var t = this.editor.render.findItem(e, ["atoms"]);
                    if (t && "atoms" == t.map) {
                        this._hoverHelper.hover(null);
                        var r = this.editor.render.ctab.molecule.atoms.get(t.id).attpnt;
                        return ui.showAtomAttachmentPoints({
                            selection: r,
                            onOk: function(e) {
                                r != e && (ui.addUndoAction(Action.fromAtomsAttrs(t.id, {
                                    attpnt: e
                                }), !0), ui.render.update())
                            }.bind(this)
                        }), !0
                    }
                }, rnd.Editor.ReactionArrowTool = function(e) {
                    this.editor = e, this._hoverHelper = new rnd.Editor.EditorTool.HoverHelper(this)
                }, rnd.Editor.ReactionArrowTool.prototype = new rnd.Editor.EditorTool, rnd.Editor.ReactionArrowTool.prototype.OnMouseDown = function(e) {
                    var t = this.editor.render.findItem(e, ["rxnArrows"]);
                    t && "rxnArrows" == t.map && (this._hoverHelper.hover(null), this.editor._selectionHelper.setSelection(t), this.dragCtx = {
                        xy0: ui.page2obj(e)
                    })
                }, rnd.Editor.ReactionArrowTool.prototype.OnMouseMove = function(e) {
                    "dragCtx" in this ? (this.dragCtx.action && this.dragCtx.action.perform(), this.dragCtx.action = Action.fromMultipleMove(this.editor._selectionHelper.selection, ui.page2obj(e).sub(this.dragCtx.xy0)), ui.render.update()) : this._hoverHelper.hover(this.editor.render.findItem(e, ["rxnArrows"]))
                }, rnd.Editor.ReactionArrowTool.prototype.OnMouseUp = function(e) {
                    "dragCtx" in this ? (ui.addUndoAction(this.dragCtx.action, !1), this.editor.render.update(), delete this.dragCtx) : this.editor.render.ctab.molecule.rxnArrows.count() < 1 && (ui.addUndoAction(Action.fromArrowAddition(ui.page2obj(e))), this.editor.render.update())
                }, rnd.Editor.ReactionPlusTool = function(e) {
                    this.editor = e, this._hoverHelper = new rnd.Editor.EditorTool.HoverHelper(this)
                }, rnd.Editor.ReactionPlusTool.prototype = new rnd.Editor.EditorTool, rnd.Editor.ReactionPlusTool.prototype.OnMouseDown = function(e) {
                    var t = this.editor.render.findItem(e, ["rxnPluses"]);
                    t && "rxnPluses" == t.map && (this._hoverHelper.hover(null), this.editor._selectionHelper.setSelection(t), this.dragCtx = {
                        xy0: ui.page2obj(e)
                    })
                }, rnd.Editor.ReactionPlusTool.prototype.OnMouseMove = function(e) {
                    "dragCtx" in this ? (this.dragCtx.action && this.dragCtx.action.perform(), this.dragCtx.action = Action.fromMultipleMove(this.editor._selectionHelper.selection, ui.page2obj(e).sub(this.dragCtx.xy0)), ui.render.update()) : this._hoverHelper.hover(this.editor.render.findItem(e, ["rxnPluses"]))
                }, rnd.Editor.ReactionPlusTool.prototype.OnMouseUp = function(e) {
                    "dragCtx" in this ? (ui.addUndoAction(this.dragCtx.action, !1), this.editor.render.update(), delete this.dragCtx) : (ui.addUndoAction(Action.fromPlusAddition(ui.page2obj(e))), this.editor.render.update())
                }, rnd.Editor.ReactionMapTool = function(e) {
                    this.editor = e, this._hoverHelper = new rnd.Editor.EditorTool.HoverHelper(this), this.editor._selectionHelper.setSelection(null), this.rcs = chem.MolfileSaver.getComponents(this.editor.render.ctab.molecule)
                }, rnd.Editor.ReactionMapTool.prototype = new rnd.Editor.EditorTool, rnd.Editor.ReactionMapTool.prototype.OnMouseDown = function(e) {
                    var t = this.editor.render.findItem(e, ["atoms"]);
                    t && "atoms" == t.map && (this._hoverHelper.hover(null), this.dragCtx = {
                        item: t,
                        xy0: ui.page2obj(e)
                    })
                }, rnd.Editor.ReactionMapTool.prototype.OnMouseMove = function(e) {
                    var t = this.editor.render;
                    if ("dragCtx" in this) {
                        var r = t.findItem(e, ["atoms"], this.dragCtx.item);
                        r && "atoms" == r.map && this._isValidMap(this.dragCtx.item.id, r.id) ? (this._hoverHelper.hover(r), t.drawSelectionLine(t.atomGetPos(this.dragCtx.item.id), t.atomGetPos(r.id))) : (this._hoverHelper.hover(null), t.drawSelectionLine(t.atomGetPos(this.dragCtx.item.id), ui.page2obj(e)))
                    } else this._hoverHelper.hover(t.findItem(e, ["atoms"]))
                }, rnd.Editor.ReactionMapTool.prototype.OnMouseUp = function(e) {
                    if ("dragCtx" in this) {
                        var t = this.editor.render,
                            r = t.findItem(e, ["atoms"], this.dragCtx.item);
                        if (r && "atoms" == r.map && this._isValidMap(this.dragCtx.item.id, r.id)) {
                            var n = new Action,
                                o = t.ctab.molecule.atoms,
                                i = o.get(this.dragCtx.item.id),
                                s = o.get(r.id),
                                a = i.aam,
                                l = s.aam;
                            if (!a || a != l) {
                                if ((a && a != l || !a && l) && o.each(function(e, t) {
                                        e != this.dragCtx.item.id && (a && t.aam == a || l && t.aam == l) && n.mergeWith(Action.fromAtomsAttrs(e, {
                                            aam: 0
                                        }))
                                    }, this), a) n.mergeWith(Action.fromAtomsAttrs(r.id, {
                                    aam: a
                                }));
                                else {
                                    var c = 0;
                                    o.each(function(e, t) {
                                        c = Math.max(c, t.aam || 0)
                                    }), n.mergeWith(Action.fromAtomsAttrs(this.dragCtx.item.id, {
                                        aam: c + 1
                                    })), n.mergeWith(Action.fromAtomsAttrs(r.id, {
                                        aam: c + 1
                                    }))
                                }
                                ui.addUndoAction(n, !0), t.update()
                            }
                        }
                        t.drawSelectionLine(null), delete this.dragCtx
                    }
                    this._hoverHelper.hover(null)
                }, rnd.Editor.ReactionMapTool.prototype._isValidMap = function(e, t) {
                    for (var r, n, o = 0;
                        (!r || !n) && o < this.rcs.reactants.length; o++) {
                        var i = Set.list(this.rcs.reactants[o]);
                        !r && i.indexOf(e) >= 0 && (r = "r"), !n && i.indexOf(t) >= 0 && (n = "r")
                    }
                    for (var s = 0;
                        (!r || !n) && s < this.rcs.products.length; s++) {
                        var a = Set.list(this.rcs.products[s]);
                        !r && a.indexOf(e) >= 0 && (r = "p"), !n && a.indexOf(t) >= 0 && (n = "p")
                    }
                    return r && n && r != n
                }, rnd.Editor.ReactionUnmapTool = function(e) {
                    this.editor = e, this._hoverHelper = new rnd.Editor.EditorTool.HoverHelper(this), this.editor._selectionHelper.setSelection(null)
                }, rnd.Editor.ReactionUnmapTool.prototype = new rnd.Editor.EditorTool, rnd.Editor.ReactionUnmapTool.prototype.OnMouseMove = function(e) {
                    var t = this.editor.render.findItem(e, ["atoms"]);
                    t && "atoms" == t.map ? this._hoverHelper.hover(this.editor.render.ctab.molecule.atoms.get(t.id).aam ? t : null) : this._hoverHelper.hover(null)
                }, rnd.Editor.ReactionUnmapTool.prototype.OnMouseUp = function(e) {
                    var t = this.editor.render.findItem(e, ["atoms"]),
                        r = this.editor.render.ctab.molecule.atoms;
                    if (t && "atoms" == t.map && r.get(t.id).aam) {
                        var n = new Action,
                            o = r.get(t.id).aam;
                        r.each(function(e, t) {
                            t.aam == o && n.mergeWith(Action.fromAtomsAttrs(e, {
                                aam: 0
                            }))
                        }, this), ui.addUndoAction(n, !0), this.editor.render.update()
                    }
                    this._hoverHelper.hover(null)
                }, rnd.Editor.SGroupTool = function(e) {
                    this.editor = e, this.maps = ["atoms", "bonds", "sgroups", "sgroupData"], this._hoverHelper = new rnd.Editor.EditorTool.HoverHelper(this), this._lassoHelper = new rnd.Editor.LassoTool.LassoHelper(1, e), this._sGroupHelper = new rnd.Editor.SGroupTool.SGroupHelper(e);
                    var t = this.editor.getSelection();
                    t.atoms && t.atoms.length > 0 ? this._sGroupHelper.showPropertiesDialog(null, t) : this.editor.deselectAll()
                }, rnd.Editor.SGroupTool.prototype = new rnd.Editor.EditorTool, rnd.Editor.SGroupTool.prototype.OnMouseDown = function(e) {
                    var t = this.editor.render.findItem(e, this.maps);
                    t && "Canvas" != t.type || this._lassoHelper.begin(e)
                }, rnd.Editor.SGroupTool.prototype.OnMouseMove = function(e) {
                    this._lassoHelper.running() ? this.editor._selectionHelper.setSelection(this._lassoHelper.addPoint(e)) : this._hoverHelper.hover(this.editor.render.findItem(e, this.maps))
                }, rnd.Editor.SGroupTool.SGroupHelper = function(e) {
                    this.editor = e, this.selection = null
                }, rnd.Editor.SGroupTool.SGroupHelper.prototype.showPropertiesDialog = function(e, t) {
                    this.selection = t;
                    var r = this.editor.render;
                    if (null == e) {
                        var n = {},
                            o = {};
                        if (t.atoms.each(function(e) {
                                o[e] = !0
                            }, this), !Object.isUndefined(t.atoms.detect(function(e) {
                                var i = r.atomGetSGroups(e);
                                return !Object.isUndefined(i.detect(function(e) {
                                    if (e in n) return !1;
                                    var i = r.sGroupGetAtoms(e);
                                    if (i.length < t.atoms.length) {
                                        if (!Object.isUndefined(i.detect(function(e) {
                                                return !(e in o)
                                            }, this))) return !0
                                    } else if (!Object.isUndefined(t.atoms.detect(function(e) {
                                            return -1 == i.indexOf(e)
                                        }, this))) return !0;
                                    return !1
                                }, this))
                            }, this))) return alert("Partial S-group overlapping is not allowed."), void 0
                    }
                    ui.showSGroupProperties({
                        type: null !== e ? ui.render.sGroupGetType(e) : null,
                        attrs: null !== e ? ui.render.sGroupGetAttrs(e) : {},
                        onCancel: function() {
                            this.editor.deselectAll()
                        }.bind(this),
                        onOk: function(t) {
                            null == e ? (e = ui.render.ctab.molecule.sgroups.newId(), ui.addUndoAction(Action.fromSgroupAddition(t.type, this.selection.atoms, t.attrs, e), !0)) : ui.addUndoAction(Action.fromSgroupType(e, t.type).mergeWith(Action.fromSgroupAttrs(e, t.attrs)), !0), this.editor.deselectAll(), this.editor.render.update()
                        }.bind(this)
                    })
                }, rnd.Editor.SGroupTool.prototype.OnMouseUp = function(e) {
                    var t = null,
                        r = null;
                    if (this._lassoHelper.running()) r = this._lassoHelper.end(e);
                    else {
                        var n = this.editor.render.findItem(e, this.maps);
                        if (!n || "Canvas" == n.type) return;
                        if (this._hoverHelper.hover(null), "atoms" == n.map) r = {
                            atoms: [n.id]
                        };
                        else if ("bonds" == n.map) {
                            var o = this.editor.render.ctab.bonds.get(n.id);
                            r = {
                                atoms: [o.b.begin, o.b.end]
                            }
                        } else {
                            if ("sgroups" != n.map) return;
                            t = n.id
                        }
                    }(null != t || r && r.atoms && r.atoms.length > 0) && this._sGroupHelper.showPropertiesDialog(t, r)
                }, rnd.Editor.PasteTool = function(e, t) {
                    this.editor = e, this.struct = t, this.action = Action.fromPaste(this.struct, "lastEvent" in this.OnMouseMove0 ? ui.page2obj(this.OnMouseMove0.lastEvent) : void 0), this.editor.render.update()
                }, rnd.Editor.PasteTool.prototype = new rnd.Editor.EditorTool, rnd.Editor.PasteTool.prototype.OnMouseMove = function(e) {
                    "action" in this && this.action.perform(this.editor), this.action = Action.fromPaste(this.struct, ui.page2obj(e)), this.editor.render.update()
                }, rnd.Editor.PasteTool.prototype.OnMouseUp = function() {
                    ui.addUndoAction(this.action), delete this.action, ui.selectAction(null)
                }, rnd.Editor.PasteTool.prototype.OnCancel = function() {
                    "action" in this && (this.action.perform(this.editor), delete this.action)
                }, rnd.Editor.RotateTool = function(e) {
                    this.editor = e, this._lassoHelper = new rnd.Editor.LassoTool.LassoHelper(1, e);
                    var t = this.editor._selectionHelper.selection;
                    t.atoms && t.atoms.length || this.editor._selectionHelper.setSelection(null)
                }, rnd.Editor.RotateTool.prototype = new rnd.Editor.EditorTool, rnd.Editor.RotateTool.prototype.OnMouseDown = function(e) {
                    var t = this.editor._selectionHelper.selection;
                    if (t.atoms && t.atoms.length) {
                        var r = this.editor.render.ctab.molecule,
                            n = new Vec2;
                        if (!t.atoms || !t.atoms.length) return !0;
                        var o = null,
                            i = !1;
                        t.atoms.each(function(e) {
                            var s = r.atoms.get(e);
                            n.add_(s.pp), i || s.neighbors.find(function(n) {
                                var s = r.halfBonds.get(n);
                                if (-1 == t.atoms.indexOf(s.end)) {
                                    if (s.loop >= 0) {
                                        var a = r.atoms.get(e);
                                        if (!Object.isUndefined(a.neighbors.find(function(e) {
                                                var n = r.halfBonds.get(e);
                                                return n.loop >= 0 && -1 != t.atoms.indexOf(n.end)
                                            }))) return i = !0, !0
                                    }
                                    if (null == o) o = e;
                                    else if (o != e) return i = !0, !0
                                }
                                return !1
                            })
                        }), n = i || null == o ? n.scaled(1 / t.atoms.length) : r.atoms.get(o).pp, this.dragCtx = {
                            xy0: n,
                            angle1: this._calcAngle(n, ui.page2obj(e)),
                            all: i
                        }
                    } else this._lassoHelper.begin(e);
                    return !0
                }, rnd.Editor.RotateTool.prototype.OnMouseMove = function(e) {
                    if (this._lassoHelper.running()) this.editor._selectionHelper.setSelection(this._lassoHelper.addPoint(e));
                    else if ("dragCtx" in this) {
                        var t = this.editor,
                            r = t.render,
                            n = this.dragCtx,
                            o = ui.page2obj(e),
                            i = this._calcAngle(n.xy0, o) - n.angle1,
                            s = Math.round(180 * (i / Math.PI));
                        if (s > 180 ? s -= 360 : -180 >= s && (s += 360), "angle" in n && n.angle == s) return !0;
                        "action" in n && n.action.perform(), n.angle = s, n.action = Action.fromRotate(n.all ? r.ctab.molecule : this.editor.getSelection(), n.xy0, i), $("toolText").update(s + "º"), r.update()
                    }
                    return !0
                }, rnd.Editor.RotateTool.prototype.OnMouseUp = function(e) {
                    var t = null;
                    return this._lassoHelper.running() ? t = this._lassoHelper.end(e) : "dragCtx" in this && ("action" in this.dragCtx ? (ui.addUndoAction(this.dragCtx.action, !0), $("toolText").update("")) : this.editor._selectionHelper.setSelection(), delete this.dragCtx), !0
                }, rnd.Editor.RotateTool.prototype.OnCancel = function() {
                    "dragCtx" in this && ("action" in this.dragCtx && (ui.addUndoAction(this.dragCtx.action, !0), $("toolText").update("")), delete this.dragCtx)
                };

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../chem": 11,
            "../chem/element": 10,
            "../ui": 34,
            "../ui/action": 26,
            "../util": 39,
            "../util/set": 42,
            "../util/vec2": 43,
            "./restruct": 23
        }],
        21: [function(require, module, exports) {
            (function(global) {
                require("./visel"), require("./restruct"), require("./editor"), require("./render"), require("./restruct_rendering"), global.rnd = global.rnd || {};

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "./editor": 20,
            "./render": 22,
            "./restruct": 23,
            "./restruct_rendering": 24,
            "./visel": 25
        }],
        22: [function(require, module, exports) {
            (function(global) {
                var Raphael = require("../raphael-ext.js"),
                    Box2Abs = require("../util/box2abs"),
                    Set = require("../util/set"),
                    Vec2 = require("../util/vec2"),
                    util = require("../util");
                require("./restruct"), require("../ui"), require("../chem"), require("./restruct_rendering");
                var rnd = global.rnd = global.rnd || {},
                    chem = global.chem = global.chem || {},
                    ui = global.ui,
                    tfx = util.tfx;
                rnd.DEBUG = !1, rnd.logcnt = 0, rnd.logmouse = !1, rnd.hl = !1;
                var EventMap = {
                    mousemove: "mousemove",
                    mousedown: "mousedown",
                    mouseup: "mouseup"
                };
                rnd.logMethod = function() {}, rnd.RenderDummy = function(e) {
                    this.clientArea = e = $(e), e.innerHTML = "", this.paper = new Raphael(e), this.paper.rect(0, 0, 100, 100).attr({
                        fill: "#0F0",
                        stroke: "none"
                    }), this.setMolecule = function() {}, this.update = function() {}
                }, rnd.RenderOptions = function(e) {
                    e = e || {}, this.showSelectionRegions = e.showSelectionRegions || !1, this.showAtomIds = e.showAtomIds || !1, this.showBondIds = e.showBondIds || !1, this.showHalfBondIds = e.showHalfBondIds || !1, this.showLoopIds = e.showLoopIds || !1, this.hideChiralFlag = e.hideChiralFlag || !1, this.showValenceWarnings = Object.isUndefined(e.showValenceWarnings) ? !0 : e.showValenceWarnings, this.autoScale = e.autoScale || !1, this.autoScaleMargin = e.autoScaleMargin || 0, this.maxBondLength = e.maxBondLength || 0, this.atomColoring = e.atomColoring || 0, this.hideImplicitHydrogen = e.hideImplicitHydrogen || !1, this.hideTerminalLabels = e.hideTerminalLabels || !1, this.ignoreMouseEvents = e.ignoreMouseEvents || !1, this.selectionDistanceCoefficient = (e.selectionDistanceCoefficient || .4) - 0
                }, rnd.Render = function(e, t, r, n) {
                    this.opt = new rnd.RenderOptions(r), this.useOldZoom = Prototype.Browser.IE, this.scale = t || 100, this.baseScale = this.scale, this.offset = new Vec2, this.clientArea = e = $(e), e.innerHTML = "", this.paper = new Raphael(e), this.size = new Vec2, this.viewSz = n || new Vec2(e.clientWidth || 100, e.clientHeight || 100), this.bb = new Box2Abs(new Vec2, this.viewSz), this.dirty = !0, this.selectionRect = null, this.rxnArrow = null, this.rxnMode = !1, this.zoom = 1, this.structChangeHandlers = [];
                    var o = this,
                        i = 0,
                        s = 0,
                        a = e;
                    do i += a.offsetTop || 0, s += a.offsetLeft || 0, a = a.offsetParent; while (a);
                    this.clientAreaPos = new Vec2(s, i);
                    var l = this;
                    l.longTapFlag = !1, l.longTapTimeout = null, l.longTapTouchstart = null, l.setLongTapTimeout = function(e) {
                        l.longTapFlag = !1, l.longTapTouchstart = e, l.longTapTimeout = setTimeout(function() {
                            l.longTapFlag = !0, l.longTapTimeout = null
                        }, 500)
                    }, l.resetLongTapTimeout = function(e) {
                        clearTimeout(l.longTapTimeout), l.longTapTimeout = null, e && (l.longTapTouchstart = null, l.longTapFlag = !1)
                    }, "hiddenPaths" in rnd.ReStruct.prototype && e.observe("touchend", function(e) {
                        if (0 == e.touches.length)
                            for (; rnd.ReStruct.prototype.hiddenPaths.length > 0;) rnd.ReStruct.prototype.hiddenPaths.pop().remove()
                    }), this.opt.ignoreMouseEvents || (e.observe("selectstart", function(e) {
                        return util.stopEventPropagation(e), util.preventDefault(e)
                    }), e.observe("touchstart", function(e) {
                        l.resetLongTapTimeout(!0), 2 == e.touches.length ? (this._tui = this._tui || {}, this._tui.center = {
                            pageX: (e.touches[0].pageX + e.touches[1].pageX) / 2,
                            pageY: (e.touches[0].pageY + e.touches[1].pageY) / 2
                        }, ui.setZoomStaticPointInit(ui.page2obj(this._tui.center))) : 1 == e.touches.length && l.setLongTapTimeout(e)
                    }), e.observe("touchmove", function(e) {
                        l.resetLongTapTimeout(!0), "_tui" in this && 2 == e.touches.length && (this._tui.center = {
                            pageX: (e.touches[0].pageX + e.touches[1].pageX) / 2,
                            pageY: (e.touches[0].pageY + e.touches[1].pageY) / 2
                        })
                    }), e.observe("gesturestart", function(e) {
                        this._tui = this._tui || {}, this._tui.scale0 = ui.render.zoom, e.preventDefault()
                    }), e.observe("gesturechange", function(e) {
                        ui.setZoomStaticPoint(this._tui.scale0 * e.scale, ui.page2canvas2(this._tui.center)), ui.render.update(), e.preventDefault()
                    }), e.observe("gestureend", function(e) {
                        delete this._tui, e.preventDefault()
                    }), e.observe("onresize", function() {
                        o.onResize()
                    }), ["Click", "DblClick", "MouseDown", "MouseMove", "MouseUp", "MouseLeave"].each(function(t) {
                        var r = t.toLowerCase();
                        r = EventMap[r] || r, e.observe(r, function(n) {
                            if (!("MouseLeave" == t || ui && ui.is_touch)) {
                                var o = e.cumulativeOffset();
                                o = new Vec2(o[0], o[1]);
                                var i = new Vec2(n.clientX, n.clientY).sub(o),
                                    s = new Vec2(e.clientWidth, e.clientHeight);
                                if (!(i.x > 0 && i.y > 0 && i.x < s.x && i.y < s.y)) return "MouseMove" == t && ui.render.current_tool.processEvent("OnMouseLeave", n), util.preventDefault(n)
                            }
                            return ui.render.current_tool.processEvent("On" + t, n), "MouseUp" != t && util.stopEventPropagation(n), "touchstart" == r || "touchmove" == r && 2 == n.touches.length ? void 0 : util.preventDefault(n)
                        })
                    }, this)), this.ctab = new rnd.ReStruct(new chem.Struct, this), this.settings = null, this.styles = null, this.onCanvasOffsetChanged = null, this.onCanvasSizeChanged = null
                }, rnd.Render.prototype.addStructChangeHandler = function(e) {
                    if (e in this.structChangeHandlers) throw new Error("handler already present");
                    this.structChangeHandlers.push(e)
                }, rnd.Render.prototype.view2scaled = function(e, t) {
                    var r = ui.scrollPos();
                    return this.useOldZoom || (e = e.scaled(1 / this.zoom), r = r.scaled(1 / this.zoom)), e = t ? e : e.add(r).sub(this.offset)
                }, rnd.Render.prototype.scaled2view = function(e, t) {
                    return e = t ? e : e.add(this.offset).sub(ui.scrollPos().scaled(1 / this.zoom)), this.useOldZoom || (e = e.scaled(this.zoom)), e
                }, rnd.Render.prototype.scaled2obj = function(e) {
                    return e.scaled(1 / this.settings.scaleFactor)
                }, rnd.Render.prototype.obj2scaled = function(e) {
                    return e.scaled(this.settings.scaleFactor)
                }, rnd.Render.prototype.view2obj = function(e, t) {
                    return this.scaled2obj(this.view2scaled(e, t))
                }, rnd.Render.prototype.obj2view = function(e, t) {
                    return this.scaled2view(this.obj2scaled(e, t))
                }, rnd.Render.prototype.findItem = function(e, t, r) {
                    var n = this.findClosestItem("ui" in window && "page2obj" in ui ? new Vec2(ui.page2obj(e)) : new Vec2(e.pageX, e.pageY).sub(this.clientAreaPos), t, r);
                    return "Atom" == n.type ? n.map = "atoms" : "Bond" == n.type ? n.map = "bonds" : "SGroup" == n.type ? n.map = "sgroups" : "DataSGroupData" == n.type ? n.map = "sgroupData" : "RxnArrow" == n.type ? n.map = "rxnArrows" : "RxnPlus" == n.type ? n.map = "rxnPluses" : "Fragment" == n.type ? n.map = "frags" : "RGroup" == n.type ? n.map = "rgroups" : "ChiralFlag" == n.type && (n.map = "chiralFlags"), n
                }, rnd.Render.prototype.client2Obj = function(e) {
                    return new Vec2(e).sub(this.offset)
                }, rnd.Render.prototype.setMolecule = function(e, t) {
                    rnd.logMethod("setMolecule"), this.paper.clear(), this.ctab = new rnd.ReStruct(e, this, t), this.offset = null, this.size = null, this.bb = null, this.rxnMode = e.isReaction
                }, rnd.Render.prototype.atomGetAttr = function(e, t) {
                    return rnd.logMethod("atomGetAttr"), this.ctab.molecule.atoms.get(e)[t]
                }, rnd.Render.prototype.invalidateAtom = function(e, t) {
                    var r = this.ctab.atoms.get(e);
                    this.ctab.markAtom(e, t ? 1 : 0);
                    for (var n = this.ctab.molecule.halfBonds, o = 0; o < r.a.neighbors.length; ++o) {
                        var i = r.a.neighbors[o];
                        if (n.has(i)) {
                            var s = n.get(i);
                            this.ctab.markBond(s.bid, 1), this.ctab.markAtom(s.end, 0), t && this.invalidateLoop(s.bid)
                        }
                    }
                }, rnd.Render.prototype.invalidateLoop = function(e) {
                    var t = this.ctab.bonds.get(e),
                        r = this.ctab.molecule.halfBonds.get(t.b.hb1).loop,
                        n = this.ctab.molecule.halfBonds.get(t.b.hb2).loop;
                    r >= 0 && this.ctab.loopRemove(r), n >= 0 && this.ctab.loopRemove(n)
                }, rnd.Render.prototype.invalidateBond = function(e) {
                    var t = this.ctab.bonds.get(e);
                    this.invalidateLoop(e), this.invalidateAtom(t.b.begin, 0), this.invalidateAtom(t.b.end, 0)
                }, rnd.Render.prototype.invalidateItem = function(e, t, r) {
                    "atoms" == e ? this.invalidateAtom(t, r) : "bonds" == e ? (this.invalidateBond(t), r > 0 && this.invalidateLoop(t)) : this.ctab.markItem(e, t, r)
                }, rnd.Render.prototype.atomGetDegree = function(e) {
                    return rnd.logMethod("atomGetDegree"), this.ctab.atoms.get(e).a.neighbors.length
                }, rnd.Render.prototype.isBondInRing = function(e) {
                    var t = this.ctab.bonds.get(e);
                    return this.ctab.molecule.halfBonds.get(t.b.hb1).loop >= 0 || this.ctab.molecule.halfBonds.get(t.b.hb2).loop >= 0
                }, rnd.Render.prototype.atomGetNeighbors = function(e) {
                    for (var t = this.ctab.atoms.get(e), r = [], n = 0; n < t.a.neighbors.length; ++n) {
                        var o = this.ctab.molecule.halfBonds.get(t.a.neighbors[n]);
                        r.push({
                            aid: o.end - 0,
                            bid: o.bid - 0
                        })
                    }
                    return r
                }, rnd.Render.prototype.atomGetSGroups = function(e) {
                    rnd.logMethod("atomGetSGroups");
                    var t = this.ctab.atoms.get(e);
                    return Set.list(t.a.sgs)
                }, rnd.Render.prototype.sGroupGetAttr = function(e, t) {
                    return rnd.logMethod("sGroupGetAttr"), this.ctab.sgroups.get(e).item.getAttr(t)
                }, rnd.Render.prototype.sGroupGetAttrs = function(e) {
                    return rnd.logMethod("sGroupGetAttrs"), this.ctab.sgroups.get(e).item.getAttrs()
                }, rnd.Render.prototype.sGroupGetAtoms = function(e) {
                    rnd.logMethod("sGroupGetAtoms");
                    var t = this.ctab.sgroups.get(e).item;
                    return chem.SGroup.getAtoms(this.ctab.molecule, t)
                }, rnd.Render.prototype.sGroupGetType = function(e) {
                    rnd.logMethod("sGroupGetType");
                    var t = this.ctab.sgroups.get(e).item;
                    return t.type
                }, rnd.Render.prototype.sGroupsFindCrossBonds = function() {
                    rnd.logMethod("sGroupsFindCrossBonds"), this.ctab.molecule.sGroupsRecalcCrossBonds()
                }, rnd.Render.prototype.sGroupGetNeighborAtoms = function(e) {
                    rnd.logMethod("sGroupGetNeighborAtoms");
                    var t = this.ctab.sgroups.get(e).item;
                    return t.neiAtoms
                }, rnd.Render.prototype.atomIsPlainCarbon = function(e) {
                    return rnd.logMethod("atomIsPlainCarbon"), this.ctab.atoms.get(e).a.isPlainCarbon()
                }, rnd.Render.prototype.highlightObject = function(e, t) {
                    if (!(["atoms", "bonds", "rxnArrows", "rxnPluses", "chiralFlags", "frags", "rgroups", "sgroups", "sgroupData"].indexOf(e.map) > -1)) return !1;
                    var r = this.ctab[e.map].get(e.id);
                    if (null == r) return !0;
                    if ("sgroups" == e.map && "DAT" == r.item.type || "sgroupData" == e.map) {
                        var n = this.ctab.sgroups.get(e.id),
                            o = this.ctab.sgroupData.get(e.id);
                        null != n && n.setHighlight(t, this), null != o && o.setHighlight(t, this)
                    } else r.setHighlight(t, this);
                    return !0
                }, rnd.Render.prototype.itemGetPos = function(e, t) {
                    return this.ctab.molecule[e].get(t).pp
                }, rnd.Render.prototype.atomGetPos = function(e) {
                    return rnd.logMethod("atomGetPos"), this.itemGetPos("atoms", e)
                }, rnd.Render.prototype.rxnArrowGetPos = function(e) {
                    return rnd.logMethod("rxnArrowGetPos"), this.itemGetPos("rxnArrows", e)
                }, rnd.Render.prototype.rxnPlusGetPos = function(e) {
                    return rnd.logMethod("rxnPlusGetPos"), this.itemGetPos("rxnPluses", e)
                }, rnd.Render.prototype.getAdjacentBonds = function(e) {
                    for (var t = Set.fromList(e), r = Set.empty(), n = Set.empty(), o = 0; o < e.length; ++o)
                        for (var i = e[o], s = this.ctab.atoms.get(i), a = 0; a < s.a.neighbors.length; ++a) {
                            var l = s.a.neighbors[a],
                                c = this.ctab.molecule.halfBonds.get(l),
                                d = c.end,
                                h = Set.contains(t, d) ? r : n;
                            Set.add(h, c.bid)
                        }
                    return {
                        inner: r,
                        cross: n
                    }
                }, rnd.Render.prototype.bondGetAttr = function(e, t) {
                    return rnd.logMethod("bondGetAttr"), this.ctab.bonds.get(e).b[t]
                }, rnd.Render.prototype.setSelection = function(e) {
                    rnd.logMethod("setSelection");
                    for (var t in rnd.ReStruct.maps)
                        if (rnd.ReStruct.maps[t].isSelectable()) {
                            var r = e ? e[t] ? util.identityMap(e[t]) : {} : null;
                            this.ctab[t].each(function(e, t) {
                                var n = r ? r[e] === e : t.selected;
                                t.selected = n, this.ctab.showItemSelection(e, t, n)
                            }, this)
                        }
                }, rnd.Render.prototype.initStyles = function() {
                    var e = this.settings;
                    this.styles = {}, this.styles.lineattr = {
                        stroke: "#000",
                        "stroke-width": e.lineWidth,
                        "stroke-linecap": "round",
                        "stroke-linejoin": "round"
                    }, this.styles.selectionStyle = {
                        fill: "#7f7",
                        stroke: "none"
                    }, this.styles.selectionZoneStyle = {
                        fill: "#000",
                        stroke: "none",
                        opacity: 0
                    }, this.styles.highlightStyle = {
                        stroke: "#0c0",
                        "stroke-width": .6 * e.lineWidth
                    }, this.styles.sGroupHighlightStyle = {
                        stroke: "#9900ff",
                        "stroke-width": .6 * e.lineWidth
                    }, this.styles.sgroupBracketStyle = {
                        stroke: "darkgray",
                        "stroke-width": .5 * e.lineWidth
                    }, this.styles.atomSelectionPlateRadius = 1.2 * e.labelFontSize
                }, rnd.Render.prototype.initSettings = function() {
                    var e = this.settings = {};
                    e.delta = this.ctab.molecule.getCoordBoundingBox(), e.margin = .1, e.scaleFactor = this.scale, e.lineWidth = e.scaleFactor / 20, e.bondShift = e.scaleFactor / 6, e.bondSpace = e.scaleFactor / 7, e.labelFontSize = Math.ceil(1.9 * (e.scaleFactor / 6)), e.subFontSize = Math.ceil(.7 * e.labelFontSize), e.font = '30px "Arial"', e.fontsz = this.settings.labelFontSize, e.fontszsub = this.settings.subFontSize, e.fontRLabel = 1.2 * this.settings.labelFontSize, e.fontRLogic = .7 * this.settings.labelFontSize
                }, rnd.Render.prototype.getStructCenter = function(e) {
                    var t = this.ctab.getVBoxObj(e);
                    return Vec2.lc2(t.p0, .5, t.p1, .5)
                }, rnd.Render.prototype.onResize = function() {
                    this.setViewSize(new Vec2(this.clientArea.clientWidth, this.clientArea.clientHeight))
                }, rnd.Render.prototype.setViewSize = function(e) {
                    this.viewSz = new Vec2(e)
                }, rnd.Render.prototype._setPaperSize = function(e) {
                    var t = this.zoom;
                    this.paper.setSize(e.x * t, e.y * t), this.setViewBox(t)
                }, rnd.Render.prototype.setPaperSize = function(e) {
                    rnd.logMethod("setPaperSize");
                    var t = this.sz;
                    this.sz = e, this._setPaperSize(e), this.onCanvasSizeChanged && this.onCanvasSizeChanged(e, t)
                }, rnd.Render.prototype.setOffset = function(e) {
                    rnd.logMethod("setOffset"), this.onCanvasOffsetChanged && this.onCanvasOffsetChanged(e, this.offset), this.offset = e
                }, rnd.Render.prototype.getElementPos = function(e) {
                    var t = 0,
                        r = 0;
                    if (e.offsetParent)
                        do t += e.offsetLeft, r += e.offsetTop; while (e = e.offsetParent);
                    return new Vec2(t, r)
                }, rnd.Render.prototype.drawSelectionLine = function(e, t) {
                    rnd.logMethod("drawSelectionLine"), this.selectionRect && (this.selectionRect.remove(), this.selectionRect = null), e && t && (e = this.obj2scaled(e).add(this.offset), t = this.obj2scaled(t).add(this.offset), this.selectionRect = this.paper.path(rnd.ReStruct.makeStroke(e, t)).attr({
                        stroke: "gray",
                        "stroke-width": "1px"
                    }))
                }, rnd.Render.prototype.drawSelectionRectangle = function(e, t) {
                    rnd.logMethod("drawSelectionRectangle"), this.selectionRect && (this.selectionRect.remove(), this.selectionRect = null), e && t && (e = this.obj2scaled(e).add(this.offset), t = this.obj2scaled(t).add(this.offset), this.selectionRect = this.paper.rect(Math.min(e.x, t.x), Math.min(e.y, t.y), Math.abs(t.x - e.x), Math.abs(t.y - e.y)).attr({
                        stroke: "gray",
                        "stroke-width": "1px"
                    }))
                }, rnd.Render.prototype.getElementsInRectangle = function(e, t) {
                    rnd.logMethod("getElementsInRectangle");
                    var r = [],
                        n = [],
                        o = Math.min(e.x, t.x),
                        i = Math.max(e.x, t.x),
                        s = Math.min(e.y, t.y),
                        a = Math.max(e.y, t.y);
                    this.ctab.bonds.each(function(e, t) {
                        var n = Vec2.lc2(this.ctab.atoms.get(t.b.begin).a.pp, .5, this.ctab.atoms.get(t.b.end).a.pp, .5);
                        n.x > o && n.x < i && n.y > s && n.y < a && r.push(e)
                    }, this), this.ctab.atoms.each(function(e, t) {
                        t.a.pp.x > o && t.a.pp.x < i && t.a.pp.y > s && t.a.pp.y < a && n.push(e)
                    }, this);
                    var l = [],
                        c = [];
                    this.ctab.rxnArrows.each(function(e, t) {
                        t.item.pp.x > o && t.item.pp.x < i && t.item.pp.y > s && t.item.pp.y < a && l.push(e)
                    }, this), this.ctab.rxnPluses.each(function(e, t) {
                        t.item.pp.x > o && t.item.pp.x < i && t.item.pp.y > s && t.item.pp.y < a && c.push(e)
                    }, this);
                    var d = [];
                    this.ctab.chiralFlags.each(function(e, t) {
                        t.pp.x > o && t.pp.x < i && t.pp.y > s && t.pp.y < a && d.push(e)
                    }, this);
                    var h = [];
                    return this.ctab.sgroupData.each(function(e, t) {
                        t.sgroup.pp.x > o && t.sgroup.pp.x < i && t.sgroup.pp.y > s && t.sgroup.pp.y < a && h.push(e)
                    }, this), {
                        atoms: n,
                        bonds: r,
                        rxnArrows: l,
                        rxnPluses: c,
                        chiralFlags: d,
                        sgroupData: h
                    }
                }, rnd.Render.prototype.drawSelectionPolygon = function(e) {
                    if (rnd.logMethod("drawSelectionPolygon"), this.selectionRect && (this.selectionRect.remove(), this.selectionRect = null), e && e.length > 1) {
                        for (var t = this.obj2scaled(e[e.length - 1]).add(this.offset), r = "M" + tfx(t.x) + "," + tfx(t.y), n = 0; n < e.length; ++n) t = this.obj2scaled(e[n]).add(this.offset), r += "L" + tfx(t.x) + "," + tfx(t.y);
                        this.selectionRect = this.paper.path(r).attr({
                            stroke: "gray",
                            "stroke-width": "1px"
                        })
                    }
                }, rnd.Render.prototype.isPointInPolygon = function(e, t) {
                    for (var r = new Vec2(0, 1), n = r.rotate(Math.PI / 2), o = Vec2.diff(e[e.length - 1], t), i = Vec2.dot(n, o), s = Vec2.dot(r, o), a = null, l = 0, c = 1e-5, d = !1, h = !1, u = 0; u < e.length; ++u) {
                        var p = Vec2.diff(e[u], t),
                            m = Vec2.diff(p, o),
                            f = Vec2.dot(n, p),
                            g = Vec2.dot(r, p);
                        d = !1, 0 > f * i && (g * s > -c ? s > -c && (d = !0) : (Math.abs(i) * Math.abs(g) - Math.abs(f) * Math.abs(s)) * g > 0 && (d = !0)), d && h && Vec2.dot(m, n) * Vec2(a, n) >= 0 && (d = !1), d && l++, o = p, i = f, s = g, a = m, h = d
                    }
                    return 0 != l % 2
                }, rnd.Render.prototype.ps = function(e) {
                    return e.scaled(this.settings.scaleFactor)
                }, rnd.Render.prototype.getElementsInPolygon = function(e) {
                    rnd.logMethod("getElementsInPolygon");
                    for (var t = [], r = [], n = [], o = 0; o < e.length; ++o) n[o] = new Vec2(e[o].x, e[o].y);
                    this.ctab.bonds.each(function(e, r) {
                        var o = Vec2.lc2(this.ctab.atoms.get(r.b.begin).a.pp, .5, this.ctab.atoms.get(r.b.end).a.pp, .5);
                        this.isPointInPolygon(n, o) && t.push(e)
                    }, this), this.ctab.atoms.each(function(e, t) {
                        this.isPointInPolygon(n, t.a.pp) && r.push(e)
                    }, this);
                    var i = [],
                        s = [];
                    this.ctab.rxnArrows.each(function(e, t) {
                        this.isPointInPolygon(n, t.item.pp) && i.push(e)
                    }, this), this.ctab.rxnPluses.each(function(e, t) {
                        this.isPointInPolygon(n, t.item.pp) && s.push(e)
                    }, this);
                    var a = [];
                    this.ctab.chiralFlags.each(function(e, t) {
                        this.isPointInPolygon(n, t.pp) && a.push(e)
                    }, this);
                    var l = [];
                    return this.ctab.sgroupData.each(function(e, t) {
                        this.isPointInPolygon(n, t.sgroup.pp) && l.push(e)
                    }, this), {
                        atoms: r,
                        bonds: t,
                        rxnArrows: i,
                        rxnPluses: s,
                        chiralFlags: a,
                        sgroupData: l
                    }
                }, rnd.Render.prototype.testPolygon = function(e) {
                    if (e = e || [{
                            x: 50,
                            y: 10
                        }, {
                            x: 20,
                            y: 90
                        }, {
                            x: 90,
                            y: 30
                        }, {
                            x: 10,
                            y: 30
                        }, {
                            x: 90,
                            y: 80
                        }], !(e.length < 3)) {
                        for (var t = e[0], r = e[0], n = 1; n < e.length; ++n) t = Vec2.min(t, e[n]), r = Vec2.max(r, e[n]);
                        this.drawSelectionPolygon(e);
                        for (var o = 10, i = 0; 1e3 > i; ++i) {
                            var s = new Vec2(Math.random() * o, Math.random() * o),
                                a = this.isPointInPolygon(e, s),
                                l = a ? "#0f0" : "#f00";
                            this.paper.circle(s.x, s.y, 2).attr({
                                fill: l,
                                stroke: "none"
                            })
                        }
                        this.drawSelectionPolygon(e)
                    }
                }, rnd.Render.prototype.update = function(e) {
                    if (rnd.logMethod("update"), !this.settings || this.dirty) {
                        if (this.opt.autoScale) {
                            var t = this.ctab.molecule.getCoordBoundingBox(),
                                r = t.max.y - t.min.y > 0 ? .8 * this.viewSz.y / (t.max.y - t.min.y) : 100,
                                n = t.max.x - t.min.x > 0 ? .8 * this.viewSz.x / (t.max.x - t.min.x) : 100;
                            this.scale = Math.min(r, n), this.opt.maxBondLength > 0 && this.scale > this.opt.maxBondLength && (this.scale = this.opt.maxBondLength)
                        }
                        this.initSettings(), this.initStyles(), this.dirty = !1, e = !0
                    }
                    var o = (new Date).getTime(),
                        i = this.ctab.update(e);
                    this.setSelection(null);
                    var s = (new Date).getTime() - o;
                    if (e && $("log") && ($("log").innerHTML = s.toString() + "\n"), i) {
                        var a = this.settings.scaleFactor,
                            l = this.ctab.getVBoxObj().transform(this.obj2scaled, this).translate(this.offset || new Vec2);
                        if (this.opt.autoScale) {
                            var c = l.sz(),
                                d = this.opt.autoScaleMargin,
                                h = new Vec2(d, d),
                                u = this.viewSz;
                            if (u.x < 2 * d + 1 || u.y < 2 * d + 1) throw new Error("View box too small for the given margin");
                            var p = Math.max(c.x / (u.x - 2 * d), c.y / (u.y - 2 * d));
                            this.opt.maxBondLength / p > 1 && (p = 1);
                            var m = c.add(h.scaled(2 * p));
                            this.paper.setViewBox(l.pos().x - d * p - (u.x * p - m.x) / 2, l.pos().y - d * p - (u.y * p - m.y) / 2, u.x * p, u.y * p)
                        } else {
                            var f = Vec2.UNIT.scaled(a),
                                g = l.sz().length() > 0 ? l.extend(f, f) : l;
                            console.assert(ui.zoom == this.zoom);
                            var b = new Box2Abs(ui.scrollPos(), this.viewSz.scaled(1 / ui.zoom).sub(Vec2.UNIT.scaled(20))),
                                v = Box2Abs.union(b, g);
                            this.oldCb || (this.oldCb = new Box2Abs);
                            var S = v.sz().floor(),
                                y = this.oldCb.p0.sub(v.p0).ceil();
                            this.oldBb = l, this.sz && S.x == this.sz.x && S.y == this.sz.y || this.setPaperSize(S), this.offset = this.offset || new Vec2, (0 != y.x || 0 != y.y) && (this.setOffset(this.offset.add(y)), this.ctab.translate(y))
                        }
                    }
                }, rnd.Render.prototype.checkBondExists = function(e, t) {
                    return this.ctab.molecule.checkBondExists(e, t)
                }, rnd.Render.prototype.findClosestAtom = function(e, t, r) {
                    var n = null,
                        o = this.opt.selectionDistanceCoefficient;
                    return t = t || o, t = Math.min(t, o), this.ctab.atoms.each(function(o, i) {
                        if (o != r) {
                            var s = Vec2.dist(e, i.a.pp);
                            t > s && (n = o, t = s)
                        }
                    }, this), null != n ? {
                        id: n,
                        dist: t
                    } : null
                }, rnd.Render.prototype.findClosestBond = function(e, t) {
                    var r = null,
                        n = null,
                        o = this.opt.selectionDistanceCoefficient;
                    t = t || o, t = Math.min(t, o);
                    var i = t;
                    return this.ctab.bonds.each(function(t, r) {
                        var o = this.ctab.atoms.get(r.b.begin).a.pp,
                            s = this.ctab.atoms.get(r.b.end).a.pp,
                            a = Vec2.lc2(o, .5, s, .5),
                            l = Vec2.dist(e, a);
                        i > l && (i = l, n = t)
                    }, this), this.ctab.bonds.each(function(n, o) {
                        var i = this.ctab.molecule.halfBonds.get(o.b.hb1),
                            s = i.dir,
                            a = i.norm,
                            l = this.ctab.atoms.get(o.b.begin).a.pp,
                            c = this.ctab.atoms.get(o.b.end).a.pp,
                            d = Vec2.dot(e.sub(l), s) * Vec2.dot(e.sub(c), s) < 0;
                        if (d) {
                            var h = Math.abs(Vec2.dot(e.sub(l), a));
                            t > h && (r = n, t = h)
                        }
                    }, this), null !== r || null !== n ? {
                        id: r,
                        dist: t,
                        cid: n,
                        cdist: i
                    } : null
                }, rnd.Render.prototype.findClosestItem = function(e, t, r) {
                    var n = null,
                        o = function(e, t, r) {
                            null != t && (null == n || n.dist > t.dist || r) && (n = {
                                type: e,
                                id: t.id,
                                dist: t.dist
                            })
                        };
                    if (!t || t.indexOf("atoms") >= 0) {
                        var i = this.findClosestAtom(e, void 0, Object.isUndefined(r) || "atoms" != r.map ? void 0 : r.id);
                        o("Atom", i)
                    }
                    if (!t || t.indexOf("bonds") >= 0) {
                        var s = this.findClosestBond(e);
                        s && (null !== s.cid && o("Bond", {
                            id: s.cid,
                            dist: s.cdist
                        }), (null == n || n.dist > .4 * this.scale) && o("Bond", s))
                    }
                    if (!t || t.indexOf("chiralFlags") >= 0) {
                        var a = rnd.ReChiralFlag.findClosest(this, e);
                        o("ChiralFlag", a)
                    }
                    if (!t || t.indexOf("sgroupData") >= 0) {
                        var l = rnd.ReDataSGroupData.findClosest(this, e);
                        o("DataSGroupData", l)
                    }
                    if (!t || t.indexOf("sgroups") >= 0) {
                        var c = rnd.ReSGroup.findClosest(this, e);
                        o("SGroup", c)
                    }
                    if (!t || t.indexOf("rxnArrows") >= 0) {
                        var d = rnd.ReRxnArrow.findClosest(this, e);
                        o("RxnArrow", d)
                    }
                    if (!t || t.indexOf("rxnPluses") >= 0) {
                        var h = rnd.ReRxnPlus.findClosest(this, e);
                        o("RxnPlus", h)
                    }
                    if (!t || t.indexOf("frags") >= 0) {
                        var u = rnd.ReFrag.findClosest(this, e, r && "atoms" == r.map ? r.id : void 0);
                        o("Fragment", u)
                    }
                    if (!t || t.indexOf("rgroups") >= 0) {
                        var p = rnd.ReRGroup.findClosest(this, e);
                        o("RGroup", p)
                    }
                    return n = n || {
                        type: "Canvas",
                        id: -1
                    }
                }, rnd.Render.prototype.setZoom = function(e) {
                    this.zoom = e, this._setPaperSize(this.sz)
                }, rnd.Render.prototype.extendCanvas = function(e, t, r, n) {
                    var o = 0,
                        i = 0,
                        s = 0,
                        a = 0;
                    e -= 0, r -= 0, t -= 0, n -= 0, 0 > e && (o += -e, s += -e), 0 > t && (i += -t, a += -t);
                    var l = this.sz.x * this.zoom,
                        c = this.sz.y * this.zoom;
                    r > l && (o += r - l), n > c && (i += n - c);
                    var d = new Vec2(s, a).scaled(1 / this.zoom);
                    if (i > 0 || o > 0) {
                        var h = new Vec2(o, i).scaled(1 / this.zoom),
                            u = this.sz.add(h);
                        this.setPaperSize(u), (d.x > 0 || d.y > 0) && (this.ctab.translate(d), this.setOffset(this.offset.add(d)))
                    }
                    return d
                }, rnd.Render.prototype.setScale = function(e) {
                    this.offset && (this.offset = this.offset.scaled(1 / e).scaled(this.zoom)), this.scale = this.baseScale * this.zoom, this.settings = null, this.update(!0)
                }, rnd.Render.prototype.setViewBox = function(e) {
                    this.useOldZoom ? this.setScale(e) : this.paper.canvas.setAttribute("viewBox", "0 0 " + this.sz.x + " " + this.sz.y)
                };

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../chem": 11,
            "../raphael-ext.js": 19,
            "../ui": 34,
            "../util": 39,
            "../util/box2abs": 38,
            "../util/set": 42,
            "../util/vec2": 43,
            "./restruct": 23,
            "./restruct_rendering": 24
        }],
        23: [function(require, module, exports) {
            (function(global) {
                var Box2Abs = require("../util/box2abs"),
                    Map = require("../util/map"),
                    Pool = require("../util/pool"),
                    Set = require("../util/set"),
                    Vec2 = require("../util/vec2"),
                    util = require("../util"),
                    element = require("../chem/element");
                require("../chem");
                var rnd = global.rnd = global.rnd || {},
                    chem = global.chem,
                    tfx = util.tfx;
                rnd.ReObject = function() {
                    this.__ext = new Vec2(.05 * 3, .05 * 3)
                }, rnd.ReObject.prototype.init = function(e) {
                    this.visel = new rnd.Visel(e), this.highlight = !1, this.highlighting = null, this.selected = !1, this.selectionPlate = null
                }, rnd.ReObject.prototype.getVBoxObj = function(e) {
                    var t = this.visel.boundingBox;
                    return util.isNull(t) ? null : (e.offset && (t = t.translate(e.offset.negated())), t.transform(e.scaled2obj, e))
                }, rnd.ReObject.prototype.drawHighlight = function() {
                    console.log("ReObject.drawHighlight is not overridden")
                }, rnd.ReObject.prototype.setHighlight = function(e, t) {
                    if (e) {
                        var r = "highlighting" in this && null != this.highlighting;
                        r && (r = "set" == this.highlighting.type ? !this.highlighting[0].removed : !this.highlighting.removed), r = r && (!("hiddenPaths" in rnd.ReStruct.prototype) || rnd.ReStruct.prototype.hiddenPaths.indexOf(this.highlighting) < 0), r ? this.highlighting.show() : (t.paper.setStart(), this.drawHighlight(t), this.highlighting = t.paper.setFinish())
                    } else this.highlighting && this.highlighting.hide();
                    this.highlight = e
                }, rnd.ReObject.prototype.makeSelectionPlate = function() {
                    console.log("ReObject.makeSelectionPlate is not overridden")
                }, rnd.ReAtom = function(e) {
                    this.init(rnd.Visel.TYPE.ATOM), this.a = e, this.showLabel = !1, this.hydrogenOnTheLeft = !1, this.component = -1
                }, rnd.ReAtom.prototype = new rnd.ReObject, rnd.ReAtom.isSelectable = function() {
                    return !0
                }, rnd.ReAtom.prototype.getVBoxObj = function(e) {
                    return this.visel.boundingBox ? rnd.ReObject.prototype.getVBoxObj.call(this, e) : new Box2Abs(this.a.pp, this.a.pp)
                }, rnd.ReAtom.prototype.drawHighlight = function(e) {
                    var t = this.makeHighlightPlate(e);
                    return e.ctab.addReObjectPath("highlighting", this.visel, t), t
                }, rnd.ReAtom.prototype.makeHighlightPlate = function(e) {
                    var t = e.paper,
                        r = e.styles,
                        n = e.ps(this.a.pp);
                    return t.circle(n.x, n.y, r.atomSelectionPlateRadius).attr(r.highlightStyle)
                }, rnd.ReAtom.prototype.makeSelectionPlate = function(e, t, r) {
                    var n = e.render.ps(this.a.pp);
                    return t.circle(n.x, n.y, r.atomSelectionPlateRadius).attr(r.selectionStyle)
                }, rnd.ReBond = function(e) {
                    this.init(rnd.Visel.TYPE.BOND), this.b = e, this.doubleBondShift = 0
                }, rnd.ReBond.prototype = new rnd.ReObject, rnd.ReBond.isSelectable = function() {
                    return !0
                }, rnd.ReBond.prototype.drawHighlight = function(e) {
                    var t = this.makeHighlightPlate(e);
                    return e.ctab.addReObjectPath("highlighting", this.visel, t), t
                }, rnd.ReBond.prototype.makeHighlightPlate = function(e) {
                    e.ctab.bondRecalc(e.settings, this);
                    var t = e.ps(this.b.center);
                    return e.paper.circle(t.x, t.y, .8 * e.styles.atomSelectionPlateRadius).attr(e.styles.highlightStyle)
                }, rnd.ReBond.prototype.makeSelectionPlate = function(e, t, r) {
                    e.bondRecalc(e.render.settings, this);
                    var n = e.render.ps(this.b.center);
                    return t.circle(n.x, n.y, .8 * r.atomSelectionPlateRadius).attr(r.selectionStyle)
                }, rnd.ReStruct = function(e, t, r) {
                    this.render = t, this.atoms = new Map, this.bonds = new Map, this.reloops = new Map, this.rxnPluses = new Map, this.rxnArrows = new Map, this.frags = new Map, this.rgroups = new Map, this.sgroups = new Map, this.sgroupData = new Map, this.chiralFlags = new Map, this.molecule = e || new chem.Struct, this.initialized = !1, this.layers = [], this.initLayers(), this.connectedComponents = new Pool, this.ccFragmentType = new Map;
                    for (var n in rnd.ReStruct.maps) this[n + "Changed"] = {};
                    if (this.structChanged = !1, e.atoms.each(function(e, t) {
                            this.atoms.set(e, new rnd.ReAtom(t))
                        }, this), e.bonds.each(function(e, t) {
                            this.bonds.set(e, new rnd.ReBond(t))
                        }, this), e.loops.each(function(e, t) {
                            this.reloops.set(e, new rnd.ReLoop(t))
                        }, this), e.rxnPluses.each(function(e, t) {
                            this.rxnPluses.set(e, new rnd.ReRxnPlus(t))
                        }, this), e.rxnArrows.each(function(e, t) {
                            this.rxnArrows.set(e, new rnd.ReRxnArrow(t))
                        }, this), e.frags.each(function(e, t) {
                            this.frags.set(e, new rnd.ReFrag(t))
                        }, this), e.rgroups.each(function(e, t) {
                            this.rgroups.set(e, new rnd.ReRGroup(t))
                        }, this), e.sgroups.each(function(e, t) {
                            this.sgroups.set(e, new rnd.ReSGroup(t)), "DAT" != t.type || t.data.attached || this.sgroupData.set(e, new rnd.ReDataSGroupData(t))
                        }, this), e.isChiral && !this.render.opt.hideChiralFlag) {
                        var i = e.getCoordBoundingBox();
                        this.chiralFlags.set(0, new rnd.ReChiralFlag(new Vec2(i.max.x, i.min.y - 1)))
                    }
                    this.coordProcess(r)
                }, rnd.ReStruct.prototype.connectedComponentRemoveAtom = function(e, t) {
                    if (t = t || this.atoms.get(e), !(t.component < 0)) {
                        var r = this.connectedComponents.get(t.component);
                        Set.remove(r, e), Set.size(r) < 1 && this.connectedComponents.remove(t.component), t.component = -1
                    }
                }, rnd.ReStruct.prototype.printConnectedComponents = function() {
                    var e = [];
                    this.connectedComponents.each(function(t, r) {
                        e.push(" " + t + ":[" + Set.list(r).toString() + "]." + Set.size(r).toString())
                    }, this), console.log(e.toString())
                }, rnd.ReStruct.prototype.clearConnectedComponents = function() {
                    this.connectedComponents.clear(), this.atoms.each(function(e, t) {
                        t.component = -1
                    })
                }, rnd.ReStruct.prototype.getConnectedComponent = function(e, t) {
                    for (var r = "number" == typeof e.length ? util.array(e) : [e], n = Set.empty(); r.length > 0;) ! function() {
                        var e = r.pop();
                        Set.add(n, e);
                        var i = this.atoms.get(e);
                        i.component >= 0 && Set.add(t, i.component);
                        for (var o = 0; o < i.a.neighbors.length; ++o) {
                            var a = this.molecule.halfBonds.get(i.a.neighbors[o]).end;
                            Set.contains(n, a) || r.push(a)
                        }
                    }.apply(this);
                    return n
                }, rnd.ReStruct.prototype.addConnectedComponent = function(e) {
                    var t = this.connectedComponents.add(e),
                        r = Set.empty(),
                        n = this.getConnectedComponent(Set.list(e), r);
                    Set.remove(r, t);
                    var i = -1;
                    return Set.each(n, function(e) {
                        var r = this.atoms.get(e);
                        if (r.component = t, -1 != r.a.rxnFragmentType) {
                            if (-1 != i && r.a.rxnFragmentType != i) throw new Error("reaction fragment type mismatch");
                            i = r.a.rxnFragmentType
                        }
                    }, this), this.ccFragmentType.set(t, i), t
                }, rnd.ReStruct.prototype.removeConnectedComponent = function(e) {
                    return Set.each(this.connectedComponents.get(e), function(e) {
                        this.atoms.get(e).component = -1
                    }, this), this.connectedComponents.remove(e)
                }, rnd.ReStruct.prototype.connectedComponentMergeIn = function(e, t) {
                    Set.each(t, function(t) {
                        this.atoms.get(t).component = e
                    }, this), Set.mergeIn(this.connectedComponents.get(e), t)
                }, rnd.ReStruct.prototype.assignConnectedComponents = function() {
                    this.atoms.each(function(e, t) {
                        if (!(t.component >= 0)) {
                            var r = Set.empty(),
                                n = this.getConnectedComponent(e, r);
                            Set.each(r, function(e) {
                                this.removeConnectedComponent(e)
                            }, this), this.addConnectedComponent(n)
                        }
                    }, this)
                }, rnd.ReStruct.prototype.connectedComponentGetBoundingBox = function(e, t, r) {
                    return t = t || this.connectedComponents.get(e), r = r || {
                        min: null,
                        max: null
                    }, Set.each(t, function(e) {
                        var t = this.render.ps(this.atoms.get(e).a.pp);
                        null == r.min ? r.min = r.max = t : (r.min = r.min.min(t), r.max = r.max.max(t))
                    }, this), r
                }, rnd.ReStruct.prototype.initLayers = function() {
                    for (var e in rnd.ReStruct.layerMap) this.layers[rnd.ReStruct.layerMap[e]] = this.render.paper.rect(0, 0, 10, 10).attr({
                        fill: "#000",
                        opacity: "0.0"
                    }).toFront()
                }, rnd.ReStruct.prototype.insertInLayer = function(e, t) {
                    t.insertBefore(this.layers[e])
                }, rnd.ReStruct.prototype.clearMarks = function() {
                    for (var e in rnd.ReStruct.maps) this[e + "Changed"] = {};
                    this.structChanged = !1
                }, rnd.ReStruct.prototype.markItemRemoved = function() {
                    this.structChanged = !0
                }, rnd.ReStruct.prototype.markBond = function(e, t) {
                    this.markItem("bonds", e, t)
                }, rnd.ReStruct.prototype.markAtom = function(e, t) {
                    this.markItem("atoms", e, t)
                }, rnd.ReStruct.prototype.markItem = function(e, t, r) {
                    var n = this[e + "Changed"];
                    n[t] = "undefined" != typeof n[t] ? Math.max(r, n[t]) : r, this[e].has(t) && this.clearVisel(this[e].get(t).visel)
                }, rnd.ReStruct.prototype.eachVisel = function(e, t) {
                    for (var r in rnd.ReStruct.maps) this[r].each(function(r, n) {
                        e.call(t, n.visel)
                    }, this)
                }, rnd.ReStruct.prototype.getVBoxObj = function(e) {
                    if (e = e || {}, this.selectionIsEmpty(e))
                        for (var t in rnd.ReStruct.maps) e[t] = this[t].keys();
                    var r = null;
                    for (var t in rnd.ReStruct.maps) e[t] && util.each(e[t], function(e) {
                        var n = this[t].get(e).getVBoxObj(this.render);
                        n && (r = r ? Box2Abs.union(r, n) : n.clone())
                    }, this);
                    return r = r || new Box2Abs(0, 0, 0, 0)
                }, rnd.ReStruct.prototype.selectionIsEmpty = function(e) {
                    if (util.assert(!util.isUndefined(e), "'selection' is not defined"), util.isNull(e)) return !0;
                    for (var t in rnd.ReStruct.maps)
                        if (e[t] && e[t].length > 0) return !1;
                    return !0
                }, rnd.ReStruct.prototype.translate = function(e) {
                    this.eachVisel(function(t) {
                        t.translate(e)
                    }, this)
                }, rnd.ReStruct.prototype.scale = function(e) {
                    this.eachVisel(function(t) {
                        this.scaleVisel(t, e)
                    }, this)
                }, rnd.ReStruct.prototype.scaleRPath = function(e, t) {
                    if ("set" == e.type)
                        for (var r = 0; r < e.length; ++r) this.scaleRPath(e[r], t);
                    else Object.isUndefined(e.attrs) || ("font-size" in e.attrs ? e.attr("font-size", e.attrs["font-size"] * t) : "stroke-width" in e.attrs && e.attr("stroke-width", e.attrs["stroke-width"] * t)), e.scale(t, t, 0, 0)
                }, rnd.ReStruct.prototype.scaleVisel = function(e, t) {
                    for (var r = 0; r < e.paths.length; ++r) this.scaleRPath(e.paths[r], t)
                }, rnd.ReStruct.prototype.clearVisels = function() {
                    this.eachVisel(function(e) {
                        this.clearVisel(e)
                    }, this)
                }, rnd.ReStruct.prototype.findIncomingStereoUpBond = function(e, t, r) {
                    return util.findIndex(e.neighbors, function(e) {
                        var n = this.molecule.halfBonds.get(e),
                            i = n.bid;
                        if (i === t) return !1;
                        var o = this.bonds.get(i);
                        return o.b.type === chem.Struct.BOND.TYPE.SINGLE && o.b.stereo === chem.Struct.BOND.STEREO.UP ? o.b.end === n.begin || o.boldStereo && r : o.b.type === chem.Struct.BOND.TYPE.DOUBLE && o.b.stereo === chem.Struct.BOND.STEREO.NONE && r && o.boldStereo ? !0 : !1
                    }, this)
                }, rnd.ReStruct.prototype.checkStereoBold = function(e, t) {
                    var r = util.map([t.b.begin, t.b.end], function(t) {
                        var r = this.molecule.atoms.get(t),
                            n = this.findIncomingStereoUpBond(r, e, !1);
                        return 0 > n ? -1 : r.neighbors[n]
                    }, this);
                    util.assert(2 === r.length), t.boldStereo = r[0] >= 0 && r[1] >= 0
                }, rnd.ReStruct.prototype.findIncomingUpBonds = function(e, t) {
                    var r = util.map([t.b.begin, t.b.end], function(t) {
                        var r = this.molecule.atoms.get(t),
                            n = this.findIncomingStereoUpBond(r, e, !0);
                        return 0 > n ? -1 : r.neighbors[n]
                    }, this);
                    util.assert(2 === r.length), t.neihbid1 = this.atoms.get(t.b.begin).showLabel ? -1 : r[0], t.neihbid2 = this.atoms.get(t.b.end).showLabel ? -1 : r[1]
                }, rnd.ReStruct.prototype.checkStereoBoldBonds = function() {
                    this.bonds.each(this.checkStereoBold, this)
                }, rnd.ReStruct.prototype.update = function(e) {
                    e = e || !this.initialized;
                    var t;
                    e ? function() {
                        for (var e in rnd.ReStruct.maps) {
                            var t = this[e + "Changed"];
                            this[e].each(function(e) {
                                t[e] = 1
                            }, this)
                        }
                    }.call(this) : function() {
                        for (var e in rnd.ReStruct.maps) {
                            var r = this[e + "Changed"];
                            for (t in r) this[e].has(t) || delete r[t]
                        }
                    }.call(this);
                    for (t in this.atomsChanged) this.connectedComponentRemoveAtom(t);
                    for (var r = this.frags.findAll(function(e, t) {
                            return !t.calcBBox(this.render, e)
                        }, this), n = 0; n < r.length; ++n) {
                        var i = r[n];
                        this.clearVisel(this.frags.get(i).visel), this.frags.unset(i), this.molecule.frags.remove(i)
                    }! function() {
                        for (var e in rnd.ReStruct.maps) {
                            var r = this[e + "Changed"];
                            for (t in r) this.clearVisel(this[e].get(t).visel), this.structChanged |= r[t] > 0
                        }
                    }.call(this), this.structChanged && util.each(this.render.structChangeHandlers, function(e) {
                        e.call()
                    }), this.sgroups.each(function(e, t) {
                        this.clearVisel(t.visel), t.highlighting = null, t.selectionPlate = null
                    }, this), this.frags.each(function(e, t) {
                        this.clearVisel(t.visel)
                    }, this), this.rgroups.each(function(e, t) {
                        this.clearVisel(t.visel)
                    }, this), e && (this.clearConnectedComponents(), this.molecule.initHalfBonds(), this.molecule.initNeighbors()), this.molecule.updateHalfBonds(new Map(this.atomsChanged).findAll(function(e, t) {
                        return t >= 0
                    }, this)), this.molecule.sortNeighbors(new Map(this.atomsChanged).findAll(function(e, t) {
                        return t >= 1
                    }, this)), this.assignConnectedComponents(), this.setImplicitHydrogen(), this.setHydrogenPos(), this.initialized = !0, this.verifyLoops();
                    var o = e || this.structChanged;
                    return o && this.updateLoops(), this.setDoubleBondShift(), this.checkLabelsToShow(), this.checkStereoBoldBonds(), this.showLabels(), this.showBonds(), o && this.renderLoops(), this.drawReactionSymbols(), this.drawSGroups(), this.drawFragments(), this.drawRGroups(), this.chiralFlags.each(function(e, t) {
                        this.chiralFlagsChanged[e] > 0 && t.draw(this.render)
                    }, this), this.clearMarks(), !0
                }, rnd.ReStruct.prototype.drawReactionSymbols = function() {
                    var e, t;
                    for (t in this.rxnArrowsChanged) e = this.rxnArrows.get(t), this.drawReactionArrow(t, e);
                    for (t in this.rxnPlusesChanged) e = this.rxnPluses.get(t), this.drawReactionPlus(t, e)
                }, rnd.ReStruct.prototype.drawReactionArrow = function(e, t) {
                    var r = this.render.ps(t.item.pp),
                        n = this.drawArrow(new Vec2(r.x - this.render.scale, r.y), new Vec2(r.x + this.render.scale, r.y));
                    t.visel.add(n, Box2Abs.fromRelBox(rnd.relBox(n.getBBox())));
                    var i = this.render.offset;
                    null != i && n.translateAbs(i.x, i.y)
                }, rnd.ReStruct.prototype.drawReactionPlus = function(e, t) {
                    var r = this.render.ps(t.item.pp),
                        n = this.drawPlus(r);
                    t.visel.add(n, Box2Abs.fromRelBox(rnd.relBox(n.getBBox())));
                    var i = this.render.offset;
                    null != i && n.translateAbs(i.x, i.y)
                }, rnd.ReStruct.prototype.drawSGroups = function() {
                    util.each(this.molecule.sGroupForest.getSGroupsBFS().reverse(), function(e) {
                        var t = this.sgroups.get(e),
                            r = t.draw(this.render);
                        this.addReObjectPath("data", t.visel, r, null, !0), t.setHighlight(t.highlight, this.render)
                    }, this)
                }, rnd.ReStruct.prototype.drawFragments = function() {
                    this.frags.each(function(e, t) {
                        var r = t.draw(this.render, e);
                        r && this.addReObjectPath("data", t.visel, r, null, !0)
                    }, this)
                }, rnd.ReStruct.prototype.drawRGroups = function() {
                    this.rgroups.each(function(e, t) {
                        var r = t.draw(this.render);
                        for (var n in r)
                            for (; r[n].length > 0;) this.addReObjectPath(n, t.visel, r[n].shift(), null, !0)
                    }, this)
                }, rnd.ReStruct.prototype.eachCC = function(e, t, r) {
                    this.connectedComponents.each(function(n, i) {
                        t && this.ccFragmentType.get(n) != t || e.call(r || this, n, i)
                    }, this)
                }, rnd.ReStruct.prototype.getGroupBB = function(e) {
                    var t = {
                        min: null,
                        max: null
                    };
                    return this.eachCC(function(e, r) {
                        t = this.connectedComponentGetBoundingBox(e, r, t)
                    }, e, this), t
                }, rnd.ReStruct.prototype.setHydrogenPos = function() {
                    for (var e in this.atomsChanged) {
                        var t = this.atoms.get(e);
                        if (0 != t.a.neighbors.length) {
                            for (var r = 1, n = 1, i = 0, o = 0, a = 0; a < t.a.neighbors.length; ++a) {
                                var s = this.molecule.halfBonds.get(t.a.neighbors[a]).dir;
                                s.x <= 0 ? (r = Math.min(r, Math.abs(s.y)), i++) : (n = Math.min(n, Math.abs(s.y)), o++)
                            }
                            t.hydrogenOnTheLeft = .51 > r || .51 > n ? r > n : o > i
                        } else {
                            var c = element.getElementByLabel(t.a.label);
                            null != c && (t.hydrogenOnTheLeft = element.get(c).putHydrogenOnTheLeft)
                        }
                    }
                }, rnd.ReStruct.prototype.setImplicitHydrogen = function() {
                    this.molecule.setImplicitHydrogen(util.idList(this.atomsChanged))
                }, rnd.ReLoop = function(e) {
                    this.loop = e, this.visel = new rnd.Visel(rnd.Visel.TYPE.LOOP), this.centre = new Vec2, this.radius = new Vec2
                }, rnd.ReLoop.prototype = new rnd.ReObject, rnd.ReLoop.isSelectable = function() {
                    return !1
                }, rnd.ReStruct.prototype.coordProcess = function(e) {
                    e || this.molecule.rescale()
                }, rnd.ReStruct.prototype.notifyAtomAdded = function(e) {
                    var t = new rnd.ReAtom(this.molecule.atoms.get(e));
                    t.component = this.connectedComponents.add(Set.single(e)), this.atoms.set(e, t), this.markAtom(e, 1)
                }, rnd.ReStruct.prototype.notifyRxnPlusAdded = function(e) {
                    this.rxnPluses.set(e, new rnd.ReRxnPlus(this.molecule.rxnPluses.get(e)))
                }, rnd.ReStruct.prototype.notifyRxnArrowAdded = function(e) {
                    this.rxnArrows.set(e, new rnd.ReRxnArrow(this.molecule.rxnArrows.get(e)))
                }, rnd.ReStruct.prototype.notifyRxnArrowRemoved = function(e) {
                    this.markItemRemoved(), this.clearVisel(this.rxnArrows.get(e).visel), this.rxnArrows.unset(e)
                }, rnd.ReStruct.prototype.notifyRxnPlusRemoved = function(e) {
                    this.markItemRemoved(), this.clearVisel(this.rxnPluses.get(e).visel), this.rxnPluses.unset(e)
                }, rnd.ReStruct.prototype.notifyBondAdded = function(e) {
                    this.bonds.set(e, new rnd.ReBond(this.molecule.bonds.get(e))), this.markBond(e, 1)
                }, rnd.ReStruct.prototype.notifyAtomRemoved = function(e) {
                    var t = this.atoms.get(e),
                        r = this.connectedComponents.get(t.component);
                    Set.remove(r, e), 0 == Set.size(r) && this.connectedComponents.remove(t.component), this.clearVisel(t.visel), this.atoms.unset(e), this.markItemRemoved()
                }, rnd.ReStruct.prototype.notifyBondRemoved = function(e) {
                    var t = this.bonds.get(e);
                    [t.b.hb1, t.b.hb2].each(function(e) {
                        var t = this.molecule.halfBonds.get(e);
                        t.loop >= 0 && this.loopRemove(t.loop)
                    }, this), this.clearVisel(t.visel), this.bonds.unset(e), this.markItemRemoved()
                }, rnd.ReStruct.prototype.loopRemove = function(e) {
                    if (this.reloops.has(e)) {
                        var t = this.reloops.get(e);
                        this.clearVisel(t.visel);
                        for (var r = [], n = 0; n < t.loop.hbs.length; ++n) {
                            var i = t.loop.hbs[n];
                            if (this.molecule.halfBonds.has(i)) {
                                var o = this.molecule.halfBonds.get(i);
                                o.loop = -1, this.markBond(o.bid, 1), this.markAtom(o.begin, 1), r.push(o.bid)
                            }
                        }
                        this.reloops.unset(e), this.molecule.loops.remove(e)
                    }
                }, rnd.ReStruct.prototype.loopIsValid = function(e, t) {
                    var r = this.molecule.halfBonds,
                        n = t.loop,
                        i = !1;
                    return n.hbs.each(function(t) {
                        r.has(t) && r.get(t).loop === e || (i = !0)
                    }, this), !i
                }, rnd.ReStruct.prototype.verifyLoops = function() {
                    var e = [];
                    this.reloops.each(function(t, r) {
                        this.loopIsValid(t, r) || e.push(t)
                    }, this);
                    for (var t = 0; t < e.length; ++t) this.loopRemove(e[t])
                }, rnd.ReStruct.prototype.BFS = function(e, t, r) {
                    t -= 0;
                    var n = new Array,
                        i = {};
                    for (n.push(t), i[t] = 1; n.length > 0;) {
                        var o = n.shift();
                        e.call(r, o);
                        for (var a = this.atoms.get(o), s = 0; s < a.a.neighbors.length; ++s) {
                            var c = a.a.neighbors[s],
                                l = this.molecule.halfBonds.get(c);
                            i[l.end] || (i[l.end] = 1, n.push(l.end))
                        }
                    }
                }, rnd.ReRxnPlus = function(e) {
                    this.init(rnd.Visel.TYPE.PLUS), this.item = e
                }, rnd.ReRxnPlus.prototype = new rnd.ReObject, rnd.ReRxnPlus.isSelectable = function() {
                    return !0
                }, rnd.ReRxnPlus.findClosest = function(e, t) {
                    var r, n;
                    return e.ctab.rxnPluses.each(function(e, i) {
                        var o = i.item.pp,
                            a = Math.max(Math.abs(t.x - o.x), Math.abs(t.y - o.y));.5 > a && (!n || r > a) && (r = a, n = {
                            id: e,
                            dist: r
                        })
                    }), n
                }, rnd.ReRxnPlus.prototype.highlightPath = function(e) {
                    var t = e.ps(this.item.pp),
                        r = e.settings.scaleFactor;
                    return e.paper.rect(t.x - r / 4, t.y - r / 4, r / 2, r / 2, r / 8)
                }, rnd.ReRxnPlus.prototype.drawHighlight = function(e) {
                    var t = this.highlightPath(e).attr(e.styles.highlightStyle);
                    return e.ctab.addReObjectPath("highlighting", this.visel, t), t
                }, rnd.ReRxnPlus.prototype.makeSelectionPlate = function(e, t, r) {
                    return this.highlightPath(e.render).attr(r.selectionStyle)
                }, rnd.ReRxnArrow = function(e) {
                    this.init(rnd.Visel.TYPE.ARROW), this.item = e
                }, rnd.ReRxnArrow.prototype = new rnd.ReObject, rnd.ReRxnArrow.isSelectable = function() {
                    return !0
                }, rnd.ReRxnArrow.findClosest = function(e, t) {
                    var r, n;
                    return e.ctab.rxnArrows.each(function(e, i) {
                        var o = i.item.pp;
                        if (Math.abs(t.x - o.x) < 1) {
                            var a = Math.abs(t.y - o.y);.3 > a && (!n || r > a) && (r = a, n = {
                                id: e,
                                dist: r
                            })
                        }
                    }), n
                }, rnd.ReRxnArrow.prototype.highlightPath = function(e) {
                    var t = e.ps(this.item.pp),
                        r = e.settings.scaleFactor;
                    return e.paper.rect(t.x - r, t.y - r / 4, 2 * r, r / 2, r / 8)
                }, rnd.ReRxnArrow.prototype.drawHighlight = function(e) {
                    var t = this.highlightPath(e).attr(e.styles.highlightStyle);
                    return e.ctab.addReObjectPath("highlighting", this.visel, t), t
                }, rnd.ReRxnArrow.prototype.makeSelectionPlate = function(e, t, r) {
                    return this.highlightPath(e.render).attr(r.selectionStyle)
                }, rnd.ReFrag = function(e) {
                    this.init(rnd.Visel.TYPE.FRAGMENT), this.item = e
                }, rnd.ReFrag.prototype = new rnd.ReObject, rnd.ReFrag.isSelectable = function() {
                    return !1
                }, rnd.ReFrag.findClosest = function(e, t, r, n) {
                    n = Math.min(n || e.opt.selectionDistanceCoefficient, e.opt.selectionDistanceCoefficient);
                    var i;
                    return e.ctab.frags.each(function(o, a) {
                        if (o != r) {
                            var s = a.calcBBox(e, o);
                            if (s.p0.y < t.y && s.p1.y > t.y && s.p0.x < t.x && s.p1.x > t.x) {
                                var c = Math.min(Math.abs(s.p0.x - t.x), Math.abs(s.p1.x - t.x));
                                (!i || n > c) && (n = c, i = {
                                    id: o,
                                    dist: n
                                })
                            }
                        }
                    }), i
                }, rnd.ReFrag.prototype.fragGetAtoms = function(e, t) {
                    var r = [];
                    return e.ctab.atoms.each(function(e, n) {
                        n.a.fragment == t && r.push(e)
                    }, this), r
                }, rnd.ReFrag.prototype.fragGetBonds = function(e, t) {
                    var r = [];
                    return e.ctab.bonds.each(function(n, i) {
                        e.ctab.atoms.get(i.b.begin).a.fragment == t && e.ctab.atoms.get(i.b.end).a.fragment == t && r.push(n)
                    }, this), r
                }, rnd.ReFrag.prototype.calcBBox = function(e, t) {
                    var r;
                    return e.ctab.atoms.each(function(n, i) {
                        if (i.a.fragment == t) {
                            var o = i.visel.boundingBox;
                            if (o) o = o.translate((e.offset || new Vec2).negated()).transform(e.scaled2obj, e);
                            else {
                                o = new Box2Abs(i.a.pp, i.a.pp);
                                var a = new Vec2(.05 * 3, .05 * 3);
                                o = o.extend(a, a)
                            }
                            r = r ? Box2Abs.union(r, o) : o
                        }
                    }, this), r
                }, rnd.ReFrag.prototype._draw = function(e, t, r) {
                    var n = this.calcBBox(e, t);
                    if (n) {
                        var i = e.obj2scaled(new Vec2(n.p0.x, n.p0.y)),
                            o = e.obj2scaled(new Vec2(n.p1.x, n.p1.y));
                        return e.paper.rect(i.x, i.y, o.x - i.x, o.y - i.y, 0).attr(r)
                    }
                }, rnd.ReFrag.prototype.draw = function() {
                    return null
                }, rnd.ReFrag.prototype.drawHighlight = function() {}, rnd.ReFrag.prototype.setHighlight = function(e, t) {
                    var r = t.ctab.frags.keyOf(this);
                    Object.isUndefined(r) || (t.ctab.atoms.each(function(n, i) {
                        i.a.fragment == r && i.setHighlight(e, t)
                    }, this), t.ctab.bonds.each(function(n, i) {
                        t.ctab.atoms.get(i.b.begin).a.fragment == r && i.setHighlight(e, t)
                    }, this))
                }, rnd.ReRGroup = function(e) {
                    this.init(rnd.Visel.TYPE.RGROUP), this.labelBox = null, this.item = e
                }, rnd.ReRGroup.prototype = new rnd.ReObject, rnd.ReRGroup.isSelectable = function() {
                    return !1
                }, rnd.ReRGroup.prototype.getAtoms = function(e) {
                    var t = [];
                    return this.item.frags.each(function(r, n) {
                        t = t.concat(e.ctab.frags.get(n).fragGetAtoms(e, n))
                    }), t
                }, rnd.ReRGroup.prototype.getBonds = function(e) {
                    var t = [];
                    return this.item.frags.each(function(r, n) {
                        t = t.concat(e.ctab.frags.get(n).fragGetBonds(e, n))
                    }), t
                }, rnd.ReRGroup.findClosest = function(e, t, r, n) {
                    n = Math.min(n || e.opt.selectionDistanceCoefficient, e.opt.selectionDistanceCoefficient);
                    var i;
                    return e.ctab.rgroups.each(function(e, o) {
                        if (e != r && o.labelBox && o.labelBox.contains(t, .5)) {
                            var a = Vec2.dist(o.labelBox.centre(), t);
                            (!i || n > a) && (n = a, i = {
                                id: e,
                                dist: n
                            })
                        }
                    }), i
                }, rnd.ReRGroup.prototype.calcBBox = function(e) {
                    var t;
                    return this.item.frags.each(function(r, n) {
                        var i = e.ctab.frags.get(n).calcBBox(e, n);
                        i && (t = t ? Box2Abs.union(t, i) : i)
                    }), t = t.extend(this.__ext, this.__ext)
                }, rnd.ReRGroup.drawBrackets = function(e, t, r, n) {
                    n = n || new Vec2(1, 0);
                    var i = Math.min(.25, .3 * r.sz().x),
                        o = r.p1.y - r.p0.y,
                        a = .5 * (r.p1.y + r.p0.y),
                        s = chem.SGroup.drawBracket(t, t.paper, t.styles, n.negated(), n.negated().rotateSC(1, 0), new Vec2(r.p0.x, a), i, o),
                        c = chem.SGroup.drawBracket(t, t.paper, t.styles, n, n.rotateSC(1, 0), new Vec2(r.p1.x, a), i, o);
                    e.push(s, c)
                }, rnd.ReRGroup.prototype.draw = function(e) {
                    var t = this.calcBBox(e),
                        r = e.settings;
                    if (t) {
                        var n = {
                                data: []
                            },
                            i = e.obj2scaled(t.p0),
                            o = e.obj2scaled(t.p1),
                            a = e.paper.set();
                        rnd.ReRGroup.drawBrackets(a, e, t), n.data.push(a);
                        var s = e.ctab.rgroups.keyOf(this),
                            c = e.paper.set(),
                            l = e.paper.text(i.x, (i.y + o.y) / 2, "R" + s + "=").attr({
                                font: r.font,
                                "font-size": r.fontRLabel,
                                fill: "black"
                            }),
                            u = rnd.relBox(l.getBBox());
                        l.translateAbs(-u.width / 2 - r.lineWidth, 0), c.push(l);
                        var h = {
                                font: r.font,
                                "font-size": r.fontRLogic,
                                fill: "black"
                            },
                            d = [];
                        d.push((this.item.ifthen > 0 ? "IF " : "") + "R" + s.toString() + (this.item.range.length > 0 ? this.item.range.startsWith(">") || this.item.range.startsWith("<") || this.item.range.startsWith("=") ? this.item.range : "=" + this.item.range : ">0") + (this.item.resth ? " (RestH)" : "") + (this.item.ifthen > 0 ? "\nTHEN R" + this.item.ifthen.toString() : ""));
                        for (var p = u.height / 2 + r.lineWidth / 2, m = 0; m < d.length; ++m) {
                            var f = e.paper.text(i.x, (i.y + o.y) / 2, d[m]).attr(h),
                                g = rnd.relBox(f.getBBox());
                            p += g.height / 2, f.translateAbs(-g.width / 2 - 6 * r.lineWidth, p), p += g.height / 2 + r.lineWidth / 2, n.data.push(f), c.push(f)
                        }
                        return n.data.push(l), this.labelBox = Box2Abs.fromRelBox(c.getBBox()).transform(e.scaled2obj, e), n
                    }
                    return {}
                }, rnd.ReRGroup.prototype._draw = function(e, t, r) {
                    var n = this.getVBoxObj(e).extend(this.__ext, this.__ext);
                    if (n) {
                        var i = e.obj2scaled(n.p0),
                            o = e.obj2scaled(n.p1);
                        return e.paper.rect(i.x, i.y, o.x - i.x, o.y - i.y, 0).attr(r)
                    }
                }, rnd.ReRGroup.prototype.drawHighlight = function(e) {
                    var t = e.ctab.rgroups.keyOf(this);
                    if (!Object.isUndefined(t)) {
                        var r = this._draw(e, t, e.styles.highlightStyle);
                        return e.ctab.addReObjectPath("highlighting", this.visel, r), this.item.frags.each(function(t, r) {
                            e.ctab.frags.get(r).drawHighlight(e)
                        }, this), r
                    }
                }, rnd.ReSGroup = function(e) {
                    this.init(rnd.Visel.TYPE.SGROUP), this.item = e
                }, rnd.ReSGroup.prototype = new rnd.ReObject, rnd.ReSGroup.isSelectable = function() {
                    return !1
                }, rnd.ReSGroup.findClosest = function(e, t) {
                    var r = null,
                        n = e.opt.selectionDistanceCoefficient;
                    return e.ctab.molecule.sgroups.each(function(e, i) {
                        for (var o = i.bracketDir, a = o.rotateSC(1, 0), s = new Vec2(Vec2.dot(t, o), Vec2.dot(t, a)), c = 0; c < i.areas.length; ++c) {
                            var l = i.areas[c],
                                u = l.p0.y < s.y && l.p1.y > s.y && l.p0.x < s.x && l.p1.x > s.x,
                                h = Math.min(Math.abs(l.p0.x - s.x), Math.abs(l.p1.x - s.x));
                            u && (null == r || n > h) && (r = e, n = h)
                        }
                    }, this), null != r ? {
                        id: r,
                        dist: n
                    } : null
                }, rnd.ReSGroup.prototype.draw = function(e) {
                    return this.item.draw(e.ctab)
                }, rnd.ReSGroup.prototype.drawHighlight = function(e) {
                    var t = e.styles,
                        r = e.settings,
                        n = e.paper,
                        i = this.item,
                        o = i.bracketBox.transform(e.obj2scaled, e),
                        a = r.lineWidth,
                        s = new Vec2(4 * a, 6 * a);
                    o = o.extend(s, s);
                    var c = i.bracketDir,
                        l = c.rotateSC(1, 0),
                        u = Vec2.lc2(c, o.p0.x, l, o.p0.y),
                        h = Vec2.lc2(c, o.p0.x, l, o.p1.y),
                        d = Vec2.lc2(c, o.p1.x, l, o.p0.y),
                        p = Vec2.lc2(c, o.p1.x, l, o.p1.y),
                        m = n.set();
                    i.highlighting = n.path("M{0},{1}L{2},{3}L{4},{5}L{6},{7}L{0},{1}", tfx(u.x), tfx(u.y), tfx(h.x), tfx(h.y), tfx(p.x), tfx(p.y), tfx(d.x), tfx(d.y)).attr(t.highlightStyle), m.push(i.highlighting), chem.SGroup.getAtoms(e.ctab.molecule, i).each(function(t) {
                        m.push(e.ctab.atoms.get(t).makeHighlightPlate(e))
                    }, this), chem.SGroup.getBonds(e.ctab.molecule, i).each(function(t) {
                        m.push(e.ctab.bonds.get(t).makeHighlightPlate(e))
                    }, this), e.ctab.addReObjectPath("highlighting", this.visel, m)
                }, rnd.ReDataSGroupData = function(e) {
                    this.init(rnd.Visel.TYPE.SGROUP_DATA), this.sgroup = e
                }, rnd.ReDataSGroupData.prototype = new rnd.ReObject, rnd.ReDataSGroupData.isSelectable = function() {
                    return !0
                }, rnd.ReDataSGroupData.findClosest = function(e, t) {
                    var r = null,
                        n = null;
                    return e.ctab.sgroupData.each(function(e, i) {
                        if ("DAT" != i.sgroup.type) throw new Error("Data group expected");
                        var o = i.sgroup.dataArea,
                            a = o.p0.y < t.y && o.p1.y > t.y && o.p0.x < t.x && o.p1.x > t.x,
                            s = Math.min(Math.abs(o.p0.x - t.x), Math.abs(o.p1.x - t.x));
                        a && (null == n || r > s) && (n = {
                            id: e,
                            dist: s
                        }, r = s)
                    }), n
                }, rnd.ReDataSGroupData.prototype.highlightPath = function(e) {
                    var t = this.sgroup.dataArea,
                        r = e.obj2scaled(t.p0),
                        n = e.obj2scaled(t.p1).sub(r);
                    return e.paper.rect(r.x, r.y, n.x, n.y)
                }, rnd.ReDataSGroupData.prototype.drawHighlight = function(e) {
                    var t = this.highlightPath(e).attr(e.styles.highlightStyle);
                    return e.ctab.addReObjectPath("highlighting", this.visel, t), t
                }, rnd.ReDataSGroupData.prototype.makeSelectionPlate = function(e, t, r) {
                    return this.highlightPath(e.render).attr(r.selectionStyle)
                }, rnd.ReChiralFlag = function(e) {
                    this.init(rnd.Visel.TYPE.CHIRAL_FLAG), this.pp = e
                }, rnd.ReChiralFlag.prototype = new rnd.ReObject, rnd.ReChiralFlag.isSelectable = function() {
                    return !0
                }, rnd.ReChiralFlag.findClosest = function(e, t) {
                    var r, n;
                    return e.ctab.chiralFlags.each(function(e, i) {
                        var o = i.pp;
                        if (Math.abs(t.x - o.x) < 1) {
                            var a = Math.abs(t.y - o.y);.3 > a && (!n || r > a) && (r = a, n = {
                                id: e,
                                dist: r
                            })
                        }
                    }), n
                }, rnd.ReChiralFlag.prototype.highlightPath = function(e) {
                    var t = Box2Abs.fromRelBox(this.path.getBBox()),
                        r = t.p1.sub(t.p0),
                        n = t.p0.sub(e.offset);
                    return e.paper.rect(n.x, n.y, r.x, r.y)
                }, rnd.ReChiralFlag.prototype.drawHighlight = function(e) {
                    var t = this.highlightPath(e).attr(e.styles.highlightStyle);
                    return e.ctab.addReObjectPath("highlighting", this.visel, t), t
                }, rnd.ReChiralFlag.prototype.makeSelectionPlate = function(e, t, r) {
                    return this.highlightPath(e.render).attr(r.selectionStyle)
                }, rnd.ReChiralFlag.prototype.draw = function(e) {
                    var t = e.paper,
                        r = e.settings,
                        n = e.ps(this.pp);
                    this.path = t.text(n.x, n.y, "Chiral").attr({
                        font: r.font,
                        "font-size": r.fontsz,
                        fill: "#000"
                    }), e.ctab.addReObjectPath("data", this.visel, this.path, null, !0)
                }, rnd.ReStruct.maps = {
                    atoms: rnd.ReAtom,
                    bonds: rnd.ReBond,
                    rxnPluses: rnd.ReRxnPlus,
                    rxnArrows: rnd.ReRxnArrow,
                    frags: rnd.ReFrag,
                    rgroups: rnd.ReRGroup,
                    sgroupData: rnd.ReDataSGroupData,
                    chiralFlags: rnd.ReChiralFlag,
                    sgroups: rnd.ReSGroup,
                    reloops: rnd.ReLoop
                };

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../chem": 11,
            "../chem/element": 10,
            "../util": 39,
            "../util/box2abs": 38,
            "../util/map": 40,
            "../util/pool": 41,
            "../util/set": 42,
            "../util/vec2": 43
        }],
        24: [function(require, module, exports) {
            (function(global) {
                var Box2Abs = require("../util/box2abs"),
                    Vec2 = require("../util/vec2"),
                    util = require("../util"),
                    element = require("../chem/element");
                require("./restruct");
                var rnd = global.rnd = global.rnd || {},
                    tfx = util.tfx;
                rnd.relBox = function(t) {
                    return {
                        x: t.x,
                        y: t.y,
                        width: t.width,
                        height: t.height
                    }
                }, rnd.ReStruct.prototype.drawArrow = function(t, e) {
                    var r = 5,
                        n = 7,
                        o = this.render.paper,
                        i = this.render.styles;
                    return o.path("M{0},{1}L{2},{3}L{4},{5}M{2},{3}L{4},{6}", tfx(t.x), tfx(t.y), tfx(e.x), tfx(e.y), tfx(e.x - n), tfx(e.y - r), tfx(e.y + r)).attr(i.lineattr)
                }, rnd.ReStruct.prototype.drawPlus = function(t) {
                    var e = this.render.scale / 5,
                        r = this.render.paper,
                        n = this.render.styles;
                    return r.path("M{0},{4}L{0},{5}M{2},{1}L{3},{1}", tfx(t.x), tfx(t.y), tfx(t.x - e), tfx(t.x + e), tfx(t.y - e), tfx(t.y + e)).attr(n.lineattr)
                }, rnd.ReStruct.prototype.drawBondSingle = function(t, e) {
                    var r = t.p,
                        n = e.p,
                        o = this.render.paper,
                        i = this.render.styles;
                    return o.path(rnd.ReStruct.makeStroke(r, n)).attr(i.lineattr)
                }, rnd.ReStruct.prototype.drawBondSingleUp = function(t, e, r) {
                    var n = t.p,
                        o = e.p,
                        i = t.norm,
                        s = this.render.settings,
                        a = this.render.paper,
                        l = this.render.styles,
                        d = .7 * s.bondSpace,
                        c = o.addScaled(i, d),
                        h = o.addScaled(i, -d);
                    if (r.neihbid2 >= 0) {
                        var u = this.stereoUpBondGetCoordinates(e, r.neihbid2);
                        c = u[0], h = u[1]
                    }
                    return a.path("M{0},{1}L{2},{3}L{4},{5}Z", tfx(n.x), tfx(n.y), tfx(c.x), tfx(c.y), tfx(h.x), tfx(h.y)).attr(l.lineattr).attr({
                        fill: "#000"
                    })
                }, rnd.ReStruct.prototype.drawVec = function(t, e, r, n) {
                    var o = this.render.settings,
                        i = this.render.paper,
                        s = this.render.styles,
                        a = o.bondSpace,
                        l = t.addScaled(e, n || 3 * a);
                    return i.path("M{0},{1}L{2},{3}", tfx(t.x), tfx(t.y), tfx(l.x), tfx(l.y)).attr(s.lineattr).attr({
                        stroke: r || "#0F0"
                    })
                }, rnd.ReStruct.prototype.stereoUpBondGetCoordinates = function(t, e) {
                    var r = this.render.settings.bondSpace,
                        n = this.molecule.halfBonds.get(e),
                        o = Vec2.dot(t.dir, n.dir),
                        i = Vec2.cross(t.dir, n.dir),
                        s = Math.sqrt(.5 * (1 - o)),
                        a = n.dir.rotateSC((i >= 0 ? -1 : 1) * s, Math.sqrt(.5 * (1 + o))),
                        l = .3,
                        d = .7,
                        c = t.p.addScaled(a, d * r / (s + l)),
                        h = t.p.addScaled(a.negated(), d * r / (s + l));
                    return i > 0 ? [c, h] : [h, c]
                }, rnd.ReStruct.prototype.drawBondSingleStereoBold = function(t, e, r, n) {
                    var o = this.render.paper,
                        i = this.render.settings,
                        s = this.render.styles,
                        a = this.stereoUpBondGetCoordinates(t, r.neihbid1),
                        l = this.stereoUpBondGetCoordinates(e, r.neihbid2),
                        d = a[0],
                        c = a[1],
                        h = l[0],
                        u = l[1],
                        p = o.path("M{0},{1}L{2},{3}L{4},{5}L{6},{7}Z", tfx(d.x), tfx(d.y), tfx(c.x), tfx(c.y), tfx(h.x), tfx(h.y), tfx(u.x), tfx(u.y)).attr(s.lineattr).attr({
                            stroke: "#000",
                            fill: "#000"
                        });
                    if (n) {
                        var m = t.p,
                            f = e.p,
                            g = t.norm,
                            b = r.doubleBondShift,
                            v = 1.5 * i.bondSpace,
                            S = m.addScaled(g, v * b),
                            y = f.addScaled(g, v * b),
                            x = !this.atoms.get(t.begin).showLabel,
                            w = !this.atoms.get(e.begin).showLabel;
                        return b > 0 ? (x && (S = S.addScaled(t.dir, v * this.getBondLineShift(t.rightCos, t.rightSin))), w && (y = y.addScaled(t.dir, -v * this.getBondLineShift(e.leftCos, e.leftSin)))) : 0 > b && (x && (S = S.addScaled(t.dir, v * this.getBondLineShift(t.leftCos, t.leftSin))), w && (y = y.addScaled(t.dir, -v * this.getBondLineShift(e.rightCos, e.rightSin)))), o.set([p, o.path("M{0},{1}L{2},{3}", tfx(S.x), tfx(S.y), tfx(y.x), tfx(y.y)).attr(s.lineattr)])
                    }
                    return p
                }, rnd.ReStruct.prototype.drawBondSingleDown = function(t, e) {
                    var r = t.p,
                        n = e.p,
                        o = t.norm,
                        i = this.render.settings,
                        s = this.render.paper,
                        a = this.render.styles,
                        l = .7 * i.bondSpace,
                        d = n.sub(r),
                        c = d.length() + .2;
                    d = d.normalized();
                    for (var h, u, p = 1.2 * i.lineWidth, m = Math.max(Math.floor((c - i.lineWidth) / (i.lineWidth + p)), 0) + 2, f = c / (m - 1), g = "", b = r, v = 0; m > v; ++v) b = r.addScaled(d, f * v), h = b.addScaled(o, l * (v + .5) / (m - .5)), u = b.addScaled(o, -l * (v + .5) / (m - .5)), g += rnd.ReStruct.makeStroke(h, u);
                    return s.path(g).attr(a.lineattr)
                }, rnd.ReStruct.prototype.drawBondSingleEither = function(t, e) {
                    var r = t.p,
                        n = e.p,
                        o = t.norm,
                        i = this.render.settings,
                        s = this.render.paper,
                        a = this.render.styles,
                        l = .7 * i.bondSpace,
                        d = n.sub(r),
                        c = d.length();
                    d = d.normalized();
                    for (var h = .6 * i.lineWidth, u = Math.max(Math.floor((c - i.lineWidth) / (i.lineWidth + h)), 0) + 2, p = c / (u - .5), m = "M" + tfx(r.x) + "," + tfx(r.y), f = r, g = 0; u > g; ++g) f = r.addScaled(d, p * (g + .5)).addScaled(o, (1 & g ? -1 : 1) * l * (g + .5) / (u - .5)), m += "L" + tfx(f.x) + "," + tfx(f.y);
                    return s.path(m).attr(a.lineattr)
                }, rnd.ReStruct.prototype.getBondLineShift = function(t, e) {
                    return 0 > e || Math.abs(t) > .9 ? 0 : e / (1 - t)
                }, rnd.ReStruct.prototype.drawBondDouble = function(t, e, r, n) {
                    var o = t.p,
                        i = e.p,
                        s = t.norm,
                        a = n ? 0 : r.doubleBondShift,
                        l = this.render.settings,
                        d = this.render.paper,
                        c = this.render.styles,
                        h = l.bondSpace / 2,
                        u = h,
                        p = -h;
                    u += a * h, p += a * h;
                    var m = o.addScaled(s, u),
                        f = i.addScaled(s, u),
                        g = o.addScaled(s, p),
                        b = i.addScaled(s, p),
                        v = !this.atoms.get(t.begin).showLabel,
                        S = !this.atoms.get(e.begin).showLabel;
                    return a > 0 ? (v && (m = m.addScaled(t.dir, l.bondSpace * this.getBondLineShift(t.rightCos, t.rightSin))), S && (f = f.addScaled(t.dir, -l.bondSpace * this.getBondLineShift(e.leftCos, e.leftSin)))) : 0 > a && (v && (g = g.addScaled(t.dir, l.bondSpace * this.getBondLineShift(t.leftCos, t.leftSin))), S && (b = b.addScaled(t.dir, -l.bondSpace * this.getBondLineShift(e.rightCos, e.rightSin)))), d.path(n ? "M{0},{1}L{6},{7}M{4},{5}L{2},{3}" : "M{0},{1}L{2},{3}M{4},{5}L{6},{7}", tfx(m.x), tfx(m.y), tfx(f.x), tfx(f.y), tfx(g.x), tfx(g.y), tfx(b.x), tfx(b.y)).attr(c.lineattr)
                }, rnd.ReStruct.makeStroke = function(t, e) {
                    return "M" + tfx(t.x) + "," + tfx(t.y) + "L" + tfx(e.x) + "," + tfx(e.y) + "	"
                }, rnd.ReStruct.prototype.drawBondSingleOrDouble = function(t, e) {
                    var r = t.p,
                        n = e.p,
                        o = t.norm,
                        i = this.render,
                        s = i.settings,
                        a = i.paper,
                        l = i.styles,
                        d = s.bondSpace / 2,
                        c = (Vec2.dist(r, n) / (s.bondSpace + s.lineWidth)).toFixed() - 0;
                    1 & c || (c += 1);
                    for (var h = "", u = r, p = 1; c >= p; ++p) {
                        var m = Vec2.lc2(r, (c - p) / c, n, p / c);
                        1 & p ? h += rnd.ReStruct.makeStroke(u, m) : (h += rnd.ReStruct.makeStroke(u.addScaled(o, d), m.addScaled(o, d)), h += rnd.ReStruct.makeStroke(u.addScaled(o, -d), m.addScaled(o, -d))), u = m
                    }
                    return a.path(h).attr(l.lineattr)
                }, rnd.ReStruct.prototype.drawBondTriple = function(t, e) {
                    var r = t.p,
                        n = e.p,
                        o = t.norm,
                        i = this.render,
                        s = i.settings,
                        a = i.paper,
                        l = i.styles,
                        d = r.addScaled(o, s.bondSpace),
                        c = n.addScaled(o, s.bondSpace),
                        h = r.addScaled(o, -s.bondSpace),
                        u = n.addScaled(o, -s.bondSpace);
                    return a.path(rnd.ReStruct.makeStroke(r, n) + rnd.ReStruct.makeStroke(d, c) + rnd.ReStruct.makeStroke(h, u)).attr(l.lineattr)
                }, rnd.dashedPath = function(t, e, r) {
                    for (var n = 0, o = Vec2.dist(t, e), i = Vec2.diff(e, t).normalized(), s = !0, a = "", l = 0; o > n;) {
                        var d = r[l % r.length],
                            c = n + Math.min(d, o - n);
                        s && (a += "M " + t.addScaled(i, n).coordStr() + " L " + t.addScaled(i, c).coordStr()), n += d, s = !s, l++
                    }
                    return a
                }, rnd.ReStruct.prototype.drawBondAromatic = function(t, e, r, n) {
                    if (!n) return this.drawBondSingle(t, e);
                    var o = r.doubleBondShift,
                        i = this.render.paper,
                        s = this.preparePathsForAromaticBond(t, e, o),
                        a = s[0],
                        l = s[1];
                    return (o > 0 ? a : l).attr({
                        "stroke-dasharray": "- "
                    }), i.set([a, l])
                }, rnd.dashdotPattern = [.125, .125, .005, .125], rnd.ReStruct.prototype.drawBondSingleOrAromatic = function(t, e, r) {
                    var n = r.doubleBondShift,
                        o = this.render.paper,
                        i = this.render.settings.scaleFactor,
                        s = util.map(rnd.dashdotPattern, function(t) {
                            return t * i
                        }),
                        a = this.preparePathsForAromaticBond(t, e, n, n > 0 ? 1 : 2, s),
                        l = a[0],
                        d = a[1];
                    return o.set([l, d])
                }, rnd.ReStruct.prototype.preparePathsForAromaticBond = function(t, e, r, n, o) {
                    var i = this.render.settings,
                        s = this.render.paper,
                        a = this.render.styles,
                        l = t.p,
                        d = e.p,
                        c = t.norm,
                        h = i.bondSpace / 2,
                        u = h,
                        p = -h;
                    u += r * h, p += r * h;
                    var m = l.addScaled(c, u),
                        f = d.addScaled(c, u),
                        g = l.addScaled(c, p),
                        b = d.addScaled(c, p),
                        v = !this.atoms.get(t.begin).showLabel,
                        S = !this.atoms.get(e.begin).showLabel;
                    r > 0 ? (v && (m = m.addScaled(t.dir, i.bondSpace * this.getBondLineShift(t.rightCos, t.rightSin))), S && (f = f.addScaled(t.dir, -i.bondSpace * this.getBondLineShift(e.leftCos, e.leftSin)))) : 0 > r && (v && (g = g.addScaled(t.dir, i.bondSpace * this.getBondLineShift(t.leftCos, t.leftSin))), S && (b = b.addScaled(t.dir, -i.bondSpace * this.getBondLineShift(e.rightCos, e.rightSin))));
                    var y = s.path(o && 1 & n ? rnd.dashedPath(m, f, o) : rnd.ReStruct.makeStroke(m, f)).attr(a.lineattr),
                        x = s.path(o && 2 & n ? rnd.dashedPath(g, b, o) : rnd.ReStruct.makeStroke(g, b)).attr(a.lineattr);
                    return [y, x]
                }, rnd.ReStruct.prototype.drawBondDoubleOrAromatic = function(t, e, r) {
                    var n = r.doubleBondShift,
                        o = this.render.paper,
                        i = this.render.settings.scaleFactor,
                        s = util.map(rnd.dashdotPattern, function(t) {
                            return t * i
                        }),
                        a = this.preparePathsForAromaticBond(t, e, n, 3, s),
                        l = a[0],
                        d = a[1];
                    return o.set([l, d])
                }, rnd.ReStruct.prototype.drawBondAny = function(t, e) {
                    var r = t.p,
                        n = e.p,
                        o = this.render.paper,
                        i = this.render.styles;
                    return o.path(rnd.ReStruct.makeStroke(r, n)).attr(i.lineattr).attr({
                        "stroke-dasharray": "- "
                    })
                }, rnd.ReStruct.prototype.drawReactingCenter = function(t, e, r) {
                    var n = e.p,
                        o = r.p,
                        i = o.add(n).scaled(.5),
                        s = o.sub(n).normalized(),
                        a = s.rotateSC(1, 0),
                        l = this.render.paper,
                        d = this.render.styles,
                        c = this.render.settings,
                        h = [],
                        u = c.lineWidth,
                        p = c.bondSpace / 2,
                        m = u,
                        f = 2 * u,
                        g = 1.5 * p,
                        b = 1.5 * p,
                        v = 3 * p,
                        S = .2;
                    switch (t.b.reactingCenterStatus) {
                        case chem.Struct.BOND.REACTING_CENTER.NOT_CENTER:
                            h.push(i.addScaled(a, v).addScaled(s, S * v)), h.push(i.addScaled(a, -v).addScaled(s, -S * v)), h.push(i.addScaled(a, v).addScaled(s, -S * v)), h.push(i.addScaled(a, -v).addScaled(s, S * v));
                            break;
                        case chem.Struct.BOND.REACTING_CENTER.CENTER:
                            h.push(i.addScaled(a, v).addScaled(s, S * v).addScaled(s, m)), h.push(i.addScaled(a, -v).addScaled(s, -S * v).addScaled(s, m)), h.push(i.addScaled(a, v).addScaled(s, S * v).addScaled(s, -m)), h.push(i.addScaled(a, -v).addScaled(s, -S * v).addScaled(s, -m)), h.push(i.addScaled(s, g).addScaled(a, b)), h.push(i.addScaled(s, -g).addScaled(a, b)), h.push(i.addScaled(s, g).addScaled(a, -b)), h.push(i.addScaled(s, -g).addScaled(a, -b));
                            break;
                        case chem.Struct.BOND.REACTING_CENTER.MADE_OR_BROKEN:
                            h.push(i.addScaled(a, v).addScaled(s, f)), h.push(i.addScaled(a, -v).addScaled(s, f)), h.push(i.addScaled(a, v).addScaled(s, -f)), h.push(i.addScaled(a, -v).addScaled(s, -f));
                            break;
                        case chem.Struct.BOND.REACTING_CENTER.ORDER_CHANGED:
                            h.push(i.addScaled(a, v)), h.push(i.addScaled(a, -v));
                            break;
                        case chem.Struct.BOND.REACTING_CENTER.MADE_OR_BROKEN_AND_CHANGED:
                            h.push(i.addScaled(a, v).addScaled(s, f)), h.push(i.addScaled(a, -v).addScaled(s, f)), h.push(i.addScaled(a, v).addScaled(s, -f)), h.push(i.addScaled(a, -v).addScaled(s, -f)), h.push(i.addScaled(a, v)), h.push(i.addScaled(a, -v));
                            break;
                        default:
                            return null
                    }
                    for (var y = "", x = 0; x < h.length / 2; ++x) y += rnd.ReStruct.makeStroke(h[2 * x], h[2 * x + 1]);
                    return l.path(y).attr(d.lineattr)
                }, rnd.ReStruct.prototype.drawTopologyMark = function(t, e, r) {
                    var n = null;
                    if (t.b.topology == chem.Struct.BOND.TOPOLOGY.RING) n = "rng";
                    else {
                        if (t.b.topology != chem.Struct.BOND.TOPOLOGY.CHAIN) return null;
                        n = "chn"
                    }
                    var o = this.render.paper,
                        i = this.render.settings,
                        s = e.p,
                        a = r.p,
                        l = a.add(s).scaled(.5),
                        d = a.sub(s).normalized(),
                        c = d.rotateSC(1, 0),
                        h = i.lineWidth;
                    t.doubleBondShift > 0 ? c = c.scaled(-t.doubleBondShift) : 0 == t.doubleBondShift && (h += i.bondSpace / 2);
                    var u = new Vec2(2, 1).scaled(i.bondSpace);
                    t.b.type == chem.Struct.BOND.TYPE.TRIPLE && (h += i.bondSpace);
                    var p = l.add(new Vec2(c.x * (u.x + h), c.y * (u.y + h))),
                        m = o.text(p.x, p.y, n).attr({
                            font: i.font,
                            "font-size": i.fontszsub,
                            fill: "#000"
                        }),
                        f = rnd.relBox(m.getBBox());
                    return this.centerText(m, f), m
                }, rnd.ReStruct.prototype.drawBond = function(t, e, r) {
                    var n = null,
                        o = this.molecule;
                    switch (t.b.type) {
                        case chem.Struct.BOND.TYPE.SINGLE:
                            switch (t.b.stereo) {
                                case chem.Struct.BOND.STEREO.UP:
                                    this.findIncomingUpBonds(e.bid, t), n = t.boldStereo && t.neihbid1 >= 0 && t.neihbid2 >= 0 ? this.drawBondSingleStereoBold(e, r, t) : this.drawBondSingleUp(e, r, t);
                                    break;
                                case chem.Struct.BOND.STEREO.DOWN:
                                    n = this.drawBondSingleDown(e, r, t);
                                    break;
                                case chem.Struct.BOND.STEREO.EITHER:
                                    n = this.drawBondSingleEither(e, r, t);
                                    break;
                                default:
                                    n = this.drawBondSingle(e, r)
                            }
                            break;
                        case chem.Struct.BOND.TYPE.DOUBLE:
                            this.findIncomingUpBonds(e.bid, t), n = t.b.stereo === chem.Struct.BOND.STEREO.NONE && t.boldStereo && t.neihbid1 >= 0 && t.neihbid2 >= 0 ? this.drawBondSingleStereoBold(e, r, t, !0) : this.drawBondDouble(e, r, t, t.b.stereo === chem.Struct.BOND.STEREO.CIS_TRANS);
                            break;
                        case chem.Struct.BOND.TYPE.TRIPLE:
                            n = this.drawBondTriple(e, r, t);
                            break;
                        case chem.Struct.BOND.TYPE.AROMATIC:
                            var i = e.loop >= 0 && o.loops.get(e.loop).aromatic || r.loop >= 0 && o.loops.get(r.loop).aromatic;
                            n = this.drawBondAromatic(e, r, t, !i);
                            break;
                        case chem.Struct.BOND.TYPE.SINGLE_OR_DOUBLE:
                            n = this.drawBondSingleOrDouble(e, r, t);
                            break;
                        case chem.Struct.BOND.TYPE.SINGLE_OR_AROMATIC:
                            n = this.drawBondSingleOrAromatic(e, r, t);
                            break;
                        case chem.Struct.BOND.TYPE.DOUBLE_OR_AROMATIC:
                            n = this.drawBondDoubleOrAromatic(e, r, t);
                            break;
                        case chem.Struct.BOND.TYPE.ANY:
                            n = this.drawBondAny(e, r, t);
                            break;
                        default:
                            throw new Error("Bond type " + t.b.type + " not supported")
                    }
                    return n
                }, rnd.ReStruct.prototype.radicalCap = function(t) {
                    var e = this.render.settings,
                        r = this.render.paper,
                        n = .9 * e.lineWidth,
                        o = n,
                        i = 2 * n;
                    return r.path("M{0},{1}L{2},{3}L{4},{5}", tfx(t.x - o), tfx(t.y + i), tfx(t.x), tfx(t.y), tfx(t.x + o), tfx(t.y + i)).attr({
                        stroke: "#000",
                        "stroke-width": .7 * e.lineWidth,
                        "stroke-linecap": "square",
                        "stroke-linejoin": "miter"
                    })
                }, rnd.ReStruct.prototype.radicalBullet = function(t) {
                    var e = this.render.settings,
                        r = this.render.paper;
                    return r.circle(t.x, t.y, e.lineWidth).attr({
                        stroke: null,
                        fill: "#000"
                    })
                }, rnd.ReStruct.prototype.centerText = function(t, e) {
                    this.render.paper.raphael.vml && this.pathAndRBoxTranslate(t, e, 0, .16 * e.height)
                }, rnd.ReStruct.prototype.showItemSelection = function(t, e, r) {
                    var n = null != e.selectionPlate && !e.selectionPlate.removed;
                    if (n = n && (!("hiddenPaths" in rnd.ReStruct.prototype) || rnd.ReStruct.prototype.hiddenPaths.indexOf(e.selectionPlate) < 0), r) {
                        if (!n) {
                            var o = this.render,
                                i = o.styles,
                                s = o.paper;
                            e.selectionPlate = e.makeSelectionPlate(this, s, i), this.addReObjectPath("selection-plate", e.visel, e.selectionPlate)
                        }
                        e.selectionPlate && e.selectionPlate.show()
                    } else n && e.selectionPlate && e.selectionPlate.hide()
                }, rnd.ReStruct.prototype.pathAndRBoxTranslate = function(t, e, r, n) {
                    t.translateAbs(r, n), e.x += r, e.y += n
                };
                var markerColors = ["black", "cyan", "magenta", "red", "green", "blue", "green"];
                rnd.ReStruct.prototype.showLabels = function() {
                    var t = this.render,
                        e = t.settings,
                        r = t.styles,
                        n = t.opt,
                        o = t.paper,
                        i = .5 * e.lineWidth;
                    for (var s in this.atomsChanged) {
                        var a = this.atoms.get(s),
                            l = t.ps(a.a.pp),
                            d = null;
                        n.showAtomIds && (d = {}, d.text = s.toString(), d.path = o.text(l.x, l.y, d.text).attr({
                            font: e.font,
                            "font-size": e.fontszsub,
                            fill: "#070"
                        }), d.rbb = rnd.relBox(d.path.getBBox()), this.centerText(d.path, d.rbb), this.addReObjectPath("indices", a.visel, d.path, l)), a.setHighlight(a.highlight, t);
                        var c = "#000000";
                        if (a.showLabel) {
                            var h = 0,
                                u = 0,
                                p = {};
                            if (null != a.a.atomList) p.text = a.a.atomList.label();
                            else if ("R#" == a.a.label && null != a.a.rglabel) {
                                p.text = "";
                                for (var m = 0; 32 > m; m++) a.a.rglabel & 1 << m && (p.text += "R" + (m + 1).toString());
                                "" == p.text && (p = "R#")
                            } else if (p.text = a.a.label, n.atomColoring) {
                                var f = element.getElementByLabel(p.text);
                                f && (c = element.get(f).color)
                            }
                            p.path = o.text(l.x, l.y, p.text).attr({
                                font: e.font,
                                "font-size": e.fontsz,
                                fill: c
                            }), p.rbb = rnd.relBox(p.path.getBBox()), this.centerText(p.path, p.rbb), null != a.a.atomList && this.pathAndRBoxTranslate(p.path, p.rbb, (a.hydrogenOnTheLeft ? -1 : 1) * (p.rbb.width - p.rbb.height) / 2, 0), this.addReObjectPath("data", a.visel, p.path, l, !0), h = p.rbb.width / 2, u = -p.rbb.width / 2;
                            var g = Math.floor(a.a.implicitH),
                                b = "H" == p.text,
                                v = {},
                                S = null,
                                y = a.hydrogenOnTheLeft;
                            b && g > 0 && (S = {}, S.text = (g + 1).toString(), S.path = o.text(l.x, l.y, S.text).attr({
                                font: e.font,
                                "font-size": e.fontszsub,
                                fill: c
                            }), S.rbb = rnd.relBox(S.path.getBBox()), this.centerText(S.path, S.rbb), this.pathAndRBoxTranslate(S.path, S.rbb, h + .5 * S.rbb.width + i, .2 * p.rbb.height), h += S.rbb.width + i, this.addReObjectPath("data", a.visel, S.path, l, !0));
                            var x = {};
                            if (0 != a.a.radical) {
                                var w;
                                switch (a.a.radical) {
                                    case 1:
                                        x.path = o.set(), w = 1.6 * e.lineWidth, x.path.push(this.radicalBullet(l.add(new Vec2(-w, 0))), this.radicalBullet(l.add(new Vec2(w, 0)))), x.path.attr("fill", c);
                                        break;
                                    case 2:
                                        x.path = this.radicalBullet(l).attr("fill", c);
                                        break;
                                    case 3:
                                        x.path = o.set(), w = 1.6 * e.lineWidth, x.path.push(this.radicalCap(l.add(new Vec2(-w, 0))), this.radicalCap(l.add(new Vec2(w, 0)))), x.path.attr("stroke", c)
                                }
                                x.rbb = rnd.relBox(x.path.getBBox());
                                var A = -.5 * (p.rbb.height + x.rbb.height);
                                3 == a.a.radical && (A -= e.lineWidth / 2), this.pathAndRBoxTranslate(x.path, x.rbb, 0, A), this.addReObjectPath("data", a.visel, x.path, l, !0)
                            }
                            var R = {};
                            0 != a.a.isotope && (R.text = a.a.isotope.toString(), R.path = o.text(l.x, l.y, R.text).attr({
                                font: e.font,
                                "font-size": e.fontszsub,
                                fill: c
                            }), R.rbb = rnd.relBox(R.path.getBBox()), this.centerText(R.path, R.rbb), this.pathAndRBoxTranslate(R.path, R.rbb, u - .5 * R.rbb.width - i, -.3 * p.rbb.height), u -= R.rbb.width + i, this.addReObjectPath("data", a.visel, R.path, l, !0)), !b && g > 0 && !t.opt.hideImplicitHydrogen && (v.text = "H", v.path = o.text(l.x, l.y, v.text).attr({
                                font: e.font,
                                "font-size": e.fontsz,
                                fill: c
                            }), v.rbb = rnd.relBox(v.path.getBBox()), this.centerText(v.path, v.rbb), y || (this.pathAndRBoxTranslate(v.path, v.rbb, h + .5 * v.rbb.width + i, 0), h += v.rbb.width + i), g > 1 && (S = {}, S.text = g.toString(), S.path = o.text(l.x, l.y, S.text).attr({
                                font: e.font,
                                "font-size": e.fontszsub,
                                fill: c
                            }), S.rbb = rnd.relBox(S.path.getBBox()), this.centerText(S.path, S.rbb), y || (this.pathAndRBoxTranslate(S.path, S.rbb, h + .5 * S.rbb.width + i, .2 * p.rbb.height), h += S.rbb.width + i)), y && (null != S && (this.pathAndRBoxTranslate(S.path, S.rbb, u - .5 * S.rbb.width - i, .2 * p.rbb.height), u -= S.rbb.width + i), this.pathAndRBoxTranslate(v.path, v.rbb, u - .5 * v.rbb.width - i, 0), u -= v.rbb.width + i), this.addReObjectPath("data", a.visel, v.path, l, !0), null != S && this.addReObjectPath("data", a.visel, S.path, l, !0));
                            var B = {};
                            if (0 != a.a.charge) {
                                B.text = "";
                                var E = Math.abs(a.a.charge);
                                1 != E && (B.text = E.toString()), B.text += a.a.charge < 0 ? "–" : "+", B.path = o.text(l.x, l.y, B.text).attr({
                                    font: e.font,
                                    "font-size": e.fontszsub,
                                    fill: c
                                }), B.rbb = rnd.relBox(B.path.getBBox()), this.centerText(B.path, B.rbb), this.pathAndRBoxTranslate(B.path, B.rbb, h + .5 * B.rbb.width + i, -.3 * p.rbb.height), h += B.rbb.width + i, this.addReObjectPath("data", a.visel, B.path, l, !0)
                            }
                            var O = {},
                                C = {
                                    0: "0",
                                    1: "I",
                                    2: "II",
                                    3: "III",
                                    4: "IV",
                                    5: "V",
                                    6: "VI",
                                    7: "VII",
                                    8: "VIII",
                                    9: "IX",
                                    10: "X",
                                    11: "XI",
                                    12: "XII",
                                    13: "XIII",
                                    14: "XIV"
                                };
                            if (a.a.explicitValence >= 0) {
                                if (O.text = C[a.a.explicitValence], !O.text) throw new Error("invalid valence " + a.a.explicitValence.toString());
                                O.text = "(" + O.text + ")", O.path = o.text(l.x, l.y, O.text).attr({
                                    font: e.font,
                                    "font-size": e.fontszsub,
                                    fill: c
                                }), O.rbb = rnd.relBox(O.path.getBBox()), this.centerText(O.path, O.rbb), this.pathAndRBoxTranslate(O.path, O.rbb, h + .5 * O.rbb.width + i, -.3 * p.rbb.height), h += O.rbb.width + i, this.addReObjectPath("data", a.visel, O.path, l, !0)
                            }
                            if (a.a.badConn && n.showValenceWarnings) {
                                var T = {},
                                    M = l.y + p.rbb.height / 2 + i;
                                T.path = o.path("M{0},{1}L{2},{3}", tfx(l.x + u), tfx(M), tfx(l.x + h), tfx(M)).attr(this.render.styles.lineattr).attr({
                                    stroke: "#F00"
                                }), T.rbb = rnd.relBox(T.path.getBBox()), this.addReObjectPath("warnings", a.visel, T.path, l, !0)
                            }
                            d && this.pathAndRBoxTranslate(d.path, d.rbb, -.5 * p.rbb.width - .5 * d.rbb.width - i, .3 * p.rbb.height)
                        }
                        var P = this.bisectLargestSector(a),
                            D = Prototype.Browser.IE ? "*" : "∗";
                        if (a.a.attpnt) {
                            var _, N, G;
                            for (_ = 0, N = 0; 4 > _; ++_) {
                                var L = "";
                                if (a.a.attpnt & 1 << _) {
                                    for (L.length > 0 && (L += " "), L += D, G = 0;
                                        (0 == _ ? 0 : _ + 1) > G; ++G) L += "'";
                                    var I = new Vec2(l),
                                        V = l.addScaled(P, .7 * e.scaleFactor),
                                        k = o.text(V.x, V.y, L).attr({
                                            font: e.font,
                                            "font-size": e.fontsz,
                                            fill: c
                                        }),
                                        H = rnd.relBox(k.getBBox());
                                    this.centerText(k, H);
                                    var F = P.negated();
                                    V = V.addScaled(F, Vec2.shiftRayBox(V, F, Box2Abs.fromRelBox(H)) + e.lineWidth / 2), I = this.shiftBondEnd(a, I, P, e.lineWidth);
                                    var U = P.rotateSC(1, 0),
                                        j = V.addScaled(U, .05 * e.scaleFactor).addScaled(F, .09 * e.scaleFactor),
                                        z = V.addScaled(U, -.05 * e.scaleFactor).addScaled(F, .09 * e.scaleFactor),
                                        q = o.set();
                                    q.push(k, o.path("M{0},{1}L{2},{3}M{4},{5}L{2},{3}L{6},{7}", tfx(I.x), tfx(I.y), tfx(V.x), tfx(V.y), tfx(j.x), tfx(j.y), tfx(z.x), tfx(z.y)).attr(r.lineattr).attr({
                                        "stroke-width": e.lineWidth / 2
                                    })), this.addReObjectPath("indices", a.visel, q, l), P = P.rotate(Math.PI / 6)
                                }
                            }
                        }
                        var W = "";
                        if (a.a.aam > 0 && (W += a.a.aam), a.a.invRet > 0)
                            if (W.length > 0 && (W += ","), 1 == a.a.invRet) W += "Inv";
                            else {
                                if (2 != a.a.invRet) throw new Error("Invalid value for the invert/retain flag");
                                W += "Ret"
                            }
                        var Y = "";
                        if (0 != a.a.ringBondCount)
                            if (a.a.ringBondCount > 0) Y += "rb" + a.a.ringBondCount.toString();
                            else if (-1 == a.a.ringBondCount) Y += "rb0";
                        else {
                            if (-2 != a.a.ringBondCount) throw new Error("Ring bond count invalid");
                            Y += "rb*"
                        }
                        if (0 != a.a.substitutionCount)
                            if (Y.length > 0 && (Y += ","), a.a.substitutionCount > 0) Y += "s" + a.a.substitutionCount.toString();
                            else if (-1 == a.a.substitutionCount) Y += "s0";
                        else {
                            if (-2 != a.a.substitutionCount) throw new Error("Substitution count invalid");
                            Y += "s*"
                        }
                        if (a.a.unsaturatedAtom > 0) {
                            if (Y.length > 0 && (Y += ","), 1 != a.a.unsaturatedAtom) throw new Error("Unsaturated atom invalid value");
                            Y += "u"
                        }
                        if (a.a.hCount > 0 && (Y.length > 0 && (Y += ","), Y += "H" + (a.a.hCount - 1).toString()), a.a.exactChangeFlag > 0) {
                            if (W.length > 0 && (W += ","), 1 != a.a.exactChangeFlag) throw new Error("Invalid value for the exact change flag");
                            W += "ext"
                        }
                        if (W = (Y.length > 0 ? Y + "\n" : "") + (W.length > 0 ? "." + W + "." : ""), W.length > 0) {
                            var $ = o.text(l.x, l.y, W).attr({
                                    font: e.font,
                                    "font-size": e.fontszsub,
                                    fill: c
                                }),
                                K = rnd.relBox($.getBBox());
                            this.centerText($, K);
                            var Z = this.bisectLargestSector(a),
                                X = a.visel,
                                Q = 3;
                            for (_ = 0; _ < X.exts.length; ++_) Q = Math.max(Q, Vec2.shiftRayBox(l, Z, X.exts[_].translate(l)));
                            Q += Vec2.shiftRayBox(l, Z.negated(), Box2Abs.fromRelBox(K)), Z = Z.scaled(8 + Q), this.pathAndRBoxTranslate($, K, Z.x, Z.y), this.addReObjectPath("data", a.visel, $, l, !0)
                        }
                    }
                }, rnd.ReStruct.prototype.shiftBondEnd = function(t, e, r, n) {
                    for (var o = 0, i = t.visel, s = 0; s < i.exts.length; ++s) {
                        var a = i.exts[s].translate(e);
                        o = Math.max(o, Vec2.shiftRayBox(e, r, a))
                    }
                    return o > 0 && (e = e.addScaled(r, o + n)), e
                }, rnd.ReStruct.prototype.bisectLargestSector = function(t) {
                    var e = [];
                    t.a.neighbors.each(function(t) {
                        var r = this.molecule.halfBonds.get(t);
                        e.push(r.ang)
                    }, this), e = e.sort(function(t, e) {
                        return t - e
                    });
                    for (var r = [], n = 0; n < e.length - 1; ++n) r.push(e[(n + 1) % e.length] - e[n]);
                    r.push(e[0] - e[e.length - 1] + 2 * Math.PI);
                    var o = 0,
                        i = -Math.PI / 2;
                    for (n = 0; n < e.length; ++n) r[n] > o && (o = r[n], i = e[n] + r[n] / 2);
                    return new Vec2(Math.cos(i), Math.sin(i))
                }, rnd.ReStruct.prototype.bondRecalc = function(t, e) {
                    var r = this.render,
                        n = this.atoms.get(e.b.begin),
                        o = this.atoms.get(e.b.end),
                        i = r.ps(n.a.pp),
                        s = r.ps(o.a.pp),
                        a = this.molecule.halfBonds.get(e.b.hb1),
                        l = this.molecule.halfBonds.get(e.b.hb2);
                    a.p = this.shiftBondEnd(n, i, a.dir, 2 * t.lineWidth), l.p = this.shiftBondEnd(o, s, l.dir, 2 * t.lineWidth), e.b.center = Vec2.lc2(n.a.pp, .5, o.a.pp, .5), e.b.len = Vec2.dist(i, s), e.b.sb = 5 * t.lineWidth, e.b.sa = Math.max(e.b.sb, e.b.len / 2 - 2 * t.lineWidth), e.b.angle = 180 * Math.atan2(a.dir.y, a.dir.x) / Math.PI
                }, rnd.ReStruct.prototype.showBonds = function() {
                    var t = this.render,
                        e = t.settings,
                        r = t.paper,
                        n = t.opt;
                    for (var o in this.bondsChanged) {
                        var i = this.bonds.get(o),
                            s = this.molecule.halfBonds.get(i.b.hb1),
                            a = this.molecule.halfBonds.get(i.b.hb2);
                        this.bondRecalc(e, i), i.path = this.drawBond(i, s, a), i.rbb = rnd.relBox(i.path.getBBox()), this.addReObjectPath("data", i.visel, i.path, null, !0);
                        var l = {};
                        l.path = this.drawReactingCenter(i, s, a), l.path && (l.rbb = rnd.relBox(l.path.getBBox()), this.addReObjectPath("data", i.visel, l.path, null, !0));
                        var d = {};
                        d.path = this.drawTopologyMark(i, s, a), d.path && (d.rbb = rnd.relBox(d.path.getBBox()), this.addReObjectPath("data", i.visel, d.path, null, !0)), i.setHighlight(i.highlight, t);
                        var c = .6 * e.subFontSize,
                            h = null,
                            u = null;
                        if (n.showBondIds) {
                            var p = Vec2.lc(s.p, .5, a.p, .5, s.norm, c);
                            h = r.text(p.x, p.y, o.toString()), u = rnd.relBox(h.getBBox()), this.centerText(h, u), this.addReObjectPath("indices", i.visel, h)
                        }
                        if (n.showHalfBondIds) {
                            var m = Vec2.lc(s.p, .8, a.p, .2, s.norm, c);
                            h = r.text(m.x, m.y, i.b.hb1.toString()), u = rnd.relBox(h.getBBox()), this.centerText(h, u), this.addReObjectPath("indices", i.visel, h);
                            var f = Vec2.lc(s.p, .2, a.p, .8, a.norm, c);
                            h = r.text(f.x, f.y, i.b.hb2.toString()), u = rnd.relBox(h.getBBox()), this.centerText(h, u), this.addReObjectPath("indices", i.visel, h)
                        }
                        if (n.showLoopIds && !n.showBondIds) {
                            var g = Vec2.lc(s.p, .5, a.p, .5, a.norm, c);
                            h = r.text(g.x, g.y, s.loop.toString()), u = rnd.relBox(h.getBBox()), this.centerText(h, u), this.addReObjectPath("indices", i.visel, h);
                            var b = Vec2.lc(s.p, .5, a.p, .5, s.norm, c);
                            h = r.text(b.x, b.y, a.loop.toString()), u = rnd.relBox(h.getBBox()), this.centerText(h, u), this.addReObjectPath("indices", i.visel, h)
                        }
                    }
                }, rnd.ReStruct.prototype.labelIsVisible = function(t, e) {
                    if (0 == e.a.neighbors.length || e.a.neighbors.length < 2 && !this.render.opt.hideTerminalLabels || "c" != e.a.label.toLowerCase() || e.a.badConn && this.render.opt.showValenceWarnings || 0 != e.a.isotope || 0 != e.a.radical || 0 != e.a.charge || e.a.explicitValence >= 0 || null != e.a.atomList || null != e.a.rglabel) return !0;
                    if (2 == e.a.neighbors.length) {
                        var r = e.a.neighbors[0],
                            n = e.a.neighbors[1],
                            o = this.molecule.halfBonds.get(r),
                            i = this.molecule.halfBonds.get(n),
                            s = this.bonds.get(o.bid),
                            a = this.bonds.get(i.bid);
                        if (s.b.type == a.b.type && s.b.stereo == chem.Struct.BOND.STEREO.NONE && a.b.stereo == chem.Struct.BOND.STEREO.NONE && Math.abs(Vec2.cross(o.dir, i.dir)) < .2) return !0
                    }
                    return !1
                }, rnd.ReStruct.prototype.checkLabelsToShow = function() {
                    for (var t in this.atomsChanged) {
                        var e = this.atoms.get(t);
                        e.showLabel = this.labelIsVisible(t, e)
                    }
                }, rnd.ReStruct.layerMap = {
                    background: 0,
                    "selection-plate": 1,
                    highlighting: 2,
                    warnings: 3,
                    data: 4,
                    indices: 5
                }, rnd.ReStruct.prototype.addReObjectPath = function(t, e, r, n, o) {
                    if (r) {
                        var i = this.render.offset,
                            s = o ? Box2Abs.fromRelBox(rnd.relBox(r.getBBox())) : null,
                            a = n && s ? s.translate(n.negated()) : null;
                        null !== i && (r.translateAbs(i.x, i.y), s = s ? s.translate(i) : null), e.add(r, s, a), this.insertInLayer(rnd.ReStruct.layerMap[t], r)
                    }
                }, rnd.ReStruct.prototype.clearVisel = function(t) {
                    for (var e = 0; e < t.paths.length; ++e) t.paths[e].remove();
                    t.clear()
                }, rnd.ReStruct.prototype.selectDoubleBondShift = function(t, e, r, n) {
                    return 6 == t && 6 != e && (r > 1 || 1 == n) ? -1 : 6 == e && 6 != t && (n > 1 || 1 == r) ? 1 : e * r > t * n ? -1 : t * n > e * r ? 1 : e > t ? -1 : 1
                }, rnd.ReStruct.prototype.selectDoubleBondShift_Chain = function(t) {
                    var e = this.molecule,
                        r = e.halfBonds.get(t.b.hb1),
                        n = e.halfBonds.get(t.b.hb2),
                        o = (r.leftSin > .3 ? 1 : 0) + (n.rightSin > .3 ? 1 : 0),
                        i = (n.leftSin > .3 ? 1 : 0) + (r.rightSin > .3 ? 1 : 0);
                    return o > i ? -1 : i > o ? 1 : 1 == (r.leftSin > .3 ? 1 : 0) + (r.rightSin > .3 ? 1 : 0) ? 1 : 0
                }, rnd.ReStruct.prototype.setDoubleBondShift = function() {
                    var t = this.molecule;
                    for (var e in this.bondsChanged) {
                        var r, n, o = this.bonds.get(e);
                        if (r = t.halfBonds.get(o.b.hb1).loop, n = t.halfBonds.get(o.b.hb2).loop, r >= 0 && n >= 0) {
                            var i = t.loops.get(r).dblBonds,
                                s = t.loops.get(n).dblBonds,
                                a = t.loops.get(r).hbs.length,
                                l = t.loops.get(n).hbs.length;
                            o.doubleBondShift = this.selectDoubleBondShift(a, l, i, s)
                        } else o.doubleBondShift = r >= 0 ? -1 : n >= 0 ? 1 : this.selectDoubleBondShift_Chain(o)
                    }
                }, rnd.ReStruct.prototype.updateLoops = function() {
                    this.reloops.each(function(t, e) {
                        this.clearVisel(e.visel)
                    }, this);
                    var t = this.molecule.findLoops();
                    util.each(t.bondsToMark, function(t) {
                        this.markBond(t, 1)
                    }, this), util.each(t.newLoops, function(t) {
                        this.reloops.set(t, new rnd.ReLoop(this.molecule.loops.get(t)))
                    }, this)
                }, rnd.ReStruct.prototype.renderLoops = function() {
                    var t = this.render,
                        e = t.settings,
                        r = t.paper,
                        n = this.molecule;
                    this.reloops.each(function(o, i) {
                        var s = i.loop;
                        i.centre = new Vec2, s.hbs.each(function(e) {
                            var r = n.halfBonds.get(e),
                                o = this.bonds.get(r.bid),
                                a = t.ps(this.atoms.get(r.begin).a.pp);
                            o.b.type != chem.Struct.BOND.TYPE.AROMATIC && (s.aromatic = !1), i.centre.add_(a)
                        }, this), s.convex = !0;
                        for (var a = 0; a < i.loop.hbs.length; ++a) {
                            var l = n.halfBonds.get(s.hbs[a]),
                                d = n.halfBonds.get(s.hbs[(a + 1) % s.hbs.length]),
                                c = Math.atan2(Vec2.cross(l.dir, d.dir), Vec2.dot(l.dir, d.dir));
                            c > 0 && (s.convex = !1)
                        }
                        if (i.centre = i.centre.scaled(1 / s.hbs.length), i.radius = -1, s.hbs.each(function(e) {
                                var r = n.halfBonds.get(e),
                                    o = t.ps(this.atoms.get(r.begin).a.pp),
                                    s = t.ps(this.atoms.get(r.end).a.pp),
                                    a = Vec2.diff(s, o).rotateSC(1, 0).normalized(),
                                    l = Vec2.dot(Vec2.diff(o, i.centre), a);
                                i.radius = i.radius < 0 ? l : Math.min(i.radius, l)
                            }, this), i.radius *= .7, s.aromatic) {
                            var h = null;
                            if (s.convex) h = r.circle(i.centre.x, i.centre.y, i.radius).attr({
                                stroke: "#000",
                                "stroke-width": e.lineWidth
                            });
                            else {
                                var u = "";
                                for (a = 0; a < s.hbs.length; ++a) {
                                    l = n.halfBonds.get(s.hbs[a]), d = n.halfBonds.get(s.hbs[(a + 1) % s.hbs.length]), c = Math.atan2(Vec2.cross(l.dir, d.dir), Vec2.dot(l.dir, d.dir));
                                    var p = (Math.PI - c) / 2,
                                        m = d.dir.rotate(p),
                                        f = t.ps(this.atoms.get(d.begin).a.pp),
                                        g = Math.sin(p),
                                        b = .1;
                                    Math.abs(g) < b && (g = g * b / Math.abs(g));
                                    var v = e.bondSpace / g,
                                        S = f.addScaled(m, -v);
                                    u += 0 == a ? "M" : "L", u += tfx(S.x) + "," + tfx(S.y)
                                }
                                u += "Z", h = r.path(u).attr({
                                    stroke: "#000",
                                    "stroke-width": e.lineWidth,
                                    "stroke-dasharray": "- "
                                })
                            }
                            this.addReObjectPath("data", i.visel, h, null, !0)
                        }
                    }, this)
                };

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../chem/element": 10,
            "../util": 39,
            "../util/box2abs": 38,
            "../util/vec2": 43,
            "./restruct": 23
        }],
        25: [function(require, module, exports) {
            (function(global) {
                var Box2Abs = require("../util/box2abs"),
                    Vec2 = require("../util/vec2"),
                    rnd = global.rnd = global.rnd || {};
                rnd.Visel = function(e) {
                    this.type = e, this.paths = [], this.boxes = [], this.boundingBox = null
                }, rnd.Visel.TYPE = {
                    ATOM: 1,
                    BOND: 2,
                    LOOP: 3,
                    ARROW: 4,
                    PLUS: 5,
                    SGROUP: 6,
                    TMP: 7,
                    FRAGMENT: 8,
                    RGROUP: 9,
                    CHIRAL_FLAG: 10
                }, rnd.Visel.prototype.add = function(e, t, r) {
                    this.paths.push(e), t && (this.boxes.push(t), this.boundingBox = null == this.boundingBox ? t : Box2Abs.union(this.boundingBox, t)), r && this.exts.push(r)
                }, rnd.Visel.prototype.clear = function() {
                    this.paths = [], this.boxes = [], this.exts = [], this.boundingBox = null
                }, rnd.Visel.prototype.translate = function(e, t) {
                    if (arguments.length > 2) throw new Error("One vector or two scalar arguments expected");
                    if (void 0 === t) this.translate(e.x, e.y);
                    else {
                        for (var r = new Vec2(e, t), n = 0; n < this.paths.length; ++n) this.paths[n].translateAbs(e, t);
                        for (var i = 0; i < this.boxes.length; ++i) this.boxes[i] = this.boxes[i].translate(r);
                        null !== this.boundingBox && (this.boundingBox = this.boundingBox.translate(r))
                    }
                };

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../util/box2abs": 38,
            "../util/vec2": 43
        }],
        26: [function(require, module, exports) {
            (function(global) {
                function Action() {
                    this.operations = []
                }

                function fromMultipleMove(e, t) {
                    t = new Vec2(t);
                    var r, o = new Action,
                        n = ui.render,
                        i = n.ctab,
                        a = i.molecule,
                        u = [],
                        l = Set.empty(),
                        d = Set.empty();
                    if (e.atoms) {
                        var s = Set.fromList(e.atoms);
                        for (i.bonds.each(function(e, t) {
                                Set.contains(s, t.b.begin) && Set.contains(s, t.b.end) ? (u.push(e), util.each(["hb1", "hb2"], function(e) {
                                    var r = a.halfBonds.get(t.b[e]).loop;
                                    r >= 0 && Set.add(l, r)
                                }, this)) : Set.contains(s, t.b.begin) ? Set.add(d, t.b.begin) : Set.contains(s, t.b.end) && Set.add(d, t.b.end)
                            }, this), r = 0; r < u.length; ++r) o.addOp(new op.BondMove(u[r], t));
                        for (Set.each(l, function(e) {
                                i.reloops.get(e) && i.reloops.get(e).visel && o.addOp(new op.LoopMove(e, t))
                            }, this), r = 0; r < e.atoms.length; ++r) {
                            var c = e.atoms[r];
                            o.addOp(new op.AtomMove(c, t, !Set.contains(d, c)))
                        }
                    }
                    if (e.rxnArrows)
                        for (r = 0; r < e.rxnArrows.length; ++r) o.addOp(new op.RxnArrowMove(e.rxnArrows[r], t, !0));
                    if (e.rxnPluses)
                        for (r = 0; r < e.rxnPluses.length; ++r) o.addOp(new op.RxnPlusMove(e.rxnPluses[r], t, !0));
                    if (e.sgroupData)
                        for (r = 0; r < e.sgroupData.length; ++r) o.addOp(new op.SGroupDataMove(e.sgroupData[r], t));
                    if (e.chiralFlags)
                        for (r = 0; r < e.chiralFlags.length; ++r) o.addOp(new op.ChiralFlagMove(t));
                    return o.perform()
                }

                function fromAtomsAttrs(e, t, r) {
                    var o = new Action;
                    return ("number" == typeof e ? [e] : e).each(function(e) {
                        for (var n in chem.Struct.Atom.attrlist) {
                            var i;
                            if (n in t) i = t[n];
                            else {
                                if (!r) continue;
                                i = chem.Struct.Atom.attrGetDefault(n)
                            }
                            o.addOp(new op.AtomAttr(e, n, i))
                        }!r && "label" in t && null != t.label && "L#" != t.label && !t.atomList && o.addOp(new op.AtomAttr(e, "atomList", null))
                    }, this), o.perform()
                }

                function fromBondAttrs(e, t, r, o) {
                    var n = new Action;
                    for (var i in chem.Struct.Bond.attrlist) {
                        var a;
                        if (i in t) a = t[i];
                        else {
                            if (!o) continue;
                            a = chem.Struct.Bond.attrGetDefault(i)
                        }
                        n.addOp(new op.BondAttr(e, i, a))
                    }
                    return r && n.mergeWith(toBondFlipping(e)), n.perform()
                }

                function fromSelectedBondsAttrs(e, t) {
                    var r = new Action;
                    return e = new Hash(e), ui.editor.getSelection().bonds.each(function(t) {
                        e.each(function(e) {
                            r.addOp(new op.BondAttr(t, e.key, e.value))
                        }, this)
                    }, this), t && t.each(function(e) {
                        r.mergeWith(toBondFlipping(e))
                    }, this), r.perform()
                }

                function fromAtomAddition(e, t) {
                    t = Object.clone(t);
                    var r = new Action;
                    return t.fragment = r.addOp((new op.FragmentAdd).perform(ui.editor)).frid, r.addOp(new op.AtomAdd(t, e).perform(ui.editor)), r
                }

                function mergeFragments(e, t, r) {
                    if (r != t && Object.isNumber(r)) {
                        var o = chem.Struct.RGroup.findRGroupByFragment(ui.render.ctab.molecule.rgroups, r);
                        Object.isUndefined(o) || e.mergeWith(fromRGroupFragment(null, r)), ui.render.ctab.molecule.atoms.each(function(o, n) {
                            n.fragment == r && e.addOp(new op.AtomAttr(o, "fragment", t).perform(ui.editor))
                        }), e.addOp(new op.FragmentDelete(r).perform(ui.editor))
                    }
                }

                function atomForNewBond(e) {
                    var t = [],
                        r = ui.render.atomGetPos(e);
                    ui.render.atomGetNeighbors(e).each(function(e) {
                        var o = ui.render.atomGetPos(e.aid);
                        Vec2.dist(r, o) < .1 || t.push({
                            id: e.aid,
                            v: Vec2.diff(o, r)
                        })
                    }), t.sort(function(e, t) {
                        return Math.atan2(e.v.y, e.v.x) - Math.atan2(t.v.y, t.v.x)
                    });
                    var o, n, i = 0,
                        a = 0;
                    for (o = 0; o < t.length; o++) n = Vec2.angle(t[o].v, t[(o + 1) % t.length].v), 0 > n && (n += 2 * Math.PI), n > a && (i = o, a = n);
                    var u = new Vec2(1, 0);
                    if (t.length > 0) {
                        if (1 == t.length) {
                            a = -(4 * Math.PI / 3);
                            var l = ui.render.atomGetNeighbors(e)[0];
                            if (ui.render.atomGetDegree(l.aid) > 1) {
                                var d = [],
                                    s = ui.render.atomGetPos(l.aid),
                                    c = Vec2.diff(r, s),
                                    p = Math.atan2(c.y, c.x);
                                ui.render.atomGetNeighbors(l.aid).each(function(e) {
                                    var t = ui.render.atomGetPos(e.aid);
                                    if (!(e.bid == l.bid || Vec2.dist(s, t) < .1)) {
                                        var r = Vec2.diff(t, s),
                                            o = Math.atan2(r.y, r.x) - p;
                                        0 > o && (o += 2 * Math.PI), d.push(o)
                                    }
                                }), d.sort(function(e, t) {
                                    return e - t
                                }), d[0] <= 1.01 * Math.PI && d[d.length - 1] <= 1.01 * Math.PI && (a *= -1)
                            }
                        }
                        n = a / 2 + Math.atan2(t[i].v.y, t[i].v.x), u = u.rotate(n)
                    }
                    u.add_(r);
                    var m = ui.render.findClosestAtom(u, .1);
                    return m = null == m ? {
                        label: "C"
                    } : m.id, {
                        atom: m,
                        pos: u
                    }
                }

                function fromBondAddition(e, t, r, o, n) {
                    if (void 0 === r) {
                        var i = atomForNewBond(t);
                        r = i.atom, o = i.pos
                    }
                    var a = new Action,
                        u = null;
                    if (Object.isNumber(t)) {
                        if (u = ui.render.atomGetAttr(t, "fragment"), Object.isNumber(r)) {
                            var l = ui.render.atomGetAttr(r, "fragment");
                            mergeFragments(a, u, l)
                        }
                    } else Object.isNumber(r) && (u = ui.render.atomGetAttr(r, "fragment"));
                    null == u && (u = a.addOp((new op.FragmentAdd).perform(ui.editor)).frid), Object.isNumber(t) ? "*" == ui.render.atomGetAttr(t, "label") && a.addOp(new op.AtomAttr(t, "label", "C").perform(ui.editor)) : (t.fragment = u, t = a.addOp(new op.AtomAdd(t, o).perform(ui.editor)).data.aid, o = n), Object.isNumber(r) ? "*" == ui.render.atomGetAttr(r, "label") && a.addOp(new op.AtomAttr(r, "label", "C").perform(ui.editor)) : (r.fragment = u, r = a.addOp(new op.AtomAdd(r, o).perform(ui.editor)).data.aid, Object.isNumber(t) && ui.render.atomGetSGroups(t).each(function(e) {
                        a.addOp(new op.SGroupAtomAdd(e, r).perform(ui.editor))
                    }, this));
                    var d = a.addOp(new op.BondAdd(t, r, e).perform(ui.editor)).data.bid;
                    return a.operations.reverse(), [a, t, r, d]
                }

                function fromArrowAddition(e) {
                    var t = new Action;
                    return ui.ctab.rxnArrows.count() < 1 && t.addOp(new op.RxnArrowAdd(e).perform(ui.editor)), t
                }

                function fromArrowDeletion(e) {
                    var t = new Action;
                    return t.addOp(new op.RxnArrowDelete(e)), t.perform()
                }

                function fromChiralFlagAddition(e) {
                    var t = new Action;
                    return ui.render.ctab.chiralFlags.count() < 1 && t.addOp(new op.ChiralFlagAdd(e).perform(ui.editor)), t
                }

                function fromChiralFlagDeletion() {
                    var e = new Action;
                    return e.addOp(new op.ChiralFlagDelete), e.perform()
                }

                function fromPlusAddition(e) {
                    var t = new Action;
                    return t.addOp(new op.RxnPlusAdd(e).perform(ui.editor)), t
                }

                function fromPlusDeletion(e) {
                    var t = new Action;
                    return t.addOp(new op.RxnPlusDelete(e)), t.perform()
                }

                function fromAtomDeletion(e) {
                    var t = new Action,
                        r = new Array,
                        o = ui.ctab.atoms.get(e).fragment;
                    return ui.render.atomGetNeighbors(e).each(function(e) {
                        t.addOp(new op.BondDelete(e.bid)), 1 == ui.render.atomGetDegree(e.aid) && (t.removeAtomFromSgroupIfNeeded(e.aid) && r.push(e.aid), t.addOp(new op.AtomDelete(e.aid)))
                    }, this), t.removeAtomFromSgroupIfNeeded(e) && r.push(e), t.addOp(new op.AtomDelete(e)), t.removeSgroupIfNeeded(r), t = t.perform(), t.mergeWith(fromFragmentSplit(o)), t
                }

                function fromBondDeletion(e) {
                    var t = new Action,
                        r = ui.ctab.bonds.get(e),
                        o = ui.ctab.atoms.get(r.begin).fragment,
                        n = new Array;
                    return t.addOp(new op.BondDelete(e)), 1 == ui.render.atomGetDegree(r.begin) && (t.removeAtomFromSgroupIfNeeded(r.begin) && n.push(r.begin), t.addOp(new op.AtomDelete(r.begin))), 1 == ui.render.atomGetDegree(r.end) && (t.removeAtomFromSgroupIfNeeded(r.end) && n.push(r.end), t.addOp(new op.AtomDelete(r.end))), t.removeSgroupIfNeeded(n), t = t.perform(), t.mergeWith(fromFragmentSplit(o)), t
                }

                function fromFragmentSplit(e) {
                    var t = new Action,
                        r = chem.Struct.RGroup.findRGroupByFragment(ui.ctab.rgroups, e);
                    return ui.ctab.atoms.each(function(o, n) {
                        if (n.fragment == e) {
                            var i = t.addOp((new op.FragmentAdd).perform(ui.editor)).frid,
                                a = function(r) {
                                    t.addOp(new op.AtomAttr(r, "fragment", i).perform(ui.editor)), ui.render.atomGetNeighbors(r).each(function(t) {
                                        ui.ctab.atoms.get(t.aid).fragment == e && a(t.aid)
                                    })
                                };
                            a(o), r && t.mergeWith(fromRGroupFragment(r, i))
                        }
                    }), -1 != e && (t.mergeWith(fromRGroupFragment(0, e)), t.addOp(new op.FragmentDelete(e).perform(ui.editor))), t
                }

                function fromFragmentAddition(e, t, r, o, n) {
                    var i = new Action;
                    return r.each(function(e) {
                        i.addOp(new op.SGroupRemoveFromHierarchy(e)), i.addOp(new op.SGroupDelete(e))
                    }, this), t.each(function(e) {
                        i.addOp(new op.BondDelete(e))
                    }, this), e.each(function(e) {
                        i.addOp(new op.AtomDelete(e))
                    }, this), o.each(function(e) {
                        i.addOp(new op.RxnArrowDelete(e))
                    }, this), n.each(function(e) {
                        i.addOp(new op.RxnPlusDelete(e))
                    }, this), i.mergeWith(new fromFragmentSplit(-1)), i
                }

                function fromFragmentDeletion(e) {
                    e = e || ui.editor.getSelection();
                    var t = new Action,
                        r = new Array,
                        o = [],
                        n = new Action;
                    for (e.sgroupData && e.sgroupData.each(function(e) {
                            n.mergeWith(fromSgroupDeletion(e))
                        }, this), e.atoms.each(function(t) {
                            ui.render.atomGetNeighbors(t).each(function(t) {
                                -1 == e.bonds.indexOf(t.bid) && (e.bonds = e.bonds.concat([t.bid]))
                            }, this)
                        }, this), e.bonds.each(function(n) {
                            t.addOp(new op.BondDelete(n));
                            var i = ui.ctab.bonds.get(n);
                            if (-1 == e.atoms.indexOf(i.begin) && 1 == ui.render.atomGetDegree(i.begin)) {
                                var a = ui.ctab.atoms.get(i.begin).fragment;
                                o.indexOf(a) < 0 && o.push(a), t.removeAtomFromSgroupIfNeeded(i.begin) && r.push(i.begin), t.addOp(new op.AtomDelete(i.begin))
                            }
                            if (-1 == e.atoms.indexOf(i.end) && 1 == ui.render.atomGetDegree(i.end)) {
                                var u = ui.ctab.atoms.get(i.end).fragment;
                                o.indexOf(u) < 0 && o.push(u), t.removeAtomFromSgroupIfNeeded(i.end) && r.push(i.end), t.addOp(new op.AtomDelete(i.end))
                            }
                        }, this), e.atoms.each(function(e) {
                            var n = ui.ctab.atoms.get(e).fragment;
                            o.indexOf(n) < 0 && o.push(n), t.removeAtomFromSgroupIfNeeded(e) && r.push(e), t.addOp(new op.AtomDelete(e))
                        }, this), t.removeSgroupIfNeeded(r), e.rxnArrows.each(function(e) {
                            t.addOp(new op.RxnArrowDelete(e))
                        }, this), e.rxnPluses.each(function(e) {
                            t.addOp(new op.RxnPlusDelete(e))
                        }, this), e.chiralFlags.each(function(e) {
                            t.addOp(new op.ChiralFlagDelete(e))
                        }, this), t = t.perform(); o.length > 0;) t.mergeWith(new fromFragmentSplit(o.pop()));
                    return t.mergeWith(n), t
                }

                function fromAtomMerge(e, t) {
                    var r = new Action,
                        o = ui.render.atomGetAttr(e, "fragment"),
                        n = ui.render.atomGetAttr(t, "fragment");
                    o != n && mergeFragments(r, o, n);
                    var i = new Action;
                    ui.render.atomGetNeighbors(e).each(function(e) {
                        var r, o, n = ui.ctab.bonds.get(e.bid);
                        n.begin == e.aid ? (r = e.aid, o = t) : (r = t, o = e.aid), t != n.begin && t != n.end && -1 == ui.ctab.findBondId(r, o) && i.addOp(new op.BondAdd(r, o, n)), i.addOp(new op.BondDelete(e.bid))
                    }, this);
                    var a = chem.Struct.Atom.getAttrHash(ui.ctab.atoms.get(e));
                    1 == ui.render.atomGetDegree(e) && "*" == a.get("label") && a.set("label", "C"), a.each(function(e) {
                        i.addOp(new op.AtomAttr(t, e.key, e.value))
                    }, this);
                    var u = i.removeAtomFromSgroupIfNeeded(e);
                    return i.addOp(new op.AtomDelete(e)), u && i.removeSgroupIfNeeded([e]), i.perform().mergeWith(r)
                }

                function toBondFlipping(e) {
                    var t = ui.ctab.bonds.get(e),
                        r = new Action;
                    return r.addOp(new op.BondDelete(e)), r.addOp(new op.BondAdd(t.end, t.begin, t)).data.bid = e, r
                }

                function fromBondFlipping(e) {
                    return toBondFlipping(e).perform()
                }

                function fromTemplateOnCanvas(e, t, r) {
                    var o = new Action,
                        n = r.molecule,
                        i = (new op.FragmentAdd).perform(ui.editor),
                        a = {};
                    return n.atoms.each(function(n, u) {
                        var l, d = chem.Struct.Atom.getAttrHash(u).toObject();
                        d.fragment = i.frid, o.addOp(l = new op.AtomAdd(d, Vec2.diff(u.pp, r.xy0).rotate(t).add(e)).perform(ui.editor)), a[n] = l.data.aid
                    }), n.bonds.each(function(e, t) {
                        o.addOp(new op.BondAdd(a[t.begin], a[t.end], t).perform(ui.editor))
                    }), o.operations.reverse(), o.addOp(i), o
                }

                function atomAddToSGroups(e, t) {
                    var r = new Action;
                    return util.each(e, function(e) {
                        r.addOp(new op.SGroupAtomAdd(e, t).perform(ui.editor))
                    }, this), r
                }

                function fromTemplateOnAtom(e, t, r, o, n) {
                    var i = new Action,
                        a = o.molecule,
                        u = ui.render,
                        l = u.ctab,
                        d = l.molecule,
                        s = d.atoms.get(e),
                        c = e,
                        p = null,
                        m = ui.render.atomGetSGroups(e),
                        f = u.atomGetAttr(e, "fragment"),
                        g = {},
                        h = a.atoms.get(o.aid).pp;
                    if (r) {
                        if (null == t) {
                            var v = atomForNewBond(e),
                                A = fromBondAddition({
                                    type: 1
                                }, e, v.atom, v.pos);
                            i = A[0], i.operations.reverse(), p = e = A[2]
                        } else {
                            var w;
                            i.addOp(w = new op.AtomAdd({
                                label: "C",
                                fragment: f
                            }, new Vec2(1, 0).rotate(t).add(s.pp)).perform(ui.editor)), i.addOp(new op.BondAdd(e, w.data.aid, {
                                type: 1
                            }).perform(ui.editor)), p = e = w.data.aid, i.mergeWith(atomAddToSGroups(m, e))
                        }
                        var b = s;
                        s = d.atoms.get(e);
                        var S = n(b.pp, s.pp) - o.angle0
                    } else null == t && (v = atomForNewBond(e), t = n(s.pp, v.pos)), S = t - o.angle0;
                    return a.atoms.each(function(t, r) {
                        var n = chem.Struct.Atom.getAttrHash(r).toObject();
                        if (n.fragment = f, t == o.aid) i.mergeWith(fromAtomsAttrs(e, n, !0)), g[t] = e;
                        else {
                            var a;
                            a = Vec2.diff(r.pp, h).rotate(S).add(s.pp), i.addOp(w = new op.AtomAdd(n, a).perform(ui.editor)), g[t] = w.data.aid
                        }
                        g[t] - 0 !== c - 0 && g[t] - 0 !== p - 0 && i.mergeWith(atomAddToSGroups(m, g[t]))
                    }), a.bonds.each(function(e, t) {
                        i.addOp(new op.BondAdd(g[t.begin], g[t.end], t).perform(ui.editor))
                    }), i.operations.reverse(), i
                }

                function fromTemplateOnBond(e, t, r, o) {
                    var n, i, a = new Action,
                        u = t.molecule,
                        l = ui.render,
                        d = l.ctab,
                        s = d.molecule,
                        c = s.bonds.get(e),
                        p = s.atoms.get(c.begin),
                        m = s.atoms.get(c.end),
                        f = Set.list(Set.intersection(Set.fromList(ui.render.atomGetSGroups(c.begin)), Set.fromList(ui.render.atomGetSGroups(c.end)))),
                        g = u.bonds.get(t.bid),
                        h = l.atomGetAttr(c.begin, "fragment"),
                        v = {};
                    o ? (n = u.atoms.get(g.end), i = u.atoms.get(g.begin), v[g.end] = c.begin, v[g.begin] = c.end) : (n = u.atoms.get(g.begin), i = u.atoms.get(g.end), v[g.begin] = c.begin, v[g.end] = c.end);
                    var A = r(p.pp, m.pp) - r(n.pp, i.pp),
                        w = Vec2.dist(p.pp, m.pp) / Vec2.dist(n.pp, i.pp);
                    return n.pp, u.atoms.each(function(e, t) {
                        var r = chem.Struct.Atom.getAttrHash(t).toObject();
                        if (r.fragment = h, e == g.begin || e == g.end) return a.mergeWith(fromAtomsAttrs(v[e], r, !0)), void 0;
                        var o;
                        o = Vec2.diff(t.pp, n.pp).rotate(A).scaled(w).add(p.pp);
                        var i = l.findClosestAtom(o, .1);
                        if (null == i) {
                            var u;
                            a.addOp(u = new op.AtomAdd(r, o).perform(ui.editor)), v[e] = u.data.aid, a.mergeWith(atomAddToSGroups(f, v[e]))
                        } else v[e] = i.id, a.mergeWith(fromAtomsAttrs(v[e], r, !0))
                    }), u.bonds.each(function(e, t) {
                        var r = s.findBondId(v[t.begin], v[t.end]); - 1 == r ? a.addOp(new op.BondAdd(v[t.begin], v[t.end], t).perform(ui.editor)) : a.mergeWith(fromBondAttrs(r, g, !1, !0))
                    }), a.operations.reverse(), a
                }

                function fromChain(e, t, r, o) {
                    var n, i = Math.PI / 6,
                        a = Math.cos(i),
                        u = Math.sin(i),
                        l = new Action;
                    n = null != o ? ui.render.atomGetAttr(o, "fragment") : l.addOp((new op.FragmentAdd).perform(ui.editor)).frid;
                    var d = -1;
                    return d = null != o ? o : l.addOp(new op.AtomAdd({
                        label: "C",
                        fragment: n
                    }, e).perform(ui.editor)).data.aid, l.operations.reverse(), r.times(function(r) {
                        var o = new Vec2(a * (r + 1), 1 & r ? 0 : u).rotate(t).add(e),
                            n = ui.render.findClosestAtom(o, .1),
                            i = fromBondAddition({}, d, n ? n.id : {}, o);
                        l = i[0].mergeWith(l), d = i[2]
                    }, this), l
                }

                function fromNewCanvas(e) {
                    var t = new Action;
                    return t.addOp(new op.CanvasLoad(e)), t.perform()
                }

                function fromSgroupType(e, t) {
                    var r = ui.render,
                        o = r.sGroupGetType(e);
                    if (t && t != o) {
                        var n = util.array(r.sGroupGetAtoms(e)),
                            i = r.sGroupGetAttrs(e),
                            a = fromSgroupDeletion(e),
                            u = fromSgroupAddition(t, n, i, e);
                        return u.mergeWith(a)
                    }
                    return new Action
                }

                function fromSgroupAttrs(e, t) {
                    var r = new Action,
                        o = ui.render,
                        n = o.ctab;
                    return n.sgroups.get(e).item, new Hash(t).each(function(t) {
                        r.addOp(new op.SGroupAttr(e, t.key, t.value))
                    }, this), r.perform()
                }

                function sGroupAttributeAction(e, t) {
                    var r = new Action;
                    return new Hash(t).each(function(t) {
                        r.addOp(new op.SGroupAttr(e, t.key, t.value))
                    }, this), r
                }

                function fromSgroupDeletion(e) {
                    var t = new Action,
                        r = ui.render,
                        o = r.ctab,
                        n = o.molecule;
                    if ("SRU" == ui.render.sGroupGetType(e)) {
                        ui.render.sGroupsFindCrossBonds();
                        var i = ui.render.sGroupGetNeighborAtoms(e);
                        i.each(function(e) {
                            "*" == ui.render.atomGetAttr(e, "label") && t.addOp(new op.AtomAttr(e, "label", "C"))
                        }, this)
                    }
                    var a = n.sgroups.get(e),
                        u = chem.SGroup.getAtoms(n, a),
                        l = a.getAttrs();
                    t.addOp(new op.SGroupRemoveFromHierarchy(e));
                    for (var d = 0; d < u.length; ++d) t.addOp(new op.SGroupAtomRemove(e, u[d]));
                    return t.addOp(new op.SGroupDelete(e)), t = t.perform(), t.mergeWith(sGroupAttributeAction(e, l)), t
                }

                function fromSgroupAddition(e, t, r, o, n) {
                    var i, a = new Action;
                    for (o = o - 0 === o ? o : ui.render.ctab.molecule.sgroups.newId(), a.addOp(new op.SGroupCreate(o, e, n)), i = 0; i < t.length; i++) a.addOp(new op.SGroupAtomAdd(o, t[i]));
                    if (a.addOp(new op.SGroupAddToHierarchy(o)), a = a.perform(), "SRU" == e) {
                        ui.render.sGroupsFindCrossBonds();
                        var u = new Action;
                        ui.render.sGroupGetNeighborAtoms(o).each(function(e) {
                            1 == ui.render.atomGetDegree(e) && ui.render.atomIsPlainCarbon(e) && u.addOp(new op.AtomAttr(e, "label", "*"))
                        }, this), u = u.perform(), u.mergeWith(a), a = u
                    }
                    return fromSgroupAttrs(o, r).mergeWith(a)
                }

                function fromRGroupAttrs(e, t) {
                    var r = new Action;
                    return new Hash(t).each(function(t) {
                        r.addOp(new op.RGroupAttr(e, t.key, t.value))
                    }, this), r.perform()
                }

                function fromRGroupFragment(e, t) {
                    var r = new Action;
                    return r.addOp(new op.RGroupFragment(e, t)), r.perform()
                }

                function getAnchorPosition(e) {
                    if (e.atoms.length) {
                        for (var t = 1e50, r = t, o = -t, n = -r, i = 0; i < e.atoms.length; i++) t = Math.min(t, e.atoms[i].pp.x), r = Math.min(r, e.atoms[i].pp.y), o = Math.max(o, e.atoms[i].pp.x), n = Math.max(n, e.atoms[i].pp.y);
                        return new Vec2((t + o) / 2, (r + n) / 2)
                    }
                    return e.rxnArrows.length ? e.rxnArrows[0].pp : e.rxnPluses.length ? e.rxnPluses[0].pp : e.chiralFlags.length ? e.chiralFlags[0].pp : null
                }

                function struct2Clipboard(e) {
                    console.assert(!e.isBlank(), "Empty struct");
                    var t = {
                            atoms: e.atoms.keys(),
                            bonds: e.bonds.keys(),
                            rxnArrows: e.rxnArrows.keys(),
                            rxnPluses: e.rxnPluses.keys()
                        },
                        r = {
                            atoms: [],
                            bonds: [],
                            sgroups: [],
                            rxnArrows: [],
                            rxnPluses: [],
                            chiralFlags: [],
                            rgmap: {},
                            rgroups: {}
                        },
                        o = {};
                    t.atoms.each(function(t) {
                        var n = new chem.Struct.Atom(e.atoms.get(t));
                        n.pos = n.pp, o[t] = r.atoms.push(new chem.Struct.Atom(n)) - 1
                    }), t.bonds.each(function(t) {
                        var n = new chem.Struct.Bond(e.bonds.get(t));
                        n.begin = o[n.begin], n.end = o[n.end], r.bonds.push(new chem.Struct.Bond(n))
                    });
                    var n = e.getSGroupsInAtomSet(t.atoms);
                    util.each(n, function(t) {
                        for (var n = e.sgroups.get(t), i = chem.SGroup.getAtoms(e, n), a = {
                                type: n.type,
                                attrs: n.getAttrs(),
                                atoms: util.array(i),
                                pp: n.pp
                            }, u = 0; u < a.atoms.length; u++) a.atoms[u] = o[a.atoms[u]];
                        r.sgroups.push(a)
                    }, this), t.rxnArrows.each(function(t) {
                        var o = new chem.Struct.RxnArrow(e.rxnArrows.get(t));
                        o.pos = o.pp, r.rxnArrows.push(o)
                    }), t.rxnPluses.each(function(t) {
                        var o = new chem.Struct.RxnPlus(e.rxnPluses.get(t));
                        o.pos = o.pp, r.rxnPluses.push(o)
                    });
                    var i = {},
                        a = Set.empty();
                    t.atoms.each(function(t) {
                        var r = e.atoms.get(t),
                            o = r.fragment;
                        i[t] = o, Set.add(a, o)
                    });
                    var u = Set.empty();
                    return Set.each(a, function(t) {
                        for (var o = chem.Struct.Fragment.getAtoms(e, t), n = 0; n < o.length; ++n)
                            if (!Set.contains(i, o[n])) return;
                        var a = chem.Struct.RGroup.findRGroupByFragment(e.rgroups, t);
                        r.rgmap[t] = a, Set.add(u, a)
                    }, this), Set.each(u, function(t) {
                        r.rgroups[t] = e.rgroups.get(t).getAttrs()
                    }, this), r
                }

                function fromPaste(e, t) {
                    for (var r = struct2Clipboard(e), o = t ? Vec2.diff(t, getAnchorPosition(r)) : new Vec2, n = new Action, i = {}, a = {}, u = 0; u < r.atoms.length; u++) {
                        var l = Object.clone(r.atoms[u]);
                        l.fragment in a || (a[l.fragment] = n.addOp((new op.FragmentAdd).perform(ui.editor)).frid), l.fragment = a[l.fragment], i[u] = n.addOp(new op.AtomAdd(l, l.pp.add(o)).perform(ui.editor)).data.aid
                    }
                    var d = [];
                    for (var s in r.rgroups) ui.ctab.rgroups.has(s) || d.push(s);
                    for (var c in r.rgmap) n.addOp(new op.RGroupFragment(r.rgmap[c], a[c]).perform(ui.editor));
                    for (var p = 0; p < d.length; ++p) n.mergeWith(fromRGroupAttrs(d[p], r.rgroups[d[p]]));
                    for (var m = 0; m < r.bonds.length; m++) {
                        var f = Object.clone(r.bonds[m]);
                        n.addOp(new op.BondAdd(i[f.begin], i[f.end], f).perform(ui.editor))
                    }
                    for (var g = 0; g < r.sgroups.length; g++) {
                        for (var h = r.sgroups[g], v = h.atoms, A = [], w = 0; w < v.length; w++) A.push(i[v[w]]);
                        for (var b = ui.render.ctab.molecule.sgroups.newId(), S = fromSgroupAddition(h.type, A, h.attrs, b, h.pp ? h.pp.add(o) : null), O = S.operations.length - 1; O >= 0; O--) n.addOp(S.operations[O])
                    }
                    if (ui.editor.render.ctab.rxnArrows.count() < 1)
                        for (var y = 0; y < r.rxnArrows.length; y++) n.addOp(new op.RxnArrowAdd(r.rxnArrows[y].pp.add(o)).perform(ui.editor));
                    for (var x = 0; x < r.rxnPluses.length; x++) n.addOp(new op.RxnPlusAdd(r.rxnPluses[x].pp.add(o)).perform(ui.editor));
                    return n.operations.reverse(), n
                }

                function fromFlip(e, t) {
                    var r, o = ui.render,
                        n = o.ctab,
                        i = n.molecule,
                        a = new Action,
                        u = {};
                    if (e.atoms) {
                        for (r = 0; r < e.atoms.length; r++) {
                            var l = e.atoms[r],
                                d = i.atoms.get(l);
                            d.fragment in u ? u[d.fragment].push(l) : u[d.fragment] = [l]
                        }
                        if (u = new Hash(u), u.detect(function(e) {
                                return !Set.eq(i.getFragmentIds(e[0]), Set.fromList(e[1]))
                            })) return a;
                        if (u.each(function(e) {
                                var r = Set.fromList(e[1]),
                                    o = i.getCoordBoundingBox(r);
                                Set.each(r, function(e) {
                                    var r = i.atoms.get(e),
                                        n = new Vec2;
                                    "horizontal" == t ? n.x = o.min.x + o.max.x - 2 * r.pp.x : n.y = o.min.y + o.max.y - 2 * r.pp.y, a.addOp(new op.AtomMove(e, n))
                                })
                            }), e.bonds)
                            for (r = 0; r < e.bonds.length; r++) {
                                var s = e.bonds[r],
                                    c = i.bonds.get(s);
                                c.type == chem.Struct.BOND.TYPE.SINGLE && (c.stereo == chem.Struct.BOND.STEREO.UP ? a.addOp(new op.BondAttr(s, "stereo", chem.Struct.BOND.STEREO.DOWN)) : c.stereo == chem.Struct.BOND.STEREO.DOWN && a.addOp(new op.BondAttr(s, "stereo", chem.Struct.BOND.STEREO.UP)))
                            }
                    }
                    return a.perform()
                }

                function fromRotate(e, t, r) {
                    function o(e) {
                        var o = e.sub(t);
                        return o = o.rotate(r), o.add_(t), o.sub(e)
                    }
                    var n = ui.render,
                        i = n.ctab,
                        a = i.molecule,
                        u = new Action;
                    return e.atoms && e.atoms.each(function(e) {
                        var t = a.atoms.get(e);
                        u.addOp(new op.AtomMove(e, o(t.pp)))
                    }), e.rxnArrows && e.rxnArrows.each(function(e) {
                        var t = a.rxnArrows.get(e);
                        u.addOp(new op.RxnArrowMove(e, o(t.pp)))
                    }), e.rxnPluses && e.rxnPluses.each(function(e) {
                        var t = a.rxnPluses.get(e);
                        u.addOp(new op.RxnPlusMove(e, o(t.pp)))
                    }), e.sgroupData && e.sgroupData.each(function(e) {
                        var t = a.sgroups.get(e);
                        u.addOp(new op.SGroupDataMove(e, o(t.pp)))
                    }), e.chiralFlags && e.chiralFlags.each(function(e) {
                        var t = a.chiralFlags.get(e);
                        u.addOp(new op.ChiralFlagMove(e, o(t.pp)))
                    }), u.perform()
                }
                var Set = require("../util/set"),
                    Vec2 = require("../util/vec2"),
                    util = require("../util"),
                    op = require("./op");
                require("../chem");
                var ui = global.ui,
                    chem = global.chem;
                Action.prototype.addOp = function(e) {
                    return e.isDummy(ui.editor) || this.operations.push(e), e
                }, Action.prototype.mergeWith = function(e) {
                    return this.operations = this.operations.concat(e.operations), this
                }, Action.prototype.perform = function() {
                    var e = new Action,
                        t = 0;
                    return this.operations.each(function(r) {
                        e.addOp(r.perform(ui.editor)), t++
                    }, this), e.operations.reverse(), e
                }, Action.prototype.isDummy = function() {
                    return null == this.operations.detect(function(e) {
                        return !e.isDummy(ui.editor)
                    }, this)
                }, Action.prototype.removeAtomFromSgroupIfNeeded = function(e) {
                    var t = ui.render.atomGetSGroups(e);
                    return t.length > 0 ? (t.each(function(t) {
                        this.addOp(new op.SGroupAtomRemove(t, e))
                    }, this), !0) : !1
                }, Action.prototype.removeSgroupIfNeeded = function(e) {
                    var t = ui.render,
                        r = t.ctab,
                        o = r.molecule,
                        n = new Hash;
                    e.each(function(e) {
                        var t = ui.render.atomGetSGroups(e);
                        t.each(function(e) {
                            var t = n.get(e);
                            Object.isUndefined(t) ? t = 1 : t++, n.set(e, t)
                        }, this)
                    }, this), n.each(function(e) {
                        var t = parseInt(e.key),
                            r = ui.render.sGroupGetAtoms(t);
                        if (r.length == e.value) {
                            var n = o.sgroups.get(t);
                            this.mergeWith(sGroupAttributeAction(t, n.getAttrs())), this.addOp(new op.SGroupRemoveFromHierarchy(t)), this.addOp(new op.SGroupDelete(t))
                        }
                    }, this)
                }, module.exports = util.extend(Action, {
                    fromMultipleMove: fromMultipleMove,
                    fromAtomAddition: fromAtomAddition,
                    fromArrowAddition: fromArrowAddition,
                    fromArrowDeletion: fromArrowDeletion,
                    fromChiralFlagDeletion: fromChiralFlagDeletion,
                    fromPlusAddition: fromPlusAddition,
                    fromPlusDeletion: fromPlusDeletion,
                    fromAtomDeletion: fromAtomDeletion,
                    fromBondDeletion: fromBondDeletion,
                    fromFragmentDeletion: fromFragmentDeletion,
                    fromAtomMerge: fromAtomMerge,
                    fromBondFlipping: fromBondFlipping,
                    fromTemplateOnCanvas: fromTemplateOnCanvas,
                    fromTemplateOnAtom: fromTemplateOnAtom,
                    fromTemplateOnBond: fromTemplateOnBond,
                    fromAtomsAttrs: fromAtomsAttrs,
                    fromBondAttrs: fromBondAttrs,
                    fromChain: fromChain,
                    fromBondAddition: fromBondAddition,
                    fromNewCanvas: fromNewCanvas,
                    fromSgroupType: fromSgroupType,
                    fromSgroupDeletion: fromSgroupDeletion,
                    fromSgroupAttrs: fromSgroupAttrs,
                    fromRGroupFragment: fromRGroupFragment,
                    fromPaste: fromPaste,
                    fromRGroupAttrs: fromRGroupAttrs,
                    fromSgroupAddition: fromSgroupAddition,
                    fromFlip: fromFlip,
                    fromRotate: fromRotate
                });

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../chem": 11,
            "../util": 39,
            "../util/set": 42,
            "../util/vec2": 43,
            "./op": 35
        }],
        27: [function(require, module, exports) {
            (function(global) {
                function initDialogs() {
                    $("input_label").observe("blur", function() {
                        keymage.setScope("editor"), this.hide()
                    }), $("input_label").observe("keypress", onKeyPress_InputLabel), $("input_label").observe("keyup", onKeyUp_InputLabel), $("atom_label").observe("change", onChange_AtomLabel), $("atom_charge").observe("change", onChange_AtomCharge), $("atom_isotope").observe("change", onChange_AtomIsotope), $("atom_valence").observe("change", onChange_AtomValence), $("atom_prop_cancel").observe("click", function() {
                        ui.hideDialog("atom_properties")
                    }), $("atom_prop_ok").observe("click", function() {
                        applyAtomProperties()
                    }), $("bond_prop_cancel").observe("click", function() {
                        ui.hideDialog("bond_properties")
                    }), $("bond_prop_ok").observe("click", function() {
                        applyBondProperties()
                    })
                }

                function showAtomAttachmentPoints(e) {
                    $("atom_ap1").checked = (1 & (e.selection || 0)) > 0, $("atom_ap2").checked = (2 & (e.selection || 0)) > 0, ui.showDialog("atom_attpoints");
                    var t = new Event.Handler("atom_attpoints_ok", "click", void 0, function() {
                            t.stop(), r.stop(), ui.hideDialog("atom_attpoints"), "onOk" in e && e.onOk(($("atom_ap1").checked ? 1 : 0) + ($("atom_ap2").checked ? 2 : 0))
                        }).start(),
                        r = new Event.Handler("atom_attpoints_cancel", "click", void 0, function() {
                            t.stop(), r.stop(), ui.hideDialog("atom_attpoints"), "onCancel" in e && e.onCancel()
                        }).start();
                    $("atom_attpoints_ok").focus()
                }

                function showAtomProperties(e) {
                    $("atom_properties").atom_id = e, $("atom_label").value = ui.render.atomGetAttr(e, "label"), onChange_AtomLabel.call($("atom_label"));
                    var t = ui.render.atomGetAttr(e, "charge") - 0;
                    $("atom_charge").value = 0 == t ? "" : t, t = ui.render.atomGetAttr(e, "isotope") - 0, $("atom_isotope").value = 0 == t ? "" : t, t = ui.render.atomGetAttr(e, "explicitValence") - 0, $("atom_valence").value = 0 > t ? "" : t, $("atom_radical").value = ui.render.atomGetAttr(e, "radical"), $("atom_inversion").value = ui.render.atomGetAttr(e, "invRet"), $("atom_exactchange").value = ui.render.atomGetAttr(e, "exactChangeFlag") ? 1 : 0, $("atom_ringcount").value = ui.render.atomGetAttr(e, "ringBondCount"), $("atom_substitution").value = ui.render.atomGetAttr(e, "substitutionCount"), $("atom_unsaturation").value = ui.render.atomGetAttr(e, "unsaturatedAtom"), $("atom_hcount").value = ui.render.atomGetAttr(e, "hCount"), ui.showDialog("atom_properties"), $("atom_label").activate()
                }

                function applyAtomProperties() {
                    ui.hideDialog("atom_properties");
                    var e = $("atom_properties").atom_id;
                    ui.addUndoAction(Action.fromAtomsAttrs(e, {
                        label: $("atom_label").value,
                        charge: "" == $("atom_charge").value ? 0 : parseInt($("atom_charge").value, 10),
                        isotope: "" == $("atom_isotope").value ? 0 : parseInt($("atom_isotope").value, 10),
                        explicitValence: "" == $("atom_valence").value ? -1 : parseInt($("atom_valence").value, 10),
                        radical: parseInt($("atom_radical").value, 10),
                        invRet: parseInt($("atom_inversion").value, 10),
                        exactChangeFlag: parseInt($("atom_exactchange").value, 10) ? !0 : !1,
                        ringBondCount: parseInt($("atom_ringcount").value, 10),
                        substitutionCount: parseInt($("atom_substitution").value, 10),
                        unsaturatedAtom: parseInt($("atom_unsaturation").value, 10),
                        hCount: parseInt($("atom_hcount").value, 10)
                    }), !0), ui.render.update()
                }

                function onChange_AtomLabel() {
                    this.value = this.value.strip().capitalize();
                    var e = element.getElementByLabel(this.value);
                    null == e && "A" !== this.value && "*" !== this.value && "Q" !== this.value && "X" !== this.value && "R" !== this.value && (this.value = ui.render.atomGetAttr($("atom_properties").atom_id, "label"), "A" !== this.value && "*" !== this.value && (e = element.getElementByLabel(this.value))), $("atom_number").value = "A" == this.value || "*" == this.value ? "any" : e ? e.toString() : ""
                }

                function onChange_AtomCharge() {
                    "" === this.value.strip() || "0" == this.value ? this.value = "" : this.value.match(/^[1-9][0-9]{0,1}[-+]$/) ? this.value = (this.value.endsWith("-") ? "-" : "") + this.value.substr(0, this.value.length - 1) : this.value.match(/^[+-]?[1-9][0-9]{0,1}$/) || (this.value = ui.render.atomGetAttr($("atom_properties").atom_id, "charge"))
                }

                function onChange_AtomIsotope() {
                    this.value == util.getElementTextContent($("atom_number")) || "" == this.value.strip() || "0" == this.value ? this.value = "" : this.value.match(/^[1-9][0-9]{0,2}$/) || (this.value = ui.render.atomGetAttr($("atom_properties").atom_id, "isotope"))
                }

                function onChange_AtomValence() {}

                function showBondProperties(e) {
                    var t;
                    $("bond_properties").bond_id = e;
                    var r = ui.render.bondGetAttr(e, "type"),
                        n = ui.render.bondGetAttr(e, "stereo");
                    for (t in ui.bondTypeMap)
                        if (ui.bondTypeMap[t].type == r && ui.bondTypeMap[t].stereo == n) break;
                    $("bond_type").value = t, $("bond_topology").value = ui.render.bondGetAttr(e, "topology") || 0, $("bond_center").value = ui.render.bondGetAttr(e, "reactingCenterStatus") || 0, ui.showDialog("bond_properties"), $("bond_type").activate()
                }

                function applyBondProperties() {
                    ui.hideDialog("bond_properties");
                    var e = $("bond_properties").bond_id,
                        t = Object.clone(ui.bondTypeMap[$("bond_type").value]);
                    t.topology = parseInt($("bond_topology").value, 10), t.reactingCenterStatus = parseInt($("bond_center").value, 10), ui.addUndoAction(Action.fromBondAttrs(e, t), !0), ui.render.update()
                }

                function showAutomapProperties(e) {
                    ui.showDialog("automap_properties");
                    var t, r;
                    t = new Event.Handler("automap_ok", "click", void 0, function() {
                        t.stop(), r.stop(), e && "onOk" in e && e.onOk($("automap_mode").value), ui.hideDialog("automap_properties")
                    }).start(), r = new Event.Handler("automap_cancel", "click", void 0, function() {
                        t.stop(), r.stop(), ui.hideDialog("automap_properties"), e && "onCancel" in e && e.onCancel()
                    }).start(), $("automap_mode").activate()
                }

                function showRLogicTable(e) {
                    var t = e || {};
                    t.rlogic = t.rlogic || {}, $("rlogic_occurrence").value = t.rlogic.occurrence || ">0", $("rlogic_resth").value = t.rlogic.resth ? "1" : "0";
                    for (var r = '<option value="0">Always</option>', n = 1; 32 >= n; n++) n != t.rgid && 0 != (t.rgmask & 1 << n - 1) && (r += '<option value="' + n + '">IF R' + t.rgid + " THEN R" + n + "</option>");
                    $("rlogic_if").outerHTML = '<select id="rlogic_if">' + r + "</select>", $("rlogic_if").value = t.rlogic.ifthen, ui.showDialog("rlogic_table");
                    var o = new Event.Handler("rlogic_ok", "click", void 0, function() {
                            var e = {
                                occurrence: $("rlogic_occurrence").value.replace(/\s*/g, "").replace(/,+/g, ",").replace(/^,/, "").replace(/,$/, ""),
                                resth: "1" == $("rlogic_resth").value,
                                ifthen: parseInt($("rlogic_if").value, 10)
                            };
                            t && "onOk" in t && !t.onOk(e) || (o.stop(), i.stop(), ui.hideDialog("rlogic_table"))
                        }).start(),
                        i = new Event.Handler("rlogic_cancel", "click", void 0, function() {
                            o.stop(), i.stop(), ui.hideDialog("rlogic_table"), t && "onCancel" in t && t.onCancel()
                        }).start();
                    $("rlogic_occurrence").activate()
                }

                function onKeyPress_Dialog(e) {
                    return util.stopEventPropagation(e), 27 === e.keyCode ? (ui.hideDialog(this.id), util.preventDefault(e)) : void 0
                }

                function onKeyPress_InputLabel(e) {
                    if (util.stopEventPropagation(e), 13 == e.keyCode) {
                        keymage.setScope("editor"), this.hide();
                        var t = "",
                            r = 0,
                            n = this.value.toArray();
                        if ("*" == this.value) t = "A";
                        else if (this.value.match(/^[*][1-9]?[+-]$/i)) t = "A", r = 2 == this.value.length ? 1 : parseInt(n[1]), "-" == n[2] && (r *= -1);
                        else if (this.value.match(/^[A-Z]{1,2}$/i)) t = this.value.capitalize();
                        else if (this.value.match(/^[A-Z]{1,2}[0][+-]?$/i)) t = this.value.match(/^[A-Z]{2}/i) ? this.value.substr(0, 2).capitalize() : n[0].capitalize();
                        else if (this.value.match(/^[A-Z]{1,2}[1-9]?[+-]$/i)) {
                            t = this.value.match(/^[A-Z]{2}/i) ? this.value.substr(0, 2).capitalize() : n[0].capitalize();
                            var o = this.value.match(/[0-9]/i);
                            r = null != o ? parseInt(o[0]) : 1, "-" == n[this.value.length - 1] && (r *= -1)
                        }
                        return ("A" == t || "Q" == t || "X" == t || "R" == t || null != element.getElementByLabel(t)) && (ui.addUndoAction(Action.fromAtomsAttrs(this.atom_id, {
                            label: t,
                            charge: r
                        }), !0), ui.render.update()), util.preventDefault(e)
                    }
                    return 27 == e.keyCode ? (this.hide(), keymage.setScope("editor"), util.preventDefault(e)) : void 0
                }

                function onKeyUp_InputLabel(e) {
                    return util.stopEventPropagation(e), 27 == e.keyCode ? (this.hide(), keymage.setScope("editor"), util.preventDefault(e)) : void 0
                }

                function showLabelEditor(e) {
                    var t = $("input_label");
                    keymage.setScope("label");
                    var r = Math.min(7 * ui.render.zoom, 16);
                    t.atom_id = e, t.value = ui.render.atomGetAttr(e, "label"), t.style.fontSize = 2 * r + "px", t.show();
                    var n = ui.render.obj2view(ui.render.atomGetPos(e)),
                        o = {
                            left: 0,
                            top: 0
                        },
                        i = Element.cumulativeOffset(t.offsetParent),
                        a = 0;
                    t.style.left = n.x + o.left - i.left - r - a + "px", t.style.top = n.y + o.top - i.top - r - a + "px", t.activate()
                }
                var keymage = require("keymage"),
                    element = require("../../chem/element"),
                    util = require("../../util"),
                    Action = require("../action"),
                    ui = global.ui;
                module.exports = {
                    initDialogs: initDialogs,
                    showAtomAttachmentPoints: showAtomAttachmentPoints,
                    showAtomProperties: showAtomProperties,
                    showBondProperties: showBondProperties,
                    showAutomapProperties: showAutomapProperties,
                    showRLogicTable: showRLogicTable,
                    showLabelEditor: showLabelEditor
                };

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../../chem/element": 10,
            "../../util": 39,
            "../action": 26,
            "keymage": 2
        }],
        28: [function(require, module, exports) {
            (function(global) {
                function dialog(t) {
                    var e, r = ui.showDialog("open-file"),
                        n = r.select("input[value=OK]")[0],
                        o = r.select("textarea")[0],
                        i = r.select("input[type=file]")[0],
                        s = r.select("input[name=fragment]")[0],
                        a = [];
                    a[0] = r.on("click", "input[type=button]", function(e, r) {
                        a.forEach(function(t) {
                            t.stop()
                        }), ui.hideDialog("open-file");
                        var n = "on" + r.value.capitalize();
                        t && n in t && t[n]({
                            fragment: s.checked,
                            value: o.value
                        })
                    }), a[1] = i.on("change", function(t, n) {
                        console.assert(e, "No valid file opener"), n.files.length && (r.select("input").each(function(t) {
                            t.disabled = !0
                        }), e(n.files[0]).then(function(t) {
                            o.value = t, r.select("input").each(function(t) {
                                t.disabled = !1
                            })
                        }, ui.echo))
                    }), a[2] = o.on("input", function() {
                        var t = o.value.trim();
                        n.disabled = !t
                    }), o.value = "", s.checked = !1, n.disabled = !0, i.disabled = !0, i.parentNode.addClassName("disabled"), fileOpener().then(function(t) {
                        e = t, i.disabled = !1, i.parentNode.removeClassName("disabled")
                    })
                }

                function fileOpener() {
                    function t(t) {
                        return new Promise(function(e, r) {
                            var n = new FileReader;
                            n.onload = function(t) {
                                e(t.target.result)
                            }, n.onerror = function(t) {
                                r(t)
                            }, n.readAsText(t, "UTF-8")
                        })
                    }

                    function e(t, e) {
                        var r = t.OpenTextFile(e.name, 1),
                            n = r.ReadAll();
                        return r.Close(), n
                    }

                    function r() {}
                    return new Promise(function(n, o) {
                        if (global.FileReader) return n(t);
                        if (global.ActiveXObject) try {
                            var i = new global.ActiveXObject("Scripting.FileSystemObject");
                            return n(function(t) {
                                return Promise.resolve(e(i, t))
                            })
                        } catch (s) {}
                        return ui.standalone ? o("Standalone mode!") : n(r)
                    })
                }

                function loadHook() {}
                var Promise = require("promise-polyfill"),
                    ui = global.ui;
                dialog.loadHook = loadHook, module.exports = dialog;

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "promise-polyfill": 3
        }],
        29: [function(require, module, exports) {
            (function(global) {
                function saveDialog(t, e) {
                    function r(t, e) {
                        e = e || "mol", i.value = t, i.className = e, i.activate()
                    }
                    var n, o = ui.showDialog("save-file"),
                        i = o.select("textarea")[0],
                        s = o.select("select")[0],
                        a = o.select(".save")[0],
                        l = [];
                    l[0] = o.on("click", "input[type=button]", function(e, r) {
                        l.forEach(function(t) {
                            t.stop()
                        }), ui.hideDialog("save-file");
                        var n = "on" + r.value.capitalize();
                        t && n in t && t[n]({})
                    }), l[1] = s.on("change", function() {
                        var n = s.value;
                        convertMolecule(e, t.molecule, n).then(function(t) {
                            r(t, n)
                        }, ui.echo)
                    }), l[2] = a.on("click", function(t) {
                        n && (n(i.value, s.value), o.select("input[type=button]")[0].click()), t.preventDefault()
                    }), r((new chem.MolfileSaver).saveMolecule(t.molecule)), a.addClassName("disabled"), fileSaver(e).then(function(t) {
                        n = t, a.removeClassName("disabled")
                    }), s.select("[value=inchi]")[0].disabled = ui.standalone
                }

                function fileSaver(t) {
                    var e = {
                        smi: "chemical/x-daylight-smiles",
                        mol: "chemical/x-mdl-molfile",
                        rxn: "chemical/x-mdl-rxnfile",
                        inchi: "chemical/x-inchi"
                    };
                    return new Promise(function(r, n) {
                        global.Blob && fs.saveAs ? r(function(t, r) {
                            "mol" == r && 0 == t.indexOf("$RXN") && (r = "rxn"), console.assert(e[r], "Unknown chemical file type");
                            var n = new Blob([t], {
                                type: e[r]
                            });
                            fs.saveAs(n, "ketcher." + r)
                        }) : ui.standalone ? n("Standalone mode!") : r(function(e, r) {
                            t.save({
                                filedata: [r, e].join("\n")
                            })
                        })
                    })
                }

                function convertMolecule(t, e, r) {
                    return new Promise(function(n) {
                        var o = (new chem.MolfileSaver).saveMolecule(e);
                        if ("mol" == r) n(o);
                        else if ("smi" == r) n(ui.standalone ? (new chem.SmilesSaver).saveMolecule(e) : t.smiles({
                            moldata: o
                        }));
                        else if ("inchi" == r) {
                            if (ui.standalone) throw Error("InChI is not supported in the standalone mode");
                            0 !== e.rgroups.count() && ui.echo("R-group fragments are not supported and will be discarded"), e = e.getScaffold(), 0 === e.atoms.count() ? n("") : (e = e.clone(), e.sgroups.each(function(t, e) {
                                if ("MUL" != e.type && !/^INDIGO_.+_DESC$/i.test(e.data.fieldName)) throw Error("InChi data format doesn't support s-groups")
                            }), n(t.inchi({
                                moldata: o
                            })))
                        }
                    })
                }
                var Promise = require("promise-polyfill"),
                    fs = require("filesaver.js");
                require("../../chem");
                var chem = global.chem,
                    ui = global.ui;
                module.exports = saveDialog;

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../../chem": 11,
            "filesaver.js": 1,
            "promise-polyfill": 3
        }],
        30: [function(require, module, exports) {
            (function(global) {
                function dialog(t, e) {
                    function r(t) {
                        o.select(".selected").each(function(t) {
                            t.removeClassName("selected")
                        }), t ? o.select("button").each(function(e) {
                            var r = e.value || e.textContent || e.innerText;
                            t.indexOf(r) >= 0 && e.addClassName("selected")
                        }) : e.required && (i.disabled = !0)
                    }

                    function n() {
                        var t = [];
                        return o.select(".selected").each(function(e) {
                            var r = e.value || e.textContent || e.innerText;
                            t.push(r)
                        }), t
                    }
                    var o = ui.showDialog(t),
                        i = o.select("input[value=OK]")[0],
                        s = e.mode || "single",
                        a = [];
                    a[0] = o.on("click", "input[type=button]", function(r, o) {
                        a.forEach(function(t) {
                            t.stop()
                        }), ui.hideDialog(t);
                        var i = "on" + o.value.capitalize();
                        console.assert("onOk" != i || !e.required || 0 != n().length, "No elements selected"), e && i in e && e[i]({
                            mode: s,
                            values: n()
                        })
                    }), a[1] = o.on("click", "button", function(t, n) {
                        "single" === s && (n.hasClassName("selected") ? e.required && i.click() : r(null)), n.toggleClassName("selected"), e.required && (i.disabled = 0 === o.select(".selected").length), t.stop()
                    }), a[2] = o.on("click", "input[name=mode]", function(t, e) {
                        e.value != s && ("single" == e.value && r(null), s = e.value)
                    }), r(e.values), o.select("input[name=mode]").each(function(t) {
                        t.value == s && (t.checked = !0)
                    })
                }
                var ui = global.ui;
                module.exports = dialog;

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {}],
        31: [function(require, module, exports) {
            (function(global) {
                function dialog(e) {
                    var t = ui.showDialog("sgroup_special"),
                        r = {},
                        n = [];
                    console.assert(!e.type || "DAT" == e.type), console.assert(!e.type || e.attrs.fieldName);
                    var o = e.type && matchContext(e.attrs.fieldName, e.attrs.fieldValue) || e.context || "Fragment";
                    setContext(o, r, !0), e.attrs.fieldName && setField(e.attrs.fieldName, r, !0), $("sgroup_special_value").value = e.attrs.fieldValue, e.attrs.attached ? $("sgroup_special_attached").checked = !0 : e.attrs.absolute ? $("sgroup_special_absolute").checked = !0 : $("sgroup_special_relative").checked = !0, n[0] = t.on("click", "input[type=button]", function(t, r) {
                        var o = "on" + r.value.capitalize(),
                            i = "onOk" != o || getValidateAttrs();
                        i && (n.forEach(function(e) {
                            e.stop()
                        }), ui.hideDialog("sgroup_special"), o in e && i && e[o](i))
                    }), n[1] = t.on("change", "select", function(e, t) {
                        "sgroup_context" == t.id && setContext($("sgroup_context").value, r), "sgroup_special_name" == t.id && setField($("sgroup_special_name").value, r)
                    })
                }

                function getValidateAttrs() {
                    var e = {
                        mul: null,
                        connectivity: "",
                        name: "",
                        subscript: ""
                    };
                    return e.fieldName = $("sgroup_special_name").value.strip(), e.fieldValue = $("sgroup_special_value").value.strip(), e.absolute = $("sgroup_special_absolute").checked, e.attached = $("sgroup_special_attached").checked, "" == e.fieldValue ? (alert("Please, specify data field value."), null) : {
                        type: "DAT",
                        attrs: e
                    }
                }

                function setContext(e, t, r) {
                    if (console.info("set context:", e, t), console.assert(t.context || r, "Field setup should be forced"), r || e != t.context.name) {
                        t.context = util.find(special_choices, function(t) {
                            return t.name == e
                        }), console.assert(t.context, "Can't find such context");
                        var n = t.context.value.reduce(function(e, t) {
                            return e + '<option value="' + t.name + '">' + t.name + "</option>"
                        }, "");
                        $("sgroup_special_name").update(n), setField(t.context.value[0].name, t, !0), r && ($("sgroup_context").value = e)
                    }
                }

                function setField(e, t, r) {
                    if (console.info("set field:", e, t), console.assert(t.field || r, "Field setup should be forced"), e || e != t.field.name) {
                        if (t.field = util.find(t.context.value, function(t) {
                                return t.name == e
                            }), console.assert(t.field, "Can't find such field"), t.field.value) {
                            var n = t.field.value.reduce(function(e, t) {
                                return e + '<option value="' + t + '">' + t + "</option>"
                            }, "");
                            $("sgroup_special_value").outerHTML = '<select size="10" id="sgroup_special_value">' + n + "</select>"
                        } else $("sgroup_special_value").outerHTML = '<textarea id="sgroup_special_value"></textarea>';
                        $("sgroup_special_name").value = e
                    }
                }

                function matchContext(e, t) {
                    console.info("search:", util.unicodeLiteral(e), util.unicodeLiteral(t));
                    var r = util.find(special_choices, function(r) {
                        var n = util.find(r.value, function(t) {
                            return t.name == e
                        });
                        return n ? !t || !n.value || !!util.find(n.value, function(e) {
                            return e == t
                        }) : !1
                    });
                    return r && r.name
                }
                var util = require("../../util"),
                    ui = global.ui,
                    special_choices = [{
                        name: "Fragment",
                        value: [{
                            name: "MDLBG_FRAGMENT_STEREO",
                            value: ["abs", "(+)-enantiomer", "(-)-enantiomer", "steric", "rel", "R(a)", "S(a)", "R(p)", "S(p)"]
                        }, {
                            name: "MDLBG_FRAGMENT_COEFFICIENT",
                            value: null
                        }, {
                            name: "MDLBG_FRAGMENT_CHARGE",
                            value: null
                        }, {
                            name: "MDLBG_FRAGMENT_RADICALS",
                            value: null
                        }]
                    }, {
                        name: "Single Bond",
                        value: [{
                            name: "MDLBG_STEREO_KEY",
                            value: ["erythro", "threo", "alpha", "beta", "endo", "exo", "anti", "syn", "ECL", "STG"]
                        }, {
                            name: "MDLBG_BOND_KEY",
                            value: ["Value=4"]
                        }]
                    }, {
                        name: "Atom",
                        value: [{
                            name: "MDLBG_STEREO_KEY",
                            value: ["RS", "SR", "P-3", "P-3-PI", "SP-4", "SP-4-PI", "T-4", "T-4-PI", "SP-5", "SP-5-PI", "TB-5", "TB-5-PI", "OC-6", "TB-5-PI", "TP-6", "PB-7", "CU-8", "SA-8", "DD-8", "HB-9", "TPS-9", "HB-9"]
                        }]
                    }, {
                        name: "Group",
                        value: [{
                            name: "MDLBG_STEREO_KEY",
                            value: ["cis", "trans"]
                        }]
                    }];
                dialog.match = function(e) {
                    return !e.type || "DAT" == e.type && !!matchContext(e.attrs.fieldName, e.attrs.fieldValue)
                }, module.exports = dialog;

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../../util": 39
        }],
        32: [function(require, module, exports) {
            (function(global) {
                function dialog(t) {
                    var e = ui.showDialog("sgroup_properties"),
                        r = t.type || "GEN";
                    switch ($("sgroup_type").value = r, $("sgroup_type").activate(), onChange_SGroupType.call($("sgroup_type")), r) {
                        case "SRU":
                            $("sgroup_connection").value = t.attrs.connectivity, $("sgroup_label").value = t.attrs.subscript;
                            break;
                        case "MUL":
                            $("sgroup_label").value = t.attrs.mul;
                            break;
                        case "SUP":
                            $("sgroup_label").value = t.attrs.name;
                            break;
                        case "DAT":
                            $("sgroup_field_name").value = t.attrs.fieldName, $("sgroup_field_value").value = t.attrs.fieldValue, t.attrs.attached ? $("sgroup_pos_attached").checked = !0 : t.attrs.absolute ? $("sgroup_pos_absolute").checked = !0 : $("sgroup_pos_relative").checked = !0
                    }
                    "DAT" != r && ($("sgroup_field_name").value = "", $("sgroup_field_value").value = "");
                    var n = [];
                    n[0] = e.on("click", "input[type=button]", function(e, r) {
                        var o = "on" + r.value.capitalize(),
                            i = "onOk" != o || getValidateAttrs();
                        i && (n.forEach(function(t) {
                            t.stop()
                        }), ui.hideDialog("sgroup_properties"), o in t && i && t[o](i))
                    }), n[1] = $("sgroup_type").on("change", onChange_SGroupType), n[2] = $("sgroup_label").on("change", onChange_SGroupLabel)
                }

                function getValidateAttrs() {
                    var t = $("sgroup_type").value,
                        e = {
                            mul: null,
                            connectivity: "",
                            name: "",
                            subscript: "",
                            fieldName: "",
                            fieldValue: "",
                            attached: !1,
                            absolute: !1
                        };
                    switch (t) {
                        case "SRU":
                            if (e.connectivity = $("sgroup_connection").value.strip(), e.subscript = $("sgroup_label").value.strip(), 1 != e.subscript.length || !e.subscript.match(/^[a-zA-Z]$/)) return alert(e.subscript.length ? "SRU subscript should consist of a single letter." : "Please provide an SRU subscript."), null;
                            break;
                        case "MUL":
                            e.mul = parseInt($("sgroup_label").value);
                            break;
                        case "SUP":
                            if (e.name = $("sgroup_label").value.strip(), !e.name) return alert("Please provide a name for the superatom."), null;
                            break;
                        case "DAT":
                            if (e.fieldName = $("sgroup_field_name").value.strip(), e.fieldValue = $("sgroup_field_value").value.strip(), e.absolute = $("sgroup_pos_absolute").checked, e.attached = $("sgroup_pos_attached").checked, "" == e.fieldName || "" == e.fieldValue) return alert("Please, specify data field name and value."), null
                    }
                    return {
                        type: t,
                        attrs: e
                    }
                }

                function onChange_SGroupLabel() {
                    "MUL" != $("sgroup_type").value || this.value.match(/^[1-9][0-9]{0,2}$/) || (this.value = "1")
                }

                function onChange_SGroupType() {
                    var t = $("sgroup_type").value;
                    return "DAT" == t ? ($$("#sgroup_properties .base")[0].hide(), $$("#sgroup_properties .data")[0].show(), void 0) : ($$("#sgroup_properties .base")[0].show(), $$("#sgroup_properties .data")[0].hide(), $("sgroup_label").disabled = "SRU" != t && "MUL" != t && "SUP" != t, $("sgroup_connection").disabled = "SRU" != t, "MUL" != t || $("sgroup_label").value.match(/^[1-9][0-9]{0,2}$/) ? "SRU" == t ? $("sgroup_label").value = "n" : ("GEN" == t || "SUP" == t) && ($("sgroup_label").value = "") : $("sgroup_label").value = "1", void 0)
                }
                var ui = global.ui;
                module.exports = dialog;

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {}],
        33: [function(require, module, exports) {
            (function(global) {
                function parseSdf(t) {
                    var e = t.split(/^[$][$][$][$]$/m),
                        r = [];
                    return e.each(function(t) {
                        t = t.replace(/\r/g, ""), t = t.strip();
                        var e = t.indexOf("M  END");
                        if (-1 != e) {
                            var n = {};
                            n.molfile = t.substring(0, e + 6), n.name = t.substring(0, t.indexOf("\n")).strip(), t = t.substr(e + 7).strip();
                            var i = t.split(/^$/m);
                            i.each(function(t) {
                                if (t = t.strip(), t.startsWith("> <")) {
                                    var e = t.split("\n"),
                                        r = e[0].strip().substring(3, e[0].lastIndexOf(">")).strip();
                                    n[r] = parseInt(e[1].strip()) || e[1].strip()
                                }
                            }), r.push(n)
                        }
                    }), r
                }

                function fetchTemplateCustom(t) {
                    return ajax(t + "templates.sdf").then(function(t) {
                        var e = parseSdf(t.responseText),
                            r = [],
                            n = 0;
                        return e.each(function(t) {
                            r.push({
                                name: (t.name || "customtemplate " + ++n).capitalize(),
                                molfile: t.molfile,
                                aid: (t.atomid || 1) - 1,
                                bid: (t.bondid || 1) - 1
                            })
                        }), r
                    })
                }

                function initTemplateCustom(t, e) {
                    return fetchTemplateCustom(e).then(function(e) {
                        return custom_templates = e, eachAsync(e, function(e) {
                            var r = new Element("li");
                            r.title = e.name, t.insert({
                                bottom: r
                            });
                            var n = chem.Molfile.parseCTFile(e.molfile),
                                i = new rnd.Render(r, 0, {
                                    autoScale: !0,
                                    autoScaleMargin: 0,
                                    ignoreMouseEvents: !0,
                                    hideChiralFlag: !0,
                                    maxBondLength: 30
                                });
                            i.setMolecule(n), i.update()
                        }, 50)
                    })
                }

                function eachAsync(t, e, r, n) {
                    return new Promise(function(i) {
                        function o() {
                            a > s ? (e(t[s], s++), setTimeout(o, r)) : i()
                        }
                        var s = 0,
                            a = t.length;
                        setTimeout(o, n || r)
                    })
                }

                function dialog(t, e) {
                    var r = ui.showDialog("custom_templates"),
                        n = r.select(".selected")[0],
                        i = r.select("[value=OK]")[0],
                        o = r.select("ul")[0];
                    if (0 === o.children.length) {
                        $("loading").style.display = "", r.addClassName("loading");
                        var s = initTemplateCustom(o, t).then(function() {
                            $("loading").style.display = "none", r.removeClassName("loading")
                        });
                        s.then(function() {
                            i.disabled = !0, r.on("click", "li", function(t, e) {
                                n == e ? i.click() : (n ? n.removeClassName("selected") : i.disabled = !1, e.addClassName("selected"), n = e)
                            }), r.on("click", "input", function(t, r) {
                                var i, o = r.value,
                                    s = "on" + r.value.capitalize();
                                if ("OK" == o) {
                                    console.assert(n, "No element selected");
                                    var a = n.previousSiblings().size();
                                    i = custom_templates[a]
                                }
                                ui.hideDialog("custom_templates"), e && s in e && e[s](i)
                            })
                        })
                    }
                }
                var Promise = require("promise-polyfill");
                require("../../chem"), require("../../rnd");
                var ajax = require("../../util/ajax.js"),
                    ui = global.ui,
                    rnd = global.rnd,
                    chem = global.chem,
                    custom_templates;
                module.exports = dialog;

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../../chem": 11,
            "../../rnd": 21,
            "../../util/ajax.js": 37,
            "promise-polyfill": 3
        }],
        34: [function(require, module, exports) {
            (function(global) {
                function init(e, t) {
                    ketcherWindow = $$("[role=application]")[0] || $$("body")[0], toolbar = ketcherWindow.select("[role=toolbar]")[0], clientArea = $("canvas"), server = t, updateServerButtons(), server && server.knocknock().then(function() {
                        ui.standalone = !1, updateServerButtons()
                    }, function() {
                        document.title += " (standalone)"
                    }).then(function() {
                        e.mol && loadMolecule(e.mol)
                    }), obsolete.initDialogs();
                    var n = {};
                    toolbar.select("button").each(function(e) {
                        var t = e.textContent || e.innerText,
                            o = e.dataset ? e.dataset.keys : e.getAttribute("data-keys");
                        if (o) {
                            var r = o.split(",").map(function(e) {
                                    return e.strip()
                                }),
                                i = shortcutStr(r[0]),
                                a = e.parentNode.id;
                            e.title = (e.title || t) + " (" + i + ")", e.innerHTML += " <kbd>" + i + "</kbd>", r.forEach(function(e) {
                                var t = e.toLowerCase();
                                Array.isArray(n[t]) ? n[t].push(a) : n[t] = [a]
                            })
                        } else e.title = e.title || t
                    }), n = util.extend(n, {
                        a: ["atom-any"],
                        "defmod-a": ["select-all"],
                        "defmod-shift-a": ["deselect-all"],
                        "ctrl-alt-r": ["force-update"]
                    }), Object.keys(n).forEach(function(e) {
                        keymage("editor", e, 1 == n[e].length ? function(t) {
                            var o = n[e][0]; - 1 == clipActions.indexOf(o) && (selectAction(n[e][0]), t.preventDefault())
                        } : function() {
                            console.info("actions", n[e])
                        })
                    }), keymage.setScope("editor"), toolbar.select("li").each(function(e) {
                        e.on("click", function(e) {
                            "BUTTON" == e.target.tagName && e.target.parentNode == this && (this.hasClassName("selected") || e.stop(), selectAction(this.id)), hideBlurredControls() ? e.stop() : "hidden" == this.getStyle("overflow") && (this.addClassName("opened"), dropdownOpened = this, e.stop())
                        })
                    }), initCliparea(ketcherWindow), initZoom(), updateHistoryButtons(), clientArea.on("scroll", onScroll_ClientArea), clientArea.on("mousedown", function() {
                        keymage.setScope("editor")
                    });
                    var o = new rnd.RenderOptions(e);
                    o.atomColoring = !0, ui.render = new rnd.Render(clientArea, SCALE, o), ui.editor = new rnd.Editor(ui.render), ui.render.onCanvasOffsetChanged = onOffsetChanged, selectAction("select-lasso"), setScrollOffset(0, 0), ui.render.setMolecule(ui.ctab), ui.render.update()
                }

                function shortcutStr(e) {
                    var t = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
                    return e.replace(/Defmod/g, t ? "⌘" : "Ctrl").replace(/-(?!$)/g, "+")
                }

                function subEl(e) {
                    return $(e).children[0]
                }

                function hideBlurredControls() {
                    if (!dropdownOpened) return !1;
                    dropdownOpened.removeClassName("opened");
                    var e = dropdownOpened.select(".selected");
                    if (1 == e.length) {
                        var t = subEl(dropdownOpened);
                        t.style.marginTop = -e[0].offsetTop + t.offsetTop + "px"
                    }
                    return clientArea.style.visibility = "hidden", setTimeout(function() {
                        clientArea.style.visibility = "visible"
                    }, 0), dropdownOpened = null, !0
                }

                function selectAction(e) {
                    e = e || lastSelected;
                    var t = $(e),
                        n = [].slice.call(arguments, 1);
                    if (console.assert(e.startsWith, "id is not a string", e), -1 != clipActions.indexOf(e) && 0 == n.length) return delegateCliparea(e);
                    if (!t || !subEl(t).disabled) {
                        n.unshift(e);
                        var o = mapTool.apply(null, n);
                        if (o instanceof rnd.Editor.EditorTool) {
                            var r = toolbar.select(".selected")[0];
                            t == r && t || (ui.render.current_tool && ui.render.current_tool.OnCancel(), ui.render.current_tool = o, e.startsWith("select-") && (lastSelected = e), t && t.addClassName("selected"), r && r.removeClassName("selected"))
                        }
                        return o
                    }
                    return null
                }

                function delegateCliparea(e) {
                    var t = document.queryCommandSupported(e);
                    if (t) try {
                        document.execCommand(e)
                    } catch (n) {
                        t = !1
                    }
                    if (!t) {
                        var o = subEl(e),
                            r = o.dataset ? o.dataset.keys : o.getAttribute("data-keys");
                        echo("These action is unavailble via menu.\nInstead, use " + shortcutStr(r) + " to " + e + ".")
                    }
                    return null
                }

                function initCliparea(e) {
                    var t = new Element("input", {
                            type: "text",
                            "class": "cliparea",
                            autofocus: !0
                        }),
                        n = window.clipboardData,
                        o = ["chemical/x-mdl-molfile", "chemical/x-mdl-rxnfile", "chemical/x-cml", "text/plain", "chemical/x-daylight-smiles", "chemical/x-inchi"],
                        r = function() {
                            return "editor" == keymage.getScope() ? (t.value = " ", t.focus(), t.select(), !0) : !1
                        },
                        i = function(e, t) {
                            var o = (new chem.MolfileSaver).saveMolecule(e);
                            if (!t && n) n.setData("text", o);
                            else {
                                t.setData("text/plain", o);
                                try {
                                    t.setData(e.isReaction ? "chemical/x-mdl-rxnfile" : "chemical/x-mdl-molfile", o), t.setData("chemical/x-daylight-smiles", (new chem.SmilesSaver).saveMolecule(e))
                                } catch (r) {
                                    console.info("Could not write exact type", r)
                                }
                            }
                        },
                        a = function(e) {
                            var t = "";
                            if (!e && n) t = n.getData("text");
                            else
                                for (var r = 0; r < o.length && !(t = e.getData(o[r])); r++);
                            return console.info("paste", r >= 0 && o[r], t.slice(0, 50), ".."), t
                        };
                    e.insert(t), e.on("mouseup", r), ["copy", "cut"].forEach(function(t) {
                        e.on(t, function(e) {
                            if (r()) {
                                var n = selectAction(t, !0);
                                n && i(n, e.clipboardData), e.preventDefault()
                            }
                        })
                    }), e.on("paste", function(e) {
                        if (r()) {
                            var t = a(e.clipboardData);
                            t && loadFragment(t), e.preventDefault()
                        }
                    })
                }

                function updateClipboardButtons() {
                    subEl("copy").disabled = subEl("cut").disabled = !ui.editor.hasSelection(!0)
                }

                function updateHistoryButtons() {
                    subEl("undo").disabled = 0 == undoStack.length, subEl("redo").disabled = 0 == redoStack.length
                }

                function updateServerButtons() {
                    serverActions.forEach(function(e) {
                        subEl(e).disabled = ui.standalone
                    })
                }

                function transitionEndEvent() {
                    var e, t = document.createElement("transitionTest"),
                        n = {
                            WebkitTransition: "webkitTransitionEnd",
                            MozTransition: "transitionend",
                            OTransition: "oTransitionEnd otransitionend",
                            transition: "transitionend"
                        };
                    for (e in n)
                        if (void 0 !== t.style[e]) return n[e];
                    return !1
                }

                function animateToggle(e, t) {
                    ketcherWindow.addClassName("animate");
                    var n = transitionEndEvent(),
                        o = function(e) {
                            setTimeout(function() {
                                e && e(), ketcherWindow.removeClassName("animate")
                            }, 0)
                        };
                    if (t && n) {
                        var r = function() {
                            o(t), e.removeEventListener(n, r, !1)
                        };
                        e.addEventListener(n, r, !1)
                    } else o(t), t || e()
                }

                function showDialog(e) {
                    var t = $(e);
                    return keymage.setScope("dialog"), animateToggle(function() {
                        $$(".overlay")[0].show(), t.style.display = ""
                    }), t
                }

                function hideDialog(e) {
                    var t = $$(".overlay")[0];
                    animateToggle(t, function() {
                        $(e).style.display = "none", t.hide(), keymage.setScope("editor")
                    })
                }

                function showElemTable(e) {
                    e.required = !0, selectDialog("elem-table", e)
                }

                function showRGroupTable(e) {
                    selectDialog("rgroup-table", e)
                }

                function showReaGenericsTable(e) {
                    e.required = !0, selectDialog("generics-table", e)
                }

                function echo(e) {
                    alert(e)
                }

                function updateMolecule(e) {
                    if ("undefined" != typeof e && null != e) {
                        ui.editor.deselectAll(), addUndoAction(Action.fromNewCanvas(e)), showDialog("loading");
                        try {
                            ui.render.onResize(), ui.render.update(), setZoomCentered(null, ui.render.getStructCenter())
                        } catch (t) {
                            alert(t.message)
                        } finally {
                            hideDialog("loading")
                        }
                    }
                }

                function addUndoAction(e, t) {
                    null != e && (1 == t && e.isDummy() || (undoStack.push(e), redoStack.clear(), undoStack.length > HISTORY_LENGTH && undoStack.splice(0, 1), updateHistoryButtons()))
                }

                function onClick_NewFile() {
                    selectAction(null), ui.ctab.isBlank() || (addUndoAction(Action.fromNewCanvas(new chem.Struct)), ui.render.update())
                }

                function onClick_OpenFile() {
                    openDialog({
                        onOk: function(e) {
                            e.fragment ? loadFragment(e.value, !0) : loadMolecule(e.value, !0)
                        }
                    })
                }

                function onClick_SaveFile() {
                    saveDialog({
                        molecule: ui.ctab
                    }, server)
                }

                function aromatize(e, t) {
                    e = e.clone();
                    var n = e.addRxnArrowIfNecessary(),
                        o = (new chem.MolfileSaver).saveMolecule(e);
                    if (ui.standalone) throw new Error("Aromatization and dearomatization are not supported in the standalone mode.");
                    var r = t ? "aromatize" : "dearomatize",
                        i = server[r]({
                            moldata: o
                        });
                    i.then(function(e) {
                        var t = parseMayBeCorruptedCTFile(e);
                        n && t.rxnArrows.clear(), updateMolecule(t)
                    }, echo)
                }

                function calculateCip() {
                    util.assert(!ui.standalone, "Can't calculate in standalone mode!");
                    var e = ui.ctab.clone(),
                        t = e.addRxnArrowIfNecessary(),
                        n = (new chem.MolfileSaver).saveMolecule(e),
                        o = server.calculateCip({
                            moldata: n
                        });
                    o.then(function(e) {
                        var n = parseMayBeCorruptedCTFile(e);
                        t && n.rxnArrows.clear(), updateMolecule(n)
                    }, echo)
                }

                function initZoom() {
                    var e = subEl("zoom-list");
                    e.on("focus", function() {
                        keymage.pushScope("zoom")
                    }), e.on("blur", function() {
                        keymage.popScope("zoom")
                    }), e.on("change", updateZoom), updateZoom(!0)
                }

                function onClick_ZoomIn() {
                    subEl("zoom-list").selectedIndex++, updateZoom()
                }

                function onClick_ZoomOut() {
                    subEl("zoom-list").selectedIndex--, updateZoom()
                }

                function updateZoom(e) {
                    var t = subEl("zoom-list"),
                        n = t.selectedIndex,
                        o = t.length;
                    console.assert(n >= 0 && o > n, "Zoom out of range"), subEl("zoom-in").disabled = n == o - 1, subEl("zoom-out").disabled = 0 == n;
                    var r = parseFloat(t.options[n].innerHTML) / 100;
                    ui.zoom = r, e || (setZoomCentered(r, ui.render.getStructCenter(ui.editor.getSelection())), ui.render.update())
                }

                function setZoomRegular(e) {.1 > e || e > 10 || (ui.zoom = e, ui.render.setZoom(ui.zoom))
                }

                function getViewSz() {
                    return new Vec2(ui.render.viewSz)
                }

                function setZoomCentered(e, t) {
                    if (!t) throw new Error("Center point not specified");
                    e && setZoomRegular(e), setScrollOffset(0, 0);
                    var n = ui.render.obj2view(t).sub(ui.render.viewSz.scaled(.5));
                    setScrollOffset(n.x, n.y)
                }

                function setZoomStaticPointInit(e) {
                    zspObj = new Vec2(e)
                }

                function setZoomStaticPoint(e, t) {
                    setZoomRegular(e), setScrollOffset(0, 0);
                    var n = ui.render.obj2view(zspObj),
                        o = n.sub(t);
                    setScrollOffset(o.x, o.y)
                }

                function setScrollOffset(e, t) {
                    var n = clientArea.clientWidth,
                        o = clientArea.clientHeight;
                    ui.render.extendCanvas(e, t, n + e, o + t), clientArea.scrollLeft = e, clientArea.scrollTop = t, scrollLeft = clientArea.scrollLeft, scrollTop = clientArea.scrollTop
                }

                function setScrollOffsetRel(e, t) {
                    setScrollOffset(clientArea.scrollLeft + e, clientArea.scrollTop + t)
                }

                function onClick_CleanUp() {
                    var e = util.array(ui.editor.getSelection(!0).atoms),
                        t = e.length > 0;
                    if (t) {
                        var n = Set.fromList(e),
                            o = Set.empty();
                        ui.ctab.loops.each(function(e, t) {
                            util.findIndex(t.hbs, function(e) {
                                return Set.contains(n, ui.ctab.halfBonds.get(e).begin)
                            }) >= 0 && util.each(t.hbs, function(e) {
                                Set.add(o, ui.ctab.halfBonds.get(e).begin)
                            }, this)
                        }, this), Set.mergeIn(o, n), e = Set.list(o)
                    }
                    ui.editor.deselectAll();
                    try {
                        var r = {},
                            i = ui.ctab.clone(null, null, !1, r);
                        t && util.each(e, function(e) {
                            e = r[e];
                            var t = new chem.SGroup("DAT"),
                                n = i.sgroups.add(t);
                            t.id = n, t.pp = new Vec2, t.data.fieldName = "_ketcher_selective_layout", t.data.fieldValue = "1", i.atomAddToSGroup(n, e)
                        }, this);
                        var a = i.addRxnArrowIfNecessary(),
                            l = server.layout({
                                moldata: (new chem.MolfileSaver).saveMolecule(i)
                            }, t ? {
                                selective: 1
                            } : null);
                        l.then(function(e) {
                            var t = parseMayBeCorruptedCTFile(e);
                            a && t.rxnArrows.clear(), updateMolecule(t)
                        })
                    } catch (u) {
                        alert("ERROR: " + u.message)
                    }
                }

                function onClick_Aromatize() {
                    try {
                        aromatize(ui.ctab, !0)
                    } catch (e) {
                        alert("Molfile: " + e.message)
                    }
                }

                function onClick_Dearomatize() {
                    try {
                        aromatize(ui.ctab, !1)
                    } catch (e) {
                        alert("Molfile: " + e.message)
                    }
                }

                function onClick_Automap() {
                    obsolete.showAutomapProperties({
                        onOk: function(e) {
                            var t = ui.ctab,
                                n = t.addRxnArrowIfNecessary();
                            if (0 == t.rxnArrows.count()) return echo("Auto-Mapping can only be applied to reactions"), void 0;
                            var o = (new chem.MolfileSaver).saveMolecule(t, !0),
                                r = server.automap({
                                    moldata: o,
                                    mode: e
                                });
                            r.then(function(e) {
                                var t = parseMayBeCorruptedCTFile(e);
                                n && t.rxnArrows.clear(), updateMolecule(t)
                            }, echo)
                        }
                    })
                }

                function loadMolecule(e, t) {
                    return getStruct(e, t).then(updateMolecule)
                }

                function loadFragment(e, t) {
                    return getStruct(e, t).then(function(e) {
                        e.rescale(), selectAction("paste", e)
                    })
                }

                function guessType(e, t) {
                    var n = e.trim(),
                        o = n.match(/^(M  END|\$END MOL)$/m);
                    if (o) {
                        var r = o.index + o[0].length;
                        if (r == n.length || -1 != n.slice(r, r + 20).search(/^\$(MOL|END CTAB)$/m)) return "mol"
                    }
                    return "<" == n[0] && -1 != n.indexOf("<molecule") ? "cml" : "InChI" == n.slice(0, 5) ? "inchi" : -1 == n.indexOf("\n") ? "smiles" : t ? null : "mol"
                }

                function getStruct(e, t) {
                    return new Promise(function(n) {
                        var o = guessType(e);
                        if ("mol" == o) {
                            var r = parseMayBeCorruptedCTFile(e, t);
                            n(r)
                        } else {
                            if (ui.standalone) throw o ? o.toUpperCase() : "Format is not supported in a standalone mode.";
                            var i = "smiles" == o ? server.layout_smiles(null, {
                                smiles: e.trim()
                            }) : server.molfile({
                                moldata: e
                            });
                            n(i.then(function(e) {
                                return parseMayBeCorruptedCTFile(e)
                            }))
                        }
                    })
                }

                function page2canvas2(e) {
                    var t = clientArea.cumulativeOffset();
                    return new Vec2(e.pageX - t.left, e.pageY - t.top)
                }

                function page2obj(e) {
                    return ui.render.view2obj(page2canvas2(e))
                }

                function scrollPos() {
                    return new Vec2(clientArea.scrollLeft, clientArea.scrollTop)
                }

                function onScroll_ClientArea(e) {
                    scrollLeft = clientArea.scrollLeft, scrollTop = clientArea.scrollTop, util.stopEventPropagation(e)
                }

                function onOffsetChanged(e, t) {
                    if (null != t) {
                        var n = new Vec2(e.x - t.x, e.y - t.y);
                        clientArea.scrollLeft += n.x, clientArea.scrollTop += n.y
                    }
                }

                function removeSelected() {
                    addUndoAction(Action.fromFragmentDeletion()), ui.editor.deselectAll(), ui.render.update()
                }

                function undo() {
                    var event = new CustomEvent("undoUsed", { "detail": "The undo button was pressed" });
                    document.dispatchEvent(event);

                    ui.render.current_tool && ui.render.current_tool.OnCancel(), ui.editor.deselectAll(), redoStack.push(undoStack.pop().perform()), ui.render.update(), updateHistoryButtons()
                }

                function redo() {
                    ui.render.current_tool && ui.render.current_tool.OnCancel(), ui.editor.deselectAll(), undoStack.push(redoStack.pop().perform()), ui.render.update(), updateHistoryButtons()
                }

                function onClick_ElemTableButton() {
                    showElemTable({
                        onOk: function(e) {
                            var t;
                            return t = "single" == e.mode ? {
                                label: element.get(e.values[0]).label
                            } : {
                                label: "L#",
                                atomList: new chem.Struct.AtomList({
                                    notList: "not-list" == e.mode,
                                    ids: e.values
                                })
                            }, current_elemtable_props = t, selectAction("atom-table"), !0
                        },
                        onCancel: function() {}
                    })
                }

                function onClick_ReaGenericsTableButton() {
                    showReaGenericsTable({
                        onOk: function(e) {
                            return current_reagenerics = {
                                label: e.values[0]
                            }, selectAction("atom-reagenerics"), !0
                        }
                    })
                }

                function onClick_TemplateCustom() {
                    templatesDialog("", {
                        onOk: function(e) {
                            return current_template_custom = e, selectAction("template-custom-select"), !0
                        }
                    })
                }

                function showSgroupDialog(e) {
                    return sgroupDialog(e)
                }

                function parseMayBeCorruptedCTFile(e, t) {
                    var n = util.splitNewlines(e);
                    try {
                        return chem.Molfile.parseCTFile(n)
                    } catch (o) {
                        if (t) {
                            try {
                                return chem.Molfile.parseCTFile(n.slice(1))
                            } catch (r) {}
                            try {
                                return chem.Molfile.parseCTFile([""].concat(n))
                            } catch (i) {}
                        }
                        throw o
                    }
                }

                function mapTool(e) {
                    console.assert(e, "The null tool");
                    var t = [].slice.call(arguments, 1);
                    if (actionMap[e]) return actionMap[e].apply(null, t);
                    if (ui.editor.hasSelection()) {
                        if ("erase" == e) return removeSelected(), null;
                        if (e.startsWith("atom-")) return addUndoAction(Action.fromAtomsAttrs(ui.editor.getSelection().atoms, atomLabel(e)), !0), ui.render.update(), null;
                        if (e.startsWith("transform-flip")) return addUndoAction(Action.fromFlip(ui.editor.getSelection(), e.endsWith("h") ? "horizontal" : "vertical"), !0), ui.render.update(), null
                    }
                    return "transform-rotate" != e && ui.editor.deselectAll(), "select-lasso" == e ? new rnd.Editor.LassoTool(ui.editor, 0) : "select-rectangle" == e ? new rnd.Editor.LassoTool(ui.editor, 1) : "select-fragment" == e ? new rnd.Editor.LassoTool(ui.editor, 1, !0) : "erase" == e ? new rnd.Editor.EraserTool(ui.editor, 1) : e.startsWith("atom-") ? new rnd.Editor.AtomTool(ui.editor, atomLabel(e)) : e.startsWith("bond-") ? new rnd.Editor.BondTool(ui.editor, bondType(e)) : "chain" == e ? new rnd.Editor.ChainTool(ui.editor) : e.startsWith("template-custom") ? new rnd.Editor.TemplateTool(ui.editor, current_template_custom) : e.startsWith("template") ? new rnd.Editor.TemplateTool(ui.editor, templates[parseInt(e.split("-")[1])]) : "charge-plus" == e ? new rnd.Editor.ChargeTool(ui.editor, 1) : "charge-minus" == e ? new rnd.Editor.ChargeTool(ui.editor, -1) : "sgroup" == e ? new rnd.Editor.SGroupTool(ui.editor) : "reaction-arrow" == e ? new rnd.Editor.ReactionArrowTool(ui.editor) : "reaction-plus" == e ? new rnd.Editor.ReactionPlusTool(ui.editor) : "reaction-map" == e ? new rnd.Editor.ReactionMapTool(ui.editor) : "reaction-unmap" == e ? new rnd.Editor.ReactionUnmapTool(ui.editor) : "rgroup-label" == e ? new rnd.Editor.RGroupAtomTool(ui.editor) : "rgroup-fragment" == e ? new rnd.Editor.RGroupFragmentTool(ui.editor) : "rgroup-attpoints" == e ? new rnd.Editor.APointTool(ui.editor) : e.startsWith("transform-rotate") ? new rnd.Editor.RotateTool(ui.editor) : null
                }

                function bondType(e) {
                    var t = e.substr(5);
                    return bondTypeMap[t]
                }

                function atomLabel(e) {
                    var t = e.substr(5);
                    switch (t) {
                        case "table":
                            return current_elemtable_props;
                        case "reagenerics":
                            return current_reagenerics;
                        case "any":
                            return {
                                label: "A"
                            };
                        default:
                            return t = t.capitalize(), console.assert(element.getElementByLabel(t), "No such atom exist"), {
                                label: t
                            }
                    }
                }

                function clean() {
                    Action.fromNewCanvas(new chem.Struct), ui.render.update(), undoStack.clear(), redoStack.clear(), updateHistoryButtons(), selectAction(null)
                }
                var ui = global.ui = {};
                require("../chem"), require("../rnd");
                var chem = global.chem,
                    rnd = global.rnd,
                    Promise = require("promise-polyfill"),
                    keymage = require("keymage"),
                    Set = require("../util/set"),
                    Vec2 = require("../util/vec2"),
                    util = require("../util"),
                    Action = require("./action.js"),
                    templates = require("./templates"),
                    element = require("../chem/element"),
                    openDialog = require("./dialog/open.js"),
                    saveDialog = require("./dialog/save.js"),
                    selectDialog = require("./dialog/select"),
                    templatesDialog = require("./dialog/templates"),
                    sgroupDialog = require("./dialog/sgroup"),
                    sgroupSpecialDialog = require("./dialog/sgroup-special"),
                    obsolete = require("./dialog/obsolete"),
                    SCALE = 40,
                    HISTORY_LENGTH = 32,
                    undoStack = [],
                    redoStack = [],
                    ketcherWindow, toolbar, lastSelected, clientArea = null,
                    dropdownOpened, zspObj, server, serverActions = ["cleanup", "arom", "dearom", "calc-cip", "reaction-automap", "template-custom"],
                    clipActions = ["cut", "copy", "paste"],
                    scrollLeft = null,
                    scrollTop = null,
                    current_elemtable_props = null,
                    current_reagenerics = null,
                    current_template_custom = null,
                    actionMap = {
                        "new": onClick_NewFile,
                        open: onClick_OpenFile,
                        save: onClick_SaveFile,
                        undo: undo,
                        redo: redo,
                        "zoom-in": onClick_ZoomIn,
                        "zoom-out": onClick_ZoomOut,
                        cleanup: onClick_CleanUp,
                        arom: onClick_Aromatize,
                        dearom: onClick_Dearomatize,
                        "period-table": onClick_ElemTableButton,
                        "generic-groups": onClick_ReaGenericsTableButton,
                        "template-custom": onClick_TemplateCustom,
                        cut: function() {
                            var e = ui.editor.getSelectionStruct();
                            return removeSelected(), e.isBlank() ? null : e
                        },
                        copy: function() {
                            var e = ui.editor.getSelectionStruct();
                            return ui.editor.deselectAll(), e.isBlank() ? null : e
                        },
                        paste: function(e) {
                            if (e.isBlank()) throw "Not a valid structure to paste";
                            return ui.editor.deselectAll(), new rnd.Editor.PasteTool(ui.editor, e)
                        },
                        info: function() {
                            showDialog("about_dialog")
                        },
                        "select-all": function() {
                            ui.editor.selectAll()
                        },
                        "deselect-all": function() {
                            ui.editor.deselectAll()
                        },
                        "force-update": function() {
                            ui.render.update(!0)
                        },
                        "reaction-automap": onClick_Automap,
                        "calc-cip": calculateCip
                    },
                    bondTypeMap = {
                        single: {
                            type: 1,
                            stereo: chem.Struct.BOND.STEREO.NONE
                        },
                        up: {
                            type: 1,
                            stereo: chem.Struct.BOND.STEREO.UP
                        },
                        down: {
                            type: 1,
                            stereo: chem.Struct.BOND.STEREO.DOWN
                        },
                        updown: {
                            type: 1,
                            stereo: chem.Struct.BOND.STEREO.EITHER
                        },
                        "double": {
                            type: 2,
                            stereo: chem.Struct.BOND.STEREO.NONE
                        },
                        crossed: {
                            type: 2,
                            stereo: chem.Struct.BOND.STEREO.CIS_TRANS
                        },
                        triple: {
                            type: 3,
                            stereo: chem.Struct.BOND.STEREO.NONE
                        },
                        aromatic: {
                            type: 4,
                            stereo: chem.Struct.BOND.STEREO.NONE
                        },
                        singledouble: {
                            type: 5,
                            stereo: chem.Struct.BOND.STEREO.NONE
                        },
                        singlearomatic: {
                            type: 6,
                            stereo: chem.Struct.BOND.STEREO.NONE
                        },
                        doublearomatic: {
                            type: 7,
                            stereo: chem.Struct.BOND.STEREO.NONE
                        },
                        any: {
                            type: 8,
                            stereo: chem.Struct.BOND.STEREO.NONE
                        }
                    };
                module.exports = {
                    init: init,
                    clean: clean,
                    loadMolecule: loadMolecule,
                    loadFragment: loadFragment
                }, util.extend(ui, module.exports), util.extend(ui, {
                    standalone: !0,
                    ctab: new chem.Struct,
                    render: null,
                    editor: null,
                    hideBlurredControls: hideBlurredControls,
                    updateClipboardButtons: updateClipboardButtons,
                    selectAction: selectAction,
                    addUndoAction: addUndoAction,
                    loadMoleculeFromFile: openDialog.loadHook,
                    echo: echo,
                    showDialog: showDialog,
                    hideDialog: hideDialog,
                    bondTypeMap: bondTypeMap,
                    zoom: 1,
                    setZoomStaticPointInit: setZoomStaticPointInit,
                    setZoomStaticPoint: setZoomStaticPoint,
                    page2canvas2: page2canvas2,
                    scrollPos: scrollPos,
                    page2obj: page2obj,
                    showSGroupProperties: showSgroupDialog,
                    showRGroupTable: showRGroupTable,
                    showElemTable: showElemTable,
                    showReaGenericsTable: showReaGenericsTable,
                    showAtomAttachmentPoints: obsolete.showAtomAttachmentPoints,
                    showAtomProperties: obsolete.showAtomProperties,
                    showBondProperties: obsolete.showBondProperties,
                    showRLogicTable: obsolete.showRLogicTable,
                    showLabelEditor: obsolete.showLabelEditor
                });

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../chem": 11,
            "../chem/element": 10,
            "../rnd": 21,
            "../util": 39,
            "../util/set": 42,
            "../util/vec2": 43,
            "./action.js": 26,
            "./dialog/obsolete": 27,
            "./dialog/open.js": 28,
            "./dialog/save.js": 29,
            "./dialog/select": 30,
            "./dialog/sgroup": 32,
            "./dialog/sgroup-special": 31,
            "./dialog/templates": 33,
            "./templates": 36,
            "keymage": 2,
            "promise-polyfill": 3
        }],
        35: [function(require, module, exports) {
            (function(global) {
                function Base() {
                    this.type = "OpBase", this._execute = function() {
                        throw new Error("Operation._execute() is not implemented")
                    }, this._invert = function() {
                        throw new Error("Operation._invert() is not implemented")
                    }, this.perform = function(t) {
                        return this._execute(t), this.__inverted || (this.__inverted = this._invert(), this.__inverted.__inverted = this), this.__inverted
                    }, this.isDummy = function(t) {
                        return this._isDummy ? this._isDummy(t) : !1
                    }
                }

                function AtomAdd(t, e) {
                    this.data = {
                        aid: null,
                        atom: t,
                        pos: e
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule,
                            i = {};
                        if (this.data.atom)
                            for (var o in this.data.atom) i[o] = this.data.atom[o];
                        i.label = i.label || "C", Object.isNumber(this.data.aid) ? n.atoms.set(this.data.aid, new chem.Struct.Atom(i)) : this.data.aid = n.atoms.add(new chem.Struct.Atom(i)), r.notifyAtomAdded(this.data.aid), n._atomSetPos(this.data.aid, new Vec2(this.data.pos))
                    }, this._invert = function() {
                        var t = new AtomDelete;
                        return t.data = this.data, t
                    }
                }

                function AtomDelete(t) {
                    this.data = {
                        aid: t,
                        atom: null,
                        pos: null
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule;
                        this.data.atom || (this.data.atom = n.atoms.get(this.data.aid), this.data.pos = e.atomGetPos(this.data.aid)), r.notifyAtomRemoved(this.data.aid), n.atoms.remove(this.data.aid)
                    }, this._invert = function() {
                        var t = new AtomAdd;
                        return t.data = this.data, t
                    }
                }

                function AtomAttr(t, e, r) {
                    this.data = {
                        aid: t,
                        attribute: e,
                        value: r
                    }, this.data2 = null, this._execute = function(t) {
                        var e = t.render.ctab.molecule.atoms.get(this.data.aid);
                        this.data2 || (this.data2 = {
                            aid: this.data.aid,
                            attribute: this.data.attribute,
                            value: e[this.data.attribute]
                        }), e[this.data.attribute] = this.data.value, t.render.invalidateAtom(this.data.aid)
                    }, this._isDummy = function(t) {
                        return t.render.ctab.molecule.atoms.get(this.data.aid)[this.data.attribute] == this.data.value
                    }, this._invert = function() {
                        var t = new AtomAttr;
                        return t.data = this.data2, t.data2 = this.data, t
                    }
                }

                function AtomMove(t, e, r) {
                    this.data = {
                        aid: t,
                        d: e,
                        noinvalidate: r
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule,
                            i = this.data.aid,
                            o = this.data.d;
                        n.atoms.get(i).pp.add_(o), r.atoms.get(i).visel.translate(e.ps(o)), this.data.d = o.negated(), this.data.noinvalidate || e.invalidateAtom(i, 1)
                    }, this._isDummy = function() {
                        return 0 == this.data.d.x && 0 == this.data.d.y
                    }, this._invert = function() {
                        var t = new AtomMove;
                        return t.data = this.data, t
                    }
                }

                function BondMove(t, e) {
                    this.data = {
                        bid: t,
                        d: e
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab;
                        r.bonds.get(this.data.bid).visel.translate(e.ps(this.data.d)), this.data.d = this.data.d.negated()
                    }, this._invert = function() {
                        var t = new BondMove;
                        return t.data = this.data, t
                    }
                }

                function LoopMove(t, e) {
                    this.data = {
                        id: t,
                        d: e
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab;
                        r.reloops.get(this.data.id) && r.reloops.get(this.data.id).visel && r.reloops.get(this.data.id).visel.translate(e.ps(this.data.d)), this.data.d = this.data.d.negated()
                    }, this._invert = function() {
                        var t = new LoopMove;
                        return t.data = this.data, t
                    }
                }

                function SGroupAtomAdd(t, e) {
                    this.type = "OpSGroupAtomAdd", this.data = {
                        aid: e,
                        sgid: t
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule,
                            i = this.data.aid,
                            o = this.data.sgid,
                            a = n.atoms.get(i),
                            s = n.sgroups.get(o);
                        if (s.atoms.indexOf(i) >= 0) throw new Error("The same atom cannot be added to an S-group more than once");
                        if (!a) throw new Error("OpSGroupAtomAdd: Atom " + i + " not found");
                        n.atomAddToSGroup(o, i), e.invalidateAtom(i)
                    }, this._invert = function() {
                        var t = new SGroupAtomRemove;
                        return t.data = this.data, t
                    }
                }

                function SGroupAtomRemove(t, e) {
                    this.type = "OpSGroupAtomRemove", this.data = {
                        aid: e,
                        sgid: t
                    }, this._execute = function(t) {
                        var e = this.data.aid,
                            r = this.data.sgid,
                            n = t.render,
                            i = n.ctab,
                            o = i.molecule,
                            a = o.atoms.get(e),
                            s = o.sgroups.get(r);
                        chem.SGroup.removeAtom(s, e), Set.remove(a.sgs, r), n.invalidateAtom(e)
                    }, this._invert = function() {
                        var t = new SGroupAtomAdd;
                        return t.data = this.data, t
                    }
                }

                function SGroupAttr(t, e, r) {
                    this.type = "OpSGroupAttr", this.data = {
                        sgid: t,
                        attr: e,
                        value: r
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule,
                            i = this.data.sgid,
                            o = n.sgroups.get(i);
                        "DAT" == o.type && r.sgroupData.has(i) && (r.clearVisel(r.sgroupData.get(i).visel), r.sgroupData.unset(i)), this.data.value = o.setAttr(this.data.attr, this.data.value)
                    }, this._invert = function() {
                        var t = new SGroupAttr;
                        return t.data = this.data, t
                    }
                }

                function SGroupCreate(t, e, r) {
                    this.type = "OpSGroupCreate", this.data = {
                        sgid: t,
                        type: e,
                        pp: r
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule,
                            i = new chem.SGroup(this.data.type),
                            o = this.data.sgid;
                        i.id = o, n.sgroups.set(o, i), this.data.pp && (n.sgroups.get(o).pp = new Vec2(this.data.pp)), r.sgroups.set(o, new rnd.ReSGroup(n.sgroups.get(o))), this.data.sgid = o
                    }, this._invert = function() {
                        var t = new SGroupDelete;
                        return t.data = this.data, t
                    }
                }

                function SGroupDelete(t) {
                    this.type = "OpSGroupDelete", this.data = {
                        sgid: t
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule,
                            i = this.data.sgid,
                            o = r.sgroups.get(i);
                        if (this.data.type = o.item.type, this.data.pp = o.item.pp, "DAT" == o.item.type && r.sgroupData.has(i) && (r.clearVisel(r.sgroupData.get(i).visel), r.sgroupData.unset(i)), r.clearVisel(o.visel), 0 != o.item.atoms.length) throw new Error("S-Group not empty!");
                        r.sgroups.unset(i), n.sgroups.remove(i)
                    }, this._invert = function() {
                        var t = new SGroupCreate;
                        return t.data = this.data, t
                    }
                }

                function SGroupAddToHierarchy(t) {
                    this.type = "OpSGroupAddToHierarchy", this.data = {
                        sgid: t
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule,
                            i = this.data.sgid,
                            o = n.sGroupForest.insert(i, this.data.parent, this.data.children);
                        this.data.parent = o.parent, this.data.children = o.children
                    }, this._invert = function() {
                        var t = new SGroupRemoveFromHierarchy;
                        return t.data = this.data, t
                    }
                }

                function SGroupRemoveFromHierarchy(t) {
                    this.type = "OpSGroupRemoveFromHierarchy", this.data = {
                        sgid: t
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule,
                            i = this.data.sgid;
                        this.data.parent = n.sGroupForest.parent.get(i), this.data.children = n.sGroupForest.children.get(i), n.sGroupForest.remove(i)
                    }, this._invert = function() {
                        var t = new SGroupAddToHierarchy;
                        return t.data = this.data, t
                    }
                }

                function BondAdd(t, e, r) {
                    this.data = {
                        bid: null,
                        bond: r,
                        begin: t,
                        end: e
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule;
                        if (this.data.begin == this.data.end) throw new Error("Distinct atoms expected");
                        if (rnd.DEBUG && this.molecule.checkBondExists(this.data.begin, this.data.end)) throw new Error("Bond already exists");
                        e.invalidateAtom(this.data.begin, 1), e.invalidateAtom(this.data.end, 1);
                        var i = {};
                        if (this.data.bond)
                            for (var o in this.data.bond) i[o] = this.data.bond[o];
                        i.type = i.type || chem.Struct.BOND.TYPE.SINGLE, i.begin = this.data.begin, i.end = this.data.end, Object.isNumber(this.data.bid) ? n.bonds.set(this.data.bid, new chem.Struct.Bond(i)) : this.data.bid = n.bonds.add(new chem.Struct.Bond(i)), n.bondInitHalfBonds(this.data.bid), n.atomAddNeighbor(n.bonds.get(this.data.bid).hb1), n.atomAddNeighbor(n.bonds.get(this.data.bid).hb2), r.notifyBondAdded(this.data.bid)
                    }, this._invert = function() {
                        var t = new BondDelete;
                        return t.data = this.data, t
                    }
                }

                function BondDelete(t) {
                    this.data = {
                        bid: t,
                        bond: null,
                        begin: null,
                        end: null
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule;
                        this.data.bond || (this.data.bond = n.bonds.get(this.data.bid), this.data.begin = this.data.bond.begin, this.data.end = this.data.bond.end), e.invalidateBond(this.data.bid), r.notifyBondRemoved(this.data.bid);
                        var i = n.bonds.get(this.data.bid);
                        [i.hb1, i.hb2].each(function(t) {
                            var e = n.halfBonds.get(t),
                                r = n.atoms.get(e.begin),
                                i = r.neighbors.indexOf(t),
                                o = (i + r.neighbors.length - 1) % r.neighbors.length,
                                a = (i + 1) % r.neighbors.length;
                            n.setHbNext(r.neighbors[o], r.neighbors[a]), r.neighbors.splice(i, 1)
                        }, this), n.halfBonds.unset(i.hb1), n.halfBonds.unset(i.hb2), n.bonds.remove(this.data.bid)
                    }, this._invert = function() {
                        var t = new BondAdd;
                        return t.data = this.data, t
                    }
                }

                function BondAttr(t, e, r) {
                    this.data = {
                        bid: t,
                        attribute: e,
                        value: r
                    }, this.data2 = null, this._execute = function(t) {
                        var e = t.render.ctab.molecule.bonds.get(this.data.bid);
                        this.data2 || (this.data2 = {
                            bid: this.data.bid,
                            attribute: this.data.attribute,
                            value: e[this.data.attribute]
                        }), e[this.data.attribute] = this.data.value, t.render.invalidateBond(this.data.bid), "type" == this.data.attribute && t.render.invalidateLoop(this.data.bid)
                    }, this._isDummy = function(t) {
                        return t.render.ctab.molecule.bonds.get(this.data.bid)[this.data.attribute] == this.data.value
                    }, this._invert = function() {
                        var t = new BondAttr;
                        return t.data = this.data2, t.data2 = this.data, t
                    }
                }

                function FragmentAdd(t) {
                    this.frid = Object.isUndefined(t) ? null : t, this._execute = function(t) {
                        var e = t.render.ctab,
                            r = e.molecule,
                            n = new chem.Struct.Fragment;
                        null == this.frid ? this.frid = r.frags.add(n) : r.frags.set(this.frid, n), e.frags.set(this.frid, new rnd.ReFrag(n))
                    }, this._invert = function() {
                        return new FragmentDelete(this.frid)
                    }
                }

                function FragmentDelete(t) {
                    this.frid = t, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule;
                        e.invalidateItem("frags", this.frid, 1), r.frags.unset(this.frid), n.frags.remove(this.frid)
                    }, this._invert = function() {
                        return new FragmentAdd(this.frid)
                    }
                }

                function RGroupAttr(t, e, r) {
                    this.data = {
                        rgid: t,
                        attribute: e,
                        value: r
                    }, this.data2 = null, this._execute = function(t) {
                        var e = t.render.ctab.molecule.rgroups.get(this.data.rgid);
                        this.data2 || (this.data2 = {
                            rgid: this.data.rgid,
                            attribute: this.data.attribute,
                            value: e[this.data.attribute]
                        }), e[this.data.attribute] = this.data.value, t.render.invalidateItem("rgroups", this.data.rgid)
                    }, this._isDummy = function(t) {
                        return t.render.ctab.molecule.rgroups.get(this.data.rgid)[this.data.attribute] == this.data.value
                    }, this._invert = function() {
                        var t = new RGroupAttr;
                        return t.data = this.data2, t.data2 = this.data, t
                    }
                }

                function RGroupFragment(t, e, r) {
                    this.rgid_new = t, this.rg_new = r, this.rgid_old = null, this.rg_old = null, this.frid = e, this._execute = function(t) {
                        var e = t.render.ctab,
                            r = e.molecule;
                        if (this.rgid_old = this.rgid_old || chem.Struct.RGroup.findRGroupByFragment(r.rgroups, this.frid), this.rg_old = this.rgid_old ? r.rgroups.get(this.rgid_old) : null, this.rg_old && (this.rg_old.frags.remove(this.rg_old.frags.keyOf(this.frid)), e.clearVisel(e.rgroups.get(this.rgid_old).visel), 0 == this.rg_old.frags.count() ? (e.rgroups.unset(this.rgid_old), r.rgroups.unset(this.rgid_old), e.markItemRemoved()) : e.markItem("rgroups", this.rgid_old, 1)), this.rgid_new) {
                            var n = r.rgroups.get(this.rgid_new);
                            n ? e.markItem("rgroups", this.rgid_new, 1) : (n = this.rg_new || new chem.Struct.RGroup, r.rgroups.set(this.rgid_new, n), e.rgroups.set(this.rgid_new, new rnd.ReRGroup(n))), n.frags.add(this.frid)
                        }
                    }, this._invert = function() {
                        return new RGroupFragment(this.rgid_old, this.frid, this.rg_old)
                    }
                }

                function RxnArrowAdd(t) {
                    this.data = {
                        arid: null,
                        pos: t
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule;
                        Object.isNumber(this.data.arid) ? n.rxnArrows.set(this.data.arid, new chem.Struct.RxnArrow) : this.data.arid = n.rxnArrows.add(new chem.Struct.RxnArrow), r.notifyRxnArrowAdded(this.data.arid), n._rxnArrowSetPos(this.data.arid, new Vec2(this.data.pos)), e.invalidateItem("rxnArrows", this.data.arid, 1)
                    }, this._invert = function() {
                        var t = new RxnArrowDelete;
                        return t.data = this.data, t
                    }
                }

                function RxnArrowDelete(t) {
                    this.data = {
                        arid: t,
                        pos: null
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule;
                        this.data.pos || (this.data.pos = e.rxnArrowGetPos(this.data.arid)), r.notifyRxnArrowRemoved(this.data.arid), n.rxnArrows.remove(this.data.arid)
                    }, this._invert = function() {
                        var t = new RxnArrowAdd;
                        return t.data = this.data, t
                    }
                }

                function RxnArrowMove(t, e, r) {
                    this.data = {
                        id: t,
                        d: e,
                        noinvalidate: r
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule,
                            i = this.data.id,
                            o = this.data.d;
                        n.rxnArrows.get(i).pp.add_(o), r.rxnArrows.get(i).visel.translate(e.ps(o)), this.data.d = o.negated(), this.data.noinvalidate || t.render.invalidateItem("rxnArrows", i, 1)
                    }, this._invert = function() {
                        var t = new RxnArrowMove;
                        return t.data = this.data, t
                    }
                }

                function RxnPlusAdd(t) {
                    this.data = {
                        plid: null,
                        pos: t
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule;
                        Object.isNumber(this.data.plid) ? n.rxnPluses.set(this.data.plid, new chem.Struct.RxnPlus) : this.data.plid = n.rxnPluses.add(new chem.Struct.RxnPlus), r.notifyRxnPlusAdded(this.data.plid), n._rxnPlusSetPos(this.data.plid, new Vec2(this.data.pos)), e.invalidateItem("rxnPluses", this.data.plid, 1)
                    }, this._invert = function() {
                        var t = new RxnPlusDelete;
                        return t.data = this.data, t
                    }
                }

                function RxnPlusDelete(t) {
                    this.data = {
                        plid: t,
                        pos: null
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule;
                        this.data.pos || (this.data.pos = e.rxnPlusGetPos(this.data.plid)), r.notifyRxnPlusRemoved(this.data.plid), n.rxnPluses.remove(this.data.plid)
                    }, this._invert = function() {
                        var t = new RxnPlusAdd;
                        return t.data = this.data, t
                    }
                }

                function RxnPlusMove(t, e, r) {
                    this.data = {
                        id: t,
                        d: e,
                        noinvalidate: r
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule,
                            i = this.data.id,
                            o = this.data.d;
                        n.rxnPluses.get(i).pp.add_(o), r.rxnPluses.get(i).visel.translate(e.ps(o)), this.data.d = o.negated(), this.data.noinvalidate || t.render.invalidateItem("rxnPluses", i, 1)
                    }, this._invert = function() {
                        var t = new RxnPlusMove;
                        return t.data = this.data, t
                    }
                }

                function SGroupDataMove(t, e) {
                    this.data = {
                        id: t,
                        d: e
                    }, this._execute = function(t) {
                        ui.ctab.sgroups.get(this.data.id).pp.add_(this.data.d), this.data.d = this.data.d.negated(), t.render.invalidateItem("sgroupData", this.data.id, 1)
                    }, this._invert = function() {
                        var t = new SGroupDataMove;
                        return t.data = this.data, t
                    }
                }

                function CanvasLoad(t) {
                    this.data = {
                        ctab: t,
                        norescale: !1
                    }, this._execute = function(t) {
                        var e = t.render;
                        e.ctab.clearVisels();
                        var r = ui.ctab;
                        ui.ctab = this.data.ctab, e.setMolecule(ui.ctab, this.data.norescale), this.data.ctab = r, this.data.norescale = !0
                    }, this._invert = function() {
                        var t = new CanvasLoad;
                        return t.data = this.data, t
                    }
                }

                function ChiralFlagAdd(t) {
                    this.data = {
                        pos: t
                    }, this._execute = function(e) {
                        var r = e.render,
                            n = r.ctab,
                            i = n.molecule;
                        if (n.chiralFlags.count() > 0) throw new Error("Cannot add more than one Chiral flag");
                        n.chiralFlags.set(0, new rnd.ReChiralFlag(t)), i.isChiral = !0, r.invalidateItem("chiralFlags", 0, 1)
                    }, this._invert = function() {
                        var t = new ChiralFlagDelete;
                        return t.data = this.data, t
                    }
                }

                function ChiralFlagDelete() {
                    this.data = {
                        pos: null
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab,
                            n = r.molecule;
                        if (r.chiralFlags.count() < 1) throw new Error("Cannot remove chiral flag");
                        r.clearVisel(r.chiralFlags.get(0).visel), this.data.pos = r.chiralFlags.get(0).pp, r.chiralFlags.unset(0), n.isChiral = !1
                    }, this._invert = function() {
                        var t = new ChiralFlagAdd(this.data.pos);
                        return t.data = this.data, t
                    }
                }

                function ChiralFlagMove(t) {
                    this.data = {
                        d: t
                    }, this._execute = function(t) {
                        var e = t.render,
                            r = e.ctab;
                        r.chiralFlags.get(0).pp.add_(this.data.d), this.data.d = this.data.d.negated(), e.invalidateItem("chiralFlags", 0, 1)
                    }, this._invert = function() {
                        var t = new ChiralFlagMove;
                        return t.data = this.data, t
                    }
                }
                var Vec2 = require("../util/vec2"),
                    Set = require("../util/set");
                require("../chem"), require("../rnd");
                var ui = global.ui,
                    chem = global.chem,
                    rnd = global.rnd;
                AtomAdd.prototype = new Base, AtomDelete.prototype = new Base, AtomAttr.prototype = new Base, AtomMove.prototype = new Base, BondMove.prototype = new Base, LoopMove.prototype = new Base, SGroupAtomAdd.prototype = new Base, SGroupAtomRemove.prototype = new Base, SGroupAttr.prototype = new Base, SGroupCreate.prototype = new Base, SGroupDelete.prototype = new Base, SGroupAddToHierarchy.prototype = new Base, SGroupRemoveFromHierarchy.prototype = new Base, BondAdd.prototype = new Base, BondDelete.prototype = new Base, BondAttr.prototype = new Base, FragmentAdd.prototype = new Base, FragmentDelete.prototype = new Base, RGroupAttr.prototype = new Base, RGroupFragment.prototype = new Base, RxnArrowAdd.prototype = new Base, RxnArrowDelete.prototype = new Base, RxnArrowMove.prototype = new Base, RxnPlusAdd.prototype = new Base, RxnPlusDelete.prototype = new Base, RxnPlusMove.prototype = new Base, SGroupDataMove.prototype = new Base, CanvasLoad.prototype = new Base, ChiralFlagAdd.prototype = new Base, ChiralFlagDelete.prototype = new Base, ChiralFlagMove.prototype = new Base, module.exports = {
                    AtomAdd: AtomAdd,
                    AtomDelete: AtomDelete,
                    AtomAttr: AtomAttr,
                    AtomMove: AtomMove,
                    BondMove: BondMove,
                    LoopMove: LoopMove,
                    SGroupAtomAdd: SGroupAtomAdd,
                    SGroupAtomRemove: SGroupAtomRemove,
                    SGroupAttr: SGroupAttr,
                    SGroupCreate: SGroupCreate,
                    SGroupDelete: SGroupDelete,
                    SGroupAddToHierarchy: SGroupAddToHierarchy,
                    SGroupRemoveFromHierarchy: SGroupRemoveFromHierarchy,
                    BondAdd: BondAdd,
                    BondDelete: BondDelete,
                    BondAttr: BondAttr,
                    FragmentAdd: FragmentAdd,
                    FragmentDelete: FragmentDelete,
                    RGroupAttr: RGroupAttr,
                    RGroupFragment: RGroupFragment,
                    RxnArrowAdd: RxnArrowAdd,
                    RxnArrowDelete: RxnArrowDelete,
                    RxnArrowMove: RxnArrowMove,
                    RxnPlusAdd: RxnPlusAdd,
                    RxnPlusDelete: RxnPlusDelete,
                    RxnPlusMove: RxnPlusMove,
                    SGroupDataMove: SGroupDataMove,
                    CanvasLoad: CanvasLoad,
                    ChiralFlagAdd: ChiralFlagAdd,
                    ChiralFlagDelete: ChiralFlagDelete,
                    ChiralFlagMove: ChiralFlagMove
                };

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, {
            "../chem": 11,
            "../rnd": 21,
            "../util/set": 42,
            "../util/vec2": 43
        }],
        36: [function(require, module, exports) {
            module.exports = [{
                name: "benzene",
                molfile: "\n  Ketcher 11161218352D 1   1.00000     0.00000     0\n\n  6  6  0     0  0            999 V2000\n    0.8660    2.0000    0.0000 C   0  0  0  0  0  0        0  0  0\n    1.7320    1.5000    0.0000 C   0  0  0  0  0  0        0  0  0\n    1.7320    0.5000    0.0000 C   0  0  0  0  0  0        0  0  0\n    0.8660    0.0000    0.0000 C   0  0  0  0  0  0        0  0  0\n    0.0000    0.5000    0.0000 C   0  0  0  0  0  0        0  0  0\n    0.0000    1.5000    0.0000 C   0  0  0  0  0  0        0  0  0\n  1  2  1  0     0  0\n  2  3  2  0     0  0\n  3  4  1  0     0  0\n  4  5  2  0     0  0\n  5  6  1  0     0  0\n  6  1  2  0     0  0\nM  END\n",
                bid: 0,
                aid: 0
            }, {
                name: "cyclopentadiene",
                molfile: "\n  Ketcher 11161218352D 1   1.00000     0.00000     0\n\n  5  5  0     0  0            999 V2000\n    0.0000    1.4257    0.0000 C   0  0  0  0  0  0        0  0  0\n    0.8090    0.8379    0.0000 C   0  0  0  0  0  0        0  0  0\n    0.5000   -0.1132    0.0000 C   0  0  0  0  0  0        0  0  0\n   -0.5000   -0.1132    0.0000 C   0  0  0  0  0  0        0  0  0\n   -0.8090    0.8379    0.0000 C   0  0  0  0  0  0        0  0  0\n  1  2  1  0     0  0\n  2  3  2  0     0  0\n  3  4  1  0     0  0\n  4  5  2  0     0  0\n  5  1  1  0     0  0\nM  END\n",
                bid: 0,
                aid: 0
            }, {
                name: "cyclohexane",
                molfile: "\n  Ketcher 11161218352D 1   1.00000     0.00000     0\n\n  6  6  0     0  0            999 V2000\n    0.8660    2.0000    0.0000 C   0  0  0  0  0  0        0  0  0\n    1.7320    1.5000    0.0000 C   0  0  0  0  0  0        0  0  0\n    1.7320    0.5000    0.0000 C   0  0  0  0  0  0        0  0  0\n    0.8660    0.0000    0.0000 C   0  0  0  0  0  0        0  0  0\n    0.0000    0.5000    0.0000 C   0  0  0  0  0  0        0  0  0\n    0.0000    1.5000    0.0000 C   0  0  0  0  0  0        0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  3  4  1  0     0  0\n  4  5  1  0     0  0\n  5  6  1  0     0  0\n  6  1  1  0     0  0\nM  END\n",
                bid: 0,
                aid: 0
            }, {
                name: "cyclopentane",
                molfile: "\n  Ketcher 11161218352D 1   1.00000     0.00000     0\n\n  5  5  0     0  0            999 V2000\n    0.8090    1.5389    0.0000 C   0  0  0  0  0  0        0  0  0\n    1.6180    0.9511    0.0000 C   0  0  0  0  0  0        0  0  0\n    1.3090    0.0000    0.0000 C   0  0  0  0  0  0        0  0  0\n    0.3090    0.0000    0.0000 C   0  0  0  0  0  0        0  0  0\n    0.0000    0.9511    0.0000 C   0  0  0  0  0  0        0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  3  4  1  0     0  0\n  4  5  1  0     0  0\n  5  1  1  0     0  0\nM  END\n",
                bid: 0,
                aid: 0
            }, {
                name: "cyclopropane",
                molfile: "\n  Ketcher 11161218352D 1   1.00000     0.00000     0\n\n  3  3  0     0  0            999 V2000\n   -3.2250   -0.2750    0.0000 C   0  0  0  0  0  0        0  0  0\n   -2.2250   -0.2750    0.0000 C   0  0  0  0  0  0        0  0  0\n   -2.7250    0.5910    0.0000 C   0  0  0  0  0  0        0  0  0\n  1  2  1  0     0  0\n  2  3  1  0     0  0\n  1  3  1  0     0  0\nM  END\n",
                bid: 0,
                aid: 0
            }, {
                name: "cyclobutane",
                molfile: "\n  Ketcher 11161218352D 1   1.00000     0.00000     0\n\n  4  4  0     0  0            999 V2000\n   -3.8250    1.5500    0.0000 C   0  0  0  0  0  0        0  0  0\n   -3.8250    0.5500    0.0000 C   0  0  0  0  0  0        0  0  0\n   -2.8250    1.5500    0.0000 C   0  0  0  0  0  0        0  0  0\n   -2.8250    0.5500    0.0000 C   0  0  0  0  0  0        0  0  0\n  1  2  1  0     0  0\n  1  3  1  0     0  0\n  3  4  1  0     0  0\n  4  2  1  0     0  0\nM  END\n",
                bid: 0,
                aid: 0
            }, {
                name: "cycloheptane",
                molfile: "\n  Ketcher 11161218352D 1   1.00000     0.00000     0\n\n  7  7  0     0  0            999 V2000\n    0.0000    1.6293    0.0000 C   0  0  0  0  0  0        0  0  0\n    0.7835    2.2465    0.0000 C   0  0  0  0  0  0        0  0  0\n    1.7559    2.0242    0.0000 C   0  0  0  0  0  0        0  0  0\n    2.1897    1.1289    0.0000 C   0  0  0  0  0  0        0  0  0\n    0.0000    0.6228    0.0000 C   0  0  0  0  0  0        0  0  0\n    1.7566    0.2224    0.0000 C   0  0  0  0  0  0        0  0  0\n    0.7835    0.0000    0.0000 C   0  0  0  0  0  0        0  0  0\n  6  7  1  0     0  0\n  5  7  1  0     0  0\n  1  5  1  0     0  0\n  4  6  1  0     0  0\n  3  4  1  0     0  0\n  2  3  1  0     0  0\n  1  2  1  0     0  0\nM  END\n",
                bid: 0,
                aid: 0
            }, {
                name: "cyclooctane",
                molfile: "\n  Ketcher 11161218352D 1   1.00000     0.00000     0\n\n  8  8  0     0  0            999 V2000\n    0.0000    0.7053    0.0000 C   0  0  0  0  0  0        0  0  0\n    0.0000    1.7078    0.0000 C   0  0  0  0  0  0        0  0  0\n    0.7053    2.4131    0.0000 C   0  0  0  0  0  0        0  0  0\n    0.7056    0.0000    0.0000 C   0  0  0  0  0  0        0  0  0\n    1.7079    0.0000    0.0000 C   0  0  0  0  0  0        0  0  0\n    2.4133    0.7053    0.0000 C   0  0  0  0  0  0        0  0  0\n    2.4133    1.7078    0.0000 C   0  0  0  0  0  0        0  0  0\n    1.7079    2.4131    0.0000 C   0  0  0  0  0  0        0  0  0\n  8  3  1  0     0  0\n  7  8  1  0     0  0\n  6  7  1  0     0  0\n  5  6  1  0     0  0\n  4  5  1  0     0  0\n  1  4  1  0     0  0\n  2  3  1  0     0  0\n  1  2  1  0     0  0\nM  END\n",
                bid: 0,
                aid: 0
            }];

        }, {}],
        37: [function(require, module, exports) {
            function ajax(e, t) {
                var n = getXHR(),
                    r = e.headers || {};
                n.open(e.method, e.url, !!t, e.user, e.password);
                for (var o in r) r.hasOwnProperty(o) && n.setRequestHeader(o, r[o]);
                if ("function" == typeof e.config) {
                    var i = e.config(n, e);
                    void 0 !== i && (n = i)
                }
                return e.timeout > 0 && setTimeout(function() {
                    n.status = -1, n.abort()
                }, e.timeout), t && (n.onreadystatechange = function() {
                    4 === n.readyState && t(n)
                }), n.send(e.data), n
            }

            function successful(e) {
                return e.status >= 200 && e.status < 300
            }

            function queryString(e) {
                var t = [];
                for (var n in e) e.hasOwnProperty(n) && t.push(encodeURIComponent(n) + "=" + encodeURIComponent(e[n]));
                return t.join("&")
            }

            function request(e) {
                var t = util.extend({
                    method: "GET",
                    headers: {},
                    timeout: 6e3
                }, util.isObject(e) ? e : {
                    url: e
                });
                if (util.isObject(t.data) && (t.data = JSON.stringify(t.data), t.headers["Content-Type"] = "application/json; charset=utf-8"), t.params && (t.url = t.url + (t.url.indexOf("?") < 0 ? "?" : "&") + queryString(t.params)), !t.sync) return new Promise(function(e, n) {
                    ajax(t, function(t) {
                        var r = successful(t) ? e : n;
                        r(t)
                    })
                });
                var n = ajax(t);
                if (!successful(n)) throw n;
                return n
            }
            var getXHR = require("xhrpolyfill"),
                Promise = require("promise-polyfill"),
                util = require("./index.js");
            module.exports = request;

        }, {
            "./index.js": 39,
            "promise-polyfill": 3,
            "xhrpolyfill": 6
        }],
        38: [function(require, module, exports) {
            var util = require("./index"),
                Vec2 = require("./vec2"),
                Box2Abs = function() {
                    1 == arguments.length && "min" in arguments[0] && "max" in arguments[0] && (this.p0 = arguments[0].min, this.p1 = arguments[0].max), 2 == arguments.length && arguments[0] instanceof Vec2 && arguments[1] instanceof Vec2 ? (this.p0 = arguments[0], this.p1 = arguments[1]) : 4 == arguments.length ? (this.p0 = new Vec2(arguments[0], arguments[1]), this.p1 = new Vec2(arguments[2], arguments[3])) : 0 == arguments.length ? (this.p0 = new Vec2, this.p1 = new Vec2) : new Error("Box2Abs constructor only accepts 4 numbers or 2 vectors or no arguments!")
                };
            Box2Abs.prototype.toString = function() {
                return this.p0.toString() + " " + this.p1.toString()
            }, Box2Abs.fromRelBox = function(t) {
                return util.assertDefined(t), new Box2Abs(t.x, t.y, t.x + t.width, t.y + t.height)
            }, Box2Abs.prototype.clone = function() {
                return new Box2Abs(this.p0, this.p1)
            }, Box2Abs.union = function(t, e) {
                return util.assertDefined(t), util.assertDefined(e), new Box2Abs(Vec2.min(t.p0, e.p0), Vec2.max(t.p1, e.p1))
            }, Box2Abs.prototype.extend = function(t, e) {
                return util.assertDefined(t), e = e || t, new Box2Abs(this.p0.sub(t), this.p1.add(e))
            }, Box2Abs.prototype.include = function(t) {
                return util.assertDefined(t), new Box2Abs(this.p0.min(t), this.p1.max(t))
            }, Box2Abs.prototype.contains = function(t, e) {
                return e = (e || 0) - 0, util.assertDefined(t), t.x >= this.p0.x - e && t.x <= this.p1.x + e && t.y >= this.p0.y - e && t.y <= this.p1.y + e
            }, Box2Abs.prototype.translate = function(t) {
                return util.assertDefined(t), new Box2Abs(this.p0.add(t), this.p1.add(t))
            }, Box2Abs.prototype.transform = function(t, e) {
                return util.assert(!util.isNullOrUndefined(t)), new Box2Abs(t.call(e, this.p0), t.call(e, this.p1))
            }, Box2Abs.prototype.sz = function() {
                return this.p1.sub(this.p0)
            }, Box2Abs.prototype.centre = function() {
                return Vec2.centre(this.p0, this.p1)
            }, Box2Abs.prototype.pos = function() {
                return this.p0
            }, module.exports = Box2Abs;

        }, {
            "./index": 39,
            "./vec2": 43
        }],
        39: [function(require, module, exports) {
            function find(e, n) {
                for (var t = 0; t < e.length; t++)
                    if (n(e[t], t, e)) return e[t];
                return void 0
            }

            function findIndex(e, n, t) {
                for (var r = 0; r < e.length; ++r)
                    if (n.call(t, e[r], r)) return r;
                return -1
            }

            function normalizeNewlines(e) {
                return e.replace(nlRe, "\n")
            }

            function splitNewlines(e) {
                return e.split(nlRe)
            }

            function unicodeLiteral(e) {
                function n(e, n) {
                    for (var t = e.toString(16).toUpperCase(); t.length < n;) t = "0" + t;
                    return t
                }
                var t, r = "";
                for (t = 0; t < e.length; ++t) r += e.charCodeAt(t) > 126 || e.charCodeAt(t) < 32 ? "\\u" + n(e.charCodeAt(t), 4) : e[t];
                return r
            }
            Array.prototype.swap = function(e, n) {
                var t = this[e];
                this[e] = this[n], this[n] = t
            };
            var tfx = function(e) {
                    return (e - 0).toFixed(8)
                },
                each = function(e, n, t) {
                    assert(!isNullOrUndefined(e), "array must be defined");
                    for (var r = 0; r < e.length; ++r) n.call(t, e[r], r)
                },
                map_each = function(e, n, t) {
                    assert(!isNullOrUndefined(e), "map must be defined");
                    for (var r in e) e.hasOwnProperty(r) && n.call(t, r, e[r])
                },
                findAll = function(e, n, t) {
                    var r, i = [];
                    for (r = 0; r < e.length; ++r) n.call(t, e[r], r) && i.push(e[r]);
                    return i
                },
                array = function(e) {
                    for (var n = [], t = e.length; --t >= 0;) n[t] = e[t];
                    return n
                },
                isEmpty = function(e) {
                    for (var n in e)
                        if (e.hasOwnProperty(n)) return !1;
                    return !0
                },
                stopEventPropagation = function(e) {
                    if ("stopPropagation" in e) e.stopPropagation();
                    else {
                        if (!("cancelBubble" in e)) throw Error("Browser unrecognized");
                        e.cancelBubble = !0
                    }
                },
                preventDefault = function(e) {
                    return "preventDefault" in e && e.preventDefault(), Prototype.Browser.IE && (e.returnValue = !1, e.keyCode = 0), !1
                },
                setElementTextContent = function(e, n) {
                    if ("textContent" in e) e.textContent = n;
                    else {
                        if (!("innerText" in e)) throw Error("Browser unrecognized");
                        e.innerText = n
                    }
                },
                getElementTextContent = function(e) {
                    if ("textContent" in e) return e.textContent;
                    if ("innerText" in e) return e.innerText;
                    throw Error("Browser unrecognized")
                },
                stringPadded = function(e, n, t) {
                    for (var r = e + "", i = ""; r.length + i.length < n;) i += " ";
                    return t ? e + i : i + e
                },
                nlRe = /\r\n|[\n\r]/g,
                idList = function(e) {
                    var n = [];
                    for (var t in e) e.hasOwnProperty(t) && n.push(t);
                    return n
                },
                mapArray = function(e, n) {
                    for (var t = [], r = 0; r < e.length; ++r) t.push(n[e[r]]);
                    return t
                },
                arrayMax = function(e) {
                    return Math.max.apply(Math, e)
                },
                arrayMin = function(e) {
                    return Math.min.apply(Math, e)
                },
                map = function(e, n, t) {
                    for (var r = [], i = 0; i < e.length; ++i) r.push(n.call(t, e[i]));
                    return r
                },
                apply = function(e, n) {
                    for (var t = 0; t < e.length; ++t) e[t] = n(e[t])
                },
                ifDef = function(e, n, t, r) {
                    e[t] = Object.isUndefined(n[t]) ? r : n[t]
                },
                ifDefList = function(e, n, t, r) {
                    e[t] = Object.isUndefined(n[t]) || null === n[t] ? r : array(n[t])
                },
                identityMap = function(e) {
                    for (var n = {}, t = 0; t < e.length; ++t) n[e[t]] = e[t];
                    return n
                },
                strip = function(e) {
                    return e.replace(/\s*$/, "").replace(/^\s*/, "")
                },
                stripRight = function(e) {
                    return e.replace(/\s*$/, "")
                },
                stripQuotes = function(e) {
                    return '"' === e[0] && '"' === e[e.length - 1] ? e.substr(1, e.length - 2) : e
                },
                paddedFloat = function(e, n, t) {
                    var r = e.toFixed(t).replace(",", ".");
                    if (r.length > n) throw new Error("number does not fit");
                    return stringPadded(r, n)
                },
                paddedInt = function(e, n) {
                    var t = e.toFixed(0);
                    if (t.length > n) throw new Error("number does not fit");
                    return stringPadded(t, n)
                },
                arrayAddIfMissing = function(e, n) {
                    for (var t = 0; t < e.length; ++t)
                        if (e[t] === n) return !1;
                    return e.push(n), !0
                },
                assert = function(e, n) {
                    if (!e) throw new Error(n ? "Assertion failed: " + n : "Assertion failed")
                },
                assertDefined = function(e) {
                    assert(!isNullOrUndefined(e))
                },
                isUndefined = function(e) {
                    return Object.isUndefined(e)
                },
                isNull = function(e) {
                    return null === e
                },
                isNullOrUndefined = function(e) {
                    return isUndefined(e) || isNull(e)
                },
                arrayRemoveByValue = function(e, n) {
                    assert(!isUndefined(e) && !isNull(e), "array must be defined");
                    for (var t = e.indexOf(n), r = 0; t >= 0;) e.splice(t, 1), r += 1, t = e.indexOf(n);
                    return r
                },
                listNextRotate = function(e, n) {
                    return e[(e.indexOf(n) + 1) % e.length]
                },
                extend = function(e, n) {
                    for (var t in n) n.hasOwnProperty(t) && (e[t] = n[t]);
                    return e
                },
                isObject = function(e) {
                    return e === Object(e)
                };
            module.exports = {
                tfx: tfx,
                each: each,
                find: find,
                findIndex: findIndex,
                findAll: findAll,
                array: array,
                isEmpty: isEmpty,
                stopEventPropagation: stopEventPropagation,
                preventDefault: preventDefault,
                setElementTextContent: setElementTextContent,
                getElementTextContent: getElementTextContent,
                stringPadded: stringPadded,
                normalizeNewlines: normalizeNewlines,
                splitNewlines: splitNewlines,
                unicodeLiteral: unicodeLiteral,
                idList: idList,
                mapArray: mapArray,
                arrayMax: arrayMax,
                arrayMin: arrayMin,
                map: map,
                apply: apply,
                ifDef: ifDef,
                ifDefList: ifDefList,
                identityMap: identityMap,
                strip: strip,
                stripRight: stripRight,
                stripQuotes: stripQuotes,
                paddedFloat: paddedFloat,
                paddedInt: paddedInt,
                arrayAddIfMissing: arrayAddIfMissing,
                assert: assert,
                assertDefined: assertDefined,
                isUndefined: isUndefined,
                isNull: isNull,
                isNullOrUndefined: isNullOrUndefined,
                arrayRemoveByValue: arrayRemoveByValue,
                listNextRotate: listNextRotate,
                extend: extend,
                isObject: isObject
            };

        }, {}],
        40: [function(require, module, exports) {
            var util = require("./index"),
                Map = function(t) {
                    if ("undefined" != typeof t && t.constructor !== Object) throw Error('Passed object is not an instance of "Object"!');
                    this._obj = t || {}, this._count = 0
                };
            Map.prototype.each = function(t, e) {
                var r, n, i;
                for (r in this._obj) i = parseInt(r, 10), n = this._obj[r], isNaN(i) || (r = i), t.call(e, r, n)
            }, Map.prototype.map = function(t, e) {
                var r = new Map;
                return this.each(function(n, i) {
                    r.set(n, t.call(e, n, i))
                }, this), r
            }, Map.prototype.find = function(t, e) {
                var r, n, i;
                for (r in this._obj)
                    if (n = parseInt(r, 10), i = this._obj[r], isNaN(n) || (r = n), t.call(e, r, i)) return r
            }, Map.prototype.findAll = function(t, e) {
                var r, n, i, o = [];
                for (r in this._obj) n = parseInt(r, 10), i = this._obj[r], isNaN(n) || (r = n), t.call(e, r, i) && o.push(r);
                return o
            }, Map.prototype.keys = function() {
                var t, e = [];
                for (t in this._obj) e.push(t);
                return e
            }, Map.prototype.ikeys = function() {
                var t = [];
                for (var e in this._obj) t.push(e - 0);
                return t
            }, Map.prototype.set = function(t, e) {
                var r;
                return this._count += ("undefined" != typeof e ? 1 : 0) - ("undefined" != typeof this._obj[t] ? 1 : 0), "undefined" == typeof e ? (r = this._obj[t], delete this._obj[t], r) : (this._obj[t] = e, e)
            }, Map.prototype.get = function(t) {
                return this._obj[t] !== Object.prototype[t] ? this._obj[t] : void 0
            }, Map.prototype.has = function(t) {
                return this._obj[t] !== Object.prototype[t]
            }, Map.prototype.unset = function(t) {
                return this.set(t, void 0)
            }, Map.prototype.update = function(t) {
                for (var e in t) this.set(e, t[e])
            }, Map.prototype.clear = function() {
                this._obj = {}, this._count = 0
            }, Map.prototype.count = function() {
                return this._count
            }, Map.prototype.idList = function() {
                return util.idList(this._obj)
            }, Map.prototype.keyOf = function(t) {
                for (var e in this._obj)
                    if (this._obj[e] === t) return e
            }, module.exports = Map;

        }, {
            "./index": 39
        }],
        41: [function(require, module, exports) {
            var Map = require("./map.js"),
                Pool = function() {
                    this._map = new Map, this._nextId = 0
                };
            Pool.prototype.newId = function() {
                return this._nextId++
            }, Pool.prototype.add = function(t) {
                var e = this._nextId++;
                return this._map.set(e, t), e
            }, Pool.prototype.set = function(t, e) {
                this._map.set(t, e)
            }, Pool.prototype.get = function(t) {
                return this._map.get(t)
            }, Pool.prototype.has = function(t) {
                return this._map.has(t)
            }, Pool.prototype.remove = function(t) {
                return this._map.unset(t)
            }, Pool.prototype.clear = function() {
                this._map.clear()
            }, Pool.prototype.keys = function() {
                return this._map.keys()
            }, Pool.prototype.ikeys = function() {
                return this._map.ikeys()
            }, Pool.prototype.each = function(t, e) {
                this._map.each(t, e)
            }, Pool.prototype.map = function(t, e) {
                return this._map.map(t, e)
            }, Pool.prototype.find = function(t, e) {
                return this._map.find(t, e)
            }, Pool.prototype.count = function() {
                return this._map.count()
            }, Pool.prototype.keyOf = function(t) {
                return this._map.keyOf(t)
            }, module.exports = Pool;

        }, {
            "./map.js": 40
        }],
        42: [function(require, module, exports) {
            var Set = {
                empty: function() {
                    return {}
                },
                single: function(e) {
                    var t = {};
                    return Set.add(t, e), t
                },
                size: function(e) {
                    var t = 0;
                    for (var r in e) e[r] !== Object.prototype[r] && t++;
                    return t
                },
                contains: function(e, t) {
                    return "undefined" != typeof e[t] && e[t] !== Object.prototype[t]
                },
                subset: function(e, t) {
                    for (var r in e)
                        if (e[r] !== Object.prototype[r] && t[r] !== e[r]) return !1;
                    return !0
                },
                intersection: function(e, t) {
                    var r = {};
                    for (var o in e) e[o] !== Object.prototype[o] && t[o] === e[o] && Set.add(r, o);
                    return r
                },
                disjoint: function(e, t) {
                    for (var r in e)
                        if (e[r] !== Object.prototype[r] && t[r] === e[r]) return !1;
                    return !0
                },
                eq: function(e, t) {
                    return Set.subset(e, t) && Set.subset(t, e)
                },
                each: function(e, t, r) {
                    for (var o in e) e[o] !== Object.prototype[o] && t.call(r, e[o])
                },
                filter: function(e, t, r) {
                    var o = {};
                    for (var n in e) e[n] !== Object.prototype[n] && t.call(r, e[n]) && (o[e[n]] = e[n]);
                    return o
                },
                pick: function(e) {
                    for (var t in e)
                        if (e[t] !== Object.prototype[t]) return e[t];
                    return null
                },
                list: function(e) {
                    var t = [];
                    for (var r in e) e[r] !== Object.prototype[r] && t.push(e[r]);
                    return t
                },
                add: function(e, t) {
                    e[t] = t
                },
                mergeIn: function(e, t) {
                    Set.each(t, function(t) {
                        Set.add(e, t)
                    })
                },
                remove: function(e, t) {
                    var r = e[t];
                    return delete e[t], r
                },
                clone: function(e) {
                    var t = {};
                    return Set.mergeIn(t, e), t
                },
                fromList: function(e) {
                    var t = {};
                    if (e)
                        for (var r = 0; r < e.length; ++r) t[e[r] - 0] = e[r] - 0;
                    return t
                },
                keySetInt: function(e) {
                    var t = {};
                    return e.each(function(e) {
                        t[e - 0] = e - 0
                    }), t
                },
                find: function(e, t, r) {
                    for (var o in e)
                        if (e[o] !== Object.prototype[o] && t.call(r, e[o])) return o;
                    return null
                }
            };
            module.exports = Set;

        }, {}],
        43: [function(require, module, exports) {
            var util = require("./index"),
                Vec2 = function(e, t) {
                    if (0 == arguments.length) this.x = 0, this.y = 0;
                    else if (1 == arguments.length) this.x = parseFloat(e.x), this.y = parseFloat(e.y);
                    else {
                        if (2 != arguments.length) throw new Error("Vec2(): invalid arguments");
                        this.x = parseFloat(e), this.y = parseFloat(t)
                    }
                };
            Vec2.ZERO = new Vec2(0, 0), Vec2.UNIT = new Vec2(1, 1), Vec2.segmentIntersection = function(e, t, r, n) {
                var o = (e.x - r.x) * (t.y - r.y) - (e.y - r.y) * (t.x - r.x),
                    i = (e.x - n.x) * (t.y - n.y) - (e.y - n.y) * (t.x - n.x),
                    a = (r.x - e.x) * (n.y - e.y) - (r.y - e.y) * (n.x - e.x),
                    u = (r.x - t.x) * (n.y - t.y) - (r.y - t.y) * (n.x - t.x);
                return 0 >= o * i && 0 >= a * u
            }, Vec2.prototype.length = function() {
                return Math.sqrt(this.x * this.x + this.y * this.y)
            }, Vec2.prototype.equals = function(e) {
                return util.assertDefined(e), this.x == e.x && this.y == e.y
            }, Vec2.prototype.add = function(e) {
                return util.assertDefined(e), new Vec2(this.x + e.x, this.y + e.y)
            }, Vec2.prototype.add_ = function(e) {
                util.assertDefined(e), this.x += e.x, this.y += e.y
            }, Vec2.prototype.sub = function(e) {
                return util.assertDefined(e), new Vec2(this.x - e.x, this.y - e.y)
            }, Vec2.prototype.scaled = function(e) {
                return util.assertDefined(e), new Vec2(this.x * e, this.y * e)
            }, Vec2.prototype.negated = function() {
                return new Vec2(-this.x, -this.y)
            }, Vec2.prototype.yComplement = function(e) {
                return e = e || 0, new Vec2(this.x, e - this.y)
            }, Vec2.prototype.addScaled = function(e, t) {
                return util.assertDefined(e), util.assertDefined(t), new Vec2(this.x + e.x * t, this.y + e.y * t)
            }, Vec2.prototype.normalized = function() {
                return this.scaled(1 / this.length())
            }, Vec2.prototype.normalize = function() {
                var e = this.length();
                return 1e-6 > e ? !1 : (this.x /= e, this.y /= e, !0)
            }, Vec2.prototype.turnLeft = function() {
                return new Vec2(-this.y, this.x)
            }, Vec2.prototype.coordStr = function() {
                return this.x.toString() + " , " + this.y.toString()
            }, Vec2.prototype.toString = function() {
                return "(" + this.x.toFixed(2) + "," + this.y.toFixed(2) + ")"
            }, Vec2.dist = function(e, t) {
                return util.assertDefined(e), util.assertDefined(t), Vec2.diff(e, t).length()
            }, Vec2.max = function(e, t) {
                return util.assertDefined(e), util.assertDefined(t), new Vec2(Math.max(e.x, t.x), Math.max(e.y, t.y))
            }, Vec2.min = function(e, t) {
                return util.assertDefined(e), util.assertDefined(t), new Vec2(Math.min(e.x, t.x), Math.min(e.y, t.y))
            }, Vec2.prototype.max = function(e) {
                return util.assertDefined(e), new Vec2.max(this, e)
            }, Vec2.prototype.min = function(e) {
                return util.assertDefined(e), new Vec2.min(this, e)
            }, Vec2.prototype.ceil = function() {
                return new Vec2(Math.ceil(this.x), Math.ceil(this.y))
            }, Vec2.prototype.floor = function() {
                return new Vec2(Math.floor(this.x), Math.floor(this.y))
            }, Vec2.sum = function(e, t) {
                return util.assertDefined(e), util.assertDefined(t), new Vec2(e.x + t.x, e.y + t.y)
            }, Vec2.dot = function(e, t) {
                return util.assertDefined(e), util.assertDefined(t), e.x * t.x + e.y * t.y
            }, Vec2.cross = function(e, t) {
                return util.assertDefined(e), util.assertDefined(t), e.x * t.y - e.y * t.x
            }, Vec2.prototype.rotate = function(e) {
                util.assertDefined(e);
                var t = Math.sin(e),
                    r = Math.cos(e);
                return this.rotateSC(t, r)
            }, Vec2.prototype.rotateSC = function(e, t) {
                return util.assertDefined(e), util.assertDefined(t), new Vec2(this.x * t - this.y * e, this.x * e + this.y * t)
            }, Vec2.angle = function(e, t) {
                return util.assertDefined(e), util.assertDefined(t), Math.atan2(Vec2.cross(e, t), Vec2.dot(e, t))
            }, Vec2.prototype.oxAngle = function() {
                return Math.atan2(this.y, this.x)
            }, Vec2.diff = function(e, t) {
                return util.assertDefined(e), util.assertDefined(t), new Vec2(e.x - t.x, e.y - t.y)
            }, Vec2.lc = function() {
                for (var e = new Vec2, t = 0; t < arguments.length / 2; ++t) e = e.addScaled(arguments[2 * t], arguments[2 * t + 1]);
                return e
            }, Vec2.lc2 = function(e, t, r, n) {
                return util.assertDefined(e), util.assertDefined(r), util.assertDefined(t), util.assertDefined(n), new Vec2(e.x * t + r.x * n, e.y * t + r.y * n)
            }, Vec2.centre = function(e, t) {
                return new Vec2.lc2(e, .5, t, .5)
            }, Vec2.shiftRayBox = function(e, t, r) {
                util.assertDefined(e), util.assertDefined(t), util.assertDefined(r);
                var n = [r.p0, new Vec2(r.p1.x, r.p0.y), r.p1, new Vec2(r.p0.x, r.p1.y)],
                    o = n.map(function(t) {
                        return t.sub(e)
                    });
                t = t.normalized();
                for (var i = o.map(function(e) {
                        return Vec2.cross(e, t)
                    }), a = o.map(function(e) {
                        return Vec2.dot(e, t)
                    }), u = -1, s = -1, l = 0; 4 > l; ++l) i[l] > 0 ? (0 > u || a[u] < a[l]) && (u = l) : (0 > s || a[s] < a[l]) && (s = l);
                if (0 > s || 0 > u) return 0;
                var d, c;
                return a[u] > a[s] ? (d = s, c = u) : (d = u, c = s), a[d] + Math.abs(i[d]) * (a[c] - a[d]) / (Math.abs(i[d]) + Math.abs(i[c]))
            }, module.exports = Vec2;

        }, {
            "./index": 39
        }]
    }, {}, [18])(18)
});