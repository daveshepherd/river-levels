"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/shimmer/index.js
var require_shimmer = __commonJS({
  "node_modules/shimmer/index.js"(exports2, module2) {
    "use strict";
    function isFunction(funktion) {
      return typeof funktion === "function";
    }
    var logger2 = console.error.bind(console);
    function defineProperty(obj, name, value) {
      var enumerable = !!obj[name] && obj.propertyIsEnumerable(name);
      Object.defineProperty(obj, name, {
        configurable: true,
        enumerable,
        writable: true,
        value
      });
    }
    function shimmer(options) {
      if (options && options.logger) {
        if (!isFunction(options.logger)) logger2("new logger isn't a function, not replacing");
        else logger2 = options.logger;
      }
    }
    function wrap(nodule, name, wrapper) {
      if (!nodule || !nodule[name]) {
        logger2("no original function " + name + " to wrap");
        return;
      }
      if (!wrapper) {
        logger2("no wrapper function");
        logger2(new Error().stack);
        return;
      }
      if (!isFunction(nodule[name]) || !isFunction(wrapper)) {
        logger2("original object and wrapper must be functions");
        return;
      }
      var original = nodule[name];
      var wrapped = wrapper(original, name);
      defineProperty(wrapped, "__original", original);
      defineProperty(wrapped, "__unwrap", function() {
        if (nodule[name] === wrapped) defineProperty(nodule, name, original);
      });
      defineProperty(wrapped, "__wrapped", true);
      defineProperty(nodule, name, wrapped);
      return wrapped;
    }
    function massWrap(nodules, names, wrapper) {
      if (!nodules) {
        logger2("must provide one or more modules to patch");
        logger2(new Error().stack);
        return;
      } else if (!Array.isArray(nodules)) {
        nodules = [nodules];
      }
      if (!(names && Array.isArray(names))) {
        logger2("must provide one or more functions to wrap on modules");
        return;
      }
      nodules.forEach(function(nodule) {
        names.forEach(function(name) {
          wrap(nodule, name, wrapper);
        });
      });
    }
    function unwrap(nodule, name) {
      if (!nodule || !nodule[name]) {
        logger2("no function to unwrap.");
        logger2(new Error().stack);
        return;
      }
      if (!nodule[name].__unwrap) {
        logger2("no original to unwrap to -- has " + name + " already been unwrapped?");
      } else {
        return nodule[name].__unwrap();
      }
    }
    function massUnwrap(nodules, names) {
      if (!nodules) {
        logger2("must provide one or more modules to patch");
        logger2(new Error().stack);
        return;
      } else if (!Array.isArray(nodules)) {
        nodules = [nodules];
      }
      if (!(names && Array.isArray(names))) {
        logger2("must provide one or more functions to unwrap on modules");
        return;
      }
      nodules.forEach(function(nodule) {
        names.forEach(function(name) {
          unwrap(nodule, name);
        });
      });
    }
    shimmer.wrap = wrap;
    shimmer.massWrap = massWrap;
    shimmer.unwrap = unwrap;
    shimmer.massUnwrap = massUnwrap;
    module2.exports = shimmer;
  }
});

// node_modules/emitter-listener/listener.js
var require_listener = __commonJS({
  "node_modules/emitter-listener/listener.js"(exports2, module2) {
    "use strict";
    var shimmer = require_shimmer();
    var wrap = shimmer.wrap;
    var unwrap = shimmer.unwrap;
    var SYMBOL = "wrap@before";
    function defineProperty(obj, name, value) {
      var enumerable = !!obj[name] && obj.propertyIsEnumerable(name);
      Object.defineProperty(obj, name, {
        configurable: true,
        enumerable,
        writable: true,
        value
      });
    }
    function _process(self, listeners) {
      var l = listeners.length;
      for (var p = 0; p < l; p++) {
        var listener = listeners[p];
        var before = self[SYMBOL];
        if (typeof before === "function") {
          before(listener);
        } else if (Array.isArray(before)) {
          var length = before.length;
          for (var i = 0; i < length; i++) before[i](listener);
        }
      }
    }
    function _listeners(self, event) {
      var listeners;
      listeners = self._events && self._events[event];
      if (!Array.isArray(listeners)) {
        if (listeners) {
          listeners = [listeners];
        } else {
          listeners = [];
        }
      }
      return listeners;
    }
    function _findAndProcess(self, event, before) {
      var after = _listeners(self, event);
      var unprocessed = after.filter(function(fn) {
        return before.indexOf(fn) === -1;
      });
      if (unprocessed.length > 0) _process(self, unprocessed);
    }
    function _wrap(unwrapped, visit) {
      if (!unwrapped) return;
      var wrapped = unwrapped;
      if (typeof unwrapped === "function") {
        wrapped = visit(unwrapped);
      } else if (Array.isArray(unwrapped)) {
        wrapped = [];
        for (var i = 0; i < unwrapped.length; i++) {
          wrapped[i] = visit(unwrapped[i]);
        }
      }
      return wrapped;
    }
    module2.exports = function wrapEmitter(emitter, onAddListener, onEmit) {
      if (!emitter || !emitter.on || !emitter.addListener || !emitter.removeListener || !emitter.emit) {
        throw new Error("can only wrap real EEs");
      }
      if (!onAddListener) throw new Error("must have function to run on listener addition");
      if (!onEmit) throw new Error("must have function to wrap listeners when emitting");
      function adding(on) {
        return function added(event, listener) {
          var existing = _listeners(this, event).slice();
          try {
            var returned = on.call(this, event, listener);
            _findAndProcess(this, event, existing);
            return returned;
          } finally {
            if (!this.on.__wrapped) wrap(this, "on", adding);
            if (!this.addListener.__wrapped) wrap(this, "addListener", adding);
          }
        };
      }
      function emitting(emit) {
        return function emitted(event) {
          if (!this._events || !this._events[event]) return emit.apply(this, arguments);
          var unwrapped = this._events[event];
          function remover(removeListener) {
            return function removed() {
              this._events[event] = unwrapped;
              try {
                return removeListener.apply(this, arguments);
              } finally {
                unwrapped = this._events[event];
                this._events[event] = _wrap(unwrapped, onEmit);
              }
            };
          }
          wrap(this, "removeListener", remover);
          try {
            this._events[event] = _wrap(unwrapped, onEmit);
            return emit.apply(this, arguments);
          } finally {
            unwrap(this, "removeListener");
            this._events[event] = unwrapped;
          }
        };
      }
      if (!emitter[SYMBOL]) {
        defineProperty(emitter, SYMBOL, onAddListener);
      } else if (typeof emitter[SYMBOL] === "function") {
        defineProperty(emitter, SYMBOL, [emitter[SYMBOL], onAddListener]);
      } else if (Array.isArray(emitter[SYMBOL])) {
        emitter[SYMBOL].push(onAddListener);
      }
      if (!emitter.__wrapped) {
        wrap(emitter, "addListener", adding);
        wrap(emitter, "on", adding);
        wrap(emitter, "emit", emitting);
        defineProperty(emitter, "__unwrap", function() {
          unwrap(emitter, "addListener");
          unwrap(emitter, "on");
          unwrap(emitter, "emit");
          delete emitter[SYMBOL];
          delete emitter.__wrapped;
        });
        defineProperty(emitter, "__wrapped", true);
      }
    };
  }
});

// node_modules/cls-hooked/context.js
var require_context = __commonJS({
  "node_modules/cls-hooked/context.js"(exports2, module2) {
    "use strict";
    var util = require("util");
    var assert = require("assert");
    var wrapEmitter = require_listener();
    var async_hooks = require("async_hooks");
    var CONTEXTS_SYMBOL = "cls@contexts";
    var ERROR_SYMBOL = "error@context";
    var DEBUG_CLS_HOOKED = process.env.DEBUG_CLS_HOOKED;
    var currentUid = -1;
    module2.exports = {
      getNamespace: getNamespace2,
      createNamespace,
      destroyNamespace,
      reset,
      ERROR_SYMBOL
    };
    function Namespace(name) {
      this.name = name;
      this.active = null;
      this._set = [];
      this.id = null;
      this._contexts = /* @__PURE__ */ new Map();
      this._indent = 0;
    }
    Namespace.prototype.set = function set(key, value) {
      if (!this.active) {
        throw new Error("No context available. ns.run() or ns.bind() must be called first.");
      }
      this.active[key] = value;
      if (DEBUG_CLS_HOOKED) {
        const indentStr = " ".repeat(this._indent < 0 ? 0 : this._indent);
        debug2(indentStr + "CONTEXT-SET KEY:" + key + "=" + value + " in ns:" + this.name + " currentUid:" + currentUid + " active:" + util.inspect(this.active, { showHidden: true, depth: 2, colors: true }));
      }
      return value;
    };
    Namespace.prototype.get = function get(key) {
      if (!this.active) {
        if (DEBUG_CLS_HOOKED) {
          const asyncHooksCurrentId = async_hooks.currentId();
          const triggerId = async_hooks.triggerAsyncId();
          const indentStr = " ".repeat(this._indent < 0 ? 0 : this._indent);
          debug2(`${indentStr}CONTEXT-GETTING KEY NO ACTIVE NS: (${this.name}) ${key}=undefined currentUid:${currentUid} asyncHooksCurrentId:${asyncHooksCurrentId} triggerId:${triggerId} len:${this._set.length}`);
        }
        return void 0;
      }
      if (DEBUG_CLS_HOOKED) {
        const asyncHooksCurrentId = async_hooks.executionAsyncId();
        const triggerId = async_hooks.triggerAsyncId();
        const indentStr = " ".repeat(this._indent < 0 ? 0 : this._indent);
        debug2(indentStr + "CONTEXT-GETTING KEY:" + key + "=" + this.active[key] + " (" + this.name + ") currentUid:" + currentUid + " active:" + util.inspect(this.active, { showHidden: true, depth: 2, colors: true }));
        debug2(`${indentStr}CONTEXT-GETTING KEY: (${this.name}) ${key}=${this.active[key]} currentUid:${currentUid} asyncHooksCurrentId:${asyncHooksCurrentId} triggerId:${triggerId} len:${this._set.length} active:${util.inspect(this.active)}`);
      }
      return this.active[key];
    };
    Namespace.prototype.createContext = function createContext() {
      let context = Object.create(this.active ? this.active : Object.prototype);
      context._ns_name = this.name;
      context.id = currentUid;
      if (DEBUG_CLS_HOOKED) {
        const asyncHooksCurrentId = async_hooks.executionAsyncId();
        const triggerId = async_hooks.triggerAsyncId();
        const indentStr = " ".repeat(this._indent < 0 ? 0 : this._indent);
        debug2(`${indentStr}CONTEXT-CREATED Context: (${this.name}) currentUid:${currentUid} asyncHooksCurrentId:${asyncHooksCurrentId} triggerId:${triggerId} len:${this._set.length} context:${util.inspect(context, { showHidden: true, depth: 2, colors: true })}`);
      }
      return context;
    };
    Namespace.prototype.run = function run(fn) {
      let context = this.createContext();
      this.enter(context);
      try {
        if (DEBUG_CLS_HOOKED) {
          const triggerId = async_hooks.triggerAsyncId();
          const asyncHooksCurrentId = async_hooks.executionAsyncId();
          const indentStr = " ".repeat(this._indent < 0 ? 0 : this._indent);
          debug2(`${indentStr}CONTEXT-RUN BEGIN: (${this.name}) currentUid:${currentUid} triggerId:${triggerId} asyncHooksCurrentId:${asyncHooksCurrentId} len:${this._set.length} context:${util.inspect(context)}`);
        }
        fn(context);
        return context;
      } catch (exception) {
        if (exception) {
          exception[ERROR_SYMBOL] = context;
        }
        throw exception;
      } finally {
        if (DEBUG_CLS_HOOKED) {
          const triggerId = async_hooks.triggerAsyncId();
          const asyncHooksCurrentId = async_hooks.executionAsyncId();
          const indentStr = " ".repeat(this._indent < 0 ? 0 : this._indent);
          debug2(`${indentStr}CONTEXT-RUN END: (${this.name}) currentUid:${currentUid} triggerId:${triggerId} asyncHooksCurrentId:${asyncHooksCurrentId} len:${this._set.length} ${util.inspect(context)}`);
        }
        this.exit(context);
      }
    };
    Namespace.prototype.runAndReturn = function runAndReturn(fn) {
      let value;
      this.run(function(context) {
        value = fn(context);
      });
      return value;
    };
    Namespace.prototype.runPromise = function runPromise(fn) {
      let context = this.createContext();
      this.enter(context);
      let promise = fn(context);
      if (!promise || !promise.then || !promise.catch) {
        throw new Error("fn must return a promise.");
      }
      if (DEBUG_CLS_HOOKED) {
        debug2("CONTEXT-runPromise BEFORE: (" + this.name + ") currentUid:" + currentUid + " len:" + this._set.length + " " + util.inspect(context));
      }
      return promise.then((result) => {
        if (DEBUG_CLS_HOOKED) {
          debug2("CONTEXT-runPromise AFTER then: (" + this.name + ") currentUid:" + currentUid + " len:" + this._set.length + " " + util.inspect(context));
        }
        this.exit(context);
        return result;
      }).catch((err) => {
        err[ERROR_SYMBOL] = context;
        if (DEBUG_CLS_HOOKED) {
          debug2("CONTEXT-runPromise AFTER catch: (" + this.name + ") currentUid:" + currentUid + " len:" + this._set.length + " " + util.inspect(context));
        }
        this.exit(context);
        throw err;
      });
    };
    Namespace.prototype.bind = function bindFactory(fn, context) {
      if (!context) {
        if (!this.active) {
          context = this.createContext();
        } else {
          context = this.active;
        }
      }
      let self = this;
      return function clsBind() {
        self.enter(context);
        try {
          return fn.apply(this, arguments);
        } catch (exception) {
          if (exception) {
            exception[ERROR_SYMBOL] = context;
          }
          throw exception;
        } finally {
          self.exit(context);
        }
      };
    };
    Namespace.prototype.enter = function enter(context) {
      assert.ok(context, "context must be provided for entering");
      if (DEBUG_CLS_HOOKED) {
        const asyncHooksCurrentId = async_hooks.executionAsyncId();
        const triggerId = async_hooks.triggerAsyncId();
        const indentStr = " ".repeat(this._indent < 0 ? 0 : this._indent);
        debug2(`${indentStr}CONTEXT-ENTER: (${this.name}) currentUid:${currentUid} triggerId:${triggerId} asyncHooksCurrentId:${asyncHooksCurrentId} len:${this._set.length} ${util.inspect(context)}`);
      }
      this._set.push(this.active);
      this.active = context;
    };
    Namespace.prototype.exit = function exit(context) {
      assert.ok(context, "context must be provided for exiting");
      if (DEBUG_CLS_HOOKED) {
        const asyncHooksCurrentId = async_hooks.executionAsyncId();
        const triggerId = async_hooks.triggerAsyncId();
        const indentStr = " ".repeat(this._indent < 0 ? 0 : this._indent);
        debug2(`${indentStr}CONTEXT-EXIT: (${this.name}) currentUid:${currentUid} triggerId:${triggerId} asyncHooksCurrentId:${asyncHooksCurrentId} len:${this._set.length} ${util.inspect(context)}`);
      }
      if (this.active === context) {
        assert.ok(this._set.length, "can't remove top context");
        this.active = this._set.pop();
        return;
      }
      let index = this._set.lastIndexOf(context);
      if (index < 0) {
        if (DEBUG_CLS_HOOKED) {
          debug2("??ERROR?? context exiting but not entered - ignoring: " + util.inspect(context));
        }
        assert.ok(index >= 0, "context not currently entered; can't exit. \n" + util.inspect(this) + "\n" + util.inspect(context));
      } else {
        assert.ok(index, "can't remove top context");
        this._set.splice(index, 1);
      }
    };
    Namespace.prototype.bindEmitter = function bindEmitter(emitter) {
      assert.ok(emitter.on && emitter.addListener && emitter.emit, "can only bind real EEs");
      let namespace = this;
      let thisSymbol = "context@" + this.name;
      function attach(listener) {
        if (!listener) {
          return;
        }
        if (!listener[CONTEXTS_SYMBOL]) {
          listener[CONTEXTS_SYMBOL] = /* @__PURE__ */ Object.create(null);
        }
        listener[CONTEXTS_SYMBOL][thisSymbol] = {
          namespace,
          context: namespace.active
        };
      }
      function bind(unwrapped) {
        if (!(unwrapped && unwrapped[CONTEXTS_SYMBOL])) {
          return unwrapped;
        }
        let wrapped = unwrapped;
        let unwrappedContexts = unwrapped[CONTEXTS_SYMBOL];
        Object.keys(unwrappedContexts).forEach(function(name) {
          let thunk = unwrappedContexts[name];
          wrapped = thunk.namespace.bind(wrapped, thunk.context);
        });
        return wrapped;
      }
      wrapEmitter(emitter, attach, bind);
    };
    Namespace.prototype.fromException = function fromException(exception) {
      return exception[ERROR_SYMBOL];
    };
    function getNamespace2(name) {
      return process.namespaces[name];
    }
    function createNamespace(name) {
      assert.ok(name, "namespace must be given a name.");
      if (DEBUG_CLS_HOOKED) {
        debug2(`NS-CREATING NAMESPACE (${name})`);
      }
      let namespace = new Namespace(name);
      namespace.id = currentUid;
      const hook = async_hooks.createHook({
        init(asyncId, type, triggerId, resource) {
          currentUid = async_hooks.executionAsyncId();
          if (namespace.active) {
            namespace._contexts.set(asyncId, namespace.active);
            if (DEBUG_CLS_HOOKED) {
              const indentStr = " ".repeat(namespace._indent < 0 ? 0 : namespace._indent);
              debug2(`${indentStr}INIT [${type}] (${name}) asyncId:${asyncId} currentUid:${currentUid} triggerId:${triggerId} active:${util.inspect(namespace.active, { showHidden: true, depth: 2, colors: true })} resource:${resource}`);
            }
          } else if (currentUid === 0) {
            const triggerId2 = async_hooks.triggerAsyncId();
            const triggerIdContext = namespace._contexts.get(triggerId2);
            if (triggerIdContext) {
              namespace._contexts.set(asyncId, triggerIdContext);
              if (DEBUG_CLS_HOOKED) {
                const indentStr = " ".repeat(namespace._indent < 0 ? 0 : namespace._indent);
                debug2(`${indentStr}INIT USING CONTEXT FROM TRIGGERID [${type}] (${name}) asyncId:${asyncId} currentUid:${currentUid} triggerId:${triggerId2} active:${util.inspect(namespace.active, { showHidden: true, depth: 2, colors: true })} resource:${resource}`);
              }
            } else if (DEBUG_CLS_HOOKED) {
              const indentStr = " ".repeat(namespace._indent < 0 ? 0 : namespace._indent);
              debug2(`${indentStr}INIT MISSING CONTEXT [${type}] (${name}) asyncId:${asyncId} currentUid:${currentUid} triggerId:${triggerId2} active:${util.inspect(namespace.active, { showHidden: true, depth: 2, colors: true })} resource:${resource}`);
            }
          }
          if (DEBUG_CLS_HOOKED && type === "PROMISE") {
            debug2(util.inspect(resource, { showHidden: true }));
            const parentId = resource.parentId;
            const indentStr = " ".repeat(namespace._indent < 0 ? 0 : namespace._indent);
            debug2(`${indentStr}INIT RESOURCE-PROMISE [${type}] (${name}) parentId:${parentId} asyncId:${asyncId} currentUid:${currentUid} triggerId:${triggerId} active:${util.inspect(namespace.active, { showHidden: true, depth: 2, colors: true })} resource:${resource}`);
          }
        },
        before(asyncId) {
          currentUid = async_hooks.executionAsyncId();
          let context;
          context = namespace._contexts.get(asyncId) || namespace._contexts.get(currentUid);
          if (context) {
            if (DEBUG_CLS_HOOKED) {
              const triggerId = async_hooks.triggerAsyncId();
              const indentStr = " ".repeat(namespace._indent < 0 ? 0 : namespace._indent);
              debug2(`${indentStr}BEFORE (${name}) asyncId:${asyncId} currentUid:${currentUid} triggerId:${triggerId} active:${util.inspect(namespace.active, { showHidden: true, depth: 2, colors: true })} context:${util.inspect(context)}`);
              namespace._indent += 2;
            }
            namespace.enter(context);
          } else if (DEBUG_CLS_HOOKED) {
            const triggerId = async_hooks.triggerAsyncId();
            const indentStr = " ".repeat(namespace._indent < 0 ? 0 : namespace._indent);
            debug2(`${indentStr}BEFORE MISSING CONTEXT (${name}) asyncId:${asyncId} currentUid:${currentUid} triggerId:${triggerId} active:${util.inspect(namespace.active, { showHidden: true, depth: 2, colors: true })} namespace._contexts:${util.inspect(namespace._contexts, { showHidden: true, depth: 2, colors: true })}`);
            namespace._indent += 2;
          }
        },
        after(asyncId) {
          currentUid = async_hooks.executionAsyncId();
          let context;
          context = namespace._contexts.get(asyncId) || namespace._contexts.get(currentUid);
          if (context) {
            if (DEBUG_CLS_HOOKED) {
              const triggerId = async_hooks.triggerAsyncId();
              namespace._indent -= 2;
              const indentStr = " ".repeat(namespace._indent < 0 ? 0 : namespace._indent);
              debug2(`${indentStr}AFTER (${name}) asyncId:${asyncId} currentUid:${currentUid} triggerId:${triggerId} active:${util.inspect(namespace.active, { showHidden: true, depth: 2, colors: true })} context:${util.inspect(context)}`);
            }
            namespace.exit(context);
          } else if (DEBUG_CLS_HOOKED) {
            const triggerId = async_hooks.triggerAsyncId();
            namespace._indent -= 2;
            const indentStr = " ".repeat(namespace._indent < 0 ? 0 : namespace._indent);
            debug2(`${indentStr}AFTER MISSING CONTEXT (${name}) asyncId:${asyncId} currentUid:${currentUid} triggerId:${triggerId} active:${util.inspect(namespace.active, { showHidden: true, depth: 2, colors: true })} context:${util.inspect(context)}`);
          }
        },
        destroy(asyncId) {
          currentUid = async_hooks.executionAsyncId();
          if (DEBUG_CLS_HOOKED) {
            const triggerId = async_hooks.triggerAsyncId();
            const indentStr = " ".repeat(namespace._indent < 0 ? 0 : namespace._indent);
            debug2(`${indentStr}DESTROY (${name}) currentUid:${currentUid} asyncId:${asyncId} triggerId:${triggerId} active:${util.inspect(namespace.active, { showHidden: true, depth: 2, colors: true })} context:${util.inspect(namespace._contexts.get(currentUid))}`);
          }
          namespace._contexts.delete(asyncId);
        }
      });
      hook.enable();
      process.namespaces[name] = namespace;
      return namespace;
    }
    function destroyNamespace(name) {
      let namespace = getNamespace2(name);
      assert.ok(namespace, `can't delete nonexistent namespace! "` + name + '"');
      assert.ok(namespace.id, "don't assign to process.namespaces directly! " + util.inspect(namespace));
      process.namespaces[name] = null;
    }
    function reset() {
      if (process.namespaces) {
        Object.keys(process.namespaces).forEach(function(name) {
          destroyNamespace(name);
        });
      }
      process.namespaces = /* @__PURE__ */ Object.create(null);
    }
    process.namespaces = {};
    function debug2(...args) {
      if (DEBUG_CLS_HOOKED) {
        process._rawDebug(`${util.format(...args)}`);
      }
    }
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/logger.js
var require_logger = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/logger.js"(exports2, module2) {
    "use strict";
    var validLogLevels = ["debug", "info", "warn", "error", "silent"];
    var defaultLogLevel = validLogLevels.indexOf("error");
    var logLevel = calculateLogLevel(process.env.AWS_XRAY_DEBUG_MODE ? "debug" : process.env.AWS_XRAY_LOG_LEVEL);
    var logger2 = {
      error: createLoggerForLevel("error"),
      info: createLoggerForLevel("info"),
      warn: createLoggerForLevel("warn"),
      debug: createLoggerForLevel("debug")
    };
    function createLoggerForLevel(level) {
      var loggerLevel = validLogLevels.indexOf(level);
      var consoleMethod = console[level] || console.log || (() => {
      });
      if (loggerLevel >= logLevel) {
        return (message, meta) => {
          if (message || meta) {
            consoleMethod(formatLogMessage(level, message, meta));
          }
        };
      } else {
        return () => {
        };
      }
    }
    function calculateLogLevel(level) {
      if (level) {
        var normalisedLevel = level.toLowerCase();
        var index = validLogLevels.indexOf(normalisedLevel);
        return index >= 0 ? index : defaultLogLevel;
      }
      return defaultLogLevel;
    }
    function createTimestamp(date) {
      var tzo = -date.getTimezoneOffset(), dif = tzo >= 0 ? "+" : "-", pad = function(num) {
        var norm = Math.floor(Math.abs(num));
        return (norm < 10 ? "0" : "") + norm;
      };
      return new Date(date.getTime() + tzo * 60 * 1e3).toISOString().replace(/T/, " ").replace(/Z/, " ") + dif + pad(tzo / 60) + ":" + pad(tzo % 60);
    }
    function isLambdaFunction() {
      return process.env.LAMBDA_TASK_ROOT !== void 0;
    }
    function formatLogMessage(level, message, meta) {
      var messageParts = [];
      if (!isLambdaFunction()) {
        messageParts.push(createTimestamp(/* @__PURE__ */ new Date()));
        messageParts.push(`[${level.toUpperCase()}]`);
      }
      if (message) {
        messageParts.push(message);
      }
      var logString = messageParts.join(" ");
      var metaDataString = formatMetaData(meta);
      return [logString, metaDataString].filter((str) => str.length > 0).join("\n  ");
    }
    function formatMetaData(meta) {
      if (!meta) {
        return "";
      }
      return typeof meta === "string" ? meta : JSON.stringify(meta);
    }
    var logging = {
      setLogger: function setLogger2(logObj) {
        logger2 = logObj;
      },
      getLogger: function getLogger() {
        return logger2;
      }
    };
    module2.exports = logging;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/segments/attributes/captured_exception.js
var require_captured_exception = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/segments/attributes/captured_exception.js"(exports2, module2) {
    "use strict";
    var crypto = require("crypto");
    function CapturedException(err, remote) {
      this.init(err, remote);
    }
    CapturedException.prototype.init = function init(err, remote) {
      var e = typeof err === "string" || err instanceof String ? { message: err, name: "" } : err;
      this.message = e.message;
      this.type = e.name;
      this.stack = [];
      this.remote = !!remote;
      this.id = crypto.randomBytes(8).toString("hex");
      if (e.stack) {
        var stack = e.stack.split("\n");
        stack.shift();
        stack.forEach((stackline) => {
          var line = stackline.trim().replace(/\(|\)/g, "");
          line = line.substring(line.indexOf(" ") + 1);
          var label = line.lastIndexOf(" ") >= 0 ? line.slice(0, line.lastIndexOf(" ")) : null;
          var path = Array.isArray(label) && !label.length ? line : line.slice(line.lastIndexOf(" ") + 1);
          path = path.split(":");
          var entry = {
            path: path[0],
            line: parseInt(path[1]),
            label: label || "anonymous"
          };
          this.stack.push(entry);
        }, this);
      }
    };
    module2.exports = CapturedException;
  }
});

// node_modules/atomic-batcher/index.js
var require_atomic_batcher = __commonJS({
  "node_modules/atomic-batcher/index.js"(exports2, module2) {
    "use strict";
    module2.exports = batcher;
    function batcher(run) {
      var running = false;
      var pendingBatch = null;
      var pendingCallbacks = null;
      var callbacks = null;
      return append;
      function done(err) {
        if (callbacks) callAll(callbacks, err);
        running = false;
        callbacks = pendingCallbacks;
        var nextBatch = pendingBatch;
        pendingBatch = null;
        pendingCallbacks = null;
        if (!nextBatch || !nextBatch.length) {
          if (!callbacks || !callbacks.length) {
            callbacks = null;
            return;
          }
          if (!nextBatch) nextBatch = [];
        }
        running = true;
        run(nextBatch, done);
      }
      function append(val, cb) {
        if (running) {
          if (!pendingBatch) {
            pendingBatch = [];
            pendingCallbacks = [];
          }
          pushAll(pendingBatch, val);
          if (cb) pendingCallbacks.push(cb);
        } else {
          if (cb) callbacks = [cb];
          running = true;
          run(Array.isArray(val) ? val : [val], done);
        }
      }
    }
    function pushAll(list, val) {
      if (Array.isArray(val)) pushArray(list, val);
      else list.push(val);
    }
    function pushArray(list, val) {
      for (var i = 0; i < val.length; i++) list.push(val[i]);
    }
    function callAll(list, err) {
      for (var i = 0; i < list.length; i++) list[i](err);
    }
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/daemon_config.js
var require_daemon_config = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/daemon_config.js"(exports2, module2) {
    "use strict";
    var logger2 = require_logger();
    var DaemonConfig = {
      udp_ip: "127.0.0.1",
      udp_port: 2e3,
      tcp_ip: "127.0.0.1",
      tcp_port: 2e3,
      setDaemonAddress: function setDaemonAddress2(address) {
        if (!process.env.AWS_XRAY_DAEMON_ADDRESS) {
          processAddress(address);
          logger2.getLogger().info("Configured daemon address to " + address + ".");
        } else {
          logger2.getLogger().warn("Ignoring call to setDaemonAddress as AWS_XRAY_DAEMON_ADDRESS is set. The current daemon address will not be changed.");
        }
      }
    };
    var processAddress = function processAddress2(address) {
      if (address.indexOf(":") === -1) {
        throw new Error("Invalid Daemon Address. You must specify an ip and port.");
      } else {
        var splitAddress = address.split(" ");
        if (splitAddress.length === 1) {
          if (address.indexOf("udp") > -1 || address.indexOf("tcp") > -1) {
            throw new Error("Invalid Daemon Address. You must specify both tcp and udp addresses.");
          }
          var addr = address.split(":");
          if (!addr[0]) {
            throw new Error("Invalid Daemon Address. You must specify an ip.");
          }
          DaemonConfig.udp_ip = addr[0];
          DaemonConfig.tcp_ip = addr[0];
          DaemonConfig.udp_port = addr[1];
          DaemonConfig.tcp_port = addr[1];
        } else if (splitAddress.length === 2) {
          var part_1 = splitAddress[0].split(":");
          var part_2 = splitAddress[1].split(":");
          var addr_map = {};
          addr_map[part_1[0]] = part_1;
          addr_map[part_2[0]] = part_2;
          DaemonConfig.udp_ip = addr_map["udp"][1];
          DaemonConfig.udp_port = parseInt(addr_map["udp"][2]);
          DaemonConfig.tcp_ip = addr_map["tcp"][1];
          DaemonConfig.tcp_port = parseInt(addr_map["tcp"][2]);
          if (!DaemonConfig.udp_port || !DaemonConfig.tcp_port) {
            throw new Error("Invalid Daemon Address. You must specify port number.");
          }
        }
      }
    };
    if (process.env.AWS_XRAY_DAEMON_ADDRESS) {
      processAddress(process.env.AWS_XRAY_DAEMON_ADDRESS);
    }
    module2.exports = DaemonConfig;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/segment_emitter.js
var require_segment_emitter = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/segment_emitter.js"(exports2, module2) {
    "use strict";
    var dgram = require("dgram");
    var batcher = require_atomic_batcher();
    var logger2 = require_logger();
    var PROTOCOL_HEADER = '{"format":"json","version":1}';
    var PROTOCOL_DELIMITER = "\n";
    function batchSendData(ops, callback) {
      var client2 = dgram.createSocket("udp4");
      executeSendData(client2, ops, 0, function() {
        try {
          client2.close();
        } finally {
          callback();
        }
      });
    }
    function executeSendData(client2, ops, index, callback) {
      if (index >= ops.length) {
        callback();
        return;
      }
      sendMessage(client2, ops[index], function() {
        executeSendData(client2, ops, index + 1, callback);
      });
    }
    function sendMessage(client2, data, batchCallback) {
      var msg = data.msg;
      var offset = data.offset;
      var length = data.length;
      var port = data.port;
      var address = data.address;
      var callback = data.callback;
      client2.send(msg, offset, length, port, address, function(err) {
        try {
          callback(err);
        } finally {
          batchCallback();
        }
      });
    }
    function BatchingTemporarySocket() {
      this.batchSend = batcher(batchSendData);
    }
    BatchingTemporarySocket.prototype.send = function(msg, offset, length, port, address, callback) {
      var work = {
        msg,
        offset,
        length,
        port,
        address,
        callback
      };
      this.batchSend(work);
    };
    var SegmentEmitter = {
      daemonConfig: require_daemon_config(),
      /**
       * Returns the formatted segment JSON string.
       * @param {Segment} segment - The segment to format.
       */
      format: function format(segment) {
        return PROTOCOL_HEADER + PROTOCOL_DELIMITER + segment.toString();
      },
      /**
       * Creates a UDP socket connection and send the formatted segment.
       * @param {Segment} segment - The segment to send to the daemon.
       */
      send: function send(segment) {
        if (!this.socket) {
          if (this.useBatchingTemporarySocket) {
            this.socket = new BatchingTemporarySocket();
          } else {
            this.socket = dgram.createSocket("udp4").unref();
          }
        }
        var client2 = this.socket;
        var formatted = segment.format();
        var data = PROTOCOL_HEADER + PROTOCOL_DELIMITER + formatted;
        var message = Buffer.from(data);
        var short = '{"trace_id:"' + segment.trace_id + '","id":"' + segment.id + '"}';
        var type = segment.type === "subsegment" ? "Subsegment" : "Segment";
        client2.send(message, 0, message.length, this.daemonConfig.udp_port, this.daemonConfig.udp_ip, function(err) {
          if (err) {
            if (err.code === "EMSGSIZE") {
              logger2.getLogger().error(type + " too large to send: " + short + " (" + message.length + " bytes).");
            } else {
              logger2.getLogger().error("Error occured sending segment: ", err);
            }
          } else {
            logger2.getLogger().debug(type + ' sent: {"trace_id:"' + segment.trace_id + '","id":"' + segment.id + '"}');
            logger2.getLogger().debug("UDP message sent: " + segment);
          }
        });
      },
      /**
       * Configures the address and/or port the daemon is expected to be on.
       * @param {string} address - Address of the daemon the segments should be sent to. Should be formatted as an IPv4 address.
       * @module SegmentEmitter
       * @function setDaemonAddress
       */
      setDaemonAddress: function setDaemonAddress2(address) {
        this.daemonConfig.setDaemonAddress(address);
      },
      /**
       * Get the UDP IP the emitter is configured to.
       * @module SegmentEmitter
       * @function getIp
       */
      getIp: function getIp() {
        return this.daemonConfig.udp_ip;
      },
      /**
       * Get the UDP port the emitter is configured to.
       * @module SegmentEmitter
       * @function getPort
       */
      getPort: function getPort() {
        return this.daemonConfig.udp_port;
      },
      /**
       * Forces the segment emitter to create a new socket on send, and close it on complete.
       * @module SegmentEmitter
       * @function disableReusableSocket
       */
      disableReusableSocket: function() {
        this.useBatchingTemporarySocket = true;
      }
    };
    module2.exports = SegmentEmitter;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/segments/attributes/trace_id.js
var require_trace_id = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/segments/attributes/trace_id.js"(exports2, module2) {
    "use strict";
    var crypto = require("crypto");
    var logger2 = require_logger();
    var TraceID = class _TraceID {
      /**
       * Constructs a new trace ID using the current time.
       * @param {string} [tsHex] - time stamp to use for trace ID in hexadecimal format
       * @param {string} [numberhex] - string of hexadecimal characters for random portion of Trace ID
       * @constructor
       */
      constructor(tsHex, numberhex) {
        this.version = 1;
        this.timestamp = tsHex || Math.round((/* @__PURE__ */ new Date()).getTime() / 1e3).toString(16);
        this.id = numberhex || crypto.randomBytes(12).toString("hex");
      }
      /**
       * @returns {TraceID} - a hardcoded trace ID using zeroed timestamp and random ID
       */
      static Invalid() {
        return new _TraceID("00000000", "000000000000000000000000");
      }
      /**
       * Constructs a new trace ID from provided string. If no string is provided or the provided string is invalid,
       * log an error but a new trace ID still returned. This can be used as a trace ID string validator.
       * @param {string} [rawID] - string to create a Trace ID object from.
       */
      static FromString(rawID) {
        const DELIMITER = "-";
        var traceID = new _TraceID();
        var version, timestamp;
        if (!rawID || typeof rawID !== "string") {
          logger2.getLogger().error("Empty or non-string trace ID provided");
          return traceID;
        }
        const parts = rawID.trim().split(DELIMITER);
        if (parts.length !== 3) {
          logger2.getLogger().error("Unrecognized trace ID format");
          return traceID;
        }
        version = parseInt(parts[0]);
        if (isNaN(version) || version < 1) {
          logger2.getLogger().error("Trace ID version must be positive integer");
          return traceID;
        }
        timestamp = parseInt(parts[1], 16).toString(16);
        if (timestamp === "NaN") {
          logger2.getLogger().error("Trace ID timestamp must be a hex-encoded value");
          return traceID;
        } else {
          timestamp = timestamp.padStart(8, "0");
        }
        traceID.version = version;
        traceID.timestamp = timestamp;
        traceID.id = parts[2];
        return traceID;
      }
      /**
       * Returns a string representation of the trace ID.
       * @returns {string} - stringified trace ID, e.g. 1-57fbe041-2c7ad569f5d6ff149137be86
       */
      toString() {
        return `${this.version.toString()}-${this.timestamp}-${this.id}`;
      }
    };
    module2.exports = TraceID;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/utils.js
var require_utils = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/utils.js"(exports2, module2) {
    "use strict";
    var crypto = require("crypto");
    var logger2 = require_logger();
    var TraceID = require_trace_id();
    var utils = {
      /**
       * Checks a HTTP response code, where 4xx are 'error' and 5xx are 'fault'.
       * @param {string} status - the HTTP response status code.
       * @returns [string] - 'error', 'fault' or nothing on no match
       * @alias module:utils.getCauseTypeFromHttpStatus
       */
      getCauseTypeFromHttpStatus: function getCauseTypeFromHttpStatus(status) {
        var stat = status.toString();
        if (stat.match(/^[4][0-9]{2}$/) !== null) {
          return "error";
        } else if (stat.match(/^[5][0-9]{2}$/) !== null) {
          return "fault";
        }
      },
      /**
       * Removes the query string parameters from a given http request path
       * as it may contain sensitive information
       *
       * Related issue: https://github.com/aws/aws-xray-sdk-node/issues/246
       *
       * Node documentation: https://nodejs.org/api/http.html#http_http_request_url_options_callback
       *
       * @param {string} path - options.path in a http.request callback
       * @returns [string] - removes query string element from path
       * @alias module:utils.stripQueryStringFromPath
       */
      stripQueryStringFromPath: function stripQueryStringFromPath(path) {
        return path ? path.split("?")[0] : "";
      },
      /**
       * Performs a case-insensitive wildcard match against two strings. This method works with pseduo-regex chars; specifically ? and * are supported.
       *   An asterisk (*) represents any combination of characters
       *   A question mark (?) represents any single character
       *
       * @param {string} pattern - the regex-like pattern to be compared against.
       * @param {string} text - the string to compare against the pattern.
       * @returns boolean
       * @alias module:utils.wildcardMatch
       */
      wildcardMatch: function wildcardMatch(pattern, text) {
        if (pattern === void 0 || text === void 0) {
          return false;
        }
        if (pattern.length === 1 && pattern.charAt(0) === "*") {
          return true;
        }
        var patternLength = pattern.length;
        var textLength = text.length;
        var indexOfGlob = pattern.indexOf("*");
        pattern = pattern.toLowerCase();
        text = text.toLowerCase();
        if (indexOfGlob === -1 || indexOfGlob === patternLength - 1) {
          var match = function simpleWildcardMatch() {
            var j2 = 0;
            for (var i2 = 0; i2 < patternLength; i2++) {
              var patternChar2 = pattern.charAt(i2);
              if (patternChar2 === "*") {
                return true;
              } else if (patternChar2 === "?") {
                if (j2 === textLength) {
                  return false;
                }
                j2++;
              } else {
                if (j2 >= textLength || patternChar2 != text.charAt(j2)) {
                  return false;
                }
                j2++;
              }
            }
            return j2 === textLength;
          };
          return match();
        }
        var matchArray = [];
        matchArray[0] = true;
        for (var j = 0; j < patternLength; j++) {
          var i;
          var patternChar = pattern.charAt(j);
          if (patternChar != "*") {
            for (i = textLength - 1; i >= 0; i--) {
              matchArray[i + 1] = !!matchArray[i] && (patternChar === "?" || patternChar === text.charAt(i));
            }
          } else {
            i = 0;
            while (i <= textLength && !matchArray[i]) {
              i++;
            }
            for (i; i <= textLength; i++) {
              matchArray[i] = true;
            }
          }
          matchArray[0] = matchArray[0] && patternChar === "*";
        }
        return matchArray[textLength];
      },
      LambdaUtils: {
        validTraceData: function(xAmznTraceId) {
          var valid = false;
          if (xAmznTraceId) {
            var data = utils.processTraceData(xAmznTraceId);
            valid = !!(data && data.root && data.parent && data.sampled);
          }
          return valid;
        },
        /**
         * Populates trace ID, parent ID, and sampled decision of given segment. Will always populate valid values,
         * even if xAmznTraceId contains missing or invalid values. This ensures downstream services receive valid
         * headers.
         * @param {Segment} segment - Facade segment to be populated
         * @param {String} xAmznTraceId - Raw Trace Header to supply trace data
         * @returns {Boolean} - true if required fields are present and Trace ID is valid, false otherwise
         */
        populateTraceData: function(segment, xAmznTraceId) {
          logger2.getLogger().debug("Lambda trace data found: " + xAmznTraceId);
          let traceData = utils.processTraceData(xAmznTraceId);
          var valid = false;
          if (!traceData) {
            traceData = {};
            logger2.getLogger().error("_X_AMZN_TRACE_ID is empty or has an invalid format");
          } else if (traceData.root && !traceData.parent && !traceData.sampled) {
            segment.noOp = true;
            valid = true;
          } else if (!traceData.root || !traceData.parent || !traceData.sampled) {
            logger2.getLogger().error("_X_AMZN_TRACE_ID is missing required information");
          } else {
            valid = true;
          }
          segment.trace_id = TraceID.FromString(traceData.root).toString();
          segment.id = traceData.parent || crypto.randomBytes(8).toString("hex");
          if (traceData.root && segment.trace_id !== traceData.root) {
            logger2.getLogger().error("_X_AMZN_TRACE_ID contains invalid trace ID");
            valid = false;
          }
          if (!parseInt(traceData.sampled)) {
            segment.notTraced = true;
          } else {
            delete segment.notTraced;
          }
          if (traceData.data) {
            segment.additionalTraceData = traceData.data;
          }
          logger2.getLogger().debug("Segment started: " + JSON.stringify(traceData));
          return valid;
        }
      },
      /**
       * Splits out the data from the trace id format.  Used by the middleware.
       * @param {String} traceData - The additional trace data (typically in req.headers.x-amzn-trace-id).
       * @returns {object}
       * @alias module:mw_utils.processTraceData
       */
      processTraceData: function processTraceData(traceData) {
        var amznTraceData = {};
        var data = {};
        var reservedKeywords = ["root", "parent", "sampled", "self"];
        var remainingBytes = 256;
        if (!(typeof traceData === "string" && traceData)) {
          return amznTraceData;
        }
        traceData.split(";").forEach(function(header) {
          if (!header) {
            return;
          }
          var pair = header.split("=");
          if (pair[0] && pair[1]) {
            let key = pair[0].trim();
            let value = pair[1].trim();
            let lowerCaseKey = key.toLowerCase();
            let reserved = reservedKeywords.indexOf(lowerCaseKey) !== -1;
            if (reserved) {
              amznTraceData[lowerCaseKey] = value;
            } else if (!reserved && remainingBytes - (lowerCaseKey.length + value.length) >= 0) {
              data[key] = value;
              remainingBytes -= key.length + value.length;
            }
          }
        });
        amznTraceData["data"] = data;
        return amznTraceData;
      },
      /**
       * Makes a shallow copy of an object without given keys - keeps prototype
       * @param {Object} obj - The object to copy
       * @param {string[]} [keys=[]] - The keys that won't be copied
       * @param {boolean} [preservePrototype=false] - If true also copy prototype properties
       * @returns {}
       */
      objectWithoutProperties: function objectWithoutProperties(obj, keys, preservePrototype) {
        keys = Array.isArray(keys) ? keys : [];
        preservePrototype = typeof preservePrototype === "boolean" ? preservePrototype : false;
        var target = preservePrototype ? Object.create(Object.getPrototypeOf(obj)) : {};
        for (var property in obj) {
          if (keys.indexOf(property) >= 0) {
            continue;
          }
          if (!Object.prototype.hasOwnProperty.call(obj, property)) {
            continue;
          }
          target[property] = obj[property];
        }
        return target;
      },
      /**
       * Safely gets an integer from a string or number
       * @param {String | Number} - input to cast to integer
       * @returns {Number} - Integer representation of input, or 0 if input is not castable to int
       */
      safeParseInt: (val) => {
        if (!val || isNaN(val)) {
          return 0;
        }
        return parseInt(val);
      }
    };
    module2.exports = utils;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/segments/segment_utils.js
var require_segment_utils = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/segments/segment_utils.js"(exports2, module2) {
    "use strict";
    var { safeParseInt } = require_utils();
    var logger2 = require_logger();
    var DEFAULT_STREAMING_THRESHOLD = 100;
    var utils = {
      streamingThreshold: DEFAULT_STREAMING_THRESHOLD,
      getCurrentTime: function getCurrentTime() {
        return Date.now() / 1e3;
      },
      setOrigin: function setOrigin(origin) {
        this.origin = origin;
      },
      setPluginData: function setPluginData(pluginData) {
        this.pluginData = pluginData;
      },
      setSDKData: function setSDKData(sdkData) {
        this.sdkData = sdkData;
      },
      setServiceData: function setServiceData(serviceData) {
        this.serviceData = serviceData;
      },
      /**
       * Overrides the default streaming threshold (100).
       * The threshold represents the maximum number of subsegments on a single segment before
       * the SDK beings to send the completed subsegments out of band of the main segment.
       * Reduce this threshold if you see the 'Segment too large to send' error.
       * @param {number} threshold - The new threshold to use.
       * @memberof AWSXRay
       */
      setStreamingThreshold: function setStreamingThreshold(threshold) {
        if (isFinite(threshold) && threshold >= 0) {
          utils.streamingThreshold = threshold;
          logger2.getLogger().debug("Subsegment streaming threshold set to: " + threshold);
        } else {
          logger2.getLogger().error("Invalid threshold: " + threshold + ". Must be a whole number >= 0.");
        }
      },
      getStreamingThreshold: function getStreamingThreshold() {
        return utils.streamingThreshold;
      },
      /**
       * Parses an HTTP response object to return an X-Ray compliant HTTP response object.
       * @param {http.ServerResponse} res
       * @returns {Object} - X-Ray response object to be added to (sub)segment
       */
      getHttpResponseData: (res) => {
        const ret = {};
        if (!res) {
          return ret;
        }
        const status = safeParseInt(res.statusCode);
        if (status !== 0) {
          ret.status = status;
        }
        if (res.headers && res.headers["content-length"]) {
          ret.content_length = safeParseInt(res.headers["content-length"]);
        }
        return ret;
      },
      getJsonStringifyReplacer: () => (_, value) => {
        if (typeof value === "bigint") {
          return value.toString();
        }
        return value;
      }
    };
    module2.exports = utils;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/segments/attributes/remote_request_data.js
var require_remote_request_data = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/segments/attributes/remote_request_data.js"(exports2, module2) {
    "use strict";
    var { getHttpResponseData } = require_segment_utils();
    var { stripQueryStringFromPath } = require_utils();
    function RemoteRequestData(req, res, downstreamXRayEnabled) {
      this.init(req, res, downstreamXRayEnabled);
    }
    RemoteRequestData.prototype.init = function init(req, res, downstreamXRayEnabled) {
      this.request = {
        url: req.agent && req.agent.protocol ? req.agent.protocol + "//" + (req.host || req.getHeader("host")) + stripQueryStringFromPath(req.path) : "",
        method: req.method || ""
      };
      if (downstreamXRayEnabled) {
        this.request.traced = true;
      }
      if (res) {
        this.response = getHttpResponseData(res);
      }
    };
    module2.exports = RemoteRequestData;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/segments/attributes/subsegment.js
var require_subsegment = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/segments/attributes/subsegment.js"(exports2, module2) {
    "use strict";
    var crypto = require("crypto");
    var CapturedException = require_captured_exception();
    var RemoteRequestData = require_remote_request_data();
    var SegmentEmitter = require_segment_emitter();
    var SegmentUtils = require_segment_utils();
    var Utils = require_utils();
    var logger2 = require_logger();
    function Subsegment(name) {
      this.init(name);
    }
    Subsegment.prototype.init = function init(name) {
      if (typeof name != "string") {
        throw new Error("Subsegment name must be of type string.");
      }
      this.id = crypto.randomBytes(8).toString("hex");
      this.name = name;
      this.start_time = SegmentUtils.getCurrentTime();
      this.in_progress = true;
      this.counter = 0;
      this.notTraced = false;
    };
    Subsegment.prototype.addNewSubsegment = function addNewSubsegment(name) {
      const subsegment = new Subsegment(name);
      this.addSubsegment(subsegment);
      return subsegment;
    };
    Subsegment.prototype.addSubsegmentWithoutSampling = function addSubsegmentWithoutSampling(subsegment) {
      this.addSubsegment(subsegment);
      subsegment.notTraced = true;
    };
    Subsegment.prototype.addNewSubsegmentWithoutSampling = function addNewSubsegmentWithoutSampling(name) {
      const subsegment = new Subsegment(name);
      this.addSubsegment(subsegment);
      subsegment.notTraced = true;
      return subsegment;
    };
    Subsegment.prototype.addSubsegment = function(subsegment) {
      if (!(subsegment instanceof Subsegment)) {
        throw new Error("Failed to add subsegment:" + subsegment + ' to subsegment "' + this.name + '".  Not a subsegment.');
      }
      if (this.subsegments === void 0) {
        this.subsegments = [];
      }
      subsegment.segment = this.segment;
      subsegment.parent = this;
      subsegment.notTraced = subsegment.parent.notTraced;
      subsegment.noOp = subsegment.parent.noOp;
      if (subsegment.end_time === void 0) {
        this.incrementCounter(subsegment.counter);
      }
      this.subsegments.push(subsegment);
    };
    Subsegment.prototype.removeSubsegment = function removeSubsegment(subsegment) {
      if (!(subsegment instanceof Subsegment)) {
        throw new Error("Failed to remove subsegment:" + subsegment + ' from subsegment "' + this.name + '".  Not a subsegment.');
      }
      if (this.subsegments !== void 0) {
        var index = this.subsegments.indexOf(subsegment);
        if (index >= 0) {
          this.subsegments.splice(index, 1);
        }
      }
    };
    Subsegment.prototype.addAttribute = function addAttribute(name, data) {
      this[name] = data;
    };
    Subsegment.prototype.addPrecursorId = function(id) {
      if (typeof id !== "string") {
        logger2.getLogger().error("Failed to add id:" + id + " to subsegment " + this.name + ".  Precursor Ids must be of type string.");
      }
      if (this.precursor_ids === void 0) {
        this.precursor_ids = [];
      }
      this.precursor_ids.push(id);
    };
    Subsegment.prototype.addAnnotation = function(key, value) {
      if (typeof value !== "boolean" && typeof value !== "string" && !isFinite(value)) {
        logger2.getLogger().error("Failed to add annotation key: " + key + " value: " + value + " to subsegment " + this.name + ". Value must be of type string, number or boolean.");
        return;
      }
      if (typeof key !== "string") {
        logger2.getLogger().error("Failed to add annotation key: " + key + " value: " + value + " to subsegment " + this.name + ". Key must be of type string.");
        return;
      }
      if (this.annotations === void 0) {
        this.annotations = {};
      }
      this.annotations[key] = value;
    };
    Subsegment.prototype.addMetadata = function(key, value, namespace) {
      if (typeof key !== "string") {
        logger2.getLogger().error("Failed to add metadata key: " + key + " value: " + value + " to subsegment " + this.name + ". Key must be of type string.");
        return;
      }
      if (namespace && typeof namespace !== "string") {
        logger2.getLogger().error("Failed to add metadata key: " + key + " value: " + value + " to subsegment " + this.name + ". Namespace must be of type string.");
        return;
      }
      var ns = namespace || "default";
      if (!this.metadata) {
        this.metadata = {};
      }
      if (!this.metadata[ns]) {
        this.metadata[ns] = {};
      }
      if (ns !== "__proto__") {
        this.metadata[ns][key] = value !== null && value !== void 0 ? value : "";
      }
    };
    Subsegment.prototype.addSqlData = function addSqlData(sqlData) {
      this.sql = sqlData;
    };
    Subsegment.prototype.addError = function addError(err, remote) {
      if (err == null || typeof err !== "object" && typeof err !== "string") {
        logger2.getLogger().error("Failed to add error:" + err + ' to subsegment "' + this.name + '".  Not an object or string literal.');
        return;
      }
      this.addFaultFlag();
      if (this.segment && this.segment.exception) {
        if (err === this.segment.exception.ex) {
          this.fault = true;
          this.cause = { id: this.segment.exception.cause, exceptions: [] };
          return;
        }
        delete this.segment.exception;
      }
      if (this.segment) {
        this.segment.exception = {
          ex: err,
          cause: this.id
        };
      } else {
      }
      if (this.cause === void 0) {
        this.cause = {
          working_directory: process.cwd(),
          exceptions: []
        };
      }
      this.cause.exceptions.unshift(new CapturedException(err, remote));
    };
    Subsegment.prototype.addRemoteRequestData = function addRemoteRequestData(req, res, downstreamXRayEnabled) {
      this.http = new RemoteRequestData(req, res, downstreamXRayEnabled);
      if ("traced" in this.http.request) {
        this.traced = this.http.request.traced;
        delete this.http.request.traced;
      }
    };
    Subsegment.prototype.addFaultFlag = function addFaultFlag() {
      this.fault = true;
    };
    Subsegment.prototype.addErrorFlag = function addErrorFlag() {
      this.error = true;
    };
    Subsegment.prototype.addThrottleFlag = function addThrottleFlag() {
      this.throttle = true;
    };
    Subsegment.prototype.close = function close(err, remote) {
      var root = this.segment;
      this.end_time = SegmentUtils.getCurrentTime();
      delete this.in_progress;
      if (err) {
        this.addError(err, remote);
      }
      if (this.parent) {
        this.parent.decrementCounter();
      }
      if (root && root.counter > SegmentUtils.getStreamingThreshold()) {
        if (this.streamSubsegments() && this.parent) {
          this.parent.removeSubsegment(this);
        }
      }
    };
    Subsegment.prototype.incrementCounter = function incrementCounter(additional) {
      this.counter = additional ? this.counter + additional + 1 : this.counter + 1;
      if (this.parent) {
        this.parent.incrementCounter(additional);
      }
    };
    Subsegment.prototype.decrementCounter = function decrementCounter() {
      this.counter--;
      if (this.parent) {
        this.parent.decrementCounter();
      }
    };
    Subsegment.prototype.isClosed = function isClosed() {
      return !this.in_progress;
    };
    Subsegment.prototype.flush = function flush() {
      if (!this.parent || !this.segment) {
        logger2.getLogger().error("Failed to flush subsegment: " + this.name + ". Subsegment must be added to a segment chain to flush.");
        return;
      }
      if (this.segment.trace_id) {
        if (this.segment.notTraced !== true && !this.notTraced) {
          SegmentEmitter.send(this);
        } else {
          logger2.getLogger().debug("Ignoring flush on subsegment " + this.id + ". Associated segment is marked as not sampled.");
        }
      } else {
        logger2.getLogger().debug("Ignoring flush on subsegment " + this.id + ". Associated segment is missing a trace ID.");
      }
    };
    Subsegment.prototype.streamSubsegments = function streamSubsegments() {
      if (this.isClosed() && this.counter <= 0) {
        this.flush();
        return true;
      } else if (this.subsegments && this.subsegments.length > 0) {
        var open = [];
        this.subsegments.forEach(function(child) {
          if (!child.streamSubsegments()) {
            open.push(child);
          }
        });
        this.subsegments = open;
      }
    };
    Subsegment.prototype.format = function format() {
      this.type = "subsegment";
      if (this.parent) {
        this.parent_id = this.parent.id;
      }
      if (this.segment) {
        this.trace_id = this.segment.trace_id;
      }
      return this.serialize();
    };
    Subsegment.prototype.toString = function toString() {
      return this.serialize();
    };
    Subsegment.prototype.toJSON = function toJSON() {
      var ignore = ["segment", "parent", "counter"];
      if (this.subsegments == null || this.subsegments.length === 0) {
        ignore.push("subsegments");
      }
      var thisCopy = Utils.objectWithoutProperties(this, ignore, false);
      return thisCopy;
    };
    Subsegment.prototype.serialize = function serialize(object) {
      return JSON.stringify(object !== null && object !== void 0 ? object : this, SegmentUtils.getJsonStringifyReplacer());
    };
    module2.exports = Subsegment;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/segments/segment.js
var require_segment = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/segments/segment.js"(exports2, module2) {
    "use strict";
    var crypto = require("crypto");
    var CapturedException = require_captured_exception();
    var SegmentEmitter = require_segment_emitter();
    var SegmentUtils = require_segment_utils();
    var Subsegment = require_subsegment();
    var TraceID = require_trace_id();
    var Utils = require_utils();
    var logger2 = require_logger();
    function Segment(name, rootId, parentId) {
      this.init(name, rootId, parentId);
    }
    Segment.prototype.init = function init(name, rootId, parentId) {
      if (typeof name != "string") {
        throw new Error("Segment name must be of type string.");
      }
      var traceId;
      if (rootId && typeof rootId == "string") {
        traceId = TraceID.FromString(rootId);
      } else {
        traceId = new TraceID();
      }
      var id = crypto.randomBytes(8).toString("hex");
      var startTime = SegmentUtils.getCurrentTime();
      this.trace_id = traceId.toString();
      this.id = id;
      this.start_time = startTime;
      this.name = name || "";
      this.in_progress = true;
      this.counter = 0;
      if (parentId) {
        this.parent_id = parentId;
      }
      if (SegmentUtils.serviceData) {
        this.setServiceData(SegmentUtils.serviceData);
      }
      if (SegmentUtils.pluginData) {
        this.addPluginData(SegmentUtils.pluginData);
      }
      if (SegmentUtils.origin) {
        this.origin = SegmentUtils.origin;
      }
      if (SegmentUtils.sdkData) {
        this.setSDKData(SegmentUtils.sdkData);
      }
    };
    Segment.prototype.addIncomingRequestData = function addIncomingRequestData(data) {
      this.http = data;
    };
    Segment.prototype.addAnnotation = function addAnnotation(key, value) {
      if (typeof value !== "boolean" && typeof value !== "string" && !isFinite(value)) {
        logger2.getLogger().error("Failed to add annotation key: " + key + " value: " + value + " to subsegment " + this.name + ". Value must be of type string, number or boolean.");
        return;
      }
      if (typeof key !== "string") {
        logger2.getLogger().error("Failed to add annotation key: " + key + " value: " + value + " to subsegment " + this.name + ". Key must be of type string.");
        return;
      }
      if (this.annotations === void 0) {
        this.annotations = {};
      }
      this.annotations[key] = value;
    };
    Segment.prototype.setUser = function(user) {
      if (typeof user !== "string") {
        logger2.getLogger().error("Set user: " + user + " failed. User IDs must be of type string.");
      }
      this.user = user;
    };
    Segment.prototype.addMetadata = function(key, value, namespace) {
      if (typeof key !== "string") {
        logger2.getLogger().error("Failed to add metadata key: " + key + " value: " + value + " to segment " + this.name + ". Key must be of type string.");
        return;
      }
      if (namespace && typeof namespace !== "string") {
        logger2.getLogger().error("Failed to add metadata key: " + key + " value: " + value + " to segment " + this.name + ". Namespace must be of type string.");
        return;
      }
      var ns = namespace || "default";
      if (!this.metadata) {
        this.metadata = {};
      }
      if (!this.metadata[ns]) {
        this.metadata[ns] = {};
      }
      if (ns !== "__proto__") {
        this.metadata[ns][key] = value !== null && value !== void 0 ? value : "";
      }
    };
    Segment.prototype.setSDKData = function setSDKData(data) {
      if (!data) {
        logger2.getLogger().error("Add SDK data: " + data + " failed.Must not be empty.");
        return;
      }
      if (!this.aws) {
        this.aws = {};
      }
      this.aws.xray = data;
    };
    Segment.prototype.setMatchedSamplingRule = function setMatchedSamplingRule(ruleName) {
      if (this.aws) {
        this.aws = JSON.parse(JSON.stringify(this.aws));
      }
      if (this.aws && this.aws["xray"]) {
        this.aws.xray["rule_name"] = ruleName;
      } else {
        this.aws = { xray: { "rule_name": ruleName } };
      }
    };
    Segment.prototype.setServiceData = function setServiceData(data) {
      if (!data) {
        logger2.getLogger().error("Add service data: " + data + " failed.Must not be empty.");
        return;
      }
      this.service = data;
    };
    Segment.prototype.addPluginData = function addPluginData(data) {
      if (this.aws === void 0) {
        this.aws = {};
      }
      Object.assign(this.aws, data);
    };
    Segment.prototype.addNewSubsegment = function addNewSubsegment(name) {
      var subsegment = new Subsegment(name);
      this.addSubsegment(subsegment);
      return subsegment;
    };
    Segment.prototype.addSubsegmentWithoutSampling = function addSubsegmentWithoutSampling(subsegment) {
      this.addSubsegment(subsegment);
      subsegment.notTraced = true;
    };
    Segment.prototype.addNewSubsegmentWithoutSampling = function addNewSubsegmentWithoutSampling(name) {
      const subsegment = new Subsegment(name);
      this.addSubsegment(subsegment);
      subsegment.notTraced = true;
      return subsegment;
    };
    Segment.prototype.addSubsegment = function addSubsegment(subsegment) {
      if (!(subsegment instanceof Subsegment)) {
        throw new Error("Cannot add subsegment: " + subsegment + ". Not a subsegment.");
      }
      if (this.subsegments === void 0) {
        this.subsegments = [];
      }
      subsegment.segment = this;
      subsegment.parent = this;
      subsegment.notTraced = subsegment.parent.notTraced;
      subsegment.noOp = subsegment.parent.noOp;
      this.subsegments.push(subsegment);
      if (!subsegment.end_time) {
        this.incrementCounter(subsegment.counter);
      }
    };
    Segment.prototype.removeSubsegment = function removeSubsegment(subsegment) {
      if (!(subsegment instanceof Subsegment)) {
        throw new Error("Failed to remove subsegment:" + subsegment + ' from subsegment "' + this.name + '".  Not a subsegment.');
      }
      if (this.subsegments !== void 0) {
        var index = this.subsegments.indexOf(subsegment);
        if (index >= 0) {
          this.subsegments.splice(index, 1);
        }
      }
    };
    Segment.prototype.addError = function addError(err, remote) {
      if (err == null || typeof err !== "object" && typeof err !== "string") {
        logger2.getLogger().error("Failed to add error:" + err + ' to subsegment "' + this.name + '".  Not an object or string literal.');
        return;
      }
      this.addFaultFlag();
      if (this.exception) {
        if (err === this.exception.ex) {
          this.cause = { id: this.exception.cause };
          delete this.exception;
          return;
        }
        delete this.exception;
      }
      if (this.cause === void 0) {
        this.cause = {
          working_directory: process.cwd(),
          exceptions: []
        };
      }
      this.cause.exceptions.push(new CapturedException(err, remote));
    };
    Segment.prototype.addFaultFlag = function addFaultFlag() {
      this.fault = true;
    };
    Segment.prototype.addErrorFlag = function addErrorFlag() {
      this.error = true;
    };
    Segment.prototype.addThrottleFlag = function addThrottleFlag() {
      this.throttle = true;
    };
    Segment.prototype.isClosed = function isClosed() {
      return !this.in_progress;
    };
    Segment.prototype.incrementCounter = function incrementCounter(additional) {
      this.counter = additional ? this.counter + additional + 1 : this.counter + 1;
      if (this.counter > SegmentUtils.streamingThreshold && this.subsegments && this.subsegments.length > 0) {
        var open = [];
        this.subsegments.forEach(function(child) {
          if (!child.streamSubsegments()) {
            open.push(child);
          }
        });
        this.subsegments = open;
      }
    };
    Segment.prototype.decrementCounter = function decrementCounter() {
      this.counter--;
      if (this.counter <= 0 && this.isClosed()) {
        this.flush();
      }
    };
    Segment.prototype.close = function(err, remote) {
      if (!this.end_time) {
        this.end_time = SegmentUtils.getCurrentTime();
      }
      if (err !== void 0) {
        this.addError(err, remote);
      }
      delete this.in_progress;
      delete this.exception;
      if (this.counter <= 0) {
        this.flush();
      }
    };
    Segment.prototype.flush = function flush() {
      if (this.notTraced !== true) {
        delete this.exception;
        var thisCopy = Utils.objectWithoutProperties(this, ["counter", "notTraced"], true);
        SegmentEmitter.send(thisCopy);
      }
    };
    Segment.prototype.format = function format() {
      var ignore = ["segment", "parent", "counter"];
      if (this.subsegments == null || this.subsegments.length === 0) {
        ignore.push("subsegments");
      }
      var thisCopy = Utils.objectWithoutProperties(this, ignore, false);
      return this.serialize(thisCopy);
    };
    Segment.prototype.toString = function toString() {
      return this.serialize();
    };
    Segment.prototype.serialize = function serialize(object) {
      return JSON.stringify(object !== null && object !== void 0 ? object : this, SegmentUtils.getJsonStringifyReplacer());
    };
    module2.exports = Segment;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/context_utils.js
var require_context_utils = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/context_utils.js"(exports2, module2) {
    "use strict";
    var cls = require_context();
    var logger2 = require_logger();
    var Segment = require_segment();
    var Subsegment = require_subsegment();
    var cls_mode = true;
    var NAMESPACE = "AWSXRay";
    var SEGMENT = "segment";
    var contextOverride = false;
    var contextUtils = {
      CONTEXT_MISSING_STRATEGY: {
        RUNTIME_ERROR: {
          contextMissing: function contextMissingRuntimeError(message) {
            throw new Error(message);
          }
        },
        LOG_ERROR: {
          contextMissing: function contextMissingLogError(message) {
            var err = new Error(message);
            logger2.getLogger().error(err.stack);
          }
        },
        IGNORE_ERROR: {
          contextMissing: function contextMissingIgnoreError() {
          }
        }
      },
      contextMissingStrategy: {},
      /**
       * Resolves the segment or subsegment given manual mode and params on the call required.
       * @param [Segment|Subsegment] segment - The segment manually provided via params.XraySegment, if provided.
       * @returns {Segment|Subsegment}
       * @alias module:context_utils.resolveManualSegmentParams
       */
      resolveManualSegmentParams: function resolveManualSegmentParams(params) {
        if (params && !contextUtils.isAutomaticMode()) {
          var xraySegment = params.XRaySegment || params.XraySegment;
          var segment = params.Segment;
          var found = null;
          if (xraySegment && (xraySegment instanceof Segment || xraySegment instanceof Subsegment)) {
            found = xraySegment;
            delete params.XRaySegment;
            delete params.XraySegment;
          } else if (segment && (segment instanceof Segment || segment instanceof Subsegment)) {
            found = segment;
            delete params.Segment;
          }
          return found;
        }
      },
      /**
       * Gets current CLS namespace for X-Ray SDK or creates one if absent.
       * @returns {Namespace}
       * @alias module:context_utils.getNamespace
       */
      getNamespace: function getNamespace2() {
        return cls.getNamespace(NAMESPACE) || cls.createNamespace(NAMESPACE);
      },
      /**
       * Resolves the segment or subsegment given manual or automatic mode.
       * @param [Segment|Subsegment] segment - The segment manually provided, if provided.
       * @returns {Segment|Subsegment}
       * @alias module:context_utils.resolveSegment
       */
      resolveSegment: function resolveSegment(segment) {
        if (cls_mode) {
          return this.getSegment();
        } else if (segment && !cls_mode) {
          return segment;
        } else if (!segment && !cls_mode) {
          contextUtils.contextMissingStrategy.contextMissing("No sub/segment specified. A sub/segment must be provided for manual mode.");
        }
      },
      /**
       * Returns the current segment or subsegment.  For use with in automatic mode only.
       * @returns {Segment|Subsegment}
       * @alias module:context_utils.getSegment
       */
      getSegment: function getSegment2() {
        if (cls_mode) {
          var segment = contextUtils.getNamespace(NAMESPACE).get(SEGMENT);
          if (!segment) {
            contextUtils.contextMissingStrategy.contextMissing("Failed to get the current sub/segment from the context.");
          } else if (segment instanceof Segment && process.env.LAMBDA_TASK_ROOT && segment.facade == true) {
            segment.resolveLambdaTraceData();
          }
          return segment;
        } else {
          contextUtils.contextMissingStrategy.contextMissing("Cannot get sub/segment from context. Not supported in manual mode.");
        }
      },
      /**
       * Sets the current segment or subsegment.  For use with in automatic mode only.
       * @param [Segment|Subsegment] segment - The sub/segment to set.
       * @returns {Segment|Subsegment}
       * @alias module:context_utils.setSegment
       */
      setSegment: function setSegment2(segment) {
        if (cls_mode) {
          if (!contextUtils.getNamespace(NAMESPACE).set(SEGMENT, segment)) {
            logger2.getLogger().warn("Failed to set the current sub/segment on the context.");
          }
        } else {
          contextUtils.contextMissingStrategy.contextMissing("Cannot set sub/segment on context. Not supported in manual mode.");
        }
      },
      /**
       * Returns true if in automatic mode, otherwise false.
       * @returns {Segment|Subsegment}
       * @alias module:context_utils.isAutomaticMode
       */
      isAutomaticMode: function isAutomaticMode() {
        return cls_mode;
      },
      /**
       * Enables automatic mode. Automatic mode uses 'cls-hooked'.
       * @see https://github.com/jeff-lewis/cls-hooked
       * @alias module:context_utils.enableAutomaticMode
       */
      enableAutomaticMode: function enableAutomaticMode() {
        cls_mode = true;
        contextUtils.getNamespace(NAMESPACE);
        logger2.getLogger().debug("Overriding AWS X-Ray SDK mode. Set to automatic mode.");
      },
      /**
       * Disables automatic mode. Current segment or subsegment then must be passed manually
       * via the parent optional on captureFunc, captureAsyncFunc etc.
       * @alias module:context_utils.enableManualMode
       */
      enableManualMode: function enableManualMode() {
        cls_mode = false;
        if (cls.getNamespace(NAMESPACE)) {
          cls.destroyNamespace(NAMESPACE);
        }
        logger2.getLogger().debug("Overriding AWS X-Ray SDK mode. Set to manual mode.");
      },
      /**
       * Sets the context missing strategy if no context missing strategy is set using the environment variable with
       * key AWS_XRAY_CONTEXT_MISSING. The context missing strategy's contextMissing function will be called whenever
       * trace context is not found.
       * @param {string|function} strategy - The strategy to set. Valid string values are 'LOG_ERROR' and 'RUNTIME_ERROR'.
       *                                     Alternatively, a custom function can be supplied, which takes a error message string.
       */
      setContextMissingStrategy: function setContextMissingStrategy2(strategy) {
        if (!contextOverride) {
          if (typeof strategy === "string") {
            var lookupStrategy = contextUtils.CONTEXT_MISSING_STRATEGY[strategy.toUpperCase()];
            if (lookupStrategy) {
              contextUtils.contextMissingStrategy.contextMissing = lookupStrategy.contextMissing;
              if (process.env.AWS_XRAY_CONTEXT_MISSING) {
                logger2.getLogger().debug("AWS_XRAY_CONTEXT_MISSING is set. Configured context missing strategy to " + process.env.AWS_XRAY_CONTEXT_MISSING + ".");
              } else {
                logger2.getLogger().debug("Configured context missing strategy to: " + strategy);
              }
            } else {
              throw new Error("Invalid context missing strategy: " + strategy + ". Valid values are " + Object.keys(contextUtils.CONTEXT_MISSING_STRATEGY) + ".");
            }
          } else if (typeof strategy === "function") {
            contextUtils.contextMissingStrategy.contextMissing = strategy;
            logger2.getLogger().info("Configured custom context missing strategy to function: " + strategy.name);
          } else {
            throw new Error("Context missing strategy must be either a string or a custom function.");
          }
        } else {
          logger2.getLogger().warn("Ignoring call to setContextMissingStrategy as AWS_XRAY_CONTEXT_MISSING is set. The current context missing strategy will not be changed.");
        }
      }
    };
    if (process.env.AWS_XRAY_MANUAL_MODE) {
      cls_mode = false;
      logger2.getLogger().debug("Starting the AWS X-Ray SDK in manual mode.");
    } else {
      cls.createNamespace(NAMESPACE);
      logger2.getLogger().debug("Starting the AWS X-Ray SDK in automatic mode (default).");
    }
    if (process.env.AWS_XRAY_CONTEXT_MISSING) {
      contextUtils.setContextMissingStrategy(process.env.AWS_XRAY_CONTEXT_MISSING);
      contextOverride = true;
    } else {
      contextUtils.contextMissingStrategy.contextMissing = contextUtils.CONTEXT_MISSING_STRATEGY.LOG_ERROR.contextMissing;
      logger2.getLogger().debug("Using default context missing strategy: LOG_ERROR");
    }
    module2.exports = contextUtils;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/middleware/incoming_request_data.js
var require_incoming_request_data = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/middleware/incoming_request_data.js"(exports2, module2) {
    "use strict";
    var { getHttpResponseData } = require_segment_utils();
    function IncomingRequestData(req) {
      this.init(req);
    }
    IncomingRequestData.prototype.init = function init(req) {
      var forwarded = !!req.headers["x-forwarded-for"];
      var url;
      if (req.connection) {
        url = (req.connection.secure || req.connection.encrypted ? "https://" : "http://") + ((req.headers["host"] || "") + (req.url || ""));
      }
      this.request = {
        method: req.method || "",
        user_agent: req.headers["user-agent"] || "",
        client_ip: getClientIp(req) || "",
        url: url || ""
      };
      if (forwarded) {
        this.request.x_forwarded_for = forwarded;
      }
    };
    var getClientIp = function getClientIp2(req) {
      var clientIp;
      if (req.headers["x-forwarded-for"]) {
        clientIp = (req.headers["x-forwarded-for"] || "").split(",")[0];
      } else if (req.connection && req.connection.remoteAddress) {
        clientIp = req.connection.remoteAddress;
      } else if (req.socket && req.socket.remoteAddress) {
        clientIp = req.socket.remoteAddress;
      } else if (req.connection && req.connection.socket && req.connection.socket.remoteAddress) {
        clientIp = req.connection.socket.remoteAddress;
      }
      return clientIp;
    };
    IncomingRequestData.prototype.close = function close(res) {
      this.response = getHttpResponseData(res);
    };
    module2.exports = IncomingRequestData;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/local_reservoir.js
var require_local_reservoir = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/local_reservoir.js"(exports2, module2) {
    "use strict";
    function LocalReservoir(fixedTarget, fallbackRate) {
      this.init(fixedTarget, fallbackRate);
    }
    LocalReservoir.prototype.init = function init(fixedTarget, fallbackRate) {
      this.usedThisSecond = 0;
      if (typeof fixedTarget === "number" && fixedTarget % 1 === 0 && fixedTarget >= 0) {
        this.fixedTarget = fixedTarget;
      } else {
        throw new Error('Error in sampling file. Rule attribute "fixed_target" must be a non-negative integer.');
      }
      if (typeof fallbackRate === "number" && fallbackRate >= 0 && fallbackRate <= 1) {
        this.fallbackRate = fallbackRate;
      } else {
        throw new Error('Error in sampling file. Rule attribute "rate" must be a number between 0 and 1 inclusive.');
      }
    };
    LocalReservoir.prototype.isSampled = function isSampled() {
      var now = Math.round((/* @__PURE__ */ new Date()).getTime() / 1e3);
      if (now !== this.thisSecond) {
        this.usedThisSecond = 0;
        this.thisSecond = now;
      }
      if (this.usedThisSecond >= this.fixedTarget) {
        return Math.random() < this.fallbackRate;
      }
      this.usedThisSecond++;
      return true;
    };
    module2.exports = LocalReservoir;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/resources/default_sampling_rules.json
var require_default_sampling_rules = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/resources/default_sampling_rules.json"(exports2, module2) {
    module2.exports = {
      default: {
        fixed_target: 1,
        rate: 0.05
      },
      version: 2
    };
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/local_sampler.js
var require_local_sampler = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/local_sampler.js"(exports2, module2) {
    "use strict";
    var fs = require("fs");
    var LocalReservoir = require_local_reservoir();
    var Utils = require_utils();
    var defaultRules = require_default_sampling_rules();
    var logger2 = require_logger();
    var LocalSampler = {
      /**
       * Makes a sample decision based on the sample request.
       * @param {object} sampleRequest - Contains information for rules matching.
       * @module LocalSampler
       * @function shouldSample
       */
      shouldSample: function shouldSample(sampleRequest) {
        var host = sampleRequest.host;
        var httpMethod = sampleRequest.httpMethod;
        var urlPath = sampleRequest.urlPath;
        var formatted = "{ http_method: " + httpMethod + ", host: " + host + ", url_path: " + urlPath + " }";
        var matched;
        this.rules.some(function(rule) {
          if (rule.default || (host == null || Utils.wildcardMatch(rule.host, host) && (httpMethod == null || Utils.wildcardMatch(rule.http_method, httpMethod)) && (urlPath == null || Utils.wildcardMatch(rule.url_path, urlPath)))) {
            matched = rule.reservoir;
            logger2.getLogger().debug("Local sampling rule match found for " + formatted + ". Matched " + (rule.default ? "default" : "{ http_method: " + rule.http_method + ", host: " + rule.host + ", url_path: " + rule.url_path + " }") + ". Using fixed_target: " + matched.fixedTarget + " and rate: " + matched.fallbackRate + ".");
            return true;
          }
        });
        if (matched) {
          return matched.isSampled();
        } else {
          logger2.getLogger().debug("No sampling rule matched for " + formatted);
          return false;
        }
      },
      /**
       * Set local rules for making sampling decisions.
       * @module LocalSampler
       * @function setLocalRules
       */
      setLocalRules: function setLocalRules(source) {
        if (source) {
          if (typeof source === "string") {
            logger2.getLogger().info("Using custom sampling rules file: " + source);
            this.rules = loadRulesConfig(JSON.parse(fs.readFileSync(source, "utf8")));
          } else {
            logger2.getLogger().info("Using custom sampling rules source.");
            this.rules = loadRulesConfig(source);
          }
        } else {
          this.rules = parseRulesConfig(defaultRules);
        }
      }
    };
    var loadRulesConfig = function loadRulesConfig2(config) {
      if (!config.version) {
        throw new Error('Error in sampling file. Missing "version" attribute.');
      }
      if (config.version === 1 || config.version === 2) {
        return parseRulesConfig(config);
      } else {
        throw new Error('Error in sampling file. Unknown version "' + config.version + '".');
      }
    };
    var parseRulesConfig = function parseRulesConfig2(config) {
      var defaultRule;
      var rules = [];
      if (config.default) {
        var missing = [];
        for (var key in config.default) {
          if (key !== "fixed_target" && key !== "rate") {
            throw new Error("Error in sampling file. Invalid attribute for default: " + key + '. Valid attributes for default are "fixed_target" and "rate".');
          } else if (typeof config.default[key] !== "number") {
            throw new Error("Error in sampling file. Default " + key + " must be a number.");
          }
        }
        if (typeof config.default.fixed_target === "undefined") {
          missing.push("fixed_target");
        }
        if (typeof config.default.rate === "undefined") {
          missing.push("rate");
        }
        if (missing.length !== 0) {
          throw new Error("Error in sampling file. Missing required attributes for default: " + missing + ".");
        }
        defaultRule = { default: true, reservoir: new LocalReservoir(config.default.fixed_target, config.default.rate) };
      } else {
        throw new Error('Error in sampling file. Expecting "default" object to be defined with attributes "fixed_target" and "rate".');
      }
      if (Array.isArray(config.rules)) {
        config.rules.forEach(function(rawRule) {
          var params = {};
          var required;
          if (config.version === 2) {
            required = { host: 1, http_method: 1, url_path: 1, fixed_target: 1, rate: 1 };
          }
          if (config.version === 1) {
            required = { service_name: 1, http_method: 1, url_path: 1, fixed_target: 1, rate: 1 };
          }
          for (var key2 in rawRule) {
            var value = rawRule[key2];
            if (!required[key2] && key2 != "description") {
              throw new Error("Error in sampling file. Rule " + JSON.stringify(rawRule) + " has invalid attribute: " + key2 + ".");
            } else if (key2 != "description" && !value && value !== 0) {
              throw new Error("Error in sampling file. Rule " + JSON.stringify(rawRule) + ' attribute "' + key2 + '" has invalid value: ' + value + ".");
            } else {
              if (config.version === 2) {
                params[key2] = value;
              }
              if (config.version === 1 && key2 === "service_name") {
                params["host"] = value;
              } else {
                params[key2] = value;
              }
              delete required[key2];
            }
          }
          if (Object.keys(required).length !== 0 && required.constructor === Object) {
            throw new Error("Error in sampling file. Rule " + JSON.stringify(rawRule) + " is missing required attributes: " + Object.keys(required) + ".");
          }
          var rule = params;
          rule.reservoir = new LocalReservoir(rawRule.fixed_target, rawRule.rate);
          rules.push(rule);
        });
      }
      rules.push(defaultRule);
      return rules;
    };
    LocalSampler.setLocalRules();
    module2.exports = LocalSampler;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/reservoir.js
var require_reservoir = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/reservoir.js"(exports2, module2) {
    "use strict";
    function Reservoir() {
      this.init();
    }
    Reservoir.prototype.init = function init() {
      this.quota = null;
      this.TTL = null;
      this.takenThisSec = 0;
      this.borrowedThisSec = 0;
      this.reportInterval = 1;
      this.reportElapsed = 0;
    };
    Reservoir.prototype.borrowOrTake = function borrowOrTake(now, canBorrow) {
      this.adjustThisSec(now);
      if (this.quota >= 0 && this.TTL >= now) {
        if (this.takenThisSec >= this.quota) {
          return false;
        }
        this.takenThisSec++;
        return "take";
      }
      if (canBorrow) {
        if (this.borrowedThisSec >= 1) {
          return false;
        }
        this.borrowedThisSec++;
        return "borrow";
      }
    };
    Reservoir.prototype.adjustThisSec = function adjustThisSec(now) {
      if (now !== this.thisSec) {
        this.takenThisSec = 0;
        this.borrowedThisSec = 0;
        this.thisSec = now;
      }
    };
    Reservoir.prototype.loadNewQuota = function loadNewQuota(quota, TTL, interval) {
      if (quota) {
        this.quota = quota;
      }
      if (TTL) {
        this.TTL = TTL;
      }
      if (interval) {
        this.reportInterval = interval / 10;
      }
    };
    Reservoir.prototype.timeToReport = function timeToReport() {
      if (this.reportElapsed + 1 >= this.reportInterval) {
        this.reportElapsed = 0;
        return true;
      } else {
        this.reportElapsed += 1;
        return false;
      }
    };
    module2.exports = Reservoir;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/sampling_rule.js
var require_sampling_rule = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/sampling_rule.js"(exports2, module2) {
    "use strict";
    var Utils = require_utils();
    var Reservoir = require_reservoir();
    function SamplingRule(name, priority, rate, reservoirSize, host, httpMethod, urlPath, serviceName, serviceType) {
      this.init(name, priority, rate, reservoirSize, host, httpMethod, urlPath, serviceName, serviceType);
    }
    SamplingRule.prototype.init = function init(name, priority, rate, reservoirSize, host, httpMethod, urlPath, serviceName, serviceType) {
      this.name = name;
      this.priority = priority;
      this.rate = rate;
      this.host = host;
      this.httpMethod = httpMethod;
      this.urlPath = urlPath;
      this.serviceName = serviceName;
      this.serviceType = serviceType;
      this.reservoir = new Reservoir();
      this.borrow = !!reservoirSize;
      this.resetStatistics();
    };
    SamplingRule.prototype.match = function match(sampleRequest) {
      var host = sampleRequest.host;
      var httpMethod = sampleRequest.httpMethod;
      var serviceName = sampleRequest.serviceName;
      var urlPath = sampleRequest.urlPath;
      var serviceType = sampleRequest.serviceType;
      return this.isDefault() || (!host || Utils.wildcardMatch(this.host, host)) && (!httpMethod || Utils.wildcardMatch(this.httpMethod, httpMethod)) && (!serviceName || Utils.wildcardMatch(this.serviceName, serviceName)) && (!urlPath || Utils.wildcardMatch(this.urlPath, urlPath)) && (!serviceType || Utils.wildcardMatch(this.serviceType, serviceType));
    };
    SamplingRule.prototype.snapshotStatistics = function snapshotStatistics() {
      var statistics = {
        requestCount: this.requestCount,
        borrowCount: this.borrowCount,
        sampledCount: this.sampledCount
      };
      this.resetStatistics();
      return statistics;
    };
    SamplingRule.prototype.merge = function merge(rule) {
      this.reservoir = rule.reservoir;
      this.requestCount = rule.requestCount;
      this.borrowCount = rule.borrowCount;
      this.sampledCount = rule.sampledCount;
      rule = null;
    };
    SamplingRule.prototype.isDefault = function isDefault() {
      return this.name === "Default";
    };
    SamplingRule.prototype.incrementRequestCount = function incrementRequestCount() {
      this.requestCount++;
    };
    SamplingRule.prototype.incrementBorrowCount = function incrementBorrowCount() {
      this.borrowCount++;
    };
    SamplingRule.prototype.incrementSampledCount = function incrementSampledCount() {
      this.sampledCount++;
    };
    SamplingRule.prototype.setRate = function setRate(rate) {
      this.rate = rate;
    };
    SamplingRule.prototype.getRate = function getRate() {
      return this.rate;
    };
    SamplingRule.prototype.getName = function getName() {
      return this.name;
    };
    SamplingRule.prototype.getPriority = function getPriority() {
      return this.priority;
    };
    SamplingRule.prototype.getReservoir = function getReservoir() {
      return this.reservoir;
    };
    SamplingRule.prototype.resetStatistics = function resetStatistics() {
      this.requestCount = 0;
      this.borrowCount = 0;
      this.sampledCount = 0;
    };
    SamplingRule.prototype.canBorrow = function canBorrow() {
      return this.borrow;
    };
    SamplingRule.prototype.everMatched = function everMatched() {
      return this.requestCount > 0;
    };
    SamplingRule.prototype.timeToReport = function timeToReport() {
      return this.reservoir.timeToReport();
    };
    module2.exports = SamplingRule;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/service_connector.js
var require_service_connector = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/service_connector.js"(exports2, module2) {
    "use strict";
    var crypto = require("crypto");
    var logger2 = require_logger();
    var SamplingRule = require_sampling_rule();
    var DaemonConfig = require_daemon_config();
    var util = require("util");
    var http2 = require("http");
    var ServiceConnector = {
      // client_id is a 12 byte cryptographically secure random hex
      // identifying the SDK instance and is generated during SDK initialization/
      // This is required when reporting sampling to X-Ray back-end.
      clientId: crypto.randomBytes(12).toString("hex"),
      samplingRulesPath: "/GetSamplingRules",
      samplingTargetsPath: "/SamplingTargets",
      logger: logger2,
      httpClient: http2,
      fetchSamplingRules: function fetchSamplingRules(callback) {
        const body = "{}";
        const options = getOptions(this.samplingRulesPath, body.length);
        const httpReq = this.httpClient.__request ? this.httpClient.__request : this.httpClient.request;
        const req = httpReq(options, (res) => {
          var data = "";
          res.on("data", (d) => {
            data += d;
          });
          res.on("error", (error) => {
            callback(error);
          });
          res.on("end", () => {
            var dataObj;
            try {
              dataObj = JSON.parse(data);
            } catch (err) {
              callback(err);
              return;
            }
            if (!dataObj) {
              callback(new Error("AWS X-Ray GetSamplingRules API returned empty response"));
              return;
            }
            var newRules = assembleRules(dataObj);
            callback(null, newRules);
          });
        });
        req.on("error", () => {
          callback(new Error(`Failed to connect to X-Ray daemon at ${options.hostname}:${options.port} to get sampling rules.`));
        });
        req.write(body);
        req.end();
      },
      fetchTargets: function fetchTargets(rules, callback) {
        const body = JSON.stringify(constructStatisticsDocs(rules));
        const options = getOptions(this.samplingTargetsPath, body.length);
        const httpReq = this.httpClient.__request ? this.httpClient.__request : this.httpClient.request;
        const req = httpReq(options, (res) => {
          var data = "";
          res.on("data", (d) => {
            data += d;
          });
          res.on("error", (error) => {
            callback(error);
          });
          res.on("end", () => {
            var dataObj;
            try {
              dataObj = JSON.parse(data);
            } catch (err) {
              callback(err);
              return;
            }
            if (!dataObj || typeof dataObj["LastRuleModification"] != "number") {
              callback(new Error("AWS X-Ray SamplingTargets API returned invalid response"));
              return;
            }
            var targetsMapping = assembleTargets(dataObj);
            var ruleFreshness = dateToEpoch(dataObj["LastRuleModification"]);
            callback(null, targetsMapping, ruleFreshness);
          });
        });
        req.on("error", () => {
          callback(new Error(`Failed to connect to X-Ray daemon at ${options.hostname}:${options.port} to get sampling targets.`));
        });
        req.write(body);
        req.end();
      }
    };
    var constructStatisticsDocs = function constructStatisticsDocs2(rules) {
      var documents = [];
      var now = Math.floor((/* @__PURE__ */ new Date()).getTime() / 1e3);
      rules.forEach(function(rule) {
        var statistics = rule.snapshotStatistics();
        var doc = {
          "RuleName": rule.getName(),
          "ClientID": ServiceConnector.clientId,
          "RequestCount": statistics.requestCount,
          "BorrowCount": statistics.borrowCount,
          "SampledCount": statistics.sampledCount,
          "Timestamp": now
        };
        documents.push(doc);
      });
      return { SamplingStatisticsDocuments: documents };
    };
    var assembleRules = function assembleRules2(data) {
      var newRules = [];
      var ruleList = data["SamplingRuleRecords"] || [];
      ruleList.forEach(function(ruleRecord) {
        ruleRecord = ruleRecord["SamplingRule"];
        if (isRuleValid(ruleRecord)) {
          var newRule = new SamplingRule(ruleRecord["RuleName"], ruleRecord["Priority"], ruleRecord["FixedRate"], ruleRecord["ReservoirSize"], ruleRecord["Host"], ruleRecord["HTTPMethod"], ruleRecord["URLPath"], ruleRecord["ServiceName"], ruleRecord["ServiceType"]);
          newRules.push(newRule);
        }
      });
      return newRules;
    };
    var assembleTargets = function assembleTargets2(data) {
      var docs = data["SamplingTargetDocuments"] || [];
      var targetsMapping = {};
      docs.forEach(function(doc) {
        var newTarget = {
          rate: doc["FixedRate"],
          quota: doc["ReservoirQuota"],
          TTL: dateToEpoch(doc["ReservoirQuotaTTL"]),
          interval: doc["Interval"]
        };
        targetsMapping[doc["RuleName"]] = newTarget;
      });
      return targetsMapping;
    };
    var isRuleValid = function isRuleValid2(record) {
      return record["Version"] === 1 && record["ResourceARN"] === "*" && record["Attributes"] && Object.keys(record["Attributes"]).length === 0 && record["ServiceType"] && record["RuleName"] && record["Priority"] && typeof record["FixedRate"] == "number";
    };
    var dateToEpoch = function dateToEpoch2(date) {
      return new Date(date).getTime() / 1e3;
    };
    var getOptions = function getOptions2(path, contentLength) {
      const options = {
        hostname: DaemonConfig.tcp_ip,
        port: DaemonConfig.tcp_port,
        method: "POST",
        path,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": contentLength,
          "Host": util.format("%s:%d", DaemonConfig.tcp_ip, DaemonConfig.tcp_port)
        }
      };
      return options;
    };
    module2.exports = ServiceConnector;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/rule_cache.js
var require_rule_cache = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/rule_cache.js"(exports2, module2) {
    "use strict";
    var TTL = 60 * 60;
    var RuleCache = {
      rules: [],
      lastUpdated: null,
      /**
       * Tries to find a valid rule that matches the sample request.
       * @param {object} sampleRequest - Contains information for rules matching.
       * @param {number} now - Current epoch in seconds.
       * @module RuleCache
       * @function getMatchedRule
       */
      getMatchedRule: function getMatchedRule(sampleRequest, now) {
        if (isExpired(now)) {
          return null;
        }
        var matchedRule;
        this.rules.forEach(function(rule) {
          if (!matchedRule && rule.match(sampleRequest)) {
            matchedRule = rule;
          }
          if (rule.isDefault() && !matchedRule) {
            matchedRule = rule;
          }
        });
        return matchedRule;
      },
      /**
       * Load rules fetched from X-Ray service in order sorted by priorities.
       * @param {object} rules - Newly fetched rules to load.
       * @module RuleCache
       * @function loadRules
       */
      loadRules: function loadRules(rules) {
        var oldRules = {};
        this.rules.forEach(function(rule) {
          oldRules[rule.getName()] = rule;
        });
        this.rules = rules;
        this.rules.forEach(function(rule) {
          var oldRule = oldRules[rule.getName()];
          if (oldRule) {
            rule.merge(oldRule);
          }
        });
        this.rules.sort(function(a, b) {
          var v = a.getPriority() - b.getPriority();
          if (v !== 0) {
            return v;
          }
          if (a.getName() > b.getName()) {
            return 1;
          } else {
            return -1;
          }
        });
      },
      /**
       * Load targets fetched from X-Ray service.
       * @param {object} targetsMapping - Newly fetched targets map with rule name as key.
       * @module RuleCache
       * @function loadTargets
       */
      loadTargets: function loadTargets(targetsMapping) {
        this.rules.forEach(function(rule) {
          var target = targetsMapping[rule.getName()];
          if (target) {
            rule.getReservoir().loadNewQuota(target.quota, target.TTL, target.interval);
            rule.setRate(target.rate);
          }
        });
      },
      getRules: function getRules() {
        return this.rules;
      },
      timestamp: function timestamp(now) {
        this.lastUpdated = now;
      },
      getLastUpdated: function getLastUpdated() {
        return this.lastUpdated;
      }
    };
    var isExpired = function isExpired2(now) {
      if (!RuleCache.getLastUpdated()) {
        return true;
      }
      return now > RuleCache.getLastUpdated() + TTL;
    };
    module2.exports = RuleCache;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/rule_poller.js
var require_rule_poller = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/rule_poller.js"(exports2, module2) {
    "use strict";
    var logger2 = require_logger();
    var ServiceConnector = require_service_connector();
    var ruleCache = require_rule_cache();
    var DEFAULT_INTERVAL = 5 * 60 * 1e3;
    var RulePoller = {
      start: function start() {
        if (this.poller) {
          clearInterval(this.poller);
        }
        refresh(false);
        this.poller = setInterval(refresh, DEFAULT_INTERVAL);
        this.poller.unref();
      }
    };
    var refresh = function refresh2(jitter) {
      jitter = typeof jitter === "undefined" ? true : jitter;
      if (jitter) {
        var delay = getJitter();
        setTimeout(refreshWithFirewall, delay);
      } else {
        refreshWithFirewall();
      }
    };
    var refreshWithFirewall = function refreshWithFirewall2() {
      try {
        refreshCache();
      } catch (e) {
        logger2.getLogger().warn("Encountered unexpected exception when fetching sampling rules: " + e);
      }
    };
    var refreshCache = function refreshCache2() {
      var now = Math.floor((/* @__PURE__ */ new Date()).getTime() / 1e3);
      ServiceConnector.fetchSamplingRules(function(err, newRules) {
        if (err) {
          logger2.getLogger().warn("Failed to retrieve sampling rules from X-Ray service:", err);
        } else if (newRules.length !== 0) {
          ruleCache.loadRules(newRules);
          ruleCache.timestamp(now);
          logger2.getLogger().info("Successfully refreshed centralized sampling rule cache.");
        }
      });
    };
    var getJitter = function getJitter2() {
      return Math.random() * 5;
    };
    module2.exports = RulePoller;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/target_poller.js
var require_target_poller = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/target_poller.js"(exports2, module2) {
    "use strict";
    var rulePoller = require_rule_poller();
    var serviceConnector = require_service_connector();
    var ruleCache = require_rule_cache();
    var logger2 = require_logger();
    var DEFAULT_INTERVAL = 10 * 1e3;
    var TargetPoller = {
      interval: DEFAULT_INTERVAL,
      start: function start() {
        this.poller = setInterval(refreshWithFirewall, DEFAULT_INTERVAL + getJitter());
        this.poller.unref();
      }
    };
    var refreshWithFirewall = function refreshWithFirewall2() {
      try {
        refresh();
      } catch (e) {
        logger2.getLogger().warn("Encountered unexpected exception when fetching sampling targets: " + e);
      }
    };
    var refresh = function refresh2() {
      var candidates = getCandidates();
      if (candidates && candidates.length > 0) {
        serviceConnector.fetchTargets(candidates, function(err, targetsMapping, ruleFreshness) {
          if (err) {
            logger2.getLogger().warn("Failed to retrieve sampling targets from X-Ray service:", err);
            return;
          }
          ruleCache.loadTargets(targetsMapping);
          if (ruleFreshness > ruleCache.getLastUpdated()) {
            logger2.getLogger().info("Performing out-of-band sampling rule polling to fetch updated rules.");
            rulePoller.start();
          }
          logger2.getLogger().info("Successfully reported rule statistics to get new sampling quota.");
        });
      }
    };
    var getCandidates = function getCandidates2() {
      var rules = ruleCache.getRules();
      var candidates = [];
      rules.forEach(function(rule) {
        if (rule.everMatched() && rule.timeToReport()) {
          candidates.push(rule);
        }
      });
      return candidates;
    };
    var getJitter = function getJitter2() {
      return Math.random() / TargetPoller.interval;
    };
    module2.exports = TargetPoller;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/default_sampler.js
var require_default_sampler = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/middleware/sampling/default_sampler.js"(exports2, module2) {
    "use strict";
    var logger2 = require_logger();
    var util = require("util");
    var SegmentUtils = require_segment_utils();
    var DefaultSampler = {
      localSampler: require_local_sampler(),
      rulePoller: require_rule_poller(),
      targetPoller: require_target_poller(),
      ruleCache: require_rule_cache(),
      started: false,
      /**
       * Makes a sample decision based on the sample request.
       * @param {object} sampleRequest - Contains information for rules matching.
       * @module DefaultSampler
       * @function shouldSample
       */
      shouldSample: function shouldSample(sampleRequest) {
        try {
          if (!this.started) {
            this.start();
          }
          if (!sampleRequest.serviceType) {
            sampleRequest.serviceType = SegmentUtils.origin;
          }
          var now = Math.floor((/* @__PURE__ */ new Date()).getTime() / 1e3);
          var matchedRule = this.ruleCache.getMatchedRule(sampleRequest, now);
          if (matchedRule) {
            logger2.getLogger().debug(util.format("Rule %s is matched.", matchedRule.getName()));
            return processMatchedRule(matchedRule, now);
          } else {
            logger2.getLogger().info("No effective centralized sampling rule match. Fallback to local rules.");
            return this.localSampler.shouldSample(sampleRequest);
          }
        } catch (err) {
          logger2.getLogger().error("Unhandled exception by the SDK during making sampling decisions: " + err);
        }
      },
      /**
       * Set local rules in case there is a need to fallback.
       * @module DefaultSampler
       * @function setLocalRules
       */
      setLocalRules: function setLocalRules(source) {
        this.localSampler.setLocalRules(source);
      },
      /**
       * Start the pollers to poll sampling rules and targets from X-Ray service.
       * @module DefaultSampler
       * @function start
       */
      start: function start() {
        if (!this.started) {
          this.rulePoller.start();
          this.targetPoller.start();
          this.started = true;
        }
      }
    };
    var processMatchedRule = function processMatchedRule2(rule, now) {
      rule.incrementRequestCount();
      var reservoir = rule.getReservoir();
      var sample = true;
      var decision = reservoir.borrowOrTake(now, rule.canBorrow());
      if (decision === "borrow") {
        rule.incrementBorrowCount();
      } else if (decision === "take") {
        rule.incrementSampledCount();
      } else if (Math.random() <= rule.getRate()) {
        rule.incrementSampledCount();
      } else {
        sample = false;
      }
      if (sample) {
        return rule.getName();
      } else {
        return false;
      }
    };
    module2.exports = DefaultSampler;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/middleware/mw_utils.js
var require_mw_utils = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/middleware/mw_utils.js"(exports2, module2) {
    "use strict";
    var Segment = require_segment();
    var IncomingRequestData = require_incoming_request_data();
    var logger2 = require_logger();
    var coreUtils = require_utils();
    var wildcardMatch = require_utils().wildcardMatch;
    var processTraceData = require_utils().processTraceData;
    var XRAY_HEADER = "x-amzn-trace-id";
    var overrideFlag = !!process.env.AWS_XRAY_TRACING_NAME;
    var utils = {
      defaultName: process.env.AWS_XRAY_TRACING_NAME,
      dynamicNaming: false,
      hostPattern: null,
      sampler: require_default_sampler(),
      /**
       * Enables dynamic naming for segments via the middleware. Use 'AWSXRay.middleware.enableDynamicNaming()'.
       * @param {string} [hostPattern] - The pattern to match the host header. See the README on dynamic and fixed naming modes.
       * @alias module:mw_utils.enableDynamicNaming
       */
      enableDynamicNaming: function(hostPattern) {
        this.dynamicNaming = true;
        if (hostPattern && typeof hostPattern !== "string") {
          throw new Error("Host pattern must be a string.");
        }
        this.hostPattern = hostPattern || null;
      },
      /**
       * Splits out the 'x-amzn-trace-id' header params from the incoming request.  Used by the middleware.
       * @param {http.IncomingMessage|https.IncomingMessage} req - The request object from the incoming call.
       * @returns {object}
       * @alias module:mw_utils.processHeaders
       */
      processHeaders: function processHeaders(req) {
        var amznTraceHeader = {};
        if (req && req.headers && req.headers[XRAY_HEADER]) {
          amznTraceHeader = processTraceData(req.headers[XRAY_HEADER]);
        }
        return amznTraceHeader;
      },
      /**
       * Resolves the name of the segment as determined by fixed or dynamic mode options. Used by the middleware.
       * @param {string} hostHeader - The string from the request.headers.host property.
       * @returns {string}
       * @alias module:mw_utils.resolveName
       */
      resolveName: function resolveName(hostHeader) {
        var name;
        if (this.dynamicNaming && hostHeader) {
          name = this.hostPattern ? wildcardMatch(this.hostPattern, hostHeader) ? hostHeader : this.defaultName : hostHeader;
        } else {
          name = this.defaultName;
        }
        return name;
      },
      /**
       * Resolves the sampling decision as determined by the values given and options set. Used by the middleware.
       * @param {object} amznTraceHeader - The object as returned by the processHeaders function.
       * @param {Segment} segment - The string from the request.headers.host property.
       * @param {http.ServerResponse|https.ServerResponse} res - The response object from the incoming call.
       * @returns {boolean}
       * @alias module:mw_utils.resolveSampling
       */
      resolveSampling: function resolveSampling(amznTraceHeader, segment, res) {
        var isSampled;
        if (amznTraceHeader.sampled === "1") {
          isSampled = true;
        } else if (amznTraceHeader.sampled === "0") {
          isSampled = false;
        } else {
          var sampleRequest = {
            host: res.req.headers.host,
            httpMethod: res.req.method,
            urlPath: res.req.url,
            serviceName: segment.name
          };
          isSampled = this.sampler.shouldSample(sampleRequest);
          if (isSampled instanceof String || typeof isSampled === "string") {
            segment.setMatchedSamplingRule(isSampled);
            isSampled = true;
          }
        }
        if (amznTraceHeader.sampled === "?" && res.header) {
          res.header(XRAY_HEADER, "Root=" + amznTraceHeader.root + ";Sampled=" + (isSampled ? "1" : "0"));
        }
        if (!isSampled) {
          segment.notTraced = true;
        }
      },
      /**
       * Sets the default name of created segments. Used with the middleware.
       * Can be overridden by the AWS_XRAY_TRACING_NAME environment variable.
       * @param {string} name - The default name for segments created in the middleware.
       * @alias module:mw_utils.setDefaultName
       */
      setDefaultName: function setDefaultName(name) {
        if (!overrideFlag) {
          this.defaultName = name;
        }
      },
      disableCentralizedSampling: function disableCentralizedSampling() {
        this.sampler = require_local_sampler();
      },
      /**
       * Overrides the default sampling rules file to specify at what rate to sample at for specific routes.
       * The base sampling rules file can be found at /lib/resources/default_sampling_rules.json
       * @param {string|Object} source - The path to the custom sampling rules file, or the source JSON object.
       * @memberof AWSXRay
       */
      setSamplingRules: function setSamplingRules(source) {
        if (!source || source instanceof String || !(typeof source === "string" || source instanceof Object)) {
          throw new Error("Please specify a path to the local sampling rules file, or supply an object containing the rules.");
        }
        this.sampler.setLocalRules(source);
      },
      /**
       * Logs a debug message including core request and segment information
       * @param {string} message - The message to be logged
       * @param {string} url - The request url being traced
       * @param {Segment} - The current segment
       */
      middlewareLog: function middlewareLog(message, url, segment) {
        logger2.getLogger().debug(message + ": { url: " + url + ", name: " + segment.name + ", trace_id: " + segment.trace_id + ", id: " + segment.id + ", sampled: " + !segment.notTraced + " }");
      },
      /**
       * Traces the request/response cycle of an http.IncomingMessage / http.ServerResponse pair.
       * Resolves sampling rules, creates a segment, adds the core request / response data adding
       * throttling / error / fault flags based on the response status code.
       * @param {http.IncomingMessage} req - The incoming request.
       * @param {http.ServerResponse} res - The server response.
       * @returns {Segment}
       * @memberof AWSXRay
       */
      traceRequestResponseCycle: function traceRequestResponseCycle(req, res) {
        var amznTraceHeader = this.processHeaders(req);
        var name = this.resolveName(req.headers.host);
        var segment = new Segment(name, amznTraceHeader.root, amznTraceHeader.parent);
        if (!res.req) {
          res.req = req;
        }
        this.resolveSampling(amznTraceHeader, segment, res);
        segment.addIncomingRequestData(new IncomingRequestData(req));
        this.middlewareLog("Starting middleware segment", req.url, segment);
        var middlewareLog = this.middlewareLog;
        var didEnd = false;
        var endSegment = function() {
          if (didEnd) {
            return;
          }
          didEnd = true;
          if (res.statusCode === 429) {
            segment.addThrottleFlag();
          }
          const cause = coreUtils.getCauseTypeFromHttpStatus(res.statusCode);
          if (cause) {
            segment[cause] = true;
          }
          segment.http.close(res);
          segment.close();
          middlewareLog("Closed middleware segment successfully", req.url, segment);
        };
        res.on("finish", endSegment);
        res.on("close", endSegment);
        return segment;
      }
    };
    module2.exports = utils;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/env/aws_lambda.js
var require_aws_lambda = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/env/aws_lambda.js"(exports2, module2) {
    "use strict";
    var contextUtils = require_context_utils();
    var mwUtils = require_mw_utils();
    var LambdaUtils = require_utils().LambdaUtils;
    var Segment = require_segment();
    var SegmentEmitter = require_segment_emitter();
    var SegmentUtils = require_segment_utils();
    var logger2 = require_logger();
    var TraceID = require_trace_id();
    var xAmznTraceIdPrev = null;
    module2.exports.init = function init() {
      contextUtils.enableManualMode = function() {
        logger2.getLogger().warn("AWS Lambda does not support AWS X-Ray manual mode.");
      };
      SegmentEmitter.disableReusableSocket();
      SegmentUtils.setStreamingThreshold(0);
      logger2.getLogger().info("Disabling centralized sampling in Lambda environment.");
      mwUtils.disableCentralizedSampling();
      var namespace = contextUtils.getNamespace();
      namespace.enter(namespace.createContext());
      contextUtils.setSegment(facadeSegment());
    };
    var facadeSegment = function facadeSegment2() {
      var segment = new Segment("facade");
      var whitelistFcn = ["addNewSubsegment", "addSubsegment", "removeSubsegment", "toString", "addSubsegmentWithoutSampling", "addNewSubsegmentWithoutSampling"];
      var silentFcn = ["incrementCounter", "decrementCounter", "isClosed", "close", "format", "flush"];
      var xAmznTraceId = process.env._X_AMZN_TRACE_ID;
      for (var key in segment) {
        if (typeof segment[key] === "function" && whitelistFcn.indexOf(key) === -1) {
          if (silentFcn.indexOf(key) === -1) {
            segment[key] = /* @__PURE__ */ (function() {
              var func = key;
              return function facade() {
                logger2.getLogger().warn('Function "' + func + '" cannot be called on an AWS Lambda segment. Please use a subsegment to record data.');
                return;
              };
            })();
          } else {
            segment[key] = function facade() {
              return;
            };
          }
        }
      }
      segment.trace_id = TraceID.Invalid().toString();
      segment.isClosed = function() {
        return true;
      };
      segment.in_progress = false;
      segment.counter = 1;
      segment.notTraced = true;
      segment.facade = true;
      segment.reset = function reset() {
        this.trace_id = TraceID.Invalid().toString();
        this.id = "00000000";
        delete this.subsegments;
        this.notTraced = true;
      };
      segment.resolveLambdaTraceData = function resolveLambdaTraceData() {
        var _a;
        const invokeStore = (_a = globalThis.awslambda) === null || _a === void 0 ? void 0 : _a.InvokeStore;
        const traceIdFromInvokeStore = invokeStore === null || invokeStore === void 0 ? void 0 : invokeStore.getXRayTraceId();
        const traceIdFromEnv = process.env._X_AMZN_TRACE_ID;
        var xAmznLambda = traceIdFromInvokeStore !== null && traceIdFromInvokeStore !== void 0 ? traceIdFromInvokeStore : traceIdFromEnv;
        if (xAmznLambda) {
          if (xAmznLambda != xAmznTraceIdPrev) {
            this.reset();
            if (LambdaUtils.populateTraceData(segment, xAmznLambda)) {
              xAmznTraceIdPrev = xAmznLambda;
            }
          }
        } else {
          this.reset();
          contextUtils.contextMissingStrategy.contextMissing("Missing AWS Lambda trace data for X-Ray. Ensure Active Tracing is enabled and no subsegments are created outside the function handler.");
        }
      };
      if (LambdaUtils.validTraceData(xAmznTraceId)) {
        if (LambdaUtils.populateTraceData(segment, xAmznTraceId)) {
          xAmznTraceIdPrev = xAmznTraceId;
        }
      }
      return segment;
    };
  }
});

// node_modules/aws-xray-sdk-core/package.json
var require_package = __commonJS({
  "node_modules/aws-xray-sdk-core/package.json"(exports2, module2) {
    module2.exports = {
      name: "aws-xray-sdk-core",
      version: "3.12.0",
      description: "AWS X-Ray SDK for Javascript",
      author: "Amazon Web Services",
      contributors: [
        "Sandra McMullen <mcmuls@amazon.com>",
        "William Armiros <armiros@amazon.com>",
        "Moritz Onken <onken@netcubed.de>"
      ],
      files: [
        "dist/lib/**/*",
        "LICENSE",
        "README.md"
      ],
      main: "dist/lib/index.js",
      types: "dist/lib/index.d.ts",
      engines: {
        node: ">= 14.x"
      },
      directories: {
        test: "test"
      },
      "//": "@types/cls-hooked is exposed in API so must be in dependencies, not devDependencies",
      dependencies: {
        "@aws-sdk/types": "^3.4.1",
        "@smithy/service-error-classification": "^2.0.4",
        "@types/cls-hooked": "^4.3.3",
        "atomic-batcher": "^1.0.2",
        "cls-hooked": "^4.2.2",
        semver: "^7.5.3"
      },
      devDependencies: {
        "@aws/lambda-invoke-store": "^0.2.0"
      },
      scripts: {
        prepare: "npm run compile",
        compile: "tsc && npm run copy-lib && npm run copy-test",
        "copy-lib": "find lib -type f \\( -name '*.d.ts' -o -name '*.json' \\) | xargs -I % ../../scripts/cp-with-structure.sh % dist",
        "copy-test": "find test -name '*.json' | xargs -I % ../../scripts/cp-with-structure.sh % dist",
        lint: "eslint .",
        "lint:fix": "eslint . --fix",
        test: "npm run compile && mocha --recursive ./dist/test/ -R spec && tsd && mocha --recursive ./dist/test_async/ -R spec",
        "test-d": "tsd",
        "test-async": "npm run compile && mocha --recursive ./dist/test_async/ -R spec",
        clean: "rm -rf dist && rm -rf node_modules",
        testcov: "nyc npm run test",
        reportcov: "nyc report --reporter=text-lcov > coverage.lcov"
      },
      keywords: [
        "amazon",
        "api",
        "aws",
        "core",
        "xray",
        "x-ray",
        "x ray"
      ],
      license: "Apache-2.0",
      repository: "https://github.com/aws/aws-xray-sdk-node/tree/master/packages/core",
      gitHead: "51831b9577e061cea36644a7e19f9cf0cc28fc8a"
    };
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/segments/plugins/plugin.js
var require_plugin = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/segments/plugins/plugin.js"(exports2, module2) {
    "use strict";
    var http2 = require("http");
    var Plugin = {
      METADATA_TIMEOUT: 1e3,
      /**
       * Asynchronously retrieves metadata from on-instance endpoint with an HTTP request using retries for
       * requests that time out.
       * @param {object} options - The HTTP options to make the request with
       * @param {function} callback - callback to plugin
       */
      getPluginMetadata: function(options, callback) {
        const METADATA_RETRY_TIMEOUT = 250;
        const METADATA_RETRIES = 5;
        var retries = METADATA_RETRIES;
        var getMetadata = function() {
          var httpReq = http2.__request ? http2.__request : http2.request;
          var req = httpReq(options, function(res) {
            var body = "";
            res.on("data", function(chunk) {
              body += chunk;
            });
            res.on("end", function() {
              if (this.statusCode === 200 || this.statusCode === 300) {
                try {
                  body = JSON.parse(body);
                } catch (e) {
                  callback(e);
                  return;
                }
                callback(null, body);
              } else if (retries > 0 && Math.floor(this.statusCode / 100) === 5) {
                retries--;
                setTimeout(getMetadata, METADATA_RETRY_TIMEOUT);
              } else {
                callback(new Error(`Failed to retrieve metadata with options: ${options}`));
              }
            });
          });
          req.on("error", function(err) {
            callback(err);
          });
          req.on("timeout", function() {
            req.abort();
          });
          req.setTimeout(Plugin.METADATA_TIMEOUT);
          req.end();
        };
        getMetadata();
      }
    };
    module2.exports = Plugin;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/segments/plugins/ec2_plugin.js
var require_ec2_plugin = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/segments/plugins/ec2_plugin.js"(exports2, module2) {
    "use strict";
    var Plugin = require_plugin();
    var logger2 = require_logger();
    var http2 = require("http");
    var EC2Plugin = {
      /**
       * A function to get the instance data from the EC2 metadata service.
       * @param {function} callback - The callback for the plugin loader.
       */
      getData: function(callback) {
        const METADATA_PATH = "/latest/dynamic/instance-identity/document";
        function populateMetadata(token) {
          const options = getOptions(METADATA_PATH, "GET", token ? { "X-aws-ec2-metadata-token": token } : {});
          Plugin.getPluginMetadata(options, function(err, data) {
            if (err || !data) {
              logger2.getLogger().error("Error loading EC2 plugin metadata: ", err ? err.toString() : "Could not retrieve data from IMDS.");
              callback();
              return;
            }
            const metadata = {
              ec2: {
                instance_id: data.instanceId,
                availability_zone: data.availabilityZone,
                instance_size: data.instanceType,
                ami_id: data.imageId
              }
            };
            callback(metadata);
          });
        }
        getToken(function(token) {
          if (token === null) {
            logger2.getLogger().debug("EC2Plugin failed to get token from IMDSv2. Falling back to IMDSv1.");
          }
          populateMetadata(token);
        });
      },
      originName: "AWS::EC2::Instance"
    };
    function getToken(callback) {
      const httpReq = http2.__request ? http2.__request : http2.request;
      const TTL = 60;
      const TOKEN_PATH = "/latest/api/token";
      const options = getOptions(TOKEN_PATH, "PUT", {
        "X-aws-ec2-metadata-token-ttl-seconds": TTL
      });
      let req = httpReq(options, function(res) {
        let body = "";
        res.on("data", function(chunk) {
          body += chunk;
        });
        res.on("end", function() {
          if (this.statusCode === 200 || this.statusCode === 300) {
            callback(body);
          } else {
            callback(null);
          }
        });
      });
      req.on("error", function() {
        callback(null);
      });
      req.on("timeout", function() {
        req.abort();
        callback(null);
      });
      req.setTimeout(Plugin.METADATA_TIMEOUT);
      req.end();
    }
    function getOptions(path, method, headers) {
      if (!method) {
        method = "GET";
      }
      if (!headers) {
        headers = {};
      }
      return {
        host: "169.254.169.254",
        path,
        method,
        headers
      };
    }
    module2.exports = EC2Plugin;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/segments/plugins/ecs_plugin.js
var require_ecs_plugin = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/segments/plugins/ecs_plugin.js"(exports2, module2) {
    "use strict";
    var os = require("os");
    var ECSPlugin = {
      /**
       * A function to get the instance data from the ECS instance.
       * @param {function} callback - The callback for the plugin loader.
       */
      getData: function(callback) {
        callback({ ecs: { container: os.hostname() } });
      },
      originName: "AWS::ECS::Container"
    };
    module2.exports = ECSPlugin;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/segments/plugins/elastic_beanstalk_plugin.js
var require_elastic_beanstalk_plugin = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/segments/plugins/elastic_beanstalk_plugin.js"(exports2, module2) {
    "use strict";
    var fs = require("fs");
    var logger2 = require_logger();
    var ENV_CONFIG_LOCATION = "/var/elasticbeanstalk/xray/environment.conf";
    var ElasticBeanstalkPlugin = {
      /**
       * A function to get data from the Elastic Beanstalk environment configuration file.
       * @param {function} callback - The callback for the plugin loader.
       */
      getData: function(callback) {
        fs.readFile(ENV_CONFIG_LOCATION, "utf8", function(err, rawData) {
          if (err) {
            logger2.getLogger().error("Error loading Elastic Beanstalk plugin:", err.stack);
            callback();
          } else {
            var data = JSON.parse(rawData);
            var metadata = {
              elastic_beanstalk: {
                environment: data.environment_name,
                version_label: data.version_label,
                deployment_id: data.deployment_id
              }
            };
            callback(metadata);
          }
        });
      },
      originName: "AWS::ElasticBeanstalk::Environment"
    };
    module2.exports = ElasticBeanstalkPlugin;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/resources/aws_whitelist.json
var require_aws_whitelist = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/resources/aws_whitelist.json"(exports2, module2) {
    module2.exports = {
      services: {
        dynamodb: {
          operations: {
            batchGetItem: {
              request_descriptors: {
                RequestItems: {
                  get_keys: true,
                  rename_to: "table_names"
                }
              },
              response_parameters: [
                "ConsumedCapacity"
              ]
            },
            batchWriteItem: {
              request_descriptors: {
                RequestItems: {
                  get_keys: true,
                  rename_to: "table_names"
                }
              },
              response_parameters: [
                "ConsumedCapacity",
                "ItemCollectionMetrics"
              ]
            },
            createTable: {
              request_parameters: [
                "GlobalSecondaryIndexes",
                "LocalSecondaryIndexes",
                "ProvisionedThroughput",
                "TableName"
              ]
            },
            deleteItem: {
              request_parameters: [
                "TableName"
              ],
              response_parameters: [
                "ConsumedCapacity",
                "ItemCollectionMetrics"
              ]
            },
            deleteTable: {
              request_parameters: [
                "TableName"
              ]
            },
            describeTable: {
              request_parameters: [
                "TableName"
              ]
            },
            getItem: {
              request_parameters: [
                "ConsistentRead",
                "ProjectionExpression",
                "TableName"
              ],
              response_parameters: [
                "ConsumedCapacity"
              ]
            },
            listTables: {
              request_parameters: [
                "ExclusiveStartTableName",
                "Limit"
              ],
              response_descriptors: {
                TableNames: {
                  list: true,
                  get_count: true,
                  rename_to: "table_count"
                }
              }
            },
            putItem: {
              request_parameters: [
                "TableName"
              ],
              response_parameters: [
                "ConsumedCapacity",
                "ItemCollectionMetrics"
              ]
            },
            query: {
              request_parameters: [
                "AttributesToGet",
                "ConsistentRead",
                "IndexName",
                "Limit",
                "ProjectionExpression",
                "ScanIndexForward",
                "Select",
                "TableName"
              ],
              response_parameters: [
                "ConsumedCapacity"
              ]
            },
            scan: {
              request_parameters: [
                "AttributesToGet",
                "ConsistentRead",
                "IndexName",
                "Limit",
                "ProjectionExpression",
                "Segment",
                "Select",
                "TableName",
                "TotalSegments"
              ],
              response_parameters: [
                "ConsumedCapacity",
                "Count",
                "ScannedCount"
              ]
            },
            updateItem: {
              request_parameters: [
                "TableName"
              ],
              response_parameters: [
                "ConsumedCapacity",
                "ItemCollectionMetrics"
              ]
            },
            updateTable: {
              request_parameters: [
                "AttributeDefinitions",
                "GlobalSecondaryIndexUpdates",
                "ProvisionedThroughput",
                "TableName"
              ]
            }
          }
        },
        sqs: {
          operations: {
            addPermission: {
              request_parameters: [
                "Label",
                "QueueUrl"
              ]
            },
            changeMessageVisibility: {
              request_parameters: [
                "QueueUrl",
                "VisibilityTimeout"
              ]
            },
            changeMessageVisibilityBatch: {
              request_parameters: [
                "QueueUrl"
              ],
              response_parameters: [
                "Failed"
              ]
            },
            createQueue: {
              request_parameters: [
                "Attributes",
                "QueueName"
              ]
            },
            deleteMessage: {
              request_parameters: [
                "QueueUrl"
              ]
            },
            deleteMessageBatch: {
              request_parameters: [
                "QueueUrl"
              ],
              response_parameters: [
                "Failed"
              ]
            },
            deleteQueue: {
              request_parameters: [
                "QueueUrl"
              ]
            },
            getQueueAttributes: {
              request_parameters: [
                "QueueUrl"
              ],
              response_parameters: [
                "Attributes"
              ]
            },
            getQueueUrl: {
              request_parameters: [
                "QueueName",
                "QueueOwnerAWSAccountId"
              ],
              response_parameters: [
                "QueueUrl"
              ]
            },
            listDeadLetterSourceQueues: {
              request_parameters: [
                "QueueUrl"
              ],
              response_parameters: [
                "QueueUrls"
              ]
            },
            listQueues: {
              request_parameters: [
                "QueueNamePrefix"
              ],
              response_descriptors: {
                QueueUrls: {
                  list: true,
                  get_count: true,
                  rename_to: "queue_count"
                }
              }
            },
            purgeQueue: {
              request_parameters: [
                "QueueUrl"
              ]
            },
            receiveMessage: {
              request_parameters: [
                "AttributeNames",
                "MaxNumberOfMessages",
                "MessageAttributeNames",
                "QueueUrl",
                "VisibilityTimeout",
                "WaitTimeSeconds"
              ],
              response_descriptors: {
                Messages: {
                  list: true,
                  get_count: true,
                  rename_to: "message_count"
                }
              }
            },
            removePermission: {
              request_parameters: [
                "QueueUrl"
              ]
            },
            sendMessage: {
              request_parameters: [
                "DelaySeconds",
                "QueueUrl"
              ],
              request_descriptors: {
                MessageAttributes: {
                  get_keys: true,
                  rename_to: "message_attribute_names"
                }
              },
              response_parameters: [
                "MessageId"
              ]
            },
            sendMessageBatch: {
              request_parameters: [
                "QueueUrl"
              ],
              request_descriptors: {
                Entries: {
                  list: true,
                  get_count: true,
                  rename_to: "message_count"
                }
              },
              response_descriptors: {
                Failed: {
                  list: true,
                  get_count: true,
                  rename_to: "failed_count"
                },
                Successful: {
                  list: true,
                  get_count: true,
                  rename_to: "successful_count"
                }
              }
            },
            setQueueAttributes: {
              request_parameters: [
                "QueueUrl"
              ],
              request_descriptors: {
                Attributes: {
                  get_keys: true,
                  rename_to: "attribute_names"
                }
              }
            }
          }
        },
        sns: {
          operations: {
            publish: {
              request_parameters: [
                "TopicArn"
              ]
            },
            publishBatch: {
              request_parameters: [
                "TopicArn"
              ]
            }
          }
        },
        lambda: {
          operations: {
            invoke: {
              request_parameters: [
                "FunctionName",
                "InvocationType",
                "LogType",
                "Qualifier"
              ],
              response_parameters: [
                "FunctionError",
                "StatusCode"
              ]
            },
            invokeAsync: {
              request_parameters: [
                "FunctionName"
              ],
              response_parameters: [
                "Status"
              ]
            }
          }
        },
        s3: {
          operations: {
            abortMultipartUpload: {
              request_parameters: [
                "Key"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            completeMultipartUpload: {
              request_parameters: [
                "Key"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            copyObject: {
              request_parameters: [
                "CopySource",
                "Key"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            createBucket: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            createMultipartUpload: {
              request_parameters: [
                "Key"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            deleteBucket: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            deleteBucketAnalyticsConfiguration: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            deleteBucketCors: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            deleteBucketEncryption: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            deleteBucketInventoryConfiguration: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            deleteBucketLifecycle: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            deleteBucketMetricsConfiguration: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            deleteBucketPolicy: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            deleteBucketReplication: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            deleteBucketTagging: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            deleteBucketWebsite: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            deleteObject: {
              request_parameters: [
                "Key",
                "VersionId"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            deleteObjectTagging: {
              request_parameters: [
                "Key",
                "VersionId"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            deleteObjects: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketAccelerateConfiguration: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketAcl: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketAnalyticsConfiguration: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketCors: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketEncryption: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketInventoryConfiguration: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketLifecycle: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketLifecycleConfiguration: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketLocation: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketLogging: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketMetricsConfiguration: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketNotification: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketNotificationConfiguration: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketPolicy: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketReplication: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketRequestPayment: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketTagging: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketVersioning: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getBucketWebsite: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getObject: {
              request_parameters: [
                "Key",
                "VersionId"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getObjectAcl: {
              request_parameters: [
                "Key",
                "VersionId"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getObjectTagging: {
              request_parameters: [
                "Key",
                "VersionId"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            getObjectTorrent: {
              request_parameters: [
                "Key"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            headBucket: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            headObject: {
              request_parameters: [
                "Key",
                "VersionId"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            listBucketAnalyticsConfigurations: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            listBucketInventoryConfigurations: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            listBucketMetricsConfigurations: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            listMultipartUploads: {
              request_parameters: [
                "Prefix"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            listObjectVersions: {
              request_parameters: [
                "Prefix"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            listObjects: {
              request_parameters: [
                "Prefix"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            listObjectsV2: {
              request_parameters: [
                "Prefix"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            listParts: {
              request_parameters: [
                "Key"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketAccelerateConfiguration: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketAcl: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketAnalyticsConfiguration: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketCors: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketEncryption: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketInventoryConfiguration: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketLifecycle: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketLifecycleConfiguration: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketLogging: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketMetricsConfiguration: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketNotification: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketNotificationConfiguration: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketPolicy: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketReplication: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketRequestPayment: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketTagging: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketVersioning: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putBucketWebsite: {
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putObject: {
              request_parameters: [
                "Key"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putObjectAcl: {
              request_parameters: [
                "Key",
                "VersionId"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            putObjectTagging: {
              request_parameters: [
                "Key",
                "VersionId"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            restoreObject: {
              request_parameters: [
                "Key",
                "VersionId"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            uploadPart: {
              request_parameters: [
                "Key"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            },
            uploadPartCopy: {
              request_parameters: [
                "CopySource",
                "Key"
              ],
              request_descriptors: {
                Bucket: {
                  rename_to: "bucket_name"
                }
              }
            }
          }
        },
        sagemakerruntime: {
          operations: {
            invokeEndpoint: {
              request_parameters: [
                "EndpointName"
              ]
            }
          }
        }
      }
    };
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/patchers/call_capturer.js
var require_call_capturer = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/patchers/call_capturer.js"(exports2, module2) {
    "use strict";
    var fs = require("fs");
    var logger2 = require_logger();
    var whitelist = require_aws_whitelist();
    var paramTypes = {
      REQ_DESC: "request_descriptors",
      REQ_PARAMS: "request_parameters",
      RES_DESC: "response_descriptors",
      RES_PARAMS: "response_parameters"
    };
    function CallCapturer(source) {
      this.init(source);
    }
    CallCapturer.prototype.init = function init(source) {
      if (source) {
        if (typeof source === "string") {
          logger2.getLogger().info("Using custom AWS whitelist file: " + source);
          this.services = loadWhitelist(JSON.parse(fs.readFileSync(source, "utf8")));
        } else {
          logger2.getLogger().info("Using custom AWS whitelist source.");
          this.services = loadWhitelist(source);
        }
      } else {
        this.services = whitelist.services;
      }
    };
    CallCapturer.prototype.append = function append(source) {
      var newServices = {};
      if (typeof source === "string") {
        logger2.getLogger().info("Appending AWS whitelist with custom file: " + source);
        newServices = loadWhitelist(JSON.parse(fs.readFileSync(source, "utf8")));
      } else {
        logger2.getLogger().info("Appending AWS whitelist with a custom source.");
        newServices = loadWhitelist(source);
      }
      for (var attribute in newServices) {
        this.services[attribute] = newServices[attribute];
      }
    };
    CallCapturer.prototype.capture = function capture(serviceName, response) {
      var operation = response.request.operation;
      var call = this.services[serviceName] !== void 0 ? this.services[serviceName].operations[operation] : null;
      if (call === null) {
        logger2.getLogger().debug('Call "' + serviceName + "." + operation + '" is not whitelisted for additional data capturing. Ignoring.');
        return;
      }
      var dataCaptured = {};
      for (var paramType in call) {
        var params = call[paramType];
        if (paramType === paramTypes.REQ_PARAMS) {
          captureCallParams(params, response.request.params, dataCaptured);
        } else if (paramType === paramTypes.REQ_DESC) {
          captureDescriptors(params, response.request.params, dataCaptured);
        } else if (paramType === paramTypes.RES_PARAMS) {
          if (response.data) {
            captureCallParams(params, response.data, dataCaptured);
          }
        } else if (paramType === paramTypes.RES_DESC) {
          if (response.data) {
            captureDescriptors(params, response.data, dataCaptured);
          }
        } else {
          logger2.getLogger().error('Unknown parameter type "' + paramType + '". Must be "request_descriptors", "response_descriptors", "request_parameters" or "response_parameters".');
        }
      }
      return dataCaptured;
    };
    function captureCallParams(params, call, data) {
      params.forEach(function(param) {
        if (typeof call[param] !== "undefined") {
          var formatted = toSnakeCase(param);
          this[formatted] = call[param];
        }
      }, data);
    }
    function captureDescriptors(descriptors, params, data) {
      for (var paramName in descriptors) {
        var attributes = descriptors[paramName];
        if (typeof params[paramName] !== "undefined") {
          var paramData;
          if (attributes.list && attributes.get_count) {
            paramData = params[paramName] ? params[paramName].length : 0;
          } else {
            paramData = attributes.get_keys === true ? Object.keys(params[paramName]) : params[paramName];
          }
          if (typeof attributes.rename_to === "string") {
            data[attributes.rename_to] = paramData;
          } else {
            var formatted = toSnakeCase(paramName);
            data[formatted] = paramData;
          }
        }
      }
    }
    function toSnakeCase(param) {
      if (param === "IPAddress") {
        return "ip_address";
      } else {
        return param.split(/(?=[A-Z])/).join("_").toLowerCase();
      }
    }
    function loadWhitelist(source) {
      var doc = source;
      if (doc.services === void 0) {
        throw new Error('Document formatting is incorrect. Expecting "services" param.');
      }
      return doc.services;
    }
    module2.exports = CallCapturer;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/segments/attributes/aws.js
var require_aws = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/segments/attributes/aws.js"(exports2, module2) {
    "use strict";
    var CallCapturer = require_call_capturer();
    var capturer = new CallCapturer();
    function Aws(res, serviceName) {
      this.init(res, serviceName);
    }
    Aws.prototype.init = function init(res, serviceName) {
      this.operation = formatOperation(res.request.operation) || "";
      if (res && res.request && res.request.httpRequest && res.request.httpRequest.region) {
        this.region = res.request.httpRequest.region;
      }
      if (res && res.requestId) {
        this.request_id = res.requestId;
      }
      this.retries = res.retryCount || 0;
      if (res.extendedRequestId && serviceName && serviceName.toLowerCase() === "s3") {
        this.id_2 = res.extendedRequestId;
      }
      if (serviceName) {
        this.addData(capturer.capture(serviceName.toLowerCase(), res));
      }
    };
    Aws.prototype.addData = function addData(data) {
      for (var attribute in data) {
        this[attribute] = data[attribute];
      }
    };
    var setAWSWhitelist = function setAWSWhitelist2(source) {
      if (!source || source instanceof String || !(typeof source === "string" || source instanceof Object)) {
        throw new Error("Please specify a path to the local whitelist file, or supply a whitelist source object.");
      }
      capturer = new CallCapturer(source);
    };
    var appendAWSWhitelist = function appendAWSWhitelist2(source) {
      if (!source || source instanceof String || !(typeof source === "string" || source instanceof Object)) {
        throw new Error("Please specify a path to the local whitelist file, or supply a whitelist source object.");
      }
      capturer.append(source);
    };
    function formatOperation(operation) {
      if (!operation) {
        return;
      }
      return operation.charAt(0).toUpperCase() + operation.slice(1);
    }
    module2.exports = Aws;
    module2.exports.appendAWSWhitelist = appendAWSWhitelist;
    module2.exports.setAWSWhitelist = setAWSWhitelist;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/capture.js
var require_capture = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/capture.js"(exports2, module2) {
    "use strict";
    var contextUtils = require_context_utils();
    var logger2 = require_logger();
    var captureFunc2 = function captureFunc3(name, fcn, parent) {
      validate(name, fcn);
      var current, executeFcn;
      var parentSeg = contextUtils.resolveSegment(parent);
      if (!parentSeg) {
        logger2.getLogger().warn("Failed to capture function.");
        return fcn();
      }
      current = parentSeg.addNewSubsegment(name);
      executeFcn = captureFcn(fcn, current);
      try {
        const response = executeFcn(current);
        current.close();
        return response;
      } catch (e) {
        current.close(e);
        throw e;
      }
    };
    var captureAsyncFunc2 = function captureAsyncFunc3(name, fcn, parent) {
      validate(name, fcn);
      var current, executeFcn;
      var parentSeg = contextUtils.resolveSegment(parent);
      if (!parentSeg) {
        logger2.getLogger().warn("Failed to capture async function.");
        return fcn();
      }
      current = parentSeg.addNewSubsegment(name);
      executeFcn = captureFcn(fcn, current);
      try {
        return executeFcn(current);
      } catch (e) {
        current.close(e);
        throw e;
      }
    };
    var captureCallbackFunc = function captureCallbackFunc2(name, fcn, parent) {
      validate(name, fcn);
      var base = contextUtils.resolveSegment(parent);
      if (!base) {
        logger2.getLogger().warn("Failed to capture callback function.");
        return fcn;
      }
      base.incrementCounter();
      return function() {
        var parentSeg = contextUtils.resolveSegment(parent);
        var args = Array.prototype.slice.call(arguments);
        captureFunc2(name, fcn.bind.apply(fcn, [null].concat(args)), parentSeg);
        base.decrementCounter();
      }.bind(this);
    };
    function captureFcn(fcn, current) {
      var executeFcn;
      if (contextUtils.isAutomaticMode()) {
        var session = contextUtils.getNamespace();
        var contextFcn = function() {
          var value;
          session.run(function() {
            contextUtils.setSegment(current);
            value = fcn(current);
          });
          return value;
        };
        executeFcn = contextFcn;
      } else {
        executeFcn = fcn;
      }
      return executeFcn;
    }
    function validate(name, fcn) {
      var error;
      if (!name || typeof name !== "string") {
        error = 'Param "name" must be a non-empty string.';
        logger2.getLogger().error(error);
        throw new Error(error);
      } else if (typeof fcn !== "function") {
        error = 'Param "fcn" must be a function.';
        logger2.getLogger().error(error);
        throw new Error(error);
      }
    }
    module2.exports.captureFunc = captureFunc2;
    module2.exports.captureAsyncFunc = captureAsyncFunc2;
    module2.exports.captureCallbackFunc = captureCallbackFunc;
  }
});

// node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  "node_modules/semver/internal/constants.js"(exports2, module2) {
    "use strict";
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var WHITESPACE_CHARACTERS = [
      "	",
      "\n",
      "\v",
      "\f",
      "\r",
      " ",
      "\xA0",
      "\u1680",
      "\u2000",
      "\u2001",
      "\u2002",
      "\u2003",
      "\u2004",
      "\u2005",
      "\u2006",
      "\u2007",
      "\u2008",
      "\u2009",
      "\u200A",
      "\u2028",
      "\u2029",
      "\u202F",
      "\u205F",
      "\u3000",
      "\uFEFF"
    ];
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module2.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      WHITESPACE_CHARACTERS,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "node_modules/semver/internal/debug.js"(exports2, module2) {
    "use strict";
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module2.exports = debug;
  }
});

// node_modules/semver/internal/re.js
var require_re = __commonJS({
  "node_modules/semver/internal/re.js"(exports2, module2) {
    "use strict";
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants();
    var debug = require_debug();
    exports2 = module2.exports = {};
    var re = exports2.re = [];
    var safeRe = exports2.safeRe = [];
    var src = exports2.src = [];
    var safeSrc = exports2.safeSrc = [];
    var t = exports2.t = {};
    var R = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    var createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports2.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports2.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports2.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "node_modules/semver/internal/parse-options.js"(exports2, module2) {
    "use strict";
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = (options) => {
      if (!options) {
        return emptyOpts;
      }
      if (typeof options !== "object") {
        return looseOption;
      }
      return options;
    };
    module2.exports = parseOptions;
  }
});

// node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "node_modules/semver/internal/identifiers.js"(exports2, module2) {
    "use strict";
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = (a, b) => {
      if (typeof a === "number" && typeof b === "number") {
        return a === b ? 0 : a < b ? -1 : 1;
      }
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    };
    var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
    module2.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "node_modules/semver/classes/semver.js"(exports2, module2) {
    "use strict";
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { safeRe: re, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var isPrereleaseIdentifier = (prerelease, identifier) => {
      const identifiers = identifier.split(".");
      if (identifiers.length > prerelease.length) {
        return false;
      }
      for (let i = 0; i < identifiers.length; i++) {
        if (compareIdentifiers(prerelease[i], identifiers[i]) !== 0) {
          return false;
        }
      }
      return true;
    };
    var SemVer = class _SemVer {
      constructor(version, options) {
        options = parseOptions(options);
        if (version instanceof _SemVer) {
          if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
            return version;
          } else {
            version = version.version;
          }
        } else if (typeof version !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
        }
        if (version.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug("SemVer", version, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version}`);
        }
        this.raw = version;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof _SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new _SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.major < other.major) {
          return -1;
        }
        if (this.major > other.major) {
          return 1;
        }
        if (this.minor < other.minor) {
          return -1;
        }
        if (this.minor > other.minor) {
          return 1;
        }
        if (this.patch < other.patch) {
          return -1;
        }
        if (this.patch > other.patch) {
          return 1;
        }
        return 0;
      }
      comparePre(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug("build compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        if (release.startsWith("pre")) {
          if (!identifier && identifierBase === false) {
            throw new Error("invalid increment argument: identifier is empty");
          }
          if (identifier) {
            const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
            if (!match || match[1] !== identifier) {
              throw new Error(`invalid identifier: ${identifier}`);
            }
          }
        }
        switch (release) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          // If the input is a non-prerelease version, this acts the same as
          // prepatch.
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "release":
            if (this.prerelease.length === 0) {
              throw new Error(`version ${this.raw} is not a prerelease`);
            }
            this.prerelease.length = 0;
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          // This probably shouldn't be used publicly.
          // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (isPrereleaseIdentifier(this.prerelease, identifier)) {
                const prereleaseBase = this.prerelease[identifier.split(".").length];
                if (isNaN(prereleaseBase)) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module2.exports = SemVer;
  }
});

// node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  "node_modules/semver/functions/parse.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var parse = (version, options, throwErrors = false) => {
      if (version instanceof SemVer) {
        return version;
      }
      try {
        return new SemVer(version, options);
      } catch (er) {
        if (!throwErrors) {
          return null;
        }
        throw er;
      }
    };
    module2.exports = parse;
  }
});

// node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "node_modules/semver/functions/valid.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var valid = (version, options) => {
      const v = parse(version, options);
      return v ? v.version : null;
    };
    module2.exports = valid;
  }
});

// node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  "node_modules/semver/functions/clean.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var clean = (version, options) => {
      const s = parse(version.trim().replace(/^[=v]+/, ""), options);
      return s ? s.version : null;
    };
    module2.exports = clean;
  }
});

// node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  "node_modules/semver/functions/inc.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var inc = (version, release, options, identifier, identifierBase) => {
      if (typeof options === "string") {
        identifierBase = identifier;
        identifier = options;
        options = void 0;
      }
      try {
        return new SemVer(
          version instanceof SemVer ? version.version : version,
          options
        ).inc(release, identifier, identifierBase).version;
      } catch (er) {
        return null;
      }
    };
    module2.exports = inc;
  }
});

// node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  "node_modules/semver/functions/diff.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var diff = (version1, version2) => {
      const v1 = parse(version1, null, true);
      const v2 = parse(version2, null, true);
      const comparison = v1.compare(v2);
      if (comparison === 0) {
        return null;
      }
      const v1Higher = comparison > 0;
      const highVersion = v1Higher ? v1 : v2;
      const lowVersion = v1Higher ? v2 : v1;
      const highHasPre = !!highVersion.prerelease.length;
      const lowHasPre = !!lowVersion.prerelease.length;
      if (lowHasPre && !highHasPre) {
        if (!lowVersion.patch && !lowVersion.minor) {
          return "major";
        }
        if (lowVersion.compareMain(highVersion) === 0) {
          if (lowVersion.minor && !lowVersion.patch) {
            return "minor";
          }
          return "patch";
        }
      }
      const prefix = highHasPre ? "pre" : "";
      if (v1.major !== v2.major) {
        return prefix + "major";
      }
      if (v1.minor !== v2.minor) {
        return prefix + "minor";
      }
      if (v1.patch !== v2.patch) {
        return prefix + "patch";
      }
      return "prerelease";
    };
    module2.exports = diff;
  }
});

// node_modules/semver/functions/major.js
var require_major = __commonJS({
  "node_modules/semver/functions/major.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var major = (a, loose) => new SemVer(a, loose).major;
    module2.exports = major;
  }
});

// node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  "node_modules/semver/functions/minor.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var minor = (a, loose) => new SemVer(a, loose).minor;
    module2.exports = minor;
  }
});

// node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  "node_modules/semver/functions/patch.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var patch = (a, loose) => new SemVer(a, loose).patch;
    module2.exports = patch;
  }
});

// node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "node_modules/semver/functions/prerelease.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var prerelease = (version, options) => {
      const parsed = parse(version, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module2.exports = prerelease;
  }
});

// node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "node_modules/semver/functions/compare.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
    module2.exports = compare;
  }
});

// node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  "node_modules/semver/functions/rcompare.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var rcompare = (a, b, loose) => compare(b, a, loose);
    module2.exports = rcompare;
  }
});

// node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  "node_modules/semver/functions/compare-loose.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var compareLoose = (a, b) => compare(a, b, true);
    module2.exports = compareLoose;
  }
});

// node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  "node_modules/semver/functions/compare-build.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var compareBuild = (a, b, loose) => {
      const versionA = new SemVer(a, loose);
      const versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module2.exports = compareBuild;
  }
});

// node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  "node_modules/semver/functions/sort.js"(exports2, module2) {
    "use strict";
    var compareBuild = require_compare_build();
    var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
    module2.exports = sort;
  }
});

// node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  "node_modules/semver/functions/rsort.js"(exports2, module2) {
    "use strict";
    var compareBuild = require_compare_build();
    var rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
    module2.exports = rsort;
  }
});

// node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "node_modules/semver/functions/gt.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var gt = (a, b, loose) => compare(a, b, loose) > 0;
    module2.exports = gt;
  }
});

// node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "node_modules/semver/functions/lt.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var lt = (a, b, loose) => compare(a, b, loose) < 0;
    module2.exports = lt;
  }
});

// node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "node_modules/semver/functions/eq.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var eq = (a, b, loose) => compare(a, b, loose) === 0;
    module2.exports = eq;
  }
});

// node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "node_modules/semver/functions/neq.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var neq = (a, b, loose) => compare(a, b, loose) !== 0;
    module2.exports = neq;
  }
});

// node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "node_modules/semver/functions/gte.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var gte = (a, b, loose) => compare(a, b, loose) >= 0;
    module2.exports = gte;
  }
});

// node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "node_modules/semver/functions/lte.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var lte = (a, b, loose) => compare(a, b, loose) <= 0;
    module2.exports = lte;
  }
});

// node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "node_modules/semver/functions/cmp.js"(exports2, module2) {
    "use strict";
    var eq = require_eq();
    var neq = require_neq();
    var gt = require_gt();
    var gte = require_gte();
    var lt = require_lt();
    var lte = require_lte();
    var cmp = (a, op, b, loose) => {
      switch (op) {
        case "===":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a === b;
        case "!==":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a !== b;
        case "":
        case "=":
        case "==":
          return eq(a, b, loose);
        case "!=":
          return neq(a, b, loose);
        case ">":
          return gt(a, b, loose);
        case ">=":
          return gte(a, b, loose);
        case "<":
          return lt(a, b, loose);
        case "<=":
          return lte(a, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    };
    module2.exports = cmp;
  }
});

// node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  "node_modules/semver/functions/coerce.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var parse = require_parse();
    var { safeRe: re, t } = require_re();
    var coerce = (version, options) => {
      if (version instanceof SemVer) {
        return version;
      }
      if (typeof version === "number") {
        version = String(version);
      }
      if (typeof version !== "string") {
        return null;
      }
      options = options || {};
      let match = null;
      if (!options.rtl) {
        match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
      } else {
        const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
        let next;
        while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
          if (!match || next.index + next[0].length !== match.index + match[0].length) {
            match = next;
          }
          coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
        }
        coerceRtlRegex.lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      const major = match[2];
      const minor = match[3] || "0";
      const patch = match[4] || "0";
      const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
      const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
      return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
    };
    module2.exports = coerce;
  }
});

// node_modules/semver/functions/truncate.js
var require_truncate = __commonJS({
  "node_modules/semver/functions/truncate.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var constants = require_constants();
    var SemVer = require_semver();
    var truncate = (version, truncation, options) => {
      if (!constants.RELEASE_TYPES.includes(truncation)) {
        return null;
      }
      const clonedVersion = cloneInputVersion(version, options);
      return clonedVersion && doTruncation(clonedVersion, truncation);
    };
    var cloneInputVersion = (version, options) => {
      const versionStringToParse = version instanceof SemVer ? version.version : version;
      return parse(versionStringToParse, options);
    };
    var doTruncation = (version, truncation) => {
      if (isPrerelease(truncation)) {
        return version.version;
      }
      version.prerelease = [];
      switch (truncation) {
        case "major":
          version.minor = 0;
          version.patch = 0;
          break;
        case "minor":
          version.patch = 0;
          break;
      }
      return version.format();
    };
    var isPrerelease = (type) => {
      return type.startsWith("pre");
    };
    module2.exports = truncate;
  }
});

// node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  "node_modules/semver/internal/lrucache.js"(exports2, module2) {
    "use strict";
    var LRUCache = class {
      constructor() {
        this.max = 1e3;
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.map.get(key);
        if (value === void 0) {
          return void 0;
        } else {
          this.map.delete(key);
          this.map.set(key, value);
          return value;
        }
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        const deleted = this.delete(key);
        if (!deleted && value !== void 0) {
          if (this.map.size >= this.max) {
            const firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module2.exports = LRUCache;
  }
});

// node_modules/semver/internal/trim-comparator-whitespace.js
var require_trim_comparator_whitespace = __commonJS({
  "node_modules/semver/internal/trim-comparator-whitespace.js"(exports2, module2) {
    "use strict";
    var {
      MAX_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      WHITESPACE_CHARACTERS
    } = require_constants();
    var whitespace = new Uint8Array(65536);
    for (const char of WHITESPACE_CHARACTERS) {
      whitespace[char.charCodeAt(0)] = 1;
    }
    var isWhitespace = (char) => char !== void 0 && whitespace[char.charCodeAt(0)] === 1;
    var isVersionPrefix = (char) => char === "v" || char === "=" || isWhitespace(char);
    var isDigit = (char) => char !== void 0 && char >= "0" && char <= "9";
    var isLetter = (char) => char !== void 0 && (char >= "a" && char <= "z" || char >= "A" && char <= "Z");
    var isIdentifierCharacter = (char) => isDigit(char) || isLetter(char) || char === "-";
    var isVersionStart = (char) => isDigit(char) || char === "x" || char === "X" || char === "*";
    var findDigitsEndIndex = (range, start, limit, digitRuns) => {
      if (!isDigit(range[start])) {
        return start;
      }
      if (start >= digitRuns.start && start < digitRuns.end) {
        return Math.min(start + limit, digitRuns.end);
      }
      if (start >= digitRuns.previousStart && start < digitRuns.previousEnd) {
        return Math.min(start + limit, digitRuns.previousEnd);
      }
      let end = start + 1;
      while (isDigit(range[end])) {
        end++;
      }
      digitRuns.previousStart = digitRuns.start;
      digitRuns.previousEnd = digitRuns.end;
      digitRuns.start = start;
      digitRuns.end = end;
      return Math.min(start + limit, end);
    };
    var findVersionNumberEndIndex = (range, start, loose, digitRuns) => {
      if (!loose && range[start] === "0") {
        return start + 1;
      }
      return findDigitsEndIndex(range, start, loose ? MAX_LENGTH : MAX_LENGTH + 1, digitRuns);
    };
    var findPrereleaseIdentifierEndIndex = (range, start, loose, digitRuns) => {
      const digitsEnd = findDigitsEndIndex(range, start, MAX_LENGTH, digitRuns);
      if (isLetter(range[digitsEnd]) || range[digitsEnd] === "-") {
        let end = digitsEnd + 1;
        const limit = end + MAX_SAFE_BUILD_LENGTH;
        while (end < limit && isIdentifierCharacter(range[end])) {
          end++;
        }
        return end;
      }
      return findVersionNumberEndIndex(range, start, loose, digitRuns);
    };
    var findPrereleaseEndIndex = (range, start, loose, digitRuns) => {
      const hyphen = range[start] === "-";
      if (!loose && !hyphen) {
        return start;
      }
      const identifierStart = start + (hyphen ? 1 : 0);
      let end = findPrereleaseIdentifierEndIndex(range, identifierStart, loose, digitRuns);
      if (end === identifierStart) {
        if (!loose || !hyphen) {
          return start;
        }
        end = findPrereleaseIdentifierEndIndex(range, start, loose, digitRuns);
      }
      while (range[end] === ".") {
        const next = findPrereleaseIdentifierEndIndex(range, end + 1, loose, digitRuns);
        if (next === end + 1) {
          break;
        }
        end = next;
      }
      return end;
    };
    var findBuildIdentifierEndIndex = (range, start) => {
      let end = start;
      while (end - start < MAX_SAFE_BUILD_LENGTH && isIdentifierCharacter(range[end])) {
        end++;
      }
      return end;
    };
    var findBuildEndIndex = (range, start) => {
      if (range[start] !== "+") {
        return start;
      }
      let end = findBuildIdentifierEndIndex(range, start + 1);
      if (end === start + 1) {
        return start;
      }
      while (range[end] === ".") {
        const next = findBuildIdentifierEndIndex(range, end + 1);
        if (next === end + 1) {
          break;
        }
        end = next;
      }
      return end;
    };
    var findLooseFullVersionEndIndex = (range, start, digitRuns) => {
      let end = start;
      for (let component = 0; component < 3; component++) {
        const next = findVersionNumberEndIndex(range, end, true, digitRuns);
        if (next === end) {
          return start;
        }
        end = next;
        if (component < 2) {
          if (range[end] !== ".") {
            return start;
          }
          end++;
        }
      }
      const prereleaseEnd = findPrereleaseEndIndex(range, end, true, digitRuns);
      return findBuildEndIndex(range, prereleaseEnd);
    };
    var findPartialVersionComponentEndIndex = (range, start, digitRuns) => {
      if (isDigit(range[start])) {
        return findVersionNumberEndIndex(range, start, false, digitRuns);
      }
      return isVersionStart(range[start]) ? start + 1 : start;
    };
    var findPartialVersionEndIndex = (range, start, digitRuns) => {
      let end = findPartialVersionComponentEndIndex(range, start, digitRuns);
      for (let component = 0; component < 2; component++) {
        if (range[end] !== ".") {
          return end;
        }
        const next = findPartialVersionComponentEndIndex(range, end + 1, digitRuns);
        if (next === end + 1) {
          return end;
        }
        end = next;
      }
      const prereleaseEnd = findPrereleaseEndIndex(range, end, false, digitRuns);
      return findBuildEndIndex(range, prereleaseEnd);
    };
    var findVersionEndIndex = (range, start, digitRuns) => {
      const fullVersionEnd = findLooseFullVersionEndIndex(range, start, digitRuns);
      return fullVersionEnd !== start ? fullVersionEnd : findPartialVersionEndIndex(range, start, digitRuns);
    };
    var findRemovableWhitespaceIndex = (range, matchStart) => {
      let position = matchStart;
      if (isWhitespace(range[position])) {
        position++;
      }
      if (range[position] === "<" || range[position] === ">") {
        position++;
      }
      if (range[position] === "=") {
        position++;
      }
      return isWhitespace(range[position]) ? position : -1;
    };
    var trimComparatorWhitespace = (range) => {
      let result = "";
      let copyFrom = 0;
      let cursor = 0;
      const digitRuns = { start: -1, end: -1, previousStart: -1, previousEnd: -1 };
      while (cursor < range.length) {
        const matchStart = cursor;
        if (range[cursor] === "<" || range[cursor] === ">") {
          cursor++;
        } else if (!isVersionPrefix(range[cursor]) && !isVersionStart(range[cursor])) {
          cursor++;
          continue;
        }
        while (cursor < range.length && isVersionPrefix(range[cursor])) {
          cursor++;
        }
        if (!isVersionStart(range[cursor])) {
          continue;
        }
        const whitespacePosition = findRemovableWhitespaceIndex(range, matchStart);
        if (whitespacePosition !== -1) {
          result += range.slice(copyFrom, whitespacePosition);
          copyFrom = whitespacePosition + 1;
        }
        cursor = findVersionEndIndex(range, cursor, digitRuns);
      }
      return result + range.slice(copyFrom);
    };
    module2.exports = trimComparatorWhitespace;
  }
});

// node_modules/semver/classes/range.js
var require_range = __commonJS({
  "node_modules/semver/classes/range.js"(exports2, module2) {
    "use strict";
    var SPACE_CHARACTERS = /\s+/g;
    var Range = class _Range {
      constructor(range, options) {
        options = parseOptions(options);
        if (range instanceof _Range) {
          if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
            return range;
          } else {
            return new _Range(range.raw, options);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.formatted = void 0;
          return this;
        }
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
        this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c) => !isNullSet(c[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c of this.set) {
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
            }
          }
        }
        this.formatted = void 0;
      }
      get range() {
        if (this.formatted === void 0) {
          this.formatted = "";
          for (let i = 0; i < this.set.length; i++) {
            if (i > 0) {
              this.formatted += "||";
            }
            const comps = this.set[i];
            for (let k = 0; k < comps.length; k++) {
              if (k > 0) {
                this.formatted += " ";
              }
              this.formatted += comps[k].toString().trim();
            }
          }
        }
        return this.formatted;
      }
      format() {
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        range = range.replace(BUILDSTRIPRE, "");
        const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
        const memoKey = memoOpts + ":" + range;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
        debug("hyphen replace", range);
        range = trimComparatorWhitespace(range);
        debug("comparator trim", range);
        range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
        debug("tilde trim", range);
        range = range.replace(re[t.CARETTRIM], caretTrimReplace);
        debug("caret trim", range);
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug("loose invalid filter", comp, this.options);
            return !!comp.match(re[t.COMPARATORLOOSE]);
          });
        }
        debug("range list", rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has("")) {
          rangeMap.delete("");
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options) {
        if (!(range instanceof _Range)) {
          throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators) => {
          return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
            return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options);
              });
            });
          });
        });
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version) {
        if (!version) {
          return false;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i = 0; i < this.set.length; i++) {
          if (testSet(this.set[i], version, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module2.exports = Range;
    var LRU = require_lrucache();
    var cache = new LRU();
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug = require_debug();
    var SemVer = require_semver();
    var trimComparatorWhitespace = require_trim_comparator_whitespace();
    var {
      safeRe: re,
      src,
      t,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re();
    var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
    var BUILDSTRIPRE = new RegExp(src[t.BUILD], "g");
    var isNullSet = (c) => c.value === "<0.0.0-0";
    var isAny = (c) => c.value === "";
    var isSatisfiable = (comparators, options) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    };
    var parseComparator = (comp, options) => {
      comp = comp.replace(re[t.BUILD], "");
      debug("comp", comp, options);
      comp = replaceCarets(comp, options);
      debug("caret", comp);
      comp = replaceTildes(comp, options);
      debug("tildes", comp);
      comp = replaceXRanges(comp, options);
      debug("xrange", comp);
      comp = replaceStars(comp, options);
      debug("stars", comp);
      return comp;
    };
    var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
    var invalidXRangeOrder = (M, m, p) => isX(M) && !isX(m) || isX(m) && p && !isX(p);
    var replaceTildes = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
    };
    var replaceTilde = (comp, options) => {
      const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("tilde", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
        } else if (pr) {
          debug("replaceTilde pr", pr);
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        }
        debug("tilde return", ret);
        return ret;
      });
    };
    var replaceCarets = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
    };
    var replaceCaret = (comp, options) => {
      debug("caret", comp, options);
      const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("caret", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          if (M === "0") {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
          }
        } else if (pr) {
          debug("replaceCaret pr", pr);
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
          }
        } else {
          debug("no pr");
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
          }
        }
        debug("caret return", ret);
        return ret;
      });
    };
    var replaceXRanges = (comp, options) => {
      debug("replaceXRanges", comp, options);
      return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
    };
    var replaceXRange = (comp, options) => {
      comp = comp.trim();
      const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug("xRange", comp, ret, gtlt, M, m, p, pr);
        if (invalidXRangeOrder(M, m, p)) {
          return comp;
        }
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M = +M + 1;
            } else {
              m = +m + 1;
            }
          }
          if (gtlt === "<") {
            pr = "-0";
          }
          ret = `${gtlt + M}.${m}.${p}${pr}`;
        } else if (xm) {
          ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
        }
        debug("xRange return", ret);
        return ret;
      });
    };
    var replaceStars = (comp, options) => {
      debug("replaceStars", comp, options);
      return comp.trim().replace(re[t.STAR], "");
    };
    var replaceGTE0 = (comp, options) => {
      debug("replaceGTE0", comp, options);
      return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
    };
    var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
      } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
      } else if (fpr) {
        from = `>=${from}`;
      } else {
        from = `>=${from}${incPr ? "-0" : ""}`;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = `<${+tM + 1}.0.0-0`;
      } else if (isX(tp)) {
        to = `<${tM}.${+tm + 1}.0-0`;
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`;
      } else {
        to = `<=${to}`;
      }
      return `${from} ${to}`.trim();
    };
    var testSet = (set, version, options) => {
      for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version)) {
          return false;
        }
      }
      if (version.prerelease.length && !options.includePrerelease) {
        for (let i = 0; i < set.length; i++) {
          debug(set[i].semver);
          if (set[i].semver === Comparator.ANY) {
            continue;
          }
          if (set[i].semver.prerelease.length > 0) {
            const allowed = set[i].semver;
            if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    };
  }
});

// node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  "node_modules/semver/classes/comparator.js"(exports2, module2) {
    "use strict";
    var ANY = /* @__PURE__ */ Symbol("SemVer ANY");
    var Comparator = class _Comparator {
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        options = parseOptions(options);
        if (comp instanceof _Comparator) {
          if (comp.loose === !!options.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        comp = comp.trim().split(/\s+/).join(" ");
        debug("comparator", comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = "";
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug("comp", this);
      }
      parse(comp) {
        const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        const m = comp.match(r);
        if (!m) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m[1] !== void 0 ? m[1] : "";
        if (this.operator === "=") {
          this.operator = "";
        }
        if (!m[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version) {
        debug("Comparator.test", version, this.options.loose);
        if (this.semver === ANY || version === ANY) {
          return true;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof _Comparator)) {
          throw new TypeError("a Comparator is required");
        }
        if (this.operator === "") {
          if (this.value === "") {
            return true;
          }
          return new Range(comp.value, options).test(this.value);
        } else if (comp.operator === "") {
          if (comp.value === "") {
            return true;
          }
          return new Range(this.value, options).test(comp.semver);
        }
        options = parseOptions(options);
        if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
          return false;
        }
        if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
          return false;
        }
        if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
          return true;
        }
        if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
          return true;
        }
        if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
          return true;
        }
        if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
          return true;
        }
        if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
          return true;
        }
        return false;
      }
    };
    module2.exports = Comparator;
    var parseOptions = require_parse_options();
    var { safeRe: re, t } = require_re();
    var cmp = require_cmp();
    var debug = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  }
});

// node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  "node_modules/semver/functions/satisfies.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var satisfies = (version, range, options) => {
      try {
        range = new Range(range, options);
      } catch (er) {
        return false;
      }
      return range.test(version);
    };
    module2.exports = satisfies;
  }
});

// node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  "node_modules/semver/ranges/to-comparators.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var toComparators = (range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
    module2.exports = toComparators;
  }
});

// node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  "node_modules/semver/ranges/max-satisfying.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var maxSatisfying = (versions, range, options) => {
      let max = null;
      let maxSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!max || maxSV.compare(v) === -1) {
            max = v;
            maxSV = new SemVer(max, options);
          }
        }
      });
      return max;
    };
    module2.exports = maxSatisfying;
  }
});

// node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  "node_modules/semver/ranges/min-satisfying.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var minSatisfying = (versions, range, options) => {
      let min = null;
      let minSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!min || minSV.compare(v) === 1) {
            min = v;
            minSV = new SemVer(min, options);
          }
        }
      });
      return min;
    };
    module2.exports = minSatisfying;
  }
});

// node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  "node_modules/semver/ranges/min-version.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var gt = require_gt();
    var minVersion = (range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer("0.0.0");
      if (range.test(minver)) {
        return minver;
      }
      minver = new SemVer("0.0.0-0");
      if (range.test(minver)) {
        return minver;
      }
      minver = null;
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let setMin = null;
        comparators.forEach((comparator) => {
          const compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case ">":
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            /* fallthrough */
            case "":
            case ">=":
              if (!setMin || gt(compver, setMin)) {
                setMin = compver;
              }
              break;
            case "<":
            case "<=":
              break;
            /* istanbul ignore next */
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        });
        if (setMin && (!minver || gt(minver, setMin))) {
          minver = setMin;
        }
      }
      if (minver && range.test(minver)) {
        return minver;
      }
      return null;
    };
    module2.exports = minVersion;
  }
});

// node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  "node_modules/semver/ranges/valid.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var validRange = (range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch (er) {
        return null;
      }
    };
    module2.exports = validRange;
  }
});

// node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  "node_modules/semver/ranges/outside.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var Range = require_range();
    var satisfies = require_satisfies();
    var gt = require_gt();
    var lt = require_lt();
    var lte = require_lte();
    var gte = require_gte();
    var outside = (version, range, hilo, options) => {
      version = new SemVer(version, options);
      range = new Range(range, options);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt;
          ltefn = lte;
          ltfn = lt;
          comp = ">";
          ecomp = ">=";
          break;
        case "<":
          gtfn = lt;
          ltefn = gte;
          ltfn = gt;
          comp = "<";
          ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version, range, options)) {
        return false;
      }
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let high = null;
        let low = null;
        comparators.forEach((comparator) => {
          if (comparator.semver === ANY) {
            comparator = new Comparator(">=0.0.0");
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, options)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, options)) {
            low = comparator;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
          return false;
        }
      }
      return true;
    };
    module2.exports = outside;
  }
});

// node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  "node_modules/semver/ranges/gtr.js"(exports2, module2) {
    "use strict";
    var outside = require_outside();
    var gtr = (version, range, options) => outside(version, range, ">", options);
    module2.exports = gtr;
  }
});

// node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  "node_modules/semver/ranges/ltr.js"(exports2, module2) {
    "use strict";
    var outside = require_outside();
    var ltr = (version, range, options) => outside(version, range, "<", options);
    module2.exports = ltr;
  }
});

// node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  "node_modules/semver/ranges/intersects.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var intersects = (r1, r2, options) => {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2, options);
    };
    module2.exports = intersects;
  }
});

// node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  "node_modules/semver/ranges/simplify.js"(exports2, module2) {
    "use strict";
    var satisfies = require_satisfies();
    var compare = require_compare();
    module2.exports = (versions, range, options) => {
      const set = [];
      let first = null;
      let prev = null;
      const v = versions.sort((a, b) => compare(a, b, options));
      for (const version of v) {
        const included = satisfies(version, range, options);
        if (included) {
          prev = version;
          if (!first) {
            first = version;
          }
        } else {
          if (prev) {
            set.push([first, prev]);
          }
          prev = null;
          first = null;
        }
      }
      if (first) {
        set.push([first, null]);
      }
      const ranges = [];
      for (const [min, max] of set) {
        if (min === max) {
          ranges.push(min);
        } else if (!max && min === v[0]) {
          ranges.push("*");
        } else if (!max) {
          ranges.push(`>=${min}`);
        } else if (min === v[0]) {
          ranges.push(`<=${max}`);
        } else {
          ranges.push(`${min} - ${max}`);
        }
      }
      const simplified = ranges.join(" || ");
      const original = typeof range.raw === "string" ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  }
});

// node_modules/semver/ranges/subset.js
var require_subset = __commonJS({
  "node_modules/semver/ranges/subset.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var satisfies = require_satisfies();
    var compare = require_compare();
    var subset = (sub, dom, options = {}) => {
      if (sub === dom) {
        return true;
      }
      sub = new Range(sub, options);
      dom = new Range(dom, options);
      let sawNonNull = false;
      OUTER: for (const simpleSub of sub.set) {
        for (const simpleDom of dom.set) {
          const isSub = simpleSubset(simpleSub, simpleDom, options);
          sawNonNull = sawNonNull || isSub !== null;
          if (isSub) {
            continue OUTER;
          }
        }
        if (sawNonNull) {
          return false;
        }
      }
      return true;
    };
    var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
    var minimumVersion = [new Comparator(">=0.0.0")];
    var simpleSubset = (sub, dom, options) => {
      if (sub === dom) {
        return true;
      }
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY) {
          return true;
        } else if (options.includePrerelease) {
          sub = minimumVersionWithPreRelease;
        } else {
          sub = minimumVersion;
        }
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options.includePrerelease) {
          return true;
        } else {
          dom = minimumVersion;
        }
      }
      const eqSet = /* @__PURE__ */ new Set();
      let gt, lt;
      for (const c of sub) {
        if (c.operator === ">" || c.operator === ">=") {
          gt = higherGT(gt, c, options);
        } else if (c.operator === "<" || c.operator === "<=") {
          lt = lowerLT(lt, c, options);
        } else {
          eqSet.add(c.semver);
        }
      }
      if (eqSet.size > 1) {
        return null;
      }
      let gtltComp;
      if (gt && lt) {
        gtltComp = compare(gt.semver, lt.semver, options);
        if (gtltComp > 0) {
          return null;
        } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
          return null;
        }
      }
      for (const eq of eqSet) {
        if (gt && !satisfies(eq, String(gt), options)) {
          return null;
        }
        if (lt && !satisfies(eq, String(lt), options)) {
          return null;
        }
        for (const c of dom) {
          if (!satisfies(eq, String(c), options)) {
            return false;
          }
        }
        return true;
      }
      let higher, lower;
      let hasDomLT, hasDomGT;
      let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
      let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
      if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
        needDomLTPre = false;
      }
      for (const c of dom) {
        hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
        hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
        if (gt) {
          if (needDomGTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
              needDomGTPre = false;
            }
          }
          if (c.operator === ">" || c.operator === ">=") {
            higher = higherGT(gt, c, options);
            if (higher === c && higher !== gt) {
              return false;
            }
          } else if (gt.operator === ">=" && !c.test(gt.semver)) {
            return false;
          }
        }
        if (lt) {
          if (needDomLTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
              needDomLTPre = false;
            }
          }
          if (c.operator === "<" || c.operator === "<=") {
            lower = lowerLT(lt, c, options);
            if (lower === c && lower !== lt) {
              return false;
            }
          } else if (lt.operator === "<=" && !c.test(lt.semver)) {
            return false;
          }
        }
        if (!c.operator && (lt || gt) && gtltComp !== 0) {
          return false;
        }
      }
      if (gt && hasDomLT && !lt && gtltComp !== 0) {
        return false;
      }
      if (lt && hasDomGT && !gt && gtltComp !== 0) {
        return false;
      }
      if (needDomGTPre || needDomLTPre) {
        return false;
      }
      return true;
    };
    var higherGT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
    };
    var lowerLT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
    };
    module2.exports = subset;
  }
});

// node_modules/semver/index.js
var require_semver2 = __commonJS({
  "node_modules/semver/index.js"(exports2, module2) {
    "use strict";
    var internalRe = require_re();
    var constants = require_constants();
    var SemVer = require_semver();
    var identifiers = require_identifiers();
    var parse = require_parse();
    var valid = require_valid();
    var clean = require_clean();
    var inc = require_inc();
    var diff = require_diff();
    var major = require_major();
    var minor = require_minor();
    var patch = require_patch();
    var prerelease = require_prerelease();
    var compare = require_compare();
    var rcompare = require_rcompare();
    var compareLoose = require_compare_loose();
    var compareBuild = require_compare_build();
    var sort = require_sort();
    var rsort = require_rsort();
    var gt = require_gt();
    var lt = require_lt();
    var eq = require_eq();
    var neq = require_neq();
    var gte = require_gte();
    var lte = require_lte();
    var cmp = require_cmp();
    var coerce = require_coerce();
    var truncate = require_truncate();
    var Comparator = require_comparator();
    var Range = require_range();
    var satisfies = require_satisfies();
    var toComparators = require_to_comparators();
    var maxSatisfying = require_max_satisfying();
    var minSatisfying = require_min_satisfying();
    var minVersion = require_min_version();
    var validRange = require_valid2();
    var outside = require_outside();
    var gtr = require_gtr();
    var ltr = require_ltr();
    var intersects = require_intersects();
    var simplifyRange = require_simplify();
    var subset = require_subset();
    module2.exports = {
      parse,
      valid,
      clean,
      inc,
      diff,
      major,
      minor,
      patch,
      prerelease,
      compare,
      rcompare,
      compareLoose,
      compareBuild,
      sort,
      rsort,
      gt,
      lt,
      eq,
      neq,
      gte,
      lte,
      cmp,
      coerce,
      truncate,
      Comparator,
      Range,
      satisfies,
      toComparators,
      maxSatisfying,
      minSatisfying,
      minVersion,
      validRange,
      outside,
      gtr,
      ltr,
      intersects,
      simplifyRange,
      subset,
      SemVer,
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
      RELEASE_TYPES: constants.RELEASE_TYPES,
      compareIdentifiers: identifiers.compareIdentifiers,
      rcompareIdentifiers: identifiers.rcompareIdentifiers
    };
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/patchers/aws_p.js
var require_aws_p = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/patchers/aws_p.js"(exports2, module2) {
    "use strict";
    var semver = require_semver2();
    var Aws = require_aws();
    var contextUtils = require_context_utils();
    var Utils = require_utils();
    var logger2 = require_logger();
    var minVersion = "2.7.15";
    var throttledErrorDefault = function throttledErrorDefault2() {
      return false;
    };
    var captureAWS2 = function captureAWS3(awssdk) {
      if (!semver.gte(awssdk.VERSION, minVersion)) {
        throw new Error("AWS SDK version " + minVersion + " or greater required.");
      }
      for (var prop in awssdk) {
        if (awssdk[prop].serviceIdentifier) {
          var Service = awssdk[prop];
          Service.prototype.customizeRequests(captureAWSRequest);
        }
      }
      return awssdk;
    };
    var captureAWSClient2 = function captureAWSClient3(service) {
      service.customizeRequests(captureAWSRequest);
      return service;
    };
    function captureAWSRequest(req) {
      var parent = contextUtils.resolveSegment(contextUtils.resolveManualSegmentParams(req.params));
      if (!parent) {
        var output = this.serviceIdentifier + "." + req.operation;
        if (!contextUtils.isAutomaticMode()) {
          logger2.getLogger().info("Call " + output + ' requires a segment object on the request params as "XRaySegment" for tracing in manual mode. Ignoring.');
        } else {
          logger2.getLogger().info("Call " + output + " is missing the sub/segment context for automatic mode. Ignoring.");
        }
        return req;
      }
      var throttledError = this.throttledError || throttledErrorDefault;
      var stack = new Error().stack;
      let subsegment;
      if (parent.notTraced) {
        subsegment = parent.addNewSubsegmentWithoutSampling(this.serviceIdentifier);
      } else {
        subsegment = parent.addNewSubsegment(this.serviceIdentifier);
      }
      var traceId = parent.segment ? parent.segment.trace_id : parent.trace_id;
      const data = parent.segment ? parent.segment.additionalTraceData : parent.additionalTraceData;
      var buildListener = function(req2) {
        if (parent.noOp) {
          return;
        }
        let traceHeader = "Root=" + traceId + ";Parent=" + subsegment.id + ";Sampled=" + (subsegment.notTraced ? "0" : "1");
        if (data != null) {
          for (const [key, value] of Object.entries(data)) {
            traceHeader += ";" + key + "=" + value;
          }
        }
        req2.httpRequest.headers["X-Amzn-Trace-Id"] = traceHeader;
      };
      var completeListener = function(res) {
        subsegment.addAttribute("namespace", "aws");
        subsegment.addAttribute("aws", new Aws(res, subsegment.name));
        var httpRes = res.httpResponse;
        if (httpRes) {
          subsegment.addAttribute("http", new HttpResponse(httpRes));
          if (httpRes.statusCode === 429 || res.error && throttledError(res.error)) {
            subsegment.addThrottleFlag();
          }
        }
        if (res.error) {
          var err = { message: res.error.message, name: res.error.code, stack };
          if (httpRes && httpRes.statusCode) {
            if (Utils.getCauseTypeFromHttpStatus(httpRes.statusCode) == "error") {
              subsegment.addErrorFlag();
            }
            subsegment.close(err, true);
          } else {
            subsegment.close(err);
          }
        } else {
          if (httpRes && httpRes.statusCode) {
            var cause = Utils.getCauseTypeFromHttpStatus(httpRes.statusCode);
            if (cause) {
              subsegment[cause] = true;
            }
          }
          subsegment.close();
        }
      };
      req.on("beforePresign", function(req2) {
        parent.removeSubsegment(subsegment);
        parent.decrementCounter();
        req2.removeListener("build", buildListener);
        req2.removeListener("complete", completeListener);
      });
      req.on("build", buildListener).on("complete", completeListener);
      if (!req.__send) {
        req.__send = req.send;
        req.send = function(callback) {
          if (contextUtils.isAutomaticMode()) {
            var session = contextUtils.getNamespace();
            session.run(function() {
              contextUtils.setSegment(subsegment);
              req.__send(callback);
            });
          } else {
            req.__send(callback);
          }
        };
      }
    }
    function HttpResponse(res) {
      this.init(res);
    }
    HttpResponse.prototype.init = function init(res) {
      this.response = {
        status: res.statusCode || ""
      };
      if (res.headers && res.headers["content-length"]) {
        this.response.content_length = res.headers["content-length"];
      }
    };
    module2.exports.captureAWSClient = captureAWSClient2;
    module2.exports.captureAWS = captureAWS2;
  }
});

// node_modules/@smithy/service-error-classification/dist-cjs/index.js
var require_dist_cjs = __commonJS({
  "node_modules/@smithy/service-error-classification/dist-cjs/index.js"(exports2, module2) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __name = (target, value) => __defProp2(target, "name", { value, configurable: true });
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS2 = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var src_exports = {};
    __export2(src_exports, {
      isClockSkewCorrectedError: () => isClockSkewCorrectedError,
      isClockSkewError: () => isClockSkewError,
      isRetryableByTrait: () => isRetryableByTrait,
      isServerError: () => isServerError,
      isThrottlingError: () => isThrottlingError,
      isTransientError: () => isTransientError
    });
    module2.exports = __toCommonJS2(src_exports);
    var CLOCK_SKEW_ERROR_CODES = [
      "AuthFailure",
      "InvalidSignatureException",
      "RequestExpired",
      "RequestInTheFuture",
      "RequestTimeTooSkewed",
      "SignatureDoesNotMatch"
    ];
    var THROTTLING_ERROR_CODES = [
      "BandwidthLimitExceeded",
      "EC2ThrottledException",
      "LimitExceededException",
      "PriorRequestNotComplete",
      "ProvisionedThroughputExceededException",
      "RequestLimitExceeded",
      "RequestThrottled",
      "RequestThrottledException",
      "SlowDown",
      "ThrottledException",
      "Throttling",
      "ThrottlingException",
      "TooManyRequestsException",
      "TransactionInProgressException"
      // DynamoDB
    ];
    var TRANSIENT_ERROR_CODES = ["TimeoutError", "RequestTimeout", "RequestTimeoutException"];
    var TRANSIENT_ERROR_STATUS_CODES = [500, 502, 503, 504];
    var NODEJS_TIMEOUT_ERROR_CODES = ["ECONNRESET", "ECONNREFUSED", "EPIPE", "ETIMEDOUT"];
    var isRetryableByTrait = /* @__PURE__ */ __name((error) => error.$retryable !== void 0, "isRetryableByTrait");
    var isClockSkewError = /* @__PURE__ */ __name((error) => CLOCK_SKEW_ERROR_CODES.includes(error.name), "isClockSkewError");
    var isClockSkewCorrectedError = /* @__PURE__ */ __name((error) => {
      var _a;
      return (_a = error.$metadata) == null ? void 0 : _a.clockSkewCorrected;
    }, "isClockSkewCorrectedError");
    var isThrottlingError = /* @__PURE__ */ __name((error) => {
      var _a, _b;
      return ((_a = error.$metadata) == null ? void 0 : _a.httpStatusCode) === 429 || THROTTLING_ERROR_CODES.includes(error.name) || ((_b = error.$retryable) == null ? void 0 : _b.throttling) == true;
    }, "isThrottlingError");
    var isTransientError = /* @__PURE__ */ __name((error) => {
      var _a;
      return isClockSkewCorrectedError(error) || TRANSIENT_ERROR_CODES.includes(error.name) || NODEJS_TIMEOUT_ERROR_CODES.includes((error == null ? void 0 : error.code) || "") || TRANSIENT_ERROR_STATUS_CODES.includes(((_a = error.$metadata) == null ? void 0 : _a.httpStatusCode) || 0);
    }, "isTransientError");
    var isServerError = /* @__PURE__ */ __name((error) => {
      var _a;
      if (((_a = error.$metadata) == null ? void 0 : _a.httpStatusCode) !== void 0) {
        const statusCode = error.$metadata.httpStatusCode;
        if (500 <= statusCode && statusCode <= 599 && !isTransientError(error)) {
          return true;
        }
        return false;
      }
      return false;
    }, "isServerError");
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/patchers/aws3_p.js
var require_aws3_p = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/patchers/aws3_p.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.captureAWSClient = void 0;
    var service_error_classification_1 = require_dist_cjs();
    var aws_1 = __importDefault(require_aws());
    var querystring_1 = require("querystring");
    var subsegment_1 = __importDefault(require_subsegment());
    var contextUtils = require_context_utils();
    var logger2 = require_logger();
    var { safeParseInt } = require_utils();
    var utils_1 = require_utils();
    var XRAY_PLUGIN_NAME = "XRaySDKInstrumentation";
    var buildAttributesFromMetadata = async (service, operation, region, commandInput, res, error) => {
      var _a, _b, _c;
      const { extendedRequestId, requestId, httpStatusCode: statusCode, attempts } = ((_a = res === null || res === void 0 ? void 0 : res.output) === null || _a === void 0 ? void 0 : _a.$metadata) || (error === null || error === void 0 ? void 0 : error.$metadata);
      const aws = new aws_1.default({
        extendedRequestId,
        requestId,
        retryCount: attempts,
        data: res === null || res === void 0 ? void 0 : res.output,
        request: {
          operation,
          params: commandInput,
          httpRequest: {
            region,
            statusCode
          }
        }
      }, service);
      const http2 = {};
      if (statusCode) {
        http2.response = {};
        http2.response.status = statusCode;
      }
      if (((_b = res === null || res === void 0 ? void 0 : res.response) === null || _b === void 0 ? void 0 : _b.headers) && ((_c = res === null || res === void 0 ? void 0 : res.response) === null || _c === void 0 ? void 0 : _c.headers["content-length"]) !== void 0) {
        if (!http2.response) {
          http2.response = {};
        }
        http2.response.content_length = safeParseInt(res.response.headers["content-length"]);
      }
      return [aws, http2];
    };
    function addFlags(http2, subsegment, err) {
      var _a, _b, _c;
      if (err && (0, service_error_classification_1.isThrottlingError)(err)) {
        subsegment.addThrottleFlag();
      } else if (safeParseInt((_a = http2.response) === null || _a === void 0 ? void 0 : _a.status) === 429 || safeParseInt((_b = err === null || err === void 0 ? void 0 : err.$metadata) === null || _b === void 0 ? void 0 : _b.httpStatusCode) === 429) {
        subsegment.addThrottleFlag();
      }
      const cause = (0, utils_1.getCauseTypeFromHttpStatus)(safeParseInt((_c = http2.response) === null || _c === void 0 ? void 0 : _c.status));
      if (cause === "fault") {
        subsegment.addFaultFlag();
      } else if (cause === "error") {
        subsegment.addErrorFlag();
      }
    }
    var getXRayMiddleware = (config, manualSegment) => (next, context) => async (args) => {
      var _a;
      const segment = contextUtils.isAutomaticMode() ? contextUtils.resolveSegment() : manualSegment;
      const { clientName, commandName } = context;
      const commandInput = (_a = args === null || args === void 0 ? void 0 : args.input) !== null && _a !== void 0 ? _a : {};
      const commandOperation = commandName.slice(0, -7);
      const operation = commandOperation.charAt(0).toLowerCase() + commandOperation.slice(1);
      const service = clientName.slice(0, -6);
      if (!segment) {
        const output = service + "." + operation;
        if (!contextUtils.isAutomaticMode()) {
          logger2.getLogger().info("Call " + output + " requires a segment object passed to captureAWSv3Client for tracing in manual mode. Ignoring.");
        } else {
          logger2.getLogger().info("Call " + output + " is missing the sub/segment context for automatic mode. Ignoring.");
        }
        return next(args);
      }
      let subsegment;
      if (segment.notTraced) {
        subsegment = segment.addNewSubsegmentWithoutSampling(service);
      } else {
        subsegment = segment.addNewSubsegment(service);
      }
      subsegment.addAttribute("namespace", "aws");
      const parent = segment instanceof subsegment_1.default ? segment.segment : segment;
      const data = parent.segment ? parent.segment.additionalTraceData : parent.additionalTraceData;
      let traceHeader = (0, querystring_1.stringify)({
        Root: parent.trace_id,
        Parent: subsegment.id,
        Sampled: subsegment.notTraced ? "0" : "1"
      }, ";");
      if (data != null) {
        for (const [key, value] of Object.entries(data)) {
          traceHeader += ";" + key + "=" + value;
        }
      }
      if (!segment.noOp) {
        args.request.headers["X-Amzn-Trace-Id"] = traceHeader;
      }
      let res;
      try {
        res = await next(args);
        if (!res) {
          throw new Error("Failed to get response from instrumented AWS Client.");
        }
        const [aws, http2] = await buildAttributesFromMetadata(service, operation, await config.region(), commandInput, res, null);
        subsegment.addAttribute("aws", aws);
        subsegment.addAttribute("http", http2);
        addFlags(http2, subsegment);
        subsegment.close();
        return res;
      } catch (err) {
        if (err.$metadata) {
          const [aws, http2] = await buildAttributesFromMetadata(service, operation, await config.region(), commandInput, null, err);
          subsegment.addAttribute("aws", aws);
          subsegment.addAttribute("http", http2);
          addFlags(http2, subsegment, err);
        }
        const errObj = { message: err.message, name: err.name, stack: err.stack || new Error().stack };
        subsegment.close(errObj, true);
        throw err;
      }
    };
    var xRayMiddlewareOptions = {
      name: XRAY_PLUGIN_NAME,
      step: "build"
    };
    var getXRayPlugin = (config, manualSegment) => ({
      applyToStack: (stack) => {
        stack.add(getXRayMiddleware(config, manualSegment), xRayMiddlewareOptions);
      }
    });
    function captureAWSClient2(client2, manualSegment) {
      client2.middlewareStack.remove(XRAY_PLUGIN_NAME);
      client2.middlewareStack.use(getXRayPlugin(client2.config, manualSegment));
      return client2;
    }
    exports2.captureAWSClient = captureAWSClient2;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/patchers/http_p.js
var require_http_p = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/patchers/http_p.js"(exports2, module2) {
    "use strict";
    var url = require("url");
    var contextUtils = require_context_utils();
    var Utils = require_utils();
    var logger2 = require_logger();
    var events = require("events");
    var captureHTTPsGlobal2 = function captureHTTPsGlobal3(module3, downstreamXRayEnabled, subsegmentCallback) {
      if (!module3.__request) {
        enableCapture(module3, downstreamXRayEnabled, subsegmentCallback);
      }
    };
    var captureHTTPs = function captureHTTPs2(module3, downstreamXRayEnabled, subsegmentCallback) {
      if (module3.__request) {
        return module3;
      }
      var tracedModule = {};
      Object.keys(module3).forEach(function(val) {
        tracedModule[val] = module3[val];
      });
      enableCapture(tracedModule, downstreamXRayEnabled, subsegmentCallback);
      return tracedModule;
    };
    function enableCapture(module3, downstreamXRayEnabled, subsegmentCallback) {
      function captureOutgoingHTTPs(baseFunc, ...args) {
        let options;
        let callback;
        let hasUrl;
        let urlObj;
        let arg0 = args[0];
        if (typeof args[1] === "object") {
          hasUrl = true;
          urlObj = typeof arg0 === "string" ? new url.URL(arg0) : arg0;
          options = args[1], callback = args[2];
        } else {
          hasUrl = false;
          options = arg0;
          callback = args[1];
        }
        if (!options || options.headers && options.headers["X-Amzn-Trace-Id"]) {
          return baseFunc(...args);
        }
        if (typeof options === "string") {
          options = new url.URL(options);
        }
        if (!hasUrl) {
          urlObj = options;
        }
        const parent = contextUtils.resolveSegment(contextUtils.resolveManualSegmentParams(options));
        const hostname = options.hostname || options.host || urlObj.hostname || urlObj.host || "Unknown host";
        if (!parent) {
          let output = "[ host: " + hostname;
          output = options.method ? output + ", method: " + options.method : output;
          output += ", path: " + (urlObj.pathname || Utils.stripQueryStringFromPath(options.path)) + " ]";
          if (!contextUtils.isAutomaticMode()) {
            logger2.getLogger().info("Options for request " + output + ' requires a segment object on the options params as "XRaySegment" for tracing in manual mode. Ignoring.');
          } else {
            logger2.getLogger().info("Options for request " + output + " is missing the sub/segment context for automatic mode. Ignoring.");
          }
          return baseFunc(...args);
        }
        let subsegment;
        if (parent.notTraced) {
          subsegment = parent.addNewSubsegmentWithoutSampling(hostname);
        } else {
          subsegment = parent.addNewSubsegment(hostname);
        }
        const root = parent.segment ? parent.segment : parent;
        subsegment.namespace = "remote";
        if (!options.headers) {
          options.headers = {};
        }
        if (!parent.noOp) {
          options.headers["X-Amzn-Trace-Id"] = "Root=" + root.trace_id + ";Parent=" + subsegment.id + ";Sampled=" + (subsegment.notTraced ? "0" : "1");
        }
        const errorCapturer = function errorCapturer2(e) {
          if (subsegmentCallback) {
            subsegmentCallback(subsegment, this, null, e);
          }
          if (subsegment.http && subsegment.http.response) {
            if (Utils.getCauseTypeFromHttpStatus(subsegment.http.response.status) === "error") {
              subsegment.addErrorFlag();
            }
            subsegment.close(e, true);
          } else {
            const madeItToDownstream = e.code !== "ECONNREFUSED";
            subsegment.addRemoteRequestData(this, null, madeItToDownstream && downstreamXRayEnabled);
            subsegment.close(e);
          }
        };
        const optionsCopy = Utils.objectWithoutProperties(options, ["Segment"], true);
        let req = baseFunc(...hasUrl ? [arg0, optionsCopy] : [options], function(res) {
          res.on("end", function() {
            if (subsegmentCallback) {
              subsegmentCallback(subsegment, this.req, res);
            }
            if (res.statusCode === 429) {
              subsegment.addThrottleFlag();
            }
            const cause = Utils.getCauseTypeFromHttpStatus(res.statusCode);
            if (cause) {
              subsegment[cause] = true;
            }
            subsegment.addRemoteRequestData(res.req, res, !!downstreamXRayEnabled);
            subsegment.close();
          });
          if (typeof callback === "function") {
            if (contextUtils.isAutomaticMode()) {
              const session = contextUtils.getNamespace();
              session.run(function() {
                contextUtils.setSegment(subsegment);
                callback(res);
              });
            } else {
              callback(res);
            }
          } else if (res.req && res.req.listenerCount("response") === 0) {
            res.resume();
          }
        });
        req.on(events.errorMonitor || "error", errorCapturer);
        return req;
      }
      module3.__request = module3.request;
      function captureHTTPsRequest(...args) {
        return captureOutgoingHTTPs(module3.__request, ...args);
      }
      module3.__get = module3.get;
      function captureHTTPsGet(...args) {
        return captureOutgoingHTTPs(module3.__get, ...args);
      }
      Object.defineProperties(module3, {
        request: { value: captureHTTPsRequest, configurable: true, enumerable: true, writable: true },
        get: { value: captureHTTPsGet, configurable: true, enumerable: true, writable: true }
      });
    }
    module2.exports.captureHTTPsGlobal = captureHTTPsGlobal2;
    module2.exports.captureHTTPs = captureHTTPs;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/patchers/promise_p.js
var require_promise_p = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/patchers/promise_p.js"(exports2, module2) {
    "use strict";
    var contextUtils = require_context_utils();
    var originalThen = /* @__PURE__ */ Symbol("original then");
    var originalCatch = /* @__PURE__ */ Symbol("original catch");
    function patchPromise(Promise2) {
      const then = Promise2.prototype.then;
      if (!then[originalThen]) {
        Promise2.prototype.then = function(onFulfilled, onRejected) {
          if (contextUtils.isAutomaticMode() && tryGetCurrentSegment()) {
            const ns = contextUtils.getNamespace();
            onFulfilled = onFulfilled && ns.bind(onFulfilled);
            onRejected = onRejected && ns.bind(onRejected);
          }
          return then.call(this, onFulfilled, onRejected);
        };
        Promise2.prototype.then[originalThen] = then;
      }
      const origCatch = Promise2.prototype.catch;
      if (origCatch && !origCatch[originalCatch]) {
        Promise2.prototype.catch = function(onRejected) {
          if (contextUtils.isAutomaticMode() && tryGetCurrentSegment()) {
            const ns = contextUtils.getNamespace();
            onRejected = onRejected && ns.bind(onRejected);
          }
          return origCatch.call(this, onRejected);
        };
        Promise2.prototype.catch[originalCatch] = origCatch;
      }
    }
    function unpatchPromise(Promise2) {
      const then = Promise2.prototype.then;
      if (then[originalThen]) {
        Promise2.prototype.then = then[originalThen];
      }
      const origCatch = Promise2.prototype.catch;
      if (origCatch && origCatch[originalCatch]) {
        Promise2.prototype.catch = origCatch[originalCatch];
      }
    }
    function tryGetCurrentSegment() {
      try {
        return contextUtils.getSegment();
      } catch (e) {
        return void 0;
      }
    }
    function capturePromise() {
      patchPromise(Promise);
    }
    function uncapturePromise() {
      unpatchPromise(Promise);
    }
    capturePromise.patchThirdPartyPromise = patchPromise;
    module2.exports.capturePromise = capturePromise;
    module2.exports.uncapturePromise = uncapturePromise;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/database/sql_data.js
var require_sql_data = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/database/sql_data.js"(exports2, module2) {
    "use strict";
    function SqlData(databaseVer, driverVer, user, url, queryType) {
      this.init(databaseVer, driverVer, user, url, queryType);
    }
    SqlData.prototype.init = function init(databaseVer, driverVer, user, url, queryType) {
      if (databaseVer) {
        this.database_version = databaseVer;
      }
      if (driverVer) {
        this.driver_version = driverVer;
      }
      if (queryType) {
        this.preparation = queryType;
      }
      this.url = url;
      this.user = user;
    };
    module2.exports = SqlData;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/aws-xray.js
var require_aws_xray = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/aws-xray.js"(exports2, module2) {
    "use strict";
    var contextUtils = require_context_utils();
    var logging = require_logger();
    var segmentUtils = require_segment_utils();
    var utils = require_utils();
    var LambdaEnv = require_aws_lambda();
    var pkginfo = {};
    try {
      pkginfo = require_package();
    } catch (err) {
      logging.getLogger().debug("Failed to load SDK data:", err);
    }
    var UNKNOWN = "unknown";
    var AWSXRay = {
      /**
       * @memberof AWSXRay
       * @type {object}
       * @namespace AWSXRay.plugins
       */
      plugins: {
        /**
         * Exposes the AWS EC2 plugin.
         * @memberof AWSXRay.plugins
         */
        EC2Plugin: require_ec2_plugin(),
        /**
         * Exposes the AWS ECS plugin.
         * @memberof AWSXRay.plugins
         */
        ECSPlugin: require_ecs_plugin(),
        /**
         * Exposes the AWS Elastic Beanstalk plugin.
         * @memberof AWSXRay.plugins
         */
        ElasticBeanstalkPlugin: require_elastic_beanstalk_plugin()
      },
      /**
       * Enables use of plugins to capture additional data for segments.
       * @param {Array} plugins - A configurable subset of AWSXRay.plugins.
       * @memberof AWSXRay
       * @see AWSXRay.plugins
       */
      config: function(plugins) {
        var pluginData = {};
        plugins.forEach(function(plugin) {
          plugin.getData(function(data) {
            if (data) {
              for (var attribute in data) {
                pluginData[attribute] = data[attribute];
              }
            }
          });
          segmentUtils.setOrigin(plugin.originName);
          segmentUtils.setPluginData(pluginData);
        });
      },
      /**
       * Overrides the default whitelisting file to specify what params to capture on each AWS Service call.
       * If a service or API is not listed, no additional data is captured.
       * The base whitelisting file can be found at /lib/resources/aws_whitelist.json
       * @param {string|Object} source - The path to the custom whitelist file, or a whitelist source JSON object.
       * @memberof AWSXRay
       */
      setAWSWhitelist: require_aws().setAWSWhitelist,
      /**
       * Appends to the current whitelisting file.
       * In the case of a duplicate service API listed, the new source will override the previous values.
       * @param {string|Object} source - The path to the custom whitelist file, or a whitelist source JSON object.
       * @memberof AWSXRay
       */
      appendAWSWhitelist: require_aws().appendAWSWhitelist,
      /**
       * Overrides the default streaming threshold (100).
       * The threshold represents the maximum number of subsegments on a single segment before
       * the SDK begins to send the completed subsegments out of band of the main segment.
       * Reduce this threshold if you see the 'Segment too large to send' error.
       * @param {number} threshold - The new threshold to use.
       * @memberof AWSXRay
       */
      setStreamingThreshold: segmentUtils.setStreamingThreshold,
      /**
       * Set your own logger for the SDK.
       * @param {Object} logger - A logger which responds to debug/info/warn/error calls.
       * @memberof AWSXRay
       */
      setLogger: logging.setLogger,
      /**
       * Gets the set logger for the SDK.
       * @memberof AWSXRay
       */
      getLogger: logging.getLogger,
      /**
       * Configures the address and port the daemon is expected to be on.
       * @param {string} address - Address of the daemon the segments should be sent to.  Expects 'x.x.x.x', ':yyyy' or 'x.x.x.x:yyyy' IPv4 formats.
       * @module DaemonConfig
       * @memberof AWSXRay
       * @function
       * @see module:DaemonConfig.setDaemonAddress
       */
      setDaemonAddress: require_daemon_config().setDaemonAddress,
      /**
       * @param {string} name - The name of the new subsegment.
       * @param {function} fcn - The function conext to wrap.
       * @param {Segment|Subsegment} [parent] - The parent for the new subsegment, for manual mode.
       * @memberof AWSXRay
       * @function
       * @see module:capture.captureFunc
       */
      captureFunc: require_capture().captureFunc,
      /**
       * @param {string} name - The name of the new subsegment.
       * @param {function} fcn - The function conext to wrap.
       * @param {Segment|Subsegment} [parent] - The parent for the new subsegment, for manual mode.
       * @memberof AWSXRay
       * @function
       * @see module:capture.captureAsyncFunc
       */
      captureAsyncFunc: require_capture().captureAsyncFunc,
      /**
       * @param {string} name - The name of the new subsegment.
       * @param {function} fcn - The function conext to wrap.
       * @param {Segment|Subsegment} [parent] - The parent for the new subsegment, for manual mode.
       * @memberof AWSXRay
       * @function
       * @see module:capture.captureCallbackFunc
       */
      captureCallbackFunc: require_capture().captureCallbackFunc,
      /**
       * @param {AWS} awssdk - The Javascript AWS SDK.
       * @memberof AWSXRay
       * @function
       * @see module:aws_p.captureAWS
       */
      captureAWS: require_aws_p().captureAWS,
      /**
       * @param {AWS.Service} service - An instance of a AWS service to wrap.
       * @memberof AWSXRay
       * @function
       * @see module:aws_p.captureAWSClient
       */
      captureAWSClient: require_aws_p().captureAWSClient,
      /**
       * @param {AWSv3.Service} service - An instance of a AWS SDK v3 service to wrap.
       * @param {Segment|Subsegment} segment - Optional segment for manual mode.
       * @memberof AWSXRay
       * @function
       * @see module:aws3_p.captureAWSClient
       */
      captureAWSv3Client: require_aws3_p().captureAWSClient,
      /**
       * @param {http|https} module - The built in Node.js HTTP or HTTPS module.
       * @memberof AWSXRay
       * @function
       * @returns {http|https}
       * @see module:http_p.captureHTTPs
       */
      captureHTTPs: require_http_p().captureHTTPs,
      /**
       * @param {http|https} module - The built in Node.js HTTP or HTTPS module.
       * @memberof AWSXRay
       * @function
       * @see module:http_p.captureHTTPsGlobal
       */
      captureHTTPsGlobal: require_http_p().captureHTTPsGlobal,
      /**
       * @memberof AWSXRay
       * @function
       * @see module:promise_p.capturePromise
       */
      capturePromise: require_promise_p().capturePromise,
      /**
       * Exposes various helper methods.
       * @memberof AWSXRay
       * @function
       * @see module:utils
       */
      utils,
      /**
       * @memberof AWSXRay
       * @type {object}
       * @namespace AWSXRay.database
       */
      database: {
        /**
         * Exposes the SqlData class.
         * @memberof AWSXRay.database
         * @see SqlData
         */
        SqlData: require_sql_data()
      },
      /**
       * Exposes the Middleware Utils class.
       * @memberof AWSXRay
       * @function
       * @see module:mw_utils
       */
      middleware: require_mw_utils(),
      /**
       * Gets the current namespace of the context.
       * Used for supporting functions that can be used in automatic mode.
       * @memberof AWSXRay
       * @function
       * @returns {Segment|Subsegment}
       * @see module:context_utils.getNamespace
       */
      getNamespace: contextUtils.getNamespace,
      /**
       * Resolves the current segment or subsegment, checks manual and automatic modes.
       * Used for supporting functions that can be used in both manual and automatic modes.
       * @memberof AWSXRay
       * @function
       * @returns {Segment|Subsegment}
       * @see module:context_utils.resolveSegment
       */
      resolveSegment: contextUtils.resolveSegment,
      /**
       * Resolves the segment or subsegment given manual mode and params on the call required.
       * @param [Segment|Subsegment] segment - The segment manually provided via params.XraySegment, if provided.
       * @memberof AWSXRay
       * @function
       * @returns {Segment|Subsegment}
       * @see module:context_utils.resolveManualSegmentParams
       */
      resolveManualSegmentParams: contextUtils.resolveManualSegmentParams,
      /**
       * Returns the current segment or subsegment. For use with automatic mode only.
       * @memberof AWSXRay
       * @function
       * @returns {Segment|Subsegment}
       * @see module:context_utils.getSegment
       */
      getSegment: contextUtils.getSegment,
      /**
       * Sets the current segment or subsegment.  For use with automatic mode only.
       * @memberof AWSXRay
       * @function
       * @see module:context_utils.setSegment
       */
      setSegment: contextUtils.setSegment,
      /**
       * Returns true if automatic mode is enabled, otherwise false.
       * @memberof AWSXRay
       * @function
       * @see module:context_utils.isAutomaticMode
       */
      isAutomaticMode: contextUtils.isAutomaticMode,
      /**
       * Enables automatic mode. Automatic mode uses 'cls-hooked'.
       * @see https://github.com/jeff-lewis/cls-hooked
       * @memberof AWSXRay
       * @function
       * @see module:context_utils.enableAutomaticMode
       */
      enableAutomaticMode: contextUtils.enableAutomaticMode,
      /**
       * Disables automatic mode. Current segment or subsegment must be passed manually
       * via the parent optional on captureFunc, captureAsyncFunc etc.
       * @memberof AWSXRay
       * @function
       * @see module:context_utils.enableManualMode
       */
      enableManualMode: contextUtils.enableManualMode,
      /**
       * Sets the context missing strategy.
       * @param {Object} strategy - The strategy to set. This object's contextMissing function will be called whenever trace context is not found.
       */
      setContextMissingStrategy: contextUtils.setContextMissingStrategy,
      /**
       * Exposes the segment class.
       * @memberof AWSXRay
       * @function
       */
      Segment: require_segment(),
      /**
       * Exposes the subsegment class.
       * @memberof AWSXRay
       * @see Subsegment
       */
      Subsegment: require_subsegment(),
      SegmentUtils: segmentUtils
    };
    AWSXRay.middleware.IncomingRequestData = require_incoming_request_data(), (function() {
      var data = {
        runtime: process.release && process.release.name ? process.release.name : UNKNOWN,
        runtime_version: process.version,
        version: process.env.npm_package_version || UNKNOWN,
        name: process.env.npm_package_name || UNKNOWN
      };
      var sdkData = {
        sdk: "X-Ray for Node.js",
        sdk_version: pkginfo.version ? pkginfo.version : UNKNOWN,
        package: pkginfo.name ? pkginfo.name : UNKNOWN
      };
      segmentUtils.setSDKData(sdkData);
      segmentUtils.setServiceData(data);
      if (process.env.LAMBDA_TASK_ROOT) {
        LambdaEnv.init();
      }
    })();
    module2.exports = AWSXRay;
  }
});

// node_modules/aws-xray-sdk-core/dist/lib/index.js
var require_lib = __commonJS({
  "node_modules/aws-xray-sdk-core/dist/lib/index.js"(exports2, module2) {
    "use strict";
    module2.exports = require_aws_xray();
  }
});

// node_modules/twitter-api-v2/dist/cjs/globals.js
var require_globals = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/globals.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.API_ADS_SANDBOX_PREFIX = exports2.API_ADS_PREFIX = exports2.API_V1_1_STREAM_PREFIX = exports2.API_V1_1_UPLOAD_PREFIX = exports2.API_V1_1_PREFIX = exports2.API_V2_LABS_PREFIX = exports2.API_V2_PREFIX = void 0;
    exports2.API_V2_PREFIX = "https://api.x.com/2/";
    exports2.API_V2_LABS_PREFIX = "https://api.x.com/labs/2/";
    exports2.API_V1_1_PREFIX = "https://api.x.com/1.1/";
    exports2.API_V1_1_UPLOAD_PREFIX = "https://upload.x.com/1.1/";
    exports2.API_V1_1_STREAM_PREFIX = "https://stream.x.com/1.1/";
    exports2.API_ADS_PREFIX = "https://ads-api.x.com/12/";
    exports2.API_ADS_SANDBOX_PREFIX = "https://ads-api-sandbox.twitter.com/12/";
  }
});

// node_modules/twitter-api-v2/dist/cjs/paginators/TwitterPaginator.js
var require_TwitterPaginator = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/paginators/TwitterPaginator.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PreviousableTwitterPaginator = exports2.TwitterPaginator = void 0;
    var TwitterPaginator = class {
      // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected
      constructor({ realData, rateLimit, instance, queryParams, sharedParams }) {
        this._maxResultsWhenFetchLast = 100;
        this._realData = realData;
        this._rateLimit = rateLimit;
        this._instance = instance;
        this._queryParams = queryParams;
        this._sharedParams = sharedParams;
      }
      get _isRateLimitOk() {
        if (!this._rateLimit) {
          return true;
        }
        const resetDate = this._rateLimit.reset * 1e3;
        if (resetDate < Date.now()) {
          return true;
        }
        return this._rateLimit.remaining > 0;
      }
      makeRequest(queryParams) {
        return this._instance.get(this.getEndpoint(), queryParams, { fullResponse: true, params: this._sharedParams });
      }
      makeNewInstanceFromResult(result, queryParams) {
        return new this.constructor({
          realData: result.data,
          rateLimit: result.rateLimit,
          instance: this._instance,
          queryParams,
          sharedParams: this._sharedParams
        });
      }
      getEndpoint() {
        return this._endpoint;
      }
      injectQueryParams(maxResults) {
        return {
          ...maxResults ? { max_results: maxResults } : {},
          ...this._queryParams
        };
      }
      /** `false` when there is nothing after the current page: the next request would only fetch the first page again. */
      canRequestNextPage() {
        return this.canFetchNextPage(this._realData);
      }
      /** The current page without its items, that `.next()` gives when there is nothing after it. */
      getEmptyPage() {
        if (Array.isArray(this._realData)) {
          return [];
        }
        const page = { ...this._realData };
        for (const key of Object.keys(page)) {
          if (Array.isArray(page[key])) {
            page[key] = [];
          }
        }
        return page;
      }
      /* ---------------------- */
      /* Real paginator methods */
      /* ---------------------- */
      /**
       * Next page.
       * An empty page if there is no next page.
       */
      async next(maxResults) {
        const queryParams = this.getNextQueryParams(maxResults);
        if (!this.canRequestNextPage()) {
          return this.makeNewInstanceFromResult({ data: this.getEmptyPage(), headers: {}, rateLimit: this._rateLimit }, queryParams);
        }
        const result = await this.makeRequest(queryParams);
        return this.makeNewInstanceFromResult(result, queryParams);
      }
      /**
       * Next page, but store it in current instance.
       * Does nothing if there is no next page.
       */
      async fetchNext(maxResults) {
        const queryParams = this.getNextQueryParams(maxResults);
        if (!this.canRequestNextPage()) {
          return this;
        }
        const result = await this.makeRequest(queryParams);
        await this.refreshInstanceFromResult(result, true);
        return this;
      }
      /**
       * Fetch up to {count} items after current page,
       * as long as rate limit is not hit and Twitter has some results
       */
      async fetchLast(count = Infinity) {
        let queryParams = this.getNextQueryParams(this._maxResultsWhenFetchLast);
        let resultCount = 0;
        while (resultCount < count && this._isRateLimitOk && this.canRequestNextPage()) {
          const response = await this.makeRequest(queryParams);
          await this.refreshInstanceFromResult(response, true);
          resultCount += this.getPageLengthFromRequest(response);
          if (this.isFetchLastOver(response)) {
            break;
          }
          queryParams = this.getNextQueryParams(this._maxResultsWhenFetchLast);
        }
        return this;
      }
      get rateLimit() {
        var _a;
        return { ...(_a = this._rateLimit) !== null && _a !== void 0 ? _a : {} };
      }
      /** Get raw data returned by Twitter API. */
      get data() {
        return this._realData;
      }
      get done() {
        return !this.canFetchNextPage(this._realData);
      }
      /**
       * Iterate over currently fetched items.
       */
      *[Symbol.iterator]() {
        yield* this.getItemArray();
      }
      /**
       * Iterate over items "indefinitely" (until rate limit is hit / they're no more items available)
       * This will **mutate the current instance** and fill data, metas, etc. inside this instance.
       *
       * If you need to handle concurrent requests, or you need to rely on immutability, please use `.fetchAndIterate()` instead.
       */
      async *[Symbol.asyncIterator]() {
        yield* this.getItemArray();
        let paginator = this;
        let canFetchNextPage = this.canFetchNextPage(this._realData);
        while (canFetchNextPage && this._isRateLimitOk && paginator.getItemArray().length > 0) {
          const next = await paginator.next(this._maxResultsWhenFetchLast);
          this.refreshInstanceFromResult({ data: next._realData, headers: {}, rateLimit: next._rateLimit }, true);
          canFetchNextPage = this.canFetchNextPage(next._realData);
          const items = next.getItemArray();
          yield* items;
          paginator = next;
        }
      }
      /**
       * Iterate over items "indefinitely" without modifying the current instance (until rate limit is hit / they're no more items available)
       *
       * This will **NOT** mutate the current instance, meaning that current instance will not inherit from `includes` and `meta` (v2 API only).
       * Use `Symbol.asyncIterator` (`for-await of`) to directly access items with current instance mutation.
       */
      async *fetchAndIterate() {
        for (const item of this.getItemArray()) {
          yield [item, this];
        }
        let paginator = this;
        let canFetchNextPage = this.canFetchNextPage(this._realData);
        while (canFetchNextPage && this._isRateLimitOk && paginator.getItemArray().length > 0) {
          const next = await paginator.next(this._maxResultsWhenFetchLast);
          this.refreshInstanceFromResult({ data: next._realData, headers: {}, rateLimit: next._rateLimit }, true);
          canFetchNextPage = this.canFetchNextPage(next._realData);
          for (const item of next.getItemArray()) {
            yield [item, next];
          }
          this._rateLimit = next._rateLimit;
          paginator = next;
        }
      }
    };
    exports2.TwitterPaginator = TwitterPaginator;
    var PreviousableTwitterPaginator = class extends TwitterPaginator {
      /**
       * Previous page (new tweets)
       */
      async previous(maxResults) {
        const queryParams = this.getPreviousQueryParams(maxResults);
        const result = await this.makeRequest(queryParams);
        return this.makeNewInstanceFromResult(result, queryParams);
      }
      /**
       * Previous page, but in current instance.
       */
      async fetchPrevious(maxResults) {
        const queryParams = this.getPreviousQueryParams(maxResults);
        const result = await this.makeRequest(queryParams);
        await this.refreshInstanceFromResult(result, false);
        return this;
      }
    };
    exports2.PreviousableTwitterPaginator = PreviousableTwitterPaginator;
    exports2.default = TwitterPaginator;
  }
});

// node_modules/twitter-api-v2/dist/cjs/paginators/paginator.v1.js
var require_paginator_v1 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/paginators/paginator.v1.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CursoredV1Paginator = void 0;
    var TwitterPaginator_1 = __importDefault(require_TwitterPaginator());
    var CursoredV1Paginator = class extends TwitterPaginator_1.default {
      getNextQueryParams(maxResults) {
        var _a;
        return {
          ...this._queryParams,
          cursor: (_a = this._realData.next_cursor_str) !== null && _a !== void 0 ? _a : this._realData.next_cursor,
          ...maxResults ? { count: maxResults } : {}
        };
      }
      isFetchLastOver(result) {
        return !this.canFetchNextPage(result.data);
      }
      canFetchNextPage(result) {
        return !this.isNextCursorInvalid(result.next_cursor) || !this.isNextCursorInvalid(result.next_cursor_str);
      }
      isNextCursorInvalid(value) {
        return value === void 0 || value === 0 || value === -1 || value === "0" || value === "-1";
      }
    };
    exports2.CursoredV1Paginator = CursoredV1Paginator;
  }
});

// node_modules/twitter-api-v2/dist/cjs/paginators/dm.paginator.v1.js
var require_dm_paginator_v1 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/paginators/dm.paginator.v1.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WelcomeDmV1Paginator = exports2.DmEventsV1Paginator = void 0;
    var paginator_v1_1 = require_paginator_v1();
    var DmEventsV1Paginator = class extends paginator_v1_1.CursoredV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "direct_messages/events/list.json";
      }
      refreshInstanceFromResult(response, isNextPage) {
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
          this._realData.events.push(...result.events);
          this._realData.next_cursor = result.next_cursor;
        }
      }
      getPageLengthFromRequest(result) {
        return result.data.events.length;
      }
      getItemArray() {
        return this.events;
      }
      /**
       * Events returned by paginator.
       */
      get events() {
        return this._realData.events;
      }
    };
    exports2.DmEventsV1Paginator = DmEventsV1Paginator;
    var WelcomeDmV1Paginator = class extends paginator_v1_1.CursoredV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "direct_messages/welcome_messages/list.json";
      }
      refreshInstanceFromResult(response, isNextPage) {
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
          this._realData.welcome_messages.push(...result.welcome_messages);
          this._realData.next_cursor = result.next_cursor;
        }
      }
      getPageLengthFromRequest(result) {
        return result.data.welcome_messages.length;
      }
      getItemArray() {
        return this.welcomeMessages;
      }
      get welcomeMessages() {
        return this._realData.welcome_messages;
      }
    };
    exports2.WelcomeDmV1Paginator = WelcomeDmV1Paginator;
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v1/streaming.v1.types.js
var require_streaming_v1_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v1/streaming.v1.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v1/tweet.v1.types.js
var require_tweet_v1_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v1/tweet.v1.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EUploadMimeType = void 0;
    var EUploadMimeType;
    (function(EUploadMimeType2) {
      EUploadMimeType2["Jpeg"] = "image/jpeg";
      EUploadMimeType2["Mp4"] = "video/mp4";
      EUploadMimeType2["Mov"] = "video/quicktime";
      EUploadMimeType2["Gif"] = "image/gif";
      EUploadMimeType2["Png"] = "image/png";
      EUploadMimeType2["Srt"] = "text/plain";
      EUploadMimeType2["Webp"] = "image/webp";
    })(EUploadMimeType = exports2.EUploadMimeType || (exports2.EUploadMimeType = {}));
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v1/entities.v1.types.js
var require_entities_v1_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v1/entities.v1.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v1/user.v1.types.js
var require_user_v1_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v1/user.v1.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v1/dev-utilities.v1.types.js
var require_dev_utilities_v1_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v1/dev-utilities.v1.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v1/geo.v1.types.js
var require_geo_v1_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v1/geo.v1.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v1/trends.v1.types.js
var require_trends_v1_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v1/trends.v1.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v1/dm.v1.types.js
var require_dm_v1_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v1/dm.v1.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EDirectMessageEventTypeV1 = void 0;
    var EDirectMessageEventTypeV1;
    (function(EDirectMessageEventTypeV12) {
      EDirectMessageEventTypeV12["Create"] = "message_create";
      EDirectMessageEventTypeV12["WelcomeCreate"] = "welcome_message";
    })(EDirectMessageEventTypeV1 = exports2.EDirectMessageEventTypeV1 || (exports2.EDirectMessageEventTypeV1 = {}));
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v1/list.v1.types.js
var require_list_v1_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v1/list.v1.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v1/index.js
var require_v1 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v1/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    __exportStar(require_streaming_v1_types(), exports2);
    __exportStar(require_tweet_v1_types(), exports2);
    __exportStar(require_entities_v1_types(), exports2);
    __exportStar(require_user_v1_types(), exports2);
    __exportStar(require_dev_utilities_v1_types(), exports2);
    __exportStar(require_geo_v1_types(), exports2);
    __exportStar(require_trends_v1_types(), exports2);
    __exportStar(require_dm_v1_types(), exports2);
    __exportStar(require_list_v1_types(), exports2);
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v2/streaming.v2.types.js
var require_streaming_v2_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v2/streaming.v2.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v2/tweet.v2.types.js
var require_tweet_v2_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v2/tweet.v2.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v2/tweet.definition.v2.js
var require_tweet_definition_v2 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v2/tweet.definition.v2.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v2/user.v2.types.js
var require_user_v2_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v2/user.v2.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v2/spaces.v2.types.js
var require_spaces_v2_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v2/spaces.v2.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v2/list.v2.types.js
var require_list_v2_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v2/list.v2.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v2/community.v2.types.js
var require_community_v2_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v2/community.v2.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v2/media.v2.types.js
var require_media_v2_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v2/media.v2.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v2/trends.v2.types.js
var require_trends_v2_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v2/trends.v2.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/v2/index.js
var require_v2 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/v2/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    __exportStar(require_streaming_v2_types(), exports2);
    __exportStar(require_tweet_v2_types(), exports2);
    __exportStar(require_tweet_definition_v2(), exports2);
    __exportStar(require_user_v2_types(), exports2);
    __exportStar(require_spaces_v2_types(), exports2);
    __exportStar(require_list_v2_types(), exports2);
    __exportStar(require_community_v2_types(), exports2);
    __exportStar(require_media_v2_types(), exports2);
    __exportStar(require_trends_v2_types(), exports2);
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/errors.types.js
var require_errors_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/errors.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EApiV2ErrorCode = exports2.EApiV1ErrorCode = exports2.ApiResponseError = exports2.ApiPartialResponseError = exports2.ApiRequestError = exports2.ETwitterApiError = void 0;
    var ETwitterApiError;
    (function(ETwitterApiError2) {
      ETwitterApiError2["Request"] = "request";
      ETwitterApiError2["PartialResponse"] = "partial-response";
      ETwitterApiError2["Response"] = "response";
    })(ETwitterApiError = exports2.ETwitterApiError || (exports2.ETwitterApiError = {}));
    var ApiError = class extends Error {
      constructor() {
        super(...arguments);
        this.error = true;
      }
    };
    var ApiRequestError = class extends ApiError {
      constructor(message, options) {
        super(message);
        this.type = ETwitterApiError.Request;
        Error.captureStackTrace(this, this.constructor);
        Object.defineProperty(this, "_options", { value: options });
      }
      get request() {
        return this._options.request;
      }
      get requestError() {
        return this._options.error;
      }
      toJSON() {
        return {
          type: this.type,
          error: this.requestError
        };
      }
    };
    exports2.ApiRequestError = ApiRequestError;
    var ApiPartialResponseError = class extends ApiError {
      constructor(message, options) {
        super(message);
        this.type = ETwitterApiError.PartialResponse;
        Error.captureStackTrace(this, this.constructor);
        Object.defineProperty(this, "_options", { value: options });
      }
      get request() {
        return this._options.request;
      }
      get response() {
        return this._options.response;
      }
      get responseError() {
        return this._options.responseError;
      }
      get rawContent() {
        return this._options.rawContent;
      }
      toJSON() {
        return {
          type: this.type,
          error: this.responseError
        };
      }
    };
    exports2.ApiPartialResponseError = ApiPartialResponseError;
    function getProblemName(type) {
      return typeof type === "string" ? type.split(/[/#]/).pop() : void 0;
    }
    var ApiResponseError = class extends ApiError {
      constructor(message, options) {
        super(message);
        this.type = ETwitterApiError.Response;
        Error.captureStackTrace(this, this.constructor);
        Object.defineProperty(this, "_options", { value: options });
        this.code = options.code;
        this.headers = options.headers;
        this.rateLimit = options.rateLimit;
        if (options.data && typeof options.data === "object" && "error" in options.data && !options.data.errors) {
          const data = { ...options.data };
          data.errors = [{
            code: EApiV1ErrorCode.InternalError,
            message: data.error
          }];
          this.data = data;
        } else {
          this.data = options.data;
        }
      }
      get request() {
        return this._options.request;
      }
      get response() {
        return this._options.response;
      }
      /** Check for presence of one of given v1/v2 error codes. */
      hasErrorCode(...codes) {
        const errors = this.errors;
        if ((errors === null || errors === void 0 ? void 0 : errors.length) && "code" in errors[0]) {
          const v1errors = errors;
          return v1errors.some((error) => codes.includes(error.code));
        }
        const v2errors = [this.data, ...errors !== null && errors !== void 0 ? errors : []];
        const problems = codes.map(getProblemName);
        return v2errors.some((error) => {
          const problem = getProblemName(error === null || error === void 0 ? void 0 : error.type);
          return problem !== void 0 && problems.includes(problem);
        });
      }
      get errors() {
        var _a;
        return (_a = this.data) === null || _a === void 0 ? void 0 : _a.errors;
      }
      get rateLimitError() {
        return this.code === 420 || this.code === 429;
      }
      get isAuthError() {
        if (this.code === 401) {
          return true;
        }
        return this.hasErrorCode(EApiV1ErrorCode.AuthTimestampInvalid, EApiV1ErrorCode.AuthenticationFail, EApiV1ErrorCode.BadAuthenticationData, EApiV1ErrorCode.InvalidOrExpiredToken);
      }
      toJSON() {
        return {
          type: this.type,
          code: this.code,
          error: this.data,
          rateLimit: this.rateLimit,
          headers: this.headers
        };
      }
    };
    exports2.ApiResponseError = ApiResponseError;
    var EApiV1ErrorCode;
    (function(EApiV1ErrorCode2) {
      EApiV1ErrorCode2[EApiV1ErrorCode2["InvalidCoordinates"] = 3] = "InvalidCoordinates";
      EApiV1ErrorCode2[EApiV1ErrorCode2["NoLocationFound"] = 13] = "NoLocationFound";
      EApiV1ErrorCode2[EApiV1ErrorCode2["AuthenticationFail"] = 32] = "AuthenticationFail";
      EApiV1ErrorCode2[EApiV1ErrorCode2["InvalidOrExpiredToken"] = 89] = "InvalidOrExpiredToken";
      EApiV1ErrorCode2[EApiV1ErrorCode2["UnableToVerifyCredentials"] = 99] = "UnableToVerifyCredentials";
      EApiV1ErrorCode2[EApiV1ErrorCode2["AuthTimestampInvalid"] = 135] = "AuthTimestampInvalid";
      EApiV1ErrorCode2[EApiV1ErrorCode2["BadAuthenticationData"] = 215] = "BadAuthenticationData";
      EApiV1ErrorCode2[EApiV1ErrorCode2["NoUserMatch"] = 17] = "NoUserMatch";
      EApiV1ErrorCode2[EApiV1ErrorCode2["UserNotFound"] = 50] = "UserNotFound";
      EApiV1ErrorCode2[EApiV1ErrorCode2["ResourceNotFound"] = 34] = "ResourceNotFound";
      EApiV1ErrorCode2[EApiV1ErrorCode2["TweetNotFound"] = 144] = "TweetNotFound";
      EApiV1ErrorCode2[EApiV1ErrorCode2["TweetNotVisible"] = 179] = "TweetNotVisible";
      EApiV1ErrorCode2[EApiV1ErrorCode2["NotAllowedResource"] = 220] = "NotAllowedResource";
      EApiV1ErrorCode2[EApiV1ErrorCode2["MediaIdNotFound"] = 325] = "MediaIdNotFound";
      EApiV1ErrorCode2[EApiV1ErrorCode2["TweetNoLongerAvailable"] = 421] = "TweetNoLongerAvailable";
      EApiV1ErrorCode2[EApiV1ErrorCode2["TweetViolatedRules"] = 422] = "TweetViolatedRules";
      EApiV1ErrorCode2[EApiV1ErrorCode2["TargetUserSuspended"] = 63] = "TargetUserSuspended";
      EApiV1ErrorCode2[EApiV1ErrorCode2["YouAreSuspended"] = 64] = "YouAreSuspended";
      EApiV1ErrorCode2[EApiV1ErrorCode2["AccountUpdateFailed"] = 120] = "AccountUpdateFailed";
      EApiV1ErrorCode2[EApiV1ErrorCode2["NoSelfSpamReport"] = 36] = "NoSelfSpamReport";
      EApiV1ErrorCode2[EApiV1ErrorCode2["NoSelfMute"] = 271] = "NoSelfMute";
      EApiV1ErrorCode2[EApiV1ErrorCode2["AccountLocked"] = 326] = "AccountLocked";
      EApiV1ErrorCode2[EApiV1ErrorCode2["RateLimitExceeded"] = 88] = "RateLimitExceeded";
      EApiV1ErrorCode2[EApiV1ErrorCode2["NoDMRightForApp"] = 93] = "NoDMRightForApp";
      EApiV1ErrorCode2[EApiV1ErrorCode2["OverCapacity"] = 130] = "OverCapacity";
      EApiV1ErrorCode2[EApiV1ErrorCode2["InternalError"] = 131] = "InternalError";
      EApiV1ErrorCode2[EApiV1ErrorCode2["TooManyFollowings"] = 161] = "TooManyFollowings";
      EApiV1ErrorCode2[EApiV1ErrorCode2["TweetLimitExceeded"] = 185] = "TweetLimitExceeded";
      EApiV1ErrorCode2[EApiV1ErrorCode2["DuplicatedTweet"] = 187] = "DuplicatedTweet";
      EApiV1ErrorCode2[EApiV1ErrorCode2["TooManySpamReports"] = 205] = "TooManySpamReports";
      EApiV1ErrorCode2[EApiV1ErrorCode2["RequestLooksLikeSpam"] = 226] = "RequestLooksLikeSpam";
      EApiV1ErrorCode2[EApiV1ErrorCode2["NoWriteRightForApp"] = 261] = "NoWriteRightForApp";
      EApiV1ErrorCode2[EApiV1ErrorCode2["TweetActionsDisabled"] = 425] = "TweetActionsDisabled";
      EApiV1ErrorCode2[EApiV1ErrorCode2["TweetRepliesRestricted"] = 433] = "TweetRepliesRestricted";
      EApiV1ErrorCode2[EApiV1ErrorCode2["NamedParameterMissing"] = 38] = "NamedParameterMissing";
      EApiV1ErrorCode2[EApiV1ErrorCode2["InvalidAttachmentUrl"] = 44] = "InvalidAttachmentUrl";
      EApiV1ErrorCode2[EApiV1ErrorCode2["TweetTextTooLong"] = 186] = "TweetTextTooLong";
      EApiV1ErrorCode2[EApiV1ErrorCode2["MissingUrlParameter"] = 195] = "MissingUrlParameter";
      EApiV1ErrorCode2[EApiV1ErrorCode2["NoMultipleGifs"] = 323] = "NoMultipleGifs";
      EApiV1ErrorCode2[EApiV1ErrorCode2["InvalidMediaIds"] = 324] = "InvalidMediaIds";
      EApiV1ErrorCode2[EApiV1ErrorCode2["InvalidUrl"] = 407] = "InvalidUrl";
      EApiV1ErrorCode2[EApiV1ErrorCode2["TooManyTweetAttachments"] = 386] = "TooManyTweetAttachments";
      EApiV1ErrorCode2[EApiV1ErrorCode2["StatusAlreadyFavorited"] = 139] = "StatusAlreadyFavorited";
      EApiV1ErrorCode2[EApiV1ErrorCode2["FollowRequestAlreadySent"] = 160] = "FollowRequestAlreadySent";
      EApiV1ErrorCode2[EApiV1ErrorCode2["CannotUnmuteANonMutedAccount"] = 272] = "CannotUnmuteANonMutedAccount";
      EApiV1ErrorCode2[EApiV1ErrorCode2["TweetAlreadyRetweeted"] = 327] = "TweetAlreadyRetweeted";
      EApiV1ErrorCode2[EApiV1ErrorCode2["ReplyToDeletedTweet"] = 385] = "ReplyToDeletedTweet";
      EApiV1ErrorCode2[EApiV1ErrorCode2["DMReceiverNotFollowingYou"] = 150] = "DMReceiverNotFollowingYou";
      EApiV1ErrorCode2[EApiV1ErrorCode2["UnableToSendDM"] = 151] = "UnableToSendDM";
      EApiV1ErrorCode2[EApiV1ErrorCode2["MustAllowDMFromAnyone"] = 214] = "MustAllowDMFromAnyone";
      EApiV1ErrorCode2[EApiV1ErrorCode2["CannotSendDMToThisUser"] = 349] = "CannotSendDMToThisUser";
      EApiV1ErrorCode2[EApiV1ErrorCode2["DMTextTooLong"] = 354] = "DMTextTooLong";
      EApiV1ErrorCode2[EApiV1ErrorCode2["SubscriptionAlreadyExists"] = 355] = "SubscriptionAlreadyExists";
      EApiV1ErrorCode2[EApiV1ErrorCode2["CallbackUrlNotApproved"] = 415] = "CallbackUrlNotApproved";
      EApiV1ErrorCode2[EApiV1ErrorCode2["SuspendedApplication"] = 416] = "SuspendedApplication";
      EApiV1ErrorCode2[EApiV1ErrorCode2["OobOauthIsNotAllowed"] = 417] = "OobOauthIsNotAllowed";
    })(EApiV1ErrorCode = exports2.EApiV1ErrorCode || (exports2.EApiV1ErrorCode = {}));
    var EApiV2ErrorCode;
    (function(EApiV2ErrorCode2) {
      EApiV2ErrorCode2["InvalidRequest"] = "https://api.x.com/2/problems/invalid-request";
      EApiV2ErrorCode2["ClientForbidden"] = "https://api.x.com/2/problems/client-forbidden";
      EApiV2ErrorCode2["UnsupportedAuthentication"] = "https://api.x.com/2/problems/unsupported-authentication";
      EApiV2ErrorCode2["InvalidRules"] = "https://api.x.com/2/problems/invalid-rules";
      EApiV2ErrorCode2["TooManyRules"] = "https://api.x.com/2/problems/rule-cap";
      EApiV2ErrorCode2["RuleTooLong"] = "https://api.x.com/2/problems/rule-length";
      EApiV2ErrorCode2["DuplicatedRules"] = "https://api.x.com/2/problems/duplicate-rules";
      EApiV2ErrorCode2["RateLimitExceeded"] = "https://api.x.com/2/problems/rate-limit-exceeded";
      EApiV2ErrorCode2["UsageCapped"] = "https://api.x.com/2/problems/usage-capped";
      EApiV2ErrorCode2["InternalError"] = "https://api.x.com/2/problems/internal-error";
      EApiV2ErrorCode2["ConnectionError"] = "https://api.x.com/2/problems/streaming-connection";
      EApiV2ErrorCode2["ClientDisconnected"] = "https://api.x.com/2/problems/client-disconnected";
      EApiV2ErrorCode2["TwitterDisconnectedYou"] = "https://api.x.com/2/problems/operational-disconnect";
      EApiV2ErrorCode2["ResourceNotFound"] = "https://api.x.com/2/problems/resource-not-found";
      EApiV2ErrorCode2["ResourceUnauthorized"] = "https://api.x.com/2/problems/not-authorized-for-resource";
      EApiV2ErrorCode2["ResourceUnavailable"] = "https://api.x.com/2/problems/resource-unavailable";
      EApiV2ErrorCode2["DisallowedResource"] = "https://api.x.com/2/problems/disallowed-resource";
      EApiV2ErrorCode2["RecipientNotMessageable"] = "https://api.x.com/2/problems/recipient-not-messageable";
      EApiV2ErrorCode2["FieldUnauthorized"] = "https://api.x.com/2/problems/field-unauthorized";
      EApiV2ErrorCode2["NotAuthorizedForField"] = "https://api.x.com/2/problems/not-authorized-for-field";
      EApiV2ErrorCode2["FieldHydrationFailure"] = "https://api.x.com/2/problems/field-hydration-failure";
    })(EApiV2ErrorCode = exports2.EApiV2ErrorCode || (exports2.EApiV2ErrorCode = {}));
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/responses.types.js
var require_responses_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/responses.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/client.types.js
var require_client_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/client.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ETwitterStreamEvent = void 0;
    var ETwitterStreamEvent;
    (function(ETwitterStreamEvent2) {
      ETwitterStreamEvent2["Connected"] = "connected";
      ETwitterStreamEvent2["ConnectError"] = "connect error";
      ETwitterStreamEvent2["ConnectionError"] = "connection error";
      ETwitterStreamEvent2["ConnectionClosed"] = "connection closed";
      ETwitterStreamEvent2["ConnectionLost"] = "connection lost";
      ETwitterStreamEvent2["ReconnectAttempt"] = "reconnect attempt";
      ETwitterStreamEvent2["Reconnected"] = "reconnected";
      ETwitterStreamEvent2["ReconnectError"] = "reconnect error";
      ETwitterStreamEvent2["ReconnectLimitExceeded"] = "reconnect limit exceeded";
      ETwitterStreamEvent2["DataKeepAlive"] = "data keep-alive";
      ETwitterStreamEvent2["Data"] = "data event content";
      ETwitterStreamEvent2["DataError"] = "data twitter error";
      ETwitterStreamEvent2["TweetParseError"] = "data tweet parse error";
      ETwitterStreamEvent2["Error"] = "stream error";
    })(ETwitterStreamEvent = exports2.ETwitterStreamEvent || (exports2.ETwitterStreamEvent = {}));
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/auth.types.js
var require_auth_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/auth.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/plugins/client.plugins.types.js
var require_client_plugins_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/plugins/client.plugins.types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TwitterApiPluginResponseOverride = void 0;
    var TwitterApiPluginResponseOverride = class {
      constructor(value) {
        this.value = value;
      }
    };
    exports2.TwitterApiPluginResponseOverride = TwitterApiPluginResponseOverride;
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/plugins/index.js
var require_plugins = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/plugins/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    __exportStar(require_client_plugins_types(), exports2);
  }
});

// node_modules/twitter-api-v2/dist/cjs/types/index.js
var require_types = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/types/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    __exportStar(require_v1(), exports2);
    __exportStar(require_v2(), exports2);
    __exportStar(require_errors_types(), exports2);
    __exportStar(require_responses_types(), exports2);
    __exportStar(require_client_types(), exports2);
    __exportStar(require_auth_types(), exports2);
    __exportStar(require_plugins(), exports2);
  }
});

// node_modules/twitter-api-v2/dist/cjs/settings.js
var require_settings = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/settings.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TwitterApiV2Settings = void 0;
    exports2.TwitterApiV2Settings = {
      debug: false,
      deprecationWarnings: true,
      logger: { log: console.log.bind(console) }
    };
  }
});

// node_modules/twitter-api-v2/dist/cjs/helpers.js
var require_helpers = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/helpers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.safeDeprecationWarning = exports2.hasMultipleItems = exports2.isTweetStreamV2ErrorPayload = exports2.trimUndefinedProperties = exports2.arrayWrap = exports2.sharedPromise = void 0;
    var settings_1 = require_settings();
    function sharedPromise(getter) {
      const sharedPromise2 = {
        value: void 0,
        promise: getter().then((val) => {
          sharedPromise2.value = val;
          return val;
        })
      };
      return sharedPromise2;
    }
    exports2.sharedPromise = sharedPromise;
    function arrayWrap(value) {
      if (Array.isArray(value)) {
        return value;
      }
      return [value];
    }
    exports2.arrayWrap = arrayWrap;
    function trimUndefinedProperties(object) {
      for (const parameter of Object.keys(object)) {
        if (object[parameter] === void 0) {
          delete object[parameter];
        }
      }
    }
    exports2.trimUndefinedProperties = trimUndefinedProperties;
    function isTweetStreamV2ErrorPayload(payload) {
      return typeof payload === "object" && "errors" in payload && !("data" in payload);
    }
    exports2.isTweetStreamV2ErrorPayload = isTweetStreamV2ErrorPayload;
    function hasMultipleItems(item) {
      if (Array.isArray(item) && item.length > 1) {
        return true;
      }
      return item.toString().includes(",");
    }
    exports2.hasMultipleItems = hasMultipleItems;
    var deprecationWarningsCache = /* @__PURE__ */ new Set();
    function safeDeprecationWarning(message) {
      if (typeof console === "undefined" || !console.warn || !settings_1.TwitterApiV2Settings.deprecationWarnings) {
        return;
      }
      const hash = `${message.instance}-${message.method}-${message.problem}`;
      if (deprecationWarningsCache.has(hash)) {
        return;
      }
      const formattedMsg = `[twitter-api-v2] Deprecation warning: In ${message.instance}.${message.method}() call, ${message.problem}.
${message.resolution}.`;
      console.warn(formattedMsg);
      console.warn("To disable this message, import variable TwitterApiV2Settings from twitter-api-v2 and set TwitterApiV2Settings.deprecationWarnings to false.");
      deprecationWarningsCache.add(hash);
    }
    exports2.safeDeprecationWarning = safeDeprecationWarning;
  }
});

// node_modules/twitter-api-v2/dist/cjs/client-mixins/request-handler.helper.js
var require_request_handler_helper = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/client-mixins/request-handler.helper.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RequestHandlerHelper = void 0;
    var https_1 = require("https");
    var settings_1 = require_settings();
    var TweetStream_1 = __importDefault(require_TweetStream());
    var types_1 = require_types();
    var zlib = __importStar(require("zlib"));
    var stream_1 = require("stream");
    var RequestHandlerHelper = class {
      constructor(requestData) {
        this.requestData = requestData;
        this.responseData = [];
      }
      /* Request helpers */
      get hrefPathname() {
        const url = this.requestData.url;
        return url.hostname + url.pathname;
      }
      isCompressionDisabled() {
        return !this.requestData.compression || this.requestData.compression === "identity";
      }
      isFormEncodedEndpoint() {
        return this.requestData.url.href.startsWith("https://api.x.com/oauth/");
      }
      /* Error helpers */
      createRequestError(error) {
        if (settings_1.TwitterApiV2Settings.debug) {
          settings_1.TwitterApiV2Settings.logger.log("Request error:", error);
        }
        return new types_1.ApiRequestError("Request failed.", {
          request: this.req,
          error
        });
      }
      createPartialResponseError(error, abortClose) {
        const res = this.res;
        let message = `Request failed with partial response with HTTP code ${res.statusCode}`;
        if (abortClose) {
          message += " (connection abruptly closed)";
        } else {
          message += " (parse error)";
        }
        return new types_1.ApiPartialResponseError(message, {
          request: this.req,
          response: this.res,
          responseError: error,
          rawContent: Buffer.concat(this.responseData).toString()
        });
      }
      formatV1Errors(errors) {
        return errors.map(({ code, message }) => `${message} (Twitter code ${code})`).join(", ");
      }
      formatV2Error({ title, detail, type }) {
        let message = [title, detail !== title ? detail : void 0].filter(Boolean).join(": ");
        if (type && type !== "about:blank") {
          message += ` (see ${type})`;
        }
        return message;
      }
      createResponseError({ res, data, rateLimit, code }) {
        if (settings_1.TwitterApiV2Settings.debug) {
          settings_1.TwitterApiV2Settings.logger.log(`Request failed with code ${code}, data:`, data);
          settings_1.TwitterApiV2Settings.logger.log("Response headers:", res.headers);
        }
        let errorString = `Request failed with code ${code}`;
        const errors = data === null || data === void 0 ? void 0 : data.errors;
        if ((errors === null || errors === void 0 ? void 0 : errors.length) && typeof errors[0] === "object" && "code" in errors[0]) {
          errorString += " - " + this.formatV1Errors(errors);
        } else if ((data === null || data === void 0 ? void 0 : data.title) || (data === null || data === void 0 ? void 0 : data.detail)) {
          errorString += " - " + this.formatV2Error(data);
        }
        return new types_1.ApiResponseError(errorString, {
          code,
          data,
          headers: res.headers,
          request: this.req,
          response: res,
          rateLimit
        });
      }
      /* Response helpers */
      getResponseDataStream(res) {
        if (this.isCompressionDisabled()) {
          return res;
        }
        const contentEncoding = (res.headers["content-encoding"] || "identity").trim().toLowerCase();
        if (contentEncoding === "br") {
          const brotli = zlib.createBrotliDecompress({
            flush: zlib.constants.BROTLI_OPERATION_FLUSH,
            finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH
          });
          (0, stream_1.pipeline)(res, brotli, () => void 0);
          return brotli;
        }
        if (contentEncoding === "gzip") {
          const gunzip = zlib.createGunzip({
            flush: zlib.constants.Z_SYNC_FLUSH,
            finishFlush: zlib.constants.Z_SYNC_FLUSH
          });
          (0, stream_1.pipeline)(res, gunzip, () => void 0);
          return gunzip;
        }
        if (contentEncoding === "deflate") {
          const inflate = zlib.createInflate({
            flush: zlib.constants.Z_SYNC_FLUSH,
            finishFlush: zlib.constants.Z_SYNC_FLUSH
          });
          (0, stream_1.pipeline)(res, inflate, () => void 0);
          return inflate;
        }
        return res;
      }
      detectResponseType(res) {
        var _a, _b;
        if (((_a = res.headers["content-type"]) === null || _a === void 0 ? void 0 : _a.includes("application/json")) || ((_b = res.headers["content-type"]) === null || _b === void 0 ? void 0 : _b.includes("application/problem+json"))) {
          return "json";
        } else if (this.isFormEncodedEndpoint()) {
          return "url";
        }
        return "text";
      }
      getParsedResponse(res) {
        const data = this.responseData;
        const mode = this.requestData.forceParseMode || this.detectResponseType(res);
        if (mode === "buffer") {
          return Buffer.concat(data);
        } else if (mode === "text") {
          return Buffer.concat(data).toString();
        } else if (mode === "json") {
          const asText = Buffer.concat(data).toString();
          return asText.length ? JSON.parse(asText) : void 0;
        } else if (mode === "url") {
          const asText = Buffer.concat(data).toString();
          const formEntries = {};
          for (const [item, value] of new URLSearchParams(asText)) {
            formEntries[item] = value;
          }
          return formEntries;
        } else {
          return void 0;
        }
      }
      getRateLimitFromResponse(res) {
        let rateLimit = void 0;
        if (res.headers["x-rate-limit-limit"]) {
          rateLimit = {
            limit: Number(res.headers["x-rate-limit-limit"]),
            remaining: Number(res.headers["x-rate-limit-remaining"]),
            reset: Number(res.headers["x-rate-limit-reset"])
          };
          if (res.headers["x-app-limit-24hour-limit"]) {
            rateLimit.day = {
              limit: Number(res.headers["x-app-limit-24hour-limit"]),
              remaining: Number(res.headers["x-app-limit-24hour-remaining"]),
              reset: Number(res.headers["x-app-limit-24hour-reset"])
            };
          }
          if (res.headers["x-user-limit-24hour-limit"]) {
            rateLimit.userDay = {
              limit: Number(res.headers["x-user-limit-24hour-limit"]),
              remaining: Number(res.headers["x-user-limit-24hour-remaining"]),
              reset: Number(res.headers["x-user-limit-24hour-reset"])
            };
          }
          if (this.requestData.rateLimitSaver) {
            this.requestData.rateLimitSaver(rateLimit);
          }
        }
        return rateLimit;
      }
      /* Request event handlers */
      requestErrorHandler(reject, requestError) {
        var _a, _b;
        (_b = (_a = this.requestData).requestEventDebugHandler) === null || _b === void 0 ? void 0 : _b.call(_a, "request-error", { requestError });
        reject(this.createRequestError(requestError));
      }
      timeoutErrorHandler() {
        this.req.destroy(new Error("Request timeout."));
      }
      /* Response event handlers */
      classicResponseHandler(resolve, reject, res) {
        this.res = res;
        const dataStream = this.getResponseDataStream(res);
        dataStream.on("data", (chunk) => this.responseData.push(chunk));
        dataStream.on("end", this.onResponseEndHandler.bind(this, resolve, reject));
        dataStream.on("close", this.onResponseCloseHandler.bind(this, reject));
        if (dataStream !== res) {
          dataStream.on("error", this.onResponseDecompressionErrorHandler.bind(this, reject));
        }
        if (this.requestData.requestEventDebugHandler) {
          this.requestData.requestEventDebugHandler("response", { res });
          res.on("aborted", (error) => this.requestData.requestEventDebugHandler("response-aborted", { error }));
          res.on("error", (error) => this.requestData.requestEventDebugHandler("response-error", { error }));
          res.on("close", () => this.requestData.requestEventDebugHandler("response-close", { data: this.responseData }));
          res.on("end", () => this.requestData.requestEventDebugHandler("response-end"));
        }
      }
      onResponseEndHandler(resolve, reject) {
        const rateLimit = this.getRateLimitFromResponse(this.res);
        let data;
        try {
          data = this.getParsedResponse(this.res);
        } catch (e) {
          reject(this.createPartialResponseError(e, false));
          return;
        }
        const code = this.res.statusCode;
        if (code >= 400) {
          reject(this.createResponseError({ data, res: this.res, rateLimit, code }));
          return;
        }
        if (settings_1.TwitterApiV2Settings.debug) {
          settings_1.TwitterApiV2Settings.logger.log(`[${this.requestData.options.method} ${this.hrefPathname}]: Request succeeds with code ${this.res.statusCode}`);
          settings_1.TwitterApiV2Settings.logger.log("Response body:", data);
        }
        resolve({
          data,
          headers: this.res.headers,
          rateLimit
        });
      }
      onResponseCloseHandler(reject) {
        const res = this.res;
        if (res.aborted || !res.complete) {
          return reject(this.createPartialResponseError(new Error("Response has been interrupted before response could be parsed."), true));
        }
      }
      onResponseDecompressionErrorHandler(reject, error) {
        reject(this.createPartialResponseError(error, !this.res.complete));
      }
      streamResponseHandler(resolve, reject, res) {
        const code = res.statusCode;
        if (code < 400) {
          if (settings_1.TwitterApiV2Settings.debug) {
            settings_1.TwitterApiV2Settings.logger.log(`[${this.requestData.options.method} ${this.hrefPathname}]: Request succeeds with code ${res.statusCode} (starting stream)`);
          }
          const dataStream = this.getResponseDataStream(res);
          resolve({ req: this.req, res: dataStream, originalResponse: res, requestData: this.requestData });
        } else {
          this.classicResponseHandler(() => void 0, reject, res);
        }
      }
      /* Wrappers for request lifecycle */
      debugRequest() {
        const url = this.requestData.url;
        settings_1.TwitterApiV2Settings.logger.log(`[${this.requestData.options.method} ${this.hrefPathname}]`, this.requestData.options);
        if (url.search) {
          settings_1.TwitterApiV2Settings.logger.log("Request parameters:", [...url.searchParams.entries()].map(([key, value]) => `${key}: ${value}`));
        }
        if (this.requestData.body) {
          settings_1.TwitterApiV2Settings.logger.log("Request body:", this.requestData.body);
        }
      }
      buildRequest() {
        var _a;
        const url = this.requestData.url;
        const auth = url.username ? `${url.username}:${url.password}` : void 0;
        const headers = (_a = this.requestData.options.headers) !== null && _a !== void 0 ? _a : {};
        if (this.requestData.compression === true || this.requestData.compression === "brotli") {
          headers["accept-encoding"] = "br;q=1.0, gzip;q=0.8, deflate;q=0.5, *;q=0.1";
        } else if (this.requestData.compression === "gzip") {
          headers["accept-encoding"] = "gzip;q=1, deflate;q=0.5, *;q=0.1";
        } else if (this.requestData.compression === "deflate") {
          headers["accept-encoding"] = "deflate;q=1, *;q=0.1";
        }
        if (settings_1.TwitterApiV2Settings.debug) {
          this.debugRequest();
        }
        this.req = (0, https_1.request)({
          ...this.requestData.options,
          // Define URL params manually, addresses dependencies error https://github.com/PLhery/node-twitter-api-v2/issues/94
          host: url.hostname,
          port: url.port || void 0,
          path: url.pathname + url.search,
          protocol: url.protocol,
          auth,
          headers
        });
      }
      registerRequestEventDebugHandlers(req) {
        req.on("close", () => this.requestData.requestEventDebugHandler("close"));
        req.on("abort", () => this.requestData.requestEventDebugHandler("abort"));
        req.on("socket", (socket) => {
          this.requestData.requestEventDebugHandler("socket", { socket });
          socket.on("error", (error) => this.requestData.requestEventDebugHandler("socket-error", { socket, error }));
          socket.on("connect", () => this.requestData.requestEventDebugHandler("socket-connect", { socket }));
          socket.on("close", (withError) => this.requestData.requestEventDebugHandler("socket-close", { socket, withError }));
          socket.on("end", () => this.requestData.requestEventDebugHandler("socket-end", { socket }));
          socket.on("lookup", (...data) => this.requestData.requestEventDebugHandler("socket-lookup", { socket, data }));
          socket.on("timeout", () => this.requestData.requestEventDebugHandler("socket-timeout", { socket }));
        });
      }
      makeRequest() {
        this.buildRequest();
        return new Promise((resolve, reject) => {
          const req = this.req;
          req.on("error", this.requestErrorHandler.bind(this, reject));
          req.on("response", this.classicResponseHandler.bind(this, resolve, reject));
          if (this.requestData.options.timeout) {
            req.on("timeout", this.timeoutErrorHandler.bind(this));
          }
          if (this.requestData.requestEventDebugHandler) {
            this.registerRequestEventDebugHandlers(req);
          }
          if (this.requestData.body) {
            req.write(this.requestData.body);
          }
          req.end();
        });
      }
      async makeRequestAsStream() {
        const { req, res, requestData, originalResponse } = await this.makeRequestAndResolveWhenReady();
        return new TweetStream_1.default(requestData, { req, res, originalResponse });
      }
      makeRequestAndResolveWhenReady() {
        this.buildRequest();
        return new Promise((resolve, reject) => {
          const req = this.req;
          req.on("error", this.requestErrorHandler.bind(this, reject));
          req.on("response", this.streamResponseHandler.bind(this, resolve, reject));
          if (this.requestData.body) {
            req.write(this.requestData.body);
          }
          req.end();
        });
      }
    };
    exports2.RequestHandlerHelper = RequestHandlerHelper;
    exports2.default = RequestHandlerHelper;
  }
});

// node_modules/twitter-api-v2/dist/cjs/stream/TweetStreamEventCombiner.js
var require_TweetStreamEventCombiner = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/stream/TweetStreamEventCombiner.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TweetStreamEventCombiner = void 0;
    var events_1 = require("events");
    var types_1 = require_types();
    var TweetStreamEventCombiner = class extends events_1.EventEmitter {
      constructor(stream) {
        super();
        this.stream = stream;
        this.stack = [];
        this.onStreamData = this.onStreamData.bind(this);
        this.onStreamError = this.onStreamError.bind(this);
        this.onConnectionLost = this.onConnectionLost.bind(this);
        this.onReconnectLimitExceeded = this.onReconnectLimitExceeded.bind(this);
        this.onStreamClosed = this.onStreamClosed.bind(this);
        this.onceNewEvent = this.once.bind(this, "event");
        stream.on(types_1.ETwitterStreamEvent.Data, this.onStreamData);
        stream.on(types_1.ETwitterStreamEvent.TweetParseError, this.onStreamError);
        stream.on(types_1.ETwitterStreamEvent.ConnectionError, this.onConnectionLost);
        stream.on(types_1.ETwitterStreamEvent.ConnectionLost, this.onConnectionLost);
        stream.on(types_1.ETwitterStreamEvent.ReconnectLimitExceeded, this.onReconnectLimitExceeded);
        stream.on(types_1.ETwitterStreamEvent.ConnectionClosed, this.onStreamClosed);
      }
      /** Returns a new `Promise` that will `resolve` on next event (data, error or end of the stream). */
      nextEvent() {
        return new Promise(this.onceNewEvent);
      }
      /** Returns `true` if there's something in the stack. */
      hasStack() {
        return this.stack.length > 0;
      }
      /** Returns stacked data events, and clean the stack. */
      popStack() {
        const stack = this.stack;
        this.stack = [];
        return stack;
      }
      /** Returns why the iteration ends, once it has to. */
      getEnding() {
        return this.ending;
      }
      /** Ends the iteration once the stack is empty. The first ending wins. */
      end(ending = {}) {
        if (!this.ending) {
          this.ending = ending;
        }
        this.emit("event");
      }
      /** Cleanup all the listeners attached on stream. */
      destroy() {
        this.removeAllListeners();
        this.stream.off(types_1.ETwitterStreamEvent.Data, this.onStreamData);
        this.stream.off(types_1.ETwitterStreamEvent.TweetParseError, this.onStreamError);
        this.stream.off(types_1.ETwitterStreamEvent.ConnectionError, this.onConnectionLost);
        this.stream.off(types_1.ETwitterStreamEvent.ConnectionLost, this.onConnectionLost);
        this.stream.off(types_1.ETwitterStreamEvent.ReconnectLimitExceeded, this.onReconnectLimitExceeded);
        this.stream.off(types_1.ETwitterStreamEvent.ConnectionClosed, this.onStreamClosed);
      }
      onStreamData(payload) {
        if (this.ending) {
          return;
        }
        this.stack.push(payload);
        this.emit("event");
      }
      onStreamError(error) {
        this.end({ error });
      }
      onConnectionLost(error) {
        if (!this.stream.autoReconnect) {
          this.end({ error: error !== null && error !== void 0 ? error : new Error(`Connection lost: nothing received for ${this.stream.keepAliveTimeoutMs}ms.`) });
        }
      }
      onReconnectLimitExceeded() {
        this.end({ error: new Error("Connection closed: reconnect limit exceeded.") });
      }
      onStreamClosed() {
        this.end();
      }
    };
    exports2.TweetStreamEventCombiner = TweetStreamEventCombiner;
    exports2.default = TweetStreamEventCombiner;
  }
});

// node_modules/twitter-api-v2/dist/cjs/stream/TweetStreamParser.js
var require_TweetStreamParser = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/stream/TweetStreamParser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EStreamParserEvent = void 0;
    var events_1 = require("events");
    var TweetStreamParser = class extends events_1.EventEmitter {
      constructor() {
        super(...arguments);
        this.currentMessage = "";
      }
      // Code partially belongs to twitter-stream-api for this
      // https://github.com/trygve-lie/twitter-stream-api/blob/master/lib/parser.js
      push(chunk) {
        this.currentMessage += chunk;
        chunk = this.currentMessage;
        const size = chunk.length;
        let start = 0;
        let offset = 0;
        while (offset < size) {
          if (chunk.slice(offset, offset + 2) === "\r\n") {
            const piece = chunk.slice(start, offset);
            start = offset += 2;
            if (!piece.length) {
              continue;
            }
            try {
              const payload = JSON.parse(piece);
              if (payload) {
                this.emit(EStreamParserEvent.ParsedData, payload);
                continue;
              }
            } catch (error) {
              this.emit(EStreamParserEvent.ParseError, error);
            }
          }
          offset++;
        }
        this.currentMessage = chunk.slice(start, size);
      }
      /** Reset the currently stored message (f.e. on connection reset) */
      reset() {
        this.currentMessage = "";
      }
    };
    exports2.default = TweetStreamParser;
    var EStreamParserEvent;
    (function(EStreamParserEvent2) {
      EStreamParserEvent2["ParsedData"] = "parsed data";
      EStreamParserEvent2["ParseError"] = "parse error";
    })(EStreamParserEvent = exports2.EStreamParserEvent || (exports2.EStreamParserEvent = {}));
  }
});

// node_modules/twitter-api-v2/dist/cjs/stream/TweetStream.js
var require_TweetStream = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/stream/TweetStream.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TweetStream = void 0;
    var events_1 = require("events");
    var string_decoder_1 = require("string_decoder");
    var request_handler_helper_1 = __importDefault(require_request_handler_helper());
    var types_1 = require_types();
    var TweetStreamEventCombiner_1 = __importDefault(require_TweetStreamEventCombiner());
    var TweetStreamParser_1 = __importStar(require_TweetStreamParser());
    var basicRetriesAttempt = [5, 15, 30, 60, 90, 120, 180, 300, 600, 900];
    var basicReconnectRetry = (tryOccurrence) => tryOccurrence > basicRetriesAttempt.length ? 901e3 : basicRetriesAttempt[tryOccurrence - 1] * 1e3;
    var TweetStream = class extends events_1.EventEmitter {
      constructor(requestData, connection) {
        super();
        this.requestData = requestData;
        this.autoReconnect = false;
        this.autoReconnectRetries = 5;
        this.keepAliveTimeoutMs = 1e3 * 120;
        this.nextRetryTimeout = basicReconnectRetry;
        this.parser = new TweetStreamParser_1.default();
        this.connectionProcessRunning = false;
        this.closed = false;
        this.eventCombiners = /* @__PURE__ */ new Set();
        this.onKeepAliveTimeout = this.onKeepAliveTimeout.bind(this);
        this.initEventsFromParser();
        if (connection) {
          this.req = connection.req;
          this.res = connection.res;
          this.originalResponse = connection.originalResponse;
          this.initEventsFromRequest();
        }
      }
      on(event, handler2) {
        return super.on(event, handler2);
      }
      initEventsFromRequest() {
        if (!this.req || !this.res) {
          throw new Error("TweetStream error: You cannot init TweetStream without a request and response object.");
        }
        const errorHandler = (err) => {
          this.emit(types_1.ETwitterStreamEvent.ConnectionError, err);
          this.emit(types_1.ETwitterStreamEvent.Error, {
            type: types_1.ETwitterStreamEvent.ConnectionError,
            error: err,
            message: "Connection lost or closed by Twitter."
          });
          this.onConnectionError();
        };
        this.req.on("error", errorHandler);
        this.res.on("error", errorHandler);
        this.res.on("close", () => errorHandler(new Error("Connection closed by Twitter.")));
        const decoder2 = new string_decoder_1.StringDecoder("utf8");
        this.res.on("data", (chunk) => {
          this.resetKeepAliveTimeout();
          const text = decoder2.write(chunk);
          if (text === "\r\n") {
            this.emit(types_1.ETwitterStreamEvent.DataKeepAlive);
          }
          this.parser.push(text);
        });
        this.resetKeepAliveTimeout();
      }
      initEventsFromParser() {
        const payloadIsError = this.requestData.payloadIsError;
        this.parser.on(TweetStreamParser_1.EStreamParserEvent.ParsedData, (eventData) => {
          if (payloadIsError && payloadIsError(eventData)) {
            this.emit(types_1.ETwitterStreamEvent.DataError, eventData);
            this.emit(types_1.ETwitterStreamEvent.Error, {
              type: types_1.ETwitterStreamEvent.DataError,
              error: eventData,
              message: "Twitter sent a payload that is detected as an error payload."
            });
          } else {
            this.emit(types_1.ETwitterStreamEvent.Data, eventData);
          }
        });
        this.parser.on(TweetStreamParser_1.EStreamParserEvent.ParseError, (error) => {
          this.emit(types_1.ETwitterStreamEvent.TweetParseError, error);
          this.emit(types_1.ETwitterStreamEvent.Error, {
            type: types_1.ETwitterStreamEvent.TweetParseError,
            error,
            message: "Failed to parse stream data."
          });
        });
      }
      resetKeepAliveTimeout() {
        this.unbindKeepAliveTimeout();
        if (this.keepAliveTimeoutMs !== Infinity) {
          this.keepAliveTimeout = setTimeout(this.onKeepAliveTimeout, this.keepAliveTimeoutMs);
        }
      }
      onKeepAliveTimeout() {
        this.emit(types_1.ETwitterStreamEvent.ConnectionLost);
        this.onConnectionError();
      }
      unbindTimeouts() {
        this.unbindRetryTimeout();
        this.unbindKeepAliveTimeout();
      }
      unbindKeepAliveTimeout() {
        if (this.keepAliveTimeout) {
          clearTimeout(this.keepAliveTimeout);
          this.keepAliveTimeout = void 0;
        }
      }
      unbindRetryTimeout() {
        if (this.retryTimeout) {
          clearTimeout(this.retryTimeout);
          this.retryTimeout = void 0;
        }
      }
      closeWithoutEmit() {
        this.unbindTimeouts();
        if (this.res) {
          this.res.removeAllListeners();
          this.res.destroy();
        }
        if (this.req) {
          this.req.removeAllListeners();
          this.req.destroy();
        }
      }
      /** Terminate connection to Twitter. */
      close() {
        this.closed = true;
        this.emit(types_1.ETwitterStreamEvent.ConnectionClosed);
        this.closeWithoutEmit();
      }
      /** Unbind all listeners, and close connection. */
      destroy() {
        this.removeAllListeners();
        this.close();
        for (const eventCombiner of this.eventCombiners) {
          eventCombiner.end();
        }
      }
      /**
       * Make a new request that creates a new `TweetStream` instance with
       * the same parameters, and bind current listeners to new stream.
       */
      async clone() {
        const newRequest = new request_handler_helper_1.default(this.requestData);
        const newStream = await newRequest.makeRequestAsStream();
        const listenerNames = this.eventNames();
        for (const listener of listenerNames) {
          const callbacks = this.listeners(listener);
          for (const callback of callbacks) {
            newStream.on(listener, callback);
          }
        }
        return newStream;
      }
      /** Start initial stream connection, setup options on current instance and returns itself. */
      async connect(options = {}) {
        if (typeof options.autoReconnect !== "undefined") {
          this.autoReconnect = options.autoReconnect;
        }
        if (typeof options.autoReconnectRetries !== "undefined") {
          this.autoReconnectRetries = options.autoReconnectRetries === "unlimited" ? Infinity : options.autoReconnectRetries;
        }
        if (typeof options.keepAliveTimeout !== "undefined") {
          this.keepAliveTimeoutMs = options.keepAliveTimeout === "disable" ? Infinity : options.keepAliveTimeout;
        }
        if (typeof options.nextRetryTimeout !== "undefined") {
          this.nextRetryTimeout = options.nextRetryTimeout;
        }
        this.unbindTimeouts();
        try {
          await this.reconnect();
        } catch (e) {
          this.emit(types_1.ETwitterStreamEvent.ConnectError, 0);
          this.emit(types_1.ETwitterStreamEvent.Error, {
            type: types_1.ETwitterStreamEvent.ConnectError,
            error: e,
            message: "Connect error - Initial connection just failed."
          });
          if (this.autoReconnect) {
            this.makeAutoReconnectRetry(0, e);
          } else {
            throw e;
          }
        }
        return this;
      }
      /** Make a new request to (re)connect to Twitter. */
      async reconnect() {
        if (this.connectionProcessRunning) {
          throw new Error("Connection process is already running.");
        }
        this.connectionProcessRunning = true;
        this.closed = false;
        try {
          let initialConnection = true;
          if (this.req) {
            initialConnection = false;
            this.closeWithoutEmit();
          }
          const { req, res, originalResponse } = await new request_handler_helper_1.default(this.requestData).makeRequestAndResolveWhenReady();
          if (this.closed) {
            res.destroy();
            req.destroy();
            return;
          }
          this.req = req;
          this.res = res;
          this.originalResponse = originalResponse;
          this.emit(initialConnection ? types_1.ETwitterStreamEvent.Connected : types_1.ETwitterStreamEvent.Reconnected);
          this.parser.reset();
          this.initEventsFromRequest();
        } finally {
          this.connectionProcessRunning = false;
        }
      }
      async onConnectionError(retryOccurrence = 0) {
        this.unbindTimeouts();
        this.closeWithoutEmit();
        if (this.closed) {
          return;
        }
        if (!this.autoReconnect) {
          this.emit(types_1.ETwitterStreamEvent.ConnectionClosed);
          return;
        }
        if (retryOccurrence >= this.autoReconnectRetries) {
          this.emit(types_1.ETwitterStreamEvent.ReconnectLimitExceeded);
          this.emit(types_1.ETwitterStreamEvent.ConnectionClosed);
          return;
        }
        try {
          this.emit(types_1.ETwitterStreamEvent.ReconnectAttempt, retryOccurrence);
          if (this.closed) {
            return;
          }
          await this.reconnect();
        } catch (e) {
          if (this.closed) {
            return;
          }
          this.emit(types_1.ETwitterStreamEvent.ReconnectError, retryOccurrence);
          this.emit(types_1.ETwitterStreamEvent.Error, {
            type: types_1.ETwitterStreamEvent.ReconnectError,
            error: e,
            message: `Reconnect error - ${retryOccurrence + 1} attempts made yet.`
          });
          this.makeAutoReconnectRetry(retryOccurrence, e);
        }
      }
      makeAutoReconnectRetry(retryOccurrence, error) {
        if (this.closed) {
          return;
        }
        const nextRetry = this.nextRetryTimeout(retryOccurrence + 1, error);
        this.retryTimeout = setTimeout(() => {
          this.onConnectionError(retryOccurrence + 1);
        }, nextRetry);
      }
      async *[Symbol.asyncIterator]() {
        if (this.closed) {
          return;
        }
        if ((!this.req || this.req.destroyed) && !this.connectionProcessRunning && !this.retryTimeout) {
          throw new Error("Connection closed");
        }
        const eventCombiner = new TweetStreamEventCombiner_1.default(this);
        this.eventCombiners.add(eventCombiner);
        try {
          while (true) {
            if (eventCombiner.hasStack()) {
              yield* eventCombiner.popStack();
              continue;
            }
            const ending = eventCombiner.getEnding();
            if (ending) {
              if (ending.error) {
                throw ending.error;
              }
              return;
            }
            await eventCombiner.nextEvent();
          }
        } finally {
          this.eventCombiners.delete(eventCombiner);
          eventCombiner.destroy();
        }
      }
    };
    exports2.TweetStream = TweetStream;
    exports2.default = TweetStream;
  }
});

// node_modules/twitter-api-v2/dist/cjs/plugins/helpers.js
var require_helpers2 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/plugins/helpers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.applyResponseHooks = exports2.hasRequestErrorPlugins = void 0;
    var types_1 = require_types();
    function hasRequestErrorPlugins(client2) {
      var _a;
      if (!((_a = client2.clientSettings.plugins) === null || _a === void 0 ? void 0 : _a.length)) {
        return false;
      }
      for (const plugin of client2.clientSettings.plugins) {
        if (plugin.onRequestError || plugin.onResponseError) {
          return true;
        }
      }
      return false;
    }
    exports2.hasRequestErrorPlugins = hasRequestErrorPlugins;
    async function applyResponseHooks(requestParams, computedParams, requestOptions, error) {
      let override;
      if (error instanceof types_1.ApiRequestError || error instanceof types_1.ApiPartialResponseError) {
        override = await this.applyPluginMethod("onRequestError", {
          client: this,
          url: this.getUrlObjectFromUrlString(requestParams.url),
          params: requestParams,
          computedParams,
          requestOptions,
          error
        });
      } else if (error instanceof types_1.ApiResponseError) {
        override = await this.applyPluginMethod("onResponseError", {
          client: this,
          url: this.getUrlObjectFromUrlString(requestParams.url),
          params: requestParams,
          computedParams,
          requestOptions,
          error
        });
      }
      if (override && override instanceof types_1.TwitterApiPluginResponseOverride) {
        return override.value;
      }
      return Promise.reject(error);
    }
    exports2.applyResponseHooks = applyResponseHooks;
  }
});

// node_modules/twitter-api-v2/dist/cjs/client-mixins/oauth1.helper.js
var require_oauth1_helper = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/client-mixins/oauth1.helper.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OAuth1Helper = void 0;
    var crypto = __importStar(require("crypto"));
    var OAuth1Helper = class _OAuth1Helper {
      constructor(options) {
        this.nonceLength = 32;
        this.consumerKeys = options.consumerKeys;
      }
      static percentEncode(str) {
        return encodeURIComponent(str).replace(/!/g, "%21").replace(/\*/g, "%2A").replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29");
      }
      hash(base, key) {
        return crypto.createHmac("sha1", key).update(base).digest("base64");
      }
      authorize(request, accessTokens = {}) {
        const oauthInfo = {
          oauth_consumer_key: this.consumerKeys.key,
          oauth_nonce: this.getNonce(),
          oauth_signature_method: "HMAC-SHA1",
          oauth_timestamp: this.getTimestamp(),
          oauth_version: "1.0"
        };
        if (accessTokens.key !== void 0) {
          oauthInfo.oauth_token = accessTokens.key;
        }
        if (!request.data) {
          request.data = {};
        }
        oauthInfo.oauth_signature = this.getSignature(request, accessTokens.secret, oauthInfo);
        return oauthInfo;
      }
      toHeader(oauthInfo) {
        const sorted = sortObject(oauthInfo);
        let header_value = "OAuth ";
        for (const element of sorted) {
          if (element.key.indexOf("oauth_") !== 0) {
            continue;
          }
          header_value += _OAuth1Helper.percentEncode(element.key) + '="' + _OAuth1Helper.percentEncode(element.value) + '",';
        }
        return {
          // Remove the last ,
          Authorization: header_value.slice(0, header_value.length - 1)
        };
      }
      getNonce() {
        return crypto.randomBytes(Math.ceil(this.nonceLength * 3 / 4)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_").slice(0, this.nonceLength);
      }
      getTimestamp() {
        return Math.trunc((/* @__PURE__ */ new Date()).getTime() / 1e3);
      }
      getSignature(request, tokenSecret, oauthInfo) {
        return this.hash(this.getBaseString(request, oauthInfo), this.getSigningKey(tokenSecret));
      }
      getSigningKey(tokenSecret) {
        return _OAuth1Helper.percentEncode(this.consumerKeys.secret) + "&" + _OAuth1Helper.percentEncode(tokenSecret || "");
      }
      getBaseString(request, oauthInfo) {
        return request.method.toUpperCase() + "&" + _OAuth1Helper.percentEncode(this.getBaseUrl(request.url)) + "&" + _OAuth1Helper.percentEncode(this.getParameterString(request, oauthInfo));
      }
      getParameterString(request, oauthInfo) {
        const baseStringData = sortObject(percentEncodeData(mergeObject(oauthInfo, mergeObject(request.data, deParamUrl(request.url)))));
        let dataStr = "";
        for (const { key, value } of baseStringData) {
          if (value && Array.isArray(value)) {
            value.sort();
            let valString = "";
            value.forEach((item, i) => {
              valString += key + "=" + item;
              if (i < value.length) {
                valString += "&";
              }
            });
            dataStr += valString;
          } else {
            dataStr += key + "=" + value + "&";
          }
        }
        return dataStr.slice(0, dataStr.length - 1);
      }
      getBaseUrl(url) {
        return url.split("?")[0];
      }
    };
    exports2.OAuth1Helper = OAuth1Helper;
    exports2.default = OAuth1Helper;
    function mergeObject(obj1, obj2) {
      return {
        ...obj1 || {},
        ...obj2 || {}
      };
    }
    function sortObject(data) {
      return Object.keys(data).sort().map((key) => ({ key, value: data[key] }));
    }
    function deParam(string) {
      const split = string.split("&");
      const data = {};
      for (const coupleKeyValue of split) {
        const [key, value = ""] = coupleKeyValue.split("=");
        if (data[key]) {
          if (!Array.isArray(data[key])) {
            data[key] = [data[key]];
          }
          data[key].push(decodeURIComponent(value));
        } else {
          data[key] = decodeURIComponent(value);
        }
      }
      return data;
    }
    function deParamUrl(url) {
      const tmp = url.split("?");
      if (tmp.length === 1)
        return {};
      return deParam(tmp[1]);
    }
    function percentEncodeData(data) {
      const result = {};
      for (const key in data) {
        let value = data[key];
        if (value && Array.isArray(value)) {
          value = value.map((v) => OAuth1Helper.percentEncode(v));
        } else {
          value = OAuth1Helper.percentEncode(value);
        }
        result[OAuth1Helper.percentEncode(key)] = value;
      }
      return result;
    }
  }
});

// node_modules/twitter-api-v2/dist/cjs/client-mixins/form-data.helper.js
var require_form_data_helper = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/client-mixins/form-data.helper.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FormDataHelper = void 0;
    var helpers_1 = require_helpers();
    var FormDataHelper = class _FormDataHelper {
      constructor() {
        this._boundary = "";
        this._chunks = [];
      }
      bodyAppend(...values) {
        const allAsBuffer = values.map((val) => val instanceof Buffer ? val : Buffer.from(val));
        this._chunks.push(...allAsBuffer);
      }
      append(field, value, contentType) {
        const convertedValue = value instanceof Buffer ? value : value.toString();
        const header = this.getMultipartHeader(field, convertedValue, contentType);
        this.bodyAppend(header, convertedValue, _FormDataHelper.LINE_BREAK);
      }
      getHeaders() {
        return {
          "content-type": "multipart/form-data; boundary=" + this.getBoundary()
        };
      }
      /** Length of form-data (including footer length). */
      getLength() {
        return this._chunks.reduce((acc, cur) => acc + cur.length, this.getMultipartFooter().length);
      }
      getBuffer() {
        const allChunks = [...this._chunks, this.getMultipartFooter()];
        const totalBuffer = Buffer.alloc(this.getLength());
        let i = 0;
        for (const chunk of allChunks) {
          for (let j = 0; j < chunk.length; i++, j++) {
            totalBuffer[i] = chunk[j];
          }
        }
        return totalBuffer;
      }
      getBoundary() {
        if (!this._boundary) {
          this.generateBoundary();
        }
        return this._boundary;
      }
      generateBoundary() {
        let boundary = "--------------------------";
        for (let i = 0; i < 24; i++) {
          boundary += Math.floor(Math.random() * 10).toString(16);
        }
        this._boundary = boundary;
      }
      getMultipartHeader(field, value, contentType) {
        if (!contentType) {
          contentType = value instanceof Buffer ? _FormDataHelper.DEFAULT_CONTENT_TYPE : "";
        }
        const headers = {
          "Content-Disposition": ["form-data", `name="${field}"`],
          "Content-Type": contentType
        };
        let contents = "";
        for (const [prop, header] of Object.entries(headers)) {
          if (!header.length) {
            continue;
          }
          contents += prop + ": " + (0, helpers_1.arrayWrap)(header).join("; ") + _FormDataHelper.LINE_BREAK;
        }
        return "--" + this.getBoundary() + _FormDataHelper.LINE_BREAK + contents + _FormDataHelper.LINE_BREAK;
      }
      getMultipartFooter() {
        if (this._footerChunk) {
          return this._footerChunk;
        }
        return this._footerChunk = Buffer.from("--" + this.getBoundary() + "--" + _FormDataHelper.LINE_BREAK);
      }
    };
    exports2.FormDataHelper = FormDataHelper;
    FormDataHelper.LINE_BREAK = "\r\n";
    FormDataHelper.DEFAULT_CONTENT_TYPE = "application/octet-stream";
  }
});

// node_modules/twitter-api-v2/dist/cjs/client-mixins/request-param.helper.js
var require_request_param_helper = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/client-mixins/request-param.helper.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RequestParamHelpers = void 0;
    var form_data_helper_1 = require_form_data_helper();
    var oauth1_helper_1 = __importDefault(require_oauth1_helper());
    var RequestParamHelpers = class {
      static formatQueryToString(query) {
        const formattedQuery = {};
        for (const prop in query) {
          if (typeof query[prop] === "string") {
            formattedQuery[prop] = query[prop];
          } else if (typeof query[prop] !== "undefined") {
            formattedQuery[prop] = String(query[prop]);
          }
        }
        return formattedQuery;
      }
      static autoDetectBodyType(url) {
        if (url.pathname.startsWith("/2/") || url.pathname.startsWith("/labs/2/")) {
          if (url.password.startsWith("/2/oauth2")) {
            return "url";
          }
          return "json";
        }
        if (url.hostname === "upload.x.com") {
          if (url.pathname === "/1.1/media/upload.json") {
            return "form-data";
          }
          return "json";
        }
        const endpoint = url.pathname.split("/1.1/", 2)[1];
        if (this.JSON_1_1_ENDPOINTS.has(endpoint)) {
          return "json";
        }
        return "url";
      }
      static addQueryParamsToUrl(url, query) {
        const queryEntries = Object.entries(query);
        if (queryEntries.length) {
          let search = "";
          for (const [key, value] of queryEntries) {
            search += (search.length ? "&" : "?") + `${oauth1_helper_1.default.percentEncode(key)}=${oauth1_helper_1.default.percentEncode(value)}`;
          }
          url.search = search;
        }
      }
      static constructBodyParams(body, headers, mode) {
        if (body instanceof Buffer) {
          return body;
        }
        if (mode === "json") {
          if (!headers["content-type"]) {
            headers["content-type"] = "application/json;charset=UTF-8";
          }
          return JSON.stringify(body);
        } else if (mode === "url") {
          if (!headers["content-type"]) {
            headers["content-type"] = "application/x-www-form-urlencoded;charset=UTF-8";
          }
          if (Object.keys(body).length) {
            return new URLSearchParams(body).toString().replace(/\*/g, "%2A");
          }
          return "";
        } else if (mode === "raw") {
          throw new Error("You can only use raw body mode with Buffers. To give a string, use Buffer.from(str).");
        } else {
          const form = new form_data_helper_1.FormDataHelper();
          for (const parameter in body) {
            form.append(parameter, body[parameter]);
          }
          if (!headers["content-type"]) {
            const formHeaders = form.getHeaders();
            headers["content-type"] = formHeaders["content-type"];
          }
          return form.getBuffer();
        }
      }
      static setBodyLengthHeader(options, body) {
        var _a;
        options.headers = (_a = options.headers) !== null && _a !== void 0 ? _a : {};
        if (typeof body === "string") {
          options.headers["content-length"] = Buffer.byteLength(body);
        } else {
          options.headers["content-length"] = body.length;
        }
      }
      static isOAuthSerializable(item) {
        return !(item instanceof Buffer);
      }
      static mergeQueryAndBodyForOAuth(query, body) {
        const parameters = {};
        for (const prop in query) {
          parameters[prop] = query[prop];
        }
        if (this.isOAuthSerializable(body)) {
          for (const prop in body) {
            const bodyProp = body[prop];
            if (this.isOAuthSerializable(bodyProp)) {
              parameters[prop] = typeof bodyProp === "object" && bodyProp !== null && "toString" in bodyProp ? bodyProp.toString() : bodyProp;
            }
          }
        }
        return parameters;
      }
      static moveUrlQueryParamsIntoObject(url, query) {
        for (const [param, value] of url.searchParams) {
          query[param] = value;
        }
        url.search = "";
        return url;
      }
      /**
       * Replace URL parameters available in pathname, like `:id`, with data given in `parameters`:
       * `https://x.com/:id.json` + `{ id: '20' }` => `https://x.com/20.json`
       */
      static applyRequestParametersToUrl(url, parameters) {
        url.pathname = url.pathname.replace(/:([A-Z_-]+)/ig, (fullMatch, paramName) => {
          if (parameters[paramName] === void 0) {
            return fullMatch;
          }
          const value = String(parameters[paramName]);
          if (value === "." || value === "..") {
            throw new Error(`Invalid value for URL parameter ${paramName}: ${value}`);
          }
          return encodeURIComponent(value);
        });
        return url;
      }
    };
    exports2.RequestParamHelpers = RequestParamHelpers;
    RequestParamHelpers.JSON_1_1_ENDPOINTS = /* @__PURE__ */ new Set([
      "direct_messages/events/new.json",
      "direct_messages/welcome_messages/new.json",
      "direct_messages/welcome_messages/rules/new.json",
      "media/metadata/create.json",
      "collections/entries/curate.json"
    ]);
    exports2.default = RequestParamHelpers;
  }
});

// node_modules/twitter-api-v2/dist/cjs/client-mixins/oauth2.helper.js
var require_oauth2_helper = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/client-mixins/oauth2.helper.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OAuth2Helper = void 0;
    var crypto = __importStar(require("crypto"));
    var OAuth2Helper = class {
      static getCodeVerifier() {
        return this.generateRandomString(128);
      }
      static getCodeChallengeFromVerifier(verifier) {
        return this.escapeBase64Url(crypto.createHash("sha256").update(verifier).digest("base64"));
      }
      static getAuthHeader(clientId, clientSecret) {
        const key = encodeURIComponent(clientId) + ":" + encodeURIComponent(clientSecret);
        return Buffer.from(key).toString("base64");
      }
      static generateRandomString(length) {
        return this.escapeBase64Url(crypto.randomBytes(Math.ceil(length * 3 / 4)).toString("base64")).slice(0, length);
      }
      static escapeBase64Url(string) {
        return string.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
      }
    };
    exports2.OAuth2Helper = OAuth2Helper;
  }
});

// node_modules/twitter-api-v2/dist/cjs/client-mixins/request-maker.mixin.js
var require_request_maker_mixin = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/client-mixins/request-maker.mixin.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ClientRequestMaker = void 0;
    var types_1 = require_types();
    var TweetStream_1 = __importDefault(require_TweetStream());
    var helpers_1 = require_helpers2();
    var helpers_2 = require_helpers();
    var oauth1_helper_1 = __importDefault(require_oauth1_helper());
    var request_handler_helper_1 = __importDefault(require_request_handler_helper());
    var request_param_helper_1 = __importDefault(require_request_param_helper());
    var oauth2_helper_1 = require_oauth2_helper();
    var ClientRequestMaker = class _ClientRequestMaker {
      constructor(settings) {
        this.rateLimits = {};
        this.clientSettings = {};
        if (settings) {
          this.clientSettings = settings;
        }
      }
      /** @deprecated - Switch to `@twitter-api-v2/plugin-rate-limit` */
      getRateLimits() {
        return this.rateLimits;
      }
      saveRateLimit(originalUrl, rateLimit) {
        this.rateLimits[originalUrl] = rateLimit;
      }
      /** Send a new request and returns a wrapped `Promise<TwitterResponse<T>`. */
      async send(requestParams) {
        var _a, _b, _c, _d, _e;
        if ((_a = this.clientSettings.plugins) === null || _a === void 0 ? void 0 : _a.length) {
          const possibleResponse = await this.applyPreRequestConfigHooks(requestParams);
          if (possibleResponse) {
            return possibleResponse;
          }
        }
        const args = this.getHttpRequestArgs(requestParams);
        const options = {
          method: args.method,
          headers: args.headers,
          timeout: requestParams.timeout,
          agent: this.clientSettings.httpAgent
        };
        const enableRateLimitSave = requestParams.enableRateLimitSave !== false;
        if (args.body) {
          request_param_helper_1.default.setBodyLengthHeader(options, args.body);
        }
        if ((_b = this.clientSettings.plugins) === null || _b === void 0 ? void 0 : _b.length) {
          await this.applyPreRequestHooks(requestParams, args, options);
        }
        let request = new request_handler_helper_1.default({
          url: args.url,
          options,
          body: args.body,
          rateLimitSaver: enableRateLimitSave ? this.saveRateLimit.bind(this, args.rawUrl) : void 0,
          requestEventDebugHandler: requestParams.requestEventDebugHandler,
          compression: (_d = (_c = requestParams.compression) !== null && _c !== void 0 ? _c : this.clientSettings.compression) !== null && _d !== void 0 ? _d : true,
          forceParseMode: requestParams.forceParseMode
        }).makeRequest();
        if ((0, helpers_1.hasRequestErrorPlugins)(this)) {
          request = this.applyResponseErrorHooks(requestParams, args, options, request);
        }
        const response = await request;
        if ((_e = this.clientSettings.plugins) === null || _e === void 0 ? void 0 : _e.length) {
          const responseOverride = await this.applyPostRequestHooks(requestParams, args, options, response);
          if (responseOverride) {
            return responseOverride.value;
          }
        }
        return response;
      }
      sendStream(requestParams) {
        var _a, _b;
        if (this.clientSettings.plugins) {
          this.applyPreStreamRequestConfigHooks(requestParams);
        }
        const args = this.getHttpRequestArgs(requestParams);
        const options = {
          method: args.method,
          headers: args.headers,
          agent: this.clientSettings.httpAgent
        };
        const enableRateLimitSave = requestParams.enableRateLimitSave !== false;
        const enableAutoConnect = requestParams.autoConnect !== false;
        if (args.body) {
          request_param_helper_1.default.setBodyLengthHeader(options, args.body);
        }
        const requestData = {
          url: args.url,
          options,
          body: args.body,
          rateLimitSaver: enableRateLimitSave ? this.saveRateLimit.bind(this, args.rawUrl) : void 0,
          payloadIsError: requestParams.payloadIsError,
          compression: (_b = (_a = requestParams.compression) !== null && _a !== void 0 ? _a : this.clientSettings.compression) !== null && _b !== void 0 ? _b : true
        };
        const stream = new TweetStream_1.default(requestData);
        if (!enableAutoConnect) {
          return stream;
        }
        return stream.connect();
      }
      /* Token helpers */
      initializeToken(token) {
        if (typeof token === "string") {
          this.bearerToken = token;
        } else if (typeof token === "object" && "appKey" in token) {
          this.consumerToken = token.appKey;
          this.consumerSecret = token.appSecret;
          if (token.accessToken && token.accessSecret) {
            this.accessToken = token.accessToken;
            this.accessSecret = token.accessSecret;
          }
          this._oauth = this.buildOAuth();
        } else if (typeof token === "object" && "username" in token) {
          const key = encodeURIComponent(token.username) + ":" + encodeURIComponent(token.password);
          this.basicToken = Buffer.from(key).toString("base64");
        } else if (typeof token === "object" && "clientId" in token) {
          this.clientId = token.clientId;
          this.clientSecret = token.clientSecret;
        }
      }
      getActiveTokens() {
        if (this.bearerToken) {
          return {
            type: "oauth2",
            bearerToken: this.bearerToken
          };
        } else if (this.basicToken) {
          return {
            type: "basic",
            token: this.basicToken
          };
        } else if (this.consumerSecret && this._oauth) {
          return {
            type: "oauth-1.0a",
            appKey: this.consumerToken,
            appSecret: this.consumerSecret,
            accessToken: this.accessToken,
            accessSecret: this.accessSecret
          };
        } else if (this.clientId) {
          return {
            type: "oauth2-user",
            clientId: this.clientId
          };
        }
        return { type: "none" };
      }
      buildOAuth() {
        if (!this.consumerSecret || !this.consumerToken)
          throw new Error("Invalid consumer tokens");
        return new oauth1_helper_1.default({
          consumerKeys: { key: this.consumerToken, secret: this.consumerSecret }
        });
      }
      getOAuthAccessTokens() {
        if (!this.accessSecret || !this.accessToken)
          return;
        return {
          key: this.accessToken,
          secret: this.accessSecret
        };
      }
      /* Plugin helpers */
      getPlugins() {
        var _a;
        return (_a = this.clientSettings.plugins) !== null && _a !== void 0 ? _a : [];
      }
      hasPlugins() {
        var _a;
        return !!((_a = this.clientSettings.plugins) === null || _a === void 0 ? void 0 : _a.length);
      }
      async applyPluginMethod(method, args) {
        var _a;
        let returnValue;
        for (const plugin of this.getPlugins()) {
          const value = await ((_a = plugin[method]) === null || _a === void 0 ? void 0 : _a.call(plugin, args));
          if (value && value instanceof types_1.TwitterApiPluginResponseOverride) {
            returnValue = value;
          }
        }
        return returnValue;
      }
      /* Request helpers */
      writeAuthHeaders({ headers, bodyInSignature, url, method, query, body }) {
        headers = { ...headers };
        if (this.bearerToken) {
          headers.Authorization = "Bearer " + this.bearerToken;
        } else if (this.basicToken) {
          headers.Authorization = "Basic " + this.basicToken;
        } else if (this.clientId && this.clientSecret) {
          headers.Authorization = "Basic " + oauth2_helper_1.OAuth2Helper.getAuthHeader(this.clientId, this.clientSecret);
        } else if (this.consumerSecret && this._oauth) {
          const data = bodyInSignature ? request_param_helper_1.default.mergeQueryAndBodyForOAuth(query, body) : query;
          const auth = this._oauth.authorize({
            url: url.toString(),
            method,
            data
          }, this.getOAuthAccessTokens());
          headers = { ...headers, ...this._oauth.toHeader(auth) };
        }
        return headers;
      }
      getUrlObjectFromUrlString(url) {
        if (!url.startsWith("http")) {
          url = "https://" + url;
        }
        return new URL(url);
      }
      getHttpRequestArgs({ url: stringUrl, method, query: rawQuery = {}, body: rawBody = {}, headers, forceBodyMode, enableAuth, params }) {
        let body = void 0;
        method = method.toUpperCase();
        headers = headers !== null && headers !== void 0 ? headers : {};
        if (!headers["x-user-agent"]) {
          headers["x-user-agent"] = "Node.twitter-api-v2";
        }
        const url = this.getUrlObjectFromUrlString(stringUrl);
        const rawUrl = url.origin + url.pathname;
        if (params) {
          request_param_helper_1.default.applyRequestParametersToUrl(url, params);
        }
        const query = request_param_helper_1.default.formatQueryToString(rawQuery);
        request_param_helper_1.default.moveUrlQueryParamsIntoObject(url, query);
        if (!(rawBody instanceof Buffer)) {
          (0, helpers_2.trimUndefinedProperties)(rawBody);
        }
        const bodyType = forceBodyMode !== null && forceBodyMode !== void 0 ? forceBodyMode : request_param_helper_1.default.autoDetectBodyType(url);
        if (enableAuth !== false) {
          const bodyInSignature = _ClientRequestMaker.BODY_METHODS.has(method) && bodyType === "url";
          headers = this.writeAuthHeaders({ headers, bodyInSignature, method, query, url, body: rawBody });
        }
        if (_ClientRequestMaker.BODY_METHODS.has(method)) {
          body = request_param_helper_1.default.constructBodyParams(rawBody, headers, bodyType) || void 0;
        }
        request_param_helper_1.default.addQueryParamsToUrl(url, query);
        return {
          rawUrl,
          url,
          method,
          headers,
          body
        };
      }
      /* Plugin helpers */
      async applyPreRequestConfigHooks(requestParams) {
        var _a;
        const url = this.getUrlObjectFromUrlString(requestParams.url);
        for (const plugin of this.getPlugins()) {
          const result = await ((_a = plugin.onBeforeRequestConfig) === null || _a === void 0 ? void 0 : _a.call(plugin, {
            client: this,
            url,
            params: requestParams
          }));
          if (result) {
            return result;
          }
        }
      }
      applyPreStreamRequestConfigHooks(requestParams) {
        var _a;
        const url = this.getUrlObjectFromUrlString(requestParams.url);
        for (const plugin of this.getPlugins()) {
          (_a = plugin.onBeforeStreamRequestConfig) === null || _a === void 0 ? void 0 : _a.call(plugin, {
            client: this,
            url,
            params: requestParams
          });
        }
      }
      async applyPreRequestHooks(requestParams, computedParams, requestOptions) {
        await this.applyPluginMethod("onBeforeRequest", {
          client: this,
          url: this.getUrlObjectFromUrlString(requestParams.url),
          params: requestParams,
          computedParams,
          requestOptions
        });
      }
      async applyPostRequestHooks(requestParams, computedParams, requestOptions, response) {
        return await this.applyPluginMethod("onAfterRequest", {
          client: this,
          url: this.getUrlObjectFromUrlString(requestParams.url),
          params: requestParams,
          computedParams,
          requestOptions,
          response
        });
      }
      applyResponseErrorHooks(requestParams, computedParams, requestOptions, promise) {
        return promise.catch(helpers_1.applyResponseHooks.bind(this, requestParams, computedParams, requestOptions));
      }
    };
    exports2.ClientRequestMaker = ClientRequestMaker;
    ClientRequestMaker.BODY_METHODS = /* @__PURE__ */ new Set(["POST", "PUT", "PATCH"]);
  }
});

// node_modules/twitter-api-v2/dist/cjs/client.base.js
var require_client_base = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/client.base.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var request_maker_mixin_1 = require_request_maker_mixin();
    var helpers_1 = require_helpers();
    var globals_1 = require_globals();
    var TwitterApiBase = class _TwitterApiBase {
      constructor(token, settings = {}) {
        this._currentUser = null;
        this._currentUserV2 = null;
        if (token instanceof _TwitterApiBase) {
          this._requestMaker = token._requestMaker;
        } else {
          this._requestMaker = new request_maker_mixin_1.ClientRequestMaker(settings);
          this._requestMaker.initializeToken(token);
        }
      }
      /* Prefix/Token handling */
      setPrefix(prefix) {
        this._prefix = prefix;
      }
      cloneWithPrefix(prefix) {
        const clone = new this.constructor(this);
        clone.setPrefix(prefix);
        return clone;
      }
      getActiveTokens() {
        return this._requestMaker.getActiveTokens();
      }
      /* Rate limit cache / Plugins */
      getPlugins() {
        return this._requestMaker.getPlugins();
      }
      getPluginOfType(type) {
        return this.getPlugins().find((plugin) => plugin instanceof type);
      }
      /**
       * @deprecated - Migrate to plugin `@twitter-api-v2/plugin-rate-limit`
       *
       * Tells if you hit the Twitter rate limit for {endpoint}.
       * (local data only, this should not ask anything to Twitter)
       */
      hasHitRateLimit(endpoint) {
        var _a;
        if (this.isRateLimitStatusObsolete(endpoint)) {
          return false;
        }
        return ((_a = this.getLastRateLimitStatus(endpoint)) === null || _a === void 0 ? void 0 : _a.remaining) === 0;
      }
      /**
       * @deprecated - Migrate to plugin `@twitter-api-v2/plugin-rate-limit`
       *
       * Tells if you hit the returned Twitter rate limit for {endpoint} has expired.
       * If client has no saved rate limit data for {endpoint}, this will gives you `true`.
       */
      isRateLimitStatusObsolete(endpoint) {
        const rateLimit = this.getLastRateLimitStatus(endpoint);
        if (rateLimit === void 0) {
          return true;
        }
        return rateLimit.reset * 1e3 < Date.now();
      }
      /**
       * @deprecated - Migrate to plugin `@twitter-api-v2/plugin-rate-limit`
       *
       * Get the last obtained Twitter rate limit information for {endpoint}.
       * (local data only, this should not ask anything to Twitter)
       */
      getLastRateLimitStatus(endpoint) {
        const endpointWithPrefix = endpoint.match(/^https?:\/\//) ? endpoint : this._prefix + endpoint;
        return this._requestMaker.getRateLimits()[endpointWithPrefix];
      }
      /* Current user cache */
      /** Get cached current user. */
      getCurrentUserObject(forceFetch = false) {
        if (!forceFetch && this._currentUser) {
          if (this._currentUser.value) {
            return Promise.resolve(this._currentUser.value);
          }
          return this._currentUser.promise;
        }
        const currentUser = this._currentUser = (0, helpers_1.sharedPromise)(() => this.get("account/verify_credentials.json", { tweet_mode: "extended" }, { prefix: globals_1.API_V1_1_PREFIX }));
        currentUser.promise.catch(() => {
          if (this._currentUser === currentUser) {
            this._currentUser = null;
          }
        });
        return currentUser.promise;
      }
      /**
       * Get cached current user from v2 API.
       * This can only be the slimest available `UserV2` object, with only `id`, `name` and `username` properties defined.
       *
       * To get a customized `UserV2Result`, use `.v2.me()`
       *
       * OAuth2 scopes: `tweet.read` & `users.read`
       */
      getCurrentUserV2Object(forceFetch = false) {
        if (!forceFetch && this._currentUserV2) {
          if (this._currentUserV2.value) {
            return Promise.resolve(this._currentUserV2.value);
          }
          return this._currentUserV2.promise;
        }
        const currentUser = this._currentUserV2 = (0, helpers_1.sharedPromise)(() => this.get("users/me", void 0, { prefix: globals_1.API_V2_PREFIX }));
        currentUser.promise.catch(() => {
          if (this._currentUserV2 === currentUser) {
            this._currentUserV2 = null;
          }
        });
        return currentUser.promise;
      }
      async get(url, query = {}, { fullResponse, prefix = this._prefix, ...rest } = {}) {
        if (prefix)
          url = prefix + url;
        const resp = await this._requestMaker.send({
          url,
          method: "GET",
          query,
          ...rest
        });
        return fullResponse ? resp : resp.data;
      }
      async delete(url, query = {}, { fullResponse, prefix = this._prefix, ...rest } = {}) {
        if (prefix)
          url = prefix + url;
        const resp = await this._requestMaker.send({
          url,
          method: "DELETE",
          query,
          ...rest
        });
        return fullResponse ? resp : resp.data;
      }
      async post(url, body, { fullResponse, prefix = this._prefix, ...rest } = {}) {
        if (prefix)
          url = prefix + url;
        const resp = await this._requestMaker.send({
          url,
          method: "POST",
          body,
          ...rest
        });
        return fullResponse ? resp : resp.data;
      }
      async put(url, body, { fullResponse, prefix = this._prefix, ...rest } = {}) {
        if (prefix)
          url = prefix + url;
        const resp = await this._requestMaker.send({
          url,
          method: "PUT",
          body,
          ...rest
        });
        return fullResponse ? resp : resp.data;
      }
      async patch(url, body, { fullResponse, prefix = this._prefix, ...rest } = {}) {
        if (prefix)
          url = prefix + url;
        const resp = await this._requestMaker.send({
          url,
          method: "PATCH",
          body,
          ...rest
        });
        return fullResponse ? resp : resp.data;
      }
      getStream(url, query, { prefix = this._prefix, ...rest } = {}) {
        return this._requestMaker.sendStream({
          url: prefix ? prefix + url : url,
          method: "GET",
          query,
          ...rest
        });
      }
      postStream(url, body, { prefix = this._prefix, ...rest } = {}) {
        return this._requestMaker.sendStream({
          url: prefix ? prefix + url : url,
          method: "POST",
          body,
          ...rest
        });
      }
    };
    exports2.default = TwitterApiBase;
  }
});

// node_modules/twitter-api-v2/dist/cjs/client.subclient.js
var require_client_subclient = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/client.subclient.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var client_base_1 = __importDefault(require_client_base());
    var TwitterApiSubClient = class extends client_base_1.default {
      constructor(instance) {
        if (!(instance instanceof client_base_1.default)) {
          throw new Error("You must instance SubTwitterApi instance from existing TwitterApi instance.");
        }
        super(instance);
      }
    };
    exports2.default = TwitterApiSubClient;
  }
});

// node_modules/twitter-api-v2/dist/cjs/paginators/tweet.paginator.v1.js
var require_tweet_paginator_v1 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/paginators/tweet.paginator.v1.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.UserFavoritesV1Paginator = exports2.ListTimelineV1Paginator = exports2.UserTimelineV1Paginator = exports2.MentionTimelineV1Paginator = exports2.HomeTimelineV1Paginator = void 0;
    var TwitterPaginator_1 = __importDefault(require_TwitterPaginator());
    var TweetTimelineV1Paginator = class extends TwitterPaginator_1.default {
      constructor() {
        super(...arguments);
        this.hasFinishedFetch = false;
      }
      refreshInstanceFromResult(response, isNextPage) {
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
          this._realData.push(...result);
          this.hasFinishedFetch = result.length === 0;
        }
      }
      getNextQueryParams(maxResults) {
        const latestId = BigInt(this._realData[this._realData.length - 1].id_str);
        return {
          ...this.injectQueryParams(maxResults),
          max_id: (latestId - BigInt(1)).toString()
        };
      }
      getPageLengthFromRequest(result) {
        return result.data.length;
      }
      isFetchLastOver(result) {
        return !result.data.length;
      }
      canFetchNextPage(result) {
        return result.length > 0;
      }
      getItemArray() {
        return this.tweets;
      }
      /**
       * Tweets returned by paginator.
       */
      get tweets() {
        return this._realData;
      }
      get done() {
        return super.done || this.hasFinishedFetch;
      }
    };
    var HomeTimelineV1Paginator = class extends TweetTimelineV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "statuses/home_timeline.json";
      }
    };
    exports2.HomeTimelineV1Paginator = HomeTimelineV1Paginator;
    var MentionTimelineV1Paginator = class extends TweetTimelineV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "statuses/mentions_timeline.json";
      }
    };
    exports2.MentionTimelineV1Paginator = MentionTimelineV1Paginator;
    var UserTimelineV1Paginator = class extends TweetTimelineV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "statuses/user_timeline.json";
      }
    };
    exports2.UserTimelineV1Paginator = UserTimelineV1Paginator;
    var ListTimelineV1Paginator = class extends TweetTimelineV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "lists/statuses.json";
      }
    };
    exports2.ListTimelineV1Paginator = ListTimelineV1Paginator;
    var UserFavoritesV1Paginator = class extends TweetTimelineV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "favorites/list.json";
      }
    };
    exports2.UserFavoritesV1Paginator = UserFavoritesV1Paginator;
  }
});

// node_modules/twitter-api-v2/dist/cjs/paginators/mutes.paginator.v1.js
var require_mutes_paginator_v1 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/paginators/mutes.paginator.v1.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MuteUserIdsV1Paginator = exports2.MuteUserListV1Paginator = void 0;
    var paginator_v1_1 = require_paginator_v1();
    var MuteUserListV1Paginator = class extends paginator_v1_1.CursoredV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "mutes/users/list.json";
      }
      refreshInstanceFromResult(response, isNextPage) {
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
          this._realData.users.push(...result.users);
          this._realData.next_cursor = result.next_cursor;
        }
      }
      getPageLengthFromRequest(result) {
        return result.data.users.length;
      }
      getItemArray() {
        return this.users;
      }
      /**
       * Users returned by paginator.
       */
      get users() {
        return this._realData.users;
      }
    };
    exports2.MuteUserListV1Paginator = MuteUserListV1Paginator;
    var MuteUserIdsV1Paginator = class extends paginator_v1_1.CursoredV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "mutes/users/ids.json";
        this._maxResultsWhenFetchLast = 5e3;
      }
      refreshInstanceFromResult(response, isNextPage) {
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
          this._realData.ids.push(...result.ids);
          this._realData.next_cursor = result.next_cursor;
        }
      }
      getPageLengthFromRequest(result) {
        return result.data.ids.length;
      }
      getItemArray() {
        return this.ids;
      }
      /**
       * Users IDs returned by paginator.
       */
      get ids() {
        return this._realData.ids;
      }
    };
    exports2.MuteUserIdsV1Paginator = MuteUserIdsV1Paginator;
  }
});

// node_modules/twitter-api-v2/dist/cjs/paginators/followers.paginator.v1.js
var require_followers_paginator_v1 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/paginators/followers.paginator.v1.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.UserFollowerIdsV1Paginator = exports2.UserFollowerListV1Paginator = void 0;
    var paginator_v1_1 = require_paginator_v1();
    var UserFollowerListV1Paginator = class extends paginator_v1_1.CursoredV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "followers/list.json";
      }
      refreshInstanceFromResult(response, isNextPage) {
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
          this._realData.users.push(...result.users);
          this._realData.next_cursor = result.next_cursor;
        }
      }
      getPageLengthFromRequest(result) {
        return result.data.users.length;
      }
      getItemArray() {
        return this.users;
      }
      /**
       * Users returned by paginator.
       */
      get users() {
        return this._realData.users;
      }
    };
    exports2.UserFollowerListV1Paginator = UserFollowerListV1Paginator;
    var UserFollowerIdsV1Paginator = class extends paginator_v1_1.CursoredV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "followers/ids.json";
        this._maxResultsWhenFetchLast = 5e3;
      }
      refreshInstanceFromResult(response, isNextPage) {
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
          this._realData.ids.push(...result.ids);
          this._realData.next_cursor = result.next_cursor;
        }
      }
      getPageLengthFromRequest(result) {
        return result.data.ids.length;
      }
      getItemArray() {
        return this.ids;
      }
      /**
       * Users IDs returned by paginator.
       */
      get ids() {
        return this._realData.ids;
      }
    };
    exports2.UserFollowerIdsV1Paginator = UserFollowerIdsV1Paginator;
  }
});

// node_modules/twitter-api-v2/dist/cjs/paginators/friends.paginator.v1.js
var require_friends_paginator_v1 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/paginators/friends.paginator.v1.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.UserFollowersIdsV1Paginator = exports2.UserFriendListV1Paginator = void 0;
    var paginator_v1_1 = require_paginator_v1();
    var UserFriendListV1Paginator = class extends paginator_v1_1.CursoredV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "friends/list.json";
      }
      refreshInstanceFromResult(response, isNextPage) {
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
          this._realData.users.push(...result.users);
          this._realData.next_cursor = result.next_cursor;
        }
      }
      getPageLengthFromRequest(result) {
        return result.data.users.length;
      }
      getItemArray() {
        return this.users;
      }
      /**
       * Users returned by paginator.
       */
      get users() {
        return this._realData.users;
      }
    };
    exports2.UserFriendListV1Paginator = UserFriendListV1Paginator;
    var UserFollowersIdsV1Paginator = class extends paginator_v1_1.CursoredV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "friends/ids.json";
        this._maxResultsWhenFetchLast = 5e3;
      }
      refreshInstanceFromResult(response, isNextPage) {
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
          this._realData.ids.push(...result.ids);
          this._realData.next_cursor = result.next_cursor;
        }
      }
      getPageLengthFromRequest(result) {
        return result.data.ids.length;
      }
      getItemArray() {
        return this.ids;
      }
      /**
       * Users IDs returned by paginator.
       */
      get ids() {
        return this._realData.ids;
      }
    };
    exports2.UserFollowersIdsV1Paginator = UserFollowersIdsV1Paginator;
  }
});

// node_modules/twitter-api-v2/dist/cjs/paginators/user.paginator.v1.js
var require_user_paginator_v1 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/paginators/user.paginator.v1.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FriendshipsOutgoingV1Paginator = exports2.FriendshipsIncomingV1Paginator = exports2.UserSearchV1Paginator = void 0;
    var TwitterPaginator_1 = __importDefault(require_TwitterPaginator());
    var paginator_v1_1 = require_paginator_v1();
    var UserSearchV1Paginator = class extends TwitterPaginator_1.default {
      constructor() {
        super(...arguments);
        this._endpoint = "users/search.json";
      }
      refreshInstanceFromResult(response, isNextPage) {
        var _a;
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
          this._realData.push(...result);
          this._queryParams = { ...this._queryParams, page: Number((_a = this._queryParams.page) !== null && _a !== void 0 ? _a : "1") + 1 };
        }
      }
      getNextQueryParams(maxResults) {
        var _a;
        const previousPage = Number((_a = this._queryParams.page) !== null && _a !== void 0 ? _a : "1");
        return {
          ...this._queryParams,
          page: previousPage + 1,
          ...maxResults ? { count: maxResults } : {}
        };
      }
      getPageLengthFromRequest(result) {
        return result.data.length;
      }
      isFetchLastOver(result) {
        return !result.data.length;
      }
      canFetchNextPage(result) {
        return result.length > 0;
      }
      getItemArray() {
        return this.users;
      }
      /**
       * Users returned by paginator.
       */
      get users() {
        return this._realData;
      }
    };
    exports2.UserSearchV1Paginator = UserSearchV1Paginator;
    var FriendshipsIncomingV1Paginator = class extends paginator_v1_1.CursoredV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "friendships/incoming.json";
        this._maxResultsWhenFetchLast = 5e3;
      }
      refreshInstanceFromResult(response, isNextPage) {
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
          this._realData.ids.push(...result.ids);
          this._realData.next_cursor = result.next_cursor;
        }
      }
      getPageLengthFromRequest(result) {
        return result.data.ids.length;
      }
      getItemArray() {
        return this.ids;
      }
      /**
       * Users IDs returned by paginator.
       */
      get ids() {
        return this._realData.ids;
      }
    };
    exports2.FriendshipsIncomingV1Paginator = FriendshipsIncomingV1Paginator;
    var FriendshipsOutgoingV1Paginator = class extends FriendshipsIncomingV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "friendships/outgoing.json";
      }
    };
    exports2.FriendshipsOutgoingV1Paginator = FriendshipsOutgoingV1Paginator;
  }
});

// node_modules/twitter-api-v2/dist/cjs/paginators/list.paginator.v1.js
var require_list_paginator_v1 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/paginators/list.paginator.v1.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ListSubscribersV1Paginator = exports2.ListMembersV1Paginator = exports2.ListSubscriptionsV1Paginator = exports2.ListOwnershipsV1Paginator = exports2.ListMembershipsV1Paginator = void 0;
    var paginator_v1_1 = require_paginator_v1();
    var ListListsV1Paginator = class extends paginator_v1_1.CursoredV1Paginator {
      refreshInstanceFromResult(response, isNextPage) {
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
          this._realData.lists.push(...result.lists);
          this._realData.next_cursor = result.next_cursor;
        }
      }
      getPageLengthFromRequest(result) {
        return result.data.lists.length;
      }
      getItemArray() {
        return this.lists;
      }
      /**
       * Lists returned by paginator.
       */
      get lists() {
        return this._realData.lists;
      }
    };
    var ListMembershipsV1Paginator = class extends ListListsV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "lists/memberships.json";
      }
    };
    exports2.ListMembershipsV1Paginator = ListMembershipsV1Paginator;
    var ListOwnershipsV1Paginator = class extends ListListsV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "lists/ownerships.json";
      }
    };
    exports2.ListOwnershipsV1Paginator = ListOwnershipsV1Paginator;
    var ListSubscriptionsV1Paginator = class extends ListListsV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "lists/subscriptions.json";
      }
    };
    exports2.ListSubscriptionsV1Paginator = ListSubscriptionsV1Paginator;
    var ListUsersV1Paginator = class extends paginator_v1_1.CursoredV1Paginator {
      refreshInstanceFromResult(response, isNextPage) {
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
          this._realData.users.push(...result.users);
          this._realData.next_cursor = result.next_cursor;
        }
      }
      getPageLengthFromRequest(result) {
        return result.data.users.length;
      }
      getItemArray() {
        return this.users;
      }
      /**
       * Users returned by paginator.
       */
      get users() {
        return this._realData.users;
      }
    };
    var ListMembersV1Paginator = class extends ListUsersV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "lists/members.json";
      }
    };
    exports2.ListMembersV1Paginator = ListMembersV1Paginator;
    var ListSubscribersV1Paginator = class extends ListUsersV1Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "lists/subscribers.json";
      }
    };
    exports2.ListSubscribersV1Paginator = ListSubscribersV1Paginator;
  }
});

// node_modules/twitter-api-v2/dist/cjs/v1/client.v1.read.js
var require_client_v1_read = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/v1/client.v1.read.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var client_subclient_1 = __importDefault(require_client_subclient());
    var globals_1 = require_globals();
    var helpers_1 = require_helpers();
    var client_v1_1 = __importDefault(require_client_v1());
    var tweet_paginator_v1_1 = require_tweet_paginator_v1();
    var mutes_paginator_v1_1 = require_mutes_paginator_v1();
    var followers_paginator_v1_1 = require_followers_paginator_v1();
    var friends_paginator_v1_1 = require_friends_paginator_v1();
    var user_paginator_v1_1 = require_user_paginator_v1();
    var list_paginator_v1_1 = require_list_paginator_v1();
    var TwitterApiv1ReadOnly = class extends client_subclient_1.default {
      constructor() {
        super(...arguments);
        this._prefix = globals_1.API_V1_1_PREFIX;
      }
      /* Tweets */
      /**
       * Returns a single Tweet, specified by the id parameter. The Tweet's author will also be embedded within the Tweet.
       * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/get-statuses-show-id
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.singleTweet()` instead.
       */
      singleTweet(tweetId, options = {}) {
        return this.get("statuses/show.json", { tweet_mode: "extended", id: tweetId, ...options });
      }
      tweets(ids, options = {}) {
        return this.post("statuses/lookup.json", { tweet_mode: "extended", id: ids, ...options });
      }
      /**
       * Returns a single Tweet, specified by either a Tweet web URL or the Tweet ID, in an oEmbed-compatible format.
       * The returned HTML snippet will be automatically recognized as an Embedded Tweet when Twitter's widget JavaScript is included on the page.
       * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/get-statuses-oembed
       */
      oembedTweet(tweetId, options = {}) {
        return this.get("oembed", {
          url: `https://x.com/i/statuses/${tweetId}`,
          ...options
        }, { prefix: "https://publish.x.com/" });
      }
      /* Tweets timelines */
      /**
       * Returns a collection of the most recent Tweets and Retweets posted by the authenticating user and the users they follow.
       * The home timeline is central to how most users interact with the Twitter service.
       * https://developer.x.com/en/docs/twitter-api/v1/tweets/timelines/api-reference/get-statuses-home_timeline
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.homeTimeline()` instead.
       */
      async homeTimeline(options = {}) {
        const queryParams = {
          tweet_mode: "extended",
          ...options
        };
        const initialRq = await this.get("statuses/home_timeline.json", queryParams, { fullResponse: true });
        return new tweet_paginator_v1_1.HomeTimelineV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Returns the 20 most recent mentions (Tweets containing a users's @screen_name) for the authenticating user.
       * The timeline returned is the equivalent of the one seen when you view your mentions on x.com.
       * https://developer.x.com/en/docs/twitter-api/v1/tweets/timelines/api-reference/get-statuses-mentions_timeline
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.userMentionTimeline()` instead.
       */
      async mentionTimeline(options = {}) {
        const queryParams = {
          tweet_mode: "extended",
          ...options
        };
        const initialRq = await this.get("statuses/mentions_timeline.json", queryParams, { fullResponse: true });
        return new tweet_paginator_v1_1.MentionTimelineV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Returns a collection of the most recent Tweets posted by the user indicated by the user_id parameters.
       * User timelines belonging to protected users may only be requested when the authenticated user either "owns" the timeline or is an approved follower of the owner.
       * https://developer.x.com/en/docs/twitter-api/v1/tweets/timelines/api-reference/get-statuses-user_timeline
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.userTimeline()` instead.
       */
      async userTimeline(userId, options = {}) {
        const queryParams = {
          tweet_mode: "extended",
          user_id: userId,
          ...options
        };
        const initialRq = await this.get("statuses/user_timeline.json", queryParams, { fullResponse: true });
        return new tweet_paginator_v1_1.UserTimelineV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Returns a collection of the most recent Tweets posted by the user indicated by the screen_name parameters.
       * User timelines belonging to protected users may only be requested when the authenticated user either "owns" the timeline or is an approved follower of the owner.
       * https://developer.x.com/en/docs/twitter-api/v1/tweets/timelines/api-reference/get-statuses-user_timeline
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.userByUsername()` then `v2.userTimeline()` instead.
       */
      async userTimelineByUsername(username, options = {}) {
        const queryParams = {
          tweet_mode: "extended",
          screen_name: username,
          ...options
        };
        const initialRq = await this.get("statuses/user_timeline.json", queryParams, { fullResponse: true });
        return new tweet_paginator_v1_1.UserTimelineV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Returns the most recent Tweets liked by the authenticating or specified user, 20 tweets by default.
       * Note: favorites are now known as likes.
       * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/get-favorites-list
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.userLikedTweets()` instead.
       */
      async favoriteTimeline(userId, options = {}) {
        const queryParams = {
          tweet_mode: "extended",
          user_id: userId,
          ...options
        };
        const initialRq = await this.get("favorites/list.json", queryParams, { fullResponse: true });
        return new tweet_paginator_v1_1.UserFavoritesV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Returns the most recent Tweets liked by the authenticating or specified user, 20 tweets by default.
       * Note: favorites are now known as likes.
       * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/get-favorites-list
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.userByUsername()` then `v2.userLikedTweets()` instead.
       */
      async favoriteTimelineByUsername(username, options = {}) {
        const queryParams = {
          tweet_mode: "extended",
          screen_name: username,
          ...options
        };
        const initialRq = await this.get("favorites/list.json", queryParams, { fullResponse: true });
        return new tweet_paginator_v1_1.UserFavoritesV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /* Users */
      /**
       * Returns a variety of information about the user specified by the required user_id or screen_name parameter.
       * The author's most recent Tweet will be returned inline when possible.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-users-show
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.user()` or `v2.userByUsername()` instead.
       */
      user(user) {
        return this.get("users/show.json", { tweet_mode: "extended", ...user });
      }
      /**
       * Returns fully-hydrated user objects for up to 100 users per request,
       * as specified by comma-separated values passed to the user_id and/or screen_name parameters.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-users-lookup
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.users()` or `v2.usersByUsernames()` instead.
       */
      users(query) {
        return this.get("users/lookup.json", { tweet_mode: "extended", ...query });
      }
      /**
       * Returns an HTTP 200 OK response code and a representation of the requesting user if authentication was successful;
       * returns a 401 status code and an error message if not.
       * Use this method to test if supplied user credentials are valid.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/get-account-verify_credentials
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.me()` instead.
       */
      verifyCredentials(options = {}) {
        return this.get("account/verify_credentials.json", options);
      }
      /**
       * Returns an array of user objects the authenticating user has muted.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/mute-block-report-users/api-reference/get-mutes-users-list
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.userMutingUsers()` instead.
       */
      async listMutedUsers(options = {}) {
        const queryParams = {
          tweet_mode: "extended",
          ...options
        };
        const initialRq = await this.get("mutes/users/list.json", queryParams, { fullResponse: true });
        return new mutes_paginator_v1_1.MuteUserListV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Returns an array of numeric user ids the authenticating user has muted.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/mute-block-report-users/api-reference/get-mutes-users-ids
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.userMutingUsers()` instead.
       */
      async listMutedUserIds(options = {}) {
        const queryParams = {
          stringify_ids: true,
          ...options
        };
        const initialRq = await this.get("mutes/users/ids.json", queryParams, { fullResponse: true });
        return new mutes_paginator_v1_1.MuteUserIdsV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Returns an array of user objects of friends of the specified user.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-friends-list
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.following()` instead.
       */
      async userFriendList(options = {}) {
        const queryParams = {
          ...options
        };
        const initialRq = await this.get("friends/list.json", queryParams, { fullResponse: true });
        return new friends_paginator_v1_1.UserFriendListV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Returns an array of user objects of followers of the specified user.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-followers-list
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.followers()` instead.
       */
      async userFollowerList(options = {}) {
        const queryParams = {
          ...options
        };
        const initialRq = await this.get("followers/list.json", queryParams, { fullResponse: true });
        return new followers_paginator_v1_1.UserFollowerListV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Returns an array of numeric user ids of followers of the specified user.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-followers-ids
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.followers()` instead.
       */
      async userFollowerIds(options = {}) {
        const queryParams = {
          stringify_ids: true,
          ...options
        };
        const initialRq = await this.get("followers/ids.json", queryParams, { fullResponse: true });
        return new followers_paginator_v1_1.UserFollowerIdsV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Returns an array of numeric user ids of friends of the specified user.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-friends-ids
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.following()` instead.
       */
      async userFollowingIds(options = {}) {
        const queryParams = {
          stringify_ids: true,
          ...options
        };
        const initialRq = await this.get("friends/ids.json", queryParams, { fullResponse: true });
        return new friends_paginator_v1_1.UserFollowersIdsV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Provides a simple, relevance-based search interface to public user accounts on Twitter.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-users-search
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.searchUsers()` instead.
       */
      async searchUsers(query, options = {}) {
        const queryParams = {
          q: query,
          tweet_mode: "extended",
          page: 1,
          ...options
        };
        const initialRq = await this.get("users/search.json", queryParams, { fullResponse: true });
        return new user_paginator_v1_1.UserSearchV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /* Friendship API */
      /**
       * Returns detailed information about the relationship between two arbitrary users.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-friendships-show
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      friendship(sources) {
        return this.get("friendships/show.json", sources);
      }
      /**
       * Returns the relationships of the authenticating user to the comma-separated list of up to 100 screen_names or user_ids provided.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-friendships-lookup
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      friendships(friendships) {
        return this.get("friendships/lookup.json", friendships);
      }
      /**
       * Returns a collection of user_ids that the currently authenticated user does not want to receive retweets from.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-friendships-no_retweets-ids
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      friendshipsNoRetweets() {
        return this.get("friendships/no_retweets/ids.json", { stringify_ids: true });
      }
      /**
       * Returns a collection of numeric IDs for every user who has a pending request to follow the authenticating user.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-friendships-incoming
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      async friendshipsIncoming(options = {}) {
        const queryParams = {
          stringify_ids: true,
          ...options
        };
        const initialRq = await this.get("friendships/incoming.json", queryParams, { fullResponse: true });
        return new user_paginator_v1_1.FriendshipsIncomingV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Returns a collection of numeric IDs for every protected user for whom the authenticating user has a pending follow request.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-friendships-outgoing
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      async friendshipsOutgoing(options = {}) {
        const queryParams = {
          stringify_ids: true,
          ...options
        };
        const initialRq = await this.get("friendships/outgoing.json", queryParams, { fullResponse: true });
        return new user_paginator_v1_1.FriendshipsOutgoingV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /* Account/user API */
      /**
       * Get current account settings for authenticating user.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/get-account-settings
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      accountSettings() {
        return this.get("account/settings.json");
      }
      /**
       * Returns a map of the available size variations of the specified user's profile banner.
       * If the user has not uploaded a profile banner, a HTTP 404 will be served instead.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/get-users-profile_banner
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      userProfileBannerSizes(params) {
        return this.get("users/profile_banner.json", params);
      }
      /* Lists */
      /**
       * Returns the specified list. Private lists will only be shown if the authenticated user owns the specified list.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-show
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.list()` instead.
       */
      list(options) {
        return this.get("lists/show.json", { tweet_mode: "extended", ...options });
      }
      /**
       * Returns all lists the authenticating or specified user subscribes to, including their own.
       * If no user is given, the authenticating user is used.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-list
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.listsOwned()` or `v2.listFollowed()` instead.
       */
      lists(options = {}) {
        return this.get("lists/list.json", { tweet_mode: "extended", ...options });
      }
      /**
       * Returns the members of the specified list. Private list members will only be shown if the authenticated user owns the specified list.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-members
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.listMembers()` instead.
       */
      async listMembers(options = {}) {
        const queryParams = {
          tweet_mode: "extended",
          ...options
        };
        const initialRq = await this.get("lists/members.json", queryParams, { fullResponse: true });
        return new list_paginator_v1_1.ListMembersV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Check if the specified user is a member of the specified list.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-members-show
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      listGetMember(options) {
        return this.get("lists/members/show.json", { tweet_mode: "extended", ...options });
      }
      /**
       * Returns the lists the specified user has been added to.
       * If user_id or screen_name are not provided, the memberships for the authenticating user are returned.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-memberships
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.listMemberships()` instead.
       */
      async listMemberships(options = {}) {
        const queryParams = {
          tweet_mode: "extended",
          ...options
        };
        const initialRq = await this.get("lists/memberships.json", queryParams, { fullResponse: true });
        return new list_paginator_v1_1.ListMembershipsV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Returns the lists owned by the specified Twitter user. Private lists will only be shown if the authenticated user is also the owner of the lists.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-ownerships
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.listsOwned()` instead.
       */
      async listOwnerships(options = {}) {
        const queryParams = {
          tweet_mode: "extended",
          ...options
        };
        const initialRq = await this.get("lists/ownerships.json", queryParams, { fullResponse: true });
        return new list_paginator_v1_1.ListOwnershipsV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Returns a timeline of tweets authored by members of the specified list. Retweets are included by default.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-statuses
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.listTweets()` instead.
       */
      async listStatuses(options) {
        const queryParams = {
          tweet_mode: "extended",
          ...options
        };
        const initialRq = await this.get("lists/statuses.json", queryParams, { fullResponse: true });
        return new tweet_paginator_v1_1.ListTimelineV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Returns the subscribers of the specified list. Private list subscribers will only be shown if the authenticated user owns the specified list.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-subscribers
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.listFollowers()` instead.
       */
      async listSubscribers(options = {}) {
        const queryParams = {
          tweet_mode: "extended",
          ...options
        };
        const initialRq = await this.get("lists/subscribers.json", queryParams, { fullResponse: true });
        return new list_paginator_v1_1.ListSubscribersV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Check if the specified user is a subscriber of the specified list. Returns the user if they are a subscriber.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-subscribers-show
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      listGetSubscriber(options) {
        return this.get("lists/subscribers/show.json", { tweet_mode: "extended", ...options });
      }
      /**
       * Obtain a collection of the lists the specified user is subscribed to, 20 lists per page by default.
       * Does not include the user's own lists.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-subscriptions
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.listFollowed()` instead.
       */
      async listSubscriptions(options = {}) {
        const queryParams = {
          tweet_mode: "extended",
          ...options
        };
        const initialRq = await this.get("lists/subscriptions.json", queryParams, { fullResponse: true });
        return new list_paginator_v1_1.ListSubscriptionsV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /* Media upload API */
      /**
       * The STATUS command (this method) is used to periodically poll for updates of media processing operation.
       * After the STATUS command response returns succeeded, you can move on to the next step which is usually create Tweet with media_id.
       * https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/api-reference/get-media-upload-status
       *
       * @deprecated v1.1 media endpoint, sunset by X in June 2025. `v2.uploadMedia()` waits for the media processing itself.
       */
      mediaInfo(mediaId) {
        return this.get("media/upload.json", {
          command: "STATUS",
          media_id: mediaId
        }, { prefix: globals_1.API_V1_1_UPLOAD_PREFIX });
      }
      filterStream({ autoConnect, ...params } = {}) {
        const parameters = {};
        for (const [key, value] of Object.entries(params)) {
          if (key === "follow" || key === "track") {
            parameters[key] = value.toString();
          } else if (key === "locations") {
            const locations = value;
            parameters.locations = (0, helpers_1.arrayWrap)(locations).map((loc) => `${loc.lng},${loc.lat}`).join(",");
          } else {
            parameters[key] = value;
          }
        }
        const streamClient = this.stream;
        return streamClient.postStream("statuses/filter.json", parameters, { autoConnect });
      }
      sampleStream({ autoConnect, ...params } = {}) {
        const streamClient = this.stream;
        return streamClient.getStream("statuses/sample.json", params, { autoConnect });
      }
      /**
       * Create a client that is prefixed with `https//stream.x.com` instead of classic API URL.
       *
       * @deprecated The v1.1 streaming endpoints are no longer available on most X API plans. Use the v2 streams instead, like `v2.searchStream()`.
       */
      get stream() {
        const copiedClient = new client_v1_1.default(this);
        copiedClient.setPrefix(globals_1.API_V1_1_STREAM_PREFIX);
        return copiedClient;
      }
      /* Trends API */
      /**
       * Returns the top 50 trending topics for a specific id, if trending information is available for it.
       * Note: The id parameter for this endpoint is the "where on earth identifier" or WOEID, which is a legacy identifier created by Yahoo and has been deprecated.
       * https://developer.x.com/en/docs/twitter-api/v1/trends/trends-for-location/api-reference/get-trends-place
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.trendsByWoeid()` instead.
       */
      trendsByPlace(woeId, options = {}) {
        return this.get("trends/place.json", { id: woeId, ...options });
      }
      /**
       * Returns the locations that Twitter has trending topic information for.
       * The response is an array of "locations" that encode the location's WOEID
       * and some other human-readable information such as a canonical name and country the location belongs in.
       * https://developer.x.com/en/docs/twitter-api/v1/trends/locations-with-trending-topics/api-reference/get-trends-available
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      trendsAvailable() {
        return this.get("trends/available.json");
      }
      /**
       * Returns the locations that Twitter has trending topic information for, closest to a specified location.
       * https://developer.x.com/en/docs/twitter-api/v1/trends/locations-with-trending-topics/api-reference/get-trends-closest
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      trendsClosest(lat, long) {
        return this.get("trends/closest.json", { lat, long });
      }
      /* Geo API */
      /**
       * Returns all the information about a known place.
       * https://developer.x.com/en/docs/twitter-api/v1/geo/place-information/api-reference/get-geo-id-place_id
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      geoPlace(placeId) {
        return this.get("geo/id/:place_id.json", void 0, { params: { place_id: placeId } });
      }
      /**
       * Search for places that can be attached to a Tweet via POST statuses/update.
       * This request will return a list of all the valid places that can be used as the place_id when updating a status.
       * https://developer.x.com/en/docs/twitter-api/v1/geo/places-near-location/api-reference/get-geo-search
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      geoSearch(options) {
        return this.get("geo/search.json", options);
      }
      /**
       * Given a latitude and a longitude, searches for up to 20 places that can be used as a place_id when updating a status.
       * This request is an informative call and will deliver generalized results about geography.
       * https://developer.x.com/en/docs/twitter-api/v1/geo/places-near-location/api-reference/get-geo-reverse_geocode
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      geoReverseGeoCode(options) {
        return this.get("geo/reverse_geocode.json", options);
      }
      /* Developer utilities */
      /**
       * Returns the current rate limits for methods belonging to the specified resource families.
       * Each API resource belongs to a "resource family" which is indicated in its method documentation.
       * The method's resource family can be determined from the first component of the path after the resource version.
       * https://developer.x.com/en/docs/twitter-api/v1/developer-utilities/rate-limit-status/api-reference/get-application-rate_limit_status
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      rateLimitStatuses(...resources) {
        return this.get("application/rate_limit_status.json", { resources });
      }
      /**
       * Returns the list of languages supported by Twitter along with the language code supported by Twitter.
       * https://developer.x.com/en/docs/twitter-api/v1/developer-utilities/supported-languages/api-reference/get-help-languages
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      supportedLanguages() {
        return this.get("help/languages.json");
      }
    };
    exports2.default = TwitterApiv1ReadOnly;
  }
});

// node_modules/twitter-api-v2/dist/cjs/v1/media-helpers.v1.js
var require_media_helpers_v1 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/v1/media-helpers.v1.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.readNextPartOf = exports2.sleepSecs = exports2.getMediaCategoryByMime = exports2.getMimeType = exports2.getFileSizeFromFileHandle = exports2.getFileHandle = exports2.readFileIntoBuffer = void 0;
    var fs = __importStar(require("fs"));
    var helpers_1 = require_helpers();
    var types_1 = require_types();
    async function readFileIntoBuffer(file) {
      const handle = await getFileHandle(file);
      if (typeof handle === "number") {
        return new Promise((resolve, reject) => {
          fs.readFile(handle, (err, data) => {
            if (err) {
              return reject(err);
            }
            resolve(data);
          });
        });
      } else if (handle instanceof Buffer) {
        return handle;
      } else {
        return handle.readFile();
      }
    }
    exports2.readFileIntoBuffer = readFileIntoBuffer;
    function getFileHandle(file) {
      if (typeof file === "string") {
        return fs.promises.open(file, "r");
      } else if (typeof file === "number") {
        return file;
      } else if (typeof file === "object" && !(file instanceof Buffer)) {
        return file;
      } else if (!(file instanceof Buffer)) {
        throw new Error("Given file is not valid, please check its type.");
      } else {
        return file;
      }
    }
    exports2.getFileHandle = getFileHandle;
    async function getFileSizeFromFileHandle(fileHandle) {
      if (typeof fileHandle === "number") {
        const stats = await new Promise((resolve, reject) => {
          fs.fstat(fileHandle, (err, stats2) => {
            if (err)
              reject(err);
            resolve(stats2);
          });
        });
        return stats.size;
      } else if (fileHandle instanceof Buffer) {
        return fileHandle.length;
      } else {
        return (await fileHandle.stat()).size;
      }
    }
    exports2.getFileSizeFromFileHandle = getFileSizeFromFileHandle;
    function getMimeType(file, type, mimeType) {
      if (typeof mimeType === "string") {
        return mimeType;
      } else if (typeof file === "string" && !type) {
        return getMimeByName(file);
      } else if (typeof type === "string") {
        return getMimeByType(type);
      }
      throw new Error("You must specify type if file is a file handle or Buffer.");
    }
    exports2.getMimeType = getMimeType;
    function getMimeByName(name) {
      if (name.endsWith(".jpeg") || name.endsWith(".jpg"))
        return types_1.EUploadMimeType.Jpeg;
      if (name.endsWith(".png"))
        return types_1.EUploadMimeType.Png;
      if (name.endsWith(".webp"))
        return types_1.EUploadMimeType.Webp;
      if (name.endsWith(".gif"))
        return types_1.EUploadMimeType.Gif;
      if (name.endsWith(".mpeg4") || name.endsWith(".mp4"))
        return types_1.EUploadMimeType.Mp4;
      if (name.endsWith(".mov") || name.endsWith(".mov"))
        return types_1.EUploadMimeType.Mov;
      if (name.endsWith(".srt"))
        return types_1.EUploadMimeType.Srt;
      (0, helpers_1.safeDeprecationWarning)({
        instance: "TwitterApiv1ReadWrite",
        method: "uploadMedia",
        problem: "options.mimeType is missing and filename couldn't help to resolve MIME type, so it will fallback to image/jpeg",
        resolution: "If you except to give filenames without extensions, please specify explicitlty the MIME type using options.mimeType"
      });
      return types_1.EUploadMimeType.Jpeg;
    }
    function getMimeByType(type) {
      (0, helpers_1.safeDeprecationWarning)({
        instance: "TwitterApiv1ReadWrite",
        method: "uploadMedia",
        problem: "you're using options.type",
        resolution: "Remove options.type argument and migrate to options.mimeType which takes the real MIME type. If you're using type=longmp4, add options.longVideo alongside of mimeType=EUploadMimeType.Mp4"
      });
      if (type === "gif")
        return types_1.EUploadMimeType.Gif;
      if (type === "jpg")
        return types_1.EUploadMimeType.Jpeg;
      if (type === "png")
        return types_1.EUploadMimeType.Png;
      if (type === "webp")
        return types_1.EUploadMimeType.Webp;
      if (type === "srt")
        return types_1.EUploadMimeType.Srt;
      if (type === "mp4" || type === "longmp4")
        return types_1.EUploadMimeType.Mp4;
      if (type === "mov")
        return types_1.EUploadMimeType.Mov;
      return type;
    }
    function getMediaCategoryByMime(name, target) {
      if (name === types_1.EUploadMimeType.Mp4 || name === types_1.EUploadMimeType.Mov)
        return target === "tweet" ? "TweetVideo" : "DmVideo";
      if (name === types_1.EUploadMimeType.Gif)
        return target === "tweet" ? "TweetGif" : "DmGif";
      if (name === types_1.EUploadMimeType.Srt)
        return "Subtitles";
      else
        return target === "tweet" ? "TweetImage" : "DmImage";
    }
    exports2.getMediaCategoryByMime = getMediaCategoryByMime;
    function sleepSecs(seconds) {
      return new Promise((resolve) => setTimeout(resolve, seconds * 1e3));
    }
    exports2.sleepSecs = sleepSecs;
    async function readNextPartOf(file, chunkLength, bufferOffset = 0, buffer) {
      if (file instanceof Buffer) {
        const rt = file.slice(bufferOffset, bufferOffset + chunkLength);
        return [rt, rt.length];
      }
      if (!buffer) {
        throw new Error("Well, we will need a buffer to store file content.");
      }
      let bytesRead;
      if (typeof file === "number") {
        bytesRead = await new Promise((resolve, reject) => {
          fs.read(file, buffer, 0, chunkLength, bufferOffset, (err, nread) => {
            if (err)
              reject(err);
            resolve(nread);
          });
        });
      } else {
        const res = await file.read(buffer, 0, chunkLength, bufferOffset);
        bytesRead = res.bytesRead;
      }
      return [buffer, bytesRead];
    }
    exports2.readNextPartOf = readNextPartOf;
  }
});

// node_modules/twitter-api-v2/dist/cjs/v1/client.v1.write.js
var require_client_v1_write = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/v1/client.v1.write.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var fs = __importStar(require("fs"));
    var globals_1 = require_globals();
    var helpers_1 = require_helpers();
    var types_1 = require_types();
    var client_v1_read_1 = __importDefault(require_client_v1_read());
    var media_helpers_v1_1 = require_media_helpers_v1();
    var UPLOAD_ENDPOINT = "media/upload.json";
    var TwitterApiv1ReadWrite = class extends client_v1_read_1.default {
      constructor() {
        super(...arguments);
        this._prefix = globals_1.API_V1_1_PREFIX;
      }
      /**
       * Get a client with only read rights.
       */
      get readOnly() {
        return this;
      }
      /* Tweet API */
      /**
       * Post a new tweet.
       * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-update
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.tweet()` instead.
       */
      tweet(status, payload = {}) {
        const queryParams = {
          status,
          tweet_mode: "extended",
          ...payload
        };
        return this.post("statuses/update.json", queryParams);
      }
      /**
       * Quote an existing tweet.
       * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-update
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.quote()` instead (Enterprise plans only).
       */
      async quote(status, quotingStatusId, payload = {}) {
        const url = "https://x.com/i/statuses/" + quotingStatusId;
        return this.tweet(status, { ...payload, attachment_url: url });
      }
      /**
       * Post a series of tweets.
       * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-update
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.tweetThread()` instead.
       */
      async tweetThread(tweets) {
        const postedTweets = [];
        for (const tweet of tweets) {
          const lastTweet = postedTweets.length ? postedTweets[postedTweets.length - 1] : null;
          const queryParams = { ...typeof tweet === "string" ? { status: tweet } : tweet };
          const inReplyToId = lastTweet ? lastTweet.id_str : queryParams.in_reply_to_status_id;
          const status = queryParams.status;
          if (inReplyToId) {
            postedTweets.push(await this.reply(status, inReplyToId, queryParams));
          } else {
            postedTweets.push(await this.tweet(status, queryParams));
          }
        }
        return postedTweets;
      }
      /**
       * Reply to an existing tweet. Shortcut to `.tweet` with tweaked parameters.
       * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-update
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.reply()` instead.
       */
      reply(status, in_reply_to_status_id, payload = {}) {
        return this.tweet(status, {
          auto_populate_reply_metadata: true,
          in_reply_to_status_id,
          ...payload
        });
      }
      /**
       * Delete an existing tweet belonging to you.
       * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-destroy-id
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.deleteTweet()` instead.
       */
      deleteTweet(tweetId) {
        return this.post("statuses/destroy/:id.json", { tweet_mode: "extended" }, { params: { id: tweetId } });
      }
      /* User API */
      /**
       * Report the specified user as a spam account to Twitter.
       * Additionally, optionally performs the equivalent of POST blocks/create on behalf of the authenticated user.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/mute-block-report-users/api-reference/post-users-report_spam
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      reportUserAsSpam(options) {
        return this.post("users/report_spam.json", { tweet_mode: "extended", ...options });
      }
      /**
       * Turn on/off Retweets and device notifications from the specified user.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/post-friendships-update
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      updateFriendship(options) {
        return this.post("friendships/update.json", options);
      }
      /**
       * Follow the specified user.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/post-friendships-create
       */
      createFriendship(options) {
        return this.post("friendships/create.json", options);
      }
      /**
       * Unfollow the specified user.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/post-friendships-destroy
       */
      destroyFriendship(options) {
        return this.post("friendships/destroy.json", options);
      }
      /* Account API */
      /**
       * Update current account settings for authenticating user.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/get-account-settings
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      updateAccountSettings(options) {
        return this.post("account/settings.json", options);
      }
      /**
       * Sets some values that users are able to set under the "Account" tab of their settings page.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/post-account-update_profile
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      updateAccountProfile(options) {
        return this.post("account/update_profile.json", options);
      }
      /**
       * Uploads a profile banner on behalf of the authenticating user.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/post-account-update_profile_banner
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      async updateAccountProfileBanner(file, options = {}) {
        const queryParams = {
          banner: await (0, media_helpers_v1_1.readFileIntoBuffer)(file),
          ...options
        };
        return this.post("account/update_profile_banner.json", queryParams, { forceBodyMode: "form-data" });
      }
      /**
       * Updates the authenticating user's profile image.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/post-account-update_profile_image
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      async updateAccountProfileImage(file, options = {}) {
        const queryParams = {
          tweet_mode: "extended",
          image: await (0, media_helpers_v1_1.readFileIntoBuffer)(file),
          ...options
        };
        return this.post("account/update_profile_image.json", queryParams, { forceBodyMode: "form-data" });
      }
      /**
       * Removes the uploaded profile banner for the authenticating user.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/post-account-remove_profile_banner
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      removeAccountProfileBanner() {
        return this.post("account/remove_profile_banner.json");
      }
      /* Lists */
      /**
       * Creates a new list for the authenticated user.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-create
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.createList()` instead.
       */
      createList(options) {
        return this.post("lists/create.json", { tweet_mode: "extended", ...options });
      }
      /**
       * Updates the specified list. The authenticated user must own the list to be able to update it.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-update
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.updateList()` instead.
       */
      updateList(options) {
        return this.post("lists/update.json", { tweet_mode: "extended", ...options });
      }
      /**
       * Deletes the specified list. The authenticated user must own the list to be able to destroy it.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-destroy
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.removeList()` instead.
       */
      removeList(options) {
        return this.post("lists/destroy.json", { tweet_mode: "extended", ...options });
      }
      /**
       * Adds multiple members to a list, by specifying a comma-separated list of member ids or screen names.
       * If you add a single `user_id` or `screen_name`, it will target `lists/members/create.json`, otherwise
       * it will target `lists/members/create_all.json`.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-members-create_all
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.addListMember()` instead.
       */
      addListMembers(options) {
        const hasMultiple = options.user_id && (0, helpers_1.hasMultipleItems)(options.user_id) || options.screen_name && (0, helpers_1.hasMultipleItems)(options.screen_name);
        const endpoint = hasMultiple ? "lists/members/create_all.json" : "lists/members/create.json";
        return this.post(endpoint, options);
      }
      /**
       * Removes one or more members from a list, by specifying a comma-separated list of member ids or screen names.
       * If you add a single `user_id` or `screen_name`, it will target `lists/members/destroy.json`, otherwise
       * it will target `lists/members/destroy_all.json`.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-members-destroy_all
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.removeListMember()` instead.
       */
      removeListMembers(options) {
        const hasMultiple = options.user_id && (0, helpers_1.hasMultipleItems)(options.user_id) || options.screen_name && (0, helpers_1.hasMultipleItems)(options.screen_name);
        const endpoint = hasMultiple ? "lists/members/destroy_all.json" : "lists/members/destroy.json";
        return this.post(endpoint, options);
      }
      /**
       * Subscribes the authenticated user to the specified list.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-subscribers-create
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.subscribeToList()` instead.
       */
      subscribeToList(options) {
        return this.post("lists/subscribers/create.json", { tweet_mode: "extended", ...options });
      }
      /**
       * Unsubscribes the authenticated user of the specified list.
       * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-subscribers-destroy
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.unsubscribeOfList()` instead.
       */
      unsubscribeOfList(options) {
        return this.post("lists/subscribers/destroy.json", { tweet_mode: "extended", ...options });
      }
      /* Media upload API */
      /**
       * This endpoint can be used to provide additional information about the uploaded media_id.
       * This feature is currently only supported for images and GIFs.
       * https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/api-reference/post-media-metadata-create
       *
       * @deprecated v1.1 media endpoint, sunset by X in June 2025. Use `v2.createMediaMetadata()` instead.
       */
      createMediaMetadata(mediaId, metadata) {
        return this.post("media/metadata/create.json", { media_id: mediaId, ...metadata }, { prefix: globals_1.API_V1_1_UPLOAD_PREFIX, forceBodyMode: "json" });
      }
      /**
       * Use this endpoint to associate uploaded subtitles to an uploaded video. You can associate subtitles to video before or after Tweeting.
       * **To obtain subtitle media ID, you must upload each subtitle file separately using `.uploadMedia()` method.**
       *
       * https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/api-reference/post-media-subtitles-create
       *
       * @deprecated v1.1 media endpoint, sunset by X in June 2025. No v2 equivalent in this library.
       */
      createMediaSubtitles(mediaId, subtitles) {
        return this.post("media/subtitles/create.json", { media_id: mediaId, media_category: "TweetVideo", subtitle_info: { subtitles } }, { prefix: globals_1.API_V1_1_UPLOAD_PREFIX, forceBodyMode: "json" });
      }
      /**
       * Use this endpoint to dissociate subtitles from a video and delete the subtitles. You can dissociate subtitles from a video before or after Tweeting.
       * https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/api-reference/post-media-subtitles-delete
       *
       * @deprecated v1.1 media endpoint, sunset by X in June 2025. No v2 equivalent in this library.
       */
      deleteMediaSubtitles(mediaId, ...languages) {
        return this.post("media/subtitles/delete.json", {
          media_id: mediaId,
          media_category: "TweetVideo",
          subtitle_info: { subtitles: languages.map((lang) => ({ language_code: lang })) }
        }, { prefix: globals_1.API_V1_1_UPLOAD_PREFIX, forceBodyMode: "json" });
      }
      async uploadMedia(file, options = {}, returnFullMediaData = false) {
        var _a;
        const chunkLength = (_a = options.chunkLength) !== null && _a !== void 0 ? _a : 1024 * 1024;
        const { fileHandle, mediaCategory, fileSize, mimeType } = await this.getUploadMediaRequirements(file, options);
        try {
          const mediaData = await this.post(UPLOAD_ENDPOINT, {
            command: "INIT",
            total_bytes: fileSize,
            media_type: mimeType,
            media_category: mediaCategory,
            additional_owners: options.additionalOwners,
            shared: options.shared ? true : void 0
          }, { prefix: globals_1.API_V1_1_UPLOAD_PREFIX });
          await this.mediaChunkedUpload(fileHandle, chunkLength, mediaData.media_id_string, options.maxConcurrentUploads);
          const fullMediaData = await this.post(UPLOAD_ENDPOINT, {
            command: "FINALIZE",
            media_id: mediaData.media_id_string
          }, { prefix: globals_1.API_V1_1_UPLOAD_PREFIX });
          if (fullMediaData.processing_info && fullMediaData.processing_info.state !== "succeeded") {
            await this.awaitForMediaProcessingCompletion(fullMediaData);
          }
          if (returnFullMediaData) {
            return fullMediaData;
          } else {
            return fullMediaData.media_id_string;
          }
        } finally {
          if (typeof file === "number") {
            fs.close(file, () => {
            });
          } else if (typeof fileHandle === "object" && !(fileHandle instanceof Buffer)) {
            fileHandle.close();
          }
        }
      }
      async awaitForMediaProcessingCompletion(fullMediaData) {
        var _a;
        while (true) {
          fullMediaData = await this.mediaInfo(fullMediaData.media_id_string);
          const { processing_info } = fullMediaData;
          if (!processing_info || processing_info.state === "succeeded") {
            return;
          }
          if ((_a = processing_info.error) === null || _a === void 0 ? void 0 : _a.code) {
            const { name, message } = processing_info.error;
            throw new Error(`Failed to process media: ${name} - ${message}.`);
          }
          if (processing_info.state === "failed") {
            throw new Error("Failed to process the media.");
          }
          if (processing_info.check_after_secs) {
            await (0, media_helpers_v1_1.sleepSecs)(processing_info.check_after_secs);
          } else {
            await (0, media_helpers_v1_1.sleepSecs)(5);
          }
        }
      }
      async getUploadMediaRequirements(file, { mimeType, type, target, longVideo } = {}) {
        let fileHandle;
        try {
          fileHandle = await (0, media_helpers_v1_1.getFileHandle)(file);
          const realMimeType = (0, media_helpers_v1_1.getMimeType)(file, type, mimeType);
          let mediaCategory;
          if (realMimeType === types_1.EUploadMimeType.Mp4 && (!mimeType && !type && target !== "dm" || longVideo)) {
            mediaCategory = "amplify_video";
          } else {
            mediaCategory = (0, media_helpers_v1_1.getMediaCategoryByMime)(realMimeType, target !== null && target !== void 0 ? target : "tweet");
          }
          return {
            fileHandle,
            mediaCategory,
            fileSize: await (0, media_helpers_v1_1.getFileSizeFromFileHandle)(fileHandle),
            mimeType: realMimeType
          };
        } catch (e) {
          if (typeof file === "number") {
            fs.close(file, () => {
            });
          } else if (typeof fileHandle === "object" && !(fileHandle instanceof Buffer)) {
            fileHandle.close();
          }
          throw e;
        }
      }
      async mediaChunkedUpload(fileHandle, chunkLength, mediaId, maxConcurrentUploads = 3) {
        let chunkIndex = 0;
        if (maxConcurrentUploads < 1) {
          throw new RangeError("Bad maxConcurrentUploads parameter.");
        }
        const buffer = fileHandle instanceof Buffer ? void 0 : Buffer.alloc(chunkLength);
        let readBuffer;
        let nread;
        let offset = 0;
        [readBuffer, nread] = await (0, media_helpers_v1_1.readNextPartOf)(fileHandle, chunkLength, offset, buffer);
        offset += nread;
        const currentUploads = /* @__PURE__ */ new Set();
        while (nread) {
          const mediaBufferPart = readBuffer.slice(0, nread);
          if (mediaBufferPart.length) {
            const request = this.post(UPLOAD_ENDPOINT, {
              command: "APPEND",
              media_id: mediaId,
              segment_index: chunkIndex,
              media: mediaBufferPart
            }, { prefix: globals_1.API_V1_1_UPLOAD_PREFIX });
            currentUploads.add(request);
            request.then(() => {
              currentUploads.delete(request);
            });
            chunkIndex++;
          }
          if (currentUploads.size >= maxConcurrentUploads) {
            await Promise.race(currentUploads);
          }
          [readBuffer, nread] = await (0, media_helpers_v1_1.readNextPartOf)(fileHandle, chunkLength, offset, buffer);
          offset += nread;
        }
        await Promise.all([...currentUploads]);
      }
    };
    exports2.default = TwitterApiv1ReadWrite;
  }
});

// node_modules/twitter-api-v2/dist/cjs/v1/client.v1.js
var require_client_v1 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/v1/client.v1.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TwitterApiv1 = void 0;
    var globals_1 = require_globals();
    var dm_paginator_v1_1 = require_dm_paginator_v1();
    var types_1 = require_types();
    var client_v1_write_1 = __importDefault(require_client_v1_write());
    var TwitterApiv1 = class extends client_v1_write_1.default {
      constructor() {
        super(...arguments);
        this._prefix = globals_1.API_V1_1_PREFIX;
      }
      /**
       * Get a client with read/write rights.
       */
      get readWrite() {
        return this;
      }
      /* Direct messages */
      // Part: Sending and receiving events
      /**
       * Publishes a new message_create event resulting in a Direct Message sent to a specified user from the authenticating user.
       * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/sending-and-receiving/api-reference/new-event
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.sendDmToParticipant()` instead.
       */
      sendDm({ recipient_id, custom_profile_id, ...params }) {
        const args = {
          event: {
            type: types_1.EDirectMessageEventTypeV1.Create,
            [types_1.EDirectMessageEventTypeV1.Create]: {
              target: { recipient_id },
              message_data: params
            }
          }
        };
        if (custom_profile_id) {
          args.event[types_1.EDirectMessageEventTypeV1.Create].custom_profile_id = custom_profile_id;
        }
        return this.post("direct_messages/events/new.json", args, {
          forceBodyMode: "json"
        });
      }
      /**
       * Returns a single Direct Message event by the given id.
       *
       * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/sending-and-receiving/api-reference/get-event
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.dmEvent()` instead.
       */
      getDmEvent(id) {
        return this.get("direct_messages/events/show.json", { id });
      }
      /**
       * Deletes the direct message specified in the required ID parameter.
       * The authenticating user must be the recipient of the specified direct message.
       * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/sending-and-receiving/api-reference/delete-message-event
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.deleteDmEvent()` instead.
       */
      deleteDm(id) {
        return this.delete("direct_messages/events/destroy.json", { id });
      }
      /**
       * Returns all Direct Message events (both sent and received) within the last 30 days.
       * Sorted in reverse-chronological order.
       *
       * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/sending-and-receiving/api-reference/list-events
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.listDmEvents()` instead.
       */
      async listDmEvents(args = {}) {
        const queryParams = { ...args };
        const initialRq = await this.get("direct_messages/events/list.json", queryParams, { fullResponse: true });
        return new dm_paginator_v1_1.DmEventsV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      // Part: Welcome messages (events)
      /**
       * Creates a new Welcome Message that will be stored and sent in the future from the authenticating user in defined circumstances.
       * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/welcome-messages/api-reference/new-welcome-message
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
       */
      newWelcomeDm(name, data) {
        const args = {
          [types_1.EDirectMessageEventTypeV1.WelcomeCreate]: {
            name,
            message_data: data
          }
        };
        return this.post("direct_messages/welcome_messages/new.json", args, {
          forceBodyMode: "json"
        });
      }
      /**
       * Returns a Welcome Message by the given id.
       * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/welcome-messages/api-reference/get-welcome-message
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
       */
      getWelcomeDm(id) {
        return this.get("direct_messages/welcome_messages/show.json", { id });
      }
      /**
       * Deletes a Welcome Message by the given id.
       * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/welcome-messages/api-reference/delete-welcome-message
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
       */
      deleteWelcomeDm(id) {
        return this.delete("direct_messages/welcome_messages/destroy.json", { id });
      }
      /**
       * Updates a Welcome Message by the given ID.
       * Updates to the welcome_message object are atomic.
       * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/welcome-messages/api-reference/update-welcome-message
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
       */
      updateWelcomeDm(id, data) {
        const args = { message_data: data };
        return this.put("direct_messages/welcome_messages/update.json", args, {
          forceBodyMode: "json",
          query: { id }
        });
      }
      /**
       * Returns all Direct Message events (both sent and received) within the last 30 days.
       * Sorted in reverse-chronological order.
       *
       * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/sending-and-receiving/api-reference/list-events
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
       */
      async listWelcomeDms(args = {}) {
        const queryParams = { ...args };
        const initialRq = await this.get("direct_messages/welcome_messages/list.json", queryParams, { fullResponse: true });
        return new dm_paginator_v1_1.WelcomeDmV1Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      // Part: Welcome message (rules)
      /**
       * Creates a new Welcome Message Rule that determines which Welcome Message will be shown in a given conversation.
       * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/welcome-messages/api-reference/new-welcome-message-rule
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
       */
      newWelcomeDmRule(welcomeMessageId) {
        return this.post("direct_messages/welcome_messages/rules/new.json", {
          welcome_message_rule: { welcome_message_id: welcomeMessageId }
        }, {
          forceBodyMode: "json"
        });
      }
      /**
       * Returns a Welcome Message Rule by the given id.
       * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/welcome-messages/api-reference/get-welcome-message-rule
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
       */
      getWelcomeDmRule(id) {
        return this.get("direct_messages/welcome_messages/rules/show.json", { id });
      }
      /**
       * Deletes a Welcome Message Rule by the given id.
       * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/welcome-messages/api-reference/delete-welcome-message-rule
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
       */
      deleteWelcomeDmRule(id) {
        return this.delete("direct_messages/welcome_messages/rules/destroy.json", { id });
      }
      /**
       * Retrieves all welcome DM rules for this account.
       * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/welcome-messages/api-reference/list-welcome-message-rules
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
       */
      async listWelcomeDmRules(args = {}) {
        const queryParams = { ...args };
        return this.get("direct_messages/welcome_messages/rules/list.json", queryParams);
      }
      /**
       * Set the current showed welcome message for logged account ; wrapper for Welcome DM rules.
       * Test if a rule already exists, delete if any, then create a rule for current message ID.
       *
       * If you don't have already a welcome message, create it with `.newWelcomeMessage`.
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
       */
      async setWelcomeDm(welcomeMessageId, deleteAssociatedWelcomeDmWhenDeletingRule = true) {
        var _a;
        const existingRules = await this.listWelcomeDmRules();
        if ((_a = existingRules.welcome_message_rules) === null || _a === void 0 ? void 0 : _a.length) {
          for (const rule of existingRules.welcome_message_rules) {
            await this.deleteWelcomeDmRule(rule.id);
            if (deleteAssociatedWelcomeDmWhenDeletingRule) {
              await this.deleteWelcomeDm(rule.welcome_message_id);
            }
          }
        }
        return this.newWelcomeDmRule(welcomeMessageId);
      }
      // Part: Read indicator
      /**
       * Marks a message as read in the recipient’s Direct Message conversation view with the sender.
       * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/typing-indicator-and-read-receipts/api-reference/new-read-receipt
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      markDmAsRead(lastEventId, recipientId) {
        return this.post("direct_messages/mark_read.json", {
          last_read_event_id: lastEventId,
          recipient_id: recipientId
        }, { forceBodyMode: "url" });
      }
      /**
       * Displays a visual typing indicator in the recipient’s Direct Message conversation view with the sender.
       * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/typing-indicator-and-read-receipts/api-reference/new-typing-indicator
       *
       * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
       */
      indicateDmTyping(recipientId) {
        return this.post("direct_messages/indicate_typing.json", {
          recipient_id: recipientId
        }, { forceBodyMode: "url" });
      }
      // Part: Images
      /**
       * Get a single image attached to a direct message. TwitterApi client must be logged with OAuth 1.0a.
       * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/message-attachments/guides/retrieving-media
       */
      async downloadDmImage(urlOrDm) {
        if (typeof urlOrDm !== "string") {
          const attachment = urlOrDm[types_1.EDirectMessageEventTypeV1.Create].message_data.attachment;
          if (!attachment) {
            throw new Error("The given direct message doesn't contain any attachment");
          }
          urlOrDm = attachment.media.media_url_https;
        }
        const data = await this.get(urlOrDm, void 0, { forceParseMode: "buffer", prefix: "" });
        if (!data.length) {
          throw new Error("Image not found. Make sure you are logged with credentials able to access direct messages, and check the URL.");
        }
        return data;
      }
    };
    exports2.TwitterApiv1 = TwitterApiv1;
    exports2.default = TwitterApiv1;
  }
});

// node_modules/twitter-api-v2/dist/cjs/v2/includes.v2.helper.js
var require_includes_v2_helper = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/v2/includes.v2.helper.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TwitterV2IncludesHelper = void 0;
    var TwitterV2IncludesHelper = class _TwitterV2IncludesHelper {
      constructor(result) {
        this.result = result;
      }
      /* Tweets */
      get tweets() {
        return _TwitterV2IncludesHelper.tweets(this.result);
      }
      static tweets(result) {
        var _a, _b;
        return (_b = (_a = result.includes) === null || _a === void 0 ? void 0 : _a.tweets) !== null && _b !== void 0 ? _b : [];
      }
      tweetById(id) {
        return _TwitterV2IncludesHelper.tweetById(this.result, id);
      }
      static tweetById(result, id) {
        return this.tweets(result).find((tweet) => tweet.id === id);
      }
      /** Retweet associated with the given tweet (*`referenced_tweets.id`*) */
      retweet(tweet) {
        return _TwitterV2IncludesHelper.retweet(this.result, tweet);
      }
      /** Retweet associated with the given tweet (*`referenced_tweets.id`*) */
      static retweet(result, tweet) {
        var _a;
        const retweetIds = ((_a = tweet.referenced_tweets) !== null && _a !== void 0 ? _a : []).filter((ref) => ref.type === "retweeted").map((ref) => ref.id);
        return this.tweets(result).find((t) => retweetIds.includes(t.id));
      }
      /** Quoted tweet associated with the given tweet (*`referenced_tweets.id`*) */
      quote(tweet) {
        return _TwitterV2IncludesHelper.quote(this.result, tweet);
      }
      /** Quoted tweet associated with the given tweet (*`referenced_tweets.id`*) */
      static quote(result, tweet) {
        var _a;
        const quoteIds = ((_a = tweet.referenced_tweets) !== null && _a !== void 0 ? _a : []).filter((ref) => ref.type === "quoted").map((ref) => ref.id);
        return this.tweets(result).find((t) => quoteIds.includes(t.id));
      }
      /** Tweet whose has been answered by the given tweet (*`referenced_tweets.id`*) */
      repliedTo(tweet) {
        return _TwitterV2IncludesHelper.repliedTo(this.result, tweet);
      }
      /** Tweet whose has been answered by the given tweet (*`referenced_tweets.id`*) */
      static repliedTo(result, tweet) {
        var _a;
        const repliesIds = ((_a = tweet.referenced_tweets) !== null && _a !== void 0 ? _a : []).filter((ref) => ref.type === "replied_to").map((ref) => ref.id);
        return this.tweets(result).find((t) => repliesIds.includes(t.id));
      }
      /** Tweet author user object of the given tweet (*`author_id`* or *`referenced_tweets.id.author_id`*) */
      author(tweet) {
        return _TwitterV2IncludesHelper.author(this.result, tweet);
      }
      /** Tweet author user object of the given tweet (*`author_id`* or *`referenced_tweets.id.author_id`*) */
      static author(result, tweet) {
        const authorId = tweet.author_id;
        return authorId ? this.users(result).find((u) => u.id === authorId) : void 0;
      }
      /** Tweet author user object of the tweet answered by the given tweet (*`in_reply_to_user_id`*) */
      repliedToAuthor(tweet) {
        return _TwitterV2IncludesHelper.repliedToAuthor(this.result, tweet);
      }
      /** Tweet author user object of the tweet answered by the given tweet (*`in_reply_to_user_id`*) */
      static repliedToAuthor(result, tweet) {
        const inReplyUserId = tweet.in_reply_to_user_id;
        return inReplyUserId ? this.users(result).find((u) => u.id === inReplyUserId) : void 0;
      }
      /* Users */
      get users() {
        return _TwitterV2IncludesHelper.users(this.result);
      }
      static users(result) {
        var _a, _b;
        return (_b = (_a = result.includes) === null || _a === void 0 ? void 0 : _a.users) !== null && _b !== void 0 ? _b : [];
      }
      userById(id) {
        return _TwitterV2IncludesHelper.userById(this.result, id);
      }
      static userById(result, id) {
        return this.users(result).find((u) => u.id === id);
      }
      /** Pinned tweet of the given user (*`pinned_tweet_id`*) */
      pinnedTweet(user) {
        return _TwitterV2IncludesHelper.pinnedTweet(this.result, user);
      }
      /** Pinned tweet of the given user (*`pinned_tweet_id`*) */
      static pinnedTweet(result, user) {
        return user.pinned_tweet_id ? this.tweets(result).find((t) => t.id === user.pinned_tweet_id) : void 0;
      }
      /* Medias */
      get media() {
        return _TwitterV2IncludesHelper.media(this.result);
      }
      static media(result) {
        var _a, _b;
        return (_b = (_a = result.includes) === null || _a === void 0 ? void 0 : _a.media) !== null && _b !== void 0 ? _b : [];
      }
      /** Medias associated with the given tweet (*`attachments.media_keys`*) */
      medias(tweet) {
        return _TwitterV2IncludesHelper.medias(this.result, tweet);
      }
      /** Medias associated with the given tweet (*`attachments.media_keys`*) */
      static medias(result, tweet) {
        var _a, _b;
        const keys = (_b = (_a = tweet.attachments) === null || _a === void 0 ? void 0 : _a.media_keys) !== null && _b !== void 0 ? _b : [];
        return this.media(result).filter((m) => keys.includes(m.media_key));
      }
      /* Polls */
      get polls() {
        return _TwitterV2IncludesHelper.polls(this.result);
      }
      static polls(result) {
        var _a, _b;
        return (_b = (_a = result.includes) === null || _a === void 0 ? void 0 : _a.polls) !== null && _b !== void 0 ? _b : [];
      }
      /** Poll associated with the given tweet (*`attachments.poll_ids`*) */
      poll(tweet) {
        return _TwitterV2IncludesHelper.poll(this.result, tweet);
      }
      /** Poll associated with the given tweet (*`attachments.poll_ids`*) */
      static poll(result, tweet) {
        var _a, _b;
        const pollIds = (_b = (_a = tweet.attachments) === null || _a === void 0 ? void 0 : _a.poll_ids) !== null && _b !== void 0 ? _b : [];
        if (pollIds.length) {
          const pollId = pollIds[0];
          return this.polls(result).find((p) => p.id === pollId);
        }
        return void 0;
      }
      /* Places */
      get places() {
        return _TwitterV2IncludesHelper.places(this.result);
      }
      static places(result) {
        var _a, _b;
        return (_b = (_a = result.includes) === null || _a === void 0 ? void 0 : _a.places) !== null && _b !== void 0 ? _b : [];
      }
      /** Place associated with the given tweet (*`geo.place_id`*) */
      place(tweet) {
        return _TwitterV2IncludesHelper.place(this.result, tweet);
      }
      /** Place associated with the given tweet (*`geo.place_id`*) */
      static place(result, tweet) {
        var _a;
        const placeId = (_a = tweet.geo) === null || _a === void 0 ? void 0 : _a.place_id;
        return placeId ? this.places(result).find((p) => p.id === placeId) : void 0;
      }
      /* Lists */
      /** List owner of the given list (*`owner_id`*) */
      listOwner(list) {
        return _TwitterV2IncludesHelper.listOwner(this.result, list);
      }
      /** List owner of the given list (*`owner_id`*) */
      static listOwner(result, list) {
        const creatorId = list.owner_id;
        return creatorId ? this.users(result).find((p) => p.id === creatorId) : void 0;
      }
      /* Spaces */
      /** Creator of the given space (*`creator_id`*) */
      spaceCreator(space) {
        return _TwitterV2IncludesHelper.spaceCreator(this.result, space);
      }
      /** Creator of the given space (*`creator_id`*) */
      static spaceCreator(result, space) {
        const creatorId = space.creator_id;
        return creatorId ? this.users(result).find((p) => p.id === creatorId) : void 0;
      }
      /** Current hosts of the given space (*`host_ids`*) */
      spaceHosts(space) {
        return _TwitterV2IncludesHelper.spaceHosts(this.result, space);
      }
      /** Current hosts of the given space (*`host_ids`*) */
      static spaceHosts(result, space) {
        var _a;
        const hostIds = (_a = space.host_ids) !== null && _a !== void 0 ? _a : [];
        return this.users(result).filter((u) => hostIds.includes(u.id));
      }
      /** Current speakers of the given space (*`speaker_ids`*) */
      spaceSpeakers(space) {
        return _TwitterV2IncludesHelper.spaceSpeakers(this.result, space);
      }
      /** Current speakers of the given space (*`speaker_ids`*) */
      static spaceSpeakers(result, space) {
        var _a;
        const speakerIds = (_a = space.speaker_ids) !== null && _a !== void 0 ? _a : [];
        return this.users(result).filter((u) => speakerIds.includes(u.id));
      }
      /** Current invited users of the given space (*`invited_user_ids`*) */
      spaceInvitedUsers(space) {
        return _TwitterV2IncludesHelper.spaceInvitedUsers(this.result, space);
      }
      /** Current invited users of the given space (*`invited_user_ids`*) */
      static spaceInvitedUsers(result, space) {
        var _a;
        const invitedUserIds = (_a = space.invited_user_ids) !== null && _a !== void 0 ? _a : [];
        return this.users(result).filter((u) => invitedUserIds.includes(u.id));
      }
    };
    exports2.TwitterV2IncludesHelper = TwitterV2IncludesHelper;
  }
});

// node_modules/twitter-api-v2/dist/cjs/paginators/v2.paginator.js
var require_v2_paginator = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/paginators/v2.paginator.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TimelineV2Paginator = exports2.TwitterV2Paginator = void 0;
    var includes_v2_helper_1 = require_includes_v2_helper();
    var TwitterPaginator_1 = require_TwitterPaginator();
    var TwitterV2Paginator = class extends TwitterPaginator_1.PreviousableTwitterPaginator {
      updateIncludes(data) {
        var _a;
        if (data.errors) {
          if (!this._realData.errors) {
            this._realData.errors = [];
          }
          this._realData.errors = [...this._realData.errors, ...data.errors];
        }
        if (!data.includes) {
          return;
        }
        if (!this._realData.includes) {
          this._realData.includes = {};
        }
        const includesRealData = this._realData.includes;
        for (const [includeKey, includeArray] of Object.entries(data.includes)) {
          const currentArray = (_a = includesRealData[includeKey]) !== null && _a !== void 0 ? _a : [];
          const knownKeys = new Set(currentArray.map((item) => {
            var _a2;
            return (_a2 = item.media_key) !== null && _a2 !== void 0 ? _a2 : item.id;
          }));
          includesRealData[includeKey] = [
            ...currentArray,
            ...includeArray.filter((item) => {
              var _a2;
              const key = (_a2 = item.media_key) !== null && _a2 !== void 0 ? _a2 : item.id;
              if (key !== void 0 && knownKeys.has(key)) {
                return false;
              }
              knownKeys.add(key);
              return true;
            })
          ];
        }
      }
      getEmptyPage() {
        return { meta: { result_count: 0 } };
      }
      /** Throw if the current paginator is not usable. */
      assertUsable() {
        if (this.unusable) {
          throw new Error("Unable to use this paginator to fetch more data, as it does not contain any metadata. Check .errors property for more details.");
        }
      }
      get meta() {
        return this._realData.meta;
      }
      get includes() {
        var _a;
        if (!((_a = this._realData) === null || _a === void 0 ? void 0 : _a.includes)) {
          return new includes_v2_helper_1.TwitterV2IncludesHelper(this._realData);
        }
        if (this._includesInstance) {
          return this._includesInstance;
        }
        return this._includesInstance = new includes_v2_helper_1.TwitterV2IncludesHelper(this._realData);
      }
      get errors() {
        var _a;
        return (_a = this._realData.errors) !== null && _a !== void 0 ? _a : [];
      }
      /** `true` if this paginator only contains error payload and no metadata found to consume data. */
      get unusable() {
        return this.errors.length > 0 && !this._realData.meta && !this._realData.data;
      }
    };
    exports2.TwitterV2Paginator = TwitterV2Paginator;
    var TimelineV2Paginator = class extends TwitterV2Paginator {
      refreshInstanceFromResult(response, isNextPage) {
        var _a, _b;
        const result = response.data;
        const resultData = (_a = result.data) !== null && _a !== void 0 ? _a : [];
        this._rateLimit = response.rateLimit;
        if (!this._realData.data) {
          this._realData.data = [];
        }
        if (isNextPage) {
          this._realData.meta.result_count += result.meta.result_count;
          this._realData.meta.next_token = result.meta.next_token;
          this._realData.data.push(...resultData);
        } else {
          this._realData.meta.result_count += result.meta.result_count;
          this._realData.meta.previous_token = (_b = result.meta.previous_token) !== null && _b !== void 0 ? _b : this._realData.meta.previous_token;
          this._realData.data.unshift(...resultData);
        }
        this.updateIncludes(result);
      }
      getNextQueryParams(maxResults) {
        this.assertUsable();
        return {
          ...this.injectQueryParams(maxResults),
          pagination_token: this._realData.meta.next_token
        };
      }
      getPreviousQueryParams(maxResults) {
        this.assertUsable();
        return {
          ...this.injectQueryParams(maxResults),
          pagination_token: this._realData.meta.previous_token
        };
      }
      getPageLengthFromRequest(result) {
        var _a, _b;
        return (_b = (_a = result.data.data) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
      }
      isFetchLastOver(result) {
        var _a;
        return !((_a = result.data.data) === null || _a === void 0 ? void 0 : _a.length) || !this.canFetchNextPage(result.data);
      }
      canFetchNextPage(result) {
        var _a;
        return !!((_a = result.meta) === null || _a === void 0 ? void 0 : _a.next_token);
      }
    };
    exports2.TimelineV2Paginator = TimelineV2Paginator;
  }
});

// node_modules/twitter-api-v2/dist/cjs/paginators/tweet.paginator.v2.js
var require_tweet_paginator_v2 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/paginators/tweet.paginator.v2.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TweetV2RetweetsOfMePaginator = exports2.TweetV2RetweetsPaginator = exports2.TweetV2ListTweetsPaginator = exports2.TweetV2UserLikedTweetsPaginator = exports2.TweetBookmarksTimelineV2Paginator = exports2.TweetUserMentionTimelineV2Paginator = exports2.TweetUserTimelineV2Paginator = exports2.TweetHomeTimelineV2Paginator = exports2.QuotedTweetsTimelineV2Paginator = exports2.TweetSearchAllV2Paginator = exports2.TweetSearchRecentV2Paginator = void 0;
    var v2_paginator_1 = require_v2_paginator();
    var TweetTimelineV2Paginator = class extends v2_paginator_1.TwitterV2Paginator {
      refreshInstanceFromResult(response, isNextPage) {
        var _a, _b, _c;
        const result = response.data;
        const resultData = (_a = result.data) !== null && _a !== void 0 ? _a : [];
        this._rateLimit = response.rateLimit;
        if (!this._realData.data) {
          this._realData.data = [];
        }
        if (isNextPage) {
          this._realData.meta.oldest_id = (_b = result.meta.oldest_id) !== null && _b !== void 0 ? _b : this._realData.meta.oldest_id;
          this._realData.meta.result_count += result.meta.result_count;
          this._realData.meta.next_token = result.meta.next_token;
          this._realData.data.push(...resultData);
        } else {
          this._realData.meta.newest_id = (_c = result.meta.newest_id) !== null && _c !== void 0 ? _c : this._realData.meta.newest_id;
          this._realData.meta.result_count += result.meta.result_count;
          this._realData.data.unshift(...resultData);
        }
        this.updateIncludes(result);
      }
      getNextQueryParams(maxResults) {
        this.assertUsable();
        const params = { ...this.injectQueryParams(maxResults) };
        if (this._realData.meta.next_token) {
          params.next_token = this._realData.meta.next_token;
        } else {
          if (params.start_time) {
            params.since_id = this.dateStringToSnowflakeId(params.start_time);
            delete params.start_time;
          }
          if (params.end_time) {
            delete params.end_time;
          }
          params.until_id = this._realData.meta.oldest_id;
        }
        return params;
      }
      getPreviousQueryParams(maxResults) {
        this.assertUsable();
        return {
          ...this.injectQueryParams(maxResults),
          since_id: this._realData.meta.newest_id
        };
      }
      getPageLengthFromRequest(result) {
        var _a, _b;
        return (_b = (_a = result.data.data) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
      }
      isFetchLastOver(result) {
        var _a;
        return !((_a = result.data.data) === null || _a === void 0 ? void 0 : _a.length) || !this.canFetchNextPage(result.data);
      }
      canFetchNextPage(result) {
        return !!result.meta.next_token;
      }
      canRequestNextPage() {
        return this.canFetchNextPage(this._realData) || !!this._realData.meta.oldest_id;
      }
      getItemArray() {
        return this.tweets;
      }
      dateStringToSnowflakeId(dateStr) {
        const TWITTER_START_EPOCH = BigInt("1288834974657");
        const date = new Date(dateStr);
        if (isNaN(date.valueOf())) {
          throw new Error("Unable to convert start_time/end_time to a valid date. A ISO 8601 DateTime is excepted, please check your input.");
        }
        const dateTimestamp = BigInt(date.valueOf());
        return (dateTimestamp - TWITTER_START_EPOCH << BigInt("22")).toString();
      }
      /**
       * Tweets returned by paginator.
       */
      get tweets() {
        var _a;
        return (_a = this._realData.data) !== null && _a !== void 0 ? _a : [];
      }
      get meta() {
        return super.meta;
      }
    };
    var TweetPaginableTimelineV2Paginator = class extends v2_paginator_1.TimelineV2Paginator {
      refreshInstanceFromResult(response, isNextPage) {
        var _a, _b;
        super.refreshInstanceFromResult(response, isNextPage);
        const result = response.data;
        if (isNextPage) {
          this._realData.meta.oldest_id = (_a = result.meta.oldest_id) !== null && _a !== void 0 ? _a : this._realData.meta.oldest_id;
        } else {
          this._realData.meta.newest_id = (_b = result.meta.newest_id) !== null && _b !== void 0 ? _b : this._realData.meta.newest_id;
        }
      }
      getItemArray() {
        return this.tweets;
      }
      /**
       * Tweets returned by paginator.
       */
      get tweets() {
        var _a;
        return (_a = this._realData.data) !== null && _a !== void 0 ? _a : [];
      }
      get meta() {
        return super.meta;
      }
    };
    var TweetSearchRecentV2Paginator = class extends TweetTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "tweets/search/recent";
      }
    };
    exports2.TweetSearchRecentV2Paginator = TweetSearchRecentV2Paginator;
    var TweetSearchAllV2Paginator = class extends TweetTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "tweets/search/all";
      }
    };
    exports2.TweetSearchAllV2Paginator = TweetSearchAllV2Paginator;
    var QuotedTweetsTimelineV2Paginator = class extends TweetPaginableTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "tweets/:id/quote_tweets";
      }
    };
    exports2.QuotedTweetsTimelineV2Paginator = QuotedTweetsTimelineV2Paginator;
    var TweetHomeTimelineV2Paginator = class extends TweetPaginableTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "users/:id/timelines/reverse_chronological";
      }
    };
    exports2.TweetHomeTimelineV2Paginator = TweetHomeTimelineV2Paginator;
    var TweetUserTimelineV2Paginator = class extends TweetPaginableTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "users/:id/tweets";
      }
    };
    exports2.TweetUserTimelineV2Paginator = TweetUserTimelineV2Paginator;
    var TweetUserMentionTimelineV2Paginator = class extends TweetPaginableTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "users/:id/mentions";
      }
    };
    exports2.TweetUserMentionTimelineV2Paginator = TweetUserMentionTimelineV2Paginator;
    var TweetBookmarksTimelineV2Paginator = class extends TweetPaginableTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "users/:id/bookmarks";
      }
    };
    exports2.TweetBookmarksTimelineV2Paginator = TweetBookmarksTimelineV2Paginator;
    var TweetListV2Paginator = class extends v2_paginator_1.TimelineV2Paginator {
      /**
       * Tweets returned by paginator.
       */
      get tweets() {
        var _a;
        return (_a = this._realData.data) !== null && _a !== void 0 ? _a : [];
      }
      get meta() {
        return super.meta;
      }
      getItemArray() {
        return this.tweets;
      }
    };
    var TweetV2UserLikedTweetsPaginator = class extends TweetListV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "users/:id/liked_tweets";
      }
    };
    exports2.TweetV2UserLikedTweetsPaginator = TweetV2UserLikedTweetsPaginator;
    var TweetV2ListTweetsPaginator = class extends TweetListV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "lists/:id/tweets";
      }
    };
    exports2.TweetV2ListTweetsPaginator = TweetV2ListTweetsPaginator;
    var TweetV2RetweetsPaginator = class extends TweetListV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "tweets/:id/retweets";
      }
    };
    exports2.TweetV2RetweetsPaginator = TweetV2RetweetsPaginator;
    var TweetV2RetweetsOfMePaginator = class extends TweetListV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "users/reposts_of_me";
      }
    };
    exports2.TweetV2RetweetsOfMePaginator = TweetV2RetweetsOfMePaginator;
  }
});

// node_modules/twitter-api-v2/dist/cjs/paginators/user.paginator.v2.js
var require_user_paginator_v2 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/paginators/user.paginator.v2.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.UserSearchV2Paginator = exports2.TweetRetweetersUsersV2Paginator = exports2.TweetLikingUsersV2Paginator = exports2.UserListFollowersV2Paginator = exports2.UserListMembersV2Paginator = exports2.UserFollowingV2Paginator = exports2.UserFollowersV2Paginator = exports2.UserMutingUsersV2Paginator = exports2.UserBlockingUsersV2Paginator = void 0;
    var v2_paginator_1 = require_v2_paginator();
    var UserTimelineV2Paginator = class extends v2_paginator_1.TimelineV2Paginator {
      getItemArray() {
        return this.users;
      }
      /**
       * Users returned by paginator.
       */
      get users() {
        var _a;
        return (_a = this._realData.data) !== null && _a !== void 0 ? _a : [];
      }
      get meta() {
        return super.meta;
      }
    };
    var UserBlockingUsersV2Paginator = class extends UserTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "users/:id/blocking";
      }
    };
    exports2.UserBlockingUsersV2Paginator = UserBlockingUsersV2Paginator;
    var UserMutingUsersV2Paginator = class extends UserTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "users/:id/muting";
      }
    };
    exports2.UserMutingUsersV2Paginator = UserMutingUsersV2Paginator;
    var UserFollowersV2Paginator = class extends UserTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "users/:id/followers";
      }
    };
    exports2.UserFollowersV2Paginator = UserFollowersV2Paginator;
    var UserFollowingV2Paginator = class extends UserTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "users/:id/following";
      }
    };
    exports2.UserFollowingV2Paginator = UserFollowingV2Paginator;
    var UserListMembersV2Paginator = class extends UserTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "lists/:id/members";
      }
    };
    exports2.UserListMembersV2Paginator = UserListMembersV2Paginator;
    var UserListFollowersV2Paginator = class extends UserTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "lists/:id/followers";
      }
    };
    exports2.UserListFollowersV2Paginator = UserListFollowersV2Paginator;
    var TweetLikingUsersV2Paginator = class extends UserTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "tweets/:id/liking_users";
      }
    };
    exports2.TweetLikingUsersV2Paginator = TweetLikingUsersV2Paginator;
    var TweetRetweetersUsersV2Paginator = class extends UserTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "tweets/:id/retweeted_by";
      }
    };
    exports2.TweetRetweetersUsersV2Paginator = TweetRetweetersUsersV2Paginator;
    var UserSearchV2Paginator = class extends v2_paginator_1.TwitterV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "users/search";
      }
      refreshInstanceFromResult(response, isNextPage) {
        var _a, _b, _c, _d;
        const result = response.data;
        const resultData = (_a = result.data) !== null && _a !== void 0 ? _a : [];
        this._rateLimit = response.rateLimit;
        if (!this._realData.data) {
          this._realData.data = [];
        }
        if (!this._realData.meta) {
          this._realData.meta = {};
        }
        if (isNextPage) {
          this._realData.meta.next_token = (_b = result.meta) === null || _b === void 0 ? void 0 : _b.next_token;
          this._realData.data.push(...resultData);
        } else {
          this._realData.meta.previous_token = (_d = (_c = result.meta) === null || _c === void 0 ? void 0 : _c.previous_token) !== null && _d !== void 0 ? _d : this._realData.meta.previous_token;
          this._realData.data.unshift(...resultData);
        }
        this.updateIncludes(result);
      }
      getNextQueryParams(maxResults) {
        var _a;
        this.assertUsable();
        return {
          ...this.injectQueryParams(maxResults),
          next_token: (_a = this._realData.meta) === null || _a === void 0 ? void 0 : _a.next_token
        };
      }
      getPreviousQueryParams(maxResults) {
        var _a;
        this.assertUsable();
        return {
          ...this.injectQueryParams(maxResults),
          next_token: (_a = this._realData.meta) === null || _a === void 0 ? void 0 : _a.previous_token
        };
      }
      getPageLengthFromRequest(result) {
        var _a, _b;
        return (_b = (_a = result.data.data) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
      }
      isFetchLastOver(result) {
        var _a;
        return !((_a = result.data.data) === null || _a === void 0 ? void 0 : _a.length) || !this.canFetchNextPage(result.data);
      }
      canFetchNextPage(result) {
        var _a;
        return !!((_a = result.meta) === null || _a === void 0 ? void 0 : _a.next_token);
      }
      getItemArray() {
        return this.users;
      }
      /**
       * Users returned by paginator.
       */
      get users() {
        var _a;
        return (_a = this._realData.data) !== null && _a !== void 0 ? _a : [];
      }
      get meta() {
        return super.meta;
      }
    };
    exports2.UserSearchV2Paginator = UserSearchV2Paginator;
  }
});

// node_modules/twitter-api-v2/dist/cjs/paginators/list.paginator.v2.js
var require_list_paginator_v2 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/paginators/list.paginator.v2.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.UserListFollowedV2Paginator = exports2.UserListMembershipsV2Paginator = exports2.UserOwnedListsV2Paginator = void 0;
    var v2_paginator_1 = require_v2_paginator();
    var ListTimelineV2Paginator = class extends v2_paginator_1.TimelineV2Paginator {
      getItemArray() {
        return this.lists;
      }
      /**
       * Lists returned by paginator.
       */
      get lists() {
        var _a;
        return (_a = this._realData.data) !== null && _a !== void 0 ? _a : [];
      }
      get meta() {
        return super.meta;
      }
    };
    var UserOwnedListsV2Paginator = class extends ListTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "users/:id/owned_lists";
      }
    };
    exports2.UserOwnedListsV2Paginator = UserOwnedListsV2Paginator;
    var UserListMembershipsV2Paginator = class extends ListTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "users/:id/list_memberships";
      }
    };
    exports2.UserListMembershipsV2Paginator = UserListMembershipsV2Paginator;
    var UserListFollowedV2Paginator = class extends ListTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "users/:id/followed_lists";
      }
    };
    exports2.UserListFollowedV2Paginator = UserListFollowedV2Paginator;
  }
});

// node_modules/twitter-api-v2/dist/cjs/paginators/index.js
var require_paginators = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/paginators/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    __exportStar(require_tweet_paginator_v2(), exports2);
    __exportStar(require_TwitterPaginator(), exports2);
    __exportStar(require_dm_paginator_v1(), exports2);
    __exportStar(require_mutes_paginator_v1(), exports2);
    __exportStar(require_tweet_paginator_v1(), exports2);
    __exportStar(require_user_paginator_v1(), exports2);
    __exportStar(require_user_paginator_v2(), exports2);
    __exportStar(require_list_paginator_v1(), exports2);
    __exportStar(require_list_paginator_v2(), exports2);
    __exportStar(require_friends_paginator_v1(), exports2);
    __exportStar(require_followers_paginator_v1(), exports2);
  }
});

// node_modules/twitter-api-v2/dist/cjs/v2-labs/client.v2.labs.read.js
var require_client_v2_labs_read = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/v2-labs/client.v2.labs.read.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var client_subclient_1 = __importDefault(require_client_subclient());
    var globals_1 = require_globals();
    var TwitterApiv2LabsReadOnly = class extends client_subclient_1.default {
      constructor() {
        super(...arguments);
        this._prefix = globals_1.API_V2_LABS_PREFIX;
      }
    };
    exports2.default = TwitterApiv2LabsReadOnly;
  }
});

// node_modules/twitter-api-v2/dist/cjs/paginators/dm.paginator.v2.js
var require_dm_paginator_v2 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/paginators/dm.paginator.v2.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConversationDMTimelineV2Paginator = exports2.OneToOneDMTimelineV2Paginator = exports2.FullDMTimelineV2Paginator = exports2.DMTimelineV2Paginator = void 0;
    var v2_paginator_1 = require_v2_paginator();
    var DMTimelineV2Paginator = class extends v2_paginator_1.TimelineV2Paginator {
      getItemArray() {
        return this.events;
      }
      /**
       * Events returned by paginator.
       */
      get events() {
        var _a;
        return (_a = this._realData.data) !== null && _a !== void 0 ? _a : [];
      }
      get meta() {
        return super.meta;
      }
    };
    exports2.DMTimelineV2Paginator = DMTimelineV2Paginator;
    var FullDMTimelineV2Paginator = class extends DMTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "dm_events";
      }
    };
    exports2.FullDMTimelineV2Paginator = FullDMTimelineV2Paginator;
    var OneToOneDMTimelineV2Paginator = class extends DMTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "dm_conversations/with/:participant_id/dm_events";
      }
    };
    exports2.OneToOneDMTimelineV2Paginator = OneToOneDMTimelineV2Paginator;
    var ConversationDMTimelineV2Paginator = class extends DMTimelineV2Paginator {
      constructor() {
        super(...arguments);
        this._endpoint = "dm_conversations/:dm_conversation_id/dm_events";
      }
    };
    exports2.ConversationDMTimelineV2Paginator = ConversationDMTimelineV2Paginator;
  }
});

// node_modules/twitter-api-v2/dist/cjs/v2/client.v2.read.js
var require_client_v2_read = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/v2/client.v2.read.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var client_subclient_1 = __importDefault(require_client_subclient());
    var globals_1 = require_globals();
    var paginators_1 = require_paginators();
    var client_v2_labs_read_1 = __importDefault(require_client_v2_labs_read());
    var user_paginator_v2_1 = require_user_paginator_v2();
    var helpers_1 = require_helpers();
    var dm_paginator_v2_1 = require_dm_paginator_v2();
    var TwitterApiv2ReadOnly = class extends client_subclient_1.default {
      constructor() {
        super(...arguments);
        this._prefix = globals_1.API_V2_PREFIX;
      }
      /* Sub-clients */
      /**
       * Get a client for v2 labs endpoints.
       *
       * @deprecated X retired the Labs endpoints in 2020.
       */
      get labs() {
        if (this._labs)
          return this._labs;
        return this._labs = new client_v2_labs_read_1.default(this);
      }
      async search(queryOrOptions, options = {}) {
        const queryParams = typeof queryOrOptions === "string" ? { ...options, query: queryOrOptions } : { ...queryOrOptions };
        const initialRq = await this.get("tweets/search/recent", queryParams, { fullResponse: true });
        return new paginators_1.TweetSearchRecentV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * The full-archive search endpoint returns the complete history of public Tweets matching a search query;
       * since the first Tweet was created March 26, 2006.
       *
       * This endpoint is only available to those users who have been approved for the Academic Research product track.
       * https://developer.x.com/en/docs/twitter-api/tweets/search/api-reference/get-tweets-search-all
       */
      async searchAll(query, options = {}) {
        const queryParams = { ...options, query };
        const initialRq = await this.get("tweets/search/all", queryParams, { fullResponse: true });
        return new paginators_1.TweetSearchAllV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      /**
       * Returns a variety of information about a single Tweet specified by the requested ID.
       * https://developer.x.com/en/docs/twitter-api/tweets/lookup/api-reference/get-tweets-id
       *
       * OAuth2 scope: `users.read`, `tweet.read`
       */
      singleTweet(tweetId, options = {}) {
        return this.get("tweets/:id", options, { params: { id: tweetId } });
      }
      /**
       * Returns a variety of information about tweets specified by list of IDs.
       * https://developer.x.com/en/docs/twitter-api/tweets/lookup/api-reference/get-tweets
       *
       * OAuth2 scope: `users.read`, `tweet.read`
       */
      tweets(tweetIds, options = {}) {
        return this.get("tweets", { ids: tweetIds, ...options });
      }
      /**
       * The recent Tweet counts endpoint returns count of Tweets from the last seven days that match a search query.
       * OAuth2 Bearer auth only.
       * https://developer.x.com/en/docs/twitter-api/tweets/counts/api-reference/get-tweets-counts-recent
       */
      tweetCountRecent(query, options = {}) {
        return this.get("tweets/counts/recent", { query, ...options });
      }
      /**
       * This endpoint is only available to those users who have been approved for the Academic Research product track.
       * The full-archive search endpoint returns the complete history of public Tweets matching a search query;
       * since the first Tweet was created March 26, 2006.
       * OAuth2 Bearer auth only.
       * **This endpoint has pagination, yet it is not supported by bundled paginators. Use `next_token` to fetch next page.**
       * https://developer.x.com/en/docs/twitter-api/tweets/counts/api-reference/get-tweets-counts-all
       */
      tweetCountAll(query, options = {}) {
        return this.get("tweets/counts/all", { query, ...options });
      }
      async tweetRetweetedBy(tweetId, options = {}) {
        const { asPaginator, ...parameters } = options;
        const initialRq = await this.get("tweets/:id/retweeted_by", parameters, {
          fullResponse: true,
          params: { id: tweetId }
        });
        if (!asPaginator) {
          return initialRq.data;
        }
        return new user_paginator_v2_1.TweetRetweetersUsersV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: parameters,
          sharedParams: { id: tweetId }
        });
      }
      async tweetLikedBy(tweetId, options = {}) {
        const { asPaginator, ...parameters } = options;
        const initialRq = await this.get("tweets/:id/liking_users", parameters, {
          fullResponse: true,
          params: { id: tweetId }
        });
        if (!asPaginator) {
          return initialRq.data;
        }
        return new user_paginator_v2_1.TweetLikingUsersV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: parameters,
          sharedParams: { id: tweetId }
        });
      }
      /**
       * Allows you to retrieve a collection of the most recent Tweets and Retweets posted by you and users you follow, also known as home timeline.
       * This endpoint returns up to the last 3200 Tweets.
       * https://developer.x.com/en/docs/twitter-api/tweets/timelines/api-reference/get-users-id-reverse-chronological
       *
       * OAuth 2 scopes: `tweet.read` `users.read`
       */
      async homeTimeline(options = {}) {
        const meUser = await this.getCurrentUserV2Object();
        const initialRq = await this.get("users/:id/timelines/reverse_chronological", options, {
          fullResponse: true,
          params: { id: meUser.data.id }
        });
        return new paginators_1.TweetHomeTimelineV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: options,
          sharedParams: { id: meUser.data.id }
        });
      }
      /**
       * Returns Tweets composed by a single user, specified by the requested user ID.
       * By default, the most recent ten Tweets are returned per request.
       * Using pagination, the most recent 3,200 Tweets can be retrieved.
       * https://developer.x.com/en/docs/twitter-api/tweets/timelines/api-reference/get-users-id-tweets
       */
      async userTimeline(userId, options = {}) {
        const initialRq = await this.get("users/:id/tweets", options, {
          fullResponse: true,
          params: { id: userId }
        });
        return new paginators_1.TweetUserTimelineV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: options,
          sharedParams: { id: userId }
        });
      }
      /**
       * Returns Tweets mentioning a single user specified by the requested user ID.
       * By default, the most recent ten Tweets are returned per request.
       * Using pagination, up to the most recent 800 Tweets can be retrieved.
       * https://developer.x.com/en/docs/twitter-api/tweets/timelines/api-reference/get-users-id-mentions
       */
      async userMentionTimeline(userId, options = {}) {
        const initialRq = await this.get("users/:id/mentions", options, {
          fullResponse: true,
          params: { id: userId }
        });
        return new paginators_1.TweetUserMentionTimelineV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: options,
          sharedParams: { id: userId }
        });
      }
      /**
       * Returns Quote Tweets for a Tweet specified by the requested Tweet ID.
       * https://developer.x.com/en/docs/twitter-api/tweets/quote-tweets/api-reference/get-tweets-id-quote_tweets
       *
       * OAuth2 scopes: `users.read` `tweet.read`
       */
      async quotes(tweetId, options = {}) {
        const initialRq = await this.get("tweets/:id/quote_tweets", options, {
          fullResponse: true,
          params: { id: tweetId }
        });
        return new paginators_1.QuotedTweetsTimelineV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: options,
          sharedParams: { id: tweetId }
        });
      }
      /**
       * Returns the Retweets of a Tweet (the Tweets themselves; `.tweetRetweetedBy()` returns their authors).
       * https://docs.x.com/x-api/posts/get-reposts
       *
       * OAuth2 scopes: `tweet.read` `users.read`
       */
      async retweets(tweetId, options = {}) {
        const params = { id: tweetId };
        const initialRq = await this.get("tweets/:id/retweets", options, { fullResponse: true, params });
        return new paginators_1.TweetV2RetweetsPaginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: { ...options },
          sharedParams: params
        });
      }
      /**
       * Returns the Retweets of the authenticated user's Tweets.
       * https://docs.x.com/x-api/users/get-reposts-of-me
       *
       * OAuth2 scopes: `tweet.read` `timeline.read`
       */
      async retweetsOfMe(options = {}) {
        const initialRq = await this.get("users/reposts_of_me", options, { fullResponse: true });
        return new paginators_1.TweetV2RetweetsOfMePaginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: { ...options }
        });
      }
      /* Bookmarks */
      /**
       * Allows you to get information about a authenticated user’s 800 most recent bookmarked Tweets.
       * https://developer.x.com/en/docs/twitter-api/tweets/bookmarks/api-reference/get-users-id-bookmarks
       *
       * OAuth2 scopes: `users.read` `tweet.read` `bookmark.read`
       */
      async bookmarks(options = {}) {
        const user = await this.getCurrentUserV2Object();
        const initialRq = await this.get("users/:id/bookmarks", options, {
          fullResponse: true,
          params: { id: user.data.id }
        });
        return new paginators_1.TweetBookmarksTimelineV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: options,
          sharedParams: { id: user.data.id }
        });
      }
      /* Users */
      /**
       * Returns information about an authorized user.
       * https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users-me
       *
       * OAuth2 scopes: `tweet.read` & `users.read`
       */
      me(options = {}) {
        return this.get("users/me", options);
      }
      /**
       * Returns a variety of information about a single user specified by the requested ID.
       * https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users-id
       */
      user(userId, options = {}) {
        return this.get("users/:id", options, { params: { id: userId } });
      }
      /**
       * Returns a variety of information about one or more users specified by the requested IDs.
       * https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users
       */
      users(userIds, options = {}) {
        const ids = Array.isArray(userIds) ? userIds.join(",") : userIds;
        return this.get("users", { ...options, ids });
      }
      /**
       * Returns a variety of information about a single user specified by their username.
       * https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users-by-username-username
       */
      userByUsername(username, options = {}) {
        return this.get("users/by/username/:username", options, { params: { username } });
      }
      /**
       * Returns a variety of information about one or more users specified by their usernames.
       * https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users-by
       *
       * OAuth2 scope: `users.read`, `tweet.read`
       */
      usersByUsernames(usernames, options = {}) {
        usernames = Array.isArray(usernames) ? usernames.join(",") : usernames;
        return this.get("users/by", { ...options, usernames });
      }
      /**
       * Returns the users that match a search query.
       * https://docs.x.com/x-api/users/search-users
       *
       * OAuth2 scopes: `users.read` `tweet.read`
       */
      async searchUsers(query, options = {}) {
        const queryParams = { ...options, query };
        const initialRq = await this.get("users/search", queryParams, { fullResponse: true });
        return new user_paginator_v2_1.UserSearchV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams
        });
      }
      async followers(userId, options = {}) {
        const { asPaginator, ...parameters } = options;
        const params = { id: userId };
        if (!asPaginator) {
          return this.get("users/:id/followers", parameters, { params });
        }
        const initialRq = await this.get("users/:id/followers", parameters, { fullResponse: true, params });
        return new user_paginator_v2_1.UserFollowersV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: parameters,
          sharedParams: params
        });
      }
      async following(userId, options = {}) {
        const { asPaginator, ...parameters } = options;
        const params = { id: userId };
        if (!asPaginator) {
          return this.get("users/:id/following", parameters, { params });
        }
        const initialRq = await this.get("users/:id/following", parameters, { fullResponse: true, params });
        return new user_paginator_v2_1.UserFollowingV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: parameters,
          sharedParams: params
        });
      }
      /**
       * Allows you to get information about a user’s liked Tweets.
       * https://developer.x.com/en/docs/twitter-api/tweets/likes/api-reference/get-users-id-liked_tweets
       */
      async userLikedTweets(userId, options = {}) {
        const params = { id: userId };
        const initialRq = await this.get("users/:id/liked_tweets", options, { fullResponse: true, params });
        return new paginators_1.TweetV2UserLikedTweetsPaginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: { ...options },
          sharedParams: params
        });
      }
      /**
       * Returns a list of users who are blocked by the authenticating user.
       * https://developer.x.com/en/docs/twitter-api/users/blocks/api-reference/get-users-blocking
       */
      async userBlockingUsers(userId, options = {}) {
        const params = { id: userId };
        const initialRq = await this.get("users/:id/blocking", options, { fullResponse: true, params });
        return new user_paginator_v2_1.UserBlockingUsersV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: { ...options },
          sharedParams: params
        });
      }
      /**
       * Returns a list of users who are muted by the authenticating user.
       * https://developer.x.com/en/docs/twitter-api/users/mutes/api-reference/get-users-muting
       */
      async userMutingUsers(userId, options = {}) {
        const params = { id: userId };
        const initialRq = await this.get("users/:id/muting", options, { fullResponse: true, params });
        return new user_paginator_v2_1.UserMutingUsersV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: { ...options },
          sharedParams: params
        });
      }
      /* Lists */
      /**
       * Returns the details of a specified List.
       * https://developer.x.com/en/docs/twitter-api/lists/list-lookup/api-reference/get-lists-id
       */
      list(id, options = {}) {
        return this.get("lists/:id", options, { params: { id } });
      }
      /**
       * Returns all Lists owned by the specified user.
       * https://developer.x.com/en/docs/twitter-api/lists/list-lookup/api-reference/get-users-id-owned_lists
       */
      async listsOwned(userId, options = {}) {
        const params = { id: userId };
        const initialRq = await this.get("users/:id/owned_lists", options, { fullResponse: true, params });
        return new paginators_1.UserOwnedListsV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: { ...options },
          sharedParams: params
        });
      }
      /**
       * Returns all Lists a specified user is a member of.
       * https://developer.x.com/en/docs/twitter-api/lists/list-members/api-reference/get-users-id-list_memberships
       */
      async listMemberships(userId, options = {}) {
        const params = { id: userId };
        const initialRq = await this.get("users/:id/list_memberships", options, { fullResponse: true, params });
        return new paginators_1.UserListMembershipsV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: { ...options },
          sharedParams: params
        });
      }
      /**
       * Returns all Lists a specified user follows.
       * https://developer.x.com/en/docs/twitter-api/lists/list-follows/api-reference/get-users-id-followed_lists
       */
      async listFollowed(userId, options = {}) {
        const params = { id: userId };
        const initialRq = await this.get("users/:id/followed_lists", options, { fullResponse: true, params });
        return new paginators_1.UserListFollowedV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: { ...options },
          sharedParams: params
        });
      }
      /**
       * Returns the Lists pinned by the authenticated user.
       * https://docs.x.com/x-api/users/get-pinned-lists
       *
       * OAuth2 scopes: `tweet.read` `users.read` `list.read`
       *
       * **Note**: You must specify the currently logged user ID; you can get it with `client.currentUserV2()`.
       */
      listsPinned(loggedUserId, options = {}) {
        return this.get("users/:id/pinned_lists", options, { params: { id: loggedUserId } });
      }
      /**
       * Returns a list of Tweets from the specified List.
       * https://developer.x.com/en/docs/twitter-api/lists/list-tweets/api-reference/get-lists-id-tweets
       */
      async listTweets(listId, options = {}) {
        const params = { id: listId };
        const initialRq = await this.get("lists/:id/tweets", options, { fullResponse: true, params });
        return new paginators_1.TweetV2ListTweetsPaginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: { ...options },
          sharedParams: params
        });
      }
      /**
       * Returns a list of users who are members of the specified List.
       * https://developer.x.com/en/docs/twitter-api/lists/list-members/api-reference/get-lists-id-members
       */
      async listMembers(listId, options = {}) {
        const params = { id: listId };
        const initialRq = await this.get("lists/:id/members", options, { fullResponse: true, params });
        return new user_paginator_v2_1.UserListMembersV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: { ...options },
          sharedParams: params
        });
      }
      /**
       * Returns a list of users who are followers of the specified List.
       * https://developer.x.com/en/docs/twitter-api/lists/list-follows/api-reference/get-lists-id-followers
       */
      async listFollowers(listId, options = {}) {
        const params = { id: listId };
        const initialRq = await this.get("lists/:id/followers", options, { fullResponse: true, params });
        return new user_paginator_v2_1.UserListFollowersV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: { ...options },
          sharedParams: params
        });
      }
      /* Direct messages */
      /**
       * Returns a list of Direct Messages for the authenticated user, both sent and received.
       * Direct Message events are returned in reverse chronological order.
       * Supports retrieving events from the previous 30 days.
       *
       * OAuth 2 scopes: `dm.read`, `tweet.read`, `user.read`
       *
       * https://developer.x.com/en/docs/twitter-api/direct-messages/lookup/api-reference/get-dm_events
       */
      async listDmEvents(options = {}) {
        const initialRq = await this.get("dm_events", options, { fullResponse: true });
        return new dm_paginator_v2_1.FullDMTimelineV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: { ...options }
        });
      }
      /**
       * Returns a list of Direct Messages (DM) events within a 1-1 conversation with the user specified in the participant_id path parameter.
       * Messages are returned in reverse chronological order.
       *
       * OAuth 2 scopes: `dm.read`, `tweet.read`, `user.read`
       *
       * https://developer.x.com/en/docs/twitter-api/direct-messages/lookup/api-reference/get-dm_conversations-dm_conversation_id-dm_events
       */
      async listDmEventsWithParticipant(participantId, options = {}) {
        const params = { participant_id: participantId };
        const initialRq = await this.get("dm_conversations/with/:participant_id/dm_events", options, { fullResponse: true, params });
        return new dm_paginator_v2_1.OneToOneDMTimelineV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: { ...options },
          sharedParams: params
        });
      }
      /**
       * Returns a list of Direct Messages within a conversation specified in the dm_conversation_id path parameter.
       * Messages are returned in reverse chronological order.
       *
       * OAuth 2 scopes: `dm.read`, `tweet.read`, `user.read`
       *
       * https://developer.x.com/en/docs/twitter-api/direct-messages/lookup/api-reference/get-dm_conversations-dm_conversation_id-dm_events
       */
      async listDmEventsOfConversation(dmConversationId, options = {}) {
        const params = { dm_conversation_id: dmConversationId };
        const initialRq = await this.get("dm_conversations/:dm_conversation_id/dm_events", options, { fullResponse: true, params });
        return new dm_paginator_v2_1.ConversationDMTimelineV2Paginator({
          realData: initialRq.data,
          rateLimit: initialRq.rateLimit,
          instance: this,
          queryParams: { ...options },
          sharedParams: params
        });
      }
      /**
       * Returns a single Direct Message event by its ID.
       *
       * OAuth 2 scopes: `dm.read`, `tweet.read`, `users.read`
       *
       * https://docs.x.com/x-api/direct-messages/get-dm-event-by-id
       */
      dmEvent(eventId, options = {}) {
        return this.get("dm_events/:event_id", options, { params: { event_id: eventId } });
      }
      /* Spaces */
      /**
       * Get a single space by ID.
       * https://developer.x.com/en/docs/twitter-api/spaces/lookup/api-reference/get-spaces-id
       *
       * OAuth2 scopes: `tweet.read`, `users.read`, `space.read`.
       */
      space(spaceId, options = {}) {
        return this.get("spaces/:id", options, { params: { id: spaceId } });
      }
      /**
       * Get spaces using their IDs.
       * https://developer.x.com/en/docs/twitter-api/spaces/lookup/api-reference/get-spaces
       *
       * OAuth2 scopes: `tweet.read`, `users.read`, `space.read`.
       */
      spaces(spaceIds, options = {}) {
        return this.get("spaces", { ids: spaceIds, ...options });
      }
      /**
       * Get spaces using their creator user ID(s). (no pagination available)
       * https://developer.x.com/en/docs/twitter-api/spaces/lookup/api-reference/get-spaces-by-creator-ids
       *
       * OAuth2 scopes: `tweet.read`, `users.read`, `space.read`.
       */
      spacesByCreators(creatorIds, options = {}) {
        return this.get("spaces/by/creator_ids", { user_ids: creatorIds, ...options });
      }
      /**
       * Search through spaces using multiple params. (no pagination available)
       * https://developer.x.com/en/docs/twitter-api/spaces/search/api-reference/get-spaces-search
       */
      searchSpaces(options) {
        return this.get("spaces/search", options);
      }
      /**
      * Returns a list of user who purchased a ticket to the requested Space.
      * You must authenticate the request using the Access Token of the creator of the requested Space.
      *
      * **OAuth 2.0 Access Token required**
      *
      * https://developer.x.com/en/docs/twitter-api/spaces/lookup/api-reference/get-spaces-id-buyers
      *
      * OAuth2 scopes: `tweet.read`, `users.read`, `space.read`.
      */
      spaceBuyers(spaceId, options = {}) {
        return this.get("spaces/:id/buyers", options, { params: { id: spaceId } });
      }
      /**
       * Returns Tweets shared in the requested Spaces.
       * https://developer.x.com/en/docs/twitter-api/spaces/lookup/api-reference/get-spaces-id-tweets
       *
       * OAuth2 scope: `users.read`, `tweet.read`, `space.read`
       */
      spaceTweets(spaceId, options = {}) {
        return this.get("spaces/:id/tweets", options, { params: { id: spaceId } });
      }
      searchStream({ autoConnect, ...options } = {}) {
        return this.getStream("tweets/search/stream", options, { payloadIsError: helpers_1.isTweetStreamV2ErrorPayload, autoConnect });
      }
      /**
       * Return a list of rules currently active on the streaming endpoint, either as a list or individually.
       * https://developer.x.com/en/docs/twitter-api/tweets/filtered-stream/api-reference/get-tweets-search-stream-rules
       */
      streamRules(options = {}) {
        return this.get("tweets/search/stream/rules", options);
      }
      updateStreamRules(options, query = {}) {
        return this.post("tweets/search/stream/rules", options, { query });
      }
      /**
       * Returns the number of stream rules of your client app and project, and their caps.
       * OAuth2 Bearer auth only.
       * https://docs.x.com/x-api/stream/get-stream-rule-counts
       */
      streamRuleCounts(options = {}) {
        return this.get("tweets/search/stream/rules/counts", options);
      }
      sampleStream({ autoConnect, ...options } = {}) {
        return this.getStream("tweets/sample/stream", options, { payloadIsError: helpers_1.isTweetStreamV2ErrorPayload, autoConnect });
      }
      sample10Stream({ autoConnect, ...options } = {}) {
        return this.getStream("tweets/sample10/stream", options, { payloadIsError: helpers_1.isTweetStreamV2ErrorPayload, autoConnect });
      }
      /**
       * Returns the active (by default) and past streaming connections of your app, with their disconnect reasons.
       * OAuth2 Bearer auth only.
       * **This endpoint has pagination, yet it is not supported by bundled paginators. Use `next_token` to fetch next page.**
       * https://docs.x.com/x-api/connections/get-connection-history
       */
      streamConnections(options = {}) {
        return this.get("connections", options);
      }
      /**
       * Terminates all the active streaming connections of your app, for example to fix a `TooManyConnections` error.
       * OAuth2 Bearer auth only.
       * https://docs.x.com/x-api/connections/terminate-all-connections
       */
      terminateAllStreamConnections() {
        return this.delete("connections/all");
      }
      /**
       * Terminates the active streaming connections of your app to a stream endpoint, like `filtered_stream`.
       * OAuth2 Bearer auth only.
       * https://docs.x.com/x-api/connections/terminate-connections-by-endpoint
       */
      terminateStreamConnections(endpoint) {
        return this.delete("connections/:endpoint_id", void 0, { params: { endpoint_id: endpoint } });
      }
      /* Batch compliance */
      /**
       * Returns a list of recent compliance jobs.
       * https://developer.x.com/en/docs/twitter-api/compliance/batch-compliance/api-reference/get-compliance-jobs
       */
      complianceJobs(options) {
        return this.get("compliance/jobs", options);
      }
      /**
       * Get a single compliance job with the specified ID.
       * https://developer.x.com/en/docs/twitter-api/compliance/batch-compliance/api-reference/get-compliance-jobs-id
       */
      complianceJob(jobId) {
        return this.get("compliance/jobs/:id", void 0, { params: { id: jobId } });
      }
      /**
       * Creates a new compliance job for Tweet IDs or user IDs, send your file, await result and parse it into an array.
       * You can run one batch job at a time. Returns the created job, but **not the job result!**.
       *
       * You can obtain the result (**after job is completed**) with `.complianceJobResult`.
       * https://developer.x.com/en/docs/twitter-api/compliance/batch-compliance/api-reference/post-compliance-jobs
       */
      async sendComplianceJob(jobParams) {
        const job = await this.post("compliance/jobs", { type: jobParams.type, name: jobParams.name });
        const rawIdsBody = jobParams.ids instanceof Buffer ? jobParams.ids : Buffer.from(jobParams.ids.join("\n"));
        await this.put(job.data.upload_url, rawIdsBody, {
          forceBodyMode: "raw",
          enableAuth: false,
          headers: { "Content-Type": "text/plain" },
          prefix: ""
        });
        return job;
      }
      /**
       * Get the result of a running or completed job, obtained through `.complianceJob`, `.complianceJobs` or `.sendComplianceJob`.
       * If job is still running (`in_progress`), it will await until job is completed. **This could be quite long!**
       * https://developer.x.com/en/docs/twitter-api/compliance/batch-compliance/api-reference/post-compliance-jobs
       */
      async complianceJobResult(job) {
        let runningJob = job;
        while (runningJob.status !== "complete") {
          if (runningJob.status === "expired" || runningJob.status === "failed") {
            throw new Error("Job failed to be completed.");
          }
          await new Promise((resolve) => setTimeout(resolve, 3500));
          runningJob = (await this.complianceJob(job.id)).data;
        }
        const result = await this.get(job.download_url, void 0, {
          enableAuth: false,
          prefix: ""
        });
        return result.trim().split("\n").filter((line) => line).map((line) => JSON.parse(line));
      }
      /* Usage */
      /**
       * Allows you to retrieve your project usage.
       *
       * https://developer.x.com/en/docs/x-api/usage/tweets/introduction
       */
      async usage(options = {}) {
        return this.get("usage/tweets", options);
      }
      /**
       * Returns the pay-per-use credit balance of your developer account, in USD.
       * OAuth2 Bearer or OAuth2 user auth only.
       * https://docs.x.com/x-api/usage/get-usage-credits
       */
      usageCredits() {
        return this.get("usage/credits");
      }
      /* Trends */
      /**
       * Returns the trends of a location, given its Yahoo! WOEID (`1` for worldwide).
       * OAuth2 Bearer or OAuth2 user auth only.
       * https://docs.x.com/x-api/trends/get-trends-by-woeid
       */
      trendsByWoeid(woeid, options = {}) {
        return this.get("trends/by/woeid/:woeid", options, { params: { woeid } });
      }
      /**
       * Returns the trends personalized for the authenticated user.
       * https://docs.x.com/x-api/trends/get-personalized-trends
       *
       * OAuth2 scopes: `tweet.read` `users.read`
       */
      personalizedTrends(options = {}) {
        return this.get("users/personalized_trends", options);
      }
      /**
       * Returns a variety of information about a single Community specified by ID.
       * https://docs.x.com/x-api/communities/communities-lookup-by-community-id
       */
      community(communityId, options = {}) {
        return this.get("communities/:id", options, { params: { id: communityId } });
      }
      /**
       * Search for Communities based on keywords.
       * https://docs.x.com/x-api/communities/search-communities
       */
      searchCommunities(query, options = {}) {
        return this.get("communities/search", { query, ...options });
      }
    };
    exports2.default = TwitterApiv2ReadOnly;
  }
});

// node_modules/twitter-api-v2/dist/cjs/v2-labs/client.v2.labs.write.js
var require_client_v2_labs_write = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/v2-labs/client.v2.labs.write.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var globals_1 = require_globals();
    var client_v2_labs_read_1 = __importDefault(require_client_v2_labs_read());
    var TwitterApiv2LabsReadWrite = class extends client_v2_labs_read_1.default {
      constructor() {
        super(...arguments);
        this._prefix = globals_1.API_V2_LABS_PREFIX;
      }
      /**
       * Get a client with only read rights.
       */
      get readOnly() {
        return this;
      }
    };
    exports2.default = TwitterApiv2LabsReadWrite;
  }
});

// node_modules/twitter-api-v2/dist/cjs/v2/client.v2.write.js
var require_client_v2_write = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/v2/client.v2.write.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var globals_1 = require_globals();
    var client_v2_read_1 = __importDefault(require_client_v2_read());
    var client_v2_labs_write_1 = __importDefault(require_client_v2_labs_write());
    var media_helpers_v1_1 = require_media_helpers_v1();
    var TwitterApiv2ReadWrite = class extends client_v2_read_1.default {
      constructor() {
        super(...arguments);
        this._prefix = globals_1.API_V2_PREFIX;
      }
      /* Sub-clients */
      /**
       * Get a client with only read rights.
       */
      get readOnly() {
        return this;
      }
      /**
       * Get a client for v2 labs endpoints.
       *
       * @deprecated X retired the Labs endpoints in 2020.
       */
      get labs() {
        if (this._labs)
          return this._labs;
        return this._labs = new client_v2_labs_write_1.default(this);
      }
      /* Tweets */
      /**
       * Hides or unhides a reply to a Tweet.
       * https://developer.x.com/en/docs/twitter-api/tweets/hide-replies/api-reference/put-tweets-id-hidden
       */
      hideReply(tweetId, makeHidden) {
        return this.put("tweets/:id/hidden", { hidden: makeHidden }, { params: { id: tweetId } });
      }
      /**
       * Causes the user ID identified in the path parameter to Like the target Tweet.
       * https://developer.x.com/en/docs/twitter-api/tweets/likes/api-reference/post-users-user_id-likes
       *
       * **Note**: You must specify the currently logged user ID; you can get it with `client.currentUserV2()`.
       *
       * **Note**: Since April 20, 2026, X only allows this on Enterprise plans.
       */
      like(loggedUserId, targetTweetId) {
        return this.post("users/:id/likes", { tweet_id: targetTweetId }, { params: { id: loggedUserId } });
      }
      /**
       * Allows a user or authenticated user ID to unlike a Tweet.
       * The request succeeds with no action when the user sends a request to a user they're not liking the Tweet or have already unliked the Tweet.
       * https://developer.x.com/en/docs/twitter-api/tweets/likes/api-reference/delete-users-id-likes-tweet_id
       *
       * **Note**: You must specify the currently logged user ID; you can get it with `client.currentUserV2()`.
       *
       * **Note**: Since April 20, 2026, X only allows this on Enterprise plans.
       */
      unlike(loggedUserId, targetTweetId) {
        return this.delete("users/:id/likes/:tweet_id", void 0, {
          params: { id: loggedUserId, tweet_id: targetTweetId }
        });
      }
      /**
       * Causes the user ID identified in the path parameter to Retweet the target Tweet.
       * https://developer.x.com/en/docs/twitter-api/tweets/retweets/api-reference/post-users-id-retweets
       *
       * **Note**: You must specify the currently logged user ID; you can get it with `client.currentUserV2()`.
       */
      retweet(loggedUserId, targetTweetId) {
        return this.post("users/:id/retweets", { tweet_id: targetTweetId }, { params: { id: loggedUserId } });
      }
      /**
       * Allows a user or authenticated user ID to remove the Retweet of a Tweet.
       * The request succeeds with no action when the user sends a request to a user they're not Retweeting the Tweet or have already removed the Retweet of.
       * https://developer.x.com/en/docs/twitter-api/tweets/retweets/api-reference/delete-users-id-retweets-tweet_id
       *
       * **Note**: You must specify the currently logged user ID; you can get it with `client.currentUserV2()`.
       */
      unretweet(loggedUserId, targetTweetId) {
        return this.delete("users/:id/retweets/:tweet_id", void 0, {
          params: { id: loggedUserId, tweet_id: targetTweetId }
        });
      }
      tweet(status, payload = {}) {
        if (typeof status === "object") {
          payload = status;
        } else {
          payload = { text: status, ...payload };
        }
        return this.post("tweets", payload);
      }
      /**
       * Uploads media to Twitter using chunked upload.
       * https://docs.x.com/x-api/media/media-upload
       *
       * @param media The media to upload: a file path, a file handle or descriptor, or a buffer.
       * Files are read chunk by chunk, so they're never fully loaded in memory. File handles and descriptors are left open.
       * @param options Upload options including media type and category, and additional owners.
       * `options.onProgress` is called after each uploaded chunk, with the bytes uploaded so far and the total size.
       * @param chunkSize Size of each chunk in bytes (default: 1MB)
       * @returns The media ID of the uploaded media
       */
      async uploadMedia(media, options, chunkSize = 1024 * 1024) {
        var _a;
        let media_category = options.media_category;
        if (!options.media_category) {
          if (options.media_type.includes("gif")) {
            media_category = "tweet_gif";
          } else if (options.media_type.includes("image")) {
            media_category = "tweet_image";
          } else if (options.media_type.includes("video")) {
            media_category = "tweet_video";
          }
        }
        const fileHandle = await (0, media_helpers_v1_1.getFileHandle)(media);
        try {
          const totalBytes = await (0, media_helpers_v1_1.getFileSizeFromFileHandle)(fileHandle);
          const initArguments = {
            additional_owners: options.additional_owners,
            media_type: options.media_type,
            total_bytes: totalBytes,
            media_category
          };
          const initResponse = await this.post("media/upload/initialize", initArguments);
          const mediaId = initResponse.data.id;
          const fileBuffer = fileHandle instanceof Buffer ? void 0 : Buffer.alloc(chunkSize);
          let offset = 0;
          for (let segmentIndex = 0; ; segmentIndex++) {
            const [chunk, bytesRead] = await (0, media_helpers_v1_1.readNextPartOf)(fileHandle, chunkSize, offset, fileBuffer);
            if (!bytesRead) {
              break;
            }
            offset += bytesRead;
            const appendArguments = {
              segment_index: segmentIndex,
              media: chunk.subarray(0, bytesRead)
            };
            await this.post(`media/upload/${mediaId}/append`, appendArguments, { forceBodyMode: "form-data" });
            (_a = options.onProgress) === null || _a === void 0 ? void 0 : _a.call(options, offset, totalBytes);
          }
          const finalizeResponse = await this.post(`media/upload/${mediaId}/finalize`);
          if (finalizeResponse.data.processing_info) {
            await this.waitForMediaProcessing(mediaId);
          }
          return mediaId;
        } finally {
          if (typeof media === "string") {
            await fileHandle.close();
          }
        }
      }
      async waitForMediaProcessing(mediaId) {
        var _a;
        const response = await this.get("media/upload", {
          command: "STATUS",
          media_id: mediaId
        });
        const info = response.data.processing_info;
        if (!info)
          return;
        switch (info.state) {
          case "succeeded":
            return;
          case "failed":
            throw new Error(`Media processing failed: ${(_a = info.error) === null || _a === void 0 ? void 0 : _a.message}`);
          case "pending":
          case "in_progress": {
            const waitTime = info === null || info === void 0 ? void 0 : info.check_after_secs;
            if (waitTime && waitTime > 0) {
              await new Promise((resolve) => setTimeout(resolve, waitTime * 1e3));
              await this.waitForMediaProcessing(mediaId);
            }
          }
        }
      }
      /**
       * Creates the metadata for media to be uploaded.
       * This feature is currently only supported for images and GIFs.
       * https://docs.x.com/x-api/media/metadata-create
       */
      createMediaMetadata(mediaId, metadata) {
        return this.post("media/metadata", { id: mediaId, metadata });
      }
      /**
       * Reply to a Tweet on behalf of an authenticated user.
       * https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
       */
      reply(status, toTweetId, payload = {}) {
        var _a;
        const reply = { in_reply_to_tweet_id: toTweetId, ...(_a = payload.reply) !== null && _a !== void 0 ? _a : {} };
        return this.post("tweets", { text: status, ...payload, reply });
      }
      /**
       * Quote an existing Tweet on behalf of an authenticated user.
       * https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
       *
       * **Note**: Since April 20, 2026, X only allows this on Enterprise plans.
       */
      quote(status, quotedTweetId, payload = {}) {
        return this.tweet(status, { ...payload, quote_tweet_id: quotedTweetId });
      }
      /**
       * Post a series of tweets.
       * https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
       */
      async tweetThread(tweets) {
        var _a, _b;
        const postedTweets = [];
        for (const tweet of tweets) {
          const lastTweet = postedTweets.length ? postedTweets[postedTweets.length - 1] : null;
          const queryParams = { ...typeof tweet === "string" ? { text: tweet } : tweet };
          const inReplyToId = lastTweet ? lastTweet.data.id : (_a = queryParams.reply) === null || _a === void 0 ? void 0 : _a.in_reply_to_tweet_id;
          const status = (_b = queryParams.text) !== null && _b !== void 0 ? _b : "";
          if (inReplyToId) {
            postedTweets.push(await this.reply(status, inReplyToId, queryParams));
          } else {
            postedTweets.push(await this.tweet(status, queryParams));
          }
        }
        return postedTweets;
      }
      /**
       * Allows a user or authenticated user ID to delete a Tweet
       * https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/delete-tweets-id
       */
      deleteTweet(tweetId) {
        return this.delete("tweets/:id", void 0, {
          params: {
            id: tweetId
          }
        });
      }
      /* Bookmarks */
      /**
       * Causes the user ID of an authenticated user identified in the path parameter to Bookmark the target Tweet provided in the request body.
       * https://developer.x.com/en/docs/twitter-api/tweets/bookmarks/api-reference/post-users-id-bookmarks
       *
       * OAuth2 scopes: `users.read` `tweet.read` `bookmark.write`
       */
      async bookmark(tweetId) {
        const user = await this.getCurrentUserV2Object();
        return this.post("users/:id/bookmarks", { tweet_id: tweetId }, { params: { id: user.data.id } });
      }
      /**
       * Allows a user or authenticated user ID to remove a Bookmark of a Tweet.
       * https://developer.x.com/en/docs/twitter-api/tweets/bookmarks/api-reference/delete-users-id-bookmarks-tweet_id
       *
       * OAuth2 scopes: `users.read` `tweet.read` `bookmark.write`
       */
      async deleteBookmark(tweetId) {
        const user = await this.getCurrentUserV2Object();
        return this.delete("users/:id/bookmarks/:tweet_id", void 0, { params: { id: user.data.id, tweet_id: tweetId } });
      }
      /* Users */
      /**
       * Allows a user ID to follow another user.
       * If the target user does not have public Tweets, this endpoint will send a follow request.
       * https://developer.x.com/en/docs/twitter-api/users/follows/api-reference/post-users-source_user_id-following
       *
       * OAuth2 scope: `follows.write`
       *
       * **Note**: You must specify the currently logged user ID; you can get it with `client.currentUserV2()`.
       *
       * **Note**: Since April 20, 2026, X only allows this on Enterprise plans.
       */
      follow(loggedUserId, targetUserId) {
        return this.post("users/:id/following", { target_user_id: targetUserId }, { params: { id: loggedUserId } });
      }
      /**
       * Allows a user ID to unfollow another user.
       * https://developer.x.com/en/docs/twitter-api/users/follows/api-reference/delete-users-source_id-following
       *
       * OAuth2 scope: `follows.write`
       *
       * **Note**: You must specify the currently logged user ID; you can get it with `client.currentUserV2()`.
       *
       * **Note**: Since April 20, 2026, X only allows this on Enterprise plans.
       */
      unfollow(loggedUserId, targetUserId) {
        return this.delete("users/:source_user_id/following/:target_user_id", void 0, {
          params: { source_user_id: loggedUserId, target_user_id: targetUserId }
        });
      }
      /**
       * Causes the user (in the path) to block the target user.
       * The user (in the path) must match the user context authorizing the request.
       * https://developer.x.com/en/docs/twitter-api/users/blocks/api-reference/post-users-user_id-blocking
       *
       * **Note**: You must specify the currently logged user ID; you can get it with `client.currentUserV2()`.
       *
       * **Note**: X only allows this on Enterprise plans.
       */
      block(loggedUserId, targetUserId) {
        return this.post("users/:id/blocking", { target_user_id: targetUserId }, { params: { id: loggedUserId } });
      }
      /**
       * Allows a user or authenticated user ID to unblock another user.
       * https://developer.x.com/en/docs/twitter-api/users/blocks/api-reference/delete-users-user_id-blocking
       *
       * **Note**: You must specify the currently logged user ID; you can get it with `client.currentUserV2()`.
       *
       * **Note**: X only allows this on Enterprise plans.
       */
      unblock(loggedUserId, targetUserId) {
        return this.delete("users/:source_user_id/blocking/:target_user_id", void 0, {
          params: { source_user_id: loggedUserId, target_user_id: targetUserId }
        });
      }
      /**
       * Allows an authenticated user ID to mute the target user.
       * https://developer.x.com/en/docs/twitter-api/users/mutes/api-reference/post-users-user_id-muting
       *
       * **Note**: You must specify the currently logged user ID; you can get it with `client.currentUserV2()`.
       */
      mute(loggedUserId, targetUserId) {
        return this.post("users/:id/muting", { target_user_id: targetUserId }, { params: { id: loggedUserId } });
      }
      /**
       * Allows an authenticated user ID to unmute the target user.
       * The request succeeds with no action when the user sends a request to a user they're not muting or have already unmuted.
       * https://developer.x.com/en/docs/twitter-api/users/mutes/api-reference/delete-users-user_id-muting
       *
       * **Note**: You must specify the currently logged user ID; you can get it with `client.currentUserV2()`.
       */
      unmute(loggedUserId, targetUserId) {
        return this.delete("users/:source_user_id/muting/:target_user_id", void 0, {
          params: { source_user_id: loggedUserId, target_user_id: targetUserId }
        });
      }
      /* Lists */
      /**
       * Creates a new list for the authenticated user.
       * https://developer.x.com/en/docs/twitter-api/lists/manage-lists/api-reference/post-lists
       */
      createList(options) {
        return this.post("lists", options);
      }
      /**
       * Updates the specified list. The authenticated user must own the list to be able to update it.
       * https://developer.x.com/en/docs/twitter-api/lists/manage-lists/api-reference/put-lists-id
       */
      updateList(listId, options = {}) {
        return this.put("lists/:id", options, { params: { id: listId } });
      }
      /**
       * Deletes the specified list. The authenticated user must own the list to be able to destroy it.
       * https://developer.x.com/en/docs/twitter-api/lists/manage-lists/api-reference/delete-lists-id
       */
      removeList(listId) {
        return this.delete("lists/:id", void 0, { params: { id: listId } });
      }
      /**
       * Adds a member to a list.
       * https://developer.x.com/en/docs/twitter-api/lists/list-members/api-reference/post-lists-id-members
       */
      addListMember(listId, userId) {
        return this.post("lists/:id/members", { user_id: userId }, { params: { id: listId } });
      }
      /**
       * Remember a member to a list.
       * https://developer.x.com/en/docs/twitter-api/lists/list-members/api-reference/delete-lists-id-members-user_id
       */
      removeListMember(listId, userId) {
        return this.delete("lists/:id/members/:user_id", void 0, { params: { id: listId, user_id: userId } });
      }
      /**
       * Subscribes the authenticated user to the specified list.
       * https://developer.x.com/en/docs/twitter-api/lists/manage-lists/api-reference/post-users-id-followed-lists
       */
      subscribeToList(loggedUserId, listId) {
        return this.post("users/:id/followed_lists", { list_id: listId }, { params: { id: loggedUserId } });
      }
      /**
       * Unsubscribes the authenticated user to the specified list.
       * https://developer.x.com/en/docs/twitter-api/lists/manage-lists/api-reference/delete-users-id-followed-lists-list_id
       */
      unsubscribeOfList(loggedUserId, listId) {
        return this.delete("users/:id/followed_lists/:list_id", void 0, { params: { id: loggedUserId, list_id: listId } });
      }
      /**
       * Enables the authenticated user to pin a List.
       * https://developer.x.com/en/docs/twitter-api/lists/manage-lists/api-reference/post-users-id-pinned-lists
       */
      pinList(loggedUserId, listId) {
        return this.post("users/:id/pinned_lists", { list_id: listId }, { params: { id: loggedUserId } });
      }
      /**
       * Enables the authenticated user to unpin a List.
       * https://developer.x.com/en/docs/twitter-api/lists/manage-lists/api-reference/delete-users-id-pinned-lists-list_id
       */
      unpinList(loggedUserId, listId) {
        return this.delete("users/:id/pinned_lists/:list_id", void 0, { params: { id: loggedUserId, list_id: listId } });
      }
      /* Direct messages */
      /**
       * Creates a Direct Message on behalf of an authenticated user, and adds it to the specified conversation.
       * https://developer.x.com/en/docs/twitter-api/direct-messages/manage/api-reference/post-dm_conversations-dm_conversation_id-messages
       */
      sendDmInConversation(conversationId, message) {
        return this.post("dm_conversations/:dm_conversation_id/messages", message, { params: { dm_conversation_id: conversationId } });
      }
      /**
       * Creates a one-to-one Direct Message and adds it to the one-to-one conversation.
       * This method either creates a new one-to-one conversation or retrieves the current conversation and adds the Direct Message to it.
       * https://developer.x.com/en/docs/twitter-api/direct-messages/manage/api-reference/post-dm_conversations-with-participant_id-messages
       */
      sendDmToParticipant(participantId, message) {
        return this.post("dm_conversations/with/:participant_id/messages", message, { params: { participant_id: participantId } });
      }
      /**
       * Creates a new group conversation and adds a Direct Message to it on behalf of an authenticated user.
       * https://developer.x.com/en/docs/twitter-api/direct-messages/manage/api-reference/post-dm_conversations
       */
      createDmConversation(options) {
        return this.post("dm_conversations", options);
      }
      /**
       * Deletes a Direct Message event owned by the authenticated user.
       * https://docs.x.com/x-api/direct-messages/delete-dm-event
       *
       * OAuth2 scopes: `dm.write` `dm.read`
       */
      deleteDmEvent(eventId) {
        return this.delete("dm_events/:event_id", void 0, { params: { event_id: eventId } });
      }
      /**
       * Stops the target user from sending Direct Messages to the authenticated user.
       * https://docs.x.com/x-api/users/block-dms
       *
       * OAuth2 scopes: `dm.write` `users.read` `tweet.read`
       */
      blockDms(targetUserId) {
        return this.post("users/:id/dm/block", void 0, { params: { id: targetUserId } });
      }
      /**
       * Lets the target user send Direct Messages to the authenticated user again.
       * https://docs.x.com/x-api/users/unblock-dms
       *
       * OAuth2 scopes: `dm.write` `users.read` `tweet.read`
       */
      unblockDms(targetUserId) {
        return this.post("users/:id/dm/unblock", void 0, { params: { id: targetUserId } });
      }
    };
    exports2.default = TwitterApiv2ReadWrite;
  }
});

// node_modules/twitter-api-v2/dist/cjs/v2-labs/client.v2.labs.js
var require_client_v2_labs = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/v2-labs/client.v2.labs.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TwitterApiv2Labs = void 0;
    var globals_1 = require_globals();
    var client_v2_labs_write_1 = __importDefault(require_client_v2_labs_write());
    var TwitterApiv2Labs = class extends client_v2_labs_write_1.default {
      constructor() {
        super(...arguments);
        this._prefix = globals_1.API_V2_LABS_PREFIX;
      }
      /**
       * Get a client with read/write rights.
       */
      get readWrite() {
        return this;
      }
    };
    exports2.TwitterApiv2Labs = TwitterApiv2Labs;
    exports2.default = TwitterApiv2Labs;
  }
});

// node_modules/twitter-api-v2/dist/cjs/v2/client.v2.js
var require_client_v2 = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/v2/client.v2.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TwitterApiv2 = void 0;
    var globals_1 = require_globals();
    var client_v2_write_1 = __importDefault(require_client_v2_write());
    var client_v2_labs_1 = __importDefault(require_client_v2_labs());
    var TwitterApiv2 = class extends client_v2_write_1.default {
      constructor() {
        super(...arguments);
        this._prefix = globals_1.API_V2_PREFIX;
      }
      /* Sub-clients */
      /**
       * Get a client with read/write rights.
       */
      get readWrite() {
        return this;
      }
      /**
       * Get a client for v2 labs endpoints.
       *
       * @deprecated X retired the Labs endpoints in 2020.
       */
      get labs() {
        if (this._labs)
          return this._labs;
        return this._labs = new client_v2_labs_1.default(this);
      }
    };
    exports2.TwitterApiv2 = TwitterApiv2;
    exports2.default = TwitterApiv2;
  }
});

// node_modules/twitter-api-v2/dist/cjs/client/readonly.js
var require_readonly = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/client/readonly.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var client_base_1 = __importDefault(require_client_base());
    var client_v1_read_1 = __importDefault(require_client_v1_read());
    var client_v2_read_1 = __importDefault(require_client_v2_read());
    var oauth2_helper_1 = require_oauth2_helper();
    var request_param_helper_1 = __importDefault(require_request_param_helper());
    var settings_1 = require_settings();
    var TwitterApiReadOnly = class extends client_base_1.default {
      /* Direct access to subclients */
      /**
       * Client for the v1.1 API. X no longer serves most v1.1 endpoints, so most of its methods are deprecated: prefer `v2`.
       */
      get v1() {
        if (this._v1)
          return this._v1;
        return this._v1 = new client_v1_read_1.default(this);
      }
      get v2() {
        if (this._v2)
          return this._v2;
        return this._v2 = new client_v2_read_1.default(this);
      }
      /**
       * Fetch and cache current user.
       * This method can only be called with a OAuth 1.0a user authentication.
       *
       * You can use this method to test if authentication was successful.
       * Next calls to this methods will use the cached user, unless `forceFetch: true` is given.
       *
       * @deprecated Calls the v1.1 `account/verify_credentials` endpoint, which new X API apps can't use. Use `currentUserV2()` instead.
       */
      async currentUser(forceFetch = false) {
        return await this.getCurrentUserObject(forceFetch);
      }
      /**
       * Fetch and cache current user.
       * This method can only be called with a OAuth 1.0a or OAuth2 user authentication.
       *
       * This can only be the slimest available `UserV2` object, with only id, name and username properties defined.
       * To get a customized `UserV2Result`, use `.v2.me()`
       *
       * You can use this method to test if authentication was successful.
       * Next calls to this methods will use the cached user, unless `forceFetch: true` is given.
       *
       * OAuth2 scopes: `tweet.read` & `users.read`
       */
      async currentUserV2(forceFetch = false) {
        return await this.getCurrentUserV2Object(forceFetch);
      }
      /* Shortcuts to endpoints */
      search(what, options) {
        return this.v2.search(what, options);
      }
      /* Authentication */
      /**
       * Generate the OAuth request token link for user-based OAuth 1.0 auth.
       *
       * ```ts
       * // Instantiate TwitterApi with consumer keys
       * const client = new TwitterApi({ appKey: 'consumer_key', appSecret: 'consumer_secret' });
       *
       * const tokenRequest = await client.generateAuthLink('oob-or-your-callback-url');
       * // redirect end-user to tokenRequest.url
       *
       * // Save tokenRequest.oauth_token_secret somewhere, it will be needed for next auth step.
       * ```
       */
      async generateAuthLink(oauth_callback = "oob", { authAccessType, linkMode = "authenticate", forceLogin, screenName } = {}) {
        const oauthResult = await this.post("https://api.x.com/oauth/request_token", { oauth_callback, x_auth_access_type: authAccessType });
        let url = `https://api.x.com/oauth/${linkMode}?oauth_token=${encodeURIComponent(oauthResult.oauth_token)}`;
        if (forceLogin !== void 0) {
          url += `&force_login=${encodeURIComponent(forceLogin)}`;
        }
        if (screenName !== void 0) {
          url += `&screen_name=${encodeURIComponent(screenName)}`;
        }
        if (this._requestMaker.hasPlugins()) {
          await this._requestMaker.applyPluginMethod("onOAuth1RequestToken", {
            client: this._requestMaker,
            url,
            oauthResult
          });
        }
        return {
          url,
          ...oauthResult
        };
      }
      /**
       * Obtain access to user-based OAuth 1.0 auth.
       *
       * After user is redirect from your callback, use obtained oauth_token and oauth_verifier to
       * instantiate the new TwitterApi instance.
       *
       * ```ts
       * // Use the saved oauth_token_secret associated to oauth_token returned by callback
       * const requestClient = new TwitterApi({
       *  appKey: 'consumer_key',
       *  appSecret: 'consumer_secret',
       *  accessToken: 'oauth_token',
       *  accessSecret: 'oauth_token_secret'
       * });
       *
       * // Use oauth_verifier obtained from callback request
       * const { client: userClient } = await requestClient.login('oauth_verifier');
       *
       * // {userClient} is a valid {TwitterApi} object you can use for future requests
       * ```
       */
      async login(oauth_verifier) {
        const tokens = this.getActiveTokens();
        if (tokens.type !== "oauth-1.0a")
          throw new Error("You must setup TwitterApi instance with consumer keys to accept OAuth 1.0 login");
        const oauth_result = await this.post("https://api.x.com/oauth/access_token", { oauth_token: tokens.accessToken, oauth_verifier });
        const client2 = new this.constructor({
          appKey: tokens.appKey,
          appSecret: tokens.appSecret,
          accessToken: oauth_result.oauth_token,
          accessSecret: oauth_result.oauth_token_secret
        }, this._requestMaker.clientSettings);
        return {
          accessToken: oauth_result.oauth_token,
          accessSecret: oauth_result.oauth_token_secret,
          userId: oauth_result.user_id,
          screenName: oauth_result.screen_name,
          client: client2
        };
      }
      /**
       * Enable application-only authentication.
       *
       * To make the request, instantiate TwitterApi with consumer and secret.
       *
       * ```ts
       * const requestClient = new TwitterApi({ appKey: 'consumer', appSecret: 'secret' });
       * const appClient = await requestClient.appLogin();
       *
       * // Use {appClient} to make requests
       * ```
       */
      async appLogin() {
        const tokens = this.getActiveTokens();
        if (tokens.type !== "oauth-1.0a")
          throw new Error("You must setup TwitterApi instance with consumer keys to accept app-only login");
        const basicClient = new this.constructor({ username: tokens.appKey, password: tokens.appSecret }, this._requestMaker.clientSettings);
        const res = await basicClient.post("https://api.x.com/oauth2/token", { grant_type: "client_credentials" });
        return new this.constructor(res.access_token, this._requestMaker.clientSettings);
      }
      /* OAuth 2 user authentication */
      /**
       * Generate the OAuth request token link for user-based OAuth 2.0 auth.
       *
       * - **You can only use v2 API endpoints with this authentication method.**
       * - **You need to specify which scope you want to have when you create your auth link. Make sure it matches your needs.**
       *
       * See https://developer.x.com/en/docs/authentication/oauth-2-0/user-access-token for details.
       *
       * ```ts
       * // Instantiate TwitterApi with client ID
       * const client = new TwitterApi({ clientId: 'yourClientId' });
       *
       * // Generate a link to callback URL that will gives a token with tweet+user read access
       * const link = client.generateOAuth2AuthLink('your-callback-url', { scope: ['tweet.read', 'users.read'] });
       *
       * // Extract props from generate link
       * const { url, state, codeVerifier } = link;
       *
       * // redirect end-user to url
       * // Save `state` and `codeVerifier` somewhere, it will be needed for next auth step.
       * ```
       */
      generateOAuth2AuthLink(redirectUri, options = {}) {
        var _a, _b;
        if (!this._requestMaker.clientId) {
          throw new Error("Twitter API instance is not initialized with client ID. You can find your client ID in Twitter Developer Portal. Please build an instance with: new TwitterApi({ clientId: '<yourClientId>' })");
        }
        const state = (_a = options.state) !== null && _a !== void 0 ? _a : oauth2_helper_1.OAuth2Helper.generateRandomString(32);
        const codeVerifier = oauth2_helper_1.OAuth2Helper.getCodeVerifier();
        const codeChallenge = oauth2_helper_1.OAuth2Helper.getCodeChallengeFromVerifier(codeVerifier);
        const rawScope = (_b = options.scope) !== null && _b !== void 0 ? _b : "";
        const scope = Array.isArray(rawScope) ? rawScope.join(" ") : rawScope;
        const url = new URL("https://x.com/i/oauth2/authorize");
        const query = {
          response_type: "code",
          client_id: this._requestMaker.clientId,
          redirect_uri: redirectUri,
          state,
          code_challenge: codeChallenge,
          code_challenge_method: "s256",
          scope
        };
        request_param_helper_1.default.addQueryParamsToUrl(url, query);
        const result = {
          url: url.toString(),
          state,
          codeVerifier,
          codeChallenge
        };
        if (this._requestMaker.hasPlugins()) {
          this._requestMaker.applyPluginMethod("onOAuth2RequestToken", {
            client: this._requestMaker,
            result,
            redirectUri
          }).catch((error) => settings_1.TwitterApiV2Settings.logger.log("onOAuth2RequestToken plugin hook failed:", error));
        }
        return result;
      }
      /**
       * Obtain access to user-based OAuth 2.0 auth.
       *
       * After user is redirect from your callback, use obtained code to
       * instantiate the new TwitterApi instance.
       *
       * You need to obtain `codeVerifier` from a call to `.generateOAuth2AuthLink`.
       *
       * ```ts
       * // Use the saved codeVerifier associated to state (present in query string of callback)
       * const requestClient = new TwitterApi({ clientId: 'yourClientId' });
       *
       * const { client: userClient, refreshToken } = await requestClient.loginWithOAuth2({
       *  code: 'codeFromQueryString',
       *  // the same URL given to generateOAuth2AuthLink
       *  redirectUri,
       *  // the verifier returned by generateOAuth2AuthLink
       *  codeVerifier,
       * });
       *
       * // {userClient} is a valid {TwitterApi} object you can use for future requests
       * // {refreshToken} is defined if 'offline.access' is in scope.
       * ```
       */
      async loginWithOAuth2({ code, codeVerifier, redirectUri }) {
        if (!this._requestMaker.clientId) {
          throw new Error("Twitter API instance is not initialized with client ID. Please build an instance with: new TwitterApi({ clientId: '<yourClientId>' })");
        }
        const accessTokenResult = await this.post("https://api.x.com/2/oauth2/token", {
          code,
          code_verifier: codeVerifier,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          client_id: this._requestMaker.clientId,
          client_secret: this._requestMaker.clientSecret
        });
        return this.parseOAuth2AccessTokenResult(accessTokenResult);
      }
      /**
       * Obtain a new access token to user-based OAuth 2.0 auth from a refresh token.
       *
       * ```ts
       * const requestClient = new TwitterApi({ clientId: 'yourClientId' });
       *
       * const { client: userClient } = await requestClient.refreshOAuth2Token('refreshToken');
       * // {userClient} is a valid {TwitterApi} object you can use for future requests
       * ```
       */
      async refreshOAuth2Token(refreshToken) {
        if (!this._requestMaker.clientId) {
          throw new Error("Twitter API instance is not initialized with client ID. Please build an instance with: new TwitterApi({ clientId: '<yourClientId>' })");
        }
        const accessTokenResult = await this.post("https://api.x.com/2/oauth2/token", {
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          client_id: this._requestMaker.clientId,
          client_secret: this._requestMaker.clientSecret
        });
        return this.parseOAuth2AccessTokenResult(accessTokenResult);
      }
      /**
       * Exchange the OAuth 1.0a access token and secret of a user for OAuth 2.0 tokens, without asking the user to log in again.
       * The scopes are the ones matching the user's OAuth 1.0a permissions, with `offline.access`, so a refresh token is always returned.
       * Each exchange invalidates the OAuth 2.0 tokens obtained by the previous exchange of the same token.
       *
       * https://docs.x.com/fundamentals/authentication/oauth-2-0/oauth-1-0a-token-exchange
       *
       * ```ts
       * // With the OAuth 2.0 client ID, and the client secret of a confidential client
       * const requestClient = new TwitterApi({ clientId: 'yourClientId', clientSecret: 'yourClientSecret' });
       *
       * const { client: userClient, refreshToken } = await requestClient.exchangeOAuth1Token({
       *  accessToken: 'oauth1AccessToken',
       *  accessSecret: 'oauth1AccessSecret',
       * });
       * ```
       */
      async exchangeOAuth1Token({ accessToken, accessSecret, scope }) {
        if (!this._requestMaker.clientId) {
          throw new Error("Twitter API instance is not initialized with client ID. Please build an instance with: new TwitterApi({ clientId: '<yourClientId>' })");
        }
        const accessTokenResult = await this.post("https://api.x.com/2/oauth2/token", {
          grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
          subject_token: accessToken,
          subject_token_type: "urn:x:params:oauth:token-type:oauth1_token",
          oauth_token_secret: accessSecret,
          scope: Array.isArray(scope) ? scope.join(" ") : scope,
          // Confidential clients authenticate with their secret in a Basic header instead
          client_id: this._requestMaker.clientSecret ? void 0 : this._requestMaker.clientId
        }, { forceBodyMode: "url" });
        return this.parseOAuth2AccessTokenResult(accessTokenResult);
      }
      /**
       * Revoke a single user-based OAuth 2.0 token.
       *
       * You must specify its source, access token (directly after login)
       * or refresh token (if you've called `.refreshOAuth2Token` before).
       */
      async revokeOAuth2Token(token, tokenType = "access_token") {
        if (!this._requestMaker.clientId) {
          throw new Error("Twitter API instance is not initialized with client ID. Please build an instance with: new TwitterApi({ clientId: '<yourClientId>' })");
        }
        return await this.post("https://api.x.com/2/oauth2/revoke", {
          client_id: this._requestMaker.clientId,
          client_secret: this._requestMaker.clientSecret,
          token,
          token_type_hint: tokenType
        });
      }
      parseOAuth2AccessTokenResult(result) {
        const client2 = new this.constructor(result.access_token, this._requestMaker.clientSettings);
        const scope = result.scope.split(" ").filter((e) => e);
        return {
          client: client2,
          expiresIn: result.expires_in,
          accessToken: result.access_token,
          scope,
          refreshToken: result.refresh_token
        };
      }
    };
    exports2.default = TwitterApiReadOnly;
  }
});

// node_modules/twitter-api-v2/dist/cjs/client/readwrite.js
var require_readwrite = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/client/readwrite.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var client_v1_write_1 = __importDefault(require_client_v1_write());
    var client_v2_write_1 = __importDefault(require_client_v2_write());
    var readonly_1 = __importDefault(require_readonly());
    var TwitterApiReadWrite = class extends readonly_1.default {
      /* Direct access to subclients */
      /**
       * Client for the v1.1 API. X no longer serves most v1.1 endpoints, so most of its methods are deprecated: prefer `v2`.
       */
      get v1() {
        if (this._v1)
          return this._v1;
        return this._v1 = new client_v1_write_1.default(this);
      }
      get v2() {
        if (this._v2)
          return this._v2;
        return this._v2 = new client_v2_write_1.default(this);
      }
      /**
       * Get a client with read only rights.
       */
      get readOnly() {
        return this;
      }
    };
    exports2.default = TwitterApiReadWrite;
  }
});

// node_modules/twitter-api-v2/dist/cjs/ads/client.ads.read.js
var require_client_ads_read = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/ads/client.ads.read.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var client_subclient_1 = __importDefault(require_client_subclient());
    var globals_1 = require_globals();
    var TwitterAdsReadOnly = class extends client_subclient_1.default {
      constructor() {
        super(...arguments);
        this._prefix = globals_1.API_ADS_PREFIX;
      }
    };
    exports2.default = TwitterAdsReadOnly;
  }
});

// node_modules/twitter-api-v2/dist/cjs/ads/client.ads.write.js
var require_client_ads_write = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/ads/client.ads.write.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var globals_1 = require_globals();
    var client_ads_read_1 = __importDefault(require_client_ads_read());
    var TwitterAdsReadWrite = class extends client_ads_read_1.default {
      constructor() {
        super(...arguments);
        this._prefix = globals_1.API_ADS_PREFIX;
      }
      /**
       * Get a client with only read rights.
       */
      get readOnly() {
        return this;
      }
    };
    exports2.default = TwitterAdsReadWrite;
  }
});

// node_modules/twitter-api-v2/dist/cjs/ads-sandbox/client.ads-sandbox.read.js
var require_client_ads_sandbox_read = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/ads-sandbox/client.ads-sandbox.read.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var client_subclient_1 = __importDefault(require_client_subclient());
    var globals_1 = require_globals();
    var TwitterAdsSandboxReadOnly = class extends client_subclient_1.default {
      constructor() {
        super(...arguments);
        this._prefix = globals_1.API_ADS_SANDBOX_PREFIX;
      }
    };
    exports2.default = TwitterAdsSandboxReadOnly;
  }
});

// node_modules/twitter-api-v2/dist/cjs/ads-sandbox/client.ads-sandbox.write.js
var require_client_ads_sandbox_write = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/ads-sandbox/client.ads-sandbox.write.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var globals_1 = require_globals();
    var client_ads_sandbox_read_1 = __importDefault(require_client_ads_sandbox_read());
    var TwitterAdsSandboxReadWrite = class extends client_ads_sandbox_read_1.default {
      constructor() {
        super(...arguments);
        this._prefix = globals_1.API_ADS_SANDBOX_PREFIX;
      }
      /**
       * Get a client with only read rights.
       */
      get readOnly() {
        return this;
      }
    };
    exports2.default = TwitterAdsSandboxReadWrite;
  }
});

// node_modules/twitter-api-v2/dist/cjs/ads-sandbox/client.ads-sandbox.js
var require_client_ads_sandbox = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/ads-sandbox/client.ads-sandbox.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TwitterAdsSandbox = void 0;
    var globals_1 = require_globals();
    var client_ads_sandbox_write_1 = __importDefault(require_client_ads_sandbox_write());
    var TwitterAdsSandbox = class extends client_ads_sandbox_write_1.default {
      constructor() {
        super(...arguments);
        this._prefix = globals_1.API_ADS_SANDBOX_PREFIX;
      }
      /**
       * Get a client with read/write rights.
       */
      get readWrite() {
        return this;
      }
    };
    exports2.TwitterAdsSandbox = TwitterAdsSandbox;
    exports2.default = TwitterAdsSandbox;
  }
});

// node_modules/twitter-api-v2/dist/cjs/ads/client.ads.js
var require_client_ads = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/ads/client.ads.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TwitterAds = void 0;
    var globals_1 = require_globals();
    var client_ads_write_1 = __importDefault(require_client_ads_write());
    var client_ads_sandbox_1 = __importDefault(require_client_ads_sandbox());
    var TwitterAds = class extends client_ads_write_1.default {
      constructor() {
        super(...arguments);
        this._prefix = globals_1.API_ADS_PREFIX;
      }
      /**
       * Get a client with read/write rights.
       */
      get readWrite() {
        return this;
      }
      /**
       * Get Twitter Ads Sandbox API client
       */
      get sandbox() {
        if (this._sandbox)
          return this._sandbox;
        return this._sandbox = new client_ads_sandbox_1.default(this);
      }
    };
    exports2.TwitterAds = TwitterAds;
    exports2.default = TwitterAds;
  }
});

// node_modules/twitter-api-v2/dist/cjs/client/index.js
var require_client = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/client/index.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TwitterApiReadOnly = exports2.TwitterApiReadWrite = exports2.TwitterApi = void 0;
    var client_v1_1 = __importDefault(require_client_v1());
    var client_v2_1 = __importDefault(require_client_v2());
    var readwrite_1 = __importDefault(require_readwrite());
    exports2.TwitterApiReadWrite = readwrite_1.default;
    var readonly_1 = __importDefault(require_readonly());
    exports2.TwitterApiReadOnly = readonly_1.default;
    var client_ads_1 = __importDefault(require_client_ads());
    var TwitterApi2 = class extends readwrite_1.default {
      /* Direct access to subclients */
      /**
       * Client for the v1.1 API. X no longer serves most v1.1 endpoints, so most of its methods are deprecated: prefer `v2`.
       */
      get v1() {
        if (this._v1)
          return this._v1;
        return this._v1 = new client_v1_1.default(this);
      }
      get v2() {
        if (this._v2)
          return this._v2;
        return this._v2 = new client_v2_1.default(this);
      }
      /**
       * Get a client with read/write rights.
       */
      get readWrite() {
        return this;
      }
      /**
       * Get Twitter Ads API client
       */
      get ads() {
        if (this._ads)
          return this._ads;
        return this._ads = new client_ads_1.default(this);
      }
      /* Static helpers */
      static getErrors(error) {
        var _a;
        if (typeof error !== "object" || !error)
          return [];
        const data = error.data;
        if (typeof data !== "object" || !data)
          return [];
        return (_a = data.errors) !== null && _a !== void 0 ? _a : [];
      }
      /** Extract another image size than obtained in a `profile_image_url` or `profile_image_url_https` field of a user object. */
      static getProfileImageInSize(profileImageUrl, size) {
        const lastPart = profileImageUrl.split("/").pop();
        const sizes = ["normal", "bigger", "mini"];
        let originalUrl = profileImageUrl;
        for (const availableSize of sizes) {
          if (lastPart.includes(`_${availableSize}`)) {
            originalUrl = profileImageUrl.replace(`_${availableSize}`, "");
            break;
          }
        }
        if (size === "original") {
          return originalUrl;
        }
        const extPos = originalUrl.lastIndexOf(".");
        if (extPos !== -1) {
          const ext = originalUrl.slice(extPos + 1);
          return originalUrl.slice(0, extPos) + "_" + size + "." + ext;
        } else {
          return originalUrl + "_" + size;
        }
      }
    };
    exports2.TwitterApi = TwitterApi2;
    exports2.default = TwitterApi2;
  }
});

// node_modules/twitter-api-v2/dist/cjs/index.js
var require_cjs = __commonJS({
  "node_modules/twitter-api-v2/dist/cjs/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.default = void 0;
    var client_1 = require_client();
    Object.defineProperty(exports2, "default", { enumerable: true, get: function() {
      return __importDefault(client_1).default;
    } });
    __exportStar(require_client(), exports2);
    __exportStar(require_client_v1(), exports2);
    __exportStar(require_client_v2(), exports2);
    __exportStar(require_includes_v2_helper(), exports2);
    __exportStar(require_client_v2_labs(), exports2);
    __exportStar(require_types(), exports2);
    __exportStar(require_paginators(), exports2);
    __exportStar(require_TweetStream(), exports2);
    __exportStar(require_settings(), exports2);
  }
});

// src/notifications-stack/x-notifier.lambda.ts
var x_notifier_lambda_exports = {};
__export(x_notifier_lambda_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(x_notifier_lambda_exports);

// src/notifications-stack/messages.ts
var RANK = { clear: 0, flooded: 1, impassable: 2 };
var MESSAGES = {
  risingFlooded: [
    "The ford is rising and may now be flooded, be careful if you drive through it.",
    "Watch out! The ford may be flooded, but may be passable.",
    "Be careful. The ford may be flooded, but may be passable.",
    "Be cautious when driving through the ford as the water levels continue to rise and it may now be flooded.",
    "Exercise caution when traversing the ford, which may now have become flooded due to rising water levels.",
    "Drive cautiously through the ford as it may be flooded and the water levels are on the rise."
  ],
  risingImpassable: [
    "The ford is rising and may now be impassable, you may want to find another route.",
    "Due to the rising water levels, the ford might have become impassable; it's advisable to seek an alternative route.",
    "The ford is likely to be impassable due to the rising water; consider finding an alternate path.",
    "The ford may have become impassable, consider finding an alternative route.",
    "Due to the rising water, the ford is likely to be impassable; it would be wise to explore alternative routes."
  ],
  droppingFlooded: [
    "The ford is dropping and may be passable.",
    "The water level at the ford is decreasing, potentially making it feasible to cross.",
    "The ford's water level is receding, suggesting it may now be navigable.",
    "The water level at the ford is decreasing, indicating that it might now be possible to pass through.",
    "The ford's water level is diminishing, hinting at the possibility of it being traversable now."
  ],
  droppingClear: [
    "The ford is dropping and is no longer flooding the road.",
    "The water level at the ford is decreasing, and the road is no longer submerged.",
    "The ford's water level is receding, and the road is now clear of flooding.",
    "The water level at the ford is decreasing, and the road is no longer flooded.",
    "The ford's water level is dropping, and the road is no longer submerged by flooding."
  ]
};
function getTransition(previous, next) {
  if (previous === next) {
    return null;
  }
  if (RANK[next] > RANK[previous]) {
    return next === "impassable" ? "risingImpassable" : "risingFlooded";
  }
  return next === "clear" ? "droppingClear" : "droppingFlooded";
}
function composePost(transition, website, random = Math.random) {
  const options = MESSAGES[transition];
  const text = options[Math.floor(random() * options.length)];
  return website ? `${text} See ${website} for more details.` : text;
}

// src/notifications-stack/decide.ts
var COOLDOWN_MS = 60 * 60 * 1e3;
function decide(state, posted, now) {
  if (!posted) {
    return { action: "seed" };
  }
  const transition = getTransition(posted.state, state);
  if (!transition) {
    return { action: "none", reason: "unchanged" };
  }
  if (now - posted.postedAt < COOLDOWN_MS) {
    return { action: "none", reason: "cooldown" };
  }
  return { action: "post", transition };
}

// src/notifications-stack/posted-state.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");

// node_modules/@aws-lambda-powertools/logger/lib/esm/constants.js
var LogJsonIndent = {
  PRETTY: 4,
  COMPACT: 0
};
var LogLevelThreshold = {
  TRACE: 6,
  DEBUG: 8,
  INFO: 12,
  WARN: 16,
  ERROR: 20,
  CRITICAL: 24,
  SILENT: 28
};
var ReservedKeys = [
  "level",
  "message",
  "sampling_rate",
  "service",
  "timestamp"
];
var UncaughtErrorLogMessage = "Uncaught error detected, flushing log buffer before exit";

// node_modules/@aws/lambda-invoke-store/dist-es/invoke-store.js
var PROTECTED_KEYS = {
  REQUEST_ID: /* @__PURE__ */ Symbol.for("_AWS_LAMBDA_REQUEST_ID"),
  X_RAY_TRACE_ID: /* @__PURE__ */ Symbol.for("_AWS_LAMBDA_X_RAY_TRACE_ID"),
  TENANT_ID: /* @__PURE__ */ Symbol.for("_AWS_LAMBDA_TENANT_ID"),
  TRACEPARENT: /* @__PURE__ */ Symbol.for("_AWS_LAMBDA_TRACEPARENT"),
  TRACESTATE: /* @__PURE__ */ Symbol.for("_AWS_LAMBDA_TRACESTATE"),
  BAGGAGE: /* @__PURE__ */ Symbol.for("_AWS_LAMBDA_BAGGAGE")
};
var NO_GLOBAL_AWS_LAMBDA = ["true", "1"].includes(process.env?.AWS_LAMBDA_NODEJS_NO_GLOBAL_AWSLAMBDA ?? "");
if (!NO_GLOBAL_AWS_LAMBDA) {
  globalThis.awslambda = globalThis.awslambda || {};
}
var InvokeStoreBase = class {
  static PROTECTED_KEYS = PROTECTED_KEYS;
  isProtectedKey(key) {
    return Object.values(PROTECTED_KEYS).includes(key);
  }
  getRequestId() {
    return this.get(PROTECTED_KEYS.REQUEST_ID) ?? "-";
  }
  getXRayTraceId() {
    return this.get(PROTECTED_KEYS.X_RAY_TRACE_ID);
  }
  getTenantId() {
    return this.get(PROTECTED_KEYS.TENANT_ID);
  }
  getTraceparent() {
    return this.get(PROTECTED_KEYS.TRACEPARENT);
  }
  getTracestate() {
    return this.get(PROTECTED_KEYS.TRACESTATE);
  }
  getBaggage() {
    return this.get(PROTECTED_KEYS.BAGGAGE);
  }
};
var InvokeStoreSingle = class extends InvokeStoreBase {
  currentContext;
  getContext() {
    return this.currentContext;
  }
  hasContext() {
    return this.currentContext !== void 0;
  }
  get(key) {
    return this.currentContext?.[key];
  }
  set(key, value) {
    if (this.isProtectedKey(key)) {
      throw new Error(`Cannot modify protected Lambda context field: ${String(key)}`);
    }
    this.currentContext = this.currentContext || {};
    this.currentContext[key] = value;
  }
  run(context, fn) {
    this.currentContext = context;
    return fn();
  }
};
var InvokeStoreMulti = class _InvokeStoreMulti extends InvokeStoreBase {
  als;
  static async create() {
    const instance = new _InvokeStoreMulti();
    const asyncHooks = await import("node:async_hooks");
    instance.als = new asyncHooks.AsyncLocalStorage();
    return instance;
  }
  getContext() {
    return this.als.getStore();
  }
  hasContext() {
    return this.als.getStore() !== void 0;
  }
  get(key) {
    return this.als.getStore()?.[key];
  }
  set(key, value) {
    if (this.isProtectedKey(key)) {
      throw new Error(`Cannot modify protected Lambda context field: ${String(key)}`);
    }
    const store = this.als.getStore();
    if (!store) {
      throw new Error("No context available");
    }
    store[key] = value;
  }
  run(context, fn) {
    return this.als.run(context, fn);
  }
};
var InvokeStore;
(function(InvokeStore2) {
  let instance = null;
  async function getInstanceAsync(forceInvokeStoreMulti) {
    if (!instance) {
      instance = (async () => {
        const isMulti = forceInvokeStoreMulti === true || "AWS_LAMBDA_MAX_CONCURRENCY" in process.env;
        const newInstance = isMulti ? await InvokeStoreMulti.create() : new InvokeStoreSingle();
        if (!NO_GLOBAL_AWS_LAMBDA && globalThis.awslambda?.InvokeStore) {
          return globalThis.awslambda.InvokeStore;
        } else if (!NO_GLOBAL_AWS_LAMBDA && globalThis.awslambda) {
          globalThis.awslambda.InvokeStore = newInstance;
          return newInstance;
        } else {
          return newInstance;
        }
      })();
    }
    return instance;
  }
  InvokeStore2.getInstanceAsync = getInstanceAsync;
  InvokeStore2._testing = process.env.AWS_LAMBDA_BENCHMARK_MODE === "1" ? {
    reset: () => {
      instance = null;
      if (globalThis.awslambda?.InvokeStore) {
        delete globalThis.awslambda.InvokeStore;
      }
      globalThis.awslambda = { InvokeStore: void 0 };
    }
  } : void 0;
})(InvokeStore || (InvokeStore = {}));

// node_modules/@aws-lambda-powertools/commons/lib/esm/constants.js
var AWS_LAMBDA_INITIALIZATION_TYPE_ENV_VAR = "AWS_LAMBDA_INITIALIZATION_TYPE";
var AWS_LAMBDA_MAX_CONCURRENCY = "AWS_LAMBDA_MAX_CONCURRENCY";
var POWERTOOLS_DEV_ENV_VAR = "POWERTOOLS_DEV";
var POWERTOOLS_SERVICE_NAME_ENV_VAR = "POWERTOOLS_SERVICE_NAME";
var XRAY_TRACE_ID_ENV_VAR = "_X_AMZN_TRACE_ID";

// node_modules/@aws-lambda-powertools/commons/lib/esm/envUtils.js
var getStringFromEnv = ({ key, defaultValue, errorMessage }) => {
  const value = process.env[key];
  if (value === void 0) {
    if (defaultValue !== void 0) {
      return defaultValue;
    }
    if (errorMessage) {
      throw new Error(errorMessage);
    }
    throw new Error(`Environment variable ${key} is required`);
  }
  return value.trim();
};
var getNumberFromEnv = ({ key, defaultValue, errorMessage }) => {
  const value = getStringFromEnv({
    key,
    defaultValue: String(defaultValue),
    errorMessage
  });
  const parsedValue = Number(value);
  if (Number.isNaN(parsedValue)) {
    throw new TypeError(`Environment variable ${key} must be a number`);
  }
  return parsedValue;
};
var truthyValues = /* @__PURE__ */ new Set(["1", "y", "yes", "t", "true", "on"]);
var falsyValues = /* @__PURE__ */ new Set(["0", "n", "no", "f", "false", "off"]);
var getBooleanFromEnv = ({ key, defaultValue, errorMessage, extendedParsing }) => {
  const value = getStringFromEnv({
    key,
    defaultValue: String(defaultValue),
    errorMessage
  });
  const parsedValue = value.toLowerCase();
  if (extendedParsing) {
    if (truthyValues.has(parsedValue)) {
      return true;
    }
    if (falsyValues.has(parsedValue)) {
      return false;
    }
  }
  if (parsedValue !== "true" && parsedValue !== "false") {
    throw new Error(`Environment variable ${key} must be a boolean`);
  }
  return parsedValue === "true";
};
var isDevMode = () => {
  try {
    return getBooleanFromEnv({
      key: POWERTOOLS_DEV_ENV_VAR,
      extendedParsing: true
    });
  } catch {
    return false;
  }
};
var getServiceName = () => {
  return getStringFromEnv({
    key: POWERTOOLS_SERVICE_NAME_ENV_VAR,
    defaultValue: ""
  });
};
var getXrayTraceDataFromEnv = () => {
  const xRayTraceEnv = globalThis.awslambda?.InvokeStore?.getXRayTraceId() ?? getStringFromEnv({
    key: XRAY_TRACE_ID_ENV_VAR,
    defaultValue: ""
  });
  if (xRayTraceEnv === "") {
    return void 0;
  }
  if (!xRayTraceEnv.includes("=")) {
    return {
      Root: xRayTraceEnv
    };
  }
  const xRayTraceData = {};
  for (const field of xRayTraceEnv.split(";")) {
    const [key, value] = field.split("=");
    xRayTraceData[key] = value;
  }
  return xRayTraceData;
};
var isRequestXRaySampled = () => {
  const xRayTraceData = getXrayTraceDataFromEnv();
  return xRayTraceData?.Sampled === "1";
};
var shouldUseInvokeStore = () => {
  const res = getStringFromEnv({
    key: AWS_LAMBDA_MAX_CONCURRENCY,
    defaultValue: ""
  });
  return res !== "";
};
var getXRayTraceIdFromEnv = () => {
  const xRayTraceData = getXrayTraceDataFromEnv();
  return xRayTraceData?.Root;
};

// node_modules/@aws-lambda-powertools/logger/lib/esm/formatter/LogFormatter.js
var LogFormatter = class {
  /**
   * Whether a warning about an unresolvable timezone has already been emitted,
   * used to avoid logging the same warning on every formatted log entry.
   */
  #timezoneWarningEmitted = false;
  /**
   * Format an error into a loggable object.
   *
   * @example
   * ```json
   * {
   *   "name": "Error",
   *   "location": "file.js:1",
   *   "message": "An error occurred",
   *   "stack": "Error: An error occurred\n    at file.js:1\n    at file.js:2\n    at file.js:3",
   *   "cause": {
   *     "name": "OtherError",
   *     "location": "file.js:2",
   *     "message": "Another error occurred",
   *     "stack": "Error: Another error occurred\n    at file.js:2\n    at file.js:3\n    at file.js:4"
   *   }
   * }
   * ```
   *
   * @param error - Error to format
   */
  formatError(error) {
    const { name, message, stack, cause, ...errorAttributes } = error;
    const formattedError = {
      name,
      location: this.getCodeLocation(error.stack),
      message,
      stack: isDevMode() && typeof stack === "string" ? stack?.split("\n") : stack,
      cause: cause instanceof Error ? this.formatError(cause) : cause
    };
    for (const key in error) {
      if (typeof key === "string" && !["name", "message", "stack", "cause"].includes(key)) {
        formattedError[key] = errorAttributes[key];
      }
    }
    return formattedError;
  }
  /**
   * Format a date into an ISO 8601 string with the configured timezone.
   *
   * The timezone is read from the `TZ` environment variable, if present.
   * Otherwise, the timezone defaults to ':UTC'.
   *
   * @param now - The date to format
   */
  formatTimestamp(now) {
    const defaultTimezone = "UTC";
    const configuredTimezone = getStringFromEnv({
      key: "TZ",
      defaultValue: ""
    });
    if (configuredTimezone && !configuredTimezone.includes(defaultTimezone))
      return this.#generateISOTimestampWithOffset(now, configuredTimezone);
    return now.toISOString();
  }
  /**
   * Get the location of an error from a stack trace.
   *
   * @param stack - stack trace to parse
   */
  getCodeLocation(stack) {
    if (!stack) {
      return "";
    }
    const stackLines = stack.split("\n");
    const regex = /\(([^()]*?):(\d+?):(\d+?)\)\\?$/;
    for (const item of stackLines) {
      const match = regex.exec(item);
      if (Array.isArray(match)) {
        return `${match[1]}:${Number(match[2])}`;
      }
    }
    return "";
  }
  /**
   * Resolve the time zone to use for formatting timestamps.
   *
   * Validation is delegated to `Intl.DateTimeFormat` itself, so both canonical
   * identifiers (e.g. `Asia/Calcutta`) and their aliases (e.g. `Asia/Kolkata`)
   * are accepted.
   *
   * If the provided time zone cannot be resolved - e.g. `TZ` is set to
   * `:/etc/localtime` in certain Docker images - we fall back to UTC and emit
   * a one-time warning.
   *
   * @param timezone - IANA time zone identifier (e.g., "Asia/Dhaka").
   */
  #resolveTimezone = (timezone) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone });
      return timezone;
    } catch {
      if (!this.#timezoneWarningEmitted) {
        this.#timezoneWarningEmitted = true;
        console.warn(`Invalid or unresolvable time zone: "${timezone}" - falling back to UTC.`);
      }
      return "UTC";
    }
  };
  /**
   * Create a new Intl.DateTimeFormat object configured with the specified time zone
   * and formatting options.
   *
   * The time is displayed in 24-hour format (hour12: false).
   *
   * @param timezone - resolvable IANA time zone identifier (e.g., "Asia/Dhaka").
   */
  #getDateFormatter = (timezone) => {
    const twoDigitFormatOption = "2-digit";
    return new Intl.DateTimeFormat("en", {
      hourCycle: "h23",
      year: "numeric",
      month: twoDigitFormatOption,
      day: twoDigitFormatOption,
      hour: twoDigitFormatOption,
      minute: twoDigitFormatOption,
      second: twoDigitFormatOption,
      timeZone: timezone
    });
  };
  /**
   * Generate an ISO 8601 timestamp string with the specified time zone and the local time zone offset.
   *
   * If the time zone cannot be resolved, both the date/time digits and the offset
   * fall back to UTC so that the emitted timestamp always denotes the correct instant.
   *
   * @param date - date to format
   * @param timezone - IANA time zone identifier (e.g., "Asia/Dhaka").
   */
  #generateISOTimestampWithOffset(date, timezone) {
    const resolvedTimezone = this.#resolveTimezone(timezone);
    const { year, month, day, hour, minute, second } = this.#getDateFormatter(resolvedTimezone).formatToParts(date).reduce((acc, item) => {
      acc[item.type] = item.value;
      return acc;
    }, {});
    const datePart = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    const offset = resolvedTimezone === timezone ? -date.getTimezoneOffset() : 0;
    const offsetSign = offset >= 0 ? "+" : "-";
    const offsetHours = Math.abs(Math.floor(offset / 60)).toString().padStart(2, "0");
    const offsetMinutes = Math.abs(offset % 60).toString().padStart(2, "0");
    const millisecondPart = date.getMilliseconds().toString().padStart(3, "0");
    const offsetPart = `${offsetSign}${offsetHours}:${offsetMinutes}`;
    return `${datePart}.${millisecondPart}${offsetPart}`;
  }
};

// node_modules/@aws-lambda-powertools/commons/lib/esm/version.js
var PT_VERSION = "2.36.0";

// node_modules/@aws-lambda-powertools/commons/lib/esm/awsSdkUtils.js
var EXEC_ENV = process.env.AWS_EXECUTION_ENV || "NA";
var middlewareOptions = {
  relation: "after",
  toMiddleware: "getUserAgentMiddleware",
  name: "addPowertoolsToUserAgent",
  tags: ["POWERTOOLS", "USER_AGENT"]
};
var isSdkClient = (client2) => typeof client2 === "object" && client2 !== null && "send" in client2 && typeof client2.send === "function" && "config" in client2 && client2.config !== void 0 && typeof client2.config === "object" && client2.config !== null && "middlewareStack" in client2 && client2.middlewareStack !== void 0 && typeof client2.middlewareStack === "object" && client2.middlewareStack !== null && "identify" in client2.middlewareStack && typeof client2.middlewareStack.identify === "function" && "addRelativeTo" in client2.middlewareStack && typeof client2.middlewareStack.addRelativeTo === "function";
var customUserAgentMiddleware = (feature) => {
  return (next) => async (args) => {
    const existingUserAgent = args.request.headers["user-agent"] || "";
    if (existingUserAgent.includes("PT/NO-OP")) {
      const featureSpecificUserAgent = existingUserAgent.replace("PT/NO-OP", `PT/${feature}/${PT_VERSION} PTEnv/${EXEC_ENV}`);
      args.request.headers["user-agent"] = featureSpecificUserAgent;
      return await next(args);
    }
    if (existingUserAgent.includes("PT/")) {
      return await next(args);
    }
    args.request.headers["user-agent"] = existingUserAgent === "" ? `PT/${feature}/${PT_VERSION} PTEnv/${EXEC_ENV}` : `${existingUserAgent} PT/${feature}/${PT_VERSION} PTEnv/${EXEC_ENV}`;
    return await next(args);
  };
};
var hasPowertools = (middlewareStack) => {
  let found = false;
  for (const middleware of middlewareStack) {
    if (middleware.includes("addPowertoolsToUserAgent")) {
      found = true;
    }
  }
  return found;
};
var addUserAgentMiddleware = (client2, feature) => {
  try {
    if (isSdkClient(client2)) {
      if (hasPowertools(client2.middlewareStack.identify())) {
        return;
      }
      client2.middlewareStack.addRelativeTo(customUserAgentMiddleware(feature), middlewareOptions);
    } else {
      throw new Error("The client provided does not match the expected interface");
    }
  } catch (error) {
    console.warn("Failed to add user agent middleware", error);
  }
};

// node_modules/@aws-lambda-powertools/commons/lib/esm/deepMerge.js
var UNSAFE_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor"]);
var isPlainObject = (value) => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};
var cloneItem = (srcItem, ancestors) => {
  if (isPlainObject(srcItem)) {
    const cloned = {};
    ancestors.push(srcItem);
    mergeRecursive(cloned, srcItem, ancestors);
    ancestors.pop();
    return { skip: false, value: cloned };
  }
  if (Array.isArray(srcItem)) {
    if (ancestors.includes(srcItem))
      return { skip: true };
    const cloned = [];
    ancestors.push(srcItem);
    mergeArrayItemsByIndex(cloned, srcItem, ancestors);
    ancestors.pop();
    return { skip: false, value: cloned };
  }
  return { skip: false, value: srcItem };
};
var mergeArrayItem = (targetArray, index, srcItem, ancestors) => {
  const tgtItem = targetArray[index];
  const isSrcPlainObject = isPlainObject(srcItem);
  if (isSrcPlainObject && ancestors.includes(srcItem))
    return;
  if (isSrcPlainObject && isPlainObject(tgtItem)) {
    ancestors.push(srcItem);
    mergeRecursive(tgtItem, srcItem, ancestors);
    ancestors.pop();
    return;
  }
  if (Array.isArray(srcItem) && Array.isArray(tgtItem)) {
    if (!ancestors.includes(srcItem)) {
      ancestors.push(srcItem);
      mergeArrayItemsByIndex(tgtItem, srcItem, ancestors);
      ancestors.pop();
    }
    return;
  }
  if (srcItem !== void 0 || tgtItem === void 0) {
    const result = cloneItem(srcItem, ancestors);
    if (!result.skip) {
      targetArray[index] = result.value;
    }
  }
};
var mergeArrayItemsByIndex = (targetArray, sourceArray, ancestors) => {
  for (let i = 0; i < sourceArray.length; i++) {
    mergeArrayItem(targetArray, i, sourceArray[i], ancestors);
  }
};
var handleArrayMerge = (target, key, sourceArray, targetValue, ancestors) => {
  if (!Array.isArray(targetValue)) {
    const freshArray = [];
    mergeArrayItemsByIndex(freshArray, sourceArray, ancestors);
    target[key] = freshArray;
    return;
  }
  mergeArrayItemsByIndex(targetValue, sourceArray, ancestors);
};
var handleObjectMerge = (target, key, sourceObject, targetValue, ancestors) => {
  if (isPlainObject(targetValue)) {
    mergeRecursive(targetValue, sourceObject, ancestors);
    return;
  }
  const newTarget = {};
  mergeRecursive(newTarget, sourceObject, ancestors);
  target[key] = newTarget;
};
var mergeRecursive = (target, source, ancestors) => {
  for (const key of Object.keys(source)) {
    if (UNSAFE_KEYS.has(key)) {
      continue;
    }
    const sourceValue = source[key];
    const targetValue = target[key];
    if (Array.isArray(sourceValue)) {
      if (ancestors.includes(sourceValue))
        continue;
      ancestors.push(sourceValue);
      handleArrayMerge(target, key, sourceValue, targetValue, ancestors);
      ancestors.pop();
      continue;
    }
    if (isPlainObject(sourceValue)) {
      if (ancestors.includes(sourceValue))
        continue;
      ancestors.push(sourceValue);
      handleObjectMerge(target, key, sourceValue, targetValue, ancestors);
      ancestors.pop();
      continue;
    }
    if (sourceValue !== void 0 || targetValue === void 0) {
      target[key] = sourceValue;
    }
  }
};
var deepMerge = (target, ...sources) => {
  const ancestors = [target];
  for (const source of sources) {
    if (source != null) {
      ancestors.push(source);
      mergeRecursive(target, source, ancestors);
      ancestors.pop();
    }
  }
  return target;
};

// node_modules/@aws-lambda-powertools/commons/lib/esm/middleware/constants.js
var PREFIX = "powertools-for-aws";
var TRACER_KEY = `${PREFIX}.tracer`;
var METRICS_KEY = `${PREFIX}.metrics`;
var LOGGER_KEY = `${PREFIX}.logger`;
var IDEMPOTENCY_KEY = `${PREFIX}.idempotency`;

// node_modules/@aws-lambda-powertools/commons/lib/esm/typeUtils.js
var isString = (value) => {
  return typeof value === "string";
};
var isNull = (value) => {
  return Object.is(value, null);
};
var isNullOrUndefined = (value) => {
  return isNull(value) || Object.is(value, void 0);
};

// node_modules/@aws-lambda-powertools/commons/lib/esm/Utility.js
var Utility = class {
  #initializationType;
  coldStart = true;
  defaultServiceName = "service_undefined";
  constructor() {
    this.#initializationType = this.getInitializationType();
    if (this.#initializationType !== "on-demand") {
      this.coldStart = false;
    }
  }
  /**
   * Get the value of the `AWS_LAMBDA_INITIALIZATION_TYPE` environment variable.
   */
  getInitializationType() {
    const envVarValue = process.env[AWS_LAMBDA_INITIALIZATION_TYPE_ENV_VAR]?.trim();
    if (envVarValue === "on-demand") {
      return "on-demand";
    }
    if (envVarValue === "provisioned-concurrency") {
      return "provisioned-concurrency";
    }
    return "unknown";
  }
  /**
   * Get the cold start status of the current execution environment.
   *
   * The method also flips the cold start status to `false` after the first invocation.
   */
  getColdStart() {
    if (this.#initializationType !== "on-demand") {
      return false;
    }
    if (this.coldStart) {
      this.coldStart = false;
      return true;
    }
    return false;
  }
  /**
   * Validate that the service name provided is valid.
   * Used internally during initialization.
   *
   * @param serviceName Service name to validate
   */
  isValidServiceName(serviceName) {
    return typeof serviceName === "string" && serviceName.trim().length > 0;
  }
};

// node_modules/@aws-lambda-powertools/commons/lib/esm/index.js
var env = process.env.AWS_EXECUTION_ENV || "NA";
if (!process.env.AWS_SDK_UA_APP_ID?.includes("/PTEnv/")) {
  const ptUserAgent = `PT/NO-OP/${PT_VERSION}/PTEnv/${env}`;
  process.env.AWS_SDK_UA_APP_ID = process.env.AWS_SDK_UA_APP_ID ? `${process.env.AWS_SDK_UA_APP_ID}/${ptUserAgent}` : ptUserAgent;
}

// node_modules/@aws-lambda-powertools/logger/lib/esm/formatter/LogItem.js
var LogItem = class {
  /**
   * The attributes of the log item.
   */
  attributes = {};
  /**
   * Constructor for LogItem.
   *
   * Attributes are added in the following order:
   * - Standard keys provided by the logger (e.g. `message`, `level`, `timestamp`)
   * - Persistent attributes provided by developer, not formatted (done later)
   * - Ephemeral attributes provided as parameters for a single log item (done later)
   *
   * @param params - The parameters for the LogItem.
   */
  constructor(params) {
    this.setAttributes(params.attributes);
  }
  /**
   * Add attributes to the log item.
   *
   * @param attributes - The attributes to add to the log item.
   */
  addAttributes(attributes) {
    deepMerge(this.attributes, attributes);
    return this;
  }
  /**
   * Get the attributes of the log item.
   */
  getAttributes() {
    return this.attributes;
  }
  /**
   * Prepare the log item for printing.
   *
   * This operation removes empty keys from the log item, see {@link removeEmptyKeys | removeEmptyKeys()} for more information.
   */
  prepareForPrint() {
    this.attributes = this.removeEmptyKeys(this.getAttributes());
  }
  /**
   * Remove empty keys from the log item, where empty keys are defined as keys with
   * values of `undefined`, empty strings (`''`), or `null`.
   *
   * @param attributes - The attributes to remove empty keys from.
   */
  removeEmptyKeys(attributes) {
    const newAttributes = {};
    for (const key in attributes) {
      if (attributes[key] !== void 0 && attributes[key] !== "" && attributes[key] !== null) {
        newAttributes[key] = attributes[key];
      }
    }
    return newAttributes;
  }
  /**
   * Replace the attributes of the log item.
   *
   * @param attributes - The attributes to set for the log item.
   */
  setAttributes(attributes) {
    this.attributes = attributes;
  }
};

// node_modules/@aws-lambda-powertools/logger/lib/esm/Logger.js
var import_node_console = require("node:console");
var import_node_crypto = require("node:crypto");

// node_modules/@aws-lambda-powertools/logger/lib/esm/formatter/PowertoolsLogFormatter.js
var PowertoolsLogFormatter = class extends LogFormatter {
  /**
   * List of keys to order log attributes by.
   *
   * This can be a set of keys or an array of keys.
   */
  #logRecordOrder;
  constructor(options) {
    super();
    this.#logRecordOrder = options?.logRecordOrder;
  }
  /**
   * It formats key-value pairs of log attributes.
   *
   * @param {UnformattedAttributes} attributes - unformatted attributes
   * @param {LogAttributes} additionalLogAttributes - additional log attributes
   */
  formatAttributes(attributes, additionalLogAttributes) {
    const baseAttributes = {
      level: attributes.logLevel,
      message: attributes.message,
      timestamp: this.formatTimestamp(attributes.timestamp),
      service: attributes.serviceName,
      cold_start: attributes.lambdaContext?.coldStart,
      function_arn: attributes.lambdaContext?.invokedFunctionArn,
      function_memory_size: attributes.lambdaContext?.memoryLimitInMB,
      function_name: attributes.lambdaContext?.functionName,
      function_request_id: attributes.lambdaContext?.awsRequestId,
      sampling_rate: attributes.sampleRateValue,
      xray_trace_id: attributes.xRayTraceId,
      tenant_id: attributes.lambdaContext?.tenantId
    };
    if (this.#logRecordOrder === void 0) {
      return new LogItem({ attributes: baseAttributes }).addAttributes(additionalLogAttributes);
    }
    const orderedAttributes = {};
    for (const key of this.#logRecordOrder) {
      if (key in baseAttributes && !(key in orderedAttributes)) {
        orderedAttributes[key] = baseAttributes[key];
      } else if (key in additionalLogAttributes && !(key in orderedAttributes)) {
        orderedAttributes[key] = additionalLogAttributes[key];
      }
    }
    for (const key in baseAttributes) {
      if (!(key in orderedAttributes)) {
        orderedAttributes[key] = baseAttributes[key];
      }
    }
    for (const key in additionalLogAttributes) {
      if (!(key in orderedAttributes)) {
        orderedAttributes[key] = additionalLogAttributes[key];
      }
    }
    const powertoolsLogItem = new LogItem({
      attributes: orderedAttributes
    });
    return powertoolsLogItem;
  }
};

// node_modules/@aws-lambda-powertools/commons/lib/esm/InvocationScoped.js
var InvocationScoped = class {
  /**
   * Key the boxed value is stored under in the InvokeStore, unique to this
   * instance.
   */
  #key;
  /**
   * Creates the value, either by calling the `fresh` factory or by handing back
   * the `initial` value.
   */
  #createValue;
  /**
   * Whether each invocation gets its own value created for it (`fresh`) instead
   * of falling back to the shared one (`initial`).
   */
  #createsPerInvocation;
  /**
   * The value shared across invocations, boxed like the invocation-scoped one.
   */
  #sharedValue;
  /**
   * @param name - Description of the value, used for the storage key, e.g. `powertools.logger.logLevel`
   * @param {Object} options - Options to create the value
   * @param options.initial - Value shared across invocations until one sets its own
   * @param options.fresh - Creates the value, called once per invocation on first access, and once for the shared value
   */
  constructor(name, options) {
    this.#key = Symbol(name);
    if ("fresh" in options) {
      this.#createValue = options.fresh;
      this.#createsPerInvocation = true;
    } else {
      const { initial } = options;
      this.#createValue = () => initial;
      this.#createsPerInvocation = false;
    }
  }
  /**
   * Whether reads and writes are currently scoped to a single invocation.
   */
  get isScoped() {
    return this.#getScopedStore() !== void 0;
  }
  /**
   * Gets the invocation-scoped value when there is one, otherwise the shared
   * value.
   *
   * A `fresh` value is created on first access, and the same one is handed back
   * for the rest of the invocation.
   */
  get() {
    const store = this.#getScopedStore();
    if (store === void 0) {
      return this.getShared();
    }
    const scopedValue = store.get(this.#key);
    if (scopedValue !== void 0) {
      return scopedValue[0];
    }
    if (!this.#createsPerInvocation) {
      return this.getShared();
    }
    const freshValue = this.#createValue();
    store.set(this.#key, [freshValue]);
    return freshValue;
  }
  /**
   * Sets the value for the current invocation, or the shared value when no
   * invocation context is active, i.e. during initialization.
   *
   * `undefined` is a value like any other: it shadows the shared value until
   * {@link InvocationScoped.reset | `reset()`} discards it.
   *
   * @param value - The value to store
   */
  set(value) {
    const store = this.#getScopedStore();
    if (store === void 0) {
      this.setShared(value);
      return;
    }
    store.set(this.#key, [value]);
  }
  /**
   * Discards the value, so that a `fresh` one is created on the next access and
   * an `initial` one goes back to the shared value.
   *
   * Outside an invocation context the shared value is discarded instead, which
   * puts an `initial` value back to the one given at construction.
   */
  reset() {
    const store = this.#getScopedStore();
    if (store === void 0) {
      this.#sharedValue = void 0;
      return;
    }
    store.set(this.#key, void 0);
  }
  /**
   * Gets the value shared across invocations, ignoring any invocation context.
   *
   * It is created on first access, whether from here or from
   * {@link InvocationScoped.get | `get()`}.
   */
  getShared() {
    this.#sharedValue ??= [this.#createValue()];
    return this.#sharedValue[0];
  }
  /**
   * Sets the value shared across invocations, ignoring any invocation context.
   *
   * @param value - The value to store
   */
  setShared(value) {
    this.#sharedValue = [value];
  }
  /**
   * Gets the InvokeStore when reads and writes should be scoped to the current
   * invocation, or `undefined` when they should go to the shared value.
   */
  #getScopedStore() {
    if (!shouldUseInvokeStore()) {
      return void 0;
    }
    const store = globalThis.awslambda?.InvokeStore;
    if (store === void 0) {
      throw new Error("InvokeStore is not available");
    }
    return store.hasContext() ? store : void 0;
  }
};

// node_modules/@aws-lambda-powertools/logger/lib/esm/LogAttributesStore.js
var LogAttributesStore = class {
  #temporaryAttributes = new InvocationScoped("powertools.logger.temporaryAttributes", { fresh: () => ({}) });
  #keys = new InvocationScoped("powertools.logger.keys", { fresh: () => /* @__PURE__ */ new Map() });
  #lambdaContext = new InvocationScoped("powertools.logger.lambdaContext", { initial: void 0 });
  #persistentAttributes = {};
  #getTemporaryAttributes() {
    return this.#temporaryAttributes.get();
  }
  #getKeys() {
    return this.#keys.get();
  }
  appendTemporaryKeys(attributes) {
    const tempAttrs = this.#getTemporaryAttributes();
    deepMerge(tempAttrs, attributes);
    const keysMap = this.#getKeys();
    for (const key of Object.keys(attributes)) {
      keysMap.set(key, "temp");
    }
  }
  removeTemporaryKeys(keys) {
    const tempAttrs = this.#getTemporaryAttributes();
    const keysMap = this.#getKeys();
    for (const key of keys) {
      tempAttrs[key] = void 0;
      if (this.#persistentAttributes[key]) {
        keysMap.set(key, "persistent");
      } else {
        keysMap.delete(key);
      }
    }
  }
  getTemporaryAttributes() {
    return { ...this.#getTemporaryAttributes() };
  }
  clearTemporaryAttributes() {
    const tempAttrs = this.#getTemporaryAttributes();
    const keysMap = this.#getKeys();
    for (const key of Object.keys(tempAttrs)) {
      if (this.#persistentAttributes[key]) {
        keysMap.set(key, "persistent");
      } else {
        keysMap.delete(key);
      }
    }
    this.#temporaryAttributes.reset();
  }
  setLambdaContext(context) {
    this.#lambdaContext.set(context);
  }
  getLambdaContext() {
    return this.#lambdaContext.get();
  }
  setPersistentAttributes(attributes) {
    const keysMap = this.#getKeys();
    this.#persistentAttributes = { ...attributes };
    for (const key of Object.keys(attributes)) {
      keysMap.set(key, "persistent");
    }
  }
  getPersistentAttributes() {
    return { ...this.#persistentAttributes };
  }
  getAllAttributes() {
    const result = {};
    const tempAttrs = this.#getTemporaryAttributes();
    const keysMap = this.#getKeys();
    for (const [key, value] of Object.entries(this.#persistentAttributes)) {
      if (value !== void 0) {
        result[key] = value;
      }
    }
    for (const [key, type] of keysMap.entries()) {
      if (type === "temp" && tempAttrs[key] !== void 0) {
        result[key] = tempAttrs[key];
      }
    }
    return result;
  }
  removePersistentKeys(keys) {
    const keysMap = this.#getKeys();
    const tempAttrs = this.#getTemporaryAttributes();
    for (const key of keys) {
      this.#persistentAttributes[key] = void 0;
      if (tempAttrs[key]) {
        keysMap.set(key, "temp");
      } else {
        keysMap.delete(key);
      }
    }
  }
};

// node_modules/@aws-lambda-powertools/logger/lib/esm/logBuffer.js
var SizedItem = class {
  value;
  logLevel;
  byteSize;
  constructor(value, logLevel) {
    if (!isString(value)) {
      throw new Error("Value should be a string");
    }
    this.value = value;
    this.logLevel = logLevel;
    this.byteSize = Buffer.byteLength(value);
  }
};
var SizedSet = class extends Set {
  currentBytesSize = 0;
  hasEvictedLog = false;
  /**
   * Adds an item to the set and updates the current byte size.
   *
   * @param item - The item to add
   */
  add(item) {
    this.currentBytesSize += item.byteSize;
    super.add(item);
    return this;
  }
  /**
   * Deletes an item from the set and updates the current byte size.
   *
   * @param item - The item to delete
   */
  delete(item) {
    const wasDeleted = super.delete(item);
    if (wasDeleted) {
      this.currentBytesSize -= item.byteSize;
    }
    return wasDeleted;
  }
  /**
   * Clears all items from the set and resets the current byte size.
   */
  clear() {
    super.clear();
    this.currentBytesSize = 0;
  }
  /**
   * Removes the first item from the set and returns it.
   */
  shift() {
    const firstElement = this.values().next().value;
    if (firstElement) {
      this.delete(firstElement);
    }
    return firstElement;
  }
};
var CircularMap = class extends Map {
  #maxBytesSize;
  #onBufferOverflow;
  constructor({ maxBytesSize, onBufferOverflow }) {
    super();
    this.#maxBytesSize = maxBytesSize;
    this.#onBufferOverflow = onBufferOverflow;
  }
  /**
   * Adds an item to the buffer, evicting older items if necessary.
   *
   * @param key - The key to associate with the item
   * @param value - The item to add
   * @param logLevel - The log level of the item
   */
  setItem(key, value, logLevel) {
    const item = new SizedItem(value, logLevel);
    if (item.byteSize > this.#maxBytesSize) {
      throw new Error("Item too big");
    }
    const buffer = this.get(key) || new SizedSet();
    if (buffer.currentBytesSize !== 0 && buffer.currentBytesSize + item.byteSize >= this.#maxBytesSize) {
      this.#deleteFromBufferUntilSizeIsLessThanMax(buffer, item);
      if (this.#onBufferOverflow) {
        this.#onBufferOverflow();
      }
    }
    buffer.add(item);
    super.set(key, buffer);
    return this;
  }
  /**
   * Deletes an item from the buffer.
   *
   * @param key - The key associated with the item
   * @param value - The item to delete
   */
  #deleteFromBufferUntilSizeIsLessThanMax(buffer, item) {
    while (buffer.size !== 0 && buffer.currentBytesSize + item.byteSize >= this.#maxBytesSize) {
      buffer.shift();
      buffer.hasEvictedLog = true;
    }
  }
};

// node_modules/@aws-lambda-powertools/logger/lib/esm/LogInvocationStore.js
var LogInvocationStore = class {
  #logLevel;
  #buffer = new InvocationScoped("powertools.logger.buffer", { fresh: () => new CircularMap({ maxBytesSize: this.#maxBytes }) });
  #maxBytes;
  constructor(logLevel) {
    this.#logLevel = new InvocationScoped("powertools.logger.logLevel", {
      initial: logLevel
    });
  }
  /**
   * Get the log level in effect: the per-invocation level when one has been
   * set, otherwise the base level.
   */
  getLogLevel() {
    return this.#logLevel.get();
  }
  /**
   * Get the base log level shared across invocations, without consulting the
   * InvokeStore.
   */
  getBaseLogLevel() {
    return this.#logLevel.getShared();
  }
  /**
   * Set the log level, scoping it to the current invocation when concurrency
   * is enabled and an invocation context is active. Outside an invocation
   * context (e.g. during initialization) the base level is set instead.
   */
  setLogLevel(logLevel) {
    this.#logLevel.set(logLevel);
  }
  /**
   * Set the base log level shared across invocations, regardless of any active
   * invocation context. Used at initialization and for Advanced Logging
   * Controls, which apply environment-wide.
   */
  setBaseLogLevel(logLevel) {
    this.#logLevel.setShared(logLevel);
  }
  /**
   * Enable the log buffer with the given max byte size per trace id.
   *
   * Must be called before any buffer operation; the buffer methods are only
   * reached when buffering is enabled.
   *
   * @param maxBytes - Max byte size of each trace id's buffer
   */
  configureBuffer(maxBytes) {
    this.#maxBytes = maxBytes;
    this.#buffer.setShared(new CircularMap({ maxBytesSize: maxBytes }));
  }
  #getBuffer() {
    return this.#buffer.get();
  }
  /**
   * Add a log to the buffer for the given trace id.
   *
   * @param traceId - `_X_AMZN_TRACE_ID` of the request
   * @param value - The serialized log to be buffered
   * @param logLevel - The level of the log to be buffered
   */
  add(traceId, value, logLevel) {
    const buffer = this.#getBuffer();
    if (!this.#buffer.isScoped && buffer.has(traceId) === false) {
      buffer.clear();
    }
    buffer.setItem(traceId, value, logLevel);
  }
  /**
   * Get the buffered logs for the given trace id, if any.
   *
   * @param traceId - `_X_AMZN_TRACE_ID` of the request
   */
  get(traceId) {
    return this.#getBuffer().get(traceId);
  }
  /**
   * Empty the buffer for the given trace id.
   *
   * @param traceId - `_X_AMZN_TRACE_ID` of the request
   */
  delete(traceId) {
    this.#getBuffer().delete(traceId);
  }
};

// node_modules/@aws-lambda-powertools/logger/lib/esm/Logger.js
var Logger = class _Logger extends Utility {
  /**
   * Console instance used to print logs.
   *
   * In AWS Lambda, we create a new instance of the Console class so that we can have
   * full control over the output of the logs. In testing environments, we use the
   * default console instance.
   *
   * This property is initialized in the constructor in `setOptions()`.
   */
  console;
  /**
   * Custom config service instance used to configure the logger.
   */
  customConfigService;
  /**
   * Whether to print the Lambda invocation event in the logs.
   */
  logEvent = false;
  /**
   * Formatter used to format the log items.
   * @default new PowertoolsLogFormatter()
   */
  logFormatter;
  /**
   * JSON indentation used to format the logs.
   */
  logIndentation = LogJsonIndent.COMPACT;
  /**
   * Advanced Logging Control Log Level
   * If not a valid value this will be left undefined, even if the
   * environment variable AWS_LAMBDA_LOG_LEVEL is set
   */
  #alcLogLevel;
  /**
   * Standard attributes managed by Powertools that will be logged in all log items.
   */
  powertoolsLogData = {
    sampleRateValue: 0
  };
  /**
   * Store for managing temporary and persistent log attributes.
   */
  #attributesStore = new LogAttributesStore();
  /**
   * Buffer used to store logs until the logger is initialized.
   *
   * Sometimes we need to log warnings before the logger is fully initialized, however we can't log them
   * immediately because the logger is not ready yet. This buffer stores those logs until the logger is ready.
   */
  #initBuffer = [];
  /**
   * Flag used to determine if the logger is initialized.
   */
  #isInitialized = false;
  /**
   * This is the initial log leval as set during the initialization of the logger.
   *
   * We keep this value to be able to reset the log level to the initial value when the sample rate is refreshed.
   */
  #initialLogLevel = LogLevelThreshold.INFO;
  /**
   * Replacer function used to serialize the log items.
   */
  #jsonReplacerFn;
  /**
   * Buffer configuration options.
   */
  #bufferConfig = {
    enabled: false,
    flushOnErrorLog: true,
    maxBytes: 20480,
    bufferAtVerbosity: LogLevelThreshold.DEBUG
  };
  /**
   * Store for per-invocation log state: the effective log level and, once
   * buffering is enabled, the buffered logs grouped by `_X_AMZN_TRACE_ID`.
   *
   * Scopes the state to each invocation via the InvokeStore when invocations
   * run concurrently, and falls back to instance-level state shared across
   * sequential invocations.
   */
  #invocationStore = new LogInvocationStore(LogLevelThreshold.INFO);
  /**
   * Search function for the correlation ID.
   */
  #correlationIdSearchFn;
  /**
   * The debug sampling rate configuration.
   */
  #debugLogSampling = {
    /**
     * The sampling rate value used to determine if the log level should be set to DEBUG.
     */
    sampleRateValue: 0,
    /**
     * The number of times the debug sampling rate has been refreshed.
     *
     * We use this to determine if we should refresh it again.
     */
    refreshedTimes: 0
  };
  /**
   * Map used to store the warning messages that have already been logged.
   */
  #warnOnceMap = /* @__PURE__ */ new Map();
  /**
   * Log level used by the current instance of Logger.
   *
   * Returns the log level as a number. The higher the number, the less verbose the logs.
   * To get the log level name, use the {@link getLevelName()} method.
   */
  get level() {
    return this.#invocationStore.getLogLevel();
  }
  constructor(options = {}) {
    super();
    const { customConfigService, ...rest } = options;
    this.customConfigService = customConfigService;
    this.setOptions(rest);
    this.#isInitialized = true;
    for (const [level, log] of this.#initBuffer) {
      this.printLog(level, this.createAndPopulateLogItem(...log));
    }
    this.#initBuffer = [];
  }
  /**
   * Add the current Lambda function's invocation context data to the powertoolLogData property of the instance.
   * This context data will be part of all printed log items.
   *
   * The implementation signature also accepts the stored {@link LambdaFunctionContext} subset so that
   * {@link Logger.createChild | `createChild()`} can propagate the parent's context without unsafe casts.
   * The public contract ({@link LoggerInterface.addContext}) remains `Context`.
   *
   * @param context - The Lambda function's invocation context.
   */
  addContext(context) {
    this.#attributesStore.setLambdaContext({
      invokedFunctionArn: context.invokedFunctionArn,
      coldStart: this.getColdStart(),
      awsRequestId: context.awsRequestId,
      memoryLimitInMB: context.memoryLimitInMB,
      functionName: context.functionName,
      functionVersion: context.functionVersion,
      tenantId: context.tenantId
    });
  }
  /**
   * @deprecated This method is deprecated and will be removed in the future major versions, please use {@link appendPersistentKeys() `appendPersistentKeys()`} instead.
   */
  addPersistentLogAttributes(attributes) {
    this.appendPersistentKeys(attributes);
  }
  /**
   * Add the given temporary attributes (key-value pairs) to all log items generated by this Logger instance.
   *
   * If the key already exists in the attributes, it will be overwritten. If the key is one of `level`, `message`, `sampling_rate`,
   * `service`, or `timestamp` we will log a warning and drop the value.
   *
   * @param attributes - The attributes to add to all log items.
   */
  appendKeys(attributes) {
    this.#appendKeys(attributes, "temp");
  }
  /**
   * Add the given persistent attributes (key-value pairs) to all log items generated by this Logger instance.
   *
   * If the key already exists in the attributes, it will be overwritten. If the key is one of `level`, `message`, `sampling_rate`,
   * `service`, or `timestamp` we will log a warning and drop the value.
   *
   * @param attributes - The attributes to add to all log items.
   */
  appendPersistentKeys(attributes) {
    this.#appendKeys(attributes, "persistent");
  }
  /**
   * Create a separate Logger instance, identical to the current one.
   * It's possible to overwrite the new instance options by passing them.
   *
   * @param options - The options to initialize the child logger with.
   */
  createChild(options = {}) {
    const persistentKeyName = "persistentLogAttributes" in options && !("persistentKeys" in options) ? "persistentLogAttributes" : "persistentKeys";
    const childLogger = this.createLogger(
      // Merge parent logger options with options passed to createChild,
      // the latter having precedence.
      deepMerge({}, {
        logLevel: this.getLevelName(),
        serviceName: this.powertoolsLogData.serviceName,
        sampleRateValue: this.#debugLogSampling.sampleRateValue,
        logFormatter: this.getLogFormatter(),
        customConfigService: this.getCustomConfigService(),
        environment: this.powertoolsLogData.environment,
        [persistentKeyName]: this.#attributesStore.getPersistentAttributes(),
        jsonReplacerFn: this.#jsonReplacerFn,
        correlationIdSearchFn: this.#correlationIdSearchFn,
        ...this.#bufferConfig.enabled && {
          logBufferOptions: {
            maxBytes: this.#bufferConfig.maxBytes,
            bufferAtVerbosity: this.getLogLevelNameFromNumber(this.#bufferConfig.bufferAtVerbosity),
            flushOnErrorLog: this.#bufferConfig.flushOnErrorLog
          }
        }
      }, options)
    );
    const lambdaContext = this.#attributesStore.getLambdaContext();
    if (lambdaContext)
      childLogger.addContext(lambdaContext);
    const temporaryAttributes = this.#attributesStore.getTemporaryAttributes();
    if (Object.keys(temporaryAttributes).length > 0) {
      childLogger.appendKeys(temporaryAttributes);
    }
    return childLogger;
  }
  /**
   * Print a log item with level CRITICAL.
   *
   * @param input - The log message.
   * @param extraInput - The extra input to log.
   */
  critical(input, ...extraInput) {
    this.processLogItem(LogLevelThreshold.CRITICAL, input, extraInput);
  }
  /**
   * Print a log item with level DEBUG.
   *
   * @param input
   * @param extraInput - The extra input to log.
   */
  debug(input, ...extraInput) {
    this.processLogItem(LogLevelThreshold.DEBUG, input, extraInput);
  }
  /**
   * Print a log item with level ERROR.
   *
   * @param input - The log message.
   * @param extraInput - The extra input to log.
   */
  error(input, ...extraInput) {
    this.processLogItem(LogLevelThreshold.ERROR, input, extraInput);
  }
  /**
   * Get the log level name of the current instance of Logger.
   *
   * Returns the log level name, i.e. `INFO`, `DEBUG`, etc.
   * To get the log level as a number, use the {@link Logger.level} property.
   */
  getLevelName() {
    return this.getLogLevelNameFromNumber(this.#invocationStore.getLogLevel());
  }
  /**
   * Return a boolean value. True means that the Lambda invocation events
   * are printed in the logs.
   */
  getLogEvent() {
    return this.logEvent;
  }
  /**
   * Return the persistent log attributes, which are the attributes
   * that will be logged in all log items.
   */
  getPersistentLogAttributes() {
    return this.#attributesStore.getPersistentAttributes();
  }
  /**
   * Print a log item with level INFO.
   *
   * @param input - The log message.
   * @param extraInput - The extra input to log.
   */
  info(input, ...extraInput) {
    this.processLogItem(LogLevelThreshold.INFO, input, extraInput);
  }
  /**
   * Class method decorator that adds the current Lambda function context as extra
   * information in all log items.
   *
   * This decorator is useful when you want to enrich your logs with information
   * from the function context, such as the function name, version, and request ID, and more.
   *
   * @example
   * ```typescript
   * import { Logger } from '@aws-lambda-powertools/logger';
   * import type { LambdaInterface } from '@aws-lambda-powertools/commons/types';
   *
   * const logger = new Logger({ serviceName: 'serverlessAirline' });
   *
   * class Lambda implements LambdaInterface {
   *   // Decorate your handler class method
   *   ⁣@logger.injectLambdaContext()
   *   public async handler(_event: unknown, _context: unknown): Promise<void> {
   *     logger.info('This is an INFO log with some context');
   *   }
   * }
   *
   * const handlerClass = new Lambda();
   * export const handler = handlerClass.handler.bind(handlerClass);
   * ```
   *
   * The decorator can also be used to log the Lambda invocation event; this can be configured both via
   * the `logEvent` parameter and the `POWERTOOLS_LOGGER_LOG_EVENT` environment variable. When both
   * are set, the `logEvent` parameter takes precedence.
   *
   * Additionally, the decorator can be used to reset the temporary keys added with the `appendKeys()` method
   * after the invocation, or to flush the buffer when an uncaught error is thrown in the handler.
   *
   * @see https://www.typescriptlang.org/docs/handbook/decorators.html#method-decorators
   *
   * @param options.logEvent - When `true` the logger will log the event.
   * @param options.resetKeys - When `true` the logger will clear temporary keys added with {@link Logger.appendKeys() `appendKeys()`} method.
   * @param options.flushBufferOnUncaughtError - When `true` the logger will flush the buffer when an uncaught error is thrown in the handler.
   */
  injectLambdaContext(options) {
    return (_target, _propertyKey, descriptor) => {
      const originalMethod = descriptor.value;
      const loggerRef = this;
      descriptor.value = async function(...args) {
        loggerRef.refreshSampleRateCalculation();
        loggerRef.addContext(args[1]);
        loggerRef.logEventIfEnabled(args[0], options?.logEvent);
        if (options?.correlationIdPath) {
          loggerRef.setCorrelationId(args[0], options?.correlationIdPath);
        }
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          if (options?.flushBufferOnUncaughtError) {
            loggerRef.flushBuffer();
            loggerRef.error({
              message: UncaughtErrorLogMessage,
              error
            });
          }
          throw error;
        } finally {
          if (options?.clearState || options?.resetKeys)
            loggerRef.resetKeys();
          loggerRef.clearBuffer();
        }
      };
    };
  }
  /**
   * @deprecated This method is deprecated and will be removed in the future major versions. Use {@link resetKeys()} instead.
   */
  /* v8 ignore next -- @preserve */
  static injectLambdaContextAfterOrOnError(logger2, _persistentAttributes, options) {
    if (options && (options.clearState || options?.resetKeys)) {
      logger2.resetKeys();
    }
  }
  /**
   * @deprecated - This method is deprecated and will be removed in the next major version.
   */
  /* v8 ignore next -- @preserve */
  static injectLambdaContextBefore(logger2, event, context, options) {
    logger2.addContext(context);
    logger2.logEventIfEnabled(event, options?.logEvent);
  }
  /**
   * Log the AWS Lambda event payload for the current invocation if the environment variable `POWERTOOLS_LOGGER_LOG_EVENT` is set to `true`.
   *
   * @example
   * ```ts
   * process.env.POWERTOOLS_LOGGER_LOG_EVENT = 'true';
   *
   * import { Logger } from '@aws-lambda-powertools/logger';
   *
   * const logger = new Logger();
   *
   * export const handler = async (event) => {
   *   logger.logEventIfEnabled(event);
   *   // ... your handler code
   * }
   * ```
   *
   * @param event - The AWS Lambda event payload.
   * @param overwriteValue - Overwrite the environment variable value.
   */
  logEventIfEnabled(event, overwriteValue) {
    if (!this.shouldLogEvent(overwriteValue))
      return;
    this.info("Lambda invocation event", { event });
  }
  /**
   * This method allows recalculating the initial sampling decision for changing
   * the log level to DEBUG based on a sample rate value used during initialization,
   * potentially yielding a different outcome.
   *
   * This only works for warm starts, because we don't to avoid double sampling.
   */
  refreshSampleRateCalculation() {
    if (this.#debugLogSampling.refreshedTimes === 0) {
      this.#debugLogSampling.refreshedTimes++;
      return;
    }
    if (this.#shouldEnableDebugSampling() && this.#invocationStore.getLogLevel() > LogLevelThreshold.TRACE) {
      this.setLogLevel("DEBUG");
      this.debug("Setting log level to DEBUG due to sampling rate");
    } else {
      this.setLogLevel(this.getLogLevelNameFromNumber(this.#initialLogLevel));
    }
  }
  /**
   * Remove temporary attributes based on provided keys to all log items generated by this Logger instance.
   *
   * @param keys - The keys to remove.
   */
  removeKeys(keys) {
    this.#attributesStore.removeTemporaryKeys(keys);
  }
  /**
   * Remove the given keys from the persistent keys.
   *
   * @example
   * ```typescript
   * import { Logger } from '@aws-lambda-powertools/logger';
   *
   * const logger = new Logger({
   *   persistentKeys: {
   *     environment: 'prod',
   *   },
   * });
   *
   * logger.removePersistentKeys(['environment']);
   * ```
   *
   * @param keys - The keys to remove from the persistent attributes.
   */
  removePersistentKeys(keys) {
    this.#attributesStore.removePersistentKeys(keys);
  }
  /**
   * @deprecated This method is deprecated and will be removed in the future major versions. Use {@link removePersistentKeys()} instead.
   */
  removePersistentLogAttributes(keys) {
    this.removePersistentKeys(keys);
  }
  /**
   * Remove all temporary log attributes added with {@link appendKeys() `appendKeys()`} method.
   */
  resetKeys() {
    this.#attributesStore.clearTemporaryAttributes();
  }
  /**
   * Set the log level for this Logger instance.
   *
   * If the log level is set using AWS Lambda Advanced Logging Controls, it sets it
   * instead of the given log level to avoid data loss.
   *
   * @param logLevel The log level to set, i.e. `error`, `warn`, `info`, `debug`, etc.
   */
  setLogLevel(logLevel) {
    if (this.awsLogLevelShortCircuit(logLevel))
      return;
    if (this.isValidLogLevel(logLevel)) {
      this.#invocationStore.setLogLevel(LogLevelThreshold[logLevel]);
    } else {
      throw new Error(`Invalid log level: ${logLevel}`);
    }
  }
  /**
   * @deprecated This method is deprecated and will be removed in the future major versions, please use {@link appendPersistentKeys() `appendPersistentKeys()`} instead.
   */
  setPersistentLogAttributes(attributes) {
    const filtered = this.#filterReservedAttributeKeys(attributes);
    this.#attributesStore.setPersistentAttributes(filtered);
  }
  /**
   * @deprecated Use getPersistentLogAttributes() instead
   */
  get persistentLogAttributes() {
    return this.#attributesStore.getPersistentAttributes();
  }
  /**
   * Check whether the current Lambda invocation event should be printed in the logs or not.
   *
   * @param overwriteValue - Overwrite the environment variable value.
   */
  shouldLogEvent(overwriteValue) {
    if (typeof overwriteValue === "boolean") {
      return overwriteValue;
    }
    return this.getLogEvent();
  }
  /**
   * Print a log item with level TRACE.
   *
   * @param input - The log message.
   * @param extraInput - The extra input to log.
   */
  trace(input, ...extraInput) {
    this.processLogItem(LogLevelThreshold.TRACE, input, extraInput);
  }
  /**
   * Print a log item with level WARN.
   *
   * @param input - The log message.
   * @param extraInput - The extra input to log.
   */
  warn(input, ...extraInput) {
    this.processLogItem(LogLevelThreshold.WARN, input, extraInput);
  }
  /**
   * Log a warning message once per unique message.
   *
   * @param message - The log message.
   */
  #warnOnce(message) {
    if (this.#warnOnceMap.has(message))
      return;
    this.#warnOnceMap.set(message, true);
    this.warn(message);
  }
  /**
   * Factory method for instantiating logger instances. Used by `createChild` method.
   * Important for customization and subclassing. It allows subclasses, like `MyOwnLogger`,
   * to override its behavior while keeping the main business logic in `createChild` intact.
   *
   * @example
   * ```typescript
   * // MyOwnLogger subclass
   * class MyOwnLogger extends Logger {
   *   protected createLogger(options?: ConstructorOptions): MyOwnLogger {
   *     return new MyOwnLogger(options);
   *   }
   *   // No need to re-implement business logic from `createChild` and keep track on changes
   *   public createChild(options?: ConstructorOptions): MyOwnLogger {
   *     return super.createChild(options) as MyOwnLogger;
   *   }
   * }
   * ```
   *
   * @param options - Logger configuration options.
   */
  createLogger(options) {
    return new _Logger(options);
  }
  /**
   * A custom JSON replacer function that is used to serialize the log items.
   *
   * By default, we already extend the default serialization behavior to handle `BigInt` and `Error` objects, as well as remove circular references.
   * When a custom JSON replacer function is passed to the Logger constructor, it will be called **before** our custom rules for each key-value pair in the object being stringified.
   *
   * This allows you to customize the serialization while still benefiting from the default behavior.
   *
   * @see {@link ConstructorOptions.jsonReplacerFn}
   */
  getJsonReplacer() {
    const ancestors = [];
    const jsonReplacerFn = this.#jsonReplacerFn;
    const logFormatter = this.getLogFormatter();
    return function(key, value) {
      let replacedValue = value;
      if (jsonReplacerFn)
        replacedValue = jsonReplacerFn(key, replacedValue);
      if (replacedValue instanceof Error) {
        replacedValue = logFormatter.formatError(replacedValue);
      }
      if (typeof replacedValue === "bigint") {
        return replacedValue.toString();
      }
      if (typeof replacedValue === "object" && replacedValue !== null) {
        while (ancestors.length > 0 && ancestors.at(-1) !== this) {
          ancestors.pop();
        }
        if (ancestors.includes(replacedValue)) {
          return;
        }
        ancestors.push(replacedValue);
      }
      return replacedValue;
    };
  }
  /**
   * Store information that is printed in all log items.
   *
   * @param attributes - The attributes to add to all log items.
   */
  addToPowertoolsLogData(attributes) {
    deepMerge(this.powertoolsLogData, attributes);
  }
  #filterReservedAttributeKeys(attributes) {
    const filtered = {};
    for (const [key, value] of Object.entries(attributes)) {
      if (!this.#checkReservedKeyAndWarn(key)) {
        filtered[key] = value;
      }
    }
    return filtered;
  }
  /**
   * Shared logic for adding keys to the logger instance.
   *
   * @param attributes - The attributes to add to the log item.
   * @param type - The type of the attributes to add.
   */
  #appendKeys(attributes, type) {
    const filtered = this.#filterReservedAttributeKeys(attributes);
    if (type === "temp") {
      this.#attributesStore.appendTemporaryKeys(filtered);
    } else {
      const current = this.#attributesStore.getPersistentAttributes();
      this.#attributesStore.setPersistentAttributes(deepMerge(current, filtered));
    }
  }
  awsLogLevelShortCircuit(selectedLogLevel) {
    if (this.#alcLogLevel !== void 0) {
      this.#invocationStore.setBaseLogLevel(LogLevelThreshold[this.#alcLogLevel]);
      if (this.isValidLogLevel(selectedLogLevel) && this.#invocationStore.getBaseLogLevel() > LogLevelThreshold[selectedLogLevel]) {
        this.#warnOnce(`Current log level (${selectedLogLevel}) does not match AWS Lambda Advanced Logging Controls minimum log level (${this.#alcLogLevel}). This can lead to data loss, consider adjusting them.`);
      }
      return true;
    }
    return false;
  }
  /**
   * Create a log item and populate it with the given log level, input, and extra input.
   */
  createAndPopulateLogItem(logLevel, input, extraInput) {
    const unformattedBaseAttributes = {
      logLevel: this.getLogLevelNameFromNumber(logLevel),
      timestamp: /* @__PURE__ */ new Date(),
      xRayTraceId: getXRayTraceIdFromEnv(),
      ...this.#getPowertoolsLogData(),
      message: ""
    };
    const additionalAttributes = this.#attributesStore.getAllAttributes();
    this.#processMainInput(input, unformattedBaseAttributes, additionalAttributes);
    this.#processExtraInput(extraInput, additionalAttributes);
    return this.getLogFormatter().formatAttributes(unformattedBaseAttributes, additionalAttributes);
  }
  /**
   * Process the main input message and add it to the attributes
   */
  #processMainInput(input, baseAttributes, additionalAttributes) {
    if (typeof input === "string") {
      baseAttributes.message = input;
      return;
    }
    const { message, ...rest } = input;
    baseAttributes.message = message;
    for (const [key, value] of Object.entries(rest)) {
      if (!this.#checkReservedKeyAndWarn(key)) {
        additionalAttributes[key] = value;
      }
    }
  }
  /**
   * Process extra input items and add them to additional attributes
   */
  #processExtraInput(extraInput, additionalAttributes) {
    for (const item of extraInput) {
      if (isNullOrUndefined(item)) {
        continue;
      }
      if (item instanceof Error) {
        additionalAttributes.error = item;
      } else if (typeof item === "string") {
        additionalAttributes.extra = item;
      } else {
        this.#processExtraObject(item, additionalAttributes);
      }
    }
  }
  /**
   * Process an extra input object and add its properties to additional attributes
   */
  #processExtraObject(item, additionalAttributes) {
    for (const [key, value] of Object.entries(item)) {
      if (!this.#checkReservedKeyAndWarn(key)) {
        additionalAttributes[key] = value;
      }
    }
  }
  /**
   * Make a new debug log sampling decision based on the sample rate value.
   */
  #shouldEnableDebugSampling() {
    return this.#debugLogSampling.sampleRateValue && (0, import_node_crypto.randomInt)(0, 100) / 100 <= this.#debugLogSampling.sampleRateValue;
  }
  /**
   * Check if a given key is reserved and warn the user if it is.
   *
   * @param key - The key to check
   */
  #checkReservedKeyAndWarn(key) {
    if (ReservedKeys.includes(key)) {
      this.warn(`The key "${key}" is a reserved key and will be dropped.`);
      return true;
    }
    return false;
  }
  /**
   * Get the custom config service, an abstraction used to fetch environment variables.
   */
  getCustomConfigService() {
    return this.customConfigService;
  }
  /**
   * Get the instance of a service that formats the structure of a
   * log item's keys and values in the desired way.
   */
  getLogFormatter() {
    return this.logFormatter;
  }
  /**
   * Get the log level name from the log level number.
   *
   * For example, if the log level is 16, it will return 'WARN'.
   *
   * @param logLevel - The log level to get the name of
   */
  getLogLevelNameFromNumber(logLevel) {
    let found;
    for (const [key, value] of Object.entries(LogLevelThreshold)) {
      if (value === logLevel) {
        found = key;
        break;
      }
    }
    return found;
  }
  /**
   * Get information that will be added in all log item by
   * this Logger instance (different from user-provided persistent attributes).
   */
  #getPowertoolsLogData() {
    const lambdaContext = this.#attributesStore.getLambdaContext();
    if (lambdaContext === void 0) {
      return this.powertoolsLogData;
    }
    return { ...this.powertoolsLogData, lambdaContext };
  }
  /**
   * Check if a given log level is valid.
   *
   * @param logLevel - The log level to check
   */
  isValidLogLevel(logLevel) {
    return typeof logLevel === "string" && logLevel in LogLevelThreshold;
  }
  /**
   * Check if a given sample rate value is valid.
   *
   * @param sampleRateValue - The sample rate value to check
   */
  isValidSampleRate(sampleRateValue) {
    return typeof sampleRateValue === "number" && 0 <= sampleRateValue && sampleRateValue <= 1;
  }
  /**
   * Print a given log with given log level.
   *
   * @param logLevel - The log level
   * @param log - The log item to print
   */
  printLog(logLevel, log) {
    log.prepareForPrint();
    const consoleMethod = logLevel === LogLevelThreshold.CRITICAL ? "error" : this.getLogLevelNameFromNumber(logLevel).toLowerCase();
    this.console[consoleMethod](JSON.stringify(log.getAttributes(), this.getJsonReplacer(), this.logIndentation));
  }
  /**
   * Print or buffer a given log with given log level.
   *
   * @param logLevel - The log level threshold
   * @param input - The log message
   * @param extraInput - The extra input to log
   */
  processLogItem(logLevel, input, extraInput) {
    if (this.#bufferConfig.enabled && this.#bufferConfig.flushOnErrorLog && logLevel >= LogLevelThreshold.ERROR && logLevel < LogLevelThreshold.SILENT) {
      this.flushBuffer();
    }
    const traceId = getXRayTraceIdFromEnv();
    if (traceId !== void 0 && this.shouldBufferLog(traceId, logLevel)) {
      try {
        this.bufferLogItem(traceId, this.createAndPopulateLogItem(logLevel, input, extraInput), logLevel);
      } catch (error) {
        this.printLog(LogLevelThreshold.WARN, this.createAndPopulateLogItem(LogLevelThreshold.WARN, `Unable to buffer log: ${error.message}`, [error]));
        this.printLog(logLevel, this.createAndPopulateLogItem(logLevel, input, extraInput));
      }
      return;
    }
    if (logLevel >= this.#invocationStore.getLogLevel()) {
      if (this.#isInitialized) {
        this.printLog(logLevel, this.createAndPopulateLogItem(logLevel, input, extraInput));
      } else {
        this.#initBuffer.push([logLevel, [logLevel, input, extraInput]]);
      }
    }
  }
  /**
   * Initialize the console property as an instance of the internal version of Console() class (PR #748)
   * or as the global node console if the `POWERTOOLS_DEV' env variable is set and has truthy value.
   */
  setConsole() {
    if (isDevMode()) {
      this.console = console;
    } else {
      this.console = new import_node_console.Console({
        stdout: process.stdout,
        stderr: process.stderr
      });
    }
    this.console.trace = (message, ...optionalParams) => {
      this.console.log(message, ...optionalParams);
    };
  }
  /**
   * Set the initial Logger log level based on the following order:
   * 1. If a log level is set using AWS Lambda Advanced Logging Controls, it sets it.
   * 2. If a log level is passed to the constructor, it sets it.
   * 3. If a log level is set via custom config service, it sets it.
   * 4. If a log level is set via env variables, it sets it.
   *
   * If none of the above is true, the default log level applies (`INFO`).
   *
   * @param logLevel - Log level passed to the constructor
   */
  setInitialLogLevel(logLevel) {
    const constructorLogLevel = logLevel?.toUpperCase();
    if (this.awsLogLevelShortCircuit(constructorLogLevel)) {
      this.#initialLogLevel = this.#invocationStore.getBaseLogLevel();
      return;
    }
    if (this.isValidLogLevel(constructorLogLevel)) {
      this.#invocationStore.setBaseLogLevel(LogLevelThreshold[constructorLogLevel]);
      this.#initialLogLevel = this.#invocationStore.getBaseLogLevel();
      return;
    }
    const customConfigValue = this.getCustomConfigService()?.getLogLevel()?.toUpperCase();
    if (this.isValidLogLevel(customConfigValue)) {
      this.#invocationStore.setBaseLogLevel(LogLevelThreshold[customConfigValue]);
      this.#initialLogLevel = this.#invocationStore.getBaseLogLevel();
      return;
    }
    const logLevelVariable = getStringFromEnv({
      key: "POWERTOOLS_LOG_LEVEL",
      defaultValue: ""
    });
    const logLevelVariableAlias = getStringFromEnv({
      key: "LOG_LEVEL",
      defaultValue: ""
    });
    const logLevelValue = logLevelVariable || logLevelVariableAlias;
    if (this.isValidLogLevel(logLevelValue)) {
      this.#invocationStore.setBaseLogLevel(LogLevelThreshold[logLevelValue]);
      this.#initialLogLevel = this.#invocationStore.getBaseLogLevel();
    }
  }
  /**
   * Set the sample rate value with the following priority:
   * 1. Constructor value
   * 2. Custom config service value
   * 3. Environment variable value
   * 4. Default value (zero)
   *
   * @param sampleRateValue - The sample rate value
   */
  setInitialSampleRate(sampleRateValue) {
    const constructorValue = sampleRateValue;
    const customConfigValue = this.getCustomConfigService()?.getSampleRateValue();
    const sampleRateEnvVariable = getNumberFromEnv({
      key: "POWERTOOLS_LOGGER_SAMPLE_RATE",
      defaultValue: 0
    });
    for (const value of [
      constructorValue,
      customConfigValue,
      sampleRateEnvVariable
    ]) {
      if (this.isValidSampleRate(value)) {
        this.#debugLogSampling.sampleRateValue = value;
        this.powertoolsLogData.sampleRateValue = value;
        if (this.#shouldEnableDebugSampling() && this.#invocationStore.getBaseLogLevel() > LogLevelThreshold.TRACE) {
          this.setLogLevel("DEBUG");
          this.debug("Setting log level to DEBUG due to sampling rate");
        }
        break;
      }
    }
  }
  /**
   * If the log event feature is enabled via env variable, it sets a property that tracks whether
   * the event passed to the Lambda function handler should be logged or not.
   */
  setLogEvent() {
    this.logEvent = getBooleanFromEnv({
      key: "POWERTOOLS_LOGGER_LOG_EVENT",
      defaultValue: false
    });
  }
  /**
   * Set the log formatter instance, in charge of giving a custom format
   * to the structured logs, and optionally the ordering for keys within logs.
   *
   * @param logFormatter - The log formatter
   * @param logRecordOrder - Optional list of keys to specify order in logs
   */
  setLogFormatter(logFormatter, logRecordOrder) {
    this.logFormatter = logFormatter ?? new PowertoolsLogFormatter({
      logRecordOrder
    });
  }
  /**
   * If the `POWERTOOLS_DEV` env variable is set,
   * add JSON indentation for pretty printing logs.
   */
  setLogIndentation() {
    if (isDevMode()) {
      this.logIndentation = LogJsonIndent.PRETTY;
    }
  }
  /**
   * Configure the Logger instance settings that will affect the Logger's behaviour
   * and the content of all logs.
   *
   * @param options - Options to configure the Logger instance
   */
  setOptions(options) {
    const {
      logLevel,
      serviceName,
      sampleRateValue,
      logFormatter,
      persistentKeys,
      persistentLogAttributes,
      // deprecated in favor of persistentKeys
      environment,
      jsonReplacerFn,
      logRecordOrder,
      logBufferOptions,
      correlationIdSearchFn
    } = options;
    if (persistentLogAttributes && Object.keys(persistentLogAttributes).length > 0 && persistentKeys && Object.keys(persistentKeys).length > 0) {
      this.warn("Both persistentLogAttributes and persistentKeys options were provided. Using persistentKeys as persistentLogAttributes is deprecated and will be removed in future releases");
    }
    this.setPowertoolsLogData(serviceName, environment, persistentKeys || persistentLogAttributes);
    const lambdaLogLevel = getStringFromEnv({
      key: "AWS_LAMBDA_LOG_LEVEL",
      defaultValue: ""
    });
    const AlcLogLevel = lambdaLogLevel === "FATAL" ? "CRITICAL" : lambdaLogLevel;
    if (this.isValidLogLevel(AlcLogLevel)) {
      this.#alcLogLevel = AlcLogLevel;
    }
    this.setLogEvent();
    this.setInitialLogLevel(logLevel);
    this.setInitialSampleRate(sampleRateValue);
    this.setLogFormatter(logFormatter, logRecordOrder);
    this.setConsole();
    this.setLogIndentation();
    this.#jsonReplacerFn = jsonReplacerFn;
    this.#setLogBuffering(logBufferOptions);
    this.#correlationIdSearchFn = correlationIdSearchFn;
    return this;
  }
  /**
   * Add important data to the Logger instance that will affect the content of all logs.
   *
   * @param serviceName - The service name
   * @param environment - The environment
   * @param persistentKeys - The persistent log attributes
   */
  setPowertoolsLogData(serviceName, environment, persistentKeys) {
    this.addToPowertoolsLogData({
      awsRegion: getStringFromEnv({
        key: "AWS_REGION",
        defaultValue: ""
      }),
      environment: environment || this.getCustomConfigService()?.getCurrentEnvironment() || getStringFromEnv({
        key: "ENVIRONMENT",
        defaultValue: ""
      }),
      serviceName: serviceName || this.getCustomConfigService()?.getServiceName() || getStringFromEnv({
        key: "POWERTOOLS_SERVICE_NAME",
        defaultValue: ""
      }) || this.defaultServiceName
    });
    persistentKeys && this.appendPersistentKeys(persistentKeys);
  }
  /**
   * Configure the buffer settings for the Logger instance.
   *
   * @param options - Options to configure the Logger instance
   */
  #setLogBuffering(options) {
    if (options === void 0) {
      return;
    }
    this.#bufferConfig.enabled = options?.enabled !== false;
    if (this.#bufferConfig.enabled === false)
      return;
    if (options?.maxBytes !== void 0) {
      this.#bufferConfig.maxBytes = options.maxBytes;
    }
    this.#invocationStore.configureBuffer(this.#bufferConfig.maxBytes);
    if (options?.flushOnErrorLog === false) {
      this.#bufferConfig.flushOnErrorLog = false;
    }
    const bufferAtLogLevel = options?.bufferAtVerbosity?.toUpperCase();
    if (this.isValidLogLevel(bufferAtLogLevel)) {
      this.#bufferConfig.bufferAtVerbosity = LogLevelThreshold[bufferAtLogLevel];
    }
    if (this.#alcLogLevel !== void 0 && LogLevelThreshold[this.#alcLogLevel] > this.#bufferConfig.bufferAtVerbosity) {
      this.#warnOnce("Advanced Loggging Controls (ALC) Log Level is less verbose than Log Buffering Log Level. Buffered logs will be filtered by ALC");
    }
  }
  /**
   * Add a log to the buffer.
   *
   * @param xrayTraceId - `_X_AMZN_TRACE_ID` of the request
   * @param log - Log to be buffered
   * @param logLevel - The level of log to be buffered
   */
  bufferLogItem(xrayTraceId, log, logLevel) {
    log.prepareForPrint();
    this.#invocationStore.add(xrayTraceId, JSON.stringify(log.getAttributes(), this.getJsonReplacer(), this.logIndentation), logLevel);
  }
  /**
   * Flush all logs in the request buffer.
   *
   * This is called automatically when you use the {@link injectLambdaContext | `@logger.injectLambdaContext()`} decorator and
   * your function throws an error.
   */
  flushBuffer() {
    if (this.#bufferConfig.enabled === false) {
      return;
    }
    const traceId = getXRayTraceIdFromEnv();
    if (traceId === void 0) {
      return;
    }
    const buffer = this.#invocationStore.get(traceId);
    if (buffer === void 0) {
      return;
    }
    for (const item of buffer) {
      const consoleMethod = this.getLogLevelNameFromNumber(item.logLevel).toLowerCase();
      this.console[consoleMethod](item.value);
    }
    if (buffer.hasEvictedLog) {
      this.printLog(LogLevelThreshold.WARN, this.createAndPopulateLogItem(LogLevelThreshold.WARN, "Some logs are not displayed because they were evicted from the buffer. Increase buffer size to store more logs in the buffer", []));
    }
    if (this.#alcLogLevel !== void 0 && LogLevelThreshold[this.#alcLogLevel] > this.#bufferConfig.bufferAtVerbosity) {
      this.#warnOnce("Advanced Loggging Controls (ALC) Log Level is less verbose than Log Buffering Log Level. Some logs might be missing.");
    }
    this.#invocationStore.delete(traceId);
  }
  /**
   * Empties the buffer for the current request
   */
  clearBuffer() {
    if (this.#bufferConfig.enabled === false) {
      return;
    }
    const traceId = getXRayTraceIdFromEnv();
    if (traceId === void 0) {
      return;
    }
    this.#invocationStore.delete(traceId);
  }
  /**
   * Test if the log meets the criteria to be buffered.
   *
   * @param traceId - `_X_AMZN_TRACE_ID` of the request
   * @param logLevel - The level of the log being considered
   */
  shouldBufferLog(traceId, logLevel) {
    return this.#bufferConfig.enabled && traceId !== void 0 && logLevel <= this.#bufferConfig.bufferAtVerbosity;
  }
  /**
   * Set the correlation ID for the log item.
   *
   * This method can be used to set the correlation ID for the log item or to search for the correlation ID in the event.
   *
   * @example
   * ```typescript
   * import { Logger } from '@aws-lambda-powertools/logger';
   *
   * const logger = new Logger();
   * logger.setCorrelationId('my-correlation-id'); // sets the correlation ID directly with the first argument as value
   * ```
   *
   * @example
   * ```typescript
   * import { Logger } from '@aws-lambda-powertools/logger';
   * import { search } from '@aws-lambda-powertools/logger/correlationId';
   *
   * const logger = new Logger({ correlationIdSearchFn: search });
   * logger.setCorrelationId(event, 'requestContext.requestId'); // sets the correlation ID from the event using JMSPath expression
   * ```
   *
   * @param value - The value to set as the correlation ID or the event to search for the correlation ID
   * @param correlationIdPath - Optional JMESPath expression to extract the correlation ID for the payload
   */
  setCorrelationId(value, correlationIdPath) {
    if (typeof correlationIdPath === "string") {
      if (!this.#correlationIdSearchFn) {
        this.#warnOnce("correlationIdPath is set but no search function was provided. The correlation ID will not be added to the log attributes.");
        return;
      }
      const correlationId = this.#correlationIdSearchFn(correlationIdPath, value);
      if (correlationId)
        this.appendKeys({ correlation_id: correlationId });
      return;
    }
    this.appendKeys({ correlation_id: value });
  }
  /**
   * Get the correlation ID from the log attributes.
   */
  getCorrelationId() {
    return this.#attributesStore.getTemporaryAttributes().correlation_id;
  }
};

// node_modules/@aws-lambda-powertools/tracer/lib/esm/Tracer.js
var import_aws_xray_sdk_core2 = __toESM(require_lib(), 1);

// node_modules/@aws-lambda-powertools/tracer/lib/esm/provider/ProviderService.js
var import_aws_xray_sdk_core = __toESM(require_lib(), 1);
var import_node_diagnostics_channel = require("node:diagnostics_channel");
var import_node_http = __toESM(require("node:http"), 1);
var import_node_https = __toESM(require("node:https"), 1);

// node_modules/@aws-lambda-powertools/tracer/lib/esm/provider/utilities.js
var import_node_url = require("node:url");
var decoder = new TextDecoder();
var findHeaderAndDecode = (headers, key) => {
  if (!Array.isArray(headers)) {
    const value = headers[key];
    return (Array.isArray(value) ? value[0] : value) ?? null;
  }
  let foundIndex = -1;
  for (let i = 0; i < headers.length; i += 2) {
    const header = decoder.decode(headers[i]);
    if (header.toLowerCase() === key) {
      foundIndex = i;
      break;
    }
  }
  if (foundIndex === -1) {
    return null;
  }
  return decoder.decode(headers[foundIndex + 1]);
};
var isHttpSubsegment = (subsegment) => {
  return subsegment !== void 0 && "http" in subsegment && "parent" in subsegment && "namespace" in subsegment && subsegment.namespace === "remote";
};
var getRequestURL = (request) => {
  if (typeof request.origin === "string") {
    return new import_node_url.URL(`${request.origin}${request.path || ""}`);
  }
  if (request.origin instanceof import_node_url.URL) {
    request.origin.pathname = request.path || "";
    return request.origin;
  }
  return void 0;
};

// node_modules/@aws-lambda-powertools/tracer/lib/esm/provider/ProviderService.js
var { captureAWS, captureAWSClient, captureAWSv3Client, captureAsyncFunc, captureFunc, captureHTTPsGlobal, getNamespace, getSegment, setSegment, Segment: XraySegment, setContextMissingStrategy, setDaemonAddress, setLogger } = import_aws_xray_sdk_core.default;
var ProviderService = class {
  /**
   * Key used to store the active segment in the Lambda Invoke Store when
   * multiple invocations may be multiplexed into the same execution
   * environment (Lambda Managed Instances with
   * `perExecutionEnvironmentMaxConcurrency` > 1).
   *
   * In Lambda mode the X-Ray SDK keeps the active segment in a single
   * process-wide CLS context shared by all concurrent invocations, so
   * writing to it from one invocation clobbers the others. The Invoke Store
   * is scoped to the invocation by the runtime, so it provides the isolation
   * the SDK context can't.
   */
  #segmentKey = /* @__PURE__ */ Symbol("powertools.tracer.segment");
  /**
   * Open subsegments for in-flight `fetch` requests, keyed by the `undici`
   * request that opened them.
   *
   * We key by the request because every `undici` channel message carries it,
   * so it reliably identifies the request from start to finish. We can't rely
   * on the active segment instead: `request:headers` and `request:error` may
   * run on the connection's async chain, which is reused across requests. Once
   * invocations have their own context, that chain can resolve a different
   * segment, which would leave the subsegment open and drop the invocation's
   * trace data.
   */
  #fetchSubsegments = /* @__PURE__ */ new WeakMap();
  #getInvokeStore() {
    const store = globalThis.awslambda?.InvokeStore;
    if (store === void 0) {
      throw new Error("InvokeStore is not available");
    }
    return store;
  }
  /**
   * @deprecated Use {@link captureAWSv3Client} instead.
   */
  /* v8 ignore next -- @preserve */
  captureAWS(awssdk) {
    return captureAWS(awssdk);
  }
  /**
   * @deprecated Use {@link captureAWSv3Client} instead.
   */
  /* v8 ignore next -- @preserve */
  captureAWSClient(service) {
    return captureAWSClient(service);
  }
  captureAWSv3Client(service) {
    addUserAgentMiddleware(service, "tracer");
    return captureAWSv3Client(service);
  }
  captureAsyncFunc(name, fcn, _parent) {
    return captureAsyncFunc(name, fcn);
  }
  captureFunc(name, fcn, _parent) {
    return captureFunc(name, fcn);
  }
  captureHTTPsGlobal() {
    captureHTTPsGlobal(import_node_http.default);
    captureHTTPsGlobal(import_node_https.default);
  }
  getNamespace() {
    return getNamespace();
  }
  getSegment() {
    if (shouldUseInvokeStore()) {
      const segment = this.#getInvokeStore().get(this.#segmentKey);
      if (segment !== void 0) {
        return segment;
      }
    }
    return getSegment();
  }
  /**
   * Stop tracking the subsegment of a `fetch` request and return it.
   *
   * Returns `undefined` when the request has no open subsegment, which is what
   * keeps an earlier event from closing it twice.
   *
   * @param request The `undici` request the subsegment was opened for
   */
  #takeFetchSubsegment(request) {
    const subsegment = this.#fetchSubsegments.get(request);
    this.#fetchSubsegments.delete(request);
    return subsegment;
  }
  /**
   * Instrument `fetch` requests with AWS X-Ray
   *
   * The instrumentation is done by subscribing to the `undici` events. When a request is created,
   * a new subsegment is created with the hostname of the request, and tracked against that request.
   *
   * Then, when the headers are received, the subsegment is updated with the request and response details.
   *
   * Finally, when the request is completed, the subsegment is closed.
   *
   * @see {@link https://nodejs.org/api/diagnostics_channel.html#diagnostics_channel_channel_publish | Diagnostics Channel - Node.js Documentation}
   */
  instrumentFetch() {
    const onRequestStart = (message) => {
      const { request } = message;
      const method = request.method;
      if (method === "CONNECT")
        return;
      const parentSubsegment = this.getSegment();
      const requestURL = getRequestURL(request);
      if (parentSubsegment && requestURL) {
        const subsegment = parentSubsegment.addNewSubsegment(requestURL.hostname);
        subsegment.addAttribute("namespace", "remote");
        request.addHeader("X-Amzn-Trace-Id", `Root=${getXRayTraceIdFromEnv()};Parent=${subsegment.id};Sampled=${subsegment.notTraced ? "0" : "1"}`);
        subsegment.http = {
          request: {
            url: `${requestURL.protocol}//${requestURL.hostname}${requestURL.pathname}`,
            method
          }
        };
        this.#fetchSubsegments.set(request, subsegment);
      }
    };
    const onResponse = (message) => {
      const { request, response } = message;
      const subsegment = this.#takeFetchSubsegment(request);
      if (isHttpSubsegment(subsegment)) {
        const status = response.statusCode;
        const contentLenght = findHeaderAndDecode(response.headers, "content-length");
        subsegment.http = {
          ...subsegment.http,
          response: {
            status,
            ...contentLenght && {
              content_length: Number.parseInt(contentLenght, 10)
            }
          }
        };
        if (status === 429) {
          subsegment.addThrottleFlag();
        }
        if (status >= 400 && status < 500) {
          subsegment.addErrorFlag();
        } else if (status >= 500 && status < 600) {
          subsegment.addFaultFlag();
        }
        subsegment.close();
      }
    };
    const onError = (message) => {
      const { request, error } = message;
      const subsegment = this.#takeFetchSubsegment(request);
      if (isHttpSubsegment(subsegment)) {
        subsegment.addErrorFlag();
        error instanceof Error && subsegment.addError(error, true);
        subsegment.close();
      }
    };
    (0, import_node_diagnostics_channel.subscribe)("undici:request:create", onRequestStart);
    (0, import_node_diagnostics_channel.subscribe)("undici:request:headers", onResponse);
    (0, import_node_diagnostics_channel.subscribe)("undici:request:error", onError);
  }
  putAnnotation(key, value) {
    const segment = this.getSegment();
    if (segment === void 0) {
      console.warn("No active segment or subsegment found, skipping annotation");
      return;
    }
    if (segment instanceof XraySegment) {
      console.warn("You cannot annotate the main segment in a Lambda execution environment");
      return;
    }
    segment.addAnnotation(key, value);
  }
  putMetadata(key, value, namespace) {
    const segment = this.getSegment();
    if (segment === void 0) {
      console.warn("No active segment or subsegment found, skipping metadata addition");
      return;
    }
    if (segment instanceof XraySegment) {
      console.warn("You cannot add metadata to the main segment in a Lambda execution environment");
      return;
    }
    segment.addMetadata(key, value, namespace);
  }
  setContextMissingStrategy(strategy) {
    setContextMissingStrategy(strategy);
  }
  setDaemonAddress(address) {
    setDaemonAddress(address);
  }
  setLogger(logObj) {
    setLogger(logObj);
  }
  setSegment(segment) {
    if (shouldUseInvokeStore()) {
      this.#getInvokeStore().set(this.#segmentKey, segment);
      return;
    }
    setSegment(segment);
  }
};

// node_modules/@aws-lambda-powertools/tracer/lib/esm/Tracer.js
if (process.env.AWS_XRAY_CONTEXT_MISSING === "" || process.env.AWS_XRAY_CONTEXT_MISSING === void 0) {
  process.env.AWS_XRAY_CONTEXT_MISSING = "IGNORE_ERROR";
}
var { Subsegment: XraySubsegment } = import_aws_xray_sdk_core2.default;
var Tracer = class extends Utility {
  /**
   * The provider service interface used by the Tracer.
   * This interface defines the methods and properties that a provider service must implement.
   */
  provider;
  /**
   * Flag indicating whether to capture errors.
   * This is used to determine if errors should be added to the trace as metadata.
   *
   * @default true
   */
  captureError = true;
  /**
   * Flag indicating whether to capture HTTP(s) requests.
   * @default true
   */
  captureHTTPsRequests = true;
  /**
   * Flag indicating whether to capture response data.
   * @default true
   */
  captureResponse = true;
  /**
   * The custom configuration service used by the Tracer.
   */
  customConfigService;
  /**
   * Cache environment variables once at init time.
   */
  #envConfig = {
    awsExecutionEnv: "",
    samLocal: "",
    captureError: "",
    captureHTTPsRequests: "",
    captureResponse: "",
    tracingEnabled: "",
    serviceName: ""
  };
  /**
   * The name of the service, is always initialized in the constructor in setOptions().
   */
  serviceName;
  /**
   * Flag indicating whether tracing is enabled.
   * @default true
   */
  tracingEnabled = true;
  constructor(options = {}) {
    super();
    this.#setEnvConfig();
    this.setOptions(options);
    this.provider = new ProviderService();
    if (this.isTracingEnabled() && this.captureHTTPsRequests) {
      this.provider.captureHTTPsGlobal();
      this.provider.instrumentFetch();
    }
    if (!this.isTracingEnabled()) {
      this.provider.setContextMissingStrategy(() => ({}));
    }
  }
  /**
   * Add an error to the current segment or subsegment as metadata.
   *
   * @see https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html#xray-concepts-errors
   *
   * @param error - Error to serialize as metadata
   * @param [remote] - Whether the error was thrown by a remote service. Defaults to `false`
   */
  addErrorAsMetadata(error, remote) {
    if (!this.isTracingEnabled()) {
      return;
    }
    const subsegment = this.getSegment();
    if (subsegment === void 0) {
      return;
    }
    if (!this.captureError) {
      subsegment.addErrorFlag();
      return;
    }
    subsegment.addError(error, remote || false);
  }
  /**
   * Add response data to the current segment or subsegment as metadata.
   *
   * @see https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html#xray-concepts-annotations
   *
   * @param data - Data to serialize as metadata
   * @param methodName - Name of the method that is being traced
   */
  addResponseAsMetadata(data, methodName) {
    if (data === void 0 || !this.captureResponse || !this.isTracingEnabled()) {
      return;
    }
    this.putMetadata(`${methodName} response`, data);
  }
  /**
   * Add service name to the current segment or subsegment as annotation.
   */
  addServiceNameAnnotation() {
    if (!this.isTracingEnabled()) {
      return;
    }
    this.putAnnotation("Service", this.serviceName);
  }
  /**
   * Add ColdStart annotation to the current segment or subsegment.
   *
   * If Tracer has been initialized outside the Lambda handler then the same instance
   * of Tracer will be reused throughout the lifecycle of that same Lambda execution environment
   * and this method will annotate `ColdStart: false` after the first invocation.
   *
   * @see https://docs.aws.amazon.com/lambda/latest/dg/runtimes-context.html
   */
  annotateColdStart() {
    if (this.isTracingEnabled()) {
      this.putAnnotation("ColdStart", this.getColdStart());
    }
  }
  /**
   * @deprecated Use {@link captureAWSv3Client | `captureAWSv3Client()`} instead.
   *
   * Patch all AWS SDK v2 clients and create traces when your application makes calls to AWS services.
   *
   * If you want to patch a specific client use {@link captureAWSClient} and if you are using AWS SDK v3 use {@link captureAWSv3Client} instead.
   *
   * @see https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-awssdkclients.html
   *
   * @example
   * ```typescript
   * import { Tracer } from '@aws-lambda-powertools/tracer';
   *
   * const tracer = new Tracer({ serviceName: 'serverlessAirline' });
   * const AWS = tracer.captureAWS(require('aws-sdk'));
   *
   * export const handler = async (_event: unknown, _context: unknown) => {
   *   ...
   * }
   * ```
   *
   * @param aws - AWS SDK v2 import
   */
  /* v8 ignore next -- @preserve */
  captureAWS(aws) {
    if (!this.isTracingEnabled())
      return aws;
    return this.provider.captureAWS(aws);
  }
  /**
   * @deprecated Use {@link captureAWSv3Client | `captureAWSv3Client()`} instead.
   *
   * Patch a specific AWS SDK v2 client and create traces when your application makes calls to that AWS service.
   *
   * If you want to patch all clients use {@link captureAWS} and if you are using AWS SDK v3 use {@link captureAWSv3Client} instead.
   *
   * @see https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-awssdkclients.html
   *
   * @example
   * ```typescript
   * import { S3 } from 'aws-sdk';
   * import { Tracer } from '@aws-lambda-powertools/tracer';
   *
   * const tracer = new Tracer({ serviceName: 'serverlessAirline' });
   * const s3 = tracer.captureAWSClient(new S3({ apiVersion: '2006-03-01' }));
   *
   * export const handler = async (_event: unknown, _context: unknown) => {
   *   ...
   * }
   * ```
   *
   * @param service - AWS SDK v2 client
   */
  /* v8 ignore next -- @preserve */
  captureAWSClient(service) {
    if (!this.isTracingEnabled())
      return service;
    try {
      return this.provider.captureAWSClient(service);
    } catch (error) {
      try {
        this.provider.captureAWSClient(service.service);
        return service;
      } catch {
        throw error;
      }
    }
  }
  /**
   * Patch an AWS SDK v3 client and create traces when your application makes calls to that AWS service.
   *
   * If you are using AWS SDK v2 use {@link captureAWSClient} instead.
   *
   * @see https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-awssdkclients.html
   *
   * @example
   * ```typescript
   * import { S3Client } from '@aws-sdk/client-s3';
   * import { Tracer } from '@aws-lambda-powertools/tracer';
   *
   * const tracer = new Tracer({ serviceName: 'serverlessAirline' });
   * const client = new S3Client({});
   * tracer.captureAWSv3Client(client);
   *
   * export const handler = async (_event: unknown, _context: unknown) => {
   *   ...
   * }
   * ```
   *
   * @param service - AWS SDK v3 client
   */
  captureAWSv3Client(service) {
    if (!this.isTracingEnabled())
      return service;
    return this.provider.captureAWSv3Client(service);
  }
  /**
   * A decorator automating capture of metadata and annotations on segments or subsegments for a Lambda Handler.
   *
   * Using this decorator on your handler function will automatically:
   * - handle the subsegment lifecycle
   * - add the `ColdStart` annotation
   * - add the function response as metadata
   * - add the function error as metadata (if any)
   *
   * Note: Currently TypeScript only supports decorators on classes and methods. If you are using the
   * function syntax, you should use the middleware instead.
   *
   * @example
   * ```typescript
   * import { Tracer } from '@aws-lambda-powertools/tracer';
   * import type { LambdaInterface } from '@aws-lambda-powertools/commons/types';
   *
   * const tracer = new Tracer({ serviceName: 'serverlessAirline' });
   *
   * class Lambda implements LambdaInterface {
   *   ⁣@tracer.captureLambdaHandler()
   *   public handler(_event: unknown, _context: unknown) {
   *     // ...
   *   }
   * }
   *
   * const handlerClass = new Lambda();
   * export const handler = handlerClass.handler.bind(handlerClass);
   * ```
   *
   * @param options - (_optional_) Options for the decorator
   */
  captureLambdaHandler(options) {
    return (_target, _propertyKey, descriptor) => {
      const originalMethod = descriptor.value;
      const tracerRef = this;
      descriptor.value = function(...args) {
        if (!tracerRef.isTracingEnabled()) {
          return originalMethod.apply(this, args);
        }
        return tracerRef.provider.captureAsyncFunc(`## ${process.env._HANDLER}`, async (subsegment) => {
          tracerRef.annotateColdStart();
          tracerRef.addServiceNameAnnotation();
          let result;
          try {
            result = await originalMethod.apply(this, args);
            if (options?.captureResponse ?? true) {
              tracerRef.addResponseAsMetadata(result, process.env._HANDLER);
            }
          } catch (error) {
            tracerRef.addErrorAsMetadata(error);
            throw error;
          } finally {
            try {
              subsegment?.close();
            } catch (error) {
              console.warn("Failed to close or serialize segment %s. We are catching the error but data might be lost.", subsegment?.name, error);
            }
          }
          return result;
        });
      };
      return descriptor;
    };
  }
  /**
   * A decorator automating capture of metadata and annotations on segments or subsegments for an arbitrary function.
   *
   * Using this decorator on your function will automatically:
   * - handle the subsegment lifecycle
   * - add the function response as metadata
   * - add the function error as metadata (if any)
   *
   * Note: Currently TypeScript only supports decorators on classes and methods. If you are using the
   * function syntax, you should use the middleware instead.
   *
   * @example
   * ```typescript
   * import { Tracer } from '@aws-lambda-powertools/tracer';
   * import { LambdaInterface } from '@aws-lambda-powertools/commons';
   *
   * const tracer = new Tracer({ serviceName: 'serverlessAirline' });
   *
   * class Lambda implements LambdaInterface {
   *   ⁣@tracer.captureMethod()
   *   public myMethod(param: string) {
   *     // ...
   *   }
   *
   *   public handler(_event: unknown, _context: unknown) {
   *     this.myMethod('foo');
   *   }
   * }
   *
   * const handlerClass = new Lambda();
   * export const handler = handlerClass.handler.bind(handlerClass);;
   * ```
   *
   * @param options - (_optional_) Options for the decorator
   */
  captureMethod(options) {
    return (_target, propertyKey, descriptor) => {
      const originalMethod = descriptor.value;
      const tracerRef = this;
      descriptor.value = function(...args) {
        if (!tracerRef.isTracingEnabled()) {
          return originalMethod.apply(this, [...args]);
        }
        const methodName = String(propertyKey);
        const subsegmentName = options?.subSegmentName ? options.subSegmentName : `### ${methodName}`;
        return tracerRef.provider.captureAsyncFunc(subsegmentName, async (subsegment) => {
          let result;
          try {
            result = await originalMethod.apply(this, [...args]);
            if (options?.captureResponse ?? true) {
              tracerRef.addResponseAsMetadata(result, methodName);
            }
          } catch (error) {
            tracerRef.addErrorAsMetadata(error);
            throw error;
          } finally {
            try {
              subsegment?.close();
            } catch (error) {
              console.warn("Failed to close or serialize segment %s. We are catching the error but data might be lost.", subsegment?.name, error);
            }
          }
          return result;
        });
      };
      return descriptor;
    };
  }
  /**
   * Get the current root AWS X-Ray trace id.
   *
   * Utility method that returns the current AWS X-Ray Root trace id. Useful as correlation id for downstream processes.
   *
   * @see https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html#xray-concepts-traces
   *
   * @example
   * ```typescript
   * import { Tracer } from '@aws-lambda-powertools/tracer';
   *
   * const tracer = new Tracer({ serviceName: 'serverlessAirline' });
   *
   * export const handler = async () => {
   *   try {
   *     ...
   *   } catch (err) {
   *     const rootTraceId = tracer.getRootXrayTraceId();
   *
   *     // Example of returning an error response
   *     return {
   *       statusCode: 500,
   *       // Include the rootTraceId in the response so we can show a "contact support" button that
   *       // takes the customer to a customer service form with the trace as additional context.
   *       body: `Internal Error - Please contact support and quote the following id: ${rootTraceId}`,
   *       headers: { '_X_AMZN_TRACE_ID': rootTraceId },
   *     };
   *   }
   * }
   * ```
   */
  getRootXrayTraceId() {
    return getXRayTraceIdFromEnv();
  }
  /**
   * Get the active segment or subsegment (if any) in the current scope.
   *
   * Usually you won't need to call this method unless you are creating custom subsegments or using manual mode.
   *
   * @see https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html#xray-concepts-segments
   * @see https://docs.aws.amazon.com/powertools/typescript/latest/core/tracer/#escape-hatch-mechanism
   *
   * @example
   * ```typescript
   * import { Tracer } from '@aws-lambda-powertools/tracer';
   *
   * const tracer = new Tracer({ serviceName: 'serverlessAirline' });
   *
   * export const handler = async (_event: unknown, _context: unknown) => {
   *   const currentSegment = tracer.getSegment();
   *   ... // Do something with segment
   * }
   * ```
   */
  getSegment() {
    if (!this.isTracingEnabled()) {
      return new XraySubsegment("## Dummy segment");
    }
    const segment = this.provider.getSegment();
    if (segment === void 0) {
      console.warn("Failed to get the current sub/segment from the context, this is likely because you are not using the Tracer in a Lambda function.");
    }
    return segment;
  }
  /**
   * Get the current value of the AWS X-Ray Sampled flag.
   *
   * Utility method that returns the current AWS X-Ray Sampled flag.
   *
   * @see https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html#xray-concepts-traces
   */
  isTraceSampled() {
    if (!this.isTracingEnabled())
      return false;
    return isRequestXRaySampled();
  }
  /**
   * Get the current value of the `tracingEnabled` property.
   *
   * You can use this method during manual instrumentation to determine
   * if tracer is currently enabled.
   */
  isTracingEnabled() {
    return this.tracingEnabled;
  }
  /**
   * Add annotation to existing segment or subsegment.
   *
   * @see https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-segment.html#xray-sdk-nodejs-segment-annotations
   *
   * @example
   * ```typescript
   * import { Tracer } from '@aws-lambda-powertools/tracer';
   *
   * const tracer = new Tracer({ serviceName: 'serverlessAirline' });
   *
   * export const handler = async (_event: unknown, _context: unknown) => {
   *   tracer.putAnnotation('successfulBooking', true);
   * }
   * ```
   *
   * @param key - Annotation key
   * @param value - Value for annotation
   */
  putAnnotation(key, value) {
    if (!this.isTracingEnabled())
      return;
    this.provider.putAnnotation(key, value);
  }
  /**
   * Add metadata to existing segment or subsegment.
   *
   * @see https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-segment.html#xray-sdk-nodejs-segment-metadata
   *
   * @example
   * ```typescript
   * import { Tracer } from '@aws-lambda-powertools/tracer';
   *
   * const tracer = new Tracer({ serviceName: 'serverlessAirline' });
   *
   * export const handler = async (_event: unknown, _context: unknown) => {
   *   const res = someLogic();
   *   tracer.putMetadata('paymentResponse', res);
   * }
   * ```
   *
   * @param key - Metadata key
   * @param value - Value for metadata
   * @param namespace - Namespace that metadata will lie under, if none is passed it will use the serviceName
   */
  putMetadata(key, value, namespace) {
    if (!this.isTracingEnabled())
      return;
    this.provider.putMetadata(key, value, namespace || this.serviceName);
  }
  /**
   * Set the passed subsegment as the current active subsegment.
   *
   * If you are using a middleware or a decorator this is done automatically for you.
   *
   * @see https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-subsegments.html
   *
   * @example
   * ```typescript
   * import { Tracer } from '@aws-lambda-powertools/tracer';
   * import { Subsegment } from 'aws-xray-sdk-core';
   *
   * const tracer = new Tracer({ serviceName: 'serverlessAirline' });
   *
   * export const handler = async (_event: unknown, _context: unknown) => {
   *   const subsegment = new Subsegment('### foo.bar');
   *   tracer.setSegment(subsegment);
   * }
   * ```
   *
   * @param segment - Subsegment to set as the current segment
   */
  setSegment(segment) {
    if (!this.isTracingEnabled())
      return;
    this.provider.setSegment(segment);
  }
  /**
   * Getter for `customConfigService`.
   * Used internally during initialization.
   */
  getCustomConfigService() {
    return this.customConfigService;
  }
  /**
   * Determine if we are running inside an Amplify CLI process.
   * Used internally during initialization.
   */
  isAmplifyCli() {
    return this.#envConfig.awsExecutionEnv === "AWS_Lambda_amplify-mock";
  }
  /**
   * Determine if we are running in a Lambda execution environment.
   * Used internally during initialization.
   */
  isLambdaExecutionEnv() {
    return this.#envConfig.awsExecutionEnv !== "";
  }
  /**
   * Determine if we are running inside a SAM CLI process.
   * Used internally during initialization.
   */
  isLambdaSamCli() {
    return this.#envConfig.samLocal !== "";
  }
  /**
   * Set `captureError` based on configuration passed and environment variables.
   * Used internally during initialization.
   */
  setCaptureError() {
    const customConfigValue = this.getCustomConfigService()?.getTracingCaptureError();
    if (customConfigValue !== void 0 && customConfigValue.toLowerCase() === "false") {
      this.captureError = false;
      return;
    }
    if (this.#envConfig.captureError.toLowerCase() === "false") {
      this.captureError = false;
      return;
    }
  }
  /**
   * Patch all HTTP(s) clients and create traces when your application makes calls outgoing calls.
   *
   * Calls using third-party HTTP request libraries, such as Axios, are supported as long as they use the native http
   * module under the hood. Support for third-party HTTP request libraries is provided on a best effort basis.
   *
   * @see https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-httpclients.html
   *
   * @param enabled - Whether or not to patch all HTTP clients
   */
  setCaptureHTTPsRequests(enabled) {
    if (enabled !== void 0 && !enabled) {
      this.captureHTTPsRequests = false;
      return;
    }
    const customConfigValue = this.getCustomConfigService()?.getCaptureHTTPsRequests();
    if (customConfigValue !== void 0 && customConfigValue.toLowerCase() === "false") {
      this.captureHTTPsRequests = false;
      return;
    }
    if (this.#envConfig.captureHTTPsRequests.toLowerCase() === "false") {
      this.captureHTTPsRequests = false;
    }
  }
  /**
   * Set `captureResponse` based on configuration passed and environment variables.
   * Used internally during initialization.
   */
  setCaptureResponse() {
    const customConfigValue = this.getCustomConfigService()?.getTracingCaptureResponse();
    if (customConfigValue !== void 0 && customConfigValue.toLowerCase() === "false") {
      this.captureResponse = false;
      return;
    }
    if (this.#envConfig.captureResponse.toLowerCase() === "false") {
      this.captureResponse = false;
      return;
    }
  }
  /**
   * Set `customConfigService` based on configuration passed.
   * Used internally during initialization.
   *
   * @param customConfigService - Custom configuration service to use
   */
  setCustomConfigService(customConfigService) {
    this.customConfigService = customConfigService;
  }
  /**
   * Method that reconciles the configuration passed with the environment variables.
   * Used internally during initialization.
   *
   * @param options - Configuration passed to the tracer
   */
  setOptions(options) {
    const { enabled, serviceName, captureHTTPsRequests, customConfigService } = options;
    this.setCustomConfigService(customConfigService);
    this.setTracingEnabled(enabled);
    this.setCaptureResponse();
    this.setCaptureError();
    this.setServiceName(serviceName);
    this.setCaptureHTTPsRequests(captureHTTPsRequests);
    return this;
  }
  /**
   * Set `customConfigService` based on configurations passed and environment variables.
   * Used internally during initialization.
   *
   * @param serviceName - Name of the service to use
   */
  setServiceName(serviceName) {
    if (serviceName !== void 0 && this.isValidServiceName(serviceName)) {
      this.serviceName = serviceName;
      return;
    }
    const customConfigValue = this.getCustomConfigService()?.getServiceName();
    if (customConfigValue !== void 0 && this.isValidServiceName(customConfigValue)) {
      this.serviceName = customConfigValue;
      return;
    }
    if (this.#envConfig.serviceName !== void 0 && this.isValidServiceName(this.#envConfig.serviceName)) {
      this.serviceName = this.#envConfig.serviceName;
      return;
    }
    this.serviceName = this.defaultServiceName;
  }
  /**
   * Set `tracingEnabled` based on configurations passed and environment variables.
   * Used internally during initialization.
   *
   * @param enabled - Whether or not tracing is enabled
   */
  setTracingEnabled(enabled) {
    if (enabled !== void 0 && !enabled) {
      this.tracingEnabled = enabled;
      return;
    }
    const customConfigValue = this.getCustomConfigService()?.getTracingEnabled();
    if (customConfigValue !== void 0 && customConfigValue.toLowerCase() === "false") {
      this.tracingEnabled = false;
      return;
    }
    if (this.#envConfig.tracingEnabled.toLowerCase() === "false") {
      this.tracingEnabled = false;
      return;
    }
    if (this.isAmplifyCli() || this.isLambdaSamCli() || !this.isLambdaExecutionEnv()) {
      this.tracingEnabled = false;
    }
  }
  /**
   * Set environment variables for the tracer.
   * This method is called during initialization to ensure environment variables are available.
   */
  #setEnvConfig() {
    this.#envConfig.awsExecutionEnv = getStringFromEnv({
      key: "AWS_EXECUTION_ENV",
      defaultValue: ""
    });
    this.#envConfig.samLocal = getStringFromEnv({
      key: "AWS_SAM_LOCAL",
      defaultValue: ""
    });
    this.#envConfig.captureError = getStringFromEnv({
      key: "POWERTOOLS_TRACER_CAPTURE_ERROR",
      defaultValue: ""
    });
    this.#envConfig.captureHTTPsRequests = getStringFromEnv({
      key: "POWERTOOLS_TRACER_CAPTURE_HTTPS_REQUESTS",
      defaultValue: ""
    });
    this.#envConfig.captureResponse = getStringFromEnv({
      key: "POWERTOOLS_TRACER_CAPTURE_RESPONSE",
      defaultValue: ""
    });
    this.#envConfig.tracingEnabled = getStringFromEnv({
      key: "POWERTOOLS_TRACE_ENABLED",
      defaultValue: ""
    });
    this.#envConfig.serviceName = getServiceName();
  }
};

// src/notifications-stack/powertools.ts
var logger = new Logger({ serviceName: "x-notifier" });
var tracer = new Tracer({ serviceName: "x-notifier" });

// src/notifications-stack/posted-state.ts
var dynamoDbClient = tracer.captureAWSv3Client(new import_client_dynamodb.DynamoDBClient({}));
async function getPostedState(station) {
  const result = await dynamoDbClient.send(
    new import_client_dynamodb.GetItemCommand({
      ConsistentRead: true,
      Key: { station: { S: station } },
      TableName: process.env.STATE_TABLE
    })
  );
  const item = result.Item;
  if (!item?.state?.S || !item.postedAt?.N) {
    return null;
  }
  return {
    state: item.state.S,
    postedAt: Number.parseInt(item.postedAt.N, 10)
  };
}
async function replacePostedState(station, expected, next) {
  try {
    await dynamoDbClient.send(
      new import_client_dynamodb.PutItemCommand({
        ...expected ? {
          ConditionExpression: "#state = :state AND postedAt = :postedAt",
          ExpressionAttributeNames: { "#state": "state" },
          ExpressionAttributeValues: {
            ":state": { S: expected.state },
            ":postedAt": { N: expected.postedAt.toString() }
          }
        } : { ConditionExpression: "attribute_not_exists(station)" },
        Item: {
          station: { S: station },
          state: { S: next.state },
          postedAt: { N: next.postedAt.toString() }
        },
        TableName: process.env.STATE_TABLE
      })
    );
    return true;
  } catch (error) {
    if (error instanceof import_client_dynamodb.ConditionalCheckFailedException) {
      return false;
    }
    throw error;
  }
}

// src/notifications-stack/x-client.ts
var import_client_secrets_manager = require("@aws-sdk/client-secrets-manager");
var import_twitter_api_v2 = __toESM(require_cjs());
var secretsClient = tracer.captureAWSv3Client(new import_client_secrets_manager.SecretsManagerClient({}));
var client;
async function getCredentials() {
  const result = await secretsClient.send(
    new import_client_secrets_manager.GetSecretValueCommand({ SecretId: process.env.X_CREDENTIALS_SECRET_ARN })
  );
  const credentials = JSON.parse(result.SecretString ?? "{}");
  const missing = ["appKey", "appSecret", "accessToken", "accessSecret"].filter((key) => !credentials[key]);
  if (missing.length) {
    throw new Error(
      `The X credentials secret is missing ${missing.join(", ")}. Set it before turning posting on.`
    );
  }
  return credentials;
}
async function postToX(text) {
  if (!client) {
    client = new import_twitter_api_v2.TwitterApi(await getCredentials());
  }
  const result = await client.readWrite.v2.tweet(text);
  return result.data.id;
}

// src/storage-stack/stations.ts
function validateStations(stations) {
  if (!Array.isArray(stations) || stations.length === 0) {
    throw new Error("At least one station must be configured");
  }
  const ids = /* @__PURE__ */ new Set();
  for (const station of stations) {
    if (!station?.id || !station.measureId) {
      throw new Error(
        `Each station needs an id and a measureId: ${JSON.stringify(station)}`
      );
    }
    if (ids.has(station.id)) {
      throw new Error(`Duplicate station id: ${station.id}`);
    }
    ids.add(station.id);
    if (station.maxDepthRiseMetres !== void 0 && !(station.maxDepthRiseMetres > 0)) {
      throw new Error(
        `maxDepthRiseMetres must be greater than 0 for station ${station.id}`
      );
    }
    if (station.ford) {
      const { floodedAboveMetres, impassableAboveMetres } = station.ford;
      if (!Number.isFinite(floodedAboveMetres) || !Number.isFinite(impassableAboveMetres) || floodedAboveMetres >= impassableAboveMetres) {
        throw new Error(
          `ford.floodedAboveMetres must be below ford.impassableAboveMetres for station ${station.id}`
        );
      }
      if (station.ford.website !== void 0 && !station.ford.website.startsWith("https://")) {
        throw new Error(
          `ford.website must be an https:// URL for station ${station.id}`
        );
      }
    }
  }
  return stations;
}
function parseStations(json) {
  if (!json) {
    throw new Error("The STATIONS environment variable is not set");
  }
  return validateStations(JSON.parse(json));
}

// src/notifications-stack/x-notifier.lambda.ts
function groupByStation(event) {
  const batches = /* @__PURE__ */ new Map();
  for (const record of event.Records) {
    let message;
    try {
      message = JSON.parse(record.body);
    } catch {
      logger.warn("Ignoring a message that is not JSON", {
        messageId: record.messageId
      });
      continue;
    }
    const batch = batches.get(message.station);
    if (!batch) {
      batches.set(message.station, {
        latest: message,
        messageIds: [record.messageId]
      });
      continue;
    }
    batch.messageIds.push(record.messageId);
    if (message.lastUpdate > batch.latest.lastUpdate) {
      batch.latest = message;
    }
  }
  return batches;
}
async function notifyStation(status, website) {
  if (!status.state) {
    return;
  }
  const posted = await getPostedState(status.station);
  const now = Date.now();
  const decision = decide(status.state, posted, now);
  if (decision.action === "none") {
    if (decision.reason === "cooldown") {
      logger.info("State changed during the cooldown, not posting yet", {
        state: status.state,
        postedState: posted?.state
      });
    }
    return;
  }
  if (decision.action === "seed") {
    await replacePostedState(status.station, null, {
      state: status.state,
      postedAt: 0
    });
    logger.info("Recorded the first state without posting", {
      state: status.state
    });
    return;
  }
  const next = { state: status.state, postedAt: now };
  if (!await replacePostedState(status.station, posted, next)) {
    logger.info("Another invocation already handled this change");
    return;
  }
  const text = composePost(decision.transition, website);
  if (process.env.MODE !== "post") {
    logger.info("Would post (log mode)", {
      transition: decision.transition,
      text
    });
    return;
  }
  try {
    const id = await postToX(text);
    logger.info("Posted to X", { transition: decision.transition, id });
  } catch (error) {
    await replacePostedState(status.station, next, posted);
    throw error;
  }
}
async function handler(event, context) {
  if (context) {
    logger.addContext(context);
  }
  const websites = new Map(
    parseStations(process.env.STATIONS).map((station) => [
      station.id,
      station.ford?.website
    ])
  );
  const failedMessageIds = [];
  for (const [station, batch] of groupByStation(event)) {
    logger.appendKeys({ station });
    try {
      await notifyStation(batch.latest, websites.get(station));
    } catch (error) {
      logger.error("Notifying failed for station", { error });
      failedMessageIds.push(...batch.messageIds);
    } finally {
      logger.removeKeys(["station"]);
    }
  }
  return {
    batchItemFailures: failedMessageIds.map((itemIdentifier) => ({
      itemIdentifier
    }))
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
/*! Bundled license information:

@aws-lambda-powertools/commons/lib/esm/awsSdkUtils.js:
@aws-lambda-powertools/tracer/lib/esm/Tracer.js:
  (* v8 ignore else -- @preserve *)

@aws-lambda-powertools/logger/lib/esm/logBuffer.js:
@aws-lambda-powertools/logger/lib/esm/Logger.js:
  (* v8 ignore next -- @preserve *)
*/
