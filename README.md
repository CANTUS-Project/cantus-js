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

## Basic Examples (to Get Started)

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
}).catch(function(errorInfo) {
  // "errorInfo" holds information about an error, described in the get() docs below
  console.log(errorMessage);
});
```

Everything in ``searchParams`` is optional. If you don't specify a "type" it will search for resources
of any type. If you're giving a multi-word query like "in domine" above, you *must* include the
double-quote marks. You can use the "any" parameter to search all fields.

The useful parameters are different for every resource type. Refer to the
[Cantus API](https://cantus-api.readthedocs.org/en/latest/resource_types.html#simple-resource-types)
to know which fields are useful for which resource type.

If there is an error, including if no results are found, the ``catch()`` function runs instead of the
``then()`` function. You can use this to check if the error happened because no results were found:

```javascript
}).catch(function(errorMessage) {
  if (404 === errorMessage.code) {
    // tell the user somehow
  } else {
    // tell the user something else
  }
});
```
## How to Use Promises

JavaScript *Promises* are the key to CantusJS. Promises are a relatively new feature in JavaScript,
so users who do not update their browsers regularly may not be able to use CantusJS. We are planning
a work-around to this limitation in the near future.

A JavaScript Promise implements *asynchronous* behaviour in a consistent and reliable way. You get
a Promise when a function returns it. For the functions that return a Promise, you can think of
their behaviour as "I promise to do something for you, *then* call a particular function."

```javascript
var prom = addNumbers(2, 2);
prom.then(
  function(sum) {
    console.log(sum);
  }
);
```

In the example above, ``addNumbers()`` returns a Promise. We call the ``then()`` function on the
Promise, and give it a function that we want to execute when ``addNumbers()`` is finished. Although
``addNumbers()`` technically returns a *Promise* object, the meaningful return value is the
argument given to the function we supply to ``then()``. In this example, obviously, the number 4
will be printed in the console.

When something goes wrong, the ``then()`` function will not be called. To deal with errors, you
supply a function to the ``catch()`` function of a Promise. This is named after the "catch" branch
of a try/catch statement. In the following example, the ``catch()`` function would be called if the
argument to ``divideFiveBy()`` is zero.

```javascript
var prom = divideFiveBy(0);
prom.then(alert).catch(alert);
```

Note that you can provide *any* function as the argument to ``then()`` or ``catch()``. You don't
have to write the function out right there. You can give the same function to both ``then()``
and ``catch()``.

### What Asynchronous Really Means

Promises are *asynchronous*. This means you don't know when the ``then()`` or ``catch()`` function
will be called, and you don't know which one will be called.

Consider this example:

```javascript
console.log('1');
var prom = cantus.get({'id': '123'});
prom.then(function() {
  console.log('2');
});
console.log('3');
```
Because the ``then()`` function is only called *after* the request returns from the Cantus server,
the console output is almost certainly going to look like this:

```
1
3
2
```

Therefore, any code that accesses the server's response must be put in the ``then()`` or ``catch()``
functions.

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
    found and returned without issue. This function is given one arguments: the response body
    from the Cantus server, plus the response headers in the "header" member. Both are fully
    defined in the Cantus API.

    The response body looks approximately like this:

    ```javascript
    {
      '123': {'type': 'chant', 'id': '123', 'incipit': 'Et quoniam...'},
      '666': {'type': 'chant', 'id': '666', 'incipit': 'Yikes!'},
      'sort_order': ['123', '666'],
      'resources': {'123': {'self': 'http://cantus.org/123'},
                    '666': {'self': 'http://cantus.org/666'}}
    }
    ```

    The response headers are regularized, meaning the "X-Cantus" portion is removed, all characters
    are lowercase, and words are joined with underscores. Many requests will not have information
    in all the response headers. The headers object will contain "null" for those headers.

    ```javascript
    {
        'version': '3.2.6',
        'include_resources': 'true',
        'fields': 'id,type,incipit,indexer',
        'extra_fields': 'genre',
        'no_xref': 'false',
        'total_results': '4388',
        'page': '3',
        'per_page': '15',
        'sort': null,
        'search_help': null
    }
    ```

    The whole argument to the ``then()`` function therefore looks like this:

    ```javascript
    {
      '123': {'type': 'chant', 'id': '123', 'incipit': 'Et quoniam...'},
      '666': {'type': 'chant', 'id': '666', 'incipit': 'Yikes!'},
      'sort_order': ['123', '666'],
      'resources': {'123': {'self': 'http://cantus.org/123'},
                    '666': {'self': 'http://cantus.org/666'}},
      'headers': {
          'version': '3.2.6',
          'include_resources': 'true',
          'fields': 'id,type,incipit,indexer',
          'extra_fields': 'genre',
          'no_xref': 'false',
          'total_results': '4388',
          'page': '3',
          'per_page': '15',
          'sort': null,
          'search_help': null
      }
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
