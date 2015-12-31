// -*- coding: utf-8 -*-
//-------------------------------------------------------------------------------------------------
// Program Name:           vitrail
// Program Description:    HTML/CSS/JavaScript user agent for the Cantus API.
//
// Filename:               __mocks__/cantus.src.js
// Purpose:                CantusJS mock for Vitrail.
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

// The goal of mocking CantusJS at all is to prevent the variability (and burden) of using a real
// Abbot server in the Vitrail test suite. However, Vitrail uses VALID_FILEDS and convertTypeNumber()
// which don't access Abbot, and can therefore safely remain unmocked.

const cantusModule = require.requireActual('../cantus.src');
let cantusMock = jest.genMockFromModule('../cantus.src');


cantusMock.cantusModule.VALID_FIELDS = cantusModule.cantusModule.VALID_FIELDS;
cantusMock.cantusModule.convertTypeNumber = cantusModule.cantusModule.convertTypeNumber;


module.exports = cantusMock;
