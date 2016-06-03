// -*- coding: utf-8 -*-
//-------------------------------------------------------------------------------------------------
// Program Name:           CantusJS
// Program Description:    It's a simple JavaScript library for accessing a Cantus API server.
//
// Filename:               cantus.src.js
// Purpose:                It's the whole thing.
//
// Copyright (C) 2015 Christopher Antila
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
//-------------------------------------------------------------------------------------------------


// This is a polyfill for the Array.includes() function. Copied from:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes
if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement /*, fromIndex*/ ) {
        'use strict';
        let O = Object(this);
        let len = parseInt(O.length) || 0;
        if (len === 0) {
            return false;
        }
        let n = parseInt(arguments[1]) || 0;
        let k;
        if (n >= 0) {
            k = n;
        } else {
            k = len + n;
            if (k < 0) {k = 0;}
        }
        let currentElement;
        while (k < len) {
            currentElement = O[k];
            if (searchElement === currentElement ||
                (searchElement !== searchElement && currentElement !== currentElement)) {
                    return true;
                }
            k++;
        }
        return false;
    };
}


const VALID_FIELDS = [
    'id', 'name', 'description', 'mass_or_office', 'date', 'feast_code', 'incipit', 'source',
    'marginalia', 'folio', 'sequence', 'office', 'genre', 'position', 'cantus_id', 'feast', 'mode',
    'differentia', 'finalis', 'full_text', 'full_text_manuscript', 'full_text_simssa', 'volpiano',
    'notes', 'cao_concordances', 'siglum', 'proofreader', 'melody_id', 'title', 'rism', 'provenance',
    'century', 'notation_style', 'editors', 'indexers', 'summary', 'liturgical_occasion',
    'indexing_notes', 'indexing_date', 'display_name', 'given_name', 'family_name', 'institution',
    'city', 'country', 'source_id', 'office_id', 'genre_id', 'feast_id', 'provenance_id',
    'century_id','notation_style_id', 'any', 'type'
];


const _TYPE_SINGULAR_TO_PLURAL = {
    'siglum': 'sigla',
    'office': 'offices',
    'indexer': 'indexers',
    'century': 'centuries',
    'source_status': 'source_statii',
    'chant': 'chants',
    'source': 'sources',
    'portfolio': 'portfolia',
    'segment': 'segments',
    'feast': 'feasts',
    'notation': 'notations',
    'genre': 'genres',
    'provenance': 'provenances',
};


const _TYPE_PLURAL_TO_SINGULAR = {
    'sigla': 'siglum',
    'offices': 'office',
    'indexers': 'indexer',
    'centuries': 'century',
    'source_statii': 'source_status',
    'chants': 'chant',
    'sources': 'source',
    'portfolia': 'portfolio',
    'segments': 'segment',
    'feasts': 'feast',
    'notations': 'notation',
    'genres': 'genre',
    'provenances': 'provenance',
};


// error messages
const _ROOT_URL_FAILURE = 'CantusJS: Root URL request failed with code ';


// TODO: this is such a hack...
let _currentThis = null;


// Module-level functions
// ======================

/**  Add " and " to a string if there is a space in it, and the contents are not already quoted.
 *
 * @param (str) string - The string to quote.
 * @returns (str) The quoted string.
 */
function quoteIfNeeded(string) {
    if  (   (string.indexOf(' ') >= 0)
        &&  (   string.length < 2
            || (   !(string.charAt(0) === '"' && string.charAt(string.length - 1) === '"')
                && !(string.charAt(0) === "'" && string.charAt(string.length - 1) === "'")
               )
            )
        )
        {
           string = `"${string}"`;
    }

    return string;
};


function convertTypeNumber(type, to) {
    // Convert a resource type from singular grammatical number to plural, or vice versa.
    //
    // Parameters:
    // ===========
    // - type (string) The resource type to convert.
    // - to (string) Whether to convert the grammatical number to "singular" or "plural".
    //
    // Returns:
    // ========
    // A string with the resource type in the requested grammatical number. If the "type" is already
    // in the requested grammatical number, it will be returned as-is. (That is, converting
    // ``'feasts'`` to plural will safely return ``'feasts'``). If either "type" or "to" are not a
    // string with a valid type or grammatical number, the function returns ``undefined``.
    //

    if ('singular' === to) {
        if (_TYPE_PLURAL_TO_SINGULAR[type]) {
            return _TYPE_PLURAL_TO_SINGULAR[type];
        } else if (_TYPE_SINGULAR_TO_PLURAL[type]) {
            return type;
        }
    } else if ('plural' === to) {
        if (_TYPE_SINGULAR_TO_PLURAL[type]) {
            return _TYPE_SINGULAR_TO_PLURAL[type];
        } else if (_TYPE_PLURAL_TO_SINGULAR[type]) {
            return type;
        }
    }

    return undefined;
}


function _addRequestHeaders(xhr, args) {
    // Given an XMLHttpRequest instance and the "args" provided to get() or search(), add any HTTP
    // headers to the XMLHttpRequest as required by the args. All unknown members in "args" are
    // silently ignored.
    //
    // NOTE that this function does not currently verify supplied header values.
    //
    // Params:
    // =======
    // - xhr (XMLHttpRequest) The request to which to add HTTP headers.
    // - args (Object) An object that may contain one of the header fields (see below).
    //
    // Returns:
    // ========
    // The XMLHttpRequest object, with headers.
    //
    // Supported Headers:
    // ==================
    // - X-Cantus-Page (from the "page" member)
    // - X-Cantus-Per-Page (from the "per_page" member)
    // - X-Cantus-Sort (from the "sort" member)
    // - X-Cantus-Fields (from the "fields" member)

    if (args['page']) {
        xhr.setRequestHeader('X-Cantus-Page', args['page']);
    }
    if (args['per_page']) {
        xhr.setRequestHeader('X-Cantus-Per-Page', args['per_page']);
    }
    if (args['sort']) {
        xhr.setRequestHeader('X-Cantus-Sort', args['sort']);
    }
    if (args['fields']) {
        xhr.setRequestHeader('X-Cantus-Fields', args['fields']);
    }

    return xhr;
};

function _dumbXhrThing() {
    // Simply returns a new XMLHttpRequest. It's because I couldn't figure out how to mock the
    // XMLHttpRequest properly, and I didn't think it was worth the effort.
    return new XMLHttpRequest();
};

function _submitAjax(httpMethod, url, data, loadListener, errorListener, abortListener) {
    // This function submits the AJAX requests. It's separated here so the actual functions used
    // for the request is abstracted, and to allow easier mocking in unit tests.
    //
    // Params:
    // =======
    // - httpMethod (str) The HTTP method for the request.
    // - url (str) The URL for the request.
    // - data (Object) An object with two members:
    //     - args (Object) the "args" submitted to search() or get().
    //     - body (str) The request body to submit; may be null.
    // - loadListener (func) A function to call when the request finishes.
    // - errorListener (func) A function to call if the request errors.
    // - abortListener (func) A function to call if the reqeust aborts.
    //
    // Returns:
    // ========
    // Nothing. However, one of the "listener" functions will be called.

    let xhr = cantusModule._dumbXhrThing();
    xhr.open(httpMethod, url);  // NOTE: you must call open() before setting request headers
    xhr = cantusModule._addRequestHeaders(xhr, data.args);

    xhr.addEventListener('load', loadListener);
    if (undefined !== errorListener) {
        xhr.addEventListener('error', errorListener);
    }
    if (undefined !== abortListener) {
        xhr.addEventListener('abort', abortListener);
    }
    if (null !== data.body) {
        xhr.send(data.body);
    } else {
        xhr.send();
    }
};


function HateoasError(message) {
    // Raise this error when there's a HATEOAS-related problem, like no data can be loaded from the
    // root URL, or you're asked to find a resource with a type the server doesn't know.
    this.name = 'HateoasError';
    this.message = message || 'HATEOAS-related error';
    this.stack = (new Error()).stack;
};
HateoasError.prototype = Object.create(Error.prototype);
HateoasError.prototype.constructor = HateoasError;


function _findUrlFromType(type, hateoas, defaultAll, id) {
    // Given a resource type and HATEOAS directory, find the server's URL for that type. If the URL
    // can't be found, and the third parameter ("defaultAll") is omitted or evaluates to true, the
    // URL for "all" types will be returned *unless* the "id" argument is provided.
    //
    // Parameters:
    // ===========
    // - type (str) The resource type to search for; may be singular or plural.
    // - hateaos (object) Mapping from resource type to URL; provide the root HATEOAS object that
    //                    contains both "browse" and "view" resources.
    // - defaultAll (bool) Whether to return the "all" URL if "type" cannot be found; defaults to true.
    // - id (str or int) Optional "id" of a single resource to request.
    //
    // Raises:
    // =======
    // - HateoasError: when the resource type cannot be found, and
    //                    - all" cannot be found, or
    //                    - the "defaultAll" argument evaluates to false, or
    //                    - the "id" argument is provided
    //
    // Returns:
    // ========
    // The URL from the "hateoas" dict, with "id" substituted appropriately.

    // set up
    if (undefined === defaultAll) {
        defaultAll = true;
    }
    type = convertTypeNumber(type, 'plural');
    let requestUrl;

    // fetch the URL
    if (id) {
        requestUrl = hateoas['view'][type];
        // if we got a URL, fill in the "id" part
        if (undefined !== requestUrl) {
            requestUrl = requestUrl.replace('id?', id);
        }
    } else {
        requestUrl = hateoas['browse'][type];
        // if we didn't get a URL, maybe we can use the "all" type?
        if (undefined === requestUrl && defaultAll) {
            requestUrl = hateoas['browse']['all'];
        }
    }

    // return the URL if we have one, or else panic
    if (undefined !== requestUrl) {
        return requestUrl;
    } else {
        throw new HateoasError('Could not find a URL for "' + type + '" resources.');
    }
};


function QueryError(message) {
    // Raise this error when there's an error related to parsing a search query, and you want to
    // tell the user about it.
    this.name = 'QueryError';
    this.message = message || 'query-related error';
    this.stack = (new Error()).stack;
};
QueryError.prototype = Object.create(Error.prototype);
QueryError.prototype.constructor = QueryError;


function _prepareSearchRequestBody(query) {
    // Given the "query" submitted by the user, validate the query and prepare the request body as
    // it should be submitted to the Cantus API server.
    //
    // Parameters:
    // - query (object) the "args" submitted to search()
    //
    // Raises:
    // - QueryError: when the "query" contains invalid fields, or is invalid for another reason.
    //
    // Returns:
    // The request body, ready for submission to the Cantus API server.

    // These aren't search fields, but they may appear in the "query" argument because they're used
    // to set request headers. We'll just ignore them.
    let headerFields = ['page', 'per_page', 'fields', 'sort'];

    let queryStr = '';
    for (let field in query) {
        // NB: if we were using proper JavaScript Objects, that inherited members from a prototype,
        //     we would need an additional check with hasOwnProperty()
        if (VALID_FIELDS.includes(field)) {
            if ('any' === field) {
                queryStr += ' ' + query['any'];
            } else if ('type' !== field) {
                // ignore "type"
                if (query[field] === '') {
                    queryStr += ' ' + field + ':*';
                } else {
                    queryStr += ' ' + field + ':' + quoteIfNeeded(query[field]);
                }
            }
        } else if (!headerFields.includes(field)) {
            throw new QueryError('Invalid field in query: "' + field + '"');
        }
    }

    // remove the leading space
    if (queryStr.length > 1) {
        queryStr = queryStr.slice(1);
    }

    return JSON.stringify({query: queryStr});
};


function _loadResponse(event, resolve, reject) {
    // Given the "load" event from an XMLHttpRequest, and the resolve and reject functions of a
    // Promise, try to parse the response body into a JavaScript object and submit it to the resolve
    // function. If that fails, or if the XMLHttpReqeust response code was not 200, use the reject
    // function.
    //
    // Parameters
    // ==========
    // - event (event) The XMLHttpRequest "load" event.
    // - resolve (function) The "resolve" function for a Promise.
    // - reject (function) The "reject" function for a Promise.
    //
    // NOTE: for a description of the arguments given to the resolve and reject functions, refer to
    // the get() function documentation.

    let xhr = event.target;
    if (200 != xhr.status) {
        let errObj = {code: xhr.status, reason: xhr.statusText,
                      response: xhr.status + ': ' + xhr.statusText};
        reject(errObj);
    } else {
        try {
            // prepare the response body
            let data = JSON.parse(xhr.response);
            if (undefined === data.sort_order) {
                let sort_order = [];
                for (let item in data) {
                    if ('resources' !== item) {
                        sort_order.push(item);
                    }
                }
                data['sort_order'] = sort_order;
            }

            // prepare the response headers
            let headers = {
                'version': xhr.getResponseHeader('X-Cantus-Version'),
                'include_resources': xhr.getResponseHeader('X-Cantus-Include-Resources'),
                'fields': xhr.getResponseHeader('X-Cantus-Fields'),
                'extra_fields': xhr.getResponseHeader('X-Cantus-Extra-Fields'),
                'total_results': xhr.getResponseHeader('X-Cantus-Total-Results'),
                'page': xhr.getResponseHeader('X-Cantus-Page'),
                'per_page': xhr.getResponseHeader('X-Cantus-Per-Page'),
                'sort': xhr.getResponseHeader('X-Cantus-Sort'),
            };
            data['headers'] = headers;

            resolve(data);
        } catch (possibleError) {
            if ('SyntaxError' === possibleError.name) {
                let errObj = {code: 0, reason: 'internal error',
                              response: 'CantusJS: SyntaxError while parsing response.'};
                reject(errObj);
            } else {
                let errObj = {code: 0, reason: 'internal error',
                              response: 'CantusJS: ' + possibleError.name + ' while parsing response.'};
                reject(errObj);
                throw possibleError;
            }
        }
    }
};

function _abortRequest(event, reject) {
    // Call this function when the XMLHttpRequest was aborted.
    //
    // Params
    // ======
    // - event (event) The DOM event given to the "cancel" event listener.
    // - reject (function) The "reject" function of a Promise to call with the bad news.

    reject({code: 0, reason: 'Request aborted', response: 'The XMLHttpRequest was aborted.'});
};

function _errorRequest(event, reject) {
    // Call this function when there's an error during the XMLHttpRequest.
    //
    // Params
    // ======
    // - event (event) The DOM event given to the "error" event listener.
    // - reject (function) The "reject" function of a Promise to call with the bad news.

    reject({code: 0, reason: 'Request errored', response: 'Error during the XMLHttpRequest.'});
};


// The "Cantus" Object
// ===================
let Cantus = function (serverUrl) {
    _currentThis = this;
    this.setServerUrl(serverUrl);
};


// Cantus object's public attributes
// =================================
Cantus.prototype.serverUrl = null;
Cantus.prototype.ready = null;


// Cantus object's private attributes
// ==================================
Cantus.prototype._hateoasPromise = null;
Cantus.prototype._hateoas = null;
Cantus.prototype._hateoasResolve = null;
Cantus.prototype._hateoasReject = null;
Cantus.prototype._getResolve = null;
Cantus.prototype._getReject = null;
Cantus.prototype._searchResolve = null;
Cantus.prototype._searchReject = null;


// Cantus object's public methods
// ==============================
Cantus.prototype.setServerUrl = function(toThis) {
    this.serverUrl = toThis;
    this._getHateoas();
};

Cantus.prototype.get = function(args) {
    // NOTE: keep this in sync with the README
    // Submit a GET request to the Cantus server.
    //
    // Parameters
    // ==========
    // - args (Object) Arguments to use to create the request. All are optional. Possibilities are:
    //     - id: to fetch a resource with a known ID
    //     - type: to fetch a resource of a particular type
    //     - page: the page number of results to fetch
    //     - per_page: the number of results to return on every "page"
    //     - fields: comma-separated list of fields to include in the results
    //     - sort: value for the "X-Cantus-Sort" HTTP header
    //
    // Returns
    // =======
    // This function returns a Promise. Refer to the description above to know what this means.
    //
    // - then(): The Promise returned by this function is resolved to the then() function when the
    //     server returns a "200" response code, meaning that the requested resource(s) was/were
    //     found and returned without issue. This function is given a single argument, which is the
    //     response body from the Cantus server, which is fully defined in the Cantus API. It looks
    //     approximately like this:
    //
    //         {
    //             '123': {'type': 'chant', 'id': '123', 'incipit': 'Et quoniam...'},
    //             '666': {'type': 'chant', 'id': '666', 'incipit': 'Yikes!'},
    //             'resources': {'123': {'self': 'http://cantus.org/123'},
    //                           '666': {'self': 'http://cantus.org/666'}},
    //             'sort_order': ['123', '666']
    //         }
    //
    // - catch(): The Promise returned by this function is resolved to the catch() function when the
    //     server returns any response code other than 200 *or* when the request fails or any other
    //     reason (the user cancelled it, the computer is disconnected from the internet, etc.).
    //     This function is given a single argument: a JavaScript Object with three members (code,
    //     reason, and response). For example:
    //
    //         {
    //             'code': 404,
    //             'reason': 'Not Found',
    //             'response': '404: Not Found'
    //         }
    //
    //     This argument means the request was completed, and the server responded that there are no
    //     resources that satisfy the request (e.g., the "id" was wrong, the search request was too
    //     specific, or similar).
    //
    //     If the request fails in the browser (meaning the "error" or "abort" event happened), the
    //     "code" member is set to 0 (zero) which allows the following:
    //
    //         .catch(function(response) {
    //             if (response.code > 0) {
    //                 // we know the server responded with an error
    //             } else {
    //                 // we know the server never got the request
    //             }
    //         }
    //
    //     Finally, it should be noted that, although the "response" member is currently redundant
    //     because it contains the same information as the code and reason, this may not always be
    //     the case. Future versions of Abbot may return more informative responses to an error,
    //     describing in more detail how and why the request failed. When that happens, the
    //     "response" member will become significantly more helpful!
    // NOTE: keep this in sync with the README

    // what we'll return
    let prom = new Promise(function(resolve, reject) {
        this._getResolve = resolve;
        this._getReject = reject;
    }.bind(this));

    // the actual request stuff; may be run *after* the function returns!
    this.ready.then(function() {
        let requestUrl = cantusModule._findUrlFromType(args.type, this._hateoas, true, args['id']);
        cantusModule._submitAjax('GET', requestUrl, {args: args, body: null}, this._loadGet,
                                 this._errorGet, this._abortGet);
    }.bind(this));

    // return the promise
    return prom;
};

Cantus.prototype.search = function(args) {
    // NOTE: keep this in sync with the README
    // Submit a SEARCH request to the Cantus server.
    //
    // Parameters:
    // ===========
    // - args (Object) Arguments to use to create the request. All are optional. This includes all
    //     the fields listed for get() function *except* "id". If you know a resource ID, use get().
    //     In addition, this function accepts any field name associated with any resource type
    //     defined in the Cantus API. This function does not check that the fields requested are in
    //     fact valid for the resource type requested in the "type" member (that is, this function
    //     will not stop you from searching for the "first_name" of a "chant" for example).
    //
    // Returns:
    // ========
    // The "return behaviour" of this function is identical to get(). Please refer to that
    // function's documentation.
    // NOTE: keep this in sync with the README

    // what we'll return
    let prom = new Promise(function(resolve, reject) {
        this._searchResolve = resolve;
        this._searchReject = reject;
    }.bind(this));

    // the actual request stuff; may be run *after* the function returns!
    this.ready.then(function() {
        let requestBody;
        try {
            requestBody = cantusModule._prepareSearchRequestBody(args);
        } catch (exc) {
            if (exc instanceof QueryError) {
                this._searchReject(exc.message);
            } else {
                this._searchReject('Unrecoverable error while parsing query');
            }
            return prom;
        }
        let requestUrl = cantusModule._findUrlFromType(args.type, this._hateoas, true);
        cantusModule._submitAjax('SEARCH', requestUrl, {args: args, body: requestBody},
                                 this._loadSearch, this._errorSearch, this._abortSearch);
    }.bind(this));

    // return the promise
    return prom;
};


// Cantus object's private methods
// ===============================
Cantus.prototype._getHateoas = function() {
    // Load the root directory's HATEOAS information, required for other URLs.
    this._hateoasPromise = new Promise(function(resolve, reject) {
        this._hateoasResolve = resolve;
        this._hateoasReject = reject;
    }.bind(this));
    this.ready = this._hateoasPromise;
    cantusModule._submitAjax('GET', this.serverUrl, {args: {}, body: null}, this._loadHateoas);
};

Cantus.prototype._loadHateoas = function(event) {
    let xhr = event.target;
    if (200 != xhr.status) {
        _currentThis._hateoasReject(_ROOT_URL_FAILURE + xhr.status);
    } else {
        try {
            _currentThis._hateoas = JSON.parse(xhr.response).resources;
            _currentThis._hateoasResolve(); // TODO: move the "_hateoas-setting" bit to _hateoasResolve so that this can use _loadResponse()
        } catch (possibleError) {
            if ('SyntaxError' === possibleError.name) {
                let errMsg = 'CantusJS: SyntaxError while parsing response from the root URL.';
                _currentThis._hateoasReject(errMsg);
            } else {
                _currentThis._hateoasReject(possibleError.name);
                throw possibleError;
            }
        }
    }
};

Cantus.prototype._loadGet = function(event) {
    cantusModule._loadResponse(event, _currentThis._getResolve, _currentThis._getReject);
};

Cantus.prototype._abortGet = function(event) {
    cantusModule._abortRequest(event, _currentThis._getReject);
};

Cantus.prototype._errorGet = function(event) {
    cantusModule._errorRequest(event, _currentThis._getReject);
};

Cantus.prototype._loadSearch = function(event) {
    cantusModule._loadResponse(event, _currentThis._searchResolve, _currentThis._searchReject);
};

Cantus.prototype._abortSearch = function(event) {
    cantusModule._abortRequest(event, _currentThis._searchReject);
};

Cantus.prototype._errorSearch = function(event) {
    cantusModule._errorRequest(event, _currentThis._searchReject);
};


const cantusModule = {
    Cantus: Cantus, _submitAjax: _submitAjax, _findUrlFromType: _findUrlFromType,
    _prepareSearchRequestBody: _prepareSearchRequestBody, _HateoasError: HateoasError,
    _QueryError: QueryError, _loadResponse: _loadResponse, _abortRequest: _abortRequest,
    _errorRequest: _errorRequest, _addRequestHeaders: _addRequestHeaders, _dumbXhrThing:_dumbXhrThing,
    convertTypeNumber: convertTypeNumber, VALID_FIELDS: VALID_FIELDS, quoteIfNeeded: quoteIfNeeded,
};

export {cantusModule};
export default cantusModule;
