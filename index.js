const http = require('http')

module.exports = (args = {
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
}) => {
  return function (req, res, next) {
    function checkRoute (args) {
      return args.routes.some(function (e) {
        const re = new RegExp('^' + e, 'i')

        return re.test(req.originalUrl)
      })
    }

    function getLoginRequirements (loginRequirementsAgs) {
      var params
      var requirementsRequest

      params = {
        host: args.api.host,
        port: args.api.port,
        path: '/openidm/selfservice/registration',
        headers: {
          'X-OpenIDM-Username': args.api.username,
          'X-OpenIDM-Password': args.api.password
        },
        method: 'GET'
      }

      requirementsRequest = http.request(params, function (resp) {
        var requestData

        requestData = ''

        resp.setEncoding('utf8')

        resp.on('data', function (chunk) {
          requestData += chunk
        })

        resp.on('end', function () {
          requestData = JSON.parse(requestData)

          req.session.frida.requirements = requestData.requirements

          req.session.save(function (err) {
            if (err) {
              console.log('session save error: ', err)
            }
          })

          loginRequirementsAgs.done()
        })
      })

      requirementsRequest.on('error', function (err) {
        console.log('login err', err)

        apiError({error: err})
      })

      requirementsRequest.end()
    }

    function postRegistration (postRegistrationArgs) {
      var data
      var post

      data = {
        input: {
          user: postRegistrationArgs.body
        }
      }

      data = JSON.stringify(data)

      params = {
        host: args.api.host,
        port: args.api.port,
        headers: {
          'X-OpenIDM-Username': args.api.username,
          'X-OpenIDM-Password': args.api.password,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        },
        path: '/openidm/selfservice/registration?_action=submitRequirements',
        method: 'POST'
      }

      post = http.request(params, function (resp) {
        var responseData

        responseData = ''

        resp.setEncoding('utf8')

        resp.on('data', function (chunk) {
          responseData += chunk
        })

        resp.on('end', function () {
          responseData = JSON.parse(responseData)

          if (responseData.status && responseData.status.success) {
            // if success, logging in with u/p provided for registraton

            login({
              userName: postRegistrationArgs.body.userName,
              password: postRegistrationArgs.body.password
            })
          } else {
            req.session.frida.message = JSON.stringify(responseData)

            req.session.save(function (err) {
              if (err) {
                console.log('session save error: ', err)
              }
            })

            res.redirect(args.registrationRoutes[0])
          }
        })
      })

      post.on('error', function (err) {
        console.log('post registration err', err)

        apiError({error: err})
      })

      post.write(data)

      post.end()
    }

    function login (loginArgs) {
      var loginRequest
      var responseData
      var responseCookies

      responseData = ''

      params = {
        host: args.api.host,
        port: args.api.port,
        headers: {
          'X-OpenIDM-Username': loginArgs.userName,
          'X-OpenIDM-Password': loginArgs.password
        },
        path: '/openidm/info/login',
        method: 'GET'
      }

      loginRequest = http.request(params, function (resp) {
        resp.setEncoding('utf8')

        responseCookies = resp.headers['set-cookie']

        if (responseCookies) {
          req.session.frida.sessionJwt = responseCookies.filter(function (e) {return e.split('=')[0] === 'session-jwt'})[0].split(';')[0].split('=')[1]
        }

        resp.on('data', function (chunk) {
          responseData += chunk
        })

        resp.on('end', function () {
          responseData = JSON.parse(responseData)

          req.session.frida.user = responseData

          req.session.save(function (err) {
            if (err) {
              console.log('session save error: ', err)
            }
          })

          if (
            req.session.frida.user.authorization &&
            req.session.frida.user.authorization.roles &&
            req.session.frida.user.authorization.roles.indexOf('openidm-authorized') !== -1
          ) {
            getProfile({user: req.session.frida.user})
          } else {
            req.session.frida.message = JSON.stringify(responseData)

            req.session.save(function (err) {
              if (err) {
                console.log('session save error: ', err)
              }
            })

            res.redirect(args.loginRoutes[0])
          }
        })
      })

      loginRequest.on('error', function (err) {
        console.log('login err', err)

        apiError({error: err})
      })

      loginRequest.end()
    }

    function apiError (apiErrorArgs) {
      req.session.frida.message = JSON.stringify(apiErrorArgs.error)

      req.session.save(function (err) {
        if (err) {
          console.log('session save error: ', err)
        }
      })

      res.redirect(args.loginRoutes[0])
    }

    function getProfile (getProfileArgs) {
      var loginRequest
      var responseData

      responseData = ''

      params = {
        host: args.api.host,
        port: args.api.port,
        headers: {
          'Cookie': 'session-jwt=' + req.session.frida.sessionJwt
        },
        path: '/openidm/managed/user/' + getProfileArgs.user.authorization.id,
        method: 'GET'
      }

      profileRequest = http.request(params, function (resp) {
        resp.setEncoding('utf8')

        resp.on('data', function (chunk) {
          responseData += chunk
        })

        resp.on('end', function () {
          responseData = JSON.parse(responseData)

          req.session.frida.profile = responseData

          req.session.save(function (err) {
            if (err) {
              console.log('session save error: ', err)
            }
          })

          res.redirect(args.loginRedirectRoute)
        })
      })

      profileRequest.on('error', function (err) {
        console.log('profile request err', err)
      })

      profileRequest.end()
    }

    function logout (logoutArgs) {
      var loginRequest
      var responseData

      responseData = ''

      params = {
        host: args.api.host,
        port: args.api.port,
        headers: {
          'Cookie': 'session-jwt=' + req.session.frida.sessionJwt,
          'X-Requested-With': 'frida'
        },
        path: '/openidm/authentication?_action=logout',
        method: 'POST'
      }

      req.session.frida = {};

      req.session.save(function (err) {
        if (err) {
          console.log('session save error: ', err)
        }
      })

      logoutRequest = http.request(params, function (resp) {
        resp.setEncoding('utf8')

        resp.on('data', function (chunk) {
          responseData += chunk
        })

        resp.on('end', function () {
        })
      })

      logoutRequest.on('error', function (err) {
        console.log('logout err', err)
      })

      logoutRequest.end()
    }

    if (req.session) {
      req.session.frida = req.session.frida || {}

      if (checkRoute({routes: args.logoutRoutes})) {
        logout()
      }

      if (checkRoute({routes: args.registrationRoutes})) {
        if (req.method === 'POST') {
          postRegistration({
            body: req.body
          })
        } else {
          getLoginRequirements({done: next})
        }
      } else if (checkRoute({routes: args.loginRoutes}) && req.method === 'POST') {
        login({
          userName: req.body.userName,
          password: req.body.password
        })
      } else {
        if (
          req.session.frida.user &&
          req.session.frida.user.authorization &&
          req.session.frida.user.authorization.roles &&
          req.session.frida.user.authorization.roles.indexOf('openidm-authorized') !== -1
          ||
          checkRoute({routes: args.loginFreeRoutes})) {
          next()
        } else {
          res.redirect(args.loginRoutes[0])
        }
      }
    } else {
      message = 'No recognizable session management found; looking for "req.session"'

      console.log(message)

      res.end(message)
    }
  }
}
