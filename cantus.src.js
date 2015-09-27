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
        var O = Object(this);
        var len = parseInt(O.length) || 0;
        if (len === 0) {
            return false;
        }
        var n = parseInt(arguments[1]) || 0;
        var k;
        if (n >= 0) {
            k = n;
        } else {
            k = len + n;
            if (k < 0) {k = 0;}
        }
        var currentElement;
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


const _typeSingularToPlural = {
    'siglum': 'sigla',
    'office': 'offices',
    'indexer': 'indexers',
    'century': 'centuries',
    'source_status': 'source_statii',
    'chant': 'chants',
    'source': 'sources',
    'cantusid': 'cantusids',
    'portfolio': 'portfolia',
    'segment': 'segments',
    'feast': 'feasts',
    'notation': 'notations',
    'genre': 'genres',
    'provenance': 'provenances'
}


// error messages
const _ROOT_URL_FAILURE = 'CantusJS: Root URL request failed with code ';


// TODO: this is such a hack...
var _currentThis = null;


// Module-level functions
// ======================
function _submitAjax(httpMethod, url, data, loadListener, errorListener, abortListener) {
    // This function submits the AJAX requests. It's separated here so the actual functions used
    // for the request is abstracted, and to allow easier mocking in unit tests.
    //
    // Params:
    // - httpMethod (str) The HTTP method for the request.
    // - url (str) The URL for the request.
    // - data (str) The request body, or "null".
    // - loadListener (func) A function to call when the request finishes.
    // - errorListener (func) A function to call if the request errors.
    // - abortListener (func) A function to call if the reqeust aborts.
    //
    // Returns:
    // Nothing. However, one of the "listener" functions will be called.

    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', loadListener);
    if (undefined !== errorListener) {
        xhr.addEventListener('error', errorListener);
    }
    if (undefined !== abortListener) {
        xhr.addEventListener('abort', abortListener);
    }
    xhr.open(httpMethod, url);
    if (null !== data) {
        xhr.send(data);
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


function _findUrlFromType(type, hateoas, defaultAll) {
    // Given a resource type and HATEOAS directory, find the server's URL for that type. If the URL
    // can't be found, and the third parameter ("defaultAll") is omitted or evaluates to true, the
    // URL for "all" types will be returned.
    //
    // Parameters:
    // - type (str) the resource type to search for; may be singular or plural
    // - hateaos (object) mapping from resource type to URL; provide browse- or search-specific obj
    // - defaultAll (bool) whether to return the "all" URL if "type" cannot be found; defaults to true
    //
    // Raises:
    // - HateoasError: when the resource type cannot be found, and either "all" cannot be found, or
    //                 the "defaultAll" parameter evaluates to false
    //
    // Returns:
    // The URL from the "hateoas" dict.

    if ('undefined' === typeof defaultAll) {
        defaultAll = true;
    }

    var requestUrl = hateoas[type];
    if (requestUrl === undefined) {
        requestUrl = hateoas[_typeSingularToPlural[type]];
    }
    if (requestUrl === undefined && defaultAll) {
        requestUrl = hateoas['all'];
    }
    if (requestUrl === undefined) {
        throw new HateoasError('Could not find a URL for "' + type + '" resources.');
    } else {
        return requestUrl;
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

    var validFields = ['id', 'name', 'description', 'mass_or_office', 'date', 'feast_code',
        'incipit', 'source', 'marginalia', 'folio', 'sequence', 'office', 'genre', 'position',
        'cantus_id', 'feast', 'mode', 'differentia', 'finalis', 'full_text',
        'full_text_manuscript', 'full_text_simssa', 'volpiano', 'notes', 'cao_concordances',
        'siglum', 'proofreader', 'melody_id', 'title', 'rism', 'provenance', 'century',
        'notation_style', 'editors', 'indexers', 'summary', 'liturgical_occasion',
        'indexing_notes', 'indexing_date', 'display_name', 'given_name', 'family_name',
        'institution', 'city', 'country', 'source_id', 'office_id', 'genre_id', 'feast_id',
        'provenance_id', 'century_id','notation_style_id', 'any', 'type'];

    var queryStr = '';
    for (var field in query) {
        // NB: if we were using proper JavaScript Objects, that inherited members from a prototype,
        //     we would need an additional check with hasOwnProperty()
        if (validFields.includes(field)) {
            if ('any' === field) {
                queryStr += ' ' + query['any'];
            } else if ('type' === field) {
                // ignore "type"
            } else {
                queryStr += ' ' + field + ':' + query[field];
            }
        } else {
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

    var xhr = event.target;
    if (200 != xhr.status) {
        var errObj = {code: xhr.status, reason: xhr.statusText,
                      response: xhr.status + ': ' + xhr.statusText};
        reject(errObj);
    } else {
        try {
            var data = JSON.parse(xhr.response);
            resolve(data);
        } catch (possibleError) {
            if ('SyntaxError' === possibleError.name) {
                var errObj = {code: 0, reason: 'internal error',
                              response: 'CantusJS: SyntaxError while parsing response.'};
                reject(errObj);
            } else {
                var errObj = {code: 0, reason: 'internal error',
                              response: 'CantusJS: ' + possibleError.name + ' while parsing response.'};
                reject(errObj);
                throw possibleError;
            }
        }
    }
};


// The "Cantus" Object
// ===================
var Cantus = function (serverUrl) {
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
    // TODO: add support for "id" field

    // what we'll return
    var prom = new Promise(function(resolve, reject) {
        this._getResolve = resolve;
        this._getReject = reject;
    }.bind(this));

    // the actual request stuff; may be run *after* the function returns!
    this.ready.then(function() {
        var requestUrl = cantusModule._findUrlFromType(args.type, this._hateoas.browse, true);
        cantusModule._submitAjax('GET', requestUrl, null, this._loadGet);
        // TODO: add for "error" and "abort" events
    }.bind(this));

    // return the promise
    return prom;
};

Cantus.prototype.search = function(args) {

    // what we'll return
    var prom = new Promise(function(resolve, reject) {
        this._searchResolve = resolve;
        this._searchReject = reject;
    }.bind(this));

    // the actual request stuff; may be run *after* the function returns!
    this.ready.then(function() {
        try {
            var requestBody = cantusModule._prepareSearchRequestBody(args);
        } catch (exc) {
            if (exc instanceof QueryError) {
                this._searchReject(exc.message);
            } else {
                this._searchReject('Unrecoverable error while parsing query');
            }
            return prom;
        }
        var requestUrl = cantusModule._findUrlFromType(args.type, this._hateoas.browse, true);
        cantusModule._submitAjax('SEARCH', requestUrl, requestBody, this._loadSearch);
        // TODO: add for "error" and "abort" events
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
    cantusModule._submitAjax('GET', this.serverUrl, null, this._loadHateoas);
};

Cantus.prototype._loadHateoas = function(event) {
    var xhr = event.target;
    if (200 != xhr.status) {
        _currentThis._hateoasReject(_ROOT_URL_FAILURE + xhr.status);
    } else {
        try {
            _currentThis._hateoas = JSON.parse(xhr.response).resources;
            _currentThis._hateoasResolve(); // TODO: move the "_hateoas-setting" bit to _hateoasResolve so that this can use _loadResponse()
        } catch (possibleError) {
            if ('SyntaxError' === possibleError.name) {
                var errMsg = 'CantusJS: SyntaxError while parsing response from the root URL.';
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

Cantus.prototype._loadSearch = function(event) {
    cantusModule._loadResponse(event, _currentThis._searchResolve, _currentThis._searchReject);
};


var cantusModule = {Cantus: Cantus, _submitAjax: _submitAjax, _findUrlFromType: _findUrlFromType,
                    _prepareSearchRequestBody: _prepareSearchRequestBody, _HateoasError: HateoasError,
                    _QueryError: QueryError, _loadResponse: _loadResponse};

// TODO: find a better solution for this than commenting
// window.cantusjs = cantusModule;
export default cantusModule;
