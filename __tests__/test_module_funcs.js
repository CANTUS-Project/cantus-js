// -*- coding: utf-8 -*-
//-------------------------------------------------------------------------------------------------
// Program Name:           CantusJS
// Program Description:    It's a simple JavaScript library for accessing a Cantus API server.
//
// Filename:               __tests__/test_module_funcs.js
// Purpose:                Tests for init code, HATEOAS functions, and other module-level stuff.
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


jest.dontMock('../cantus');


describe('the constructor', function() {
    it('calls setServerUrl(), which calls _getHateoas()', function() {
        var cantusModule = require('../cantus');
        cantusModule._submitAjax = jest.genMockFn();

        var cantus = new cantusModule.Cantus('theserver');

        expect(cantusModule._submitAjax).toBeCalledWith('GET', 'theserver', {args: {}, body: null},
                                                        cantus._loadHateoas);
    });
});

describe('setServerUrl()', function() {
    it('calls _getHateoas()', function() {
        var cantusModule = require('../cantus');
        cantusModule._submitAjax = jest.genMockFn();
        var can = new cantusModule.Cantus('asdf');
        var getHateoas = jest.genMockFunction();
        can._getHateoas = getHateoas;

        can.setServerUrl('something');

        expect(can.serverUrl).toBe('something');
        expect(getHateoas.mock.calls.length).toBe(1);
    });
});

describe('_getHateoas()', function() {
    it('calls _submitAjax() properly', function() {
        var cantusModule = require('../cantus');
        cantusModule._submitAjax = jest.genMockFn();
        var cantus = new cantusModule.Cantus('asdf');
        cantus.serverUrl = 'something';

        cantus._getHateoas();

        expect(cantusModule._submitAjax.mock.calls.length).toBe(2); // first call is during init
        expect(cantusModule._submitAjax).toBeCalledWith('GET', 'something', {args: {}, body: null},
                                                        cantus._loadHateoas);
    });
});

describe('_loadHateoas()', function() {
    it('properly sets "_hateoas" when everything goes fine', function() {
        var cantusModule = require('../cantus');
        cantusModule._submitAjax = jest.genMockFn();  // so call doesn't go through on init
        var mockEvent = {'target': {'status': 200, 'response': '{"resources":"surprise!"}'}};
        var cantus = new cantusModule.Cantus('a');
        cantus._hateoasResolve = jest.genMockFn();

        cantus._loadHateoas(mockEvent);

        expect(cantus._hateoasResolve).toBeCalled();
        expect(cantus._hateoas).toBe('surprise!');
    });

    it('properly deals with a return code other than 200', function() {
        var cantusModule = require('../cantus');
        cantusModule._submitAjax = jest.genMockFn();  // so call doesn't go through on init
        var mockEvent = {'target': {'status': 500}};
        var cantus = new cantusModule.Cantus('a');
        cantus._hateoasReject = jest.genMockFn();

        cantus._loadHateoas(mockEvent);

        expect(cantus._hateoasReject).toBeCalled();
    });
});

describe('_findUrlFromType()', function() {
    it('returns the URL when it is in the object (given as plural)', function() {
        var cantusModule = require('../cantus');
        var type = 'chants';
        var hateoas = {'browse': {'chants': 'http://chants'}};
        var expected = hateoas.browse.chants;

        var actual = cantusModule._findUrlFromType(type, hateoas);

        expect(actual).toBe(expected);
    });

    it('returns the URL when it is in the object (given as singular)', function() {
        var cantusModule = require('../cantus');
        var type = 'chant';
        var hateoas = {'browse': {'chants': 'http://chants'}};
        var expected = hateoas.browse.chants;

        var actual = cantusModule._findUrlFromType(type, hateoas);

        expect(actual).toBe(expected);
    });

    it('returns the "all" URL when initial is not in the object (defaultAll=true)', function() {
        var cantusModule = require('../cantus');
        var type = 'feasts';
        var hateoas = {'browse': {'chants': 'http://chants', 'all': 'http://all'}};
        var defaultAll = true;
        var expected = hateoas.browse.all;

        var actual = cantusModule._findUrlFromType(type, hateoas, defaultAll);

        expect(actual).toBe(expected);
    });

    it('raises HateoasError when initial is not in the object (defaultAll=false)', function() {
        var cantusModule = require('../cantus');
        var type = 'feast';
        var hateoas = {'browse': {'chants': 'http://chants', 'all': 'http://all'}};
        var defaultAll = false;

        try {
            cantusModule._findUrlFromType(type, hateoas, defaultAll);
            throw new Error('expected an exception');
        } catch (exc) {
            expect(exc.name).toBe('HateoasError');
        }
    });

    it('properly substitutes the "id" when the URL is given', function() {
        var cantusModule = require('../cantus');
        var type = 'chants';
        var hateoas = {'view': {'chants': 'http://cantus/id?/chants/'}};
        var expected = 'http://cantus/666/chants/';
        var defaultAll = false;
        var id = 666;

        var actual = cantusModule._findUrlFromType(type, hateoas, defaultAll, id);

        expect(actual).toBe(expected);
    });

    it('complains when given an "id" and the URL is missing', function() {
        var cantusModule = require('../cantus');
        var type = 'feast';
        var hateoas = {'view': {'chants': 'http://cantus/id?/chants/'}};
        var defaultAll = false;
        var id = 666;

        try {
            cantusModule._findUrlFromType(type, hateoas, defaultAll, id);
            throw new Error('expected an exception');
        } catch (exc) {
            expect(exc.name).toBe('HateoasError');
        }
    });
});

describe('_prepareSearchRequestBody()', function() {
    it('works with no query arguments', function() {
        var cantusModule = require('../cantus');
        var query = {'type': 'chant'};
        var expected = '{"query":""}';

        var actual = cantusModule._prepareSearchRequestBody(query);

        expect(actual).toBe(expected);
    });

    it('works with three regular query arguments', function() {
        var cantusModule = require('../cantus');
        var query = {'name': 'one', 'feast': '"item two"', 'date': 'three'};
        // The output will literally include a backslash followed by a double-quote, because that's
        // how it has to be encoded to a JSON string.
        var expected = '{"query":"name:one feast:\\\"item two\\\" date:three"}';

        var actual = cantusModule._prepareSearchRequestBody(query);

        expect(actual).toBe(expected);
    });

    it('works with two regular args and "any"', function() {
        var cantusModule = require('../cantus');
        var query = {'name': 'one', 'feast': 'two', 'any': '"item three"'};
        var expected = '{"query":"name:one feast:two \\\"item three\\\""}';

        var actual = cantusModule._prepareSearchRequestBody(query);

        expect(actual).toBe(expected);
    });

    it('throws QueryError with an unknown query field', function() {
        var cantusModule = require('../cantus');
        var query = {'name': 'one', 'backhoe': 'two', 'any': '"item three"'};

        try {
            cantusModule._prepareSearchRequestBody(query);
            throw new Error('expected an exception');
        } catch (exc) {
            expect(exc.name).toBe('QueryError');
        }
    });
});

describe('_loadResponse', function() {
    it('calls reject() when the response code is not 200', function() {
        var cantusModule = require('../cantus');
        var resolveMock = jest.genMockFn();
        var rejectMock = jest.genMockFn();
        var event = {target: {status: 404, statusText: 'not found'}};

        cantusModule._loadResponse(event, resolveMock, rejectMock);

        expect(resolveMock.mock.calls.length).toBe(0);
        expect(rejectMock).toBeCalledWith({code: 404, reason: 'not found', response: '404: not found'});
    });

    it('calls resolve() when the response body decodes properly (sort_order in response)', function() {
        var cantusModule = require('../cantus');
        var resolveMock = jest.genMockFn();
        var rejectMock = jest.genMockFn();
        // mock for the XMLHttpRequest
        var responseStr = '{"a":"b","c":"d","sort_order":"ef","resources":"http"}';
        var getResponseHeader = function(header) {
            var headers = {'X-Cantus-Version': '1', 'X-Cantus-Include-Resources': '2',
                'X-Cantus-Fields': '3', 'X-Cantus-Extra-Fields': '4', 'X-Cantus-No-Xref': '5',
                'X-Cantus-Total-Results': '6'
            };
            if (headers[header] !== undefined) {
                return headers[header];
            } else {
                return null;
            }
        };
        var event = {target: {status: 200, statusText: 'OK', response: responseStr,
                              getResponseHeader: getResponseHeader}};
        // expecteds
        var expectedResponse = {'a': 'b', 'c': 'd', 'sort_order': 'ef', 'resources': 'http'};
        var expectedHeaders = {'version': '1', 'include_resources': '2', 'fields': '3',
            'extra_fields': '4', 'no_xref': '5', 'total_results': '6', 'page': null, 'per_page': null,
            'sort': null, 'search_help': null
        };
        expectedResponse['headers'] = expectedHeaders;

        cantusModule._loadResponse(event, resolveMock, rejectMock);

        expect(rejectMock.mock.calls.length).toBe(0);
        expect(resolveMock).toBeCalledWith(expectedResponse);
    });

    it('calls resolve() when the response body decodes properly (invented sort_order)', function() {
        var cantusModule = require('../cantus');
        var resolveMock = jest.genMockFn();
        var rejectMock = jest.genMockFn();
        // mock for the XMLHttpRequest
        var responseStr = '{"a":"b","resources":"http"}';
        var getResponseHeader = function(header) {
            var headers = {'X-Cantus-Page': 'a', 'X-Cantus-Per-Page': 'b', 'X-Cantus-Sort': 'c',
                'X-Cantus-Search-Help': 'd',
            };
            if (headers[header] !== undefined) {
                return headers[header];
            } else {
                return null;
            }
        };
        // expecteds
        var expectedResponse = {'a': 'b', 'sort_order': ['a'], 'resources': 'http'};
        var expectedHeaders = {'version': null, 'include_resources': null, 'fields': null,
            'extra_fields': null, 'no_xref': null, 'total_results': null, 'page': 'a', 'per_page': 'b',
            'sort': 'c', 'search_help': 'd'
        };
        var event = {target: {status: 200, statusText: 'OK', response: responseStr,
                              getResponseHeader: getResponseHeader}};
        expectedResponse['headers'] = expectedHeaders;

        cantusModule._loadResponse(event, resolveMock, rejectMock);

        expect(rejectMock.mock.calls.length).toBe(0);
        expect(resolveMock).toBeCalledWith(expectedResponse);
    });

    it('calls reject() when JSON.parse() throws a SyntaxError', function() {
        var cantusModule = require('../cantus');
        var resolveMock = jest.genMockFn();
        var rejectMock = jest.genMockFn();
        var event = {target: {status: 200, statusText: 'OK', response: '{"a":"b}'}};

        cantusModule._loadResponse(event, resolveMock, rejectMock);

        expect(resolveMock.mock.calls.length).toBe(0);
        expect(rejectMock).toBeCalledWith({code: 0, reason: 'internal error',
                                           response: 'CantusJS: SyntaxError while parsing response.'});
    });

    it('calls reject() and rethrows when JSON.parse() throws another error', function() {
        var orig_global_JSON = global.JSON;

        var cantusModule = require('../cantus');
        global.JSON = {parse: jest.genMockFn()};
        global.JSON.parse.mockImpl(function() { throw new Error('whatever, man') });
        var resolveMock = jest.genMockFn();
        var rejectMock = jest.genMockFn();
        var event = {target: {status: 200, statusText: 'OK', response: '{"a":"b}'}};
        var dumbWrapper = function() {
            // We need this wrapper function because the expect().toThrow() construct is apparently
            // so useless that it can't even pass arguments to the function under test.
            cantusModule._loadResponse(event, resolveMock, rejectMock);
        };

        expect(dumbWrapper).toThrow();

        expect(resolveMock.mock.calls.length).toBe(0);
        expect(rejectMock).toBeCalledWith({code: 0, reason: 'internal error',
                                           response: 'CantusJS: Error while parsing response.'});

        global.JSON = orig_global_JSON;
    });
});

describe('"abort" and "error" events for XMLHttpRequest', function() {
    it('_abortRequest() calls its reject() function', function() {
        var cantusModule = require('../cantus');
        var mockEvent = '';
        var mockReject = jest.genMockFn();
        var expected = {code: 0, reason: 'Request aborted', response: 'The XMLHttpRequest was aborted.'};

        cantusModule._abortRequest(mockEvent, mockReject);

        expect(mockReject).toBeCalledWith(expected);
    });

    it('_errorRequest() calls its reject() function', function() {
        var cantusModule = require('../cantus');
        var mockEvent = '';
        var mockReject = jest.genMockFn();
        var expected = {code: 0, reason: 'Request errored', response: 'Error during the XMLHttpRequest.'};

        cantusModule._errorRequest(mockEvent, mockReject);

        expect(mockReject).toBeCalledWith(expected);
    });
});

describe('_addRequestHeaders()', function() {
    it('works with no headers', function() {
        var cantusModule = require('../cantus');
        var mockXhr = {'setRequestHeader': jest.genMockFn()};
        var args = {};

        var actual = cantusModule._addRequestHeaders(mockXhr, args);

        expect(actual).toBe(mockXhr);
        expect(mockXhr.setRequestHeader.mock.calls.length).toBe(0);
    });

    it('works with one header', function() {
        var cantusModule = require('../cantus');
        var mockXhr = {'setRequestHeader': jest.genMockFn()};
        var args = {'sort': 'functionality'};

        var actual = cantusModule._addRequestHeaders(mockXhr, args);

        expect(actual).toBe(mockXhr);
        expect(mockXhr.setRequestHeader.mock.calls.length).toBe(1);
        expect(mockXhr.setRequestHeader).toBeCalledWith('X-Cantus-Sort', 'functionality');
    });

    it('works with four headers', function() {
        var cantusModule = require('../cantus');
        var mockXhr = {'setRequestHeader': jest.genMockFn()};
        var args = {'page': 'Wolfram', 'per_page': 'Bee Gees', 'sort': 'functionality',
                    'fields': 'A ZedHang'};

        var actual = cantusModule._addRequestHeaders(mockXhr, args);

        expect(actual).toBe(mockXhr);
        expect(mockXhr.setRequestHeader.mock.calls.length).toBe(4);
        expect(mockXhr.setRequestHeader).toBeCalledWith('X-Cantus-Page', 'Wolfram');
        expect(mockXhr.setRequestHeader).toBeCalledWith('X-Cantus-Per-Page', 'Bee Gees');
        expect(mockXhr.setRequestHeader).toBeCalledWith('X-Cantus-Sort', 'functionality');
        expect(mockXhr.setRequestHeader).toBeCalledWith('X-Cantus-Fields', 'A ZedHang');
    });
});

describe('_submitAjax', function() {
    // It's a little sloppy to mock XMLHttpRequest by simply replacing it, and not restoring the
    // original and actual XMLHttpRequest object. However, in these tests, we *never* need the real
    // XMLHttpRequest object, so I'm over it.

    it('behaves with all three listener functions and a request body', function() {
        var cantusModule = require('../cantus');
        var mockXhr = {
            addEventListener: jest.genMockFn(),
            open: jest.genMockFn(),
            send: jest.genMockFn()
        };
        cantusModule._dumbXhrThing = jest.genMockFn();
        cantusModule._dumbXhrThing.mockReturnValue(mockXhr);
        cantusModule._addRequestHeaders = jest.genMockFn();
        cantusModule._addRequestHeaders.mockReturnValue(mockXhr);
        var httpMethod = 'FORCE';
        var url = 'http.//';
        var data = {'args': 'fargs', 'body': 'schmata'};
        var loadListener = 1;
        var errorListener = 2;
        var abortListener = 3;

        cantusModule._submitAjax(httpMethod, url, data, loadListener, errorListener, abortListener);

        expect(cantusModule._addRequestHeaders).toBeCalledWith(mockXhr, 'fargs');
        expect(mockXhr.addEventListener.mock.calls.length).toBe(3);
        expect(mockXhr.addEventListener).toBeCalledWith('load', loadListener);
        expect(mockXhr.addEventListener).toBeCalledWith('error', errorListener);
        expect(mockXhr.addEventListener).toBeCalledWith('abort', abortListener);
        expect(mockXhr.open).toBeCalledWith(httpMethod, url);
        expect(mockXhr.send).toBeCalledWith('schmata');
    });

    it('behaves with only one listener function and no request body', function() {
        var cantusModule = require('../cantus');
        var mockXhr = {
            addEventListener: jest.genMockFn(),
            open: jest.genMockFn(),
            send: jest.genMockFn()
        };
        cantusModule._dumbXhrThing = jest.genMockFn();
        cantusModule._dumbXhrThing.mockReturnValue(mockXhr);
        cantusModule._addRequestHeaders = jest.genMockFn();
        cantusModule._addRequestHeaders.mockReturnValue(mockXhr);
        var httpMethod = 'FORCE';
        var url = 'http.//';
        var data = {'args': 'fargs', 'body': null};
        var loadListener = 1;

        cantusModule._submitAjax(httpMethod, url, data, loadListener);

        expect(cantusModule._addRequestHeaders).toBeCalledWith(mockXhr, 'fargs');
        expect(mockXhr.addEventListener.mock.calls.length).toBe(1);
        expect(mockXhr.addEventListener).toBeCalledWith('load', loadListener);
        expect(mockXhr.open).toBeCalledWith(httpMethod, url);
        expect(mockXhr.send).toBeCalledWith();
    });
});
