module.exports = function(sequelize, DataTypes) {
  var Highscore = sequelize.define("Highscore", {
    name: DataTypes.STRING,
    score: DataTypes.INTEGER
  });
  return Highscore;
};
