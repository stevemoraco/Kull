import {
  users,
  referrals,
  type User,
  type UpsertUser,
  type Referral,
  type InsertReferral,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Trial and subscription operations
  startTrial(userId: string): Promise<User>;
  updateSubscription(userId: string, tier: string, status: string, stripeCustomerId?: string, stripeSubscriptionId?: string): Promise<User>;
  
  // Referral operations
  createReferral(referral: InsertReferral & { referrerId: string }): Promise<Referral>;
  getUserReferrals(userId: string): Promise<Referral[]>;
  updateReferralStatus(id: string, status: string, referredUserId?: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // On first login, set up trial and special offer
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day
    const specialOfferExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        subscriptionStatus: 'trial',
        trialStartedAt: now,
        trialEndsAt,
        specialOfferExpiresAt,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async startTrial(userId: string): Promise<User> {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const specialOfferExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [user] = await db
      .update(users)
      .set({
        subscriptionStatus: 'trial',
        trialStartedAt: now,
        trialEndsAt,
        specialOfferExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }

  async updateSubscription(
    userId: string,
    tier: string,
    status: string,
    stripeCustomerId?: string,
    stripeSubscriptionId?: string
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionTier: tier,
        subscriptionStatus: status,
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }

  async createReferral(referral: InsertReferral & { referrerId: string }): Promise<Referral> {
    const [newReferral] = await db
      .insert(referrals)
      .values(referral)
      .returning();
    
    return newReferral;
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId));
  }

  async updateReferralStatus(id: string, status: string, referredUserId?: string): Promise<void> {
    await db
      .update(referrals)
      .set({
        status,
        referredUserId,
      })
      .where(eq(referrals.id, id));
  }
}

export const storage = new DatabaseStorage();
