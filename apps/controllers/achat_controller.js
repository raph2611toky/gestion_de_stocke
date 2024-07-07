const { ValidationError, UniqueConstraintError, Op } = require("sequelize");
const db = require("../models");
const Helper = require('../../config/helper');

const Stocke = db.Stocke;
const Employe = db.Employe;
const StockeAchat = db.StockeAchat;

const addAchat = async (req, res) => {
    try {
        const { achats } = req.body;
        const cin_employe = req.user.cin_employe;

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
        const cin_employe = req.user.cin_employe;
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

module.exports = {
    addAchat,
    getAchatsByEmploye,
};
