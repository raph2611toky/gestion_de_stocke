// config.db_config.js

module.exports = {
    HOST: 'localhost',
    USER: 'raph',
    PASSWORD: 'hpar',
    DB: 'gestiondestocque', 
    dialect: 'mariadb', 

    pool: {
        max:5,
        min:0,
        acquire:3000,
        idle:2000
    },
    logging: false,
}