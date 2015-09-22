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

        expect(cantusModule._submitAjax).toBeCalledWith('GET', 'theserver', null, cantus._loadHateoas);
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
        expect(cantusModule._submitAjax).toBeCalledWith('GET', 'something', null, cantus._loadHateoas);
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
        var hateoas = {'chants': 'http://chants'};
        var expected = 'http://chants';

        var actual = cantusModule._findUrlFromType(type, hateoas);

        expect(actual).toBe(expected);
    });

    it('returns the URL when it is in the object (given as singular)', function() {
        var cantusModule = require('../cantus');
        var type = 'chant';
        var hateoas = {'chants': 'http://chants'};
        var expected = 'http://chants';

        var actual = cantusModule._findUrlFromType(type, hateoas);

        expect(actual).toBe(expected);
    });

    it('returns the "all" URL when initial is not in the object (defaultAll=true)', function() {
        var cantusModule = require('../cantus');
        var type = 'feasts';
        var hateoas = {'chants': 'http://chants', 'all': 'http://all'};
        var defaultAll = true;
        var expected = 'http://all';

        var actual = cantusModule._findUrlFromType(type, hateoas, defaultAll);

        expect(actual).toBe(expected);
    });

    it('raises HateoasError when initial is not in the object (defaultAll=false)', function() {
        var cantusModule = require('../cantus');
        var type = 'feast';
        var hateoas = {'chants': 'http://chants', 'all': 'http://all'};
        var defaultAll = false;

        try {
            cantusModule._findUrlFromType(type, hateoas, defaultAll);
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
        expect(rejectMock).toBeCalledWith('CantusJS: request failed (404 not found)');
    });

    it('calls resolve() when the response body decodes properly', function() {
        var cantusModule = require('../cantus');
        var resolveMock = jest.genMockFn();
        var rejectMock = jest.genMockFn();
        var event = {target: {status: 200, statusText: 'OK', response: '{"a":"b"}'}};

        cantusModule._loadResponse(event, resolveMock, rejectMock);

        expect(rejectMock.mock.calls.length).toBe(0);
        expect(resolveMock).toBeCalledWith({'a': 'b'});
    });

    it('calls reject() when JSON.parse() throws a SyntaxError', function() {
        var cantusModule = require('../cantus');
        var resolveMock = jest.genMockFn();
        var rejectMock = jest.genMockFn();
        var event = {target: {status: 200, statusText: 'OK', response: '{"a":"b}'}};

        cantusModule._loadResponse(event, resolveMock, rejectMock);

        expect(resolveMock.mock.calls.length).toBe(0);
        expect(rejectMock).toBeCalledWith('CantusJS: SyntaxError while parsing response.');
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
        expect(rejectMock).toBeCalledWith('CantusJS: Error while parsing response.');

        global.JSON = orig_global_JSON;
    });
});
