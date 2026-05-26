export function mapAccount(row: Record<string, unknown>) {
  return {
    id: row.publicId as string,
    role: row.role as string,
    authMethod: row.authMethod as string,
    email: row.email as string,
    socialId: row.socialId as string | undefined,
    fullName: row.fullName as string | undefined,
    parentGuardianName: row.parentGuardianName as string | undefined,
    playerName: row.playerName as string | undefined,
    clubName: row.clubName as string | undefined,
    gender: row.gender as string | undefined,
    dateOfBirth: row.dateOfBirth as string | undefined,
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
    clubContactEmail: row.clubContactEmail as string | undefined,
    clubContactMobile: row.clubContactMobile as string | undefined,
    status: row.status as string,
    statusReason: row.statusReason as string | undefined,
    statusChangedAt: row.statusChangedAt ? new Date(row.statusChangedAt as string).toISOString() : undefined,
    bio: row.bio as string | undefined,
    createdAt: new Date(row.createdAt as string).toISOString(),
    updatedAt: new Date(row.updatedAt as string).toISOString(),
  };
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
    status: row.status as string,
    closedAt: row.closedAt ? new Date(row.closedAt as string).toISOString() : undefined,
    closedReason: row.closedReason as string | undefined,
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
