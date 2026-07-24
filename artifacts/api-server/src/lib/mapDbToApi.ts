export function mapCoachAffiliate(row: Record<string, unknown>) {
  // Migrate legacy teamName/ageGroup to teams[] if teams column is empty/null
  let teams = (row.teams as { gender: string; ageGroup: string }[] | null) ?? [];
  if (teams.length === 0) {
    const legacyAgeGroup = (row.ageGroup as string | undefined) || (row.teamName as string | undefined);
    if (legacyAgeGroup) {
      teams = [{ gender: "mixed", ageGroup: legacyAgeGroup }];
    }
  }
  return {
    id: row.publicId as string,
    coachAccountId: row.coachAccountId as string,
    teams,
    status: row.status as string,
    rejectionCount: (row.rejectionCount as number) ?? 0,
    rejectedAt: row.rejectedAt ? new Date(row.rejectedAt as string).toISOString() : undefined,
    requestedAt: new Date(row.requestedAt as string).toISOString(),
  };
}

function _mapAccount(
  row: Record<string, unknown>,
  affiliates: ReturnType<typeof mapCoachAffiliate>[],
  includeGuardianDob: boolean,
) {
  return {
    id: row.publicId as string,
    role: row.role as string,
    authMethod: row.authMethod as string,
    email: row.email as string,
    socialId: row.socialId as string | undefined,
    clerkUserId: row.clerkUserId as string | undefined,
    fullName: row.fullName as string | undefined,
    parentGuardianName: row.parentGuardianName as string | undefined,
    playerName: row.playerName as string | undefined,
    clubName: row.clubName as string | undefined,
    gender: row.gender as string | undefined,
    dateOfBirth: row.dateOfBirth as string | undefined,
    guardianDateOfBirth: includeGuardianDob ? (row.guardianDateOfBirth as string | undefined) : undefined,
    location: row.location as string | undefined,
    mobile: row.mobile as string | undefined,
    sports: (row.sports as string[]) ?? [],
    defaultSport: row.defaultSport as string,
    profileImageId: row.profileImageId as string | undefined,
    socialLinks: (row.socialLinks as Record<string, string> | undefined) ?? {},
    highlightReelUrl: row.highlightReelUrl as string | undefined,
    highlightReelStatus: row.highlightReelStatus as string | undefined,
    clubWebsite: row.clubWebsite as string | undefined,
    clubAddress: row.clubAddress as string | undefined,
    clubSuburb: row.clubSuburb as string | undefined,
    clubPostcode: row.clubPostcode as string | undefined,
    clubContactEmail: row.clubContactEmail as string | undefined,
    clubContactMobile: row.clubContactMobile as string | undefined,
    profileImageDeclines: Number(row.profileImageDeclines ?? "0") || 0,
    status: row.status as string,
    statusReason: row.statusReason as string | undefined,
    statusChangedAt: row.statusChangedAt
      ? new Date(row.statusChangedAt as string).toISOString()
      : undefined,
    bio: row.bio as string | undefined,
    approved: (row.approved as boolean) ?? true,
    clubApprovalStatus: row.clubApprovalStatus as string | undefined,
    affiliatedClubId: row.affiliatedClubId as string | undefined,
    affiliatedClubName: row.affiliatedClubName as string | undefined,
    subscriptionTier: (row.subscriptionTier as string) ?? "free",
    subscriptionStatus: row.subscriptionStatus as string | undefined,
    trialStartedAt: row.trialStartedAt
      ? new Date(row.trialStartedAt as string).toISOString()
      : undefined,
    trialExpiresAt: row.trialExpiresAt
      ? new Date(row.trialExpiresAt as string).toISOString()
      : undefined,
    subscriptionExpiresAt: row.subscriptionExpiresAt
      ? new Date(row.subscriptionExpiresAt as string).toISOString()
      : undefined,
    verifiedBadge: (row.verifiedBadge as boolean) ?? false,
    lastAdvertClosedAt: row.lastAdvertClosedAt
      ? new Date(row.lastAdvertClosedAt as string).toISOString()
      : undefined,
    promotionalPremium: (row.promotionalPremium as boolean) ?? false,
    playerPositions: (row.playerPositions as string[] | undefined) ?? undefined,
    playerCurrentLevel: row.playerCurrentLevel as string | undefined,
    playerCurrentAgeGroup: row.playerCurrentAgeGroup as string | undefined,
    playerCurrentClub: row.playerCurrentClub as string | undefined,
    coachSubRole: row.coachSubRole as string | undefined,
    coachCurrentLevel: row.coachCurrentLevel as string | undefined,
    coachCurrentClub: row.coachCurrentClub as string | undefined,
    ageAttested: (row.ageAttested as boolean) ?? undefined,
    ageAttestedAt: row.ageAttestedAt ? new Date(row.ageAttestedAt as string).toISOString() : undefined,
    password: row.password as string | undefined,
    contactUsDisabled: (row.contactUsDisabled as boolean) ?? false,
    contactLastSentAt: row.contactLastSentAt ? new Date(row.contactLastSentAt as string).toISOString() : undefined,
    coachAffiliates: affiliates,
    createdAt: new Date(row.createdAt as string).toISOString(),
    updatedAt: new Date(row.updatedAt as string).toISOString(),
  };
}

/** Public-safe mapper — strips guardianDateOfBirth so it is never leaked to non-admin callers. */
export function mapAccount(
  row: Record<string, unknown>,
  affiliates: ReturnType<typeof mapCoachAffiliate>[] = [],
) {
  return _mapAccount(row, affiliates, false);
}

/** Full mapper — includes guardianDateOfBirth for admin-only endpoints and single-account responses. */
export function mapAccountAdmin(
  row: Record<string, unknown>,
  affiliates: ReturnType<typeof mapCoachAffiliate>[] = [],
) {
  return _mapAccount(row, affiliates, true);
}

export function mapAdvert(row: Record<string, unknown>) {
  return {
    id: row.publicId as string,
    ownerAccountId: row.ownerAccountId as string | undefined,
    type: row.type as string,
    title: row.title as string,
    sport: row.sport as string,
    location: row.location as string,
    distanceKm: (row.distanceKm as number) ?? 0,
    postedBy: row.postedBy as string,
    postedByType: row.postedByType as string,
    level: row.level as string,
    availability: row.availability as string,
    description: row.description as string,
    needs: row.needs as string,
    ageGroup: row.ageGroup as string | undefined,
    preferredAge: row.preferredAge as number | undefined,
    positions: (row.positions as string[]) ?? undefined,
    playerDescription: row.playerDescription as string | undefined,
    trainingDays: (row.trainingDays as string[]) ?? undefined,
    trainingTimeFrom: row.trainingTimeFrom as string | undefined,
    trainingTimeTo: row.trainingTimeTo as string | undefined,
    trainingTbd: (row.trainingTbd as boolean) ?? undefined,
    gameDays: (row.gameDays as string[]) ?? undefined,
    gameTimeFrom: row.gameTimeFrom as string | undefined,
    gameTimeTo: row.gameTimeTo as string | undefined,
    gameTbd: (row.gameTbd as boolean) ?? undefined,
    scheduleNote: row.scheduleNote as string | undefined,
    trialSlots:
      (row.trialSlots as { date: string; timeFrom: string; timeTo: string }[]) ?? undefined,
    focusArea: row.focusArea as string | undefined,
    coachRole: row.coachRole as string | undefined,
    coachExperienceLevel: row.coachExperienceLevel as string | undefined,
    coachPositionTypes: (row.coachPositionTypes as string[]) ?? undefined,
    coachSalary: row.coachSalary as number | undefined,
    coachSalaryTbc: (row.coachSalaryTbc as boolean) ?? undefined,
    seasonFees: row.seasonFees as number | undefined,
    feesNegotiable: (row.feesNegotiable as boolean) ?? undefined,
    feesFree: (row.feesFree as boolean) ?? undefined,
    trialRequired: (row.trialRequired as boolean) ?? undefined,
    teamGender: row.teamGender as string | undefined,
    playerGender: row.playerGender as string | undefined,
    affiliatedClubId: row.affiliatedClubId as string | undefined,
    friendlySubType: row.friendlySubType as "available" | "wanted" | undefined,
    preferredOpponents: (row.preferredOpponents as string[]) ?? undefined,
    preferredTeamLevel: row.preferredTeamLevel as string | undefined,
    groundAvailable: (row.groundAvailable as boolean) ?? undefined,
    venueSuburb: row.venueSuburb as string | undefined,
    venuePostcode: row.venuePostcode as string | undefined,
    venueState: row.venueState as string | undefined,
    refereeType: row.refereeType as string | undefined,
    friendlyInfo: row.friendlyInfo as string | undefined,
    friendlySuburb: row.friendlySuburb as string | undefined,
    friendlyPostcode: row.friendlyPostcode as string | undefined,
    friendlyState: row.friendlyState as string | undefined,
    status: row.status as string,
    closedAt: row.closedAt ? new Date(row.closedAt as string).toISOString() : undefined,
    closedReason: row.closedReason as string | undefined,
    bumpedAt: row.bumpedAt ? new Date(row.bumpedAt as string).toISOString() : undefined,
    expiresAt: row.expiresAt ? new Date(row.expiresAt as string).toISOString() : undefined,
    originalExpiresAt: row.originalExpiresAt
      ? new Date(row.originalExpiresAt as string).toISOString()
      : undefined,
    possibleDuplicate: (row.possibleDuplicate as boolean) ?? false,
    createdAt: new Date(row.createdAt as string).toISOString(),
  };
}

export function mapConversation(row: Record<string, unknown>) {
  return {
    id: row.publicId as string,
    advertId: row.advertId as string,
    advertTitle: row.advertTitle as string | undefined,
    ownerAccountId: row.ownerAccountId as string | undefined,
    initiatorAccountId: row.initiatorAccountId as string | undefined,
    clubName: row.clubName as string,
    playerName: row.playerName as string,
    status: row.status as string,
    hasUnread: (row.hasUnread as boolean) ?? false,
    sport: row.sport as string | undefined,
    requesterLocation: row.requesterLocation as string | undefined,
    requesterType: row.requesterType as string | undefined,
    flagged: (row.flagged as boolean) ?? false,
    flagSeverity: row.flagSeverity as "high" | "medium" | undefined,
    flagCategory: row.flagCategory as string | undefined,
    flagTriggerMessage: row.flagTriggerMessage as string | undefined,
    flaggedAt: row.flaggedAt ? new Date(row.flaggedAt as string).toISOString() : undefined,
    flagReviewedAt: row.flagReviewedAt ? new Date(row.flagReviewedAt as string).toISOString() : undefined,
    createdAt: new Date(row.createdAt as string).toISOString(),
    messages: [] as unknown[],
  };
}

export function mapMessage(row: Record<string, unknown>) {
  return {
    id: row.publicId as string,
    senderAccountId: row.senderAccountId as string | undefined,
    sender: row.sender as string,
    body: row.body as string,
    createdAt: new Date(row.createdAt as string).toISOString(),
    isSystem: (row.isSystem as boolean) ?? false,
    isAdmin: (row.isAdmin as boolean) ?? false,
  };
}

export function mapProfileImage(row: Record<string, unknown>) {
  return {
    id: row.publicId as string,
    owner: row.owner as string,
    uri: row.uri as string,
    status: row.status as string,
    submittedAt: new Date(row.submittedAt as string).toISOString(),
  };
}

export function mapSportRequest(row: Record<string, unknown>) {
  return {
    id: row.publicId as string,
    name: row.name as string,
    status: row.status as string,
    requestedAt: new Date(row.requestedAt as string).toISOString(),
  };
}

export function mapBannedEmail(row: Record<string, unknown>) {
  return row.email as string;
}

export function mapReport(row: Record<string, unknown>) {
  return {
    id: row.publicId as string,
    reporterAccountId: row.reporterAccountId as string,
    targetAccountId: row.targetAccountId as string,
    reason: row.reason as string,
    status: row.status as string,
    createdAt: new Date(row.createdAt as string).toISOString(),
    resolvedAt: row.resolvedAt ? new Date(row.resolvedAt as string).toISOString() : undefined,
    resolvedBy: row.resolvedBy as string | undefined,
    resolution: row.resolution as string | undefined,
  };
}
