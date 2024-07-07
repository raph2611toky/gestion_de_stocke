// apps.models.index.js

const db_config = require("../../config/db_config.js");
const { Sequelize, DataTypes } = require("sequelize");
const path = require("path");

// :::: Configurer le base donnée à sequelize :::: //
const sequelize = new Sequelize(
  db_config.DB,
  db_config.USER,
  db_config.PASSWORD,
  {
    host: db_config.HOST,
    dialect: db_config.dialect,
    logging: false,
    pool: {
      max: db_config.pool.max,
      min: db_config.pool.min,
      acquire: db_config.pool.acquire,
      idle: db_config.pool.idle,
    },
  }
);

sequelize
  .authenticate()
  .then(() => {
    console.log("connected...");
  })
  .catch((err) => {
    console.log("Error " + err);
  });

const db = {};

db.Sequelize = sequelize;
db.sequelize = sequelize;

db.employe = require("./employe.js")(sequelize, DataTypes);
db.stocke = require("./stocke")(sequelize,DataTypes);
db.StockeAchat = require("./stocke_achat")(sequelize,DataTypes);

db.sequelize.sync({ force: false }).then(() => {
    console.log("yes re-sync done!");
  });
  
module.exports = db;
  