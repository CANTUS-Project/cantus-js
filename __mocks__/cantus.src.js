// -*- coding: utf-8 -*-
//-------------------------------------------------------------------------------------------------
// Program Name:           vitrail
// Program Description:    HTML/CSS/JavaScript user agent for the Cantus API.
//
// Filename:               __mocks__/cantus.src.js
// Purpose:                CantusJS mock for Vitrail.
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

// The goal of mocking CantusJS at all is to prevent the variability (and burden) of using a real
// Abbot server in the Vitrail test suite.
//
// Because CantusJS is basically an internal module, and I know it's... well, it's as trustworthy
// as I make it, I don't mind using the actual implementation *except* where it makes network
// requests. Therefore, this custom mock modifies the actual CantusJS module in the following ways:
// - mocking cantusModule._submitAjax

const cantusModule = require.requireActual('../cantus.src');

cantusModule.cantusModule._submitAjax = jest.genMockFunction();


module.exports = cantusModule;
