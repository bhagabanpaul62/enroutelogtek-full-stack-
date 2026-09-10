# Phase 1 - Authentication & Authorization

## Goal

Allow a company to register on Enroute, verify its email, submit company information and documents, wait for admin approval, securely log in, create a session using JWT, and access only authorized resources based on company type and user role.

---

# Registration Workflow

```mermaid
flowchart TD

A[Landing Page]

A --> B[Click Register]

B --> C[Enter Email]

C --> D[Send OTP]

D --> E[Verify OTP]

E --> F{OTP Valid?}

F -- No --> C

F -- Yes --> G[Personal Details]

G --> H[Company Details]

H --> I[Branch Details]

I --> J[Upload Documents]

J --> K[Submit Registration]

K --> L[Create User]

K --> M[Create Company]

K --> N[Create Branch]

K --> O[Store Documents]

L --> P[Company Status = Pending]
M --> P
N --> P
O --> P

P --> Q[Waiting For Approval]

Q --> R[Admin Review]

R --> S{Verification Successful?}

S -- No --> T[Reject Application]

T --> U[Send Rejection Email]

U --> B

S -- Yes --> V[Approve Company]

V --> W[Company Status = Approved]

W --> X[Send Approval Email]

X --> Y[User Can Login]
```

---

# Login Workflow

```mermaid
flowchart TD

A[Login Page]

A --> B[Enter Email]

B --> C[Enter Password]

C --> D[Click Login]

D --> E{Credentials Valid?}

E -- No --> F[Return Invalid Credentials]

F --> A

E -- Yes --> G[Load User]

G --> H[Load Company]

H --> I{Company Approved?}

I -- No --> J[Show Waiting Approval]

I -- Blocked --> K[Show Company Blocked]

I -- Rejected --> L[Show Registration Rejected]

I -- Yes --> M{User Active?}

M -- No --> N[Account Disabled]

M -- Yes --> O[Generate Access Token]

O --> P[Generate Refresh Token]

P --> Q[Create Session]

Q --> R[Store Refresh Token]

R --> S[Set HttpOnly Cookies]

S --> T[Determine Company Type]

T --> U[Determine User Role]

U --> V[Redirect Dashboard]
```

---

# Authorization Workflow

```mermaid
flowchart TD

A[Protected API Request]

A --> B[Read Access Token]

B --> C{Token Valid?}

C -- No --> D[Try Refresh Token]

D --> E{Refresh Token Valid?}

E -- No --> F[Logout User]

E -- Yes --> G[Generate New Access Token]

G --> H[Continue Request]

C -- Yes --> H

H --> I[Load User]

I --> J[Load Company]

J --> K{Company Approved?}

K -- No --> L[Deny Access]

K -- Yes --> M{User Active?}

M -- No --> N[Deny Access]

M -- Yes --> O[Check User Role]

O --> P{Permission Allowed?}

P -- No --> Q[403 Forbidden]

P -- Yes --> R[Execute API]
```

---

# Session Management Workflow

```mermaid
flowchart TD

Login

↓

Generate Access Token

↓

Generate Refresh Token

↓

Create Session

↓

Store Refresh Token

↓

Set HttpOnly Cookies

↓

User Makes Requests

↓

Access Token Expired?

↓

Yes

↓

Verify Refresh Token

↓

Generate New Access Token

↓

Continue Session

↓

Refresh Token Expired?

↓

Logout User
```

---

# Backend APIs

| Method | Endpoint | Purpose |
|---------|----------|---------|
| POST | /auth/send-otp | Send registration OTP |
| POST | /auth/verify-otp | Verify registration OTP |
| POST | /auth/register | Create company, branch and user |
| POST | /documents/upload | Upload company documents |
| POST | /auth/login | Login with email & password |
| POST | /auth/logout | Logout user |
| POST | /auth/refresh-token | Generate new access token |

---

# Database Tables

- users
- companies
- branches
- documents
- companySubscription
- sessions

---

# Company Types

- Customer
- Transporter
- Broker
- Fleet Owner

---

# User Roles

- Root Admin
- Admin
- Viewer
- Bid Manager
- Trip Manager
- Accounts

---

# Company Status

- Pending
- Approved
- Rejected
- Blocked

---

# User Status

- Active
- Inactive
- Blocked

---

# Security Features

- Email verification during registration
- Password hashing (Argon2 or bcrypt)
- JWT Access Token
- Refresh Token
- HttpOnly Cookies
- Secure Cookies (Production)
- One Active Session (optional)
- Role-Based Authorization
- Company-Type Based Dashboard Routing

---

# Edge Cases

- OTP Expired
- Invalid OTP
- Duplicate Email
- Duplicate GST
- Company Pending Approval
- Company Rejected
- Company Blocked
- User Blocked
- Wrong Password
- Invalid JWT
- Expired Access Token
- Expired Refresh Token
- Unauthorized Route
- Permission Denied (403)

---

# Notifications

- Registration OTP
- Registration Submitted
- Company Approved
- Company Rejected
- Password Reset (Future)
- Login Alert (Future)

---

# Future Improvements

- Forgot Password
- Change Password
- Two-Factor Authentication (2FA)
- Authenticator App Support
- Trusted Devices
- Device Management
- Login History
- Social Login (Google/Microsoft)
- Email Change Verification
- Account Activity Logs