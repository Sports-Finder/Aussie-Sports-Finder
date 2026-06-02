import { Router, type IRouter } from "express";
import healthRouter from "./health";
import accountsRouter from "./accounts";
import advertsRouter from "./adverts";
import conversationsRouter from "./conversations";
import profileImagesRouter from "./profileImages";
import sportRequestsRouter from "./sportRequests";
import bannedEmailsRouter from "./bannedEmails";
import wipeRouter from "./wipe";
import coachAffiliatesRouter from "./coachAffiliates";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Health check is public — no auth required
router.use(healthRouter);

// All routes below this point require a valid Clerk session
router.use(requireAuth);

router.use(accountsRouter);
router.use(advertsRouter);
router.use(conversationsRouter);
router.use(profileImagesRouter);
router.use(sportRequestsRouter);
router.use(bannedEmailsRouter);
router.use(wipeRouter);
router.use(coachAffiliatesRouter);

export default router;
