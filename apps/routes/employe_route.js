const express = require('express');
const router = express.Router();
const employeController = require('../controllers/employe_controller');

// Routes pour les employés
router.post('/employes', employeController.addEmploye);
router.get('/employes', employeController.getAllEmploye);
router.get('/employes/:id', employeController.getOneEmploye);
router.put('/employes/:id', employeController.updateEmploye);
router.delete('/employes/:id', employeController.deleteEmploye);
router.post('/login', employeController.login);

module.exports = router;
