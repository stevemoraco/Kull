import type { ShootReport } from "./services/reportBuilder";

const heroTable = (report: ShootReport) => {
  if (!report.heroes.length) {
    return `<p>No 4★+ selects in this run yet. Adjust your prompt or rerun with a creative profile when ready.</p>`;
  }

  const rows = report.heroes
    .map((hero, index) => {
      const rank = index + 1;
      const preview = hero.previewUrl
        ? `<img src="${hero.previewUrl}" alt="${hero.title || hero.filename || hero.imageId || "Hero"}" width="120" height="120" style="border-radius:8px;object-fit:cover;" />`
        : "";
      const title = hero.title ?? hero.filename ?? hero.imageId ?? `Hero ${rank}`;
      const tags = hero.tags?.length ? hero.tags.join(", ") : "";
      const description = hero.description ?? "";

      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #ececec;">${rank}</td>
          <td style="padding:12px;border-bottom:1px solid #ececec;">${preview}</td>
          <td style="padding:12px;border-bottom:1px solid #ececec;">
            <strong>${title}</strong><br />
            <span style="color:#555;">${description}</span><br />
            <small>${tags}</small>
          </td>
          <td style="padding:12px;border-bottom:1px solid #ececec;text-align:center;">${hero.starRating}★</td>
        </tr>
      `;
    })
    .join("");

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:16px;border-collapse:collapse;">
      <thead>
        <tr style="text-align:left;background:#f7f7f7;">
          <th style="padding:12px;">#</th>
          <th style="padding:12px;">Preview</th>
          <th style="padding:12px;">Details</th>
          <th style="padding:12px;text-align:center;">Rating</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

export const emailTemplatesReport = {
  shootReport(report: ShootReport) {
    const subject = `Kull Report: ${report.shootName}`;
    const html = `
      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.5;color:#0f172a;">
        <h1 style="margin-bottom:8px;">${report.shootName}</h1>
        <p style="margin:0 0 4px 0;"><strong>Total:</strong> ${report.stats.totalImages} images</p>
        <p style="margin:0 0 16px 0;">
          <strong>5★ Heroes:</strong> ${report.stats.heroCount} •
          <strong>4★ Keepers:</strong> ${report.stats.keeperCount} •
          <strong>Avg Rating:</strong> ${report.stats.averageRating}
        </p>
        <p style="margin:0 0 12px 0;">${report.narrative}</p>
        ${heroTable(report)}
      </div>
    `;
    const textLines = [
      `Kull Shoot Report — ${report.shootName}`,
      `Total images: ${report.stats.totalImages}`,
      `5★ Heroes: ${report.stats.heroCount}`,
      `4★ Keepers: ${report.stats.keeperCount}`,
      `Average rating: ${report.stats.averageRating}`,
      "",
      report.narrative,
      "",
      ...report.heroes.map(
        (hero, index) =>
          `${index + 1}. ${hero.title ?? hero.filename ?? hero.imageId ?? "Hero"} — ${hero.starRating}★`,
      ),
    ];

    return {
      subject,
      html,
      text: textLines.join("\n"),
    };
  },
};
