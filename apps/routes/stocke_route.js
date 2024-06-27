const express = require('express');
const router = express.Router();
const stockeController = require('../controllers/stocke_controller');

// Routes pour les employés
router.post('/stockes', stockeController.addStocke);
router.get('/stockes', stockeController.getAllStocke);
router.get('/stockes/search/:nom_stocke', stockeController.getAllStocke);
router.get('/stockes/:id_stocke', stockeController.getOneStocke);
router.put('/stockes/:id_stocke', stockeController.updateStocke);
router.delete('/stockes/:id_stocke', stockeController.deleteStocke);

module.exports = router;
