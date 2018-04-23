# frida-in-the-middle

Authentication middleware for use with [Node](https://nodejs.org/) and [Express](http://expressjs.com)  

This is a demo implementation not designed for any kind of production use

## Features

* Registration and authentication against **F**orge**R**ock **ID**M 5.5 **A**PI
* Relies on presence of persistent server-side `req.session`, e.g. delivered by [express-session](https://www.npmjs.com/package/express-session)
* utilizes `express.urlencoded` middleware

## Installation

    $ npm install frida-in-the-middle

## Options

* `[loginFreeRoutes]` not requiring login
* `[loginRoutes]` login form(s)
* `[registrationRoutes]` registration form(s)
* `[logoutRoutes]` logging out URL(s)
* `[loginRedirectRoute]` URL to open after logging in
* `{api}` API instance particularities:
  * `host` hostname, e.g. 'localhost'
  * `port` port, e.g. '8080'
  * `protocol` 'http' is the only supported one at the moment
  * `username` the anonymous user, e.g. 'anonymous',
  * `password` the user's password, e.g. 'anonymous'
}

## Example
    const session = require('express-session')

    app.use(session({
      secret: 'there-is-no-privacy-get-over-it',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 4
      },
      name: 'forgerock'
    }))

    // frida-in-the-middle: start
    app.use(express.urlencoded({
      extended: true
    }))

    const frida = require('frida-in-the-middle')

    app.use(frida({
      loginFreeRoutes: [
          '/session/login',
          '/session/logout',
          '/session/registration'
      ],
      loginRoutes: ['/session/login'],
      registrationRoutes: ['/session/registration'],
      logoutRoutes: ['/session/logout'],
      loginRedirectRoute: '/profile',
      api: {
        host: 'localhost',
        port: '8080',
        protocol: 'http',
        username: 'anonymous',
        password: 'anonymous'
      }
    }))
    // frida-in-the-middle: end

## Client

The registration route will respond with requirements object attached to `frida` namespace in the session, i.e. `req.session.frida.requirements`

Successful registration or/and login will attach `user`, `profile`, and `sessionJwt` objects, the latter being authentication cookie returned from the API, i.e.: `req.session.frida.user`, `req.session.frida.profile`, `req.session.frida.sessionJwt`

In certain cases `message` string will be attached to the session, i.e. `req.session.frida.message`

The above can be used in building client interface, e.g. employing templaiting engine.

## License

(The MIT License)

Copyright (c) 2018 lapinek

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
