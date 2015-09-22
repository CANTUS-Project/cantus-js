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


jest.dontMock('../cantus');


describe('get()', function() {
    it('behaves properly', function() {
        var cantusModule = require('../cantus');
        cantusModule._submitAjax = jest.genMockFn();
        cantusModule._findUrlFromType = jest.genMockFn();
        cantusModule._findUrlFromType.mockReturnValue('fakeurl');
        var cantus = new cantusModule.Cantus('theserver');
        cantus._hateoas = {'browse': 'some URLs and stuff'};
        var resolveReady = null;
        cantus.ready = {then: function(func){func()}};  // mock promise that calls "then" right away

        var actual = cantus.get({'type': 'chant'});

        expect(cantusModule._submitAjax.mock.calls.length).toBe(2);
        expect(cantusModule._submitAjax).toBeCalledWith('GET', 'fakeurl', null, cantus._loadGet);
        expect(cantusModule._findUrlFromType).toBeCalledWith('chant', cantus._hateoas.browse, true);
        expect(typeof cantus._getResolve).toBe('function');
        expect(typeof cantus._getReject).toBe('function');
        expect(actual instanceof Promise).toBe(true);
    });
});

describe('search()', function() {
    it('works with a valid query', function() {
        var cantusModule = require('../cantus');
        cantusModule._submitAjax = jest.genMockFn();
        cantusModule._findUrlFromType = jest.genMockFn();
        cantusModule._findUrlFromType.mockReturnValue('fakeurl');
        cantusModule._prepareSearchRequestBody = jest.genMockFn();
        cantusModule._prepareSearchRequestBody.mockReturnValue('fakequery');
        var args = {'type': 'chant', 'incipit': 'deus'};
        var cantus = new cantusModule.Cantus('theserver');
        cantus._hateoas = {'browse': 'some URLs and stuff'};
        var resolveReady = null;
        cantus.ready = {then: function(func){func()}};  // mock promise that calls "then" right away

        var actual = cantus.search(args);

        expect(cantusModule._prepareSearchRequestBody).toBeCalledWith(args);
        expect(cantusModule._submitAjax).toBeCalledWith('SEARCH', 'fakeurl', 'fakequery', cantus._loadSearch);
        expect(cantusModule._findUrlFromType).toBeCalledWith('chant', cantus._hateoas.browse, true);
        expect(typeof cantus._searchResolve).toBe('function');
        expect(typeof cantus._searchReject).toBe('function');
        expect(actual instanceof Promise).toBe(true);
    });

    it('rejects the Promise with an invalid query', function() {
        var cantusModule = require('../cantus');
        cantusModule._submitAjax = jest.genMockFn();
        cantusModule._findUrlFromType = jest.genMockFn();
        cantusModule._findUrlFromType.mockReturnValue('fakeurl');
        cantusModule._prepareSearchRequestBody = jest.genMockFn();
        cantusModule._prepareSearchRequestBody.mockImpl(function() {throw new cantusModule._QueryError()});
        var args = {'type': 'chant', 'cats': '"they meow"'};
        var cantus = new cantusModule.Cantus('theserver');
        cantus._hateoas = {'browse': 'some URLs and stuff'};
        var resolveReady = null;
        cantus.ready = {then: function(func){func()}};  // mock promise that calls "then" right away

        var actual = cantus.search(args);

        // TODO: find a way to ensure the "actual" Promise was rejected...
        //       I've confirmed it already informally, but how to test it consistently? Issue #8
        expect(cantusModule._prepareSearchRequestBody).toBeCalledWith(args);
        expect(cantusModule._submitAjax.mock.calls.length).toBe(1);  // only on initialization
        expect(typeof cantus._searchResolve).toBe('function');
        expect(typeof cantus._searchReject).toBe('function');
        expect(actual instanceof Promise).toBe(true);
    });
});
