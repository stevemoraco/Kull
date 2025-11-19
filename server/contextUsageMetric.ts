// Context usage tracking - Helper function to measure if AI used previous answers

export function measureContextUsage(aiQuestion: string, conversationMemory: any[]): boolean {
  if (!conversationMemory || conversationMemory.length === 0) {
    return false; // No memory to reference
  }

  // Extract keywords from previous user responses (words >4 characters, exclude common words)
  const stopWords = new Set([
    'that', 'this', 'with', 'from', 'have', 'been', 'were',
    'what', 'when', 'where', 'which', 'your', 'their', 'about',
    'would', 'there', 'could', 'should', 'doing', 'going', 'thing'
  ]);

  const answerKeywords: string[] = [];

  conversationMemory.forEach((step: any) => {
    if (step.userResponse) {
      // Extract words with 5+ characters
      const words = step.userResponse.toLowerCase().match(/\b\w{5,}\b/g) || [];
      words.forEach((word: string) => {
        if (!stopWords.has(word) && !answerKeywords.includes(word)) {
          answerKeywords.push(word);
        }
      });
    }
  });

  // Check if AI question references any of these keywords
  const questionLower = aiQuestion.toLowerCase();
  const referenced = answerKeywords.some((keyword: string) => questionLower.includes(keyword));

  return referenced;
}

// Extract meaningful keywords from user responses for analysis
export function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'that', 'this', 'with', 'from', 'have', 'been', 'were',
    'what', 'when', 'where', 'which', 'your', 'their', 'about',
    'would', 'there', 'could', 'should', 'doing', 'going', 'thing'
  ]);

  const words = text.toLowerCase().match(/\b\w{5,}\b/g) || [];
  return words.filter((word: string) => !stopWords.has(word));
}
