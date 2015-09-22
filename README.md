CantusJS
========

It's a simple JavaScript library for accessing a Cantus API server.

License
-------

*CantusJS* is copyrighted according to the terms of the GNU GPLv3+. A copy of the license is held in
the file called "LICENSE." This means that you must provide end users with a means to access the
library's source code. If you are using the *Abbot* Cantus API server, remember you must also
provide a means to access that application's source code.

Compatibility
-------------

For now, CantusJS is only compatible with Firefox 29+, Chrome 32+, Opera 19+, Safari 7.1+, and
Microsoft Edge. Therefore, it's only suitable for testing, for now.

How to Use CantusJS
-------------------

Copy the "cantus.js" file to your web server.

Add the following to your webpage:

    <script type="text/javascript" src="/path/to/cantus.js"></script>

Initialize a new Cantus object with your server's URL:

    var cantus = new cantusjs.Cantus('http://abbott.adjectivenoun.ca:8888');

Then scripts can call into the Cantus API like this:

    var searchParams = {type: 'chant', 'genre': 'antiphon', 'any': '"in domine"'};
    cantus.search(searchParams).then(function(data) {
        // "data" holds the results in JSON
        console.log(data);
        // ... do whatever ...
    }).catch(function(errorMessage) {
        // "errorMessage" holds the text of an error
        console.log(errorMessage);
    });

Everything in "searchParams" is optional. If you don't specify a "type" it will search for resources
of any type. If you're giving a multi-word query like "in domine" above, you *must* include the
double-quote marks, as in the example above. You can use the "any" parameter to search all fields.

The useful parameters are different for every resource type. Here's a list of all of the parameters:
['id', 'type', 'name', 'description', 'mass_or_office', 'date', 'feast_code',
'incipit', 'source', 'marginalia', 'folio', 'sequence', 'office', 'genre', 'position',
'cantus_id', 'feast', 'mode', 'differentia', 'finalis', 'full_text',
'full_text_manuscript', 'full_text_simssa', 'volpiano', 'notes', 'cao_concordances',
'siglum', 'proofreader', 'melody_id', 'title', 'rism', 'provenance', 'century',
'notation_style', 'editors', 'indexers', 'summary', 'liturgical_occasion',
'indexing_notes', 'indexing_date', 'display_name', 'given_name', 'family_name',
'institution', 'city', 'country', 'source_id', 'office_id', 'genre_id', 'feast_id',
'provenance_id', 'century_id','notation_style_id'];

If there is an error, including if no results are found, the "catch" function runs instead of the
"then" function. You can use this to check if the error happened because no results were found:

    }).catch(function(errorMessage) {
        // "errorMessage" holds the text of an error
        if (errorMessage.startsWith('404') {
            // tell the user somehow
        } else {
            // tell the user something else
        }
    });
