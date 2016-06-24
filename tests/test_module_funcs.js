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


jest.dontMock('../cantus.src');
const CANTUS_MODULE = require('../cantus.src').default;


describe('the constructor', () => {
    let origSetServerUrl;
    beforeEach(() => {
        origSetServerUrl = CANTUS_MODULE.Cantus.prototype.setServerUrl;
        CANTUS_MODULE.Cantus.prototype.setServerUrl = jest.genMockFn();
    });
    afterEach(() => {
        CANTUS_MODULE.Cantus.prototype.setServerUrl = origSetServerUrl;
    });

    it('calls setServerUrl(), which calls _getHateoas()', () => {
        const cantus = new CANTUS_MODULE.Cantus('theserver');
        expect(CANTUS_MODULE.Cantus.prototype.setServerUrl).toBeCalledWith('theserver');
    });
});

describe('setServerUrl()', () => {
    let origGetHateoas;
    beforeEach(() => {
        origGetHateoas = CANTUS_MODULE.Cantus.prototype._getHateoas;
        CANTUS_MODULE.Cantus.prototype._getHateoas = jest.genMockFn();
    });
    afterEach(() => {
        CANTUS_MODULE.Cantus.prototype._getHateoas = origGetHateoas;
    });

    it('calls _getHateoas()', function() {
        const can = new CANTUS_MODULE.Cantus('asdf');

        can.setServerUrl('something');

        expect(can.serverUrl).toBe('something');
        expect(CANTUS_MODULE.Cantus.prototype._getHateoas).toBeCalledWith();
    });
});

describe('_getHateoas()', () => {
    let origSubmitAjax;
    beforeEach(() => {
        origSubmitAjax = CANTUS_MODULE._submitAjax;
        CANTUS_MODULE._submitAjax = jest.genMockFn();
    });
    afterEach(() => {
        CANTUS_MODULE._submitAjax = origSubmitAjax;
    });

    it('calls _submitAjax() properly', () => {
        // NB: _getHateoas() is called by the constructor
        const cantus = new CANTUS_MODULE.Cantus('asdf');
        expect(CANTUS_MODULE._submitAjax.mock.calls.length).toBe(1);
        expect(CANTUS_MODULE._submitAjax).toBeCalledWith(
            'GET',
            'asdf',
            {args: {}, body: null},
            jasmine.any(Function),  // detailed check just below...
            jasmine.any(Function),
            jasmine.any(Function)
        );
        // Because of the call to bind() we don't have the exact same function, but this is close!
        expect(CANTUS_MODULE._submitAjax.mock.calls[0][3].name).toBe('bound _loadHateoas');
        expect(CANTUS_MODULE._submitAjax.mock.calls[0][4].name).toBe('bound _errorHateoas');
        expect(CANTUS_MODULE._submitAjax.mock.calls[0][5].name).toBe('bound _abortHateoas');
    });
});

describe('_loadHateoas()', function() {
    beforeEach(() => {
        this.origSubmitAjax = CANTUS_MODULE._submitAjax;
        CANTUS_MODULE._submitAjax = jest.genMockFn();
    });
    afterEach(() => {
        CANTUS_MODULE._submitAjax = this.origSubmitAjax;
    });

    it('properly sets "_hateoas" when everything goes fine', () => {
        const event = {'target': {'status': 200, 'response': '{"resources":"surprise!"}'}};
        const cantus = new CANTUS_MODULE.Cantus('a');

        cantus._loadHateoas(event);

        return cantus.ready.then(() => {});
    });

    it('properly deals with a return code other than 200', () => {
        const event = {'target': {'status': 500}};
        const cantus = new CANTUS_MODULE.Cantus('a');

        cantus._loadHateoas(event);

        return cantus.ready.catch((err) => {
            expect(err.endsWith('500')).toBe(true);
        });
    });

    it('rejects the HATEOAS Promise when the response is invalid JSON', () => {
        const event = {target: {status: 200, response: 'ddddddddd{'}};
        const cantus = new CANTUS_MODULE.Cantus('a');

        cantus._loadHateoas(event);

        return cantus.ready.catch((err) => {
            expect(err).toBe('CantusJS: SyntaxError while parsing response from the root URL.');
        });
    });

    it('rejects the HATEOAS Promise after another error while parsing the JSON', () => {
        const event = {target: {status: 200, response: '{"query":"lol"}'}};
        const cantus = new CANTUS_MODULE.Cantus('a');
        cantus._hateoasResolve = 5;  // should be a function... setting it to 5 causes the error!

        cantus._loadHateoas(event);

        return cantus.ready.catch((err) => {
            expect(err.startsWith('TypeError')).toBe(true);
        });
    });
});

describe('_findUrlFromType()', function() {
    it('returns the URL when it is in the object (given as plural)', function() {
        let type = 'chants';
        let hateoas = {'browse': {'chants': 'http://chants'}};
        let expected = hateoas.browse.chants;

        let actual = CANTUS_MODULE._findUrlFromType(type, hateoas);

        expect(actual).toBe(expected);
    });

    it('returns the URL when it is in the object (given as singular)', function() {
        let type = 'chant';
        let hateoas = {'browse': {'chants': 'http://chants'}};
        let expected = hateoas.browse.chants;

        let actual = CANTUS_MODULE._findUrlFromType(type, hateoas);

        expect(actual).toBe(expected);
    });

    it('returns the "all" URL when initial is not in the object (defaultAll=true)', function() {
        let type = 'feasts';
        let hateoas = {'browse': {'chants': 'http://chants', 'all': 'http://all'}};
        let defaultAll = true;
        let expected = hateoas.browse.all;

        let actual = CANTUS_MODULE._findUrlFromType(type, hateoas, defaultAll);

        expect(actual).toBe(expected);
    });

    it('raises HateoasError when initial is not in the object (defaultAll=false)', function() {
        let type = 'feast';
        let hateoas = {'browse': {'chants': 'http://chants', 'all': 'http://all'}};
        let defaultAll = false;

        try {
            CANTUS_MODULE._findUrlFromType(type, hateoas, defaultAll);
            throw new Error('expected an exception');
        } catch (exc) {
            expect(exc.name).toBe('HateoasError');
        }
    });

    it('properly substitutes the "id" when the URL is given', function() {
        let type = 'chants';
        let hateoas = {'view': {'chants': 'http://cantus/id?/chants/'}};
        let expected = 'http://cantus/666/chants/';
        let defaultAll = false;
        let id = 666;

        let actual = CANTUS_MODULE._findUrlFromType(type, hateoas, defaultAll, id);

        expect(actual).toBe(expected);
    });

    it('complains when given an "id" and the URL is missing', function() {
        let type = 'feast';
        let hateoas = {'view': {'chants': 'http://cantus/id?/chants/'}};
        let defaultAll = false;
        let id = 666;

        try {
            CANTUS_MODULE._findUrlFromType(type, hateoas, defaultAll, id);
            throw new Error('expected an exception');
        } catch (exc) {
            expect(exc.name).toBe('HateoasError');
        }
    });
});

describe('_prepareSearchRequestBody()', function() {
    it('works with no query arguments', function() {
        let query = {'type': 'chant'};
        let expected = '{"query":""}';

        let actual = CANTUS_MODULE._prepareSearchRequestBody(query);

        expect(actual).toBe(expected);
    });

    it('works with three regular query arguments', function() {
        let query = {'name': 'one', 'feast': 'item two', 'date': 'three'};
        // NOTE: also make sure it calls quoteIfNeeded()
        // The output will literally include a backslash followed by a double-quote, because that's
        // how it has to be encoded to a JSON string.
        let expected = '{"query":"name:one feast:\\\"item two\\\" date:three"}';

        let actual = CANTUS_MODULE._prepareSearchRequestBody(query);

        expect(actual).toBe(expected);
    });

    it('works with two regular args and "any"', function() {
        let query = {'name': 'one', 'feast': 'two', 'any': '"item three"'};
        let expected = '{"query":"name:one feast:two \\\"item three\\\""}';

        let actual = CANTUS_MODULE._prepareSearchRequestBody(query);

        expect(actual).toBe(expected);
    });

    it('works with a regular arg, "any", and a request header field (that is ignored)', function() {
        let query = {'feast': 'two', 'any': '"item three"', 'page': '9001'};
        let expected = '{"query":"feast:two \\\"item three\\\""}';

        let actual = CANTUS_MODULE._prepareSearchRequestBody(query);

        expect(actual).toBe(expected);
    });

    it('throws QueryError with an unknown query field', function() {
        let query = {'name': 'one', 'backhoe': 'two', 'any': '"item three"'};

        try {
            CANTUS_MODULE._prepareSearchRequestBody(query);
            throw new Error('expected an exception');
        } catch (exc) {
            expect(exc.name).toBe('QueryError');
        }
    });

    it('converts zero-length field to asterisk', function() {
        // NOTE: regression test for https://github.com/CANTUS-Project/cantus-js/issues/16
        let query = {'name': 'one', 'date': ''};
        let expected = '{"query":"name:one date:*"}';

        let actual = CANTUS_MODULE._prepareSearchRequestBody(query);

        expect(actual).toBe(expected);
    });
});

describe('_loadResponse', function() {
    it('calls reject() when the response code is not 200', function() {
        let resolveMock = jest.genMockFn();
        let rejectMock = jest.genMockFn();
        let event = {target: {status: 404, statusText: 'not found'}};

        CANTUS_MODULE._loadResponse(event, resolveMock, rejectMock);

        expect(resolveMock.mock.calls.length).toBe(0);
        expect(rejectMock).toBeCalledWith({code: 404, reason: 'not found', response: '404: not found'});
    });

    it('calls resolve() when the response body decodes properly (sort_order in response)', function() {
        let resolveMock = jest.genMockFn();
        let rejectMock = jest.genMockFn();
        // mock for the XMLHttpRequest
        let responseStr = '{"a":"b","c":"d","sort_order":"ef","resources":"http"}';
        let getResponseHeader = function(header) {
            let headers = {'X-Cantus-Version': '1', 'X-Cantus-Include-Resources': '2',
                'X-Cantus-Fields': '3', 'X-Cantus-Extra-Fields': '4', 'X-Cantus-Total-Results': '6',
            };
            if (headers[header] !== undefined) {
                return headers[header];
            } else {
                return null;
            }
        };
        let event = {target: {status: 200, statusText: 'OK', response: responseStr,
                              getResponseHeader: getResponseHeader}};
        // expecteds
        let expectedResponse = {'a': 'b', 'c': 'd', 'sort_order': 'ef', 'resources': 'http'};
        let expectedHeaders = {'version': '1', 'include_resources': '2', 'fields': '3',
            'extra_fields': '4', 'total_results': '6', 'page': null, 'per_page': null,
            'sort': null,
        };
        expectedResponse['headers'] = expectedHeaders;

        CANTUS_MODULE._loadResponse(event, resolveMock, rejectMock);

        expect(rejectMock.mock.calls.length).toBe(0);
        expect(resolveMock).toBeCalledWith(expectedResponse);
    });

    it('calls resolve() when the response body decodes properly (invented sort_order)', function() {
        let resolveMock = jest.genMockFn();
        let rejectMock = jest.genMockFn();
        // mock for the XMLHttpRequest
        let responseStr = '{"a":"b","resources":"http"}';
        let getResponseHeader = function(header) {
            let headers = {'X-Cantus-Page': 'a', 'X-Cantus-Per-Page': 'b', 'X-Cantus-Sort': 'c'};
            if (headers[header] !== undefined) {
                return headers[header];
            } else {
                return null;
            }
        };
        // expecteds
        let expectedResponse = {'a': 'b', 'sort_order': ['a'], 'resources': 'http'};
        let expectedHeaders = {'version': null, 'include_resources': null, 'fields': null,
            'extra_fields': null, 'total_results': null, 'page': 'a',
            'per_page': 'b', 'sort': 'c',
        };
        let event = {target: {status: 200, statusText: 'OK', response: responseStr,
                              getResponseHeader: getResponseHeader}};
        expectedResponse['headers'] = expectedHeaders;

        CANTUS_MODULE._loadResponse(event, resolveMock, rejectMock);

        expect(rejectMock.mock.calls.length).toBe(0);
        expect(resolveMock).toBeCalledWith(expectedResponse);
    });

    it('calls reject() when JSON.parse() throws a SyntaxError', function() {
        let resolveMock = jest.genMockFn();
        let rejectMock = jest.genMockFn();
        let event = {target: {status: 200, statusText: 'OK', response: '{"a":"b}'}};

        CANTUS_MODULE._loadResponse(event, resolveMock, rejectMock);

        expect(resolveMock.mock.calls.length).toBe(0);
        expect(rejectMock).toBeCalledWith({code: 0, reason: 'internal error',
                                           response: 'CantusJS: SyntaxError while parsing response.'});
    });

    it('calls reject() and rethrows when JSON.parse() throws another error', function() {
        let orig_global_JSON = global.JSON;

        global.JSON = {parse: jest.genMockFn()};
        global.JSON.parse.mockImpl(function() { throw new Error('whatever, man') });
        let resolveMock = jest.genMockFn();
        let rejectMock = jest.genMockFn();
        let event = {target: {status: 200, statusText: 'OK', response: '{"a":"b}'}};
        CANTUS_MODULE._loadResponse(event, resolveMock, rejectMock);

        expect(resolveMock.mock.calls.length).toBe(0);
        expect(rejectMock).toBeCalledWith({code: 0, reason: 'internal error',
                                           response: 'CantusJS: Error while parsing response.'});

        global.JSON = orig_global_JSON;
    });
});

describe('"abort" and "error" events for XMLHttpRequest', function() {
    it('_abortRequest() calls its reject() function', function() {
        let mockEvent = '';
        let mockReject = jest.genMockFn();
        let expected = {code: 0, reason: 'Request aborted', response: 'The XMLHttpRequest was aborted.'};

        CANTUS_MODULE._abortRequest(mockEvent, mockReject);

        expect(mockReject).toBeCalledWith(expected);
    });

    it('_errorRequest() calls its reject() function', function() {
        let mockEvent = '';
        let mockReject = jest.genMockFn();
        let expected = {code: 0, reason: 'Request errored', response: 'Error during the XMLHttpRequest.'};

        CANTUS_MODULE._errorRequest(mockEvent, mockReject);

        expect(mockReject).toBeCalledWith(expected);
    });
});

describe('_addRequestHeaders()', function() {
    it('works with no headers', function() {
        let mockXhr = {'setRequestHeader': jest.genMockFn()};
        let args = {};

        let actual = CANTUS_MODULE._addRequestHeaders(mockXhr, args);

        expect(actual).toBe(mockXhr);
        expect(mockXhr.setRequestHeader.mock.calls.length).toBe(0);
    });

    it('works with one header', function() {
        let mockXhr = {'setRequestHeader': jest.genMockFn()};
        let args = {'sort': 'functionality'};

        let actual = CANTUS_MODULE._addRequestHeaders(mockXhr, args);

        expect(actual).toBe(mockXhr);
        expect(mockXhr.setRequestHeader.mock.calls.length).toBe(1);
        expect(mockXhr.setRequestHeader).toBeCalledWith('X-Cantus-Sort', 'functionality');
    });

    it('works with four headers', function() {
        let mockXhr = {'setRequestHeader': jest.genMockFn()};
        let args = {'page': 'Wolfram', 'per_page': 'Bee Gees', 'sort': 'functionality',
                    'fields': 'A ZedHang'};

        let actual = CANTUS_MODULE._addRequestHeaders(mockXhr, args);

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
        let mockXhr = {
            addEventListener: jest.genMockFn(),
            open: jest.genMockFn(),
            send: jest.genMockFn()
        };
        CANTUS_MODULE._dumbXhrThing = jest.genMockFn();
        CANTUS_MODULE._dumbXhrThing.mockReturnValue(mockXhr);
        CANTUS_MODULE._addRequestHeaders = jest.genMockFn();
        CANTUS_MODULE._addRequestHeaders.mockReturnValue(mockXhr);
        let httpMethod = 'FORCE';
        let url = 'http.//';
        let data = {'args': 'fargs', 'body': 'schmata'};
        let loadListener = 1;
        let errorListener = 2;
        let abortListener = 3;

        CANTUS_MODULE._submitAjax(httpMethod, url, data, loadListener, errorListener, abortListener);

        expect(CANTUS_MODULE._addRequestHeaders).toBeCalledWith(mockXhr, 'fargs');
        expect(mockXhr.addEventListener.mock.calls.length).toBe(3);
        expect(mockXhr.addEventListener).toBeCalledWith('load', loadListener);
        expect(mockXhr.addEventListener).toBeCalledWith('error', errorListener);
        expect(mockXhr.addEventListener).toBeCalledWith('abort', abortListener);
        expect(mockXhr.open).toBeCalledWith(httpMethod, url);
        expect(mockXhr.send).toBeCalledWith('schmata');
    });

    it('behaves with only one listener function and no request body', function() {
        let mockXhr = {
            addEventListener: jest.genMockFn(),
            open: jest.genMockFn(),
            send: jest.genMockFn()
        };
        CANTUS_MODULE._dumbXhrThing = jest.genMockFn();
        CANTUS_MODULE._dumbXhrThing.mockReturnValue(mockXhr);
        CANTUS_MODULE._addRequestHeaders = jest.genMockFn();
        CANTUS_MODULE._addRequestHeaders.mockReturnValue(mockXhr);
        let httpMethod = 'FORCE';
        let url = 'http.//';
        let data = {'args': 'fargs', 'body': null};
        let loadListener = 1;

        CANTUS_MODULE._submitAjax(httpMethod, url, data, loadListener);

        expect(CANTUS_MODULE._addRequestHeaders).toBeCalledWith(mockXhr, 'fargs');
        expect(mockXhr.addEventListener.mock.calls.length).toBe(1);
        expect(mockXhr.addEventListener).toBeCalledWith('load', loadListener);
        expect(mockXhr.open).toBeCalledWith(httpMethod, url);
        expect(mockXhr.send).toBeCalledWith();
    });
});

describe('convertTypeNumber()', () => {
    it('converts singular to plural', () => {
        let type = 'chant';
        let to = 'plural';
        let expected = 'chants';
        expect(CANTUS_MODULE.convertTypeNumber(type, to)).toBe(expected);
    });

    it('converts plural to singular', () => {
        let type = 'feasts';
        let to = 'singular';
        let expected = 'feast';
        expect(CANTUS_MODULE.convertTypeNumber(type, to)).toBe(expected);
    });

    it('leaves singular as singular', () => {
        let type = 'genre';
        let to = 'singular';
        let expected = 'genre';
        expect(CANTUS_MODULE.convertTypeNumber(type, to)).toBe(expected);
    });

    it('leaves plural as plural', () => {
        let type = 'notations';
        let to = 'plural';
        let expected = 'notations';
        expect(CANTUS_MODULE.convertTypeNumber(type, to)).toBe(expected);
    });

    it('returns undefined with invalid "type"', () => {
        let type = 'broccoli';
        let to = 'singular';
        let expected = undefined;
        expect(CANTUS_MODULE.convertTypeNumber(type, to)).toBe(expected);
    });

    it('returns undefiend with invalid "to"', () => {
        let type = 'chants';
        let to = 'semolina';
        let expected = undefined;
        expect(CANTUS_MODULE.convertTypeNumber(type, to)).toBe(expected);
    });

});


describe('quoteIfNeeded()', () => {

    it('does not quote a string without spaces', () => {
        const string = 'winthorpe';
        const expected = 'winthorpe';
        expect(CANTUS_MODULE.quoteIfNeeded(string)).toBe(expected);
    });

    it('does quote a string with a space', () => {
        const string = 'win thorpe';
        const expected = '"win thorpe"';
        expect(CANTUS_MODULE.quoteIfNeeded(string)).toBe(expected);
    });

    it('does not quote a string with a space and double quotes', () => {
        const string = '"win thorpe"';
        const expected = '"win thorpe"';
        expect(CANTUS_MODULE.quoteIfNeeded(string)).toBe(expected);
    });

    it('does not quote a string with a space and single quotes', () => {
        const string = "'win thorpe'";
        const expected = "'win thorpe'";
        expect(CANTUS_MODULE.quoteIfNeeded(string)).toBe(expected);
    });

    it('does quote a string that is a single space', () => {
        const string = ' ';
        const expected = '" "';
        expect(CANTUS_MODULE.quoteIfNeeded(string)).toBe(expected);
    });
});
