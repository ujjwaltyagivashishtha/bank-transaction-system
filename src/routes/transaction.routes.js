const { Router } = require("express");
const authMiddleware = require('../middleware/auth.middleware');
const transactionController = require('../controllers/transaction.controller');


const transactionRouter = Router();



transactionRouter.post("/",authMiddleware.authMiddleware,transactionController.createTransaction);


module.exports = transactionRouter;