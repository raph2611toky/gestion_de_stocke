const { ValidationError, UniqueConstraintError, Op } = require("sequelize");
const db = require("../models");
const Helper = require('../../config/helper');
const { version } = require("mariadb");

// :::: Creat main models :::: //
const Stocke = db.Stocke;
const Employe = db.Employe;

// :::: 1 - create Stocke :::: //
const addStocke = async (req, res) => {
    console.log(req.body);
    // req.body.keys = ['nom_stocke','prix_en_ariary','nombre','description','marque', 'version']
    try {
        let { nom_stocke, prix_en_ariary, marque, version, nombre, description } = req.body;
        const cin_employe = req.user.cin;

        let existingStocke = await Stocke.findOne({
            where: {
                nom_stocke,
                marque,
                version
            }
        });

        if (existingStocke) {
            existingStocke.nombre += nombre;
            if (description && description !== '') {
                existingStocke.description = description;
            }
            await existingStocke.save();
            return Helper.send_res(res, existingStocke, 200);
        } else {
            let info = { nom_stocke, prix_en_ariary, marque, version, nombre, description, cin_employe };
            const stocke_created = await Stocke.create(info);
            return Helper.send_res(res, stocke_created, 201);
        }
    } catch (err) {
        console.error(err);
        const message = `Impossible de créer ce stocke ! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: message }, 400);
    }
};


// :::: 2 - get all Stocke :::: //
const getAllStocke = async (req, res) => {
    //GET /api/achats?dateDebut=2024-01-01&dateFin=2024-06-30
    try {
        if (req.params.nom_stocke) {
            const nom_stocke = req.params.nom_stocke;
            const stockes = await Stocke.findAll({
                where: {
                    nom_stocke: {
                        [Op.like]: `%${nom_stocke}%`,
                    },
                },
                order: ["nom_stocke"],
                limit: 50,
            });
            const formattedStockes = stockes.map(stocke => {
            return {
                id_stocke: stocke.id_stocke,
                nom_stocke: stocke.nom_stocke,
                poids_en_gramme: stocke.poids_en_gramme,
                prix_en_ariary: stocke.prix_en_ariary,
                marque: stocke.marque,
                version: stocke.version,
                nombre: stocke.nombre,
                description: stocke.description,
                employe_nom: stocke.employe.nom
            };
        });
        return Helper.send_res(res, formattedStockes);
        } else {
            const stockes = await Stocke.findAll({
                include: [{
                    model: Employe,
                    as: 'employe',
                    attributes: ['nom'] 
                }],
                order: [["nom_stocke", "ASC"]]
            });
            const formattedStockes = stockes.map(stocke => {
            return {
                id_stocke: stocke.id_stocke,
                nom_stocke: stocke.nom_stocke,
                poids_en_gramme: stocke.poids_en_gramme,
                prix_en_ariary: stocke.prix_en_ariary,
                marque: stocke.marque,
                version: stocke.version,
                nombre: stocke.nombre,
                description: stocke.description,
                employe_nom: stocke.employe.nom
            };
        });
        return Helper.send_res(res, formattedStockes);
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
