const { ValidationError, literal,Op, fn, col } = require("sequelize");
const db = require("../models");
const Helper = require('../../config/helper');
const { version } = require("mariadb");

const Stocke = db.Stocke;
const Employe = db.Employe;
const Sequelize = db.Sequelize;
const StockeAchat = db.StockeAchat;

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();
const allMonths = Array.from({ length: currentMonth }, (_, i) => i + 1);

const addAchat = async (req, res) => {
    try {
        // request.body.keys() = [{'stock','marque','version','quantity'}]
        const achats = req.body.cartItems;
        console.log(req.body)
        const cin_employe = req.user.cin;

        const achatPromises = achats.map(async (achat) => {
            let nom_stocke = achat.stock
            let marque = achat.marque
            let version = achat.version
            let quantite = achat.quantity 
            const stocke = await Stocke.findOne({
                where: {
                    nom_stocke,
                    marque,
                    version
                }
            });

            if (!stocke) {
                throw new Error(`Le stocke avec le nom "${nom_stocke}", la marque "${marque}" et la version "${version}" n'existe pas.`);
            }

            if (stocke.nombre < quantite) {
                throw new Error(`La quantité demandée pour le stocke "${nom_stocke}" (marque: "${marque}", version: "${version}") dépasse la quantité disponible.`);
            }

            stocke.nombre -= quantite;
            await stocke.save();

            return StockeAchat.create({ cin_employe, id_stocke: stocke.id_stocke, quantite });
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
        const date = new Date(achat.date_achat);
        const formattedDate = date.toISOString().split('T')[0];
        const nomsEmployes = achats.map(achat => ({
            id_achat: achat.id_achat,
            quantite: achat.quantite,
            date_achat: formattedDate,
            nom_employe: achat.employe ? achat.employe.nom : null, 
            stocke: achat.stocke.dataValues
        }));
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
    
        allMonths.forEach(month => {
            if (!statsMap.has(month)) {
                statsMap.set(month, 0);
            }
        });
    
        stats_nombre_stocke = Array.from(statsMap, ([mois, nombre_stocke]) => ({
            mois,
            nombre_stocke
        })).sort((a, b) => a.mois - b.mois)
          .map(stat => ({
            mois: Helper.getMonthByNumber(stat.mois),
            nombre_stocke: stat.nombre_stocke
        }));
        console.log(currentMonth,currentYear)
        const stocksVendusTotal = await StockeAchat.sum('quantite', {
            where: literal(`MONTH(date_achat) = ${currentMonth} AND YEAR(date_achat) = ${currentYear}`)
        });
        

        let stats_prix_par_mois = await StockeAchat.findAll({
            attributes: [
                [Sequelize.fn('MONTH', Sequelize.col('date_achat')), 'mois'],
                [Sequelize.literal('SUM(quantite * `stocke`.`prix_en_ariary`)'), 'total_prix']
            ],
            include: [{ model: Stocke, as: 'stocke', attributes: [] }],
            group: [Sequelize.fn('MONTH', Sequelize.col('date_achat'))],
            order: [[Sequelize.fn('MONTH', Sequelize.col('date_achat')), 'ASC']],
        });
    
        let statsMap_prix = new Map(stats_prix_par_mois.map(stat => [stat.dataValues.mois, stat.dataValues.total_prix]));
    
        allMonths.forEach(month => {
            if (!statsMap_prix.has(month)) {
                statsMap_prix.set(month, 0);
            }
        });
    
        stats_prix_par_mois = Array.from(statsMap_prix, ([mois, total_prix]) => ({
            mois,
            total_prix
        })).sort((a, b) => a.mois - b.mois)
          .map(stat => ({
            mois: Helper.getMonthByNumber(stat.mois),
            total_prix: stat.total_prix
        }));

        const stockRestantTotal = await Stocke.sum('nombre');
        const stockRestantParType = await Stocke.findAll({
            attributes: ['nom_stocke', [Sequelize.fn('sum', Sequelize.col('nombre')), 'total']],
            group: ['nom_stocke']
        });

        let stocksVendusParType = await StockeAchat.findAll({
            attributes: ['id_stocke', [fn('sum', col('quantite')), 'total']],
            include: [
                {
                    model: Stocke,
                    as: 'stocke',
                    attributes: ['nom_stocke', 'marque', 'version']
                }
            ],
            where: {
                [Op.and]: [
                    fn('MONTH', col('date_achat')), currentMonth,
                    fn('YEAR', col('date_achat')), currentYear
                ]
            },
            group: ['id_stocke', 'stocke.nom_stocke', 'stocke.marque', 'stocke.version']
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

const paymentStocke = async (req, res) => {
    try{
        const stocks = await Stocke.findAll({
            attributes: ['nom_stocke', 'marque', 'version'],
            order: [['nom_stocke', 'ASC'], ['marque', 'ASC'], ['version', 'ASC']]
        });

        // Initialiser les structures de données pour stocker les résultats
        const nomsStocke = new Set();
        const marquesParStocke = {};
        const versionsParStockeMarque = {};

        // Parcourir les résultats pour les structurer
        stocks.forEach(stock => {
            const { nom_stocke, marque, version } = stock;

            nomsStocke.add(nom_stocke);

            if (!marquesParStocke[nom_stocke]) {
                marquesParStocke[nom_stocke] = new Set();
            }
            marquesParStocke[nom_stocke].add(marque);

            const key = `${nom_stocke}__${marque}`;
            if (!versionsParStockeMarque[key]) {
                versionsParStockeMarque[key] = new Set();
            }
            versionsParStockeMarque[key].add(version);
        });

        const result = {
            noms_stocke: Array.from(nomsStocke),
            marques_par_stocke: {},
            versions_par_stocke_marque: {}
        };
        Object.keys(marquesParStocke).forEach(nomStocke => {
            result.marques_par_stocke[nomStocke] = Array.from(marquesParStocke[nomStocke]);
        });

        Object.keys(versionsParStockeMarque).forEach(key => {
            result.versions_par_stocke_marque[key] = Array.from(versionsParStockeMarque[key]);
        });

        return Helper.send_res(res, result, 200);
    }catch{
        console.error(err);
        const message = `Impossible de récupérer les donées lors de payement! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: message }, 400);
    }
}

module.exports = {
    addAchat,
    getAchatsByEmploye,
    getAllAchats,
    getStockeStatsByMonth,
    getPrixStatsByMonth,
    dashboard,
    paymentStocke,
};
