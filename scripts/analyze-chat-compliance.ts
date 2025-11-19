// Analyze recent chat sessions to check Quick Replies compliance
import { db } from '../server/db';
import { chatSessions } from '../shared/schema';
import { desc } from 'drizzle-orm';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

async function analyzeChatCompliance() {
  console.log('🔍 Analyzing recent chat sessions for Quick Replies compliance...\n');

  // Get 10 most recent chat sessions
  const sessions = await db
    .select()
    .from(chatSessions)
    .orderBy(desc(chatSessions.updatedAt))
    .limit(10);

  console.log(`Found ${sessions.length} recent sessions\n`);
  console.log('═'.repeat(80));

  for (const session of sessions) {
    const messages: ChatMessage[] = JSON.parse(session.messages);
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    console.log(`\n📱 Session: ${session.id}`);
    console.log(`   Title: ${session.title}`);
    console.log(`   Messages: ${messages.length} total, ${assistantMessages.length} from assistant`);
    console.log(`   Script Step: ${session.scriptStep || 'unknown'}`);
    console.log(`   Updated: ${session.updatedAt}`);
    console.log('─'.repeat(80));

    // Analyze each assistant message
    assistantMessages.forEach((msg, idx) => {
      const hasQuickReplies = msg.content.includes('␞QUICK_REPLIES:') || msg.content.includes('QUICK_REPLIES:');
      const hasNextMessage = msg.content.includes('␞NEXT_MESSAGE:') || msg.content.includes('NEXT_MESSAGE:');

      // Extract Quick Replies if present
      const quickRepliesMatch = msg.content.match(/␞?QUICK_REPLIES:\s*([^\n␞]+)/);
      const nextMessageMatch = msg.content.match(/␞?NEXT_MESSAGE:\s*(\d+)/);

      console.log(`\n  [${idx + 1}] Assistant Message:`);
      console.log(`      Has QUICK_REPLIES: ${hasQuickReplies ? '✅' : '❌'}`);
      console.log(`      Has NEXT_MESSAGE: ${hasNextMessage ? '✅' : '❌'}`);

      if (quickRepliesMatch) {
        const replies = quickRepliesMatch[1].split('|').map(r => r.trim());
        console.log(`      Quick Replies (${replies.length}):`);
        replies.forEach(reply => {
          console.log(`        - "${reply}"`);
        });
      }

      if (nextMessageMatch) {
        console.log(`      Next Message In: ${nextMessageMatch[1]} seconds`);
      }

      // Show first 150 chars of message content
      const cleanContent = msg.content
        .replace(/␞QUICK_REPLIES:.*$/s, '')
        .replace(/␞NEXT_MESSAGE:.*$/s, '')
        .trim();
      console.log(`      Content: "${cleanContent.substring(0, 150)}${cleanContent.length > 150 ? '...' : ''}"`);

      // Check compliance issues
      const issues: string[] = [];

      if (!hasQuickReplies) {
        issues.push('Missing QUICK_REPLIES');
      }

      if (!hasNextMessage) {
        issues.push('Missing NEXT_MESSAGE');
      }

      if (quickRepliesMatch) {
        const replies = quickRepliesMatch[1].split('|').map(r => r.trim());
        if (replies.length < 2) {
          issues.push(`Too few quick replies (${replies.length}, should be 3-4)`);
        }
        if (replies.length > 4) {
          issues.push(`Too many quick replies (${replies.length}, should be 3-4)`);
        }
      }

      if (issues.length > 0) {
        console.log(`      ⚠️  Issues: ${issues.join(', ')}`);
      }
    });

    console.log('');
  }

  console.log('═'.repeat(80));
  console.log('\n✅ Analysis complete\n');
}

analyzeChatCompliance().catch(console.error);
