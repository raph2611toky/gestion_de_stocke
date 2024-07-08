const express = require('express');
const router = express.Router();
const stockeController = require('../controllers/stocke_controller');
const achat_ontroller = require('../controllers/achat_controller')
const authenticate = require('../../config/middleware/authenticate')

// Routes pour les employés
router.post('/stockes',authenticate, stockeController.addStocke);
router.get('/stockes',authenticate, stockeController.getAllStocke);
router.get('/stockes/search/:nom_stocke',authenticate, stockeController.getAllStocke);
router.get('/stocke/:id_stocke',authenticate, stockeController.getOneStocke);
router.put('/stocke/:id_stocke',authenticate, stockeController.updateStocke);
router.delete('/stocke/:id_stocke',authenticate, stockeController.deleteStocke);
router.post('/achats', authenticate, achat_ontroller.addAchat);
router.get('/achats/employe', authenticate, achat_ontroller.getAchatsByEmploye);
router.get('/achats', authenticate, achat_ontroller.getAllAchats);
router.get('/stats/stocke-par-mois', authenticate, achat_ontroller.getStockeStatsByMonth);
router.get('/stats/prix-par-mois', authenticate, achat_ontroller.getPrixStatsByMonth);
router.get('/dashboard',authenticate, achat_ontroller.dashboard)


module.exports = router;
