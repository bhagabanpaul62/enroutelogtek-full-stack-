
export function otpEmailTemplate(otp) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1a56db; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">EnrouteLogTech</h1>
      </div>
      
      <div style="padding: 30px; background-color: #f9fafb;">
        <h2>Your Verification Code</h2>
        <p>Use this OTP to verify your email address:</p>
        
        <div style="background-color: #1a56db; color: white; 
                    font-size: 32px; font-weight: bold; 
                    text-align: center; padding: 20px; 
                    border-radius: 8px; letter-spacing: 8px;">
          ${otp}
        </div>
        
        <p style="color: #6b7280; margin-top: 20px;">
          This OTP expires in <strong>10 minutes</strong>.
          Do not share this with anyone.
        </p>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #9ca3af;">
        <p>EnrouteLogTech - Logistics Made Simple</p>
      </div>
    </div>
  `;
}

export function welcomeEmailTemplate(name) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1a56db; padding: 20px; text-align: center;">
        <h1 style="color: white;">Welcome to EnrouteLogTech!</h1>
      </div>
      
      <div style="padding: 30px;">
        <h2>Hello ${name},</h2>
        <p>Your application has been submitted successfully.</p>
        <p>Our team will review your documents and get back to you within 24-48 hours.</p>
        <p>Status: <strong style="color: orange;">Pending Review</strong></p>
      </div>
    </div>
  `;
}

export function approvalEmailTemplate(companyName) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #059669; padding: 20px; text-align: center;">
        <h1 style="color: white;">Account Approved!</h1>
      </div>
      
      <div style="padding: 30px;">
        <h2>Congratulations!</h2>
        <p><strong>${companyName}</strong> has been approved on EnrouteLogTech.</p>
        <p>You can now login and start using the platform.</p>
        
        <a href="${process.env.FRONTEND_URL}/login" 
           style="background-color: #059669; color: white; 
                  padding: 12px 24px; text-decoration: none; 
                  border-radius: 6px; display: inline-block; margin-top: 20px;">
          Login Now
        </a>
      </div>
    </div>
  `;
}

export function rejectionEmailTemplate(companyName, reason) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #dc2626; padding: 20px; text-align: center;">
        <h1 style="color: white;">Application Update</h1>
      </div>
      
      <div style="padding: 30px;">
        <h2>Application Status Update</h2>
        <p>We regret to inform you that <strong>${companyName}</strong>'s 
           application could not be approved at this time.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>You may reapply after addressing the above concerns.</p>
      </div>
    </div>
  `;
}
