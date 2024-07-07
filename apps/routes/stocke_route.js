const express = require('express');
const router = express.Router();
const stockeController = require('../controllers/stocke_controller');
const authenticate = require('../../config/middleware/authenticate')

// Routes pour les employés
router.post('/stockes',authenticate, stockeController.addStocke);
router.get('/stockes',authenticate, stockeController.getAllStocke);
router.get('/stockes/search/:nom_stocke',authenticate, stockeController.getAllStocke);
router.get('/stockes/:id_stocke',authenticate, stockeController.getOneStocke);
router.put('/stockes/:id_stocke',authenticate, stockeController.updateStocke);
router.delete('/stockes/:id_stocke',authenticate, stockeController.deleteStocke);

module.exports = router;
