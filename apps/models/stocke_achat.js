module.exports = (sequelize, DataTypes) => {
    const StockeAchat = sequelize.define("StockeAchat", {
        id_achat: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        cin_employe: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        id_stocke: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        quantite: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        date_achat: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        }
    });

    StockeAchat.associate = (models) => {
        StockeAchat.belongsTo(models.Employe, { foreignKey: 'cin_employe' });
        StockeAchat.belongsTo(models.Stocke, { foreignKey: 'id_stocke' });
    };

    return StockeAchat;
};
