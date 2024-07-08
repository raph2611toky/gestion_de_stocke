module.exports = (sequelize, DataTypes) => {
    const Employe = sequelize.define("Employe", {
        cin: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: false,
        },
        nom: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    });

    return Employe;
};
