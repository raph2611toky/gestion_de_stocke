const { ValidationError, UniqueConstraintError, Op } = require("sequelize");
const db = require("../models");
const Helper = require('../../config/helper');
const { version } = require("mariadb");

const Stocke = db.Stocke;
const Employe = db.Employe;
const Sequelize = db.Sequelize;
const StockeAchat = db.StockeAchat;

const currentMonth = new Date().getMonth() + 1;
const allMonths = Array.from({ length: currentMonth }, (_, i) => i + 1);

const addAchat = async (req, res) => {
    try {
        const achats = req.body;
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
            include: [
                { model: Employe, as: 'employe', attributes: ['nom', 'cin'] }, 
                { model: Stocke, as: 'stocke' } 
            ],
            order: [['date_achat', 'DESC']],
        });

        const nomsEmployes = achats.map(achat => ({
            id_achat: achat.id_achat,
            quantite: achat.quantite,
            date_achat: achat.date_achat,
            nom_employe: achat.employe ? achat.employe.nom : null, 
            stocke: achat.stocke.dataValues
        }));
        console.log(nomsEmployes);
        return res.json(nomsEmployes);
    } catch (err) {
        console.error('Erreur lors de la récupération des achats :', err);
        return res.status(500).json({ message: 'Erreur serveur lors de la récupération des achats.' });
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
    
        let statsMap = new Map(stats_nombre_stocke.map(stat => [stat.dataValues.mois, stat.dataValues.nombre_stocke]));
    
        // Ajouter les mois manquants avec des valeurs de zéro
        allMonths.forEach(month => {
            if (!statsMap.has(month)) {
                statsMap.set(month, 0);
            }
        });
    
        // Convertir la map en tableau, trier par mois et remplacer les numéros de mois par leurs noms
        stats_nombre_stocke = Array.from(statsMap, ([mois, nombre_stocke]) => ({
            mois,
            nombre_stocke
        })).sort((a, b) => a.mois - b.mois)
          .map(stat => ({
            mois: Helper.getMonthByNumber(stat.mois),
            nombre_stocke: stat.nombre_stocke
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

        const soldeTotalRecu_list = await StockeAchat.findAll({
                attributes: [[Sequelize.literal('SUM(quantite * `stocke`.`prix_en_ariary`)'), 'total_prix']],
                include: [{model: Stocke, as: 'stocke', attributes: [],},],
            });
        let soldeTotalRecu = 0
        for(let i=0;i < soldeTotalRecu_list.length;i++){
            soldeTotalRecu += parseInt(soldeTotalRecu_list[i].dataValues.total_prix)
        }

        let topProduitVendu = await StockeAchat.findOne({
            attributes: ['id_stocke', [Sequelize.fn('sum', Sequelize.col('quantite')), 'total']],
            include: [{ model: Stocke, as: 'stocke', attributes: ['nom_stocke'] }],
            group: ['id_stocke'],
            order: [[Sequelize.literal('total'), 'DESC']],});
        topProduitVendu = {
            nom_stocke: topProduitVendu ? topProduitVendu.dataValues.stocke.nom_stocke:null,
            total_vendus: topProduitVendu ? topProduitVendu.dataValues.total:null
        }
        const topTroisProduits_list = await StockeAchat.findAll({
            attributes: [
                [Sequelize.literal('`stocke`.`nom_stocke`'), 'nom_stocke'],
                [Sequelize.fn('sum', Sequelize.col('quantite')), 'total']
            ],
            include: [{ model: Stocke, as: 'stocke', attributes: [] }],
            group: ['stocke.nom_stocke'],
            order: [[Sequelize.literal('total'), 'DESC']],
            limit: 3
        });

        let topTroisProduits = topTroisProduits_list.map(topTroisProduit => ({
            nom_stocke: topTroisProduit.dataValues.nom_stocke,
            total: topTroisProduit.dataValues.total
        }));

        const dashboard_info = {
            'stocke_par_mois': stats_nombre_stocke,
            'prix_par_mois': stats_prix_par_mois,
            'stock_restant_total': stockRestantTotal,
            'stock_restant_par_type': stockRestantParType,
            'stocks_vendus_total': stocksVendusTotal,
            'stocks_vendus_par_type': stocksVendusParType,
            'solde_total_recu': soldeTotalRecu,
            'top_produit_vendu': topProduitVendu,
            'top_trois_produits': topTroisProduits
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
