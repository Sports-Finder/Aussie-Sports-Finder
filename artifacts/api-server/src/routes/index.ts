import { Router, type IRouter } from "express";
import healthRouter from "./health";
import accountsRouter from "./accounts";
import advertsRouter from "./adverts";
import conversationsRouter from "./conversations";
import profileImagesRouter from "./profileImages";
import sportRequestsRouter from "./sportRequests";
import bannedEmailsRouter from "./bannedEmails";

const router: IRouter = Router();

router.use(healthRouter);
router.use(accountsRouter);
router.use(advertsRouter);
router.use(conversationsRouter);
router.use(profileImagesRouter);
router.use(sportRequestsRouter);
router.use(bannedEmailsRouter);

export default router;
