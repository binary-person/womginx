(function () {
    var proxy_dest_split = window.location.pathname.split(/(?=\/)/);
    var proxy_prefix = window.location.protocol + "//" + window.location.host;
    var proxy_path = proxy_dest_split.shift() + "/";
    var dest_fullurl = proxy_dest_split.join("").slice(1);
    var dest_schemeMatch = dest_fullurl.match(/^[^:]*/);
    var dest_scheme = dest_schemeMatch ? dest_schemeMatch[0] : "";
    var dest_hostMatch = dest_fullurl.match(/^[^:]*:\/\/([^/]*)/);
    var dest_host = dest_hostMatch ? dest_hostMatch[1] : "";
    var processed_flag_attribute = document.currentScript.getAttribute("processed-attribute");

    var absoluteMatch = /^(\/|https?:\/\/|data:image\/png;)/;

    var wbinfo = {}
    wbinfo.url = dest_fullurl;
    wbinfo.timestamp = ""; // time
    wbinfo.request_ts = ""; // time
    wbinfo.prefix = proxy_prefix + proxy_path;
    wbinfo.mod = "";
    wbinfo.top_url = proxy_prefix + proxy_path + dest_fullurl;
    wbinfo.is_framed = false;
    wbinfo.is_live = true;
    wbinfo.coll = "";
    wbinfo.proxy_magic = "";
    wbinfo.static_prefix = proxy_prefix + "/wombat/dist/";
    wbinfo.wombat_ts = ""; // time
    wbinfo.wombat_scheme = dest_scheme;
    wbinfo.wombat_host = dest_host;
    wbinfo.wombat_sec = "1"; // time

    wbinfo.wombat_opts = {};

    if (window && window._WBWombat && !window._wb_js_inited && !window._wb_wombat) {
        // fix google search replaceState
        window.history._womginx_replaceState = window.history.replaceState;
        window.history.replaceState = function (stateObj, title, url) {
            if (window.location.pathname.startsWith("/main/https://www.google.com")) {
                url = "";
            }
            return this._womginx_replaceState(stateObj, title, url);
        };

        // force reload discord when it pushStates to discord.com/app to fix broken UI
        window.history._womginx_pushState = window.history.pushState;
        window.history.pushState = function (stateObj, title, url) {
            this._womginx_pushState(stateObj, title, url);
            if (url === proxy_prefix + proxy_path + "https://discord.com/app") {
                window.location.reload();
            }
            return;
        };

        // disable Date.now as it breaks hashing functionality in sites like discord
        _WBWombat.prototype.initDateOverride = function () { };

        // disable making Math.random predictable or "replayable"
        _WBWombat.prototype.initSeededRandom = function () { };

        // disable storage override as it breaks some sites like discord
        _WBWombat.prototype.initStorageOverride = function () { };
        // wrap localStorage.get/setItem to mimick behavior of items only accessible per host
        // get local reference to localStorage in case sites like discord.com intentionally sets it to undefined
        var localStorage = window.localStorage;
        var localStorageSetItem = localStorage.setItem;
        var hostLocalStorage = {};
        try {
            if (localStorage.getItem(dest_host)) {
                hostLocalStorage = JSON.parse(localStorage.getItem(dest_host));
                if (typeof hostLocalStorage !== 'object') hostLocalStorage = {};
            }
        } catch (e) { }
        // set a timeout to save to localStorage in case scripts in a webpage makes 100 calls to setItem
        var timeoutLocalStorage = -1;
        var saveLocalStorage = function () {
            if (timeoutLocalStorage === -1) {
                timeoutLocalStorage = setTimeout(function () {
                    timeoutLocalStorage = -1;
                    localStorageSetItem.call(localStorage, dest_host, JSON.stringify(hostLocalStorage));
                }, 100);
            }
        };
        localStorage.key = function (number) {
            return Object.keys(hostLocalStorage)[number];
        };
        localStorage.getItem = function (key) {
            if (hostLocalStorage[key] === undefined) return null;
            return hostLocalStorage[key];
        };
        localStorage.setItem = function (key, value) {
            hostLocalStorage[key] = value;
            saveLocalStorage();
        };
        localStorage.removeItem = function (key) {
            delete hostLocalStorage[key];
            saveLocalStorage();
        };
        localStorage.clear = function () {
            hostLocalStorage = {};
            saveLocalStorage();
        };

        window._wb_wombat = new _WBWombat(window, wbinfo);
        window._wb_wombat.wombatInit();

        // fix wombat errors in cases of new Blob([]) without options argument
        window._womginx_Blob = window.Blob;
        window.Blob = function (data, options = {}) {
            return new window._womginx_Blob(data, options);
        };
        // add websocket origin support
        window._womginx_WebSocket = window.WebSocket;
        window.WebSocket = function(url, protocols) {
            return new window._womginx_WebSocket(url + '?womginx_ws_origin_header=' + dest_scheme + '://' + dest_host, protocols);
        };
        // fix rewriteWorker on instances of "TrustedScriptURL"
        // and also rewrite them and fetch the code using synchronous xhr to rewrite them using client js
        window._wb_wombat._womginx_rewriteWorker = window._wb_wombat.rewriteWorker;
        window._wb_wombat.rewriteWorker = function (workerUrl) {
            // convert rewriteWorker to string in cases of "TrustedScriptURL"
            workerUrl = workerUrl.toString();
            // snippet of code taken directly from
            // https://github.com/webrecorder/wombat/blob/61be8e9b67f21d6a0459633a2737cd72c6236a6b/src/wombat.js#L2508
            if (!workerUrl) return workerUrl;
            var isBlob = workerUrl.indexOf("blob:") === 0;
            var isJS = workerUrl.indexOf("javascript:") === 0;
            if (!isBlob && !isJS) {
                // fetch worker js synchronously and then replace workerUrl with blob to force rewriting
                var request = new XMLHttpRequest();
                request.open("GET", workerUrl, false);
                request.send();
                workerUrl = window.URL.createObjectURL(new Blob([request.responseText], { type: 'application/javascript' }));
            }
            return this._womginx_rewriteWorker(workerUrl);
        };

        // addStyles: if website for some reason has recursive css (ex. in file style.css, "import style.css"),
        // ignore already imported css to prevent client from crashing
        var addedStyles = [];
        var addStyleContent = function (cssText, relativePath, removeElem, async) {
            var style = document.createElement("style");
            if (relativePath) {
                var replacer = function (match, n1, n2, n3, offset, string) {
                    var rewrittenN2 = n2;
                    // check absolute path and append relativePath if necessary
                    if (absoluteMatch.test(n2)) {
                        rewrittenN2 = window._wb_wombat.rewriteUrl(n2);
                    } else {
                        rewrittenN2 = relativePath + n2
                    }
                    // @import url(https://something.com/other.css)
                    if (n1.startsWith("url") && string.slice(0, offset).trim().endsWith("@import")) {
                        addStyle(rewrittenN2, null, async);
                        return "''";
                    }
                    if (n1.startsWith("@import")) {
                        if (n2.trim()) {
                            // recursive add css document
                            addStyle(rewrittenN2, null, async);
                            return "";
                        } else {
                            // erase leftover from style_regex
                            return "";
                        }
                    }
                    return n1 + rewrittenN2 + n3;
                };
                style.textContent = cssText
                    .replace(window._wb_wombat.STYLE_REGEX, replacer)
                    .replace(window._wb_wombat.IMPORT_REGEX, replacer);;
            } else {
                style.textContent = cssText;
            }
            if (removeElem) {
                if (removeElem.tagName === "STYLE") {
                    removeElem.textContent = style.textContent;
                } else {
                    if (removeElem.parentNode) {
                        removeElem.parentNode.insertBefore(style, removeElem);
                    }
                    removeElem.remove();
                }
            } else {
                document.head.appendChild(style);
            }
        };
        var addStyle = function (linkToStyle, oldLinkElem, async = true) {
            if (addedStyles.includes(linkToStyle)) return;
            var request = new XMLHttpRequest(); // assume xmlhttprequest is already wrapped
            request.onload = function () {
                if (request.status < 400) {
                    addedStyles.push(linkToStyle);
                    var relativeMatch = /^[^]*\//;
                    var relativePath = linkToStyle.match(relativeMatch);
                    relativePath = relativePath ? relativePath[0] : "";
                    addStyleContent(request.responseText, relativePath, oldLinkElem);
                }
            };
            request.open("GET", linkToStyle, async);
            request.send();
        };
        window._wb_wombat._womginx_rewriteElem = window._wb_wombat.rewriteElem;
        window._wb_wombat.rewriteElem = function (elem) {
            // convert link spreadsheet into inline style tags for
            // js to handle the heavy lifting of regexing everything
            if (elem && elem.tagName === "LINK" && elem.rel === "stylesheet"
                && elem.getAttribute("href").indexOf("data:text/css") !== 0) {
                // addStyle(elem.getAttribute("href"), elem);
                // return true;
            } else if (elem.tagName === "STYLE") {
                // addStyleContent(elem.textContent, "", elem);
                // return true;
            }
            return this._womginx_rewriteElem(elem);
        };

        window.addEventListener("DOMContentLoaded", function () {
            var elements = Array.from(document.getElementsByTagName("*"));
            for (var i = 0; i < elements.length; i++) {
                // rewrite img tags regardless, since nginx replaces it with src to handle
                // script tags but not srcset of the img tags
                if (elements[i].tagName !== "IMG" && elements[i].hasAttribute(processed_flag_attribute)) {
                    continue;
                }
                if (elements[i].tagName === "SCRIPT" && absoluteMatch.test(elements[i].src)) {
                    var script = elements[i].cloneNode();
                    elements[i].parentNode.insertBefore(script, elements[i]);
                } else {
                    window._wb_wombat.rewriteElem(elements[i]);
                }
            }
        });

        var getProxyUrl = function () {
            return window.location.href.match(/^https?:\/\/[^\/]+\/main(\/[^_\/]+_)?\/(.*)/)[2];
            // return window.location.href;
        };
        // unfortunately, I was not able to find another way of copying the window.location
        // without it throwing illegal invocation or losing setter functionality like window.currentLocation.href = "something"
        var previousLocation = window.location.href;
        var locationObj = new URL(getProxyUrl());
        var updateLocationObj = function () {
            if (window.location.href !== previousLocation) {
                locationObj = new URL(getProxyUrl());
            }
        };
        var currentLocationProp = {
            get ancestorOrigins() {
                updateLocationObj();
                return window.location.ancestorOrigins;
            },
            get href() {
                updateLocationObj();
                return locationObj.href;
            },
            set href(value) {
                window.location.href = window._wb_wombat.rewriteUrl(value);
            },
            get protocol() {
                updateLocationObj();
                return locationObj.protocol;
            },
            set protocol(value) {
                window.location.protocol = value;
            },
            get host() {
                updateLocationObj();
                return locationObj.host;
            },
            set host(value) {
                window.location.host = value;
            },
            get hostname() {
                updateLocationObj();
                return locationObj.hostname;
            },
            set hostname(value) {
                window.location.hostname = value;
            },
            get port() {
                updateLocationObj();
                return locationObj.port;
            },
            set port(value) {
                window.location.port = value;
            },
            get pathname() {
                updateLocationObj();
                // https://discord.com/(app|channels) breaks if pathname is rewritten, and is the only site
                // that does this, so I am hard coding an exception. However, the discord.com "breaks"
                // if the pathname is *not* rewritten since not rewriting it "breaks" the code which
                // upon successful execution, will break the website. So.. breaking the code to not break the site
                if (/^https:\/\/discord\.com\/(app|channels)/.test(locationObj.href)) {
                    return window.location.pathname;
                }
                return locationObj.pathname;
            },
            set pathname(value) {
                window.location.pathname = value;
            },
            get search() {
                updateLocationObj();
                return locationObj.search;
            },
            set search(value) {
                window.location.search = value;
            },
            get hash() {
                updateLocationObj();
                return locationObj.hash;
            },
            set hash(value) {
                window.location.hash = value;
            },
            get origin() {
                updateLocationObj();
                return locationObj.origin;
            },
            assign(url) {
                window.location.assign(window._wb_wombat.rewriteUrl(url));
            },
            reload() {
                window.location.reload();
            },
            replace(url) {
                window.location.replace(window._wb_wombat.rewriteUrl(url));
            },
            toString() {
                updateLocationObj();
                return locationObj.href;
            }
        };
        Object.defineProperty(window, "currentLocation", {
            get: function () {
                return currentLocationProp;
            },
            set: function (value) {
                window.location = window._wb_wombat.rewriteUrl(value);
            },
        });
    }
})();