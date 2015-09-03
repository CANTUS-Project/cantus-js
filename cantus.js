var _typeSingularToPlural = {
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


// the "cantus" object itself
var _cantus = {
    serverUrl: 'http://abbott.adjectivenoun.ca:8888/',
    // serverUrl: 'http://localhost:8888/',
    welcome: 'hello',
    ready: null,
    get: null,
    search: null
};


// initial request to root URL
var _hateoas = null;
var _hateoasResolve = null;
var _hateoasReject = null;
var _hateoasPromise = new Promise(function(resolve, reject) {
    _hateoasResolve = resolve;
    _hateoasReject = reject;
});
_cantus.ready = _hateoasPromise;
var _getHateoas = function() {
    // Load the root directory's HATEOAS information, required for other URLs.
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', _loadHateoas);
    // TODO: add for "error" and "abort" events
    xhr.open('GET', _cantus.serverUrl);
    xhr.send();
};
var _loadHateoas = function(event) {
    var xhr = event.target;
    if (200 != xhr.status) {
        var errMsg = 'CantusJS: Root URL request failed with code ' + xhr.status;
        console.error(errMsg);
        _hateoasReject(errMsg);
    } else {
        try {
            _hateoas = JSON.parse(xhr.response).resources;
            _hateoasResolve();
        } catch (possibleError) {
            if ('SyntaxError' === possibleError.name) {
                var errMsg = 'CantusJS: SyntaxError while parsing response from the root URL.';
                console.error(errMsg);
                _hateoasReject(errMsg);
            } else {
                _hateoasReject(possibleError.name);
                throw possibleError;
            }
        }
    }
};
_getHateoas();


// for GET requests
var _getResolve = null;
var _getReject = null;
var _getRequest = function(args) {
    // what we'll return
    var prom = new Promise(function(resolve, reject) {
        _getResolve = resolve;
        _getReject = reject;
    });
    // the actual request stuff; may be run *after* the function returns!
    _cantus.ready.then(function() {
        var xhr = new XMLHttpRequest();
        xhr.addEventListener('load', _loadGet);
        // TODO: add for "error" and "abort" events

        // TODO: add support for "id" field
        // get the URL
        var type = 'all';
        if ('string' === typeof args.type) {
            type = args.type;
        }
        var requestUrl = _hateoas.browse[type];
        if (requestUrl === undefined) {
            // maybe they submitted a singular "type", so we'll try to convert it
            requestUrl = _hateoas.browse[_typeSingularToPlural[type]];
            if (requestUrl === undefined) {
                // maybe it's just not valid
                _getReject('CantusJS: unknown type: "' + type + '"');
                return;
            }
        }
        xhr.open('GET', requestUrl);
        xhr.send();
    });
    // return the promise
    return prom;
};
var _loadGet = function(event) {
    var xhr = event.target;
    if (200 != xhr.status) {
        var errMsg = 'CantusJS: GET request failed (' + xhr.status + ' ' + xhr.statusText + ')';
        console.error(errMsg);
        _getReject(errMsg);
    } else {
        try {
            var data = JSON.parse(xhr.response);
            _getResolve(data);
        } catch (possibleError) {
            if ('SyntaxError' === possibleError.name) {
                var errMsg = 'CantusJS: SyntaxError while parsing response from GET.';
                console.error(errMsg);
                _getReject(errMsg);
            } else {
                _getReject(possibleError.name);
                throw possibleError;
            }
        }
    }
};
_cantus.get = _getRequest;


// for SEARCH requests
var _searchResolve = null;
var _searchReject = null;
var _searchRequest = function(args) {
    // what we'll return
    var prom = new Promise(function(resolve, reject) {
        _searchResolve = resolve;
        _searchReject = reject;
    });
    // the actual request stuff; may be run *after* the function returns!
    _cantus.ready.then(function() {
        var xhr = new XMLHttpRequest();
        xhr.addEventListener('load', _loadSearch);
        // TODO: add for "error" and "abort" events

        // get the URL
        var type = 'all';
        if ('string' === typeof args.type) {
            type = args.type;
        }
        var requestUrl = _hateoas.browse[type];
        if (requestUrl === undefined) {
            // maybe they submitted a singular "type", so we'll try to convert it
            requestUrl = _hateoas.browse[_typeSingularToPlural[type]];
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
    });
    // return the promise
    return prom;
};
var _loadSearch = function(event) {
    var xhr = event.target;
    if (200 != xhr.status) {
        var errMsg = 'CantusJS: SEARCH request failed (' + xhr.status + ' ' + xhr.statusText + ')';
        console.error(errMsg);
        _searchReject(errMsg);
    } else {
        try {
            var data = JSON.parse(xhr.response);
            _searchResolve(data);
        } catch (possibleError) {
            if ('SyntaxError' === possibleError.name) {
                var errMsg = 'CantusJS: SyntaxError while parsing response from SEARCH.';
                console.error(errMsg);
                _searchReject(errMsg);
            } else {
                _searchReject(possibleError.name);
                throw possibleError;
            }
        }
    }
};
_cantus.search = _searchRequest;


window.cantus = _cantus;
