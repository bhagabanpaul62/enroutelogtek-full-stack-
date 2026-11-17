/** The mail body for one notification. Built when the worker sends, so a retry uses the current text. */
const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const emailHtml = (title, message, link) => `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#15171c">
  <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#7a5200;margin:0 0 8px">EnrouteLogTech</p>
  <h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(title)}</h2>
  <p style="font-size:14px;line-height:1.5;margin:0 0 16px">${escapeHtml(message)}</p>
  ${link ? `<a href="${escapeHtml(link)}" style="display:inline-block;background:#fbbc0e;color:#1a1a1a;text-decoration:none;font-weight:600;padding:10px 16px;border-radius:4px">Open in Enroute</a>` : ''}
</div>`;

export const buildEmail = ({ title, message, data }) => {
    const link = data?.link ? `${process.env.FRONTEND_URL ?? ''}${data.link}` : null;
    return {
        subject: `Enroute: ${title}`,
        html: emailHtml(title, message, link),
        text: `${title}\n\n${message}${link ? `\n\n${link}` : ''}`,
    };
};

