// emailTemplates.js
const BRAND_NAME = 'EnrouteLogTech';
const BRAND_DOMAIN = 'enroutelogtek.in';
const SUPPORT_EMAIL = 'support@enroutelogtek.in';

/**
 * Premium Dark-Canvas Layout Wrapper
 */
function emailLayoutWrapper(content) {
  return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #000000; font-family: Arial, sans-serif; margin: 0; padding: 40px 0;">
      <tr>
        <td align="center">
          <!-- Main Content Container Card -->
          <table border="0" cellpadding="0" cellspacing="0" width="580" style="background-color: #131313; border: 1px solid #222222; border-radius: 12px; overflow: hidden; border-collapse: collapse;">
            
            <!-- Brand Header -->
            <tr>
              <td style="padding: 32px 32px 20px 32px; text-align: left;">
                <span style="color: #fbbc0e; font-size: 24px; font-weight: bold; letter-spacing: -0.5px;">
                  ${BRAND_NAME}
                </span>
              </td>
            </tr>

            <!-- Content Area -->
            <tr>
              <td style="padding: 20px 32px 40px 32px; color: #e5e2e1; font-size: 15px; line-height: 24px;">
                ${content}
              </td>
            </tr>

            <!-- Muted System Footer -->
            <tr>
              <td bgcolor="#111111" style="padding: 32px; border-top: 1px solid #222222; text-align: center; font-size: 12px; color: #525B7A; line-height: 20px;">
                <p style="margin: 0 0 6px 0; font-weight: bold; color: #e5e2e1; font-size: 13px;">${BRAND_NAME} — Logistics Made Simple</p>
                <p style="margin: 0 0 16px 0;">This is an automated operational transmission from ${BRAND_DOMAIN}.</p>
                <p style="margin: 0;">
                  Need assistance? Contact our team at <a href="mailto:${SUPPORT_EMAIL}" style="color: #ffd88a; text-decoration: none; font-weight: bold;">${SUPPORT_EMAIL}</a>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  `;
}

export function otpEmailTemplate(otp) {
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: bold; color: #ffffff;">Verify Your Email Address</h2>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #e5e2e1;">Please apply the high-visibility verification token shown below inside your session window:</p>
    
    <!-- Token Display Section -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #111111; border: 1px dashed #fbbc0e; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td align="center" style="padding: 24px; font-family: 'Courier New', Courier, monospace; color: #fbbc0e; font-size: 38px; font-weight: bold; letter-spacing: 10px; padding-left: 10px;">
          ${otp}
        </td>
      </tr>
    </table>
    
    <!-- Info Flag -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #111111; border-left: 3px solid #525B7A; border-radius: 4px;">
      <tr>
        <td style="padding: 14px; font-size: 14px; color: #525B7A; line-height: 20px;">
          <strong style="color: #e5e2e1;">Security Notice:</strong> This secure token remains live for exactly <strong>10 minutes</strong>. Do not expose or forward this passcode to any external parties.
        </td>
      </tr>
    </table>
  `;
  return emailLayoutWrapper(content);
}

export function welcomeEmailTemplate(name) {
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: bold; color: #ffffff;">Application Submitted</h2>
    <p style="margin: 0 0 12px 0; font-size: 15px; color: #ffffff;">Hello ${name},</p>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #e5e2e1;">Your commercial profile data package has been registered cleanly onto the ${BRAND_NAME} engine database.</p>
    
    <!-- Elevated Status Container -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #111111; border: 1px solid #222222; border-radius: 6px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px;">
          <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; color: #525B7A; margin-bottom: 4px;">Current Verification Status</span>
          <span style="font-size: 16px; font-weight: bold; color: #fbbc0e;">Pending Review</span>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 15px; color: #e5e2e1;">
      Our verification staff is analyzing your structural files. Expect background processing configurations to finalize within <strong>24 to 48 hours</strong>.
    </p>
  `;
  return emailLayoutWrapper(content);
}

export function approvalEmailTemplate(companyName) {
  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: bold; color: #ffffff;">Account Cleared & Approved</h2>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #fbbc0e; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">System Active</p>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #ffffff;">Operational Milestone Reached,</p>
    <p style="margin: 0 0 28px 0; font-size: 15px; color: #e5e2e1;">
      The corporate registration details designated for <strong>${companyName}</strong> have been evaluated and cleared. Your tracking pipeline is now live.
    </p>
    
    <!-- Beacon Button -->
    <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
      <tr>
        <td bgcolor="#fbbc0e" style="border-radius: 6px; padding: 14px 28px;" align="center">
          <a href="${process.env.FRONTEND_URL}/login" 
             style="color: #000000; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
            Access Corporate Console
          </a>
        </td>
      </tr>
    </table>
  `;
  return emailLayoutWrapper(content);
}

export function rejectionEmailTemplate(companyName, reason) {
  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: bold; color: #ffffff;">Application Verification Exception</h2>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #525B7A; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Action Required</p>

    <p style="margin: 0 0 20px 0; font-size: 15px; color: #e5e2e1;">
      Thank you for processing with ${BRAND_NAME}. Following an explicit documentation cross-check for <strong>${companyName}</strong>, your account access couldn't be automatically provisioned.
    </p>
    
    <!-- Deep Gray Error Container -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #111111; border: 1px solid #222222; border-left: 4px solid #fbbc0e; border-radius: 4px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 18px;">
          <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #525B7A; text-transform: uppercase; letter-spacing: 0.5px;">Exception Log Detail:</h4>
          <p style="margin: 0; font-size: 14px; color: #e5e2e1; line-height: 22px;">${reason}</p>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 15px; color: #525B7A;">
      To reset your verification validation pipeline, connect to your registration link, overwrite the configuration gaps outlined above, and submit your profile details for re-queueing.
    </p>
  `;
  return emailLayoutWrapper(content);
}
