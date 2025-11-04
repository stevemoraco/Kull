export const emailTemplatesReport = {
  shootReport(subjectTitle: string, narrative: string, stats: { totalImages: number; heroCount: number; keeperCount: number }) {
    const subject = `Kull Report: ${subjectTitle}`;
    const html = `
      <h1>Kull Shoot Report</h1>
      <p><strong>Total:</strong> ${stats.totalImages} images</p>
      <p><strong>5★ Heroes:</strong> ${stats.heroCount} • <strong>4★ Keepers:</strong> ${stats.keeperCount}</p>
      <p>${narrative}</p>
    `;
    const text = `Kull Shoot Report\nTotal: ${stats.totalImages}\n5★: ${stats.heroCount} 4★: ${stats.keeperCount}\n\n${narrative}`;
    return { subject, html, text };
  }
};

