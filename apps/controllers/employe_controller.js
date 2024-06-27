const { ValidationError, UniqueConstraintError, Op } = require("sequelize");
const db = require("../models");
const Helper = require('../../config/helper');

// :::: Creat main models :::: //
const Employe = db.employe;

// :::: 1 - create Employe :::: //
const addEmploye = async (req, res) => {
    // req.body.keys = ['cin','nom','prenom','email','password','confirm_password','telephone','adresse']
    try {
        let cin = req.body.cin;
        const existingEmploye = await Employe.findOne({ where: { cin } });
        if (existingEmploye) {
            return Helper.send_res(res, { message: `Le cin ${cin} est déjà utilisé.` }, 401);
        }
        let password = req.body.password;
        let confirm_password = req.body.confirm_password;
        if (password !== confirm_password) {
            return Helper.send_res(res, { erreur: 'Les mots de passe fournies ne sont pas identiques' }, 401);
        }
        let hashedPassword = await Helper.encryptPassword(password);
        let info = {
            cin:cin,
            nom: req.body.nom,
            prenom: req.body.prenom,
            adresse: req.body.adresse,
            telephone: req.body.telephone,
            email: req.body.email,
            password: hashedPassword,
        };
        const employe_created = await Employe.create(info);
        const message = `L'employé ${req.body.nom} a été créé avec succès.`;
        return Helper.send_res(res, employe_created, 201);
    } catch (err) {
        console.error(err);
        const message = `Impossible de créer cet employé ! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: message }, 400);
    }
};

// :::: 2 - get all Employe :::: //
const getAllEmploye = async (req, res) => {
    try {
        if (req.query.nom) {
            const name = req.query.nom;
            const { count, rows } = await Employe.findAndCountAll({
                where: {
                    nom: {
                        [Op.like]: `%${name}%`,
                    },
                },
                order: ["cin"],
                limit: 50,
            });
            const message = `Il y a ${count} Employes qui correspondent au terme de recherche ${name}.`;
            console.log(message);
            return Helper.send_res(res, rows);
        } else {
            const employes = await Employe.findAll({ order: ["nom"] });
            return Helper.send_res(res, employes);
        }
    } catch (err) {
        console.error(err);
        const message = `Impossible de récupérer la liste des Employes ! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: message }, 400);
    }
};

// :::: 3 - get one Employe :::: //
const getOneEmploye = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return Helper.send_res(res, 'L\'identifiant est non précisé.', 400);
        }
        const employe = await Employe.findOne({ where: { cin: id } });
        if (!employe) {
            const message = `Impossible de récupérer cet Employe, essayez avec une autre identification.`;
            return Helper.send_res(res, { erreur: message }, 404);
        }
        return Helper.send_res(res, employe);
    } catch (err) {
        console.error(err);
        const message = `Impossible de récupérer cet Employe ! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: message }, 500);
    }
};

// :::: 5 - update Employe by id :::: //
const updateEmploye = async (req, res) => {
    try {
        const id = req.params.id;
        const [updated] = await Employe.update(req.body, { where: { cin: id } });
        if (updated) {
            const updatedEmploye = await Employe.findOne({ where: { cin: id } });
            return Helper.send_res(res, updatedEmploye);
        }
        throw new Error('Employe not found');
    } catch (err) {
        console.error(err);
        if (err instanceof ValidationError) {
            return Helper.send_res(res, { erreur: err.message }, 400);
        }
        const message = `Impossible de modifier cet Employe ! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: message }, 500);
    }
};

// :::: 6 - delete Employe by id :::: //
const deleteEmploye = async (req, res) => {
    try {
        const id = req.params.id;
        const deleted = await Employe.destroy({ where: { cin: id } });
        if (deleted) {
            return Helper.send_res(res, { message: "Employe supprimé avec succès." });
        }
        throw new Error('Employe not found');
    } catch (err) {
        console.error(err);
        const message = `Impossible de supprimer cet Employe ! Réessayez dans quelques instants.`;
        return Helper.send_res(res, { erreur: message }, 500);
    }
};


const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const employe = await Employe.findOne({ where: { email } });
        if (!employe) {
            return Helper.send_res(res, { message: "Utilisateur non trouvé" }, 404);
        }

        const isPasswordValid = await Helper.checkPassword(password, employe.password);

        if (!isPasswordValid) {
            return Helper.send_res(res, { message: "Mot de passe incorrect" }, 401);
        }

        const employeData = { ...employe.toJSON() };
        delete employeData.password;
        return Helper.send_res(res, { message: "Connexion réussie", employe: employeData }, 200);
    } catch (error) {
        console.error('Erreur lors de la connexion :', error);
        return Helper.send_res(res, { message: "Erreur lors de la connexion" }, 500);
    }
};

module.exports = {
    addEmploye,
    getAllEmploye,
    getOneEmploye,
    updateEmploye,
    deleteEmploye,
    login,
};
