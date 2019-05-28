var db = require("../models");

module.exports = function(app) {
  // Load index page
  app.get("/", function(req, res) {
    db.Highscore.findAll({}).then(function(dbHighscore) {
      res.render("index", {
        highscore: dbHighscore
      });
    });
  });

  app.get("/phaser", function(req, res) {
    db.Highscore.findAll({}).then(function() {
      res.render("phaser");
    });
  });

  // Load example page and pass in an example by id
  app.get("/highscore/:id", function(req, res) {
    db.Highscore.findOne({ where: { id: req.params.id } }).then(function(
      dbHighscore
    ) {
      res.render("highscore", {
        highscore: dbHighscore
      });
    });
  });

  // Render 404 page for any unmatched routes
  app.get("*", function(req, res) {
    res.render("404");
  });
};
