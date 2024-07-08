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
        prix_en_ariary: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        marque: {
            type: DataTypes.STRING,
            allowNull: true
        },
        version:{
            type: DataTypes.STRING,
            allowNull:false
        },
        nombre: {
            type: DataTypes.INTEGER,
            allowNull: false,
            default: 0,
        },
        description: {
            type: DataTypes.STRING(200),
            allowNull: true,
        },
        cin_employe: {
            type:DataTypes.STRING,
            allowNull: false
        }
    });
    Stocke.associate = (models) => {
        Stocke.belongsTo(models.Employe, { foreignKey: 'cin_employe',as:'employe'});
    };

    return Stocke;
};
