
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if (typeof $$scope.dirty === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    const seen_callbacks = new Set();
    function flush() {
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.18.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const { navigate } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `string` starts with `search`
     * @param {string} string
     * @param {string} search
     * @return {boolean}
     */
    function startsWith(string, search) {
      return string.substr(0, search.length) === search;
    }

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Add the query to the pathname if a query is given
     * @param {string} pathname
     * @param {string} [query]
     * @return {string}
     */
    function addQuery(pathname, query) {
      return pathname + (query ? `?${query}` : "");
    }

    /**
     * Resolve URIs as though every path is a directory, no files. Relative URIs
     * in the browser can feel awkward because not only can you be "in a directory",
     * you can be "at a file", too. For example:
     *
     *  browserSpecResolve('foo', '/bar/') => /bar/foo
     *  browserSpecResolve('foo', '/bar') => /foo
     *
     * But on the command line of a file system, it's not as complicated. You can't
     * `cd` from a file, only directories. This way, links have to know less about
     * their current path. To go deeper you can do this:
     *
     *  <Link to="deeper"/>
     *  // instead of
     *  <Link to=`{${props.uri}/deeper}`/>
     *
     * Just like `cd`, if you want to go deeper from the command line, you do this:
     *
     *  cd deeper
     *  # not
     *  cd $(pwd)/deeper
     *
     * By treating every path as a directory, linking to relative paths should
     * require less contextual information and (fingers crossed) be more intuitive.
     * @param {string} to
     * @param {string} base
     * @return {string}
     */
    function resolve(to, base) {
      // /foo/bar, /baz/qux => /foo/bar
      if (startsWith(to, "/")) {
        return to;
      }

      const [toPathname, toQuery] = to.split("?");
      const [basePathname] = base.split("?");
      const toSegments = segmentize(toPathname);
      const baseSegments = segmentize(basePathname);

      // ?a=b, /users?b=c => /users?a=b
      if (toSegments[0] === "") {
        return addQuery(basePathname, toQuery);
      }

      // profile, /users/789 => /users/789/profile
      if (!startsWith(toSegments[0], ".")) {
        const pathname = baseSegments.concat(toSegments).join("/");

        return addQuery((basePathname === "/" ? "" : "/") + pathname, toQuery);
      }

      // ./       , /users/123 => /users/123
      // ../      , /users/123 => /users
      // ../..    , /users/123 => /
      // ../../one, /a/b/c/d   => /a/b/one
      // .././one , /a/b/c/d   => /a/b/c/one
      const allSegments = baseSegments.concat(toSegments);
      const segments = [];

      allSegments.forEach(segment => {
        if (segment === "..") {
          segments.pop();
        } else if (segment !== ".") {
          segments.push(segment);
        }
      });

      return addQuery("/" + segments.join("/"), toQuery);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    function shouldNavigate(event) {
      return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      );
    }

    /* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.18.0 */

    function create_fragment(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[16].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[15], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 32768) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[15], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[15], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $base;
    	let $location;
    	let $routes;
    	let { basepath = "/" } = $$props;
    	let { url = null } = $$props;
    	const locationContext = getContext(LOCATION);
    	const routerContext = getContext(ROUTER);
    	const routes = writable([]);
    	validate_store(routes, "routes");
    	component_subscribe($$self, routes, value => $$invalidate(8, $routes = value));
    	const activeRoute = writable(null);
    	let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

    	// If locationContext is not set, this is the topmost Router in the tree.
    	// If the `url` prop is given we force the location to it.
    	const location = locationContext || writable(url ? { pathname: url } : globalHistory.location);

    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(7, $location = value));

    	// If routerContext is set, the routerBase of the parent Router
    	// will be the base for this Router's descendants.
    	// If routerContext is not set, the path and resolved uri will both
    	// have the value of the basepath prop.
    	const base = routerContext
    	? routerContext.routerBase
    	: writable({ path: basepath, uri: basepath });

    	validate_store(base, "base");
    	component_subscribe($$self, base, value => $$invalidate(6, $base = value));

    	const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
    		// If there is no activeRoute, the routerBase will be identical to the base.
    		if (activeRoute === null) {
    			return base;
    		}

    		const { path: basepath } = base;
    		const { route, uri } = activeRoute;

    		// Remove the potential /* or /*splatname from
    		// the end of the child Routes relative paths.
    		const path = route.default
    		? basepath
    		: route.path.replace(/\*.*$/, "");

    		return { path, uri };
    	});

    	function registerRoute(route) {
    		const { path: basepath } = $base;
    		let { path } = route;

    		// We store the original path in the _path property so we can reuse
    		// it when the basepath changes. The only thing that matters is that
    		// the route reference is intact, so mutation is fine.
    		route._path = path;

    		route.path = combinePaths(basepath, path);

    		if (typeof window === "undefined") {
    			// In SSR we should set the activeRoute immediately if it is a match.
    			// If there are more Routes being registered after a match is found,
    			// we just skip them.
    			if (hasActiveRoute) {
    				return;
    			}

    			const matchingRoute = match(route, $location.pathname);

    			if (matchingRoute) {
    				activeRoute.set(matchingRoute);
    				hasActiveRoute = true;
    			}
    		} else {
    			routes.update(rs => {
    				rs.push(route);
    				return rs;
    			});
    		}
    	}

    	function unregisterRoute(route) {
    		routes.update(rs => {
    			const index = rs.indexOf(route);
    			rs.splice(index, 1);
    			return rs;
    		});
    	}

    	if (!locationContext) {
    		// The topmost Router in the tree is responsible for updating
    		// the location store and supplying it through context.
    		onMount(() => {
    			const unlisten = globalHistory.listen(history => {
    				location.set(history.location);
    			});

    			return unlisten;
    		});

    		setContext(LOCATION, location);
    	}

    	setContext(ROUTER, {
    		activeRoute,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute
    	});

    	const writable_props = ["basepath", "url"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("basepath" in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("$$scope" in $$props) $$invalidate(15, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {
    			basepath,
    			url,
    			hasActiveRoute,
    			$base,
    			$location,
    			$routes
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("basepath" in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("hasActiveRoute" in $$props) hasActiveRoute = $$props.hasActiveRoute;
    		if ("$base" in $$props) base.set($base = $$props.$base);
    		if ("$location" in $$props) location.set($location = $$props.$location);
    		if ("$routes" in $$props) routes.set($routes = $$props.$routes);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$base*/ 64) {
    			// This reactive statement will update all the Routes' path when
    			// the basepath changes.
    			 {
    				const { path: basepath } = $base;

    				routes.update(rs => {
    					rs.forEach(r => r.path = combinePaths(basepath, r._path));
    					return rs;
    				});
    			}
    		}

    		if ($$self.$$.dirty & /*$routes, $location*/ 384) {
    			// This reactive statement will be run when the Router is created
    			// when there are no Routes and then again the following tick, so it
    			// will not find an active Route in SSR and in the browser it will only
    			// pick an active Route after all Routes have been registered.
    			 {
    				const bestMatch = pick($routes, $location.pathname);
    				activeRoute.set(bestMatch);
    			}
    		}
    	};

    	return [
    		routes,
    		location,
    		base,
    		basepath,
    		url,
    		hasActiveRoute,
    		$base,
    		$location,
    		$routes,
    		locationContext,
    		routerContext,
    		activeRoute,
    		routerBase,
    		registerRoute,
    		unregisterRoute,
    		$$scope,
    		$$slots
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { basepath: 3, url: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.18.0 */

    const get_default_slot_changes = dirty => ({
    	params: dirty & /*routeParams*/ 2,
    	location: dirty & /*$location*/ 16
    });

    const get_default_slot_context = ctx => ({
    	params: /*routeParams*/ ctx[1],
    	location: /*$location*/ ctx[4]
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[0] !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}",
    		ctx
    	});

    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[13].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[12], get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot && default_slot.p && dirty & /*$$scope, routeParams, $location*/ 4114) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[12], get_default_slot_context), get_slot_changes(default_slot_template, /*$$scope*/ ctx[12], dirty, get_default_slot_changes));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(43:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	let switch_instance_anchor;
    	let current;

    	const switch_instance_spread_levels = [
    		{ location: /*$location*/ ctx[4] },
    		/*routeParams*/ ctx[1],
    		/*routeProps*/ ctx[2]
    	];

    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$location, routeParams, routeProps*/ 22)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*$location*/ 16 && { location: /*$location*/ ctx[4] },
    					dirty & /*routeParams*/ 2 && get_spread_object(/*routeParams*/ ctx[1]),
    					dirty & /*routeProps*/ 4 && get_spread_object(/*routeProps*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(41:2) {#if component !== null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$activeRoute*/ ctx[3] !== null && /*$activeRoute*/ ctx[3].route === /*route*/ ctx[7] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$activeRoute*/ ctx[3] !== null && /*$activeRoute*/ ctx[3].route === /*route*/ ctx[7]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $activeRoute;
    	let $location;
    	let { path = "" } = $$props;
    	let { component = null } = $$props;
    	const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
    	validate_store(activeRoute, "activeRoute");
    	component_subscribe($$self, activeRoute, value => $$invalidate(3, $activeRoute = value));
    	const location = getContext(LOCATION);
    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(4, $location = value));

    	const route = {
    		path,
    		// If no path prop is given, this Route will act as the default Route
    		// that is rendered if no other Route in the Router is a match.
    		default: path === ""
    	};

    	let routeParams = {};
    	let routeProps = {};
    	registerRoute(route);

    	// There is no need to unregister Routes in SSR since it will all be
    	// thrown away anyway.
    	if (typeof window !== "undefined") {
    		onDestroy(() => {
    			unregisterRoute(route);
    		});
    	}

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate(11, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("path" in $$new_props) $$invalidate(8, path = $$new_props.path);
    		if ("component" in $$new_props) $$invalidate(0, component = $$new_props.component);
    		if ("$$scope" in $$new_props) $$invalidate(12, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {
    			path,
    			component,
    			routeParams,
    			routeProps,
    			$activeRoute,
    			$location
    		};
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(11, $$props = assign(assign({}, $$props), $$new_props));
    		if ("path" in $$props) $$invalidate(8, path = $$new_props.path);
    		if ("component" in $$props) $$invalidate(0, component = $$new_props.component);
    		if ("routeParams" in $$props) $$invalidate(1, routeParams = $$new_props.routeParams);
    		if ("routeProps" in $$props) $$invalidate(2, routeProps = $$new_props.routeProps);
    		if ("$activeRoute" in $$props) activeRoute.set($activeRoute = $$new_props.$activeRoute);
    		if ("$location" in $$props) location.set($location = $$new_props.$location);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$activeRoute*/ 8) {
    			 if ($activeRoute && $activeRoute.route === route) {
    				$$invalidate(1, routeParams = $activeRoute.params);
    			}
    		}

    		 {
    			const { path, component, ...rest } = $$props;
    			$$invalidate(2, routeProps = rest);
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		component,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location,
    		activeRoute,
    		location,
    		route,
    		path,
    		registerRoute,
    		unregisterRoute,
    		$$props,
    		$$scope,
    		$$slots
    	];
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { path: 8, component: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-routing/src/Link.svelte generated by Svelte v3.18.0 */
    const file = "node_modules/svelte-routing/src/Link.svelte";

    function create_fragment$2(ctx) {
    	let a;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[16].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[15], null);

    	let a_levels = [
    		{ href: /*href*/ ctx[0] },
    		{ "aria-current": /*ariaCurrent*/ ctx[2] },
    		/*props*/ ctx[1]
    	];

    	let a_data = {};

    	for (let i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");
    			if (default_slot) default_slot.c();
    			set_attributes(a, a_data);
    			add_location(a, file, 40, 0, 1249);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;
    			dispose = listen_dev(a, "click", /*onClick*/ ctx[5], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 32768) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[15], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[15], dirty, null));
    			}

    			set_attributes(a, get_spread_update(a_levels, [
    				dirty & /*href*/ 1 && { href: /*href*/ ctx[0] },
    				dirty & /*ariaCurrent*/ 4 && { "aria-current": /*ariaCurrent*/ ctx[2] },
    				dirty & /*props*/ 2 && /*props*/ ctx[1]
    			]));
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $base;
    	let $location;
    	let { to = "#" } = $$props;
    	let { replace = false } = $$props;
    	let { state = {} } = $$props;
    	let { getProps = () => ({}) } = $$props;
    	const { base } = getContext(ROUTER);
    	validate_store(base, "base");
    	component_subscribe($$self, base, value => $$invalidate(12, $base = value));
    	const location = getContext(LOCATION);
    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(13, $location = value));
    	const dispatch = createEventDispatcher();
    	let href, isPartiallyCurrent, isCurrent, props;

    	function onClick(event) {
    		dispatch("click", event);

    		if (shouldNavigate(event)) {
    			event.preventDefault();

    			// Don't push another entry to the history stack when the user
    			// clicks on a Link to the page they are currently on.
    			const shouldReplace = $location.pathname === href || replace;

    			navigate(href, { state, replace: shouldReplace });
    		}
    	}

    	const writable_props = ["to", "replace", "state", "getProps"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Link> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("to" in $$props) $$invalidate(6, to = $$props.to);
    		if ("replace" in $$props) $$invalidate(7, replace = $$props.replace);
    		if ("state" in $$props) $$invalidate(8, state = $$props.state);
    		if ("getProps" in $$props) $$invalidate(9, getProps = $$props.getProps);
    		if ("$$scope" in $$props) $$invalidate(15, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {
    			to,
    			replace,
    			state,
    			getProps,
    			href,
    			isPartiallyCurrent,
    			isCurrent,
    			props,
    			$base,
    			$location,
    			ariaCurrent
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("to" in $$props) $$invalidate(6, to = $$props.to);
    		if ("replace" in $$props) $$invalidate(7, replace = $$props.replace);
    		if ("state" in $$props) $$invalidate(8, state = $$props.state);
    		if ("getProps" in $$props) $$invalidate(9, getProps = $$props.getProps);
    		if ("href" in $$props) $$invalidate(0, href = $$props.href);
    		if ("isPartiallyCurrent" in $$props) $$invalidate(10, isPartiallyCurrent = $$props.isPartiallyCurrent);
    		if ("isCurrent" in $$props) $$invalidate(11, isCurrent = $$props.isCurrent);
    		if ("props" in $$props) $$invalidate(1, props = $$props.props);
    		if ("$base" in $$props) base.set($base = $$props.$base);
    		if ("$location" in $$props) location.set($location = $$props.$location);
    		if ("ariaCurrent" in $$props) $$invalidate(2, ariaCurrent = $$props.ariaCurrent);
    	};

    	let ariaCurrent;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*to, $base*/ 4160) {
    			 $$invalidate(0, href = to === "/" ? $base.uri : resolve(to, $base.uri));
    		}

    		if ($$self.$$.dirty & /*$location, href*/ 8193) {
    			 $$invalidate(10, isPartiallyCurrent = startsWith($location.pathname, href));
    		}

    		if ($$self.$$.dirty & /*href, $location*/ 8193) {
    			 $$invalidate(11, isCurrent = href === $location.pathname);
    		}

    		if ($$self.$$.dirty & /*isCurrent*/ 2048) {
    			 $$invalidate(2, ariaCurrent = isCurrent ? "page" : undefined);
    		}

    		if ($$self.$$.dirty & /*getProps, $location, href, isPartiallyCurrent, isCurrent*/ 11777) {
    			 $$invalidate(1, props = getProps({
    				location: $location,
    				href,
    				isPartiallyCurrent,
    				isCurrent
    			}));
    		}
    	};

    	return [
    		href,
    		props,
    		ariaCurrent,
    		base,
    		location,
    		onClick,
    		to,
    		replace,
    		state,
    		getProps,
    		isPartiallyCurrent,
    		isCurrent,
    		$base,
    		$location,
    		dispatch,
    		$$scope,
    		$$slots
    	];
    }

    class Link extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { to: 6, replace: 7, state: 8, getProps: 9 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Link",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get to() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set to(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get replace() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set replace(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get state() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set state(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getProps() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getProps(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Nav.svelte generated by Svelte v3.18.0 */
    const file$1 = "src/Nav.svelte";

    // (107:6) <Link to="/">
    function create_default_slot_2(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "🛒";
    			attr_dev(span, "class", "inicio svelte-12gbzok");
    			add_location(span, file$1, 107, 8, 1579);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(107:6) <Link to=\\\"/\\\">",
    		ctx
    	});

    	return block;
    }

    // (112:6) <Link to="/articulos">
    function create_default_slot_1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "🎁";
    			attr_dev(span, "class", "articulos svelte-12gbzok");
    			add_location(span, file$1, 112, 8, 1700);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(112:6) <Link to=\\\"/articulos\\\">",
    		ctx
    	});

    	return block;
    }

    // (117:6) <Link to="/clientes">
    function create_default_slot(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "👥";
    			attr_dev(span, "class", "clientes svelte-12gbzok");
    			add_location(span, file$1, 117, 8, 1823);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(117:6) <Link to=\\\"/clientes\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let nav;
    	let ul;
    	let li0;
    	let t0;
    	let li1;
    	let t1;
    	let li2;
    	let current;

    	const link0 = new Link({
    			props: {
    				to: "/",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const link1 = new Link({
    			props: {
    				to: "/articulos",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const link2 = new Link({
    			props: {
    				to: "/clientes",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			ul = element("ul");
    			li0 = element("li");
    			create_component(link0.$$.fragment);
    			t0 = space();
    			li1 = element("li");
    			create_component(link1.$$.fragment);
    			t1 = space();
    			li2 = element("li");
    			create_component(link2.$$.fragment);
    			attr_dev(li0, "class", "logo svelte-12gbzok");
    			add_location(li0, file$1, 105, 4, 1533);
    			attr_dev(li1, "class", "item active svelte-12gbzok");
    			add_location(li1, file$1, 110, 4, 1638);
    			attr_dev(li2, "class", "item active svelte-12gbzok");
    			add_location(li2, file$1, 115, 4, 1762);
    			attr_dev(ul, "class", "menu svelte-12gbzok");
    			add_location(ul, file$1, 104, 2, 1511);
    			attr_dev(nav, "class", "svelte-12gbzok");
    			add_location(nav, file$1, 103, 0, 1503);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, ul);
    			append_dev(ul, li0);
    			mount_component(link0, li0, null);
    			append_dev(ul, t0);
    			append_dev(ul, li1);
    			mount_component(link1, li1, null);
    			append_dev(ul, t1);
    			append_dev(ul, li2);
    			mount_component(link2, li2, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const link0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				link0_changes.$$scope = { dirty, ctx };
    			}

    			link0.$set(link0_changes);
    			const link1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				link1_changes.$$scope = { dirty, ctx };
    			}

    			link1.$set(link1_changes);
    			const link2_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				link2_changes.$$scope = { dirty, ctx };
    			}

    			link2.$set(link2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);
    			transition_in(link1.$$.fragment, local);
    			transition_in(link2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			transition_out(link2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			destroy_component(link0);
    			destroy_component(link1);
    			destroy_component(link2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/Inicio.svelte generated by Svelte v3.18.0 */
    const file$2 = "src/Inicio.svelte";

    // (74:2) <Link to="/">
    function create_default_slot_2$1(ctx) {
    	let div;
    	let span0;
    	let t1;
    	let span1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			span0.textContent = "🛒 Inicio";
    			t1 = space();
    			span1 = element("span");
    			span1.textContent = "Esta página de información.";
    			attr_dev(span0, "class", "opcion svelte-o18e7c");
    			add_location(span0, file$2, 75, 6, 1350);
    			attr_dev(span1, "class", "descripcion svelte-o18e7c");
    			add_location(span1, file$2, 76, 6, 1394);
    			attr_dev(div, "class", "resumen svelte-o18e7c");
    			add_location(div, file$2, 74, 4, 1322);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(74:2) <Link to=\\\"/\\\">",
    		ctx
    	});

    	return block;
    }

    // (81:2) <Link to="/articulos">
    function create_default_slot_1$1(ctx) {
    	let div;
    	let span0;
    	let t1;
    	let span1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			span0.textContent = "🎁 Artículos";
    			t1 = space();
    			span1 = element("span");
    			span1.textContent = "Operaciones CRUD de artículos en una BD.";
    			attr_dev(span0, "class", "opcion svelte-o18e7c");
    			add_location(span0, file$2, 82, 6, 1534);
    			attr_dev(span1, "class", "descripcion svelte-o18e7c");
    			add_location(span1, file$2, 83, 6, 1581);
    			attr_dev(div, "class", "resumen svelte-o18e7c");
    			add_location(div, file$2, 81, 4, 1506);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(81:2) <Link to=\\\"/articulos\\\">",
    		ctx
    	});

    	return block;
    }

    // (90:2) <Link to="/clientes">
    function create_default_slot$1(ctx) {
    	let div;
    	let span0;
    	let t1;
    	let span1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			span0.textContent = "👥 Clientes";
    			t1 = space();
    			span1 = element("span");
    			span1.textContent = "Operaciones CRUD de clientes en una BD.";
    			attr_dev(span0, "class", "opcion svelte-o18e7c");
    			add_location(span0, file$2, 91, 6, 1749);
    			attr_dev(span1, "class", "descripcion svelte-o18e7c");
    			add_location(span1, file$2, 92, 6, 1795);
    			attr_dev(div, "class", "resumen svelte-o18e7c");
    			add_location(div, file$2, 90, 4, 1721);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(90:2) <Link to=\\\"/clientes\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let h1;
    	let t1;
    	let p0;
    	let small0;
    	let b0;
    	let t3;
    	let p1;
    	let small1;
    	let t4;
    	let a0;
    	let t6;
    	let p2;
    	let t8;
    	let div;
    	let t9;
    	let t10;
    	let t11;
    	let p3;
    	let small2;
    	let b1;
    	let t12;
    	let a1;
    	let current;

    	const link0 = new Link({
    			props: {
    				to: "/",
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const link1 = new Link({
    			props: {
    				to: "/articulos",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const link2 = new Link({
    			props: {
    				to: "/clientes",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Tienda Frontend";
    			t1 = space();
    			p0 = element("p");
    			small0 = element("small");
    			b0 = element("b");
    			b0.textContent = "Progressive Web App (PWA)";
    			t3 = space();
    			p1 = element("p");
    			small1 = element("small");
    			t4 = text("Backend en\n    ");
    			a0 = element("a");
    			a0.textContent = "https://tiendabackend.herokuapp.com";
    			t6 = space();
    			p2 = element("p");
    			p2.textContent = "Esta SPA (Single Page Application) ofrece 3 opciones:";
    			t8 = space();
    			div = element("div");
    			create_component(link0.$$.fragment);
    			t9 = space();
    			create_component(link1.$$.fragment);
    			t10 = space();
    			create_component(link2.$$.fragment);
    			t11 = space();
    			p3 = element("p");
    			small2 = element("small");
    			b1 = element("b");
    			t12 = text("Código fuente en\n      ");
    			a1 = element("a");
    			a1.textContent = "https://github.com/jamj2000/tiendafrontend";
    			attr_dev(h1, "class", "svelte-o18e7c");
    			add_location(h1, file$2, 56, 0, 980);
    			add_location(b0, file$2, 59, 4, 1023);
    			add_location(small0, file$2, 58, 2, 1011);
    			attr_dev(p0, "class", "svelte-o18e7c");
    			add_location(p0, file$2, 57, 0, 1005);
    			attr_dev(a0, "href", "https://tiendabackend.herokuapp.com");
    			add_location(a0, file$2, 65, 4, 1105);
    			add_location(small1, file$2, 63, 2, 1078);
    			attr_dev(p1, "class", "svelte-o18e7c");
    			add_location(p1, file$2, 62, 0, 1072);
    			attr_dev(p2, "class", "svelte-o18e7c");
    			add_location(p2, file$2, 70, 0, 1219);
    			attr_dev(div, "class", "bloque svelte-o18e7c");
    			add_location(div, file$2, 72, 0, 1281);
    			attr_dev(a1, "href", "https://github.com/jamj2000/tiendafrontend");
    			add_location(a1, file$2, 103, 6, 1964);
    			add_location(b1, file$2, 101, 4, 1931);
    			add_location(small2, file$2, 100, 2, 1919);
    			attr_dev(p3, "class", "svelte-o18e7c");
    			add_location(p3, file$2, 99, 0, 1913);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			append_dev(p0, small0);
    			append_dev(small0, b0);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, small1);
    			append_dev(small1, t4);
    			append_dev(small1, a0);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, div, anchor);
    			mount_component(link0, div, null);
    			append_dev(div, t9);
    			mount_component(link1, div, null);
    			append_dev(div, t10);
    			mount_component(link2, div, null);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p3, anchor);
    			append_dev(p3, small2);
    			append_dev(small2, b1);
    			append_dev(b1, t12);
    			append_dev(b1, a1);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const link0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				link0_changes.$$scope = { dirty, ctx };
    			}

    			link0.$set(link0_changes);
    			const link1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				link1_changes.$$scope = { dirty, ctx };
    			}

    			link1.$set(link1_changes);
    			const link2_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				link2_changes.$$scope = { dirty, ctx };
    			}

    			link2.$set(link2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);
    			transition_in(link1.$$.fragment, local);
    			transition_in(link2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			transition_out(link2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(p2);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(div);
    			destroy_component(link0);
    			destroy_component(link1);
    			destroy_component(link2);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(p3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Inicio extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Inicio",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    const jsonData = writable([]);
    // export let datos = writable([]);

    /* src/Buscar.svelte generated by Svelte v3.18.0 */

    const file$3 = "src/Buscar.svelte";

    function create_fragment$5(ctx) {
    	let label;
    	let t;
    	let input;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			t = text("Buscar\n  ");
    			input = element("input");
    			attr_dev(input, "type", "search");
    			add_location(input, file$3, 6, 2, 62);
    			add_location(label, file$3, 4, 0, 43);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, t);
    			append_dev(label, input);
    			set_input_value(input, /*busqueda*/ ctx[0]);
    			dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[1]);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*busqueda*/ 1) {
    				set_input_value(input, /*busqueda*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { busqueda } = $$props;
    	const writable_props = ["busqueda"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Buscar> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		busqueda = this.value;
    		$$invalidate(0, busqueda);
    	}

    	$$self.$set = $$props => {
    		if ("busqueda" in $$props) $$invalidate(0, busqueda = $$props.busqueda);
    	};

    	$$self.$capture_state = () => {
    		return { busqueda };
    	};

    	$$self.$inject_state = $$props => {
    		if ("busqueda" in $$props) $$invalidate(0, busqueda = $$props.busqueda);
    	};

    	return [busqueda, input_input_handler];
    }

    class Buscar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$5, safe_not_equal, { busqueda: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Buscar",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*busqueda*/ ctx[0] === undefined && !("busqueda" in props)) {
    			console.warn("<Buscar> was created without expected prop 'busqueda'");
    		}
    	}

    	get busqueda() {
    		throw new Error("<Buscar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set busqueda(value) {
    		throw new Error("<Buscar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Articulo.svelte generated by Svelte v3.18.0 */

    const file$4 = "src/Articulo.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let input0;
    	let t0;
    	let input1;
    	let input1_updating = false;
    	let t1;
    	let current;
    	let dispose;

    	function input1_input_handler() {
    		input1_updating = true;
    		/*input1_input_handler*/ ctx[4].call(input1);
    	}

    	const default_slot_template = /*$$slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = text("  €\n  ");
    			if (default_slot) default_slot.c();
    			attr_dev(input0, "class", "title svelte-thfols");
    			add_location(input0, file$4, 48, 2, 785);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "9999.99");
    			attr_dev(input1, "step", ".01");
    			attr_dev(input1, "class", "svelte-thfols");
    			add_location(input1, file$4, 49, 2, 840);
    			attr_dev(div, "class", "card svelte-thfols");
    			add_location(div, file$4, 47, 0, 764);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input0);
    			set_input_value(input0, /*articulo*/ ctx[0].nombre);
    			append_dev(div, t0);
    			append_dev(div, input1);
    			set_input_value(input1, /*articulo*/ ctx[0].precio);
    			append_dev(div, t1);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[3]),
    				listen_dev(input1, "input", input1_input_handler)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*articulo*/ 1 && input0.value !== /*articulo*/ ctx[0].nombre) {
    				set_input_value(input0, /*articulo*/ ctx[0].nombre);
    			}

    			if (!input1_updating && dirty & /*articulo*/ 1) {
    				set_input_value(input1, /*articulo*/ ctx[0].precio);
    			}

    			input1_updating = false;

    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 2) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[1], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { articulo = {} } = $$props;
    	const writable_props = ["articulo"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Articulo> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	function input0_input_handler() {
    		articulo.nombre = this.value;
    		$$invalidate(0, articulo);
    	}

    	function input1_input_handler() {
    		articulo.precio = to_number(this.value);
    		$$invalidate(0, articulo);
    	}

    	$$self.$set = $$props => {
    		if ("articulo" in $$props) $$invalidate(0, articulo = $$props.articulo);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { articulo };
    	};

    	$$self.$inject_state = $$props => {
    		if ("articulo" in $$props) $$invalidate(0, articulo = $$props.articulo);
    	};

    	return [articulo, $$scope, $$slots, input0_input_handler, input1_input_handler];
    }

    class Articulo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$6, safe_not_equal, { articulo: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Articulo",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get articulo() {
    		throw new Error("<Articulo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set articulo(value) {
    		throw new Error("<Articulo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Boton.svelte generated by Svelte v3.18.0 */

    const { Object: Object_1 } = globals;
    const file$5 = "src/Boton.svelte";

    function create_fragment$7(ctx) {
    	let button;
    	let button_class_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			attr_dev(button, "class", button_class_value = "" + (null_to_empty(/*clases*/ ctx[1]) + " svelte-19kak50"));
    			add_location(button, file$5, 162, 0, 3449);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			dispose = listen_dev(
    				button,
    				"click",
    				function () {
    					if (is_function(/*handler*/ ctx[0])) /*handler*/ ctx[0].apply(this, arguments);
    				},
    				false,
    				false,
    				false
    			);
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (dirty & /*clases*/ 2 && button_class_value !== (button_class_value = "" + (null_to_empty(/*clases*/ ctx[1]) + " svelte-19kak50"))) {
    				attr_dev(button, "class", button_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $jsonData;
    	validate_store(jsonData, "jsonData");
    	component_subscribe($$self, jsonData, $$value => $$invalidate(6, $jsonData = $$value));
    	let { tipo = "insertar" } = $$props; // insertar, modificar, eliminar
    	let { coleccion = "articulos" } = $$props; // articulos, clientes
    	let { documento = {} } = $$props;

    	let handler = () => {
    		
    	};

    	let clases = "";
    	let url = "";
    	const URL = getContext("URL");

    	onMount(() => {
    		switch (tipo) {
    			case "insertar":
    				$$invalidate(0, handler = insertar);
    				$$invalidate(1, clases = "btn btn-insertar");
    				break;
    			case "modificar":
    				$$invalidate(0, handler = modificar);
    				$$invalidate(1, clases = "btn btn-modificar");
    				break;
    			case "eliminar":
    				$$invalidate(0, handler = eliminar);
    				$$invalidate(1, clases = "btn btn-eliminar");
    				break;
    		}

    		switch (coleccion) {
    			case "articulos":
    				url = URL.articulos;
    				break;
    			case "clientes":
    				url = URL.clientes;
    				break;
    		}
    	});

    	function insertar() {
    		if (Object.keys(documento).length > 1 && Object.values(documento).every(x => x !== undefined && x != "")) {
    			fetch(url, {
    				method: "POST",
    				headers: { "Content-Type": "application/json" },
    				body: JSON.stringify(documento)
    			}).then(res => res.json()).then(data => {
    				set_store_value(jsonData, $jsonData = [...$jsonData, data]);
    				ok();
    			}).catch(err => ko());
    		}
    	}

    	function modificar() {
    		fetch(url + documento._id, {
    			method: "PUT",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify(documento)
    		}).then(res => res.json()).then(data => ok()).catch(err => ko());
    	}

    	function eliminar() {
    		fetch(url + documento._id, { method: "DELETE" }).then(res => res.json()).then(data => {
    			set_store_value(jsonData, $jsonData = $jsonData.filter(x => x._id !== data._id));
    			ok();
    		}).catch(err => ko());
    	}

    	let ok = () => {
    		OK.style.display = "block";
    		setTimeout(() => OK.style.display = "none", 1500);
    	};

    	let ko = () => {
    		KO.style.display = "block";
    		setTimeout(() => KO.style.display = "none", 1500);
    	};

    	const writable_props = ["tipo", "coleccion", "documento"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Boton> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("tipo" in $$props) $$invalidate(2, tipo = $$props.tipo);
    		if ("coleccion" in $$props) $$invalidate(3, coleccion = $$props.coleccion);
    		if ("documento" in $$props) $$invalidate(4, documento = $$props.documento);
    	};

    	$$self.$capture_state = () => {
    		return {
    			tipo,
    			coleccion,
    			documento,
    			handler,
    			clases,
    			url,
    			ok,
    			ko,
    			$jsonData
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("tipo" in $$props) $$invalidate(2, tipo = $$props.tipo);
    		if ("coleccion" in $$props) $$invalidate(3, coleccion = $$props.coleccion);
    		if ("documento" in $$props) $$invalidate(4, documento = $$props.documento);
    		if ("handler" in $$props) $$invalidate(0, handler = $$props.handler);
    		if ("clases" in $$props) $$invalidate(1, clases = $$props.clases);
    		if ("url" in $$props) url = $$props.url;
    		if ("ok" in $$props) ok = $$props.ok;
    		if ("ko" in $$props) ko = $$props.ko;
    		if ("$jsonData" in $$props) jsonData.set($jsonData = $$props.$jsonData);
    	};

    	return [handler, clases, tipo, coleccion, documento];
    }

    class Boton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$7, safe_not_equal, { tipo: 2, coleccion: 3, documento: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Boton",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get tipo() {
    		throw new Error("<Boton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tipo(value) {
    		throw new Error("<Boton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get coleccion() {
    		throw new Error("<Boton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set coleccion(value) {
    		throw new Error("<Boton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get documento() {
    		throw new Error("<Boton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set documento(value) {
    		throw new Error("<Boton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Articulos.svelte generated by Svelte v3.18.0 */
    const file$6 = "src/Articulos.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (41:2) <Articulo bind:articulo>
    function create_default_slot_1$2(ctx) {
    	let div;
    	let current;

    	const boton = new Boton({
    			props: {
    				documento: /*articulo*/ ctx[2],
    				tipo: "insertar",
    				coleccion: "articulos"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(boton.$$.fragment);
    			set_style(div, "text-align", "right");
    			add_location(div, file$6, 41, 4, 904);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(boton, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const boton_changes = {};
    			if (dirty & /*articulo*/ 4) boton_changes.documento = /*articulo*/ ctx[2];
    			boton.$set(boton_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(boton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(boton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(boton);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$2.name,
    		type: "slot",
    		source: "(41:2) <Articulo bind:articulo>",
    		ctx
    	});

    	return block;
    }

    // (50:4) <Articulo {articulo}>
    function create_default_slot$2(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let current;

    	const boton0 = new Boton({
    			props: {
    				documento: /*articulo*/ ctx[2],
    				tipo: "modificar",
    				coleccion: "articulos"
    			},
    			$$inline: true
    		});

    	const boton1 = new Boton({
    			props: {
    				documento: /*articulo*/ ctx[2],
    				tipo: "eliminar",
    				coleccion: "articulos"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(boton0.$$.fragment);
    			t0 = space();
    			create_component(boton1.$$.fragment);
    			t1 = space();
    			set_style(div, "text-align", "right");
    			add_location(div, file$6, 50, 6, 1128);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(boton0, div, null);
    			append_dev(div, t0);
    			mount_component(boton1, div, null);
    			insert_dev(target, t1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const boton0_changes = {};
    			if (dirty & /*datos*/ 2) boton0_changes.documento = /*articulo*/ ctx[2];
    			boton0.$set(boton0_changes);
    			const boton1_changes = {};
    			if (dirty & /*datos*/ 2) boton1_changes.documento = /*articulo*/ ctx[2];
    			boton1.$set(boton1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(boton0.$$.fragment, local);
    			transition_in(boton1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(boton0.$$.fragment, local);
    			transition_out(boton1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(boton0);
    			destroy_component(boton1);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(50:4) <Articulo {articulo}>",
    		ctx
    	});

    	return block;
    }

    // (49:2) {#each datos as articulo}
    function create_each_block(ctx) {
    	let current;

    	const articulo_1 = new Articulo({
    			props: {
    				articulo: /*articulo*/ ctx[2],
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(articulo_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(articulo_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const articulo_1_changes = {};
    			if (dirty & /*datos*/ 2) articulo_1_changes.articulo = /*articulo*/ ctx[2];

    			if (dirty & /*$$scope, datos*/ 1026) {
    				articulo_1_changes.$$scope = { dirty, ctx };
    			}

    			articulo_1.$set(articulo_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(articulo_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(articulo_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(articulo_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(49:2) {#each datos as articulo}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let h1;
    	let t1;
    	let updating_busqueda;
    	let t2;
    	let div0;
    	let updating_articulo;
    	let t3;
    	let div1;
    	let current;

    	function buscar_busqueda_binding(value) {
    		/*buscar_busqueda_binding*/ ctx[6].call(null, value);
    	}

    	let buscar_props = {};

    	if (/*busqueda*/ ctx[0] !== void 0) {
    		buscar_props.busqueda = /*busqueda*/ ctx[0];
    	}

    	const buscar = new Buscar({ props: buscar_props, $$inline: true });
    	binding_callbacks.push(() => bind(buscar, "busqueda", buscar_busqueda_binding));

    	function articulo_1_articulo_binding(value_1) {
    		/*articulo_1_articulo_binding*/ ctx[7].call(null, value_1);
    	}

    	let articulo_1_props = {
    		$$slots: { default: [create_default_slot_1$2] },
    		$$scope: { ctx }
    	};

    	if (/*articulo*/ ctx[2] !== void 0) {
    		articulo_1_props.articulo = /*articulo*/ ctx[2];
    	}

    	const articulo_1 = new Articulo({ props: articulo_1_props, $$inline: true });
    	binding_callbacks.push(() => bind(articulo_1, "articulo", articulo_1_articulo_binding));
    	let each_value = /*datos*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "ARTÍCULOS";
    			t1 = space();
    			create_component(buscar.$$.fragment);
    			t2 = space();
    			div0 = element("div");
    			create_component(articulo_1.$$.fragment);
    			t3 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(h1, file$6, 36, 0, 804);
    			attr_dev(div0, "class", "container svelte-yynlv5");
    			add_location(div0, file$6, 39, 0, 849);
    			attr_dev(div1, "class", "container svelte-yynlv5");
    			add_location(div1, file$6, 47, 0, 1044);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(buscar, target, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div0, anchor);
    			mount_component(articulo_1, div0, null);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const buscar_changes = {};

    			if (!updating_busqueda && dirty & /*busqueda*/ 1) {
    				updating_busqueda = true;
    				buscar_changes.busqueda = /*busqueda*/ ctx[0];
    				add_flush_callback(() => updating_busqueda = false);
    			}

    			buscar.$set(buscar_changes);
    			const articulo_1_changes = {};

    			if (dirty & /*$$scope, articulo*/ 1028) {
    				articulo_1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_articulo && dirty & /*articulo*/ 4) {
    				updating_articulo = true;
    				articulo_1_changes.articulo = /*articulo*/ ctx[2];
    				add_flush_callback(() => updating_articulo = false);
    			}

    			articulo_1.$set(articulo_1_changes);

    			if (dirty & /*datos*/ 2) {
    				each_value = /*datos*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(buscar.$$.fragment, local);
    			transition_in(articulo_1.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(buscar.$$.fragment, local);
    			transition_out(articulo_1.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			destroy_component(buscar, detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div0);
    			destroy_component(articulo_1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $jsonData;
    	validate_store(jsonData, "jsonData");
    	component_subscribe($$self, jsonData, $$value => $$invalidate(3, $jsonData = $$value));
    	const URL = getContext("URL");
    	let busqueda = "";
    	let articulo = {};

    	onMount(async () => {
    		const response = await fetch(URL.articulos);
    		const data = await response.json();
    		set_store_value(jsonData, $jsonData = data);
    	});

    	function buscar_busqueda_binding(value) {
    		busqueda = value;
    		$$invalidate(0, busqueda);
    	}

    	function articulo_1_articulo_binding(value_1) {
    		articulo = value_1;
    		$$invalidate(2, articulo);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("busqueda" in $$props) $$invalidate(0, busqueda = $$props.busqueda);
    		if ("articulo" in $$props) $$invalidate(2, articulo = $$props.articulo);
    		if ("$jsonData" in $$props) jsonData.set($jsonData = $$props.$jsonData);
    		if ("regex" in $$props) $$invalidate(4, regex = $$props.regex);
    		if ("datos" in $$props) $$invalidate(1, datos = $$props.datos);
    	};

    	let regex;
    	let datos;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*busqueda*/ 1) {
    			 $$invalidate(4, regex = new RegExp(busqueda, "i"));
    		}

    		if ($$self.$$.dirty & /*busqueda, $jsonData, regex*/ 25) {
    			 $$invalidate(1, datos = busqueda
    			? $jsonData.filter(item => regex.test(item.nombre))
    			: $jsonData);
    		}
    	};

    	return [
    		busqueda,
    		datos,
    		articulo,
    		$jsonData,
    		regex,
    		URL,
    		buscar_busqueda_binding,
    		articulo_1_articulo_binding
    	];
    }

    class Articulos extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Articulos",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/Cliente.svelte generated by Svelte v3.18.0 */
    const file$7 = "src/Cliente.svelte";

    function create_fragment$9(ctx) {
    	let div;
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			if (default_slot) default_slot.c();
    			attr_dev(input0, "class", "title svelte-f9v07g");
    			add_location(input0, file$7, 50, 2, 840);
    			attr_dev(input1, "class", "title svelte-f9v07g");
    			add_location(input1, file$7, 51, 2, 894);
    			attr_dev(div, "class", "card svelte-f9v07g");
    			add_location(div, file$7, 49, 0, 810);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input0);
    			set_input_value(input0, /*cliente*/ ctx[0].nombre);
    			append_dev(div, t0);
    			append_dev(div, input1);
    			set_input_value(input1, /*cliente*/ ctx[0].apellidos);
    			append_dev(div, t1);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[4]),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[5]),
    				listen_dev(div, "click", /*click_handler*/ ctx[3], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*cliente*/ 1 && input0.value !== /*cliente*/ ctx[0].nombre) {
    				set_input_value(input0, /*cliente*/ ctx[0].nombre);
    			}

    			if (dirty & /*cliente*/ 1 && input1.value !== /*cliente*/ ctx[0].apellidos) {
    				set_input_value(input1, /*cliente*/ ctx[0].apellidos);
    			}

    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 2) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[1], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { cliente = {} } = $$props;
    	const writable_props = ["cliente"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Cliente> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function input0_input_handler() {
    		cliente.nombre = this.value;
    		$$invalidate(0, cliente);
    	}

    	function input1_input_handler() {
    		cliente.apellidos = this.value;
    		$$invalidate(0, cliente);
    	}

    	$$self.$set = $$props => {
    		if ("cliente" in $$props) $$invalidate(0, cliente = $$props.cliente);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { cliente };
    	};

    	$$self.$inject_state = $$props => {
    		if ("cliente" in $$props) $$invalidate(0, cliente = $$props.cliente);
    	};

    	return [
    		cliente,
    		$$scope,
    		$$slots,
    		click_handler,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Cliente extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$9, safe_not_equal, { cliente: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Cliente",
    			options,
    			id: create_fragment$9.name
    		});
    	}

    	get cliente() {
    		throw new Error("<Cliente>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cliente(value) {
    		throw new Error("<Cliente>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Clientes.svelte generated by Svelte v3.18.0 */
    const file$8 = "src/Clientes.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (41:2) <Cliente bind:cliente>
    function create_default_slot_1$3(ctx) {
    	let div;
    	let current;

    	const boton = new Boton({
    			props: {
    				documento: /*cliente*/ ctx[2],
    				tipo: "insertar",
    				coleccion: "clientes"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(boton.$$.fragment);
    			set_style(div, "text-align", "right");
    			add_location(div, file$8, 41, 4, 898);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(boton, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const boton_changes = {};
    			if (dirty & /*cliente*/ 4) boton_changes.documento = /*cliente*/ ctx[2];
    			boton.$set(boton_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(boton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(boton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(boton);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$3.name,
    		type: "slot",
    		source: "(41:2) <Cliente bind:cliente>",
    		ctx
    	});

    	return block;
    }

    // (50:4) <Cliente {cliente}>
    function create_default_slot$3(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let current;

    	const boton0 = new Boton({
    			props: {
    				documento: /*cliente*/ ctx[2],
    				tipo: "modificar",
    				coleccion: "clientes"
    			},
    			$$inline: true
    		});

    	const boton1 = new Boton({
    			props: {
    				documento: /*cliente*/ ctx[2],
    				tipo: "eliminar",
    				coleccion: "clientes"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(boton0.$$.fragment);
    			t0 = space();
    			create_component(boton1.$$.fragment);
    			t1 = space();
    			set_style(div, "text-align", "right");
    			add_location(div, file$8, 50, 6, 1116);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(boton0, div, null);
    			append_dev(div, t0);
    			mount_component(boton1, div, null);
    			insert_dev(target, t1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const boton0_changes = {};
    			if (dirty & /*datos*/ 2) boton0_changes.documento = /*cliente*/ ctx[2];
    			boton0.$set(boton0_changes);
    			const boton1_changes = {};
    			if (dirty & /*datos*/ 2) boton1_changes.documento = /*cliente*/ ctx[2];
    			boton1.$set(boton1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(boton0.$$.fragment, local);
    			transition_in(boton1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(boton0.$$.fragment, local);
    			transition_out(boton1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(boton0);
    			destroy_component(boton1);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(50:4) <Cliente {cliente}>",
    		ctx
    	});

    	return block;
    }

    // (49:2) {#each datos as cliente}
    function create_each_block$1(ctx) {
    	let current;

    	const cliente_1 = new Cliente({
    			props: {
    				cliente: /*cliente*/ ctx[2],
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(cliente_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(cliente_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const cliente_1_changes = {};
    			if (dirty & /*datos*/ 2) cliente_1_changes.cliente = /*cliente*/ ctx[2];

    			if (dirty & /*$$scope, datos*/ 1026) {
    				cliente_1_changes.$$scope = { dirty, ctx };
    			}

    			cliente_1.$set(cliente_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(cliente_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(cliente_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(cliente_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(49:2) {#each datos as cliente}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let h1;
    	let t1;
    	let updating_busqueda;
    	let t2;
    	let div0;
    	let updating_cliente;
    	let t3;
    	let div1;
    	let current;

    	function buscar_busqueda_binding(value) {
    		/*buscar_busqueda_binding*/ ctx[6].call(null, value);
    	}

    	let buscar_props = {};

    	if (/*busqueda*/ ctx[0] !== void 0) {
    		buscar_props.busqueda = /*busqueda*/ ctx[0];
    	}

    	const buscar = new Buscar({ props: buscar_props, $$inline: true });
    	binding_callbacks.push(() => bind(buscar, "busqueda", buscar_busqueda_binding));

    	function cliente_1_cliente_binding(value_1) {
    		/*cliente_1_cliente_binding*/ ctx[7].call(null, value_1);
    	}

    	let cliente_1_props = {
    		$$slots: { default: [create_default_slot_1$3] },
    		$$scope: { ctx }
    	};

    	if (/*cliente*/ ctx[2] !== void 0) {
    		cliente_1_props.cliente = /*cliente*/ ctx[2];
    	}

    	const cliente_1 = new Cliente({ props: cliente_1_props, $$inline: true });
    	binding_callbacks.push(() => bind(cliente_1, "cliente", cliente_1_cliente_binding));
    	let each_value = /*datos*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "CLIENTES";
    			t1 = space();
    			create_component(buscar.$$.fragment);
    			t2 = space();
    			div0 = element("div");
    			create_component(cliente_1.$$.fragment);
    			t3 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(h1, file$8, 36, 0, 801);
    			attr_dev(div0, "class", "container svelte-yynlv5");
    			add_location(div0, file$8, 39, 0, 845);
    			attr_dev(div1, "class", "container svelte-yynlv5");
    			add_location(div1, file$8, 47, 0, 1035);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(buscar, target, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div0, anchor);
    			mount_component(cliente_1, div0, null);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const buscar_changes = {};

    			if (!updating_busqueda && dirty & /*busqueda*/ 1) {
    				updating_busqueda = true;
    				buscar_changes.busqueda = /*busqueda*/ ctx[0];
    				add_flush_callback(() => updating_busqueda = false);
    			}

    			buscar.$set(buscar_changes);
    			const cliente_1_changes = {};

    			if (dirty & /*$$scope, cliente*/ 1028) {
    				cliente_1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_cliente && dirty & /*cliente*/ 4) {
    				updating_cliente = true;
    				cliente_1_changes.cliente = /*cliente*/ ctx[2];
    				add_flush_callback(() => updating_cliente = false);
    			}

    			cliente_1.$set(cliente_1_changes);

    			if (dirty & /*datos*/ 2) {
    				each_value = /*datos*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(buscar.$$.fragment, local);
    			transition_in(cliente_1.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(buscar.$$.fragment, local);
    			transition_out(cliente_1.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			destroy_component(buscar, detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div0);
    			destroy_component(cliente_1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $jsonData;
    	validate_store(jsonData, "jsonData");
    	component_subscribe($$self, jsonData, $$value => $$invalidate(3, $jsonData = $$value));
    	const URL = getContext("URL");
    	let busqueda = "";
    	let cliente = {};

    	onMount(async () => {
    		const response = await fetch(URL.clientes);
    		const data = await response.json();
    		set_store_value(jsonData, $jsonData = data);
    	});

    	function buscar_busqueda_binding(value) {
    		busqueda = value;
    		$$invalidate(0, busqueda);
    	}

    	function cliente_1_cliente_binding(value_1) {
    		cliente = value_1;
    		$$invalidate(2, cliente);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("busqueda" in $$props) $$invalidate(0, busqueda = $$props.busqueda);
    		if ("cliente" in $$props) $$invalidate(2, cliente = $$props.cliente);
    		if ("$jsonData" in $$props) jsonData.set($jsonData = $$props.$jsonData);
    		if ("regex" in $$props) $$invalidate(4, regex = $$props.regex);
    		if ("datos" in $$props) $$invalidate(1, datos = $$props.datos);
    	};

    	let regex;
    	let datos;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*busqueda*/ 1) {
    			 $$invalidate(4, regex = new RegExp(busqueda, "i"));
    		}

    		if ($$self.$$.dirty & /*busqueda, $jsonData, regex*/ 25) {
    			 $$invalidate(1, datos = busqueda
    			? $jsonData.filter(item => regex.test(item.nombre))
    			: $jsonData);
    		}
    	};

    	return [
    		busqueda,
    		datos,
    		cliente,
    		$jsonData,
    		regex,
    		URL,
    		buscar_busqueda_binding,
    		cliente_1_cliente_binding
    	];
    }

    class Clientes extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Clientes",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/Contenido.svelte generated by Svelte v3.18.0 */
    const file$9 = "src/Contenido.svelte";

    function create_fragment$b(ctx) {
    	let main;
    	let t0;
    	let t1;
    	let current;

    	const route0 = new Route({
    			props: { path: "/", component: Inicio },
    			$$inline: true
    		});

    	const route1 = new Route({
    			props: { path: "/articulos", component: Articulos },
    			$$inline: true
    		});

    	const route2 = new Route({
    			props: { path: "/clientes", component: Clientes },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(route0.$$.fragment);
    			t0 = space();
    			create_component(route1.$$.fragment);
    			t1 = space();
    			create_component(route2.$$.fragment);
    			attr_dev(main, "id", "contenido");
    			attr_dev(main, "class", "svelte-1f922ib");
    			add_location(main, file$9, 14, 0, 273);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(route0, main, null);
    			append_dev(main, t0);
    			mount_component(route1, main, null);
    			append_dev(main, t1);
    			mount_component(route2, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			transition_in(route2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(route0);
    			destroy_component(route1);
    			destroy_component(route2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Contenido extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contenido",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.18.0 */
    const file$a = "src/App.svelte";

    // (47:0) <Router>
    function create_default_slot$4(ctx) {
    	let t;
    	let current;
    	const nav = new Nav({ $$inline: true });
    	const contenido = new Contenido({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(nav.$$.fragment);
    			t = space();
    			create_component(contenido.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(nav, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(contenido, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			transition_in(contenido.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			transition_out(contenido.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(nav, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(contenido, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$4.name,
    		type: "slot",
    		source: "(47:0) <Router>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$c(ctx) {
    	let t0;
    	let div0;
    	let t2;
    	let div1;
    	let current;

    	const router = new Router({
    			props: {
    				$$slots: { default: [create_default_slot$4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			div0.textContent = "😊";
    			t2 = space();
    			div1 = element("div");
    			div1.textContent = "😟";
    			attr_dev(div0, "id", "OK");
    			add_location(div0, file$a, 50, 0, 1014);
    			attr_dev(div1, "id", "KO");
    			add_location(div1, file$a, 51, 0, 1036);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div1, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const router_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self) {
    	const URL = {
    		articulos: "https://tiendabackend.herokuapp.com/api/articulos/",
    		clientes: "https://tiendabackend.herokuapp.com/api/clientes/"
    	};

    	setContext("URL", URL);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		
    	};

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    const app = new App({ target: document.body });

    return app;

}());
//# sourceMappingURL=bundle.js.map
