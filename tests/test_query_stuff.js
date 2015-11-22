// -*- coding: utf-8 -*-
//-------------------------------------------------------------------------------------------------
// Program Name:           CantusJS
// Program Description:    It's a simple JavaScript library for accessing a Cantus API server.
//
// Filename:               __tests__/test_query_stuff.js
// Purpose:                Tests for query-related functionality.
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


describe('get()', function() {
    it('behaves properly', function() {
        CANTUS_MODULE._submitAjax = jest.genMockFn();
        CANTUS_MODULE._findUrlFromType = jest.genMockFn();
        CANTUS_MODULE._findUrlFromType.mockReturnValue('fakeurl');
        let cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._hateoas = {'browse': 'some URLs and stuff'};
        let resolveReady = null;
        cantus.ready = {then: function(func){func()}};  // mock promise that calls "then" right away
        let args = {'type': 'chant', 'id': 'what'};

        let actual = cantus.get(args);

        expect(CANTUS_MODULE._submitAjax.mock.calls.length).toBe(2);
        expect(CANTUS_MODULE._submitAjax).toBeCalledWith(
            'GET', 'fakeurl', {args: args, body: null}, cantus._loadGet, cantus._errorGet,
            cantus._abortGet
        );
        expect(CANTUS_MODULE._findUrlFromType).toBeCalledWith('chant', cantus._hateoas, true, 'what');
        expect(typeof cantus._getResolve).toBe('function');
        expect(typeof cantus._getReject).toBe('function');
        expect(actual instanceof Promise).toBe(true);
    });

    it('_loadGet() properly delegates to _loadResponse()', function() {
        CANTUS_MODULE._submitAjax = jest.genMockFn();
        CANTUS_MODULE._loadResponse = jest.genMockFn();
        let cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._getResolve = 5;
        cantus._getReject = 6;
        let mockEvent = 4;

        cantus._loadGet(mockEvent);

        expect(CANTUS_MODULE._loadResponse).toBeCalledWith(4, 5, 6);
    });

    it('_abortGet() properly delegates to _abortRequest()', function() {
        CANTUS_MODULE._submitAjax = jest.genMockFn();
        CANTUS_MODULE._abortRequest = jest.genMockFn();
        let cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._getResolve = 5;
        cantus._getReject = 6;
        let mockEvent = 4;

        cantus._abortGet(mockEvent);

        expect(CANTUS_MODULE._abortRequest).toBeCalledWith(4, 6);
    });

    it('_errorGet() properly delegates to _errorRequest()', function() {
        CANTUS_MODULE._submitAjax = jest.genMockFn();
        CANTUS_MODULE._errorRequest = jest.genMockFn();
        let cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._getResolve = 5;
        cantus._getReject = 6;
        let mockEvent = 4;

        cantus._errorGet(mockEvent);

        expect(CANTUS_MODULE._errorRequest).toBeCalledWith(4, 6);
    });
});

describe('search()', function() {
    it('works with a valid query', function() {
        CANTUS_MODULE._submitAjax = jest.genMockFn();
        CANTUS_MODULE._findUrlFromType = jest.genMockFn();
        CANTUS_MODULE._findUrlFromType.mockReturnValue('fakeurl');
        CANTUS_MODULE._prepareSearchRequestBody = jest.genMockFn();
        CANTUS_MODULE._prepareSearchRequestBody.mockReturnValue('fakequery');
        let args = {'type': 'chant', 'incipit': 'deus'};
        let cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._hateoas = {'browse': 'some URLs and stuff'};
        let resolveReady = null;
        cantus.ready = {then: function(func){func()}};  // mock promise that calls "then" right away

        let actual = cantus.search(args);

        expect(CANTUS_MODULE._prepareSearchRequestBody).toBeCalledWith(args);
        expect(CANTUS_MODULE._submitAjax).toBeCalledWith(
            'SEARCH', 'fakeurl', {args: args, body: 'fakequery'}, cantus._loadSearch,
            cantus._errorSearch, cantus._abortSearch
        );
        expect(CANTUS_MODULE._findUrlFromType).toBeCalledWith('chant', cantus._hateoas, true);
        expect(typeof cantus._searchResolve).toBe('function');
        expect(typeof cantus._searchReject).toBe('function');
        expect(actual instanceof Promise).toBe(true);
    });

    it('rejects the Promise with an invalid query', function() {
        CANTUS_MODULE._submitAjax = jest.genMockFn();
        CANTUS_MODULE._findUrlFromType = jest.genMockFn();
        CANTUS_MODULE._findUrlFromType.mockReturnValue('fakeurl');
        CANTUS_MODULE._prepareSearchRequestBody = jest.genMockFn();
        CANTUS_MODULE._prepareSearchRequestBody.mockImpl(function() {throw new CANTUS_MODULE._QueryError()});
        let args = {'type': 'chant', 'cats': '"they meow"'};
        let cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._hateoas = {'browse': 'some URLs and stuff'};
        let resolveReady = null;
        cantus.ready = {then: function(func){func()}};  // mock promise that calls "then" right away
        // This Promise is resolved when the "then" or "catch" function is triggered on the Promise
        // returned by the function-under-test.
        let testAccept = null;
        let testPromise = new Promise(function(resolve, reject) { testAccept = resolve; });

        let actual = cantus.search(args);
        actual
            .then(function() { testAccept('then'); })
            .catch(function() { testAccept('catch'); })

        testPromise.then(function(calledFrom) {
            // "calledFrom" tells us whether we're being called from the "then" function on the
            // Promise returned by the function-under-test, or from the "catch" function on same.
            // We hope to be called from the "catch" function.
            //
            // Unfortunately, we can't make the test fail at this point, but we can at least make
            // sure we're called from the right function, and print a tough-to-ignore note if not.

            if ('catch' !== calledFrom) {
                console.log('\n!!!! HEY HEY HEY HEY HEY !!!!\n\nTEST ACTUALLY FAILED\n' +
                            'LOOK IN THE testPromise.then() FUNCTION IN "rejects the Promise with an invalid query"\n' +
                            'TEST ACTUALLY FAILED\n\n!!!! HEY HEY HEY HEY HEY !!!!\n');
            }
        });

        expect(CANTUS_MODULE._prepareSearchRequestBody).toBeCalledWith(args);
        expect(CANTUS_MODULE._submitAjax.mock.calls.length).toBe(1);  // only on initialization
        expect(typeof cantus._searchResolve).toBe('function');
        expect(typeof cantus._searchReject).toBe('function');
        expect(actual instanceof Promise).toBe(true);
    });

    it('_loadSearch() properly delegates to _loadResponse()', function() {
        CANTUS_MODULE._submitAjax = jest.genMockFn();
        CANTUS_MODULE._loadResponse = jest.genMockFn();
        let cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._searchResolve = 5;
        cantus._searchReject = 6;
        let mockEvent = 4;

        cantus._loadSearch(mockEvent);

        expect(CANTUS_MODULE._loadResponse).toBeCalledWith(4, 5, 6);
    });

    it('_abortSearch() properly delegates to _abortRequest()', function() {
        CANTUS_MODULE._submitAjax = jest.genMockFn();
        CANTUS_MODULE._abortRequest = jest.genMockFn();
        let cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._searchResolve = 5;
        cantus._searchReject = 6;
        let mockEvent = 4;

        cantus._abortSearch(mockEvent);

        expect(CANTUS_MODULE._abortRequest).toBeCalledWith(4, 6);
    });

    it('_errorSearch() properly delegates to _errorRequest()', function() {
        CANTUS_MODULE._submitAjax = jest.genMockFn();
        CANTUS_MODULE._errorRequest = jest.genMockFn();
        let cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._searchResolve = 5;
        cantus._searchReject = 6;
        let mockEvent = 4;

        cantus._errorSearch(mockEvent);

        expect(CANTUS_MODULE._errorRequest).toBeCalledWith(4, 6);
    });
});