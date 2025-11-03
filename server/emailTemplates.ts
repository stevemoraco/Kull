import type { User } from "@shared/schema";

// Email base styles matching the website design
const emailStyles = `
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6;
    color: #1f2937;
    background-color: #f9fafb;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 600px;
    margin: 40px auto;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  .header {
    background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%);
    padding: 40px 30px;
    text-align: center;
  }
  .header h1 {
    color: white;
    margin: 0;
    font-size: 28px;
    font-weight: 700;
  }
  .content {
    padding: 40px 30px;
  }
  .content p {
    margin: 0 0 16px 0;
    color: #4b5563;
  }
  .content h2 {
    color: #111827;
    font-size: 24px;
    font-weight: 700;
    margin: 32px 0 16px 0;
  }
  .content h3 {
    color: #374151;
    font-size: 18px;
    font-weight: 600;
    margin: 24px 0 12px 0;
  }
  .button {
    display: inline-block;
    background: #8B5CF6;
    color: white !important;
    padding: 16px 32px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    margin: 24px 0;
  }
  .button-secondary {
    background: #6b7280;
  }
  .alert {
    background: #FEF3C7;
    border-left: 4px solid #F59E0B;
    padding: 16px;
    margin: 24px 0;
    border-radius: 6px;
  }
  .alert-success {
    background: #D1FAE5;
    border-left-color: #10B981;
  }
  .feature-list {
    list-style: none;
    padding: 0;
  }
  .feature-list li {
    padding: 8px 0;
    padding-left: 28px;
    position: relative;
  }
  .feature-list li:before {
    content: "✓";
    position: absolute;
    left: 0;
    color: #8B5CF6;
    font-weight: bold;
  }
  .footer {
    background: #f9fafb;
    padding: 30px;
    text-align: center;
    color: #6b7280;
    font-size: 14px;
  }
  .footer-links {
    margin: 16px 0;
  }
  .footer-links a {
    color: #8B5CF6;
    text-decoration: none;
    margin: 0 12px;
  }
  .stats-box {
    background: #F3F4F6;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
  }
`;

const baseUrl = (process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://kullai.com').replace(/\/$/, '');

// Helper to calculate offer expiration (24 hours from user creation)
const getOfferHoursRemaining = (user: User): number => {
  if (!user.createdAt) return 24;
  const offerExpires = new Date(user.createdAt.getTime() + 24 * 60 * 60 * 1000);
  const hoursRemaining = Math.ceil((offerExpires.getTime() - Date.now()) / (1000 * 60 * 60));
  return Math.max(0, hoursRemaining);
};

// FIRST LOGIN WELCOME EMAIL
export const firstLoginWelcomeEmail = (user: User) => ({
  subject: "🎉 Welcome to Kull AI - Let's Get Started!",
  html: `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Kull AI! 🚀</h1>
    </div>
    <div class="content">
      <p>Hi ${user.firstName || 'there'},</p>
      
      <p><strong>Thanks for signing up!</strong> You're one step away from revolutionizing your photo culling workflow.</p>

      <div class="alert alert-success">
        <strong>🎁 Your Special Offer:</strong> Start a 1-day FREE trial and get <strong>3 BONUS MONTHS FREE</strong> on annual plans (limited time!)
      </div>

      <h2>Here's What Happens Next:</h2>
      
      <ol>
        <li><strong>Start Your Free Trial 🎯</strong><br>Click below to start your 24-hour unlimited trial - no credit card required until you're ready!</li>
        <li><strong>Download & Install ⚡</strong><br>One-click Mac installation takes just 2 minutes</li>
        <li><strong>Watch AI Work Its Magic 🤖</strong><br>See thousands of photos rated in minutes, not hours!</li>
      </ol>

      <center>
        <a href="${baseUrl}/home" class="button">Start Your Free Trial Now →</a>
      </center>

      <h3>✨ What You'll Get:</h3>
      <ul class="feature-list">
        <li>5 advanced AI models (Gemini, GPT-5, Claude, Grok, Kimi k2)</li>
        <li>Works with any folder on your Mac</li>
        <li>Unlimited photo rating for 24 hours</li>
        <li>24/7 AI-powered chat support</li>
        <li>7-day money-back guarantee after trial</li>
      </ul>

      <div class="stats-box">
        <strong>💡 Pro Tip:</strong> Have a recent photoshoot ready? Start your trial when you can test it on real work - you'll be amazed how much time you save!
      </div>

      <p><strong>Questions?</strong> Click the chat icon on our website for instant AI-powered support.</p>

      <p>Excited to see what you create! 📸</p>
      <p><strong>Steve Moraco</strong><br>
      Founder, Kull AI</p>
    </div>
    <div class="footer">
      <div class="footer-links">
        <a href="${baseUrl}/support">Support</a> •
        <a href="${baseUrl}/refunds">Refunds</a> •
        <a href="${baseUrl}/terms">Terms</a> •
        <a href="${baseUrl}/contact">Contact</a>
      </div>
      <p>Follow me on X: <a href="https://x.com/steveMoraco" style="color: #8B5CF6;">@steveMoraco</a></p>
      <p>© 2025 Lander Media, 31 N Tejon St, Colorado Springs, CO 80903</p>
      <p><a href="https://heydata.org" style="color: #8B5CF6;">Powered by heydata.org</a></p>
    </div>
  </div>
</body>
</html>
  `,
  text: `Welcome to Kull AI! 🚀

Hi ${user.firstName || 'there'},

Thanks for signing up! You're one step away from revolutionizing your photo culling workflow.

🎁 YOUR SPECIAL OFFER: Start a 1-day FREE trial and get 3 BONUS MONTHS FREE on annual plans!

HERE'S WHAT HAPPENS NEXT:

1. Start Your Free Trial 🎯
   Click the link below - no credit card required!

2. Download & Install ⚡
   One-click Mac installation (2 minutes)

3. Watch AI Work Its Magic 🤖
   Rate thousands of photos in minutes!

Start your free trial: ${baseUrl}/home

WHAT YOU'LL GET:
✓ 5 advanced AI models
✓ Works with any folder on your Mac
✓ Unlimited rating for 24 hours
✓ 24/7 AI-powered support
✓ 7-day money-back guarantee

💡 Pro Tip: Have a recent photoshoot ready? Start your trial when you can test it on real work!

Questions? Visit ${baseUrl}/support

Excited to see what you create! 📸

Steve Moraco
Founder, Kull AI
Follow me: https://x.com/steveMoraco`
});

// REFERRAL CONFIRMATION EMAIL (sent to referrer after sending invites)
export const referralConfirmationEmail = (user: User, referredEmails: string[], unlockedRewards: string[], potentialRewards: string[]) => ({
  subject: `🎉 Thank You for Spreading the Word About Kull AI!`,
  html: `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thank You! 🙏</h1>
    </div>
    <div class="content">
      <p>Hi ${user.firstName},</p>
      
      <p><strong>Your invitations have been sent!</strong> Here's what happened:</p>

      <div class="stats-box">
        <strong>📧 Invitations Sent To:</strong><br>
        ${referredEmails.map(email => `• ${email}`).join('<br>')}
      </div>

      ${unlockedRewards.length > 0 ? `
      <div class="alert alert-success">
        <strong>🎁 Rewards Unlocked:</strong><br>
        ${unlockedRewards.map(reward => `✓ ${reward}`).join('<br>')}
      </div>
      ` : ''}

      ${potentialRewards.length > 0 ? `
      <div class="alert">
        <strong>💎 Potential Rewards (if they subscribe in 24 hours):</strong><br>
        ${potentialRewards.map(reward => `🔓 ${reward}`).join('<br>')}
      </div>
      ` : ''}

      <h3>What Happens Next?</h3>
      <ul class="feature-list">
        <li>Your friends will receive a personalized invitation email from you</li>
        <li>They get a FREE 1-day unlimited trial to test Kull AI</li>
        <li>When they become paying subscribers, <strong>BOTH of you receive bonus rewards!</strong></li>
        <li>You can track your referral status anytime in your dashboard</li>
      </ul>

      <h3>🚀 Referral Rewards System:</h3>
      <div class="stats-box">
        <strong>3 referrals sent:</strong> 1 month free 🎁<br>
        <strong>5 referrals sent:</strong> Priority support upgrade 💪<br>
        <strong>10 referrals sent OR 3 completed:</strong> 3 months free 🏆
      </div>

      <center>
        <a href="${baseUrl}/home" class="button">View Your Referral Dashboard →</a>
      </center>

      <p><strong>Want to earn more rewards?</strong> Keep sharing! The more photographer friends you invite, the bigger the bonuses.</p>

      <p>Thanks for being an amazing Kull AI advocate! 🙌</p>
      <p><strong>Steve Moraco</strong><br>
      Founder, Kull AI</p>
    </div>
    <div class="footer">
      <div class="footer-links">
        <a href="${baseUrl}/support">Support</a> •
        <a href="${baseUrl}/home">Dashboard</a> •
        <a href="${baseUrl}/contact">Contact</a>
      </div>
      <p>Follow me on X: <a href="https://x.com/steveMoraco" style="color: #8B5CF6;">@steveMoraco</a></p>
      <p>© 2025 Lander Media, 31 N Tejon St, Colorado Springs, CO 80903</p>
      <p><a href="https://heydata.org" style="color: #8B5CF6;">Powered by heydata.org</a></p>
    </div>
  </div>
</body>
</html>
  `,
  text: `Thank You! 🙏

Hi ${user.firstName},

Your invitations have been sent!

📧 INVITATIONS SENT TO:
${referredEmails.map(email => `• ${email}`).join('\n')}

${unlockedRewards.length > 0 ? `
🎁 REWARDS UNLOCKED:
${unlockedRewards.map(reward => `✓ ${reward}`).join('\n')}
` : ''}

${potentialRewards.length > 0 ? `
💎 POTENTIAL REWARDS (if they subscribe in 24 hours):
${potentialRewards.map(reward => `🔓 ${reward}`).join('\n')}
` : ''}

WHAT HAPPENS NEXT:
• Your friends receive personalized invitation emails
• They get a FREE 1-day trial
• When they subscribe, BOTH of you get bonus rewards!
• Track your referrals at ${baseUrl}/home

🚀 REFERRAL REWARDS:
3 sent: 1 month free 🎁
5 sent: Priority support 💪
10 sent OR 3 completed: 3 months free 🏆

View your dashboard: ${baseUrl}/home

Thanks for being an amazing Kull AI advocate! 🙌

Steve Moraco
Founder, Kull AI
Follow me: https://x.com/steveMoraco`
});

// POST-CHECKOUT EMAILS
export const welcome5minEmail = (user: User) => ({
  subject: "🎉 Welcome to Kull AI - Your Journey Starts Now!",
  html: `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Kull AI! 🚀</h1>
    </div>
    <div class="content">
      <p>Hi ${user.firstName || 'there'},</p>
      
      <p><strong>You've just unlocked the future of photo rating!</strong> Your 24-hour free trial gives you unlimited access to all 5 advanced AI models.</p>

      <div class="alert alert-success">
        <strong>✅ Trial Active:</strong> Free until ${new Date(user.trialEndsAt!).toLocaleString()}
      </div>

      <h2>🎯 Get Started in 3 Simple Steps:</h2>
      
      <ol>
        <li><strong>Download Kull AI:</strong> One-click Mac installation (2 minutes)</li>
        <li><strong>Launch the app:</strong> Point it to any photo folder</li>
        <li><strong>Start Rating:</strong> Watch AI analyze your photos in real-time</li>
      </ol>

      <center>
        <a href="${baseUrl}/home" class="button">Download Kull AI Now →</a>
      </center>

      <h3>💎 What's Included in Your Trial:</h3>
      <ul class="feature-list">
        <li>Unlimited photo ratings for 24 hours</li>
        <li>All 5 AI models (Gemini, GPT-5, Claude, Grok, Kimi k2)</li>
        <li>Works with any folder on your Mac</li>
        <li>24/7 AI-powered chat support</li>
        <li>No credit card charge until trial ends</li>
      </ul>

      <div class="stats-box">
        <strong>📊 Your Plan:</strong> ${user.subscriptionTier === 'professional' ? 'Professional ($99/mo)' : 'Studio ($499/mo)'}<br>
        <strong>💳 Trial Ends:</strong> ${new Date(user.trialEndsAt!).toLocaleString()}<br>
        <strong>✅ Status:</strong> Active & ready to use
      </div>

      <p><strong>Need Help?</strong> Click the chat icon on any page for instant AI-powered support, or visit our <a href="${baseUrl}/support">Support Center</a>.</p>

      <p>Happy rating! 📸</p>
      <p><strong>Steve Moraco</strong><br>
      Founder, Kull AI</p>
    </div>
    <div class="footer">
      <div class="footer-links">
        <a href="${baseUrl}/support">Support</a> •
        <a href="${baseUrl}/refunds">Refunds</a> •
        <a href="${baseUrl}/terms">Terms</a> •
        <a href="${baseUrl}/contact">Contact</a>
      </div>
      <p>Follow me on X: <a href="https://x.com/steveMoraco" style="color: #8B5CF6;">@steveMoraco</a></p>
      <p>© 2025 Lander Media, 31 N Tejon St, Colorado Springs, CO 80903</p>
      <p><a href="https://heydata.org" style="color: #8B5CF6;">Powered by heydata.org</a></p>
    </div>
  </div>
</body>
</html>
  `,
  text: `🎉 Welcome to Kull AI! 🚀

Hi ${user.firstName || 'there'},

You've just unlocked the future of photo rating! Your 24-hour free trial gives you unlimited access to all 5 advanced AI models.

✅ Trial Active: Free until ${new Date(user.trialEndsAt!).toLocaleString()}

🎯 Get Started:
1. Download Kull AI (2 minutes)
2. Connect Lightroom
3. Start Rating

Visit ${baseUrl}/home to download now.

📊 Your Plan: ${user.subscriptionTier === 'professional' ? 'Professional ($99/mo)' : 'Studio ($499/mo)'}
💳 Trial Ends: ${new Date(user.trialEndsAt!).toLocaleString()}

Need help? Visit ${baseUrl}/support

Happy rating! 📸

Steve Moraco
Founder, Kull AI
Follow me: https://x.com/steveMoraco

© 2025 Lander Media`
});

export const installCheck45minEmail = (user: User) => ({
  subject: "🔍 Quick Check: Is Kull AI Rating Your Photos Yet?",
  html: `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <p>Hi ${user.firstName},</p>
      
      <p>It's been 45 minutes since you started your trial. I wanted to check in and make sure everything's working smoothly!</p>

      <h2>📸 Have You Rated Your First Photos?</h2>

      <p>If yes - amazing! You're experiencing the future of photography workflow. If not, here's a quick setup guide:</p>

      <h3>🎯 5-Minute Quick Start:</h3>
      <ol>
        <li><strong>Open the DMG</strong> file you downloaded</li>
        <li><strong>Drag Kull AI</strong> to Applications folder</li>
        <li><strong>Open Kull AI app</strong></li>
        <li><strong>Go to Select photo folder</strong></li>
        <li><strong>Click "Add"</strong> and select Kull AI</li>
        <li><strong>and start organizing</strong> and begin rating</li>
      </ol>

      <center>
        <a href="${baseUrl}/home" class="button">Download Again (if needed)</a>
      </center>

      <div class="stats-box">
        <strong>💡 Pro Tip:</strong> Start with Gemini model for balanced ratings, then try GPT-5 for detailed artistic analysis. Each model sees photos differently!
      </div>

      <h3>Common Questions:</h3>
      <ul class="feature-list">
        <li><strong>Which AI model is best?</strong> Try Gemini first, it's great for most photo types</li>
        <li><strong>How fast is rating?</strong> 100-500 photos rated in minutes (depending on model)</li>
        <li><strong>Can I adjust ratings?</strong> Yes! AI suggestions, your final call</li>
      </ul>

      <p><strong>Running Into Issues?</strong> Our AI chat support can help with any installation questions - just click the chat icon on our website.</p>

      <div class="alert">
        <strong>⏰ Trial Status:</strong> ${Math.ceil((new Date(user.trialEndsAt!).getTime() - Date.now()) / (1000 * 60 * 60))} hours remaining
      </div>

      <p>Make the most of your trial!</p>
      <p><strong>Steve Moraco</strong><br>
      Founder, Kull AI</p>
    </div>
    <div class="footer">
      <div class="footer-links">
        <a href="${baseUrl}/support">Support</a> •
        <a href="${baseUrl}/refunds">Refunds</a> •
        <a href="${baseUrl}/contact">Contact</a>
      </div>
      <p>Follow me on X: <a href="https://x.com/steveMoraco" style="color: #8B5CF6;">@steveMoraco</a></p>
      <p>© 2025 Lander Media | <a href="https://heydata.org" style="color: #8B5CF6;">Powered by heydata.org</a></p>
    </div>
  </div>
</body>
</html>
  `,
  text: `🔍 Hi ${user.firstName},

45 minutes into your trial - wanted to check in!

🎯 5-Minute Quick Start:
1. Open DMG file
2. Drag to Applications
3. Open Kull AI app
4. Select photo folder → Add Kull AI
5. Enable and restart

💡 Pro Tip: Start with Gemini model for balanced ratings.

Running into issues? Chat with us at ${baseUrl}/support

⏰ Trial Status: ${Math.ceil((new Date(user.trialEndsAt!).getTime() - Date.now()) / (1000 * 60 * 60))} hours remaining

Steve Moraco
Founder, Kull AI
Follow me: https://x.com/steveMoraco`
});

// TRIAL ENDING WARNINGS
export const trialEnding6hrEmail = (user: User) => ({
  subject: "⏰ Your Kull AI Trial Ends in 6 Hours - What's Next?",
  html: `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <div class="alert">
      <strong>⏰ Trial Ending Soon:</strong> Your free trial ends in <strong>6 hours</strong> at ${new Date(user.trialEndsAt!).toLocaleString()}
    </div>
    <div class="content">
      <p>Hi ${user.firstName},</p>
      
      <p>Hope you've enjoyed rating photos with AI! This is your 6-hour heads up before your trial ends.</p>

      <h2>⏰ What Happens in 6 Hours?</h2>
      
      <p><strong>Your ${user.subscriptionTier === 'professional' ? '$99/mo Professional' : '$499/mo Studio'} subscription will automatically activate</strong> and your saved payment method will be charged.</p>

      <div class="stats-box">
        <strong>💳 Monthly:</strong> ${user.subscriptionTier === 'professional' ? '$99/month' : '$499/month'}<br>
        <strong>💰 Annual (40% savings):</strong> ${user.subscriptionTier === 'professional' ? '$1,188/year ($99/mo)' : '$5,988/year ($499/mo)'}
      </div>

      <h3>🤔 Your Options:</h3>

      <ul class="feature-list">
        <li><strong>✅ Keep Rating:</strong> Do nothing - your plan activates automatically</li>
        <li><strong>❌ Cancel Trial:</strong> Visit your dashboard to cancel with zero charge</li>
        <li><strong>💰 Request Refund:</strong> Have 7 days after billing for instant self-service refund</li>
      </ul>

      <center>
        <a href="${baseUrl}/home" class="button">Manage Your Subscription</a>
        <a href="${baseUrl}/refunds" class="button button-secondary">View Refund Policy</a>
      </center>

      <h3>💎 Love Kull AI? Here's What You'll Keep:</h3>
      <ul class="feature-list">
        <li>Unlimited photo rating across all projects</li>
        <li>All 5 AI models (Gemini, GPT-5, Claude, Grok, Kimi k2)</li>
        <li>Universal app with cross-device sync</li>
        <li>24/7 AI-powered support</li>
        <li>Regular feature updates & new AI models</li>
      </ul>

      <p><strong>Questions?</strong> Chat with us instantly at <a href="${baseUrl}/support">${baseUrl}/support</a></p>

      <p>Thanks for trying Kull AI!</p>
      <p><strong>Steve Moraco</strong><br>
      Founder, Kull AI</p>
    </div>
    <div class="footer">
      <div class="footer-links">
        <a href="${baseUrl}/support">Support</a> •
        <a href="${baseUrl}/refunds">Refunds</a> •
        <a href="${baseUrl}/terms">Terms</a> •
        <a href="${baseUrl}/contact">Contact</a>
      </div>
      <p>Follow me on X: <a href="https://x.com/steveMoraco" style="color: #8B5CF6;">@steveMoraco</a></p>
      <p>© 2025 Lander Media | <a href="https://heydata.org" style="color: #8B5CF6;">Powered by heydata.org</a></p>
    </div>
  </div>
</body>
</html>
  `,
  text: `⏰ Trial Ending in 6 Hours

Hi ${user.firstName},

Your free trial ends in 6 hours at ${new Date(user.trialEndsAt!).toLocaleString()}

What Happens Next:
Your ${user.subscriptionTier === 'professional' ? '$99/mo Professional' : '$499/mo Studio'} subscription activates automatically.

🤔 Your Options:
• ✅ Keep Rating - do nothing, plan activates
• ❌ Cancel Trial - visit dashboard for zero charge
• 💰 Request Refund - 7 days for self-service refund

Manage subscription: ${baseUrl}/home
Refund policy: ${baseUrl}/refunds

Steve Moraco
Founder, Kull AI
Follow me: https://x.com/steveMoraco`
});

export const trialEnding1hrEmail = (user: User) => ({
  subject: "🚨 Final Notice: Your Kull AI Trial Ends in 1 Hour",
  html: `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <div class="alert">
      <strong>🚨 FINAL NOTICE:</strong> Your trial ends in <strong>1 HOUR</strong> at ${new Date(user.trialEndsAt!).toLocaleString()}
    </div>
    <div class="content">
      <p>Hi ${user.firstName},</p>
      
      <p><strong>This is your final reminder</strong> - in just one hour, your trial ends and your subscription begins.</p>

      <h2>⚠️ Last Chance to Decide:</h2>

      <div class="stats-box">
        <strong>💳 Billing in 1 hour:</strong> ${user.subscriptionTier === 'professional' ? '$1,188/year' : '$5,988/year'} (Annual Plan)<br>
        <strong>❌ Cancel now:</strong> Zero charge, no questions asked<br>
        <strong>✅ Continue:</strong> Keep unlimited AI photo rating
      </div>

      <center>
        <a href="${baseUrl}/home" class="button">Cancel Trial (No Charge)</a>
      </center>

      <h3>💎 If You Continue, You Get:</h3>
      <ul class="feature-list">
        <li>Unlimited photo rating forever</li>
        <li>All 5 AI models for different styles</li>
        <li>Universal Mac/iPhone/iPad app that works with any folder</li>
        <li>24/7 support via AI chat</li>
        <li><strong>7-day money-back guarantee</strong> - instant self-service refund</li>
      </ul>

      <div class="alert alert-success">
        <strong>✅ Risk-Free Promise:</strong> Even after billing, you have 7 full days to request an instant refund at <a href="${baseUrl}/refunds">${baseUrl}/refunds</a>
      </div>

      <p><strong>Not sure yet?</strong> Cancel now and sign up again later when you're ready!</p>

      <p><strong>Questions?</strong> Chat instantly at <a href="${baseUrl}/support">${baseUrl}/support</a></p>

      <p>Whatever you decide, thank you for trying Kull AI!</p>
      <p><strong>Steve Moraco</strong><br>
      Founder, Kull AI</p>
    </div>
    <div class="footer">
      <div class="footer-links">
        <a href="${baseUrl}/support">Support</a> •
        <a href="${baseUrl}/refunds">Refunds</a> •
        <a href="${baseUrl}/contact">Contact</a>
      </div>
      <p>Follow me on X: <a href="https://x.com/steveMoraco" style="color: #8B5CF6;">@steveMoraco</a></p>
      <p>© 2025 Lander Media | <a href="https://heydata.org" style="color: #8B5CF6;">Powered by heydata.org</a></p>
    </div>
  </div>
</body>
</html>
  `,
  text: `🚨 FINAL NOTICE: Trial Ends in 1 Hour

Hi ${user.firstName},

Your trial ends in 1 HOUR at ${new Date(user.trialEndsAt!).toLocaleString()}

💳 Billing in 1 hour: ${user.subscriptionTier === 'professional' ? '$1,188/year' : '$5,988/year'}
❌ Cancel now: Zero charge
✅ Continue: Keep unlimited AI rating

✅ Risk-Free Promise: 7-day money-back guarantee even after billing

Cancel trial: ${baseUrl}/home
Questions: ${baseUrl}/support

Steve Moraco
Founder, Kull AI
Follow me: https://x.com/steveMoraco`
});

// NON-CHECKOUT DRIP CAMPAIGN (Every 4-5 hours if no checkout in first 2 hours)

export const drip1_2hrEmail = (user: User) => ({
  subject: "🤔 Still Deciding? Here's Everything Kull AI Can Do For You",
  html: `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <p>Hi ${user.firstName},</p>
      
      <p>I noticed you haven't started your free trial yet. No worries! I wanted to share exactly what Kull AI can do for your photography workflow.</p>

      <h2>😓 The Problem Every Photographer Faces:</h2>
      <p>You spend hours culling through thousands of photos, manually rating each one. It's exhausting, time-consuming, and honestly... boring.</p>

      <div class="stats-box">
        <strong>📊 Average photographer stats:</strong><br>
        • 3-5 hours culling 1,000 photos<br>
        • 75% of time on "obvious" keep/delete decisions<br>
        • Mental fatigue leads to inconsistent ratings
      </div>

      <h2>🚀 How Kull AI Changes Everything:</h2>
      <ul class="feature-list">
        <li><strong>Rate 1,000 photos in 10-15 minutes</strong> using AI batch processing</li>
        <li><strong>5 different AI perspectives</strong> - Gemini, GPT-5, Claude, Grok, Kimi k2</li>
        <li><strong>Context-aware ratings</strong> - AI sees the whole photoshoot, not just individual images</li>
        <li><strong>Works with any folder on your Mac</strong> - Real-time ratings as you browse your catalog</li>
      </ul>

      <center>
        <a href="${baseUrl}" class="button">Start Your Free 24-Hour Trial →</a>
      </center>

      <h3>💡 Pro Photographer Workflow:</h3>
      <ol>
        <li>Open your photo folder in Kull AI</li>
        <li>Let Kull AI rate everything (10-15 minutes for 1,000 photos)</li>
        <li>Review AI suggestions, adjust as needed</li>
        <li>Export keepers - done in 1/3 the time!</li>
      </ol>

      <div class="alert">
        <strong>⏰ Your Special Offer Countdown:</strong> Expires in ${getOfferHoursRemaining(user)} hours - 3 extra months free on annual plans!
      </div>

      <p><strong>Questions?</strong> Chat with us instantly at <a href="${baseUrl}/support">${baseUrl}/support</a></p>

      <p>Ready to transform your workflow?</p>
      <p><strong>Steve Moraco</strong><br>
      Founder, Kull AI</p>
    </div>
    <div class="footer">
      <div class="footer-links">
        <a href="${baseUrl}/support">Support</a> •
        <a href="${baseUrl}/refunds">Refunds</a> •
        <a href="${baseUrl}/terms">Terms</a> •
        <a href="${baseUrl}/contact">Contact</a>
      </div>
      <p>Follow me on X: <a href="https://x.com/steveMoraco" style="color: #8B5CF6;">@steveMoraco</a></p>
      <p>© 2025 Lander Media | <a href="https://heydata.org" style="color: #8B5CF6;">Powered by heydata.org</a></p>
    </div>
  </div>
</body>
</html>
  `,
  text: `🤔 Still Deciding? Here's What Kull AI Does

Hi ${user.firstName},

😓 The Problem: 3-5 hours culling 1,000 photos manually

🚀 The Solution: Kull AI rates 1,000 photos in 10-15 minutes
• 5 different AI models
• Context-aware ratings
• Works with any folder on your Mac

Start free trial: ${baseUrl}

⏰ Special Offer: ${getOfferHoursRemaining(user)} hours left - 3 extra months free!

Steve Moraco
Founder, Kull AI
Follow me: https://x.com/steveMoraco`
});

export const drip2_6hrEmail = (user: User) => ({
  subject: "🔍 Which AI Model is Best for Your Photography? (Guide Inside)",
  html: `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <p>Hi ${user.firstName},</p>
      
      <p>One of the most common questions we get: <strong>"Which AI model should I use?"</strong></p>

      <p>Great news - you get access to ALL 5, and each excels at different photography styles!</p>

      <h2>🤖 Your AI Model Guide:</h2>

      <div class="stats-box">
        <strong>🔷 Gemini (Google)</strong><br>
        Best for: General photography, balanced ratings<br>
        Perfect when: You want consistent, reliable ratings across all photo types
      </div>

      <div class="stats-box">
        <strong>🟢 GPT-5 (OpenAI)</strong><br>
        Best for: Artistic & portrait photography<br>
        Perfect when: You need detailed composition and artistic merit analysis
      </div>

      <div class="stats-box">
        <strong>🟣 Claude (Anthropic)</strong><br>
        Best for: Fine art & creative work<br>
        Perfect when: Artistic vision and emotional impact matter most
      </div>

      <div class="stats-box">
        <strong>⚡ Grok (xAI)</strong><br>
        Best for: Event photography, large batches<br>
        Perfect when: Speed is critical - weddings, sports, events
      </div>

      <div class="stats-box">
        <strong>🔶 Kimi k2 (via Groq)</strong><br>
        Best for: Real-time rating, immediate feedback<br>
        Perfect when: You want instant ratings as you browse
      </div>

      <h3>💡 Pro Tips:</h3>
      <ul class="feature-list">
        <li>Start with Gemini for your first batch</li>
        <li>Try different models on the same photos - see which matches your taste</li>
        <li>Mix and match - use Grok for speed, GPT-5 for artistic selects</li>
        <li>All models use low-cost batch APIs when possible</li>
      </ul>

      <center>
        <a href="${baseUrl}" class="button">Try All 5 Models Free for 24 Hours →</a>
      </center>

      <div class="alert">
        <strong>⏰ Offer Countdown:</strong> ${getOfferHoursRemaining(user)} hours remaining to lock in 3 bonus months!
      </div>

      <p>Questions about AI models? <a href="${baseUrl}/support">Chat with us →</a></p>

      <p><strong>Steve Moraco</strong><br>
      Founder, Kull AI</p>
    </div>
    <div class="footer">
      <div class="footer-links">
        <a href="${baseUrl}/support">Support</a> •
        <a href="${baseUrl}/refunds">Refunds</a> •
        <a href="${baseUrl}/terms">Terms</a> •
        <a href="${baseUrl}/contact">Contact</a>
      </div>
      <p>Follow me on X: <a href="https://x.com/steveMoraco" style="color: #8B5CF6;">@steveMoraco</a></p>
      <p>© 2025 Lander Media | <a href="https://heydata.org" style="color: #8B5CF6;">Powered by heydata.org</a></p>
    </div>
  </div>
</body>
</html>
  `,
  text: `🔍 Which AI Model is Best? Here's Your Guide

Hi ${user.firstName},

🤖 You get ALL 5 AI models:

🔷 Gemini - General photography, balanced
🟢 GPT-5 - Artistic & portraits
🟣 Claude - Fine art & creative
⚡ Grok - Events, speed
🔶 Kimi k2 - Real-time rating

💡 Pro Tip: Start with Gemini, then try others!

Try free: ${baseUrl}

⏰ Offer: ${getOfferHoursRemaining(user)} hours left!

Steve Moraco
Founder, Kull AI
Follow me: https://x.com/steveMoraco`
});

export const drip3_11hrEmail = (user: User) => ({
  subject: "💰 Is Kull AI Worth It? Let's Do The Math Together",
  html: `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <p>Hi ${user.firstName},</p>
      
      <p>I get it - investing in new software is a big decision. Let's look at the real numbers...</p>

      <h2>⏰ Your Time is Valuable:</h2>

      <div class="stats-box">
        <strong>📊 Manual culling 4 shoots/month:</strong><br>
        4 shoots × 4 hours each = <strong>16 hours/month</strong><br>
        <br>
        <strong>With Kull AI:</strong><br>
        4 shoots × 1 hour each = <strong>4 hours/month</strong><br>
        <br>
        <strong>⏰ Time Saved:</strong> <span style="color: #10B981; font-weight: bold;">12 hours/month</span>
      </div>

      <h3>💎 What's 12 Hours Worth?</h3>
      <ul class="feature-list">
        <li>Book 2-3 additional client shoots ($1,000-$3,000+)</li>
        <li>Focus on editing and creative work</li>
        <li>Spend more time marketing your business</li>
        <li>Actually have free time!</li>
      </ul>

      <div class="stats-box">
        <strong>💳 Professional Plan: $99/month</strong><br>
        💰 ROI: If you book just 1 extra shoot/year, you're profitable<br>
        <br>
        <strong>💎 Studio Plan: $499/month</strong><br>
        💰 ROI: Perfect for high-volume photographers - pays for itself in one weekend
      </div>

      <h2>🎁 What You Get:</h2>
      <ul class="feature-list">
        <li>Unlimited photo rating (no per-photo fees!)</li>
        <li>All 5 AI models included</li>
        <li>24/7 AI-powered support</li>
        <li>Regular updates & new features</li>
        <li>7-day money-back guarantee</li>
      </ul>

      <center>
        <a href="${baseUrl}" class="button">Start Your Free Trial Now →</a>
      </center>

      <div class="alert">
        <strong>⏰ Special Offer:</strong> Only ${getOfferHoursRemaining(user)} hours left to get 3 bonus months free!
      </div>

      <p><strong>Still have questions?</strong> <a href="${baseUrl}/support">Chat with us</a> or check our <a href="${baseUrl}/refunds">refund policy</a></p>

      <p><strong>Steve Moraco</strong><br>
      Founder, Kull AI</p>
    </div>
    <div class="footer">
      <div class="footer-links">
        <a href="${baseUrl}/support">Support</a> •
        <a href="${baseUrl}/refunds">Refunds</a> •
        <a href="${baseUrl}/terms">Terms</a> •
        <a href="${baseUrl}/contact">Contact</a>
      </div>
      <p>Follow me on X: <a href="https://x.com/steveMoraco" style="color: #8B5CF6;">@steveMoraco</a></p>
      <p>© 2025 Lander Media | <a href="https://heydata.org" style="color: #8B5CF6;">Powered by heydata.org</a></p>
    </div>
  </div>
</body>
</html>
  `,
  text: `💰 Is Kull AI Worth It? The Math

Hi ${user.firstName},

📊 Manual culling: 16 hours/month
🚀 With Kull AI: 4 hours/month
⏰ Time Saved: 12 hours/month

💎 That's time for:
• 2-3 extra client shoots
• Better editing
• Marketing
• Life!

💳 Professional: $99/mo
💰 ROI: 1 extra shoot/year = profitable

Try free: ${baseUrl}

⏰ Special offer: ${getOfferHoursRemaining(user)} hours left!

Steve Moraco
Founder, Kull AI
Follow me: https://x.com/steveMoraco`
});

export const drip4_16hrEmail = (user: User) => ({
  subject: "🎓 Free Tutorial: Master Your Photo Workflow in 10 Minutes",
  html: `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <p>Hi ${user.firstName},</p>
      
      <p>Whether or not you try Kull AI, I wanted to share our <strong>free guide to optimizing your photo culling workflow</strong>.</p>

      <h2>📚 The Complete Photo Rating Guide:</h2>

      <h3>📥 Step 1: Import Smart</h3>
      <ul class="feature-list">
        <li>Create separate catalogs for different shoot types</li>
        <li>Use consistent folder naming (YYYYMMDD-ClientName)</li>
        <li>Add basic metadata on import (location, event, client)</li>
      </ul>

      <h3>🗑️ Step 2: First Pass (The "Delete Obviously Bad" Round)</h3>
      <ul class="feature-list">
        <li>Use keyboard shortcuts (P for pick, X for reject)</li>
        <li>Don't overthink - trust your gut</li>
        <li>Delete: Out of focus, wrong exposure, eyes closed</li>
        <li><strong>With Kull AI:</strong> This step happens automatically in minutes</li>
      </ul>

      <h3>⭐ Step 3: Star Rating (The "What's Worth Editing" Round)</h3>
      <ul class="feature-list">
        <li>1 star = Keep but probably won't deliver</li>
        <li>2 stars = Possible alternates</li>
        <li>3 stars = Good, will likely deliver</li>
        <li>4 stars = Great, definitely deliver</li>
        <li>5 stars = Portfolio-worthy, hero shots</li>
        <li><strong>With Kull AI:</strong> AI suggests ratings based on composition, lighting, emotion</li>
      </ul>

      <h3>✅ Step 4: Final Selection</h3>
      <ul class="feature-list">
        <li>Filter to 3+ stars only</li>
        <li>Create smart collection for deliverables</li>
        <li>Review sequence/story flow</li>
        <li>Export keepers</li>
      </ul>

      <div class="stats-box">
        <strong>💡 Pro Tip:</strong> AI isn't replacing your artistic judgment - it's eliminating the boring parts so you can focus on creative decisions!
      </div>

      <center>
        <a href="${baseUrl}" class="button">See AI Rating in Action (Free Trial) →</a>
      </center>

      <div class="alert">
        <strong>⏰ Your Bonus Expires Soon:</strong> ${getOfferHoursRemaining(user)} hours to claim 3 free months
      </div>

      <p>Questions about workflow? <a href="${baseUrl}/support">Ask our AI chat →</a></p>

      <p><strong>Steve Moraco</strong><br>
      Founder, Kull AI</p>
    </div>
    <div class="footer">
      <div class="footer-links">
        <a href="${baseUrl}/support">Support</a> •
        <a href="${baseUrl}/refunds">Refunds</a> •
        <a href="${baseUrl}/terms">Terms</a> •
        <a href="${baseUrl}/contact">Contact</a>
      </div>
      <p>Follow me on X: <a href="https://x.com/steveMoraco" style="color: #8B5CF6;">@steveMoraco</a></p>
      <p>© 2025 Lander Media | <a href="https://heydata.org" style="color: #8B5CF6;">Powered by heydata.org</a></p>
    </div>
  </div>
</body>
</html>
  `,
  text: `🎓 Free Tutorial: Master Photo Workflow

Hi ${user.firstName},

📚 Complete Photo Rating Guide:

📥 Step 1: Import Smart
• Consistent naming
• Basic metadata

🗑️ Step 2: Delete Obviously Bad
• Out of focus, wrong exposure, eyes closed
• With Kull AI: Automatic in minutes

⭐ Step 3: Star Rating
• 1-5 stars based on quality
• With Kull AI: AI suggests ratings

✅ Step 4: Final Selection
• Filter 3+ stars
• Export keepers

Try AI rating: ${baseUrl}

⏰ Bonus expires: ${getOfferHoursRemaining(user)} hours!

Steve Moraco
Founder, Kull AI
Follow me: https://x.com/steveMoraco`
});

export const drip5_21hrEmail = (user: User) => ({
  subject: `⚠️ Last Call: Your Special Offer Expires in ${getOfferHoursRemaining(user)} Hours`,
  html: `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <div class="alert">
      <strong>🚨 FINAL HOURS:</strong> Your special offer (3 free months on annual plans) expires in ${getOfferHoursRemaining(user)} hours
    </div>
    <div class="content">
      <p>Hi ${user.firstName},</p>
      
      <p>This is it - your last chance to lock in <strong>3 bonus months free</strong> on any annual plan.</p>

      <h2>💸 What You'll Miss If You Don't Act Now:</h2>

      <div class="stats-box">
        <strong>💳 Professional Plan:</strong><br>
        Regular: $1,188/year<br>
        <span style="color: #10B981; font-weight: bold;">With Bonus: $891 for 15 months</span><br>
        💰 Savings: <strong>$297</strong>
      </div>

      <div class="stats-box">
        <strong>💎 Studio Plan:</strong><br>
        Regular: $5,988/year<br>
        <span style="color: #10B981; font-weight: bold;">With Bonus: $4,491 for 15 months</span><br>
        💰 Savings: <strong>$1,497</strong>
      </div>

      <h3>🎁 Plus Your Free 24-Hour Trial:</h3>
      <ul class="feature-list">
        <li>Try everything before you pay anything</li>
        <li>All 5 AI models included</li>
        <li>Unlimited photo rating</li>
        <li>Cancel anytime with zero charge</li>
        <li>7-day money-back guarantee even after billing</li>
      </ul>

      <center>
        <a href="${baseUrl}" class="button">Claim Your 3 Free Months Now →</a>
      </center>

      <div class="alert">
        <strong>✅ 100% Risk-Free:</strong> 24-hour free trial + 7-day refund policy = 8 days to decide with zero risk
      </div>

      <p><strong>After this offer expires:</strong> Regular pricing returns (no bonus months available)</p>

      <p><strong>Questions?</strong> Get instant answers at <a href="${baseUrl}/support">${baseUrl}/support</a></p>

      <p>This is your moment. Don't let it pass!</p>
      <p><strong>Steve Moraco</strong><br>
      Founder, Kull AI</p>
    </div>
    <div class="footer">
      <div class="footer-links">
        <a href="${baseUrl}/support">Support</a> •
        <a href="${baseUrl}/refunds">Refunds</a> •
        <a href="${baseUrl}/terms">Terms</a> •
        <a href="${baseUrl}/contact">Contact</a>
      </div>
      <p>Follow me on X: <a href="https://x.com/steveMoraco" style="color: #8B5CF6;">@steveMoraco</a></p>
      <p>© 2025 Lander Media, 31 N Tejon St, Colorado Springs, CO 80903</p>
      <p><a href="https://heydata.org" style="color: #8B5CF6;">Powered by heydata.org</a></p>
    </div>
  </div>
</body>
</html>
  `,
  text: `⚠️ LAST CALL: Offer Expires in ${getOfferHoursRemaining(user)} Hours

Hi ${user.firstName},

🚨 Final chance for 3 FREE MONTHS on annual plans!

💳 Professional: Save $297
💎 Studio: Save $1,497

🎁 PLUS 24-hour free trial
✅ PLUS 7-day money-back guarantee

✅ 100% Risk-Free

Claim now: ${baseUrl}

After this expires: Regular pricing (no bonus)

Steve Moraco
Founder, Kull AI
Follow me: https://x.com/steveMoraco`
});

// REFERRAL INVITATION EMAIL
const referralInvitationEmail = (referrerName: string, referrerEmail: string, referredEmail: string) => ({
  subject: `🎁 ${referrerName} invited you to try Kull AI - Free 1-Day Trial!`,
  html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You've Been Invited! 🎉</h1>
    </div>
    <div class="content">
      <p style="font-size: 18px; font-weight: 600; color: #111827;">Hi there!</p>
      
      <p><strong>${referrerName}</strong> (${referrerEmail}) thinks you'd love Kull AI and invited you to try our AI-powered photo rating system for free!</p>

      <div class="alert alert-success">
        <p style="margin: 0; font-weight: 600;">🎁 Special Referral Offer for You</p>
        <p style="margin: 8px 0 0 0; font-size: 14px;">Get a FREE 1-day unlimited trial of Kull AI, plus if you become a paid customer, both you and ${referrerName} will receive exclusive bonus rewards!</p>
      </div>

      <h2>🚀 Why Kull AI?</h2>
      <p>Stop wasting hours manually rating thousands of photos in Lightroom. Our advanced AI models (Gemini, Grok, Kimi k2, Claude, GPT-5) automatically rate your photos with 1-5 stars in real-time.</p>

      <ul class="feature-list">
        <li>Rate thousands of photos in minutes, not hours</li>
        <li>5 cutting-edge AI models working together</li>
        <li>Works with any folder on your Mac</li>
        <li>Professional-grade accuracy</li>
        <li>1-day free trial - unlimited photos</li>
        <li>7-day money-back guarantee</li>
      </ul>

      <div style="text-align: center;">
        <a href="${baseUrl}" class="button" style="display: inline-block;">
          Start Your Free Trial Now
        </a>
      </div>

      <h3>🎁 Referral Rewards</h3>
      <p>When you sign up as a paid customer:</p>
      
      <div class="stats-box">
        <p style="margin: 0 0 12px 0; font-weight: 600; color: #111827;">✓ ${referrerName} unlocks exclusive bonuses</p>
        <p style="margin: 0 0 12px 0; font-weight: 600; color: #111827;">✓ You get the same amazing AI-powered photo rating</p>
        <p style="margin: 0; font-weight: 600; color: #111827;">✓ Both of you can refer more photographers for even bigger rewards!</p>
      </div>

      <h3>💎 Referral Bonus Tiers:</h3>
      <ul class="feature-list">
        <li><strong>1 referral</strong>: Bonus feature unlock</li>
        <li><strong>3 referrals</strong>: 1 month free</li>
        <li><strong>5 referrals</strong>: Priority support upgrade</li>
        <li><strong>10 referrals</strong>: 3 months free (save hundreds!)</li>
      </ul>

      <h3>📋 How It Works:</h3>
      <p>1. Click the button above to visit Kull AI<br>
      2. Sign up with this email (${referredEmail})<br>
      3. Start your 1-day free trial instantly<br>
      4. Download the app and watch the magic happen<br>
      5. If you love it, subscribe and we both win!</p>

      <div class="alert">
        <p style="margin: 0; font-weight: 600;">⏰ Limited Time Offer</p>
        <p style="margin: 8px 0 0 0; font-size: 14px;">New signups get 3 FREE MONTHS on annual plans - but this special offer won't last long!</p>
      </div>

      <p style="margin-top: 32px;">Best regards,<br>
      <strong>Steve Moraco</strong><br>
      Founder, Kull AI</p>
    </div>
    <div class="footer">
      <div class="footer-links">
        <a href="${baseUrl}/support">Support</a>
        <a href="${baseUrl}/refunds">Refunds</a>
        <a href="${baseUrl}/terms">Terms</a>
        <a href="${baseUrl}/contact">Contact</a>
      </div>
      <p>Follow me on X: <a href="https://x.com/steveMoraco" style="color: #8B5CF6;">@steveMoraco</a></p>
      <p>© 2025 Lander Media, 31 N Tejon St, Colorado Springs, CO 80903</p>
      <p><a href="https://heydata.org" style="color: #8B5CF6;">Powered by heydata.org</a></p>
    </div>
  </div>
</body>
</html>
  `,
  text: `🎁 You've Been Invited to Try Kull AI! 🎉

Hi there!

${referrerName} (${referrerEmail}) thinks you'd love Kull AI and invited you to try our AI-powered photo rating system for free!

🎁 SPECIAL REFERRAL OFFER:
- 🎁 FREE 1-day unlimited trial
- 💰 When you become a paid customer, both you and ${referrerName} receive exclusive bonus rewards!

🚀 WHY KULL AI?
Stop wasting hours manually rating thousands of photos in Lightroom. Our advanced AI models automatically rate your photos with 1-5 stars in real-time.

✨ FEATURES:
✓ Rate thousands of photos in minutes, not hours
✓ 5 cutting-edge AI models working together
✓ Works with any folder on your Mac
✓ Professional-grade accuracy
✓ 1-day free trial - unlimited photos
✓ 7-day money-back guarantee

🎁 REFERRAL REWARDS:
When you sign up as a paid customer, both you and ${referrerName} benefit:
💎 1 referral: Bonus feature unlock
💎 3 referrals: 1 month free
💎 5 referrals: Priority support upgrade
💎 10 referrals: 3 months free (save hundreds!)

📋 HOW IT WORKS:
1. Visit ${baseUrl}
2. Sign up with this email (${referredEmail})
3. Start your 1-day free trial instantly
4. Download the app and watch the magic happen
5. If you love it, subscribe and we both win!

⏰ LIMITED TIME: New signups get 3 FREE MONTHS on annual plans!

Start your free trial: ${baseUrl}

Best regards,
Steve Moraco
Founder, Kull AI
Follow me: https://x.com/steveMoraco`
});

export const emailTemplates = {
  // First login
  firstLoginWelcome: firstLoginWelcomeEmail,
  
  // Post-checkout
  welcome5min: welcome5minEmail,
  installCheck45min: installCheck45minEmail,
  
  // Trial ending
  trialEnding6hr: trialEnding6hrEmail,
  trialEnding1hr: trialEnding1hrEmail,
  
  // Non-checkout drip campaign
  drip1_2hr: drip1_2hrEmail,
  drip2_6hr: drip2_6hrEmail,
  drip3_11hr: drip3_11hrEmail,
  drip4_16hr: drip4_16hrEmail,
  drip5_21hr: drip5_21hrEmail,
  
  // Referral emails
  referralInvitation: referralInvitationEmail,
  referralConfirmation: referralConfirmationEmail,
};
