// -*- coding: utf-8 -*-
//-------------------------------------------------------------------------------------------------
// Program Name:           CantusJS
// Program Description:    It's a simple JavaScript library for accessing a Cantus API server.
//
// Filename:               __tests__/test_query_stuff.js
// Purpose:                Tests for query-related functionality.
//
// Copyright (C) 2015, 2016 Christopher Antila
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
    beforeAll(() => {
        this._submitAjax = CANTUS_MODULE._submitAjax;
        this._findUrlFromType = CANTUS_MODULE._findUrlFromType;
        this._loadResponse = CANTUS_MODULE._loadResponse;
        this._abortRequest = CANTUS_MODULE._abortRequest;
        this._errorRequest = CANTUS_MODULE._erroRequest;
    });
    beforeEach(() => {
        CANTUS_MODULE._submitAjax = jest.genMockFn();
        CANTUS_MODULE._findUrlFromType = jest.genMockFn();
        CANTUS_MODULE._findUrlFromType.mockReturnValue('fakeurl');
        CANTUS_MODULE._loadResponse = jest.genMockFn();
        CANTUS_MODULE._abortRequest = jest.genMockFn();
        CANTUS_MODULE._errorRequest = jest.genMockFn();
    });
    afterAll(() => {
        CANTUS_MODULE._submitAjax = this._submitAjax;
        CANTUS_MODULE._findUrlFromType = this._findUrlFromType;
        CANTUS_MODULE._loadResponse = this._loadResponse;
        CANTUS_MODULE._abortRequest = this._abortRequest;
        CANTUS_MODULE._erroRequest = this._errorRequest;
    });

    it('behaves properly', () => {
        const cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._hateoas = {'browse': 'some URLs and stuff'};
        cantus.ready = {then: (func) => {func()}};  // mock promise that calls "then" right away
        const args = {'type': 'chant', 'id': 'what'};

        const actual = cantus.get(args);

        expect(CANTUS_MODULE._submitAjax.mock.calls.length).toBe(2);
        expect(CANTUS_MODULE._submitAjax).toBeCalledWith(
            'GET',
            'fakeurl',
            {args: args, body: null},
            jasmine.any(Function),  // detailed check just below...
            jasmine.any(Function),
            jasmine.any(Function)
        );
        expect(CANTUS_MODULE._submitAjax.mock.calls[1][3].name).toBe('bound _loadGet');
        expect(CANTUS_MODULE._submitAjax.mock.calls[1][4].name).toBe('bound _errorGet');
        expect(CANTUS_MODULE._submitAjax.mock.calls[1][5].name).toBe('bound _abortGet');
        expect(CANTUS_MODULE._findUrlFromType).toBeCalledWith('chant', cantus._hateoas, true, 'what');
        expect(typeof cantus._getResolve).toBe('function');
        expect(typeof cantus._getReject).toBe('function');
        expect(actual instanceof Promise).toBe(true);
    });

    it('rejects the Promise when the resource type is invalid', () => {
        const cantus = new CANTUS_MODULE.Cantus('theserver');
        CANTUS_MODULE._findUrlFromType = this._findUrlFromType;  // unmock!
        cantus._hateoas = {'view': {'chant': '123'}};
        cantus.ready = {then: (func) => {func()}};  // mock promise that calls "then" right away
        const args = {'type': 'rabbit', 'id': 'what'};

        const actual = cantus.get(args);

        return actual.catch((errMsg) => {
            expect(errMsg.slice(0, 24)).toBe('Could not find a URL for');
        });
    });

    it('rejects the Promise when another error happens', () => {
        // giving an invalid HATEOAS dict to _findUrlFromType() leads to a TypeError
        const cantus = new CANTUS_MODULE.Cantus('theserver');
        CANTUS_MODULE._findUrlFromType = this._findUrlFromType;  // unmock!
        cantus._hateoas = {'fffffffffff': 14};
        cantus.ready = {then: (func) => {func()}};  // mock promise that calls "then" right away
        const args = {'type': 'rabbit', 'id': 'what'};

        const actual = cantus.get(args);

        return actual.catch((errMsg) => {
            expect(errMsg).toBe('Unrecoverable error while parsing query');
        });
    });

    it('_loadGet() properly delegates to _loadResponse()', () => {
        const cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._getResolve = 5;
        cantus._getReject = 6;
        const mockEvent = 4;

        cantus._loadGet(mockEvent);

        expect(CANTUS_MODULE._loadResponse).toBeCalledWith(4, 5, 6);
    });

    it('_abortGet() properly delegates to _abortRequest()', () => {
        const cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._getResolve = 5;
        cantus._getReject = 6;
        const mockEvent = 4;

        cantus._abortGet(mockEvent);

        expect(CANTUS_MODULE._abortRequest).toBeCalledWith(4, 6);
    });

    it('_errorGet() properly delegates to _errorRequest()', () => {
        const cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._getResolve = 5;
        cantus._getReject = 6;
        const mockEvent = 4;

        cantus._errorGet(mockEvent);

        expect(CANTUS_MODULE._errorRequest).toBeCalledWith(4, 6);
    });
});


describe('search()', function() {
    beforeAll(() => {
        this._submitAjax = CANTUS_MODULE._submitAjax;
        this._findUrlFromType = CANTUS_MODULE._findUrlFromType;
        this._loadResponse = CANTUS_MODULE._loadResponse;
        this._abortRequest = CANTUS_MODULE._abortRequest;
        this._errorRequest = CANTUS_MODULE._erroRequest;
    });
    beforeEach(() => {
        CANTUS_MODULE._submitAjax = jest.genMockFn();
        CANTUS_MODULE._findUrlFromType = jest.genMockFn();
        CANTUS_MODULE._findUrlFromType.mockReturnValue('fakeurl');
        CANTUS_MODULE._loadResponse = jest.genMockFn();
        CANTUS_MODULE._abortRequest = jest.genMockFn();
        CANTUS_MODULE._errorRequest = jest.genMockFn();
    });
    afterAll(() => {
        CANTUS_MODULE._submitAjax = this._submitAjax;
        CANTUS_MODULE._findUrlFromType = this._findUrlFromType;
        CANTUS_MODULE._loadResponse = this._loadResponse;
        CANTUS_MODULE._abortRequest = this._abortRequest;
        CANTUS_MODULE._erroRequest = this._errorRequest;
    });

    it('works with a valid query', () => {
        const args = {'type': 'chant', 'incipit': 'deus'};
        const cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._hateoas = {'browse': 'some URLs and stuff'};
        cantus.ready = {then: function(func){func()}};  // mock promise that calls "then" right away

        const actual = cantus.search(args);

        expect(CANTUS_MODULE._submitAjax).toBeCalledWith(
            'SEARCH',
            'fakeurl',
            {args: args, body: '{"query":"incipit:deus"}'},
            jasmine.any(Function),  // detailed check just below...
            jasmine.any(Function),
            jasmine.any(Function)
        );
        expect(CANTUS_MODULE._submitAjax.mock.calls[1][3].name).toBe('bound _loadSearch');
        expect(CANTUS_MODULE._submitAjax.mock.calls[1][4].name).toBe('bound _errorSearch');
        expect(CANTUS_MODULE._submitAjax.mock.calls[1][5].name).toBe('bound _abortSearch');
        expect(CANTUS_MODULE._findUrlFromType).toBeCalledWith('chant', cantus._hateoas, true);
        expect(typeof cantus._searchResolve).toBe('function');
        expect(typeof cantus._searchReject).toBe('function');
        expect(actual instanceof Promise).toBe(true);
    });

    it('rejects the Promise with an invalid query', () => {
        const args = {'type': 'chant', 'cats': '"they meow"'};
        const cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._hateoas = {'browse': {'chant': '123'}};
        cantus.ready = {then: (func) => {func();}};  // mock promise that calls "then" right away

        const actual = cantus.search(args);

        return actual.catch((errMsg) => {
            expect(errMsg.slice(0, 22)).toBe('Invalid field in query');
        });
    });

    it('rejects the Promise when the resource type is invalid', () => {
        const args = {'type': 'rabbit', 'incipit': '"meow in excelsis*"'};
        const cantus = new CANTUS_MODULE.Cantus('theserver');
        CANTUS_MODULE._findUrlFromType = this._findUrlFromType;  // unmock!
        cantus._hateoas = {'browse': {'chant': '123'}};
        cantus.ready = {then: (func) => {func()}};  // mock promise that calls "then" right away

        const actual = cantus.search(args);

        return actual.catch((errMsg) => {
            expect(errMsg.slice(0, 24)).toBe('Could not find a URL for');
        });
    });

    it('rejects the Promise when another error happens', () => {
        // giving an invalid HATEOAS dict to _findUrlFromType() leads to a TypeError
        const args = {'type': 'chant', 'incipit': '"meow in excelsis*"'};
        const cantus = new CANTUS_MODULE.Cantus('theserver');
        CANTUS_MODULE._findUrlFromType = this._findUrlFromType;  // unmock!
        cantus._hateoas = {'fffffffffff': 14};
        cantus.ready = {then: (func) => {func()}};  // mock promise that calls "then" right away

        const actual = cantus.search(args);

        return actual.catch((errMsg) => {
            expect(errMsg).toBe('Unrecoverable error while parsing query');
        });
    });

    it('_loadSearch() properly delegates to _loadResponse()', () => {
        const cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._searchResolve = 5;
        cantus._searchReject = 6;
        const mockEvent = 4;

        cantus._loadSearch(mockEvent);

        expect(CANTUS_MODULE._loadResponse).toBeCalledWith(4, 5, 6);
    });

    it('_abortSearch() properly delegates to _abortRequest()', () => {
        const cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._searchResolve = 5;
        cantus._searchReject = 6;
        const mockEvent = 4;

        cantus._abortSearch(mockEvent);

        expect(CANTUS_MODULE._abortRequest).toBeCalledWith(4, 6);
    });

    it('_errorSearch() properly delegates to _errorRequest()', () => {
        const cantus = new CANTUS_MODULE.Cantus('theserver');
        cantus._searchResolve = 5;
        cantus._searchReject = 6;
        const mockEvent = 4;

        cantus._errorSearch(mockEvent);

        expect(CANTUS_MODULE._errorRequest).toBeCalledWith(4, 6);
    });
});
