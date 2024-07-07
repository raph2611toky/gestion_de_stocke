const { ValidationError, UniqueConstraintError, Op } = require("sequelize");
const db = require("../models");
const Helper = require('../../config/helper');

// :::: Creat main models :::: //
const Stocke = db.stocke;

// :::: 1 - create Stocke :::: //
const addStocke = async (req, res) => {
    // req.body.keys = ['nom_stocke','poids_en_gramme','prix_en_ariary','nombre','description']
    try {
        let {nom_stocke,poids_en_gramme,prix_en_ariary,nombre,description}=req.body;
        const existingStocke = await Stocke.findOne({ where: { nom_stocke } });
        if (existingStocke) {
            return Helper.send_res(res, { message: `Le cin ${nom_stocke} est déjà utilisé.` }, 401);
        }
        let info = {nom_stocke,poids_en_gramme,prix_en_ariary,nombre,description};
        const stocke_created = await Stocke.create(info);
        return Helper.send_res(res, stocke_created, 201);
    } catch (err) {
        console.error(err);
        const message = `Impossible de créer cet employé ! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: message }, 400);
    }
};

// :::: 2 - get all Stocke :::: //
const getAllStocke = async (req, res) => {
    try {
        if (req.params.nom_stocke) {
            const nom_stocke = req.params.nom_stocke;
            const { count, rows } = await Stocke.findAndCountAll({
                where: {
                    nom_stocke: {
                        [Op.like]: `%${nom_stocke}%`,
                    },
                },
                order: ["nom_stocke"],
                limit: 50,
            });
            const message = `Il y a ${count} Stockes qui correspondent au terme de recherche ${nom_stocke}.`;
            console.log(message);
            return Helper.send_res(res, rows);
        } else {
            const stockes = await Stocke.findAll({ order: ["nom_stocke"] });
            return Helper.send_res(res, stockes);
        }
    } catch (err) {
        console.error(err);
        const message = `Impossible de récupérer la liste des Stockes ! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: message }, 400);
    }
};

// :::: 3 - get one Stocke :::: //
const getOneStocke = async (req, res) => {
    try {
        const id_stocke = req.params.id_stocke;
        if (!id_stocke) {
            return Helper.send_res(res, 'L\'identifiant est non précisé.', 400);
        }
        const stocke = await Stocke.findOne({ where: { id_stocke } });
        if (!stocke) {
            const message = `Impossible de récupérer cet Stocke, essayez avec une autre identification.`;
            return Helper.send_res(res, { erreur: message }, 404);
        }
        return Helper.send_res(res, stocke);
    } catch (err) {
        console.error(err);
        const message = `Impossible de récupérer cet Stocke ! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: message }, 500);
    }
};

// :::: 5 - update Stocke by id :::: //
const updateStocke = async (req, res) => {
    try {
        const id_stocke = req.params.id_stocke;
        const [updated] = await Stocke.update(req.body, { where: { id_stocke } });
        if (updated) {
            const updatedStocke = await Stocke.findOne({ where: { id_stocke } });
            return Helper.send_res(res, updatedStocke);
        }
        throw new Error('Stocke not found');
    } catch (err) {
        console.error(err);
        if (err instanceof ValidationError) {
            return Helper.send_res(res, { erreur: err.message }, 400);
        }
        const message = `Impossible de modifier cet Stocke ! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: message }, 500);
    }
};

// :::: 6 - delete Stocke by id :::: //
const deleteStocke = async (req, res) => {
    try {
        const id_stocke = req.params.id_stocke;
        const deleted = await Stocke.destroy({ where: { id_stocke } });
        if (deleted) {
            return Helper.send_res(res, { message: "Stocke supprimé avec succès." });
        }
        throw new Error('Stocke not found');
    } catch (err) {
        console.error(err);
        const message = `Impossible de supprimer cet Stocke ! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: message }, 500);
    }
};



module.exports = {
    addStocke,
    getAllStocke,
    getOneStocke,
    updateStocke,
    deleteStocke,
};
