var db = require("../models");

module.exports = function(app) {
  // Get all examples
  app.get("/api/highscores", function(req, res) {
    db.Highscore.findAll({}).then(function(dbHighscore) {
      res.json(dbHighscore);
    });
  });

  // Create a new example
  app.post("/api/highscores", function(req, res) {
    db.Highscore.create(req.body).then(function(dbHighscore) {
      res.json(dbHighscore);
    });
  });

  // Delete an example by id
  app.delete("/api/highscores/:id", function(req, res) {
    db.Highscore.destroy({ where: { id: req.params.id } }).then(function(
      dbHighscore
    ) {
      res.json(dbHighscore);
    });
  });
};
