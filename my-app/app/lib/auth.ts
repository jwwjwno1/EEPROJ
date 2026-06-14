import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "./prisma";

type DiscordProfile = {
  id?: string;
  username?: string;
  global_name?: string | null;
  avatar?: string | null;
};

export const ADMIN_DISCORD_IDS = ["1366210880525701182", "402793103670640640"];

const getDiscordAvatarUrl = (discordId?: string, avatar?: string | null) => {
  if (!discordId || !avatar) {
    return null;
  }

  const extension = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${extension}`;
};

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      authorization: { params: { scope: "identify email" } },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "discord") {
        return true;
      }

      const discordProfile = profile as DiscordProfile;
      const discordId = account.providerAccountId || discordProfile.id;

      if (!discordId) {
        return false;
      }

      if (!prisma) {
        return true;
      }

      const discordName =
        discordProfile.global_name || discordProfile.username || "Discord User";
      const avatar = getDiscordAvatarUrl(discordId, discordProfile.avatar);

      await prisma.user.upsert({
        where: { discordId },
        update: {
          discordName,
          avatar,
          role: ADMIN_DISCORD_IDS.includes(discordId) ? "admin" : "user",
        },
        create: {
          discordId,
          discordName,
          avatar,
          role: ADMIN_DISCORD_IDS.includes(discordId) ? "admin" : "user",
        },
      });

      return true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "discord") {
        const discordProfile = profile as DiscordProfile;
        const discordId = account.providerAccountId || discordProfile.id;

        token.discordId = discordId;
        token.role = discordId && ADMIN_DISCORD_IDS.includes(discordId) ? "admin" : "user";
        token.picture = getDiscordAvatarUrl(discordId, discordProfile.avatar);
        token.name =
          discordProfile.global_name || discordProfile.username || token.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.discordId =
          typeof token.discordId === "string" ? token.discordId : undefined;
        session.user.role = typeof token.role === "string" ? token.role : undefined;
        session.user.image =
          typeof token.picture === "string" ? token.picture : session.user.image;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
