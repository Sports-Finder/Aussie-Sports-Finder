import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import accountsRouter from "./accounts";
import advertsRouter from "./adverts";
import conversationsRouter from "./conversations";
import profileImagesRouter from "./profileImages";
import sportRequestsRouter from "./sportRequests";
import bannedEmailsRouter from "./bannedEmails";
import wipeRouter from "./wipe";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(accountsRouter);
router.use(advertsRouter);
router.use(conversationsRouter);
router.use(profileImagesRouter);
router.use(sportRequestsRouter);
router.use(bannedEmailsRouter);
router.use(wipeRouter);

export default router;
