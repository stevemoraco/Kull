import { storage } from "./storage";
import type { User, InsertEmailQueue } from "@shared/schema";
import { emailTemplates } from "./emailTemplates";

// Schedule post-checkout emails (when user starts free trial)
export async function schedulePostCheckoutEmails(user: User): Promise<void> {
  if (!user.email || !user.trialStartedAt || !user.trialEndsAt) {
    console.error('Cannot schedule post-checkout emails: missing user data');
    return;
  }

  const trialStart = new Date(user.trialStartedAt);
  const trialEnd = new Date(user.trialEndsAt);

  console.log(`[Email] Scheduling post-checkout emails for user ${user.id}`);

  // 1. Welcome email - 5 minutes after checkout
  const welcome5minTime = new Date(trialStart.getTime() + 5 * 60 * 1000);
  const welcomeEmail = emailTemplates.welcome5min(user);
  await storage.scheduleEmail({
    userId: user.id,
    emailType: 'welcome_5min',
    recipientEmail: user.email,
    subject: welcomeEmail.subject,
    htmlBody: welcomeEmail.html,
    textBody: welcomeEmail.text,
    metadata: { userName: user.firstName, trialEnd: user.trialEndsAt },
    scheduledFor: welcome5minTime,
    sentAt: null,
    failedAt: null,
    errorMessage: null,
    retryCount: '0',
    cancelled: false,
  });

  // 2. Installation check - 45 minutes after checkout
  const installCheck45minTime = new Date(trialStart.getTime() + 45 * 60 * 1000);
  const installCheckEmail = emailTemplates.installCheck45min(user);
  await storage.scheduleEmail({
    userId: user.id,
    emailType: 'install_check_45min',
    recipientEmail: user.email,
    subject: installCheckEmail.subject,
    htmlBody: installCheckEmail.html,
    textBody: installCheckEmail.text,
    metadata: { userName: user.firstName, appInstalled: !!user.appInstalledAt },
    scheduledFor: installCheck45minTime,
    sentAt: null,
    failedAt: null,
    errorMessage: null,
    retryCount: '0',
    cancelled: false,
  });

  // 3. Trial ending warning - 6 hours before end (18 hours after start)
  const trialEnding6hrTime = new Date(trialEnd.getTime() - 6 * 60 * 60 * 1000);
  const trialEnding6hrEmail = emailTemplates.trialEnding6hr(user);
  await storage.scheduleEmail({
    userId: user.id,
    emailType: 'trial_ending_6hr',
    recipientEmail: user.email,
    subject: trialEnding6hrEmail.subject,
    htmlBody: trialEnding6hrEmail.html,
    textBody: trialEnding6hrEmail.text,
    metadata: { userName: user.firstName, tier: user.subscriptionTier },
    scheduledFor: trialEnding6hrTime,
    sentAt: null,
    failedAt: null,
    errorMessage: null,
    retryCount: '0',
    cancelled: false,
  });

  // 4. Final reminder - 1 hour before end (23 hours after start)
  const trialEnding1hrTime = new Date(trialEnd.getTime() - 1 * 60 * 60 * 1000);
  const trialEnding1hrEmail = emailTemplates.trialEnding1hr(user);
  await storage.scheduleEmail({
    userId: user.id,
    emailType: 'trial_ending_1hr',
    recipientEmail: user.email,
    subject: trialEnding1hrEmail.subject,
    htmlBody: trialEnding1hrEmail.html,
    textBody: trialEnding1hrEmail.text,
    metadata: { userName: user.firstName, tier: user.subscriptionTier },
    scheduledFor: trialEnding1hrTime,
    sentAt: null,
    failedAt: null,
    errorMessage: null,
    retryCount: '0',
    cancelled: false,
  });

  console.log(`[Email] Scheduled 4 post-checkout emails for user ${user.id}`);
}

// Schedule non-checkout drip campaign (when user signs up but doesn't start trial within 2 hours)
export async function scheduleNonCheckoutDripCampaign(user: User): Promise<void> {
  if (!user.email || !user.createdAt) {
    console.error('Cannot schedule drip campaign: missing user data');
    return;
  }

  const signupTime = new Date(user.createdAt);

  console.log(`[Email] Scheduling non-checkout drip campaign for user ${user.id}`);

  // Drip 1: 2 hours after signup (if no checkout)
  const drip1Time = new Date(signupTime.getTime() + 2 * 60 * 60 * 1000);
  const drip1Email = emailTemplates.drip1_2hr(user);
  await storage.scheduleEmail({
    userId: user.id,
    emailType: 'drip_1_2hr',
    recipientEmail: user.email,
    subject: drip1Email.subject,
    htmlBody: drip1Email.html,
    textBody: drip1Email.text,
    metadata: { userName: user.firstName, dripSequence: 1 },
    scheduledFor: drip1Time,
    sentAt: null,
    failedAt: null,
    errorMessage: null,
    retryCount: '0',
    cancelled: false,
  });

  // Drip 2: 6 hours after signup
  const drip2Time = new Date(signupTime.getTime() + 6 * 60 * 60 * 1000);
  const drip2Email = emailTemplates.drip2_6hr(user);
  await storage.scheduleEmail({
    userId: user.id,
    emailType: 'drip_2_6hr',
    recipientEmail: user.email,
    subject: drip2Email.subject,
    htmlBody: drip2Email.html,
    textBody: drip2Email.text,
    metadata: { userName: user.firstName, dripSequence: 2 },
    scheduledFor: drip2Time,
    sentAt: null,
    failedAt: null,
    errorMessage: null,
    retryCount: '0',
    cancelled: false,
  });

  // Drip 3: 11 hours after signup
  const drip3Time = new Date(signupTime.getTime() + 11 * 60 * 60 * 1000);
  const drip3Email = emailTemplates.drip3_11hr(user);
  await storage.scheduleEmail({
    userId: user.id,
    emailType: 'drip_3_11hr',
    recipientEmail: user.email,
    subject: drip3Email.subject,
    htmlBody: drip3Email.html,
    textBody: drip3Email.text,
    metadata: { userName: user.firstName, dripSequence: 3 },
    scheduledFor: drip3Time,
    sentAt: null,
    failedAt: null,
    errorMessage: null,
    retryCount: '0',
    cancelled: false,
  });

  // Drip 4: 16 hours after signup
  const drip4Time = new Date(signupTime.getTime() + 16 * 60 * 60 * 1000);
  const drip4Email = emailTemplates.drip4_16hr(user);
  await storage.scheduleEmail({
    userId: user.id,
    emailType: 'drip_4_16hr',
    recipientEmail: user.email,
    subject: drip4Email.subject,
    htmlBody: drip4Email.html,
    textBody: drip4Email.text,
    metadata: { userName: user.firstName, dripSequence: 4 },
    scheduledFor: drip4Time,
    sentAt: null,
    failedAt: null,
    errorMessage: null,
    retryCount: '0',
    cancelled: false,
  });

  // Drip 5: 21 hours after signup (final drip)
  const drip5Time = new Date(signupTime.getTime() + 21 * 60 * 60 * 1000);
  const drip5Email = emailTemplates.drip5_21hr(user);
  await storage.scheduleEmail({
    userId: user.id,
    emailType: 'drip_5_21hr',
    recipientEmail: user.email,
    subject: drip5Email.subject,
    htmlBody: drip5Email.html,
    textBody: drip5Email.text,
    metadata: { userName: user.firstName, dripSequence: 5 },
    scheduledFor: drip5Time,
    sentAt: null,
    failedAt: null,
    errorMessage: null,
    retryCount: '0',
    cancelled: false,
  });

  console.log(`[Email] Scheduled 5 drip campaign emails for user ${user.id}`);
}

// Cancel drip campaign (called when user starts trial)
export async function cancelDripCampaign(userId: string): Promise<void> {
  try {
    await storage.cancelDripEmails(userId);
    console.log(`[Email] Cancelled drip campaign for user ${userId}`);
  } catch (error) {
    console.error(`[Email] Error cancelling drip campaign for user ${userId}:`, error);
  }
}

// SendGrid email sender
export async function sendEmail(email: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  
  if (!sendgridApiKey) {
    console.log('[SendGrid] API key not configured, email queued but not sent:', email.subject);
    return false;
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: email.to }],
        }],
        from: {
          email: 'noreply@kullai.com',
          name: 'Kull AI',
        },
        reply_to: {
          email: 'support@kullai.com',
          name: 'Kull AI Support',
        },
        subject: email.subject,
        content: [
          {
            type: 'text/plain',
            value: email.text,
          },
          {
            type: 'text/html',
            value: email.html,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SendGrid] Failed to send email:', errorText);
      return false;
    }

    console.log('[SendGrid] Email sent successfully:', email.subject);
    return true;
  } catch (error) {
    console.error('[SendGrid] Error sending email:', error);
    return false;
  }
}

// Process pending emails (called by cron job every minute)
export async function processPendingEmails(): Promise<void> {
  try {
    const pendingEmails = await storage.getPendingEmails();
    
    if (pendingEmails.length === 0) {
      return; // Don't log when there are no emails
    }

    console.log(`[Email Processor] Found ${pendingEmails.length} pending emails to process`);

    for (const email of pendingEmails) {
      // Check if this is a drip email and user has already started trial
      if (email.emailType.startsWith('drip_')) {
        const user = await storage.getUserById(email.userId);
        if (user?.trialStartedAt) {
          console.log(`[Email Processor] Skipping drip email for user ${email.userId} - trial already started`);
          await storage.cancelEmail(email.id);
          continue;
        }
      }

      const success = await sendEmail({
        to: email.recipientEmail,
        subject: email.subject,
        html: email.htmlBody,
        text: email.textBody || '',
      });

      if (success) {
        await storage.markEmailSent(email.id);
        console.log(`[Email Processor] Successfully sent: ${email.subject}`);
      } else {
        const retryCount = parseInt(email.retryCount || '0');
        if (retryCount < 3) {
          // Retry up to 3 times
          await storage.incrementEmailRetry(email.id);
          console.log(`[Email Processor] Retry ${retryCount + 1}/3 for: ${email.subject}`);
        } else {
          await storage.markEmailFailed(email.id, 'Max retries reached or SendGrid error');
          console.error(`[Email Processor] Failed after 3 retries: ${email.subject}`);
        }
      }
    }
  } catch (error) {
    console.error('[Email Processor] Error processing emails:', error);
  }
}

// Start email processor (runs every minute)
export function startEmailProcessor(): void {
  console.log('[Email Processor] Starting email processor (runs every minute)');
  
  // Process immediately on startup
  processPendingEmails();
  
  // Then process every minute
  setInterval(processPendingEmails, 60 * 1000);
}
