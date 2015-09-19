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


// the "Cantus" object itself
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
    // what we'll return
    var prom = new Promise(function(resolve, reject) {
        this._getResolve = resolve;
        this._getReject = reject;
    }.bind(this));
    // the actual request stuff; may be run *after* the function returns!
    this.ready.then(function() {
        var xhr = new XMLHttpRequest();
        xhr.addEventListener('load', this._loadGet);
        // TODO: add for "error" and "abort" events

        // TODO: add support for "id" field
        // get the URL
        var type = 'all';
        if ('string' === typeof args.type) {
            type = args.type;
        }
        var requestUrl = this._hateoas.browse[type];
        if (requestUrl === undefined) {
            // maybe they submitted a singular "type", so we'll try to convert it
            requestUrl = this._hateoas.browse[_typeSingularToPlural[type]];
            if (requestUrl === undefined) {
                // maybe it's just not valid
                _getReject('CantusJS: unknown type: "' + type + '"');
                return;
            }
        }
        xhr.open('GET', requestUrl);
        xhr.send();
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
        var xhr = new XMLHttpRequest();
        xhr.addEventListener('load', this._loadSearch);
        // TODO: add for "error" and "abort" events

        // get the URL
        var type = 'all';
        if ('string' === typeof args.type) {
            type = args.type;
        }
        var requestUrl = this._hateoas.browse[type];
        if (requestUrl === undefined) {
            // maybe they submitted a singular "type", so we'll try to convert it
            requestUrl = this._hateoas.browse[_typeSingularToPlural[type]];
            if (requestUrl === undefined) {
                // maybe it's just not valid
                _searchReject('CantusJS: unknown type: "' + type + '"');
                return;
            }
        }

        // prepare the request body
        var requestBody = {query: ''};
        if (args.query !== undefined) {
            requestBody.query = args.query;
        } else {
            // check for all the supported fields in "args"
            var query = '';
            var validField = ['id', 'name', 'description', 'mass_or_office', 'date', 'feast_code',
                'incipit', 'source', 'marginalia', 'folio', 'sequence', 'office', 'genre', 'position',
                'cantus_id', 'feast', 'mode', 'differentia', 'finalis', 'full_text',
                'full_text_manuscript', 'full_text_simssa', 'volpiano', 'notes', 'cao_concordances',
                'siglum', 'proofreader', 'melody_id', 'title', 'rism', 'provenance', 'century',
                'notation_style', 'editors', 'indexers', 'summary', 'liturgical_occasion',
                'indexing_notes', 'indexing_date', 'display_name', 'given_name', 'family_name',
                'institution', 'city', 'country', 'source_id', 'office_id', 'genre_id', 'feast_id',
                'provenance_id', 'century_id','notation_style_id'];
            for (i in validField) {
                var field = validField[i];
                if (args[field] !== undefined) {
                    query += ' ' + field + ':' + args[field];
                }
            }
            if (args['any'] !== undefined) {
                query += ' ' + args['any'];
            }

            requestBody.query = query;
        }

        // send the request
        xhr.open('SEARCH', requestUrl);
        xhr.send(JSON.stringify(requestBody));
    }.bind(this));
    // return the promise
    return prom;
};


// Cantus object's private methods
// ===============================
Cantus.prototype._submitAjax = function(httpMethod, url, data, loadListener, errorListener, abortListener) {
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
}

Cantus.prototype._getHateoas = function() {
    // Load the root directory's HATEOAS information, required for other URLs.
    this._hateoasPromise = new Promise(function(resolve, reject) {
        // TODO: move this Promise creation to _getHateoas() or else the server's URL can't be changed
        this._hateoasResolve = resolve;
        this._hateoasReject = reject;
    }.bind(this));
    this.ready = this._hateoasPromise;
    this._submitAjax('GET', this.serverUrl, null, this._loadHateoas);
};

Cantus.prototype._loadHateoas = function(event) {
    var xhr = event.target;
    if (200 != xhr.status) {
        _currentThis._hateoasReject(_ROOT_URL_FAILURE + xhr.status);
    } else {
        try {
            _currentThis._hateoas = JSON.parse(xhr.response).resources;
            _currentThis._hateoasResolve();
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
    var xhr = event.target;
    if (200 != xhr.status) {
        var errMsg = 'CantusJS: GET request failed (' + xhr.status + ' ' + xhr.statusText + ')';
        _currentThis._getReject(errMsg);
    } else {
        try {
            var data = JSON.parse(xhr.response);
            _currentThis._getResolve(data);
        } catch (possibleError) {
            if ('SyntaxError' === possibleError.name) {
                var errMsg = 'CantusJS: SyntaxError while parsing response from GET.';
                _currentThis._getReject(errMsg);
            } else {
                _currentThis._getReject(possibleError.name);
                throw possibleError;
            }
        }
    }
};

Cantus.prototype._loadSearch = function(event) {
    var xhr = event.target;
    if (200 != xhr.status) {
        var errMsg = 'CantusJS: SEARCH request failed (' + xhr.status + ' ' + xhr.statusText + ')';
        _currentThis._searchReject(errMsg);
    } else {
        try {
            var data = JSON.parse(xhr.response);
            _currentThis._searchResolve(data);
        } catch (possibleError) {
            if ('SyntaxError' === possibleError.name) {
                var errMsg = 'CantusJS: SyntaxError while parsing response from SEARCH.';
                _currentThis._searchReject(errMsg);
            } else {
                _currentThis._searchReject(possibleError.name);
                throw possibleError;
            }
        }
    }
};


// TODO: decide whether I need this next line...
window.Cantus = Cantus;
// export default _cantus;
