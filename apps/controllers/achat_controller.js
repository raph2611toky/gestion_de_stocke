const { ValidationError, UniqueConstraintError, Op } = require("sequelize");
const db = require("../models");
const Helper = require('../../config/helper');

const Stocke = db.Stocke;
const Sequelize = db.Sequelize;
const StockeAchat = db.StockeAchat;

const addAchat = async (req, res) => {
    try {
        const { achats } = req.body;
        console.log(req);
        const cin_employe = req.user.cin;

        const achatPromises = achats.map(async (achat) => {
            const { id_stocke, quantite } = achat;

            const stocke = await Stocke.findByPk(id_stocke);
            if (!stocke) {
                throw new Error(`Le stocke avec l'ID ${id_stocke} n'existe pas.`);
            }

            if (stocke.nombre < quantite) {
                throw new Error(`La quantité demandée pour le stocke avec l'ID ${id_stocke} dépasse la quantité disponible.`);
            }

            stocke.nombre -= quantite;
            await stocke.save();

            return StockeAchat.create({ cin_employe, id_stocke, quantite });
        });

        const achatsResult = await Promise.all(achatPromises);

        return Helper.send_res(res, achatsResult, 201);
    } catch (err) {
        console.error(err);
        const message = `Impossible de créer cet achat ! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: err.message || message }, 400);
    }
};


const getAchatsByEmploye = async (req, res) => {
    try {
        const cin_employe = req.user.cin;
        const achats = await StockeAchat.findAll({
            where: { cin_employe },
            include: [
                { model: Stocke, attributes: ['nom_stocke', 'poids_en_gramme', 'prix_en_ariary'] }
            ],
            order: [['date_achat', 'DESC']]
        });
        

        return Helper.send_res(res, achats);
    } catch (err) {
        console.error(err);
        const message = `Impossible de récupérer l'historique des achats ! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: message }, 400);
    }
};

const getAllAchats = async (req, res) => {
    try {
        //GET /api/achats?dateDebut=2024-01-01&dateFin=2024-06-30
        const { dateDebut, dateFin } = req.query;

        let whereClause = {};
        if (dateDebut && dateFin) {
            whereClause = {
                date_achat: {
                    [Op.between]: [dateDebut, dateFin],
                },
            };
        } else if (dateDebut) {
            whereClause = {
                date_achat: {
                    [Op.gte]: dateDebut,
                },
            };
        } else if (dateFin) {
            whereClause = {
                date_achat: {
                    [Op.lte]: dateFin,
                },
            };
        }

        const achats = await StockeAchat.findAll({
            where: whereClause,
            include: [{ model: Stocke, as: 'stocke' }],
            order: [['date_achat', 'DESC']],
        });

        return Helper.send_res(res, achats);
    } catch (err) {
        console.error(err);
        const message = `Impossible de récupérer la liste des achats de stocke ! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: message }, 400);
    }
};

const getStockeStatsByMonth = async (req, res) => {
    try {
        const stats = await StockeAchat.findAll({
            attributes: [
                [Sequelize.fn('MONTH', Sequelize.col('date_achat')), 'mois'],
                [Sequelize.fn('COUNT', '*'), 'nombre_stocke'],
            ],
            group: [Sequelize.fn('MONTH', Sequelize.col('date_achat'))],
            order: [[Sequelize.fn('MONTH', Sequelize.col('date_achat')), 'ASC']],
        });
        const statsFormatted = stats.map(stat => ({
            mois: Helper.getMonthByNumber(stat.dataValues.mois),
            nombre_stocke: stat.dataValues.nombre_stocke
        }));

        return Helper.send_res(res, statsFormatted);
    } catch (err) {
        console.error(err);
        const message = `Impossible de récupérer les statistiques sur le nombre de stocke par mois ! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: message }, 400);
    }
};

const getPrixStatsByMonth = async (req, res) => {
    try {
        const stats = await StockeAchat.findAll({
            attributes: [
                [Sequelize.fn('MONTH', Sequelize.col('date_achat')), 'mois'],
                [Sequelize.literal('SUM(quantite * `stocke`.`prix_en_ariary`)'), 'total_prix']
            ],
            include: [{ model: Stocke, as: 'stocke', attributes: [] }],
            group: [Sequelize.fn('MONTH', Sequelize.col('date_achat'))],
            order: [[Sequelize.fn('MONTH', Sequelize.col('date_achat')), 'ASC']],
        });

        const statsFormatted = stats.map(stat => ({
            mois: Helper.getMonthByNumber(stat.dataValues.mois),
            total_prix: stat.dataValues.total_prix
        }));

        return Helper.send_res(res, statsFormatted);
    } catch (err) {
        console.error(err);
        const message = `Impossible de récupérer les statistiques sur les prix par mois ! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: message }, 400);
    }
};



module.exports = {
    addAchat,
    getAchatsByEmploye,
    getAllAchats,
    getStockeStatsByMonth,
    getPrixStatsByMonth,
};
