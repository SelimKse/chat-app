const normalizeBanPayload = ({ type, reason, category, scope, source, notes, evidence, bannedAt, bannedUntil, bannedBy }) => ({
  isBanned: true,
  type,
  reason,
  category,
  scope,
  source,
  notes,
  evidence,
  bannedAt,
  bannedUntil,
  bannedBy,
});

const clearBanPayload = () => ({
  isBanned: false,
  type: null,
  reason: null,
  category: "other",
  scope: "full",
  source: "manual",
  notes: null,
  evidence: [],
  bannedAt: null,
  bannedUntil: null,
  bannedBy: null,
});

const getActiveBan = (user) => {
  const ban = user?.moderation?.ban;
  if (!ban?.isBanned) return null;

  const now = new Date();
  if (ban.bannedUntil && new Date(ban.bannedUntil) <= now) {
    return null;
  }

  return ban;
};

const syncExpiredBan = async (user) => {
  const ban = user?.moderation?.ban;
  if (!ban?.isBanned || !ban.bannedUntil) {
    return { changed: false, activeBan: getActiveBan(user) };
  }

  const now = new Date();
  const banUntil = new Date(ban.bannedUntil);
  if (banUntil > now) {
    return { changed: false, activeBan: ban };
  }

  const previousBanUntil = ban.bannedUntil;
  user.moderation.ban = clearBanPayload();
  if (user.status === "banned") {
    user.status = "active";
  }

  user.moderation.banHistory.push({
    action: "auto_unban",
    type: "temporary",
    reason: "Ban süresi dolduğu için otomatik kaldırıldı",
    category: "other",
    scope: "full",
    source: "system",
    previousBanUntil,
    newBanUntil: null,
    metadata: { triggeredBy: "syncExpiredBan" },
  });

  await user.save();
  return { changed: true, activeBan: null };
};

const getBanResponseData = (ban) => {
  if (!ban) return null;
  return {
    isBanned: ban.isBanned,
    type: ban.type,
    reason: ban.reason,
    category: ban.category,
    scope: ban.scope,
    bannedAt: ban.bannedAt,
    bannedUntil: ban.bannedUntil,
  };
};

const getRestrictionPath = (restrictionType) => {
  if (restrictionType === "groupMessaging") return "groupMessaging";
  if (restrictionType === "addUsers") return "addUsers";
  return null;
};

const getActiveRestriction = (user, restrictionType) => {
  const path = getRestrictionPath(restrictionType);
  if (!path) return null;

  const restriction = user?.moderation?.restrictions?.[path];
  if (!restriction?.isRestricted) return null;

  const now = new Date();
  if (restriction.restrictedUntil && new Date(restriction.restrictedUntil) <= now) {
    return null;
  }

  return restriction;
};

const syncExpiredRestrictions = async (user) => {
  if (!user?.moderation?.restrictions) {
    return { changed: false };
  }

  const now = new Date();
  let changed = false;
  const keys = ["groupMessaging", "addUsers"];

  for (const key of keys) {
    const restriction = user.moderation.restrictions[key];
    if (!restriction?.isRestricted || !restriction.restrictedUntil) {
      continue;
    }

    const until = new Date(restriction.restrictedUntil);
    if (until > now) {
      continue;
    }

    const previousUntil = restriction.restrictedUntil;
    user.moderation.restrictions[key] = {
      isRestricted: false,
      reason: null,
      restrictedUntil: null,
      updatedBy: null,
      updatedAt: now,
    };

    user.moderation.restrictionHistory.push({
      type: key,
      action: "auto_unrestrict",
      reason: "Kısıt süresi dolduğu için otomatik kaldırıldı",
      previousUntil,
      newUntil: null,
      createdAt: now,
    });

    changed = true;
  }

  if (changed) {
    await user.save();
  }

  return { changed };
};

const getRestrictionResponseData = (restriction) => {
  if (!restriction) return null;
  return {
    isRestricted: restriction.isRestricted,
    reason: restriction.reason,
    restrictedUntil: restriction.restrictedUntil,
    updatedAt: restriction.updatedAt,
  };
};

export {
  normalizeBanPayload,
  clearBanPayload,
  getActiveBan,
  syncExpiredBan,
  getBanResponseData,
  getRestrictionPath,
  getActiveRestriction,
  syncExpiredRestrictions,
  getRestrictionResponseData,
};
