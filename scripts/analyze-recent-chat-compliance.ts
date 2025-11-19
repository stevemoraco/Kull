// Analyze ONLY recent chat sessions (last 1-2 hours) for script adherence
import { db } from '../server/db';
import { chatSessions, conversationSteps } from '../shared/schema';
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
    .select()
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
  };

  for (const session of sessions) {
    const messages: ChatMessage[] = JSON.parse(session.messages);
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const userMessages = messages.filter(m => m.role === 'user');

    console.log(`\n📱 Session: ${session.id}`);
    console.log(`   Updated: ${session.updatedAt}`);
    console.log(`   Script Step: ${session.scriptStep || 'unknown'}`);
    console.log(`   Messages: ${messages.length} total (${assistantMessages.length} AI, ${userMessages.length} user)`);
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
      if (content.includes('hover') || content.includes('click') || content.includes('scroll')) {
        issues.respondedToActivity++;

        // Check if it worked activity into script (mentions script questions)
        const scriptKeywords = ['shoots', 'goal', 'hours', 'workflow', 'committed', 'pricing', 'fix'];
        if (scriptKeywords.some(kw => content.includes(kw))) {
          issues.workedActivityIntoScript++;
        }
      }

      // Extract questions (lines ending with ?)
      const questionMatches = msg.content.match(/[^.!?]+\?/g);
      if (questionMatches) {
        questionMatches.forEach(q => {
          const normalized = q.toLowerCase().trim();

          // Check if this question was already asked
          const isDuplicate = questionsAsked.some(prev => {
            const similarity = getSimilarity(prev, normalized);
            return similarity > 0.7;
          });

          if (isDuplicate) {
            issues.repeatedQuestions++;
            console.log(`   ⚠️  Repeated question: "${q.substring(0, 80)}..."`);
          }

          questionsAsked.push(normalized);
        });
      }

      // Check if AI references previous user answers
      if (idx > 0 && userMessages.length > 0) {
        const previousUserAnswers = userMessages.slice(0, idx).map(m => m.content.toLowerCase());

        // Check if current AI message references any previous answer
        const referencesAnswer = previousUserAnswers.some(answer => {
          const keywords = answer.split(' ').filter(w => w.length > 4);
          return keywords.some(kw => content.includes(kw));
        });

        if (referencesAnswer) {
          issues.usedPreviousAnswers++;
        } else if (content.includes('?')) {
          // Asked a question without using context
          issues.askedWithoutContext++;
        }
      }
    });

    // Show sample messages
    if (assistantMessages.length > 0) {
      console.log(`\n   Recent AI messages:`);
      assistantMessages.slice(-3).forEach((msg, idx) => {
        const preview = msg.content.substring(0, 120).replace(/\n/g, ' ');
        console.log(`   [${idx + 1}] "${preview}${msg.content.length > 120 ? '...' : ''}"`);
      });
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 ANALYSIS SUMMARY\n');

  console.log('**Script Progression:**');
  console.log(`  - Stuck at Step 1: ${issues.stuckAtStep1} sessions`);
  console.log(`  - Reached Step 2: ${issues.reachedStep2} sessions`);
  console.log(`  - Reached Step 3+: ${issues.reachedStep3Plus} sessions`);

  console.log('\n**Activity Responsiveness:**');
  console.log(`  - Responded to activity: ${issues.respondedToActivity} times`);
  console.log(`  - Worked activity into script: ${issues.workedActivityIntoScript} times`);
  console.log(`  - Success rate: ${issues.respondedToActivity > 0 ? Math.round(issues.workedActivityIntoScript / issues.respondedToActivity * 100) : 0}%`);

  console.log('\n**Memory & Context:**');
  console.log(`  - Used previous answers: ${issues.usedPreviousAnswers} times`);
  console.log(`  - Asked without context: ${issues.askedWithoutContext} times`);
  console.log(`  - Context usage rate: ${issues.usedPreviousAnswers + issues.askedWithoutContext > 0 ? Math.round(issues.usedPreviousAnswers / (issues.usedPreviousAnswers + issues.askedWithoutContext) * 100) : 0}%`);

  console.log('\n**Question Quality:**');
  console.log(`  - Repeated questions: ${issues.repeatedQuestions} times`);

  console.log('\n' + '═'.repeat(80));
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
