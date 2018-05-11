# frida-in-the-middle

Authentication middleware for use with [Node](https://nodejs.org/) and [Express](http://expressjs.com)  

This is a demo implementation not designed for any kind of production use

## Features

* Registration and authentication against **F**orge**R**ock **ID**M 5.5 **A**PI
* Relies on presence of persistent server-side `req.session`, e.g. delivered by [express-session](https://www.npmjs.com/package/express-session)
* Utilizes `express.urlencoded` middleware

## Installation

    $ npm install frida-in-the-middle

## Options

* `[loginFreeRoutes]` URL(s) not requiring login
* `[loginRoutes]` login form(s)
* `[registrationRoutes]` registration form(s)
* `[logoutRoutes]` logging out URL(s)
* `[loginRedirectRoute]` URL to redirect to after logging in
* `{api}` API instance particularities:
  * `host` hostname
  * `port` port
  * `protocol` 'http' is the only supported one at the moment
  * `username` the anonymous user
  * `password` the user's password

## Examples

### 1. Existing API is accessible via `idm55-api-host:8080`

Code similar to the following block is to be included in the main JS file

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
        host: 'idm55-api-host',
        port: '8080',
        protocol: 'http',
        username: 'anonymous',
        password: 'anonymous'
      }
    }))
    // frida-in-the-middle: end

Different (API) hostname/port must be accommodated in the middleware call, e.g.

    {
      ...
      host: 'my-idm55-api-host',
      port: '8888',
      ..
    }

An example of [Node](https://nodejs.org/)/[Express](http://expressjs.com) application: [frida-in-the-middle-demo](https://github.com/lapinek/frida-in-the-middle-demo)

### 2. Running IDM and the [Node](https://nodejs.org/)/[Express](http://expressjs.com) application in Docker containers

Create an image of the [Node](https://nodejs.org/)/[Express](http://expressjs.com) application, e.g. [fida-in-the-middle-demo Docker](https://github.com/lapinek/frida-in-the-middle-demo#docker)

Optionally publish the image

#### Bridge network

Run the IDM image, e.g.

    $ docker run -d -p 8080:8080 IDM-image

Run the [Node](https://nodejs.org/)/[Express](http://expressjs.com) application image, e.g.

    $ docker run -d -p 4040:4040 lapinek/frida-in-the-middle-demo:0.1.0

Check if the containers are ready

    $ docker container logs container-name-or-id

Create network

    $ docker network create idm

Connect the IDM container

    $ docker network connect --alias idm55-api-host idm idm-container-name-or-id

Connect the frida-in-the-middle-demo container

    $ docker network connect idm frida-in-the-middle-demo-container-name-or-id

Now, the demo application should be able to communicate with the API via its network alias.

IF the application was referring to the API host as `localhost`, the frida-in-the-middle-demo application would need to be connected to the host machine, e.g.

    $ docker run -p 4040:4040 --network="host" lapinek/frida-in-the-middle-demo:0.1.0

Run the application

    http://localhost:4040

#### Overlay network

With the API host aliased, e.g. `idm55-api-host`, containers can communicate when running as services in a Docker swarm

Create a compose file, e.g. compose.yml  

    version: "3"
    services:
      frida:
        image: lapinek/frida-in-the-middle-demo:0.1.0
        deploy:
          replicas: 1
          resources:
            limits:
              cpus: ".1"
              memory: 50M
          restart_policy:
            condition: on-failure
        ports:
          - "4040:4040"
        networks:
          - frida
      exercise:
        image: IDM-image
        deploy:
          replicas: 1
          resources:
            limits:
              cpus: "1"
              memory: 4096M
          restart_policy:
            condition: on-failure
        ports:
          - "8080:8080"
        networks:
          frida:
            aliases:
              - idm55-api-host    
    networks:
      frida:

Run the images

    $ docker swarm init

    $ docker stack deploy -c compose.yml frida-in-the-middle-demo

Check if the containers are ready

    $ docker container logs container-name-or-id

Run the application

    http://localhost:4040


## Client

The registration route will respond with requirements object attached to `frida` namespace in the session, i.e. `req.session.frida.requirements`

Successful registration or/and login will attach `user`, `profile`, and `sessionJwt` objects, the latter being authentication cookie returned from the API, i.e. `req.session.frida.user`, `req.session.frida.profile`, and `req.session.frida.sessionJwt`

In certain cases `message` string will be attached to the session, i.e. `req.session.frida.message`

The above can be used in building client interface, optionally employing templating engine

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
