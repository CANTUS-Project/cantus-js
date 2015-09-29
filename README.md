# CantusJS

It's a simple JavaScript library for accessing a Cantus API server.

## License

*CantusJS* is copyrighted according to the terms of the GNU GPLv3+. A copy of the license is held in
the file called "LICENSE." This means that you must provide end users with a means to access the
library's source code. If you are using the *Abbot* Cantus API server, remember you must also
provide a means to access that application's source code.

## Compatibility

For now, CantusJS is only compatible with Firefox 29+, Chrome 32+, Opera 19+, Safari 7.1+, and
Microsoft Edge. Therefore, it's only suitable for testing, for now.

## Basic Examples (Get Started)

Copy the "cantus.js" file to your web server.

Add the following to your webpage:

```html
<script type="text/javascript" src="/path/to/cantus.js"></script>
```

Initialize a new Cantus object with your server's URL:

```javascript
var cantus = new cantusjs.Cantus('http://abbott.adjectivenoun.ca:8888');
```

Then scripts can call into the Cantus API like this:

```javascript
var searchParams = {type: 'chant', 'genre': 'antiphon', 'any': '"in domine"'};
cantus.search(searchParams).then(function(data) {
  // "data" holds the results in JSON
  console.log(data);
  // ... do whatever ...
}).catch(function(errorMessage) {
  // "errorMessage" holds the text of an error
  console.log(errorMessage);
});
```

Everything in "searchParams" is optional. If you don't specify a "type" it will search for resources
of any type. If you're giving a multi-word query like "in domine" above, you *must* include the
double-quote marks, as in the example above. You can use the "any" parameter to search all fields.

The useful parameters are different for every resource type. Refer to the
[Cantus API](https://cantus-api.readthedocs.org/en/latest/resource_types.html#simple-resource-types)
to know which fields are useful for which resource type.

If there is an error, including if no results are found, the "catch" function runs instead of the
"then" function. You can use this to check if the error happened because no results were found:

```javascript
}).catch(function(errorMessage) {
  // "errorMessage" holds the text of an error
  if (errorMessage.startsWith('404') {
    // tell the user somehow
  } else {
    // tell the user something else
  }
});
```
## How to Use Promises

TODO: write this section!

## Function Specification

### Cantus.get()

Submit a GET request to the Cantus server.

#### Parameters

- args (Object) Arguments to use to create the request. All are optional. Possibilities are:
    - ``id``: to fetch a resource with a known ID
    - ``type``: to fetch a resource of a particular type
    - ``page``: the page number of results to fetch
    - ``per_page``: the number of results to return on every "page"
    - ``fields``: comma-separated list of fields to include in the results
    - ``sort``: value for the "X-Cantus-Sort" HTTP header

#### Returns

This function returns a Promise. Refer to the description above to know what this means.

- ``then()`` The Promise returned by this function is resolved to the then() function when the
    server returns a "200" response code, meaning that the requested resource(s) was/were
    found and returned without issue. This function is given a single argument, which is the
    response body from the Cantus server, which is fully defined in the Cantus API. It looks
    approximately like this:

    ```javascript
    {
      '123': {'type': 'chant', 'id': '123', 'incipit': 'Et quoniam...'},
      '666': {'type': 'chant', 'id': '666', 'incipit': 'Yikes!'},
      'resources': {'123': {'self': 'http://cantus.org/123'},
                    '666': {'self': 'http://cantus.org/666'}},
      'sort_order': ['123', '666']
    }
    ```

- ``catch()`` The Promise returned by this function is resolved to the catch() function when the
    server returns any response code other than 200 *or* when the request fails or any other
    reason (the user cancelled it, the computer is disconnected from the internet, etc.).
    This function is given a single argument: a JavaScript Object with three members (code,
    reason, and response). For example:

    ```javascript
    {
      'code': 404,
      'reason': 'Not Found',
      'response': '404: Not Found'
    }
    ```

    This argument means the request was completed, and the server responded that there are no
    resources that satisfy the request (e.g., the "id" was wrong, the search request was too
    specific, or similar).

    If the request fails in the browser (meaning the "error" or "abort" event happened), the
    "code" member is set to 0 (zero) which allows the following:

    ```javascript
    .catch(function(response) {
      if (response.code > 0) {
        // we know the server responded with an error
      } else {
        // we know the server never got the request
      }
    }
    ```

    Finally, it should be noted that, although the "response" member is currently redundant
    because it contains the same information as the code and reason, this may not always be
    the case. Future versions of Abbot may return more informative responses to an error,
    describing in more detail how and why the request failed. When that happens, the
    "response" member will become significantly more helpful!

### Cantus.search()

Submit a SEARCH request to the Cantus server.

#### Parameters

- args (Object) Arguments to use to create the request. All are optional. This includes all
    the fields listed for get() function *except* "id". If you know a resource ID, use get().
    In addition, this function accepts any field name associated with any resource type
    defined in the Cantus API. This function does not check that the fields requested are in
    fact valid for the resource type requested in the "type" member (that is, this function
    will not stop you from searching for the "first_name" of a "chant" for example).

#### Returns

The "return behaviour" of this function is identical to get(). Please refer to that
function's documentation.
