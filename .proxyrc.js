const serveStatic = require('serve-static')

/* Serves the Map/Schemas/Views from the filesystem */
module.exports = function (app) {
  // Use static middleware
  app.use(serveStatic('public'))
}