// emailTemplates.js
const BRAND_NAME = 'EnrouteLogtek';
const BRAND_DOMAIN = 'enroutelogtek.in';
const SUPPORT_EMAIL = 'support@enroutelogtek.in';

// ─── Layout Wrapper ───────────────────────────────────────────────────────────
function emailLayoutWrapper(content) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#0a0a0a;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%"
    style="background-color:#0a0a0a; font-family:Arial,Helvetica,sans-serif; padding:48px 0;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="560"
          style="background-color:#0a0a0a; border:1px solid #1f1f1f;
                 border-radius:12px; overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:28px 36px 24px 36px;
                        border-bottom:1px solid #1f1f1f;">
              <span style="color:#fbbc0e; font-size:20px; font-weight:bold;
                            letter-spacing:-0.3px; display:block;">
                ${BRAND_NAME}
              </span>
              <span style="font-size:11px; text-transform:uppercase;
                            letter-spacing:2.5px; margin-top:6px; display:block;">
                <span style="color:#f0ede8;">SMARTER </span><span style="color:#fbbc0e;">LOGISTICS.</span>
                <span style="color:#f0ede8;"> STRONGER </span><span style="color:#fbbc0e;">FUTURE.</span>
              </span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:36px; color:#f0ede8;
                        font-size:15px; line-height:26px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 36px; border-top:1px solid #1f1f1f;
                        text-align:center;">
              <p style="margin:0 0 6px 0; font-size:12px;
                         font-weight:bold; color:#fbbc0e;">
                ${BRAND_NAME}
              </p>
              <p style="margin:0 0 6px 0; font-size:12px; color:#7a8099;">
                ${BRAND_DOMAIN}
              </p>
              <p style="margin:0; font-size:12px; color:#7a8099;">
                Support:
                <a href="mailto:${SUPPORT_EMAIL}"
                   style="color:#c49309; text-decoration:none;">
                  ${SUPPORT_EMAIL}
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ─── OTP Email ────────────────────────────────────────────────────────────────
export function otpEmailTemplate(otp) {
    const content = `
    <h2 style="margin:0 0 8px 0; font-size:20px; font-weight:bold; color:#ffffff;">
      Email Verification
    </h2>
    <p style="margin:0 0 28px 0; font-size:14px; color:#7a8099;">
      Use the verification code below to confirm your email address.
      This code is valid for 10 minutes.
    </p>

    <!-- OTP Block -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background-color:#111111; border:1px solid #1f1f1f;
             border-top:2px solid #fbbc0e; border-radius:8px; margin-bottom:28px;">
      <tr>
        <td align="center" style="padding:32px 0;">
          <span style="font-family:'Courier New',Courier,monospace;
                        color:#fbbc0e; font-size:40px; font-weight:bold;
                        letter-spacing:12px; display:block;">
            ${otp}
          </span>
          <span style="display:block; margin-top:10px; font-size:12px;
                        color:#7a8099; letter-spacing:0.5px;">
            One-time password — expires in 10 minutes
          </span>
        </td>
      </tr>
    </table>

    <!-- Security Note -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background-color:#111111; border:1px solid #1f1f1f;
             border-left:3px solid #fbbc0e; border-radius:4px;">
      <tr>
        <td style="padding:14px 18px; font-size:13px;
                    color:#7a8099; line-height:20px;">
          <strong style="color:#f0ede8;">Security Notice:</strong>
          Never share this code with anyone.
          ${BRAND_NAME} will never request your OTP via phone or chat.
          If you did not request this, please disregard this message.
        </td>
      </tr>
    </table>
  `;
    return emailLayoutWrapper(content);
}

// ─── Welcome Email ───────────────────────────────────────────────────────────
export function welcomeEmailTemplate(name, companyName) {
    const content = `
    <h2 style="margin:0 0 8px 0; font-size:20px; font-weight:bold; color:#ffffff;">
      Application Submitted Successfully
    </h2>
    <p style="margin:0 0 28px 0; font-size:14px; color:#7a8099;">
      Thank you for completing your registration on ${BRAND_NAME}.
    </p>

    <p style="margin:0 0 24px 0; font-size:15px; color:#f0ede8; line-height:26px;">
      Dear <strong style="color:#fbbc0e;">${name}</strong>,
      <br><br>
      Your company <strong style="color:#ffffff;">${companyName}</strong> has been
      successfully registered on ${BRAND_NAME}. All your documents and company
      details have been received and are now under review by our verification team.
    </p>

    <!-- Status Block -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background-color:#111111; border:1px solid #1f1f1f;
             border-radius:8px; margin-bottom:28px;">
      <tr>
        <td style="padding:20px 24px;">
          <span style="display:block; font-size:11px; font-weight:bold;
                        text-transform:uppercase; letter-spacing:1.5px;
                        color:#7a8099; margin-bottom:6px;">
            Current Status
          </span>
          <span style="font-size:16px; font-weight:bold; color:#fbbc0e;">
            Pending Verification
          </span>
          <span style="display:block; margin-top:6px; font-size:13px; color:#7a8099;">
            Estimated review time: 24 to 48 business hours
          </span>
        </td>
      </tr>
    </table>

    <!-- What to expect -->
    <p style="margin:0 0 14px 0; font-size:12px; font-weight:bold;
               color:#7a8099; text-transform:uppercase; letter-spacing:1.5px;">
      What Happens Next
    </p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%"
      style="border:1px solid #1f1f1f; border-radius:8px; overflow:hidden;
             margin-bottom:0;">
      <tr>
        <td style="padding:14px 20px; font-size:14px; color:#f0ede8;
                    border-bottom:1px solid #1f1f1f;">
          Our team reviews your submitted documents and company information.
        </td>
      </tr>
      <tr>
        <td style="padding:14px 20px; font-size:14px; color:#f0ede8;
                    border-bottom:1px solid #1f1f1f;">
          You will receive an approval or feedback email within 24 to 48 hours.
        </td>
      </tr>
      <tr>
        <td style="padding:14px 20px; font-size:14px; color:#f0ede8;">
          Once approved, you can log in and start using the platform.
        </td>
      </tr>
    </table>
  `;
    return emailLayoutWrapper(content);
}

// ─── Approval Email ───────────────────────────────────────────────────────────
export function approvalEmailTemplate(companyName) {
    const content = `
    <h2 style="margin:0 0 8px 0; font-size:20px; font-weight:bold; color:#ffffff;">
      Account Approved
    </h2>
    <p style="margin:0 0 28px 0; font-size:14px; color:#7a8099;">
      Your company has been verified and approved on ${BRAND_NAME}.
    </p>

    <p style="margin:0 0 24px 0; font-size:15px; color:#f0ede8; line-height:26px;">
      We are pleased to inform you that
      <strong style="color:#ffffff;">${companyName}</strong> has successfully
      completed the verification process and is now an active member of the
      ${BRAND_NAME} network.
    </p>

    <!-- Status Block -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background-color:#111111; border:1px solid #1f1f1f;
             border-top:2px solid #fbbc0e; border-radius:8px; margin-bottom:28px;">
      <tr>
        <td style="padding:20px 24px;">
          <span style="display:block; font-size:11px; font-weight:bold;
                        text-transform:uppercase; letter-spacing:1.5px;
                        color:#7a8099; margin-bottom:6px;">
            Account Status
          </span>
          <span style="font-size:16px; font-weight:bold; color:#fbbc0e;">
            Active and Verified
          </span>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table border="0" cellpadding="0" cellspacing="0">
      <tr>
        <td bgcolor="#fbbc0e"
          style="border-radius:6px; padding:0;">
          <a href="https://${BRAND_DOMAIN}/login"
             style="display:inline-block; padding:13px 28px; color:#000000;
                    text-decoration:none; font-weight:bold; font-size:14px;">
            Login to Your Account
          </a>
        </td>
      </tr>
    </table>
  `;
    return emailLayoutWrapper(content);
}

// ─── Rejection Email ──────────────────────────────────────────────────────────
export function rejectionEmailTemplate(companyName, reason) {
    const content = `
    <h2 style="margin:0 0 8px 0; font-size:20px; font-weight:bold; color:#ffffff;">
      Application Status Update
    </h2>
    <p style="margin:0 0 28px 0; font-size:14px; color:#7a8099;">
      We have completed the review of your registration.
    </p>

    <p style="margin:0 0 24px 0; font-size:15px; color:#f0ede8; line-height:26px;">
      After a thorough review of the submitted documents and company information
      for <strong style="color:#ffffff;">${companyName}</strong>, we are unable
      to approve the account at this time.
    </p>

    <!-- Reason Block -->
    <p style="margin:0 0 10px 0; font-size:12px; font-weight:bold;
               color:#7a8099; text-transform:uppercase; letter-spacing:1.5px;">
      Reason
    </p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background-color:#111111; border:1px solid #1f1f1f;
             border-left:3px solid #fbbc0e; border-radius:6px; margin-bottom:28px;">
      <tr>
        <td style="padding:18px 20px; font-size:14px;
                    color:#f0ede8; line-height:24px;">
          ${reason}
        </td>
      </tr>
    </table>

    <p style="margin:0; font-size:13px; color:#7a8099; line-height:22px;">
      If you believe this decision was made in error or need assistance,
      please contact our support team at
      <a href="mailto:${SUPPORT_EMAIL}"
         style="color:#c49309; text-decoration:none;">${SUPPORT_EMAIL}</a>.
    </p>
  `;
    return emailLayoutWrapper(content);
}
