import { storage } from "./storage";
import type { User, InsertEmailQueue } from "@shared/schema";

// Email templates
export const emailTemplates = {
  welcome5min: (user: User) => ({
    subject: "🎉 Welcome to Kull AI - Your Free Trial Starts Now!",
    htmlBody: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #1f2937; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #8B5CF6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Kull AI! 🚀</h1>
            </div>
            <div class="content">
              <p>Hi ${user.firstName || 'there'},</p>
              <p>Thanks for starting your free trial! You now have <strong>24 hours of unlimited access</strong> to rate your Lightroom photos with AI precision.</p>
              
              <h3>Get Started in 3 Easy Steps:</h3>
              <ol>
                <li><strong>Download the DMG:</strong> Install Kull AI on your Mac</li>
                <li><strong>Connect to Lightroom:</strong> Our plugin integrates seamlessly</li>
                <li><strong>Start Rating:</strong> Watch AI rate your photos 1-5 stars in real-time</li>
              </ol>

              <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://kullai.com'}" class="button">Download Kull AI Now →</a>

              <p><strong>Need Help?</strong> Our support team is standing by! Click the chat icon on any page to get instant help with installation.</p>

              <p><strong>Trial Details:</strong></p>
              <ul>
                <li>✅ 24 hours unlimited photo rating</li>
                <li>✅ All AI models (Gemini, GPT, Claude, Grok)</li>
                <li>✅ Cancel anytime before ${new Date(user.trialEndsAt!).toLocaleString()}</li>
                <li>✅ ${user.subscriptionTier === 'professional' ? '$99/mo Professional' : '$499/mo Studio'} plan ready to activate</li>
              </ul>

              <p>Happy rating! 📸</p>
              <p>The Kull AI Team</p>
            </div>
            <div class="footer">
              <p>© 2025 Lander Media, 31 N Tejon St Colorado Springs CO 80903</p>
              <p>Powered by heydata.org</p>
            </div>
          </div>
        </body>
      </html>
    `,
    textBody: `Welcome to Kull AI!

Hi ${user.firstName || 'there'},

Thanks for starting your free trial! You now have 24 hours of unlimited access to rate your Lightroom photos with AI precision.

Get Started:
1. Download the DMG and install Kull AI on your Mac
2. Connect to Lightroom - our plugin integrates seamlessly
3. Start Rating - watch AI rate your photos 1-5 stars in real-time

Visit ${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://kullai.com'} to download now.

Need Help? Our support team is standing by via chat on the website.

Trial ends: ${new Date(user.trialEndsAt!).toLocaleString()}
Plan: ${user.subscriptionTier === 'professional' ? '$99/mo Professional' : '$499/mo Studio'}

The Kull AI Team
© 2025 Lander Media, 31 N Tejon St Colorado Springs CO 80903
`,
  }),

  installCheck1hr: (user: User) => ({
    subject: "Quick Check-In: How's Your Kull AI Setup Going?",
    htmlBody: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #1f2937; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; }
            .button { display: inline-block; background: #8B5CF6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <p>Hi ${user.firstName},</p>
              <p>It's been an hour since you started your trial. Just checking in to see how things are going!</p>
              
              <p><strong>Have you installed Kull AI yet?</strong></p>

              ${user.appInstalledAt ? 
                '<p>✅ Great! You should be seeing real-time AI ratings in Lightroom now.</p>' : 
                `<p>If you haven't downloaded yet, it only takes 2 minutes to get started:</p>
                <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://kullai.com'}" class="button">Download Now</a>`
              }

              <p><strong>Running into any issues?</strong></p>
              <p>Click the chat icon on our website and we'll help you get up and running immediately. Common questions:</p>
              <ul>
                <li>How to install the Lightroom plugin</li>
                <li>Which AI model is best for my photography style</li>
                <li>How to export rated photos</li>
              </ul>

              <p>You have <strong>${Math.ceil((new Date(user.trialEndsAt!).getTime() - Date.now()) / (1000 * 60 * 60))} hours left</strong> in your free trial. Make the most of it!</p>

              <p>Best,<br>The Kull AI Team</p>
            </div>
            <div class="footer">
              <p>© 2025 Lander Media | Powered by heydata.org</p>
            </div>
          </div>
        </body>
      </html>
    `,
    textBody: `Hi ${user.firstName},

It's been an hour since you started your trial. Just checking in!

${user.appInstalledAt ? 
  'Great! You should be seeing AI ratings in Lightroom now.' : 
  `Haven't downloaded yet? It only takes 2 minutes: ${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://kullai.com'}`
}

Running into issues? Chat with us on the website for instant help.

You have ${Math.ceil((new Date(user.trialEndsAt!).getTime() - Date.now()) / (1000 * 60 * 60))} hours left in your trial!

The Kull AI Team
`,
  }),

  trialEnding18hr: (user: User) => ({
    subject: "⏰ Your Kull AI Trial Ends in 6 Hours",
    htmlBody: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #1f2937; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; margin-bottom: 20px; border-radius: 6px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; }
            .button { display: inline-block; background: #8B5CF6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .button-secondary { background: #6b7280; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="alert">
              <strong>⏰ Trial Ending Soon:</strong> Your free trial ends in approximately <strong>6 hours</strong> at ${new Date(user.trialEndsAt!).toLocaleString()}.
            </div>
            <div class="content">
              <p>Hi ${user.firstName},</p>
              <p>Hope you've been enjoying Kull AI! This is a friendly reminder that your 24-hour free trial will end soon.</p>

              <h3>What Happens Next?</h3>
              <p><strong>In 6 hours, your ${user.subscriptionTier === 'professional' ? '$99/mo Professional' : '$499/mo Studio'} subscription will automatically activate</strong> and your saved payment method will be charged.</p>

              <h3>Want to Cancel?</h3>
              <p>No problem! You can cancel anytime before ${new Date(user.trialEndsAt!).toLocaleString()} with zero charge.</p>
              <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://kullai.com'}" class="button button-secondary">Manage Subscription →</a>

              <h3>Happy with Kull AI?</h3>
              <p>Then you don't need to do anything! Your subscription will activate automatically and you'll continue enjoying:</p>
              <ul>
                <li>✅ Unlimited AI photo ratings</li>
                <li>✅ All 5 AI models (Gemini, GPT, Claude, Grok, Groq)</li>
                <li>✅ Lightroom integration</li>
                <li>✅ Priority support</li>
                ${user.subscriptionTier === 'studio' ? '<li>✅ Studio-grade features & team collaboration</li>' : ''}
              </ul>

              <p><strong>Questions?</strong> Our support team is here to help! Use the chat on our website.</p>

              <p>Thanks for choosing Kull AI! 📸</p>
              <p>The Kull AI Team</p>
            </div>
            <div class="footer">
              <p>© 2025 Lander Media, 31 N Tejon St Colorado Springs CO 80903</p>
              <p>Powered by heydata.org</p>
            </div>
          </div>
        </body>
      </html>
    `,
    textBody: `⏰ TRIAL ENDING SOON

Hi ${user.firstName},

Your free trial ends in approximately 6 hours at ${new Date(user.trialEndsAt!).toLocaleString()}.

What Happens Next?
Your ${user.subscriptionTier === 'professional' ? '$99/mo Professional' : '$499/mo Studio'} subscription will automatically activate and your saved payment method will be charged.

Want to Cancel?
Visit ${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://kullai.com'} before ${new Date(user.trialEndsAt!).toLocaleString()} to cancel with zero charge.

Happy with Kull AI?
No action needed! Your subscription activates automatically.

Questions? Chat with us on the website.

The Kull AI Team
© 2025 Lander Media
`,
  }),

  trialEnding23hr: (user: User) => ({
    subject: "🚨 Final Reminder: Your Kull AI Trial Ends in 1 Hour",
    htmlBody: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #1f2937; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert { background: #FEE2E2; border-left: 4px solid #DC2626; padding: 20px; margin-bottom: 20px; border-radius: 6px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; }
            .button { display: inline-block; background: #8B5CF6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .button-cancel { background: #DC2626; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="alert">
              <strong>🚨 FINAL REMINDER:</strong> Your free trial ends in <strong>1 HOUR</strong> at ${new Date(user.trialEndsAt!).toLocaleString()}.
            </div>
            <div class="content">
              <p>Hi ${user.firstName},</p>
              <p>This is your <strong>final reminder</strong> before your trial ends and billing begins.</p>

              <h3>⚠️ What Happens in 1 Hour?</h3>
              <p>Your ${user.subscriptionTier === 'professional' ? '$99/mo Professional' : '$499/mo Studio'} subscription will <strong>automatically activate</strong> and your card will be charged for the annual amount:</p>
              <ul>
                <li>${user.subscriptionTier === 'professional' ? '💳 $1,188 for Professional Annual' : '💳 $5,988 for Studio Annual'}</li>
                <li>⏰ Charge occurs at: ${new Date(user.trialEndsAt!).toLocaleString()}</li>
              </ul>

              <h3>🛑 Last Chance to Cancel</h3>
              <p>If you want to cancel, <strong>you must do it now</strong>. After the trial ends, you cannot get a refund.</p>
              <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://kullai.com'}" class="button button-cancel">Cancel My Trial Now →</a>

              <h3>✅ Ready to Continue?</h3>
              <p>If you're happy with Kull AI, no action needed! Your subscription will activate automatically in 1 hour.</p>

              <p><strong>Questions?</strong> Contact us immediately via chat on our website.</p>

              <p>The Kull AI Team</p>
            </div>
            <div class="footer">
              <p>© 2025 Lander Media, 31 N Tejon St Colorado Springs CO 80903</p>
              <p>Powered by heydata.org</p>
            </div>
          </div>
        </body>
      </html>
    `,
    textBody: `🚨 FINAL REMINDER - 1 HOUR LEFT

Hi ${user.firstName},

Your free trial ends in 1 HOUR at ${new Date(user.trialEndsAt!).toLocaleString()}.

What Happens in 1 Hour?
Your ${user.subscriptionTier === 'professional' ? '$99/mo Professional ($1,188 annual)' : '$499/mo Studio ($5,988 annual)'} subscription will automatically activate and your card will be charged.

Last Chance to Cancel:
Visit ${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://kullai.com'} NOW to cancel with zero charge.

Ready to Continue?
No action needed! Your subscription activates automatically in 1 hour.

The Kull AI Team
© 2025 Lander Media
`,
  }),
};

// Schedule all trial emails for a user
export async function scheduleTrialEmails(user: User): Promise<void> {
  if (!user.email || !user.trialStartedAt || !user.trialEndsAt) {
    console.error('Cannot schedule emails: missing user data');
    return;
  }

  const trialStart = new Date(user.trialStartedAt);
  const trialEnd = new Date(user.trialEndsAt);

  // Welcome email - 5 minutes after trial starts
  const welcome5minTime = new Date(trialStart.getTime() + 5 * 60 * 1000);
  const welcomeEmail = emailTemplates.welcome5min(user);
  await storage.scheduleEmail({
    userId: user.id,
    emailType: 'welcome_5min',
    recipientEmail: user.email,
    subject: welcomeEmail.subject,
    htmlBody: welcomeEmail.htmlBody,
    textBody: welcomeEmail.textBody,
    metadata: { userName: user.firstName, trialEnd: user.trialEndsAt },
    scheduledFor: welcome5minTime,
    sentAt: null,
    failedAt: null,
    errorMessage: null,
    retryCount: '0',
    cancelled: false,
  });

  // Installation check email - 1 hour after trial starts
  const installCheck1hrTime = new Date(trialStart.getTime() + 60 * 60 * 1000);
  const installCheckEmail = emailTemplates.installCheck1hr(user);
  await storage.scheduleEmail({
    userId: user.id,
    emailType: 'installation_check_1hr',
    recipientEmail: user.email,
    subject: installCheckEmail.subject,
    htmlBody: installCheckEmail.htmlBody,
    textBody: installCheckEmail.textBody,
    metadata: { userName: user.firstName, appInstalled: !!user.appInstalledAt },
    scheduledFor: installCheck1hrTime,
    sentAt: null,
    failedAt: null,
    errorMessage: null,
    retryCount: '0',
    cancelled: false,
  });

  // Trial ending email - 18 hours after trial starts (6 hours before end)
  const trialEnding18hrTime = new Date(trialStart.getTime() + 18 * 60 * 60 * 1000);
  const trialEndingEmail = emailTemplates.trialEnding18hr(user);
  await storage.scheduleEmail({
    userId: user.id,
    emailType: 'trial_ending_18hr',
    recipientEmail: user.email,
    subject: trialEndingEmail.subject,
    htmlBody: trialEndingEmail.htmlBody,
    textBody: trialEndingEmail.textBody,
    metadata: { userName: user.firstName, tier: user.subscriptionTier },
    scheduledFor: trialEnding18hrTime,
    sentAt: null,
    failedAt: null,
    errorMessage: null,
    retryCount: '0',
    cancelled: false,
  });

  // Final reminder email - 23 hours after trial starts (1 hour before end)
  const trialEnding23hrTime = new Date(trialStart.getTime() + 23 * 60 * 60 * 1000);
  const trialEnding23hrEmail = emailTemplates.trialEnding23hr(user);
  await storage.scheduleEmail({
    userId: user.id,
    emailType: 'trial_ending_23hr',
    recipientEmail: user.email,
    subject: trialEnding23hrEmail.subject,
    htmlBody: trialEnding23hrEmail.htmlBody,
    textBody: trialEnding23hrEmail.textBody,
    metadata: { userName: user.firstName, tier: user.subscriptionTier },
    scheduledFor: trialEnding23hrTime,
    sentAt: null,
    failedAt: null,
    errorMessage: null,
    retryCount: '0',
    cancelled: false,
  });

  console.log(`Scheduled 4 trial emails for user ${user.id}`);
}

// SendGrid email sender (will be activated when API key is provided)
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
          email: 'support@kullai.com',
          name: 'Kull AI',
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

// Process pending emails (called by cron job)
export async function processPendingEmails(): Promise<void> {
  const pendingEmails = await storage.getPendingEmails();
  
  console.log(`[Email Processor] Found ${pendingEmails.length} pending emails`);

  for (const email of pendingEmails) {
    const success = await sendEmail({
      to: email.recipientEmail,
      subject: email.subject,
      html: email.htmlBody,
      text: email.textBody || '',
    });

    if (success) {
      await storage.markEmailSent(email.id);
    } else {
      await storage.markEmailFailed(email.id, 'SendGrid API key not configured or request failed');
    }
  }
}
