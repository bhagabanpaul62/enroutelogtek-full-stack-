import { emailLayoutWrapper } from './emailTemplatesForRegistration.js';

/**
 * HTML body of the login code email. Says plainly what to do if the person did not try to
 * log in, because the code only arrives after the right password was used.
 * @param {string} code six digits
 * @returns {string} HTML
 */
export function loginOtpEmailTemplate(code) {
    const content = `
    <h2 style="margin:0 0 8px 0; font-size:20px; font-weight:bold; color:#ffffff;">
      Your login code
    </h2>
    <p style="margin:0 0 28px 0; font-size:14px; color:#7a8099;">
      Enter this code to finish logging in. It is valid for 10 minutes.
      Logging in here signs your account out of any other device.
    </p>

    <table border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background-color:#111111; border:1px solid #1f1f1f;
             border-top:2px solid #fbbc0e; border-radius:8px; margin-bottom:28px;">
      <tr>
        <td align="center" style="padding:32px 0;">
          <span style="font-family:'Courier New',Courier,monospace;
                        color:#fbbc0e; font-size:40px; font-weight:bold;
                        letter-spacing:12px; display:block;">
            ${code}
          </span>
          <span style="display:block; margin-top:10px; font-size:12px;
                        color:#7a8099; letter-spacing:0.5px;">
            Login code — expires in 10 minutes
          </span>
        </td>
      </tr>
    </table>

    <table border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background-color:#111111; border:1px solid #1f1f1f;
             border-left:3px solid #fbbc0e; border-radius:4px;">
      <tr>
        <td style="padding:14px 18px; font-size:13px;
                    color:#7a8099; line-height:20px;">
          <strong style="color:#f0ede8;">Not you?</strong>
          Someone entered your password. Do not share this code.
          Reset your password from the login page straight away.
        </td>
      </tr>
    </table>
  `;
    return emailLayoutWrapper(content);
}
