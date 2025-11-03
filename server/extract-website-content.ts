import fs from 'fs';
import path from 'path';

// Extract text content from React component files
function extractTextFromComponent(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const texts: string[] = [];

  // Extract text from JSX strings (between quotes or backticks in JSX)
  const stringPatterns = [
    // Regular strings in JSX
    /(?:>|=\{["'])\s*([^<>"'{}]+?)\s*(?:<|["'])/g,
    // data-testid and other props
    /data-testid=["']([^"']+)["']/g,
    // Plain text content
    />\s*([^<>{}\n]+?)\s*</g,
    // Placeholder text
    /placeholder=["']([^"']+)["']/g,
    // aria-label
    /aria-label=["']([^"']+)["']/g,
  ];

  for (const pattern of stringPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const text = match[1]?.trim();
      if (text && text.length > 2 && !text.startsWith('w-') && !text.startsWith('h-') && !text.includes('className')) {
        texts.push(text);
      }
    }
  }

  return texts;
}

// Main extraction function
async function extractWebsiteContent() {
  const pagesDir = path.join(process.cwd(), 'client/src/pages');
  const componentsDir = path.join(process.cwd(), 'client/src/components');

  let markdown = '# Kull AI Website Content\n\n';
  markdown += 'This content is auto-generated from the actual website codebase.\n\n';

  // Extract from key pages
  const pages = [
    { file: 'Landing.tsx', title: 'Home Page (/)' },
    { file: 'Dashboard.tsx', title: 'Dashboard (/dashboard)' },
    { file: 'Checkout.tsx', title: 'Checkout (/checkout)' },
    { file: 'Home.tsx', title: 'User Home (/home after login)' },
    { file: 'Refunds.tsx', title: 'Refunds (/refund)' },
  ];

  for (const page of pages) {
    const filePath = path.join(pagesDir, page.file);
    if (fs.existsSync(filePath)) {
      markdown += `## ${page.title}\n\n`;
      const texts = extractTextFromComponent(filePath);
      const uniqueTexts = Array.from(new Set(texts));
      markdown += uniqueTexts.join('\n') + '\n\n';
    }
  }

  // Extract from key components
  const components = [
    'Hero.tsx',
    'PricingSection.tsx',
    'ProblemSection.tsx',
    'SolutionSection.tsx',
    'ValueStack.tsx',
    'FAQSection.tsx',
    'ReferralSection.tsx',
  ];

  markdown += '## Key Components\n\n';
  for (const component of components) {
    const filePath = path.join(componentsDir, component);
    if (fs.existsSync(filePath)) {
      markdown += `### ${component.replace('.tsx', '')}\n`;
      const texts = extractTextFromComponent(filePath);
      const uniqueTexts = Array.from(new Set(texts));
      markdown += uniqueTexts.slice(0, 20).join('\n') + '\n\n'; // Limit to avoid duplication
    }
  }

  // Write to generated file
  const outputPath = path.join(process.cwd(), 'server/generated-website-content.md');
  fs.writeFileSync(outputPath, markdown, 'utf-8');

  console.log(`✓ Website content extracted to ${outputPath}`);
  console.log(`  Total length: ${markdown.length} characters`);
}

export { extractWebsiteContent };

// Run if called directly
extractWebsiteContent().catch(console.error);
