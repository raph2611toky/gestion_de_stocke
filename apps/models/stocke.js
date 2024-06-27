module.exports = (sequelize, DataTypes) => {
    const Stocke = sequelize.define("Stocke", {
        id_stocke: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        nom_stocke: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        poids_en_gramme: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        prix_en_ariary: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        nombre: {
            type: DataTypes.INTEGER,
            allowNull: false,
            default: 0,
        },
        description: {
            type: DataTypes.STRING(200),
            allowNull: true,
        }
    });

    return Stocke;
};
