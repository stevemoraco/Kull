// Analyze ONLY recent chat sessions (last 1-2 hours) using CURRENT schema
import { db } from '../server/db';
import { chatSessions } from '../shared/schema';
import { desc, gte } from 'drizzle-orm';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

async function analyzeRecentChats() {
  console.log('🔍 Analyzing chat sessions from last 2 hours...\n');

  // Get sessions updated in last 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const sessions = await db
    .select({
      id: chatSessions.id,
      messages: chatSessions.messages,
      scriptStep: chatSessions.scriptStep,
      updatedAt: chatSessions.updatedAt,
      title: chatSessions.title,
      lastQuickReplies: chatSessions.lastQuickReplies,
      lastNextMessageSeconds: chatSessions.lastNextMessageSeconds,
    })
    .from(chatSessions)
    .where(gte(chatSessions.updatedAt, twoHoursAgo))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(20);

  console.log(`Found ${sessions.length} sessions from last 2 hours\n`);
  console.log('═'.repeat(80));

  const issues: Record<string, number> = {
    stuckAtStep1: 0,
    reachedStep2: 0,
    reachedStep3Plus: 0,
    repeatedQuestions: 0,
    respondedToActivity: 0,
    workedActivityIntoScript: 0,
    usedPreviousAnswers: 0,
    askedWithoutContext: 0,
    totalQuestions: 0,
    sessionsWithQuickReplies: 0,
    sessionsWithTimingValue: 0,
  };

  const examples = {
    goodActivityIntegration: [] as string[],
    badRepeats: [] as string[],
    goodContextUse: [] as string[],
    missingContext: [] as string[],
  };

  for (const session of sessions) {
    const messages: ChatMessage[] = JSON.parse(session.messages);
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const userMessages = messages.filter(m => m.role === 'user');

    console.log(`\n📱 Session: ${session.id.substring(0, 20)}...`);
    console.log(`   Updated: ${new Date(session.updatedAt).toLocaleTimeString()}`);
    console.log(`   Script Step: ${session.scriptStep || 1}`);
    console.log(`   Messages: ${messages.length} total (${assistantMessages.length} AI, ${userMessages.length} user)`);

    // Check Quick Replies persistence
    if (session.lastQuickReplies && session.lastQuickReplies.length > 0) {
      issues.sessionsWithQuickReplies++;
      console.log(`   Quick Replies: ${session.lastQuickReplies.length} options`);
    }
    if (session.lastNextMessageSeconds !== null && session.lastNextMessageSeconds !== undefined) {
      issues.sessionsWithTimingValue++;
      console.log(`   Timing: ${session.lastNextMessageSeconds} seconds`);
    }
    console.log('─'.repeat(80));

    // Check script progression
    const step = session.scriptStep || 1;
    if (step === 1) {
      issues.stuckAtStep1++;
    } else if (step === 2) {
      issues.reachedStep2++;
    } else if (step >= 3) {
      issues.reachedStep3Plus++;
    }

    // Analyze assistant messages
    const questionsAsked: string[] = [];

    assistantMessages.forEach((msg, idx) => {
      const content = msg.content.toLowerCase();

      // Check for activity responsiveness
      const mentionsActivity = content.includes('hover') || content.includes('click') || content.includes('scroll') || content.includes('checking') || content.includes('looking at');

      if (mentionsActivity) {
        issues.respondedToActivity++;

        // Check if it worked activity into script (mentions script questions)
        const scriptKeywords = ['shoots', 'goal', 'hours', 'workflow', 'committed', 'pricing', 'fix', 'grow', 'working'];
        const hasScriptKeywords = scriptKeywords.some(kw => content.includes(kw));

        if (hasScriptKeywords) {
          issues.workedActivityIntoScript++;
          if (examples.goodActivityIntegration.length < 3) {
            examples.goodActivityIntegration.push(msg.content.substring(0, 150));
          }
        }
      }

      // Extract questions (lines ending with ?)
      const questionMatches = msg.content.match(/[^.!?]+\?/g);
      if (questionMatches) {
        questionMatches.forEach(q => {
          issues.totalQuestions++;
          const normalized = q.toLowerCase().trim();

          // Check if this question was already asked
          const isDuplicate = questionsAsked.some(prev => {
            const similarity = getSimilarity(prev, normalized);
            return similarity > 0.7;
          });

          if (isDuplicate) {
            issues.repeatedQuestions++;
            if (examples.badRepeats.length < 3) {
              examples.badRepeats.push(q.trim());
            }
          }

          questionsAsked.push(normalized);
        });
      }

      // Check if AI references previous user answers
      if (idx > 0 && userMessages.length > 0) {
        const previousUserAnswers = userMessages.slice(0, Math.min(idx, userMessages.length)).map(m => m.content.toLowerCase());

        // Check if current AI message references any previous answer
        const referencesAnswer = previousUserAnswers.some(answer => {
          // Extract meaningful keywords (4+ chars)
          const keywords = answer.split(/\s+/).filter(w => w.length >= 4 && !['that', 'this', 'with', 'have', 'from', 'they', 'been', 'more'].includes(w));
          return keywords.some(kw => content.includes(kw));
        });

        if (referencesAnswer && content.includes('?')) {
          issues.usedPreviousAnswers++;
          if (examples.goodContextUse.length < 3) {
            examples.goodContextUse.push(msg.content.substring(0, 150));
          }
        } else if (content.includes('?')) {
          // Asked a question without using context
          issues.askedWithoutContext++;
          if (examples.missingContext.length < 3) {
            examples.missingContext.push(msg.content.substring(0, 150));
          }
        }
      }
    });

    // Show sample messages
    if (assistantMessages.length > 0) {
      console.log(`   Last 2 AI messages:`);
      assistantMessages.slice(-2).forEach((msg, idx) => {
        const preview = msg.content.substring(0, 100).replace(/\n/g, ' ');
        console.log(`   [${idx + 1}] "${preview}${msg.content.length > 100 ? '...' : ''}"`);
      });
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 ANALYSIS SUMMARY (Last 2 Hours)\n');

  console.log('**Script Progression:**');
  console.log(`  - Stuck at Step 1: ${issues.stuckAtStep1} sessions (${Math.round(issues.stuckAtStep1 / sessions.length * 100)}%)`);
  console.log(`  - Reached Step 2: ${issues.reachedStep2} sessions (${Math.round(issues.reachedStep2 / sessions.length * 100)}%)`);
  console.log(`  - Reached Step 3+: ${issues.reachedStep3Plus} sessions (${Math.round(issues.reachedStep3Plus / sessions.length * 100)}%)`);

  console.log('\n**Activity Responsiveness:**');
  console.log(`  - Responded to activity: ${issues.respondedToActivity} times`);
  console.log(`  - Worked activity into script: ${issues.workedActivityIntoScript} times`);
  console.log(`  - Success rate: ${issues.respondedToActivity > 0 ? Math.round(issues.workedActivityIntoScript / issues.respondedToActivity * 100) : 0}%`);

  if (examples.goodActivityIntegration.length > 0) {
    console.log(`\n  ✅ Good examples:`);
    examples.goodActivityIntegration.forEach((ex, i) => {
      console.log(`     ${i + 1}. "${ex}..."`);
    });
  }

  console.log('\n**Memory & Context:**');
  console.log(`  - Total questions asked: ${issues.totalQuestions}`);
  console.log(`  - Used previous answers: ${issues.usedPreviousAnswers} times`);
  console.log(`  - Asked without context: ${issues.askedWithoutContext} times`);
  console.log(`  - Context usage rate: ${issues.totalQuestions > 0 ? Math.round(issues.usedPreviousAnswers / issues.totalQuestions * 100) : 0}%`);

  if (examples.goodContextUse.length > 0) {
    console.log(`\n  ✅ Good context use:`);
    examples.goodContextUse.forEach((ex, i) => {
      console.log(`     ${i + 1}. "${ex}..."`);
    });
  }

  if (examples.missingContext.length > 0) {
    console.log(`\n  ⚠️  Missing context:`);
    examples.missingContext.forEach((ex, i) => {
      console.log(`     ${i + 1}. "${ex}..."`);
    });
  }

  console.log('\n**Question Quality:**');
  console.log(`  - Repeated questions: ${issues.repeatedQuestions} times (${Math.round(issues.repeatedQuestions / issues.totalQuestions * 100)}% of all questions)`);

  if (examples.badRepeats.length > 0) {
    console.log(`\n  ⚠️  Examples of repeats:`);
    examples.badRepeats.forEach((ex, i) => {
      console.log(`     ${i + 1}. "${ex}"`);
    });
  }

  console.log('\n**Quick Replies Persistence:**');
  console.log(`  - Sessions with Quick Replies: ${issues.sessionsWithQuickReplies} of ${sessions.length} (${Math.round(issues.sessionsWithQuickReplies / sessions.length * 100)}%)`);
  console.log(`  - Sessions with timing value: ${issues.sessionsWithTimingValue} of ${sessions.length} (${Math.round(issues.sessionsWithTimingValue / sessions.length * 100)}%)`);

  console.log('\n' + '═'.repeat(80));
  console.log('\n🎯 KEY INSIGHTS:\n');

  if (issues.reachedStep3Plus === 0) {
    console.log('  🚨 CRITICAL: No sessions reaching step 3+ - progression is blocked');
  }

  if (issues.repeatedQuestions / issues.totalQuestions > 0.2) {
    console.log('  ⚠️  HIGH: >20% of questions are repeats - memory issue');
  }

  if (issues.usedPreviousAnswers / issues.totalQuestions < 0.3) {
    console.log('  ⚠️  LOW: <30% context usage - not referencing previous answers');
  }

  if (issues.workedActivityIntoScript / Math.max(issues.respondedToActivity, 1) > 0.7) {
    console.log('  ✅ GOOD: 70%+ of activity responses integrated into script');
  }

  if (issues.sessionsWithQuickReplies === sessions.length) {
    console.log('  ✅ GOOD: 100% of sessions have Quick Replies persisted');
  } else if (issues.sessionsWithQuickReplies > 0) {
    console.log(`  ⚠️  PARTIAL: Only ${Math.round(issues.sessionsWithQuickReplies / sessions.length * 100)}% of sessions have Quick Replies persisted`);
  } else {
    console.log('  🚨 CRITICAL: No sessions have Quick Replies persisted - persistence not working');
  }

  console.log('\n✅ Analysis complete\n');
}

// Simple string similarity (Dice coefficient)
function getSimilarity(str1: string, str2: string): number {
  const pairs1 = getBigrams(str1);
  const pairs2 = getBigrams(str2);

  const union = pairs1.length + pairs2.length;
  if (union === 0) return 0;

  let intersection = 0;
  for (const pair of pairs1) {
    const idx = pairs2.indexOf(pair);
    if (idx !== -1) {
      intersection++;
      pairs2.splice(idx, 1);
    }
  }

  return (2.0 * intersection) / union;
}

function getBigrams(str: string): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.push(str.substring(i, i + 2));
  }
  return bigrams;
}

analyzeRecentChats().catch(console.error);
