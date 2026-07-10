const { Router } = require("express");
const authMiddleware = require('../middleware/auth.middleware');


const transactionRouter = Router();



transactionRouter.post("/",authMiddleware.authMiddleware,);


module.exports = transactionRouter;