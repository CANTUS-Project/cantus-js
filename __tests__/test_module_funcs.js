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
