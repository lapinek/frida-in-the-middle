const frida = require('./index')

if (typeof frida !== 'function') {
  throw new Error('frida is not a function')
}
