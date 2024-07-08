const { ValidationError, UniqueConstraintError, Op } = require("sequelize");
const db = require("../models");
const Helper = require('../../config/helper');
const { version } = require("mariadb");

const Stocke = db.Stocke;
const Sequelize = db.Sequelize;
const StockeAchat = db.StockeAchat;

const addAchat = async (req, res) => {
    try {
        const { achats } = req.body;
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
                { model: Stocke, as: 'stocke', attributes: ['nom_stocke', 'poids_en_gramme', 'prix_en_ariary'] }
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

const dashboard = async (req, res) => {
    try {

        let stats_nombre_stocke = await StockeAchat.findAll({
            attributes: [
                [Sequelize.fn('MONTH', Sequelize.col('date_achat')), 'mois'],
                [Sequelize.fn('COUNT', '*'), 'nombre_stocke'],
            ],
            group: [Sequelize.fn('MONTH', Sequelize.col('date_achat'))],
            order: [[Sequelize.fn('MONTH', Sequelize.col('date_achat')), 'ASC']],
        });
        stats_nombre_stocke = stats_nombre_stocke.map(stat => ({
            mois: Helper.getMonthByNumber(stat.dataValues.mois),
            nombre_stocke: stat.dataValues.nombre_stocke
        }));

        let stats_prix_par_mois = await StockeAchat.findAll({
            attributes: [
                [Sequelize.fn('MONTH', Sequelize.col('date_achat')), 'mois'],
                [Sequelize.literal('SUM(quantite * `stocke`.`prix_en_ariary`)'), 'total_prix']
            ],
            include: [{ model: Stocke, as: 'stocke', attributes: [] }],
            group: [Sequelize.fn('MONTH', Sequelize.col('date_achat'))],
            order: [[Sequelize.fn('MONTH', Sequelize.col('date_achat')), 'ASC']],
        });

        stats_prix_par_mois = stats_prix_par_mois.map(stat => ({
            mois: Helper.getMonthByNumber(stat.dataValues.mois),
            total_prix: stat.dataValues.total_prix
        }));

        const stockRestantTotal = await Stocke.sum('nombre');
        const stockRestantParType = await Stocke.findAll({
            attributes: ['nom_stocke', [Sequelize.fn('sum', Sequelize.col('nombre')), 'total']],
            group: ['nom_stocke']
        });

        const stocksVendusTotal = await StockeAchat.sum('quantite');
        let stocksVendusParType = await StockeAchat.findAll({
            attributes: ['id_stocke', [Sequelize.fn('sum', Sequelize.col('quantite')), 'total']],
            include: [{ model: Stocke, as: 'stocke', attributes: ['nom_stocke','marque', 'version'] }],
            group: ['id_stocke']
        });
        stocksVendusParType = stocksVendusParType.map(stockeVendus => ({
            nom_stocke: stockeVendus.dataValues.stocke.nom_stocke,
            total_vendus: stockeVendus.dataValues.total,
            marque: stockeVendus.dataValues.stocke.marque,
            version: stockeVendus.dataValues.stocke.version
        }));

        const soldeTotalRecu = await StockeAchat.sum(Sequelize.literal('quantite * `stocke`.`prix_en_ariary`'));
//
        //const topProduitVendu = await StockeAchat.findOne({
        //    attributes: ['id_stocke', [Sequelize.fn('sum', Sequelize.col('quantite')), 'total']],
        //    include: [{ model: Stocke, as: 'stocke', attributes: ['nom_stocke'] }],
        //    group: ['id_stocke'],
        //    order: [[Sequelize.literal('total'), 'DESC']],
        //});
//
        //const topTroisProduits = await StockeAchat.findAll({
        //    attributes: ['id_stocke', [sequelize.fn('sum', sequelize.col('quantite')), 'total']],
        //    include: [{ model: Stocke, as: 'stocke', attributes: ['nom_stocke'] }],
        //    group: ['id_stocke'],
        //    order: [[sequelize.literal('total'), 'DESC']],
        //    limit: 3
        //});

        const dashboard_info = {
            'stocke_par_mois': stats_nombre_stocke,
            'prix_par_mois': stats_prix_par_mois,
            'stock_restant_total': stockRestantTotal,
            'stock_restant_par_type': stockRestantParType,
            'stocks_vendus_total': stocksVendusTotal,
            'stocks_vendus_par_type': stocksVendusParType,
            'solde_total_recu': soldeTotalRecu,
            //'top_produit_vendu': topProduitVendu,
            //'top_trois_produits': topTroisProduits
        };//

        return Helper.send_res(res,dashboard_info,200)

    } catch (err) {
        console.error(err);
        const message = `Impossible de récupérer les statistiques de stocke par mois ! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: message }, 400);
    }
}

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
    dashboard,
};
