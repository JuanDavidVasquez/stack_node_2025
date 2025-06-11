const en = {
  emailVerification: {
    subject: "Verify your email",
    greeting: "Hi {{name}},",
    message: "Please verify your email by clicking the button below.",
    button: "Verify Email",
    footer: "If you didn't create an account, you can safely ignore this email."
  },
  passwordResetCode: {
    subject: "Your password reset code",
    greeting: "Hi {{name}},",
    message: "Use the following code to reset your password:",
    expiration: "This code will expire in 10 minutes."
  },
  passwordResetLink: {
    subject: "Reset your password",
    greeting: "Hi {{name}},",
    message: "Click the button below to reset your password:",
    button: "Reset Password",
    expiration: "This link will expire in 30 minutes."
  },
  welcome: {
    subject: "Welcome to {{appName}}! Verify your account",
    title: "Welcome {{firstName}}!",
    subtitle: "Your {{appName}} account is ready",
    greeting: "Welcome, {{firstName}}!",
    thankYou: "Thank you for joining our community. We're excited to have you as part of {{appName}} and want to ensure you have the best possible experience from day one.",
    accountVerified: "Your account has been successfully verified and you can now start exploring all our features.",
    accountInfo: {
      title: "Your account information",
      email: "Email:",
      name: "Name:",
      accountType: "Account type:",
      registrationDate: "Registration date:"
    },
    getStarted: {
      title: "Where to start?",
      step1: {
        title: "Explore your dashboard",
        description: "Get familiar with the interface and discover all available features."
      },
      step2: {
        title: "Customize your profile",
        description: "Add your photo, complete your information and configure your preferences."
      },
      step3: {
        title: "Start using the platform",
        description: "Begin taking advantage of all the tools and services we have for you."
      }
    },
    resources: {
      title: "Useful resources"
    },
    support: {
      title: "Need help?",
      message: "Our support team is here to help you. If you have questions or need assistance,",
      contactUs: "contact us at",
      orContact: "don't hesitate to contact us"
    },
    closing: "Once again, welcome to {{appName}}! We're excited to accompany you on this journey.",
    signature: "With much enthusiasm,",
    teamSignature: "The {{appName}} team 🎉",
    primaryButton: "Go to my account"
  },
  passwordReset: {
    code: {
      title: "Recovery code",
      subtitle: "Code to reset your password on {{appName}}",
      greeting: "Hello {{firstName}},",
      message1: "We have received a request to reset the password for your {{appName}} account.",
      message2: "If you were the one who requested this change, you can use the security code you'll find below.",
      requestDetails: {
        title: "Request details",
        account: "Account:",
        dateTime: "Date and time:",
        ipAddress: "IP Address:"
      },
      codeLabel: "Your recovery code is:",
      instructions: "Enter this code in the application to reset your password.",
      howToUse: {
        title: "How to use the code:",
        step1: "Go to the password recovery page",
        step2: "Enter this code in the corresponding field",
        step3: "Create your new secure password",
        step4: "Done! You can now access with your new password"
      },
      expiration: "Important: This code will expire in {{expirationTime}}. If you don't reset your password within this time, you'll need to request a new code.",
      security: {
        title: "Security tips",
        tip1: "Don't share this code with anyone, not even our support team",
        tip2: "Use it only on the official {{appName}} site",
        tip3: "Create a strong password with at least 8 characters",
        tip4: "Include uppercase, lowercase, numbers and symbols",
        tip5: "Don't use the same password on other accounts"
      },
      notRequested: {
        title: "Didn't request this code?",
        message1: "If you didn't request to reset your password, ignore this email. Your current password will remain unchanged and the code will expire automatically.",
        message2: "If you receive multiple codes without requesting them, immediately contact our support team, as it could indicate someone is trying to access your account."
      },
      didYouKnow: {
        title: "Did you know...?",
        message: "Each code is unique and can only be used once. Once you successfully reset your password, this code will become invalid automatically, even if it hasn't expired."
      },
      closing: "Thank you for keeping your account secure. Remember that your account security is very important to us, which is why we implement these protection measures.",
      signature: "Best regards,",
      teamSignature: "The {{appName}} security team 🔐",
      supportButton: "Contact support"
    },
    link: {
      title: "Password recovery",
      subtitle: "Request to reset your {{appName}} password",
      greeting: "Hello {{firstName}},",
      message1: "We have received a request to reset the password for your {{appName}} account.",
      message2: "If you were the one who requested this change, you can reset your password using the link you'll find below.",
      requestDetails: {
        title: "Request details",
        account: "Account:",
        dateTime: "Date and time:",
        ipAddress: "IP Address:",
        browser: "Browser:"
      },
      buttonText: "Reset password",
      instructions: "Click the button below to create your new password:",
      alternativeText: "If you can't click the button, copy and paste this link into your browser:",
      expiration: "Important: This reset link will expire in {{expirationTime}}. If you don't reset your password within this time, you'll need to request a new link.",
      security: {
        title: "Security tips",
        tip1: "Create a strong password with at least 8 characters",
        tip2: "Include uppercase, lowercase, numbers and symbols",
        tip3: "Don't use the same password on other accounts",
        tip4: "Consider using a password manager"
      },
      notRequested: {
        title: "Didn't request this change?",
        message1: "If you didn't request to reset your password, ignore this email. Your current password will remain unchanged.",
        message2: "However, we recommend you review your account security and contact our support team if you suspect unauthorized activity."
      },
      closing: "Thank you for keeping your account secure. If you have any questions or concerns about this process, don't hesitate to contact us.",
      signature: "Best regards,",
      teamSignature: "The {{appName}} security team 🔐",
      supportButton: "Contact support",
      supportMessage: "Having trouble or need help?"
    }
  },
  partials: {
    button: {
      clickHere: "Click here"
    },
    header: {
      title: "User Management System",
      subtitle: "Your account, secured",
      emailTypes: {
        verification: "ACCOUNT VERIFICATION",
        welcome: "WELCOME",
        passwordReset: "PASSWORD RECOVERY",
        notification: "NOTIFICATION",
        admin: "ADMINISTRATION"
      }
    },
    footer: {
      help: {
        title: "Need help?",
        message: "If you have any questions or need assistance, we're here to help you."
      },
      quickLinks: {
        title: "Quick Links",
        dashboard: "Dashboard",
        profile: "My Profile",
        settings: "Settings",
        privacy: "Privacy",
        terms: "Terms"
      },
      social: {
        title: "Follow us"
      },
      company: {
        allRightsReserved: "All rights reserved."
      },
      disclaimer: {
        title: "Important:",
        message: "This email was sent from a send-only address.",
        contact: "For inquiries, contact:"
      },
      unsubscribe: {
        message: "Don't want to receive these emails?",
        link: "Unsubscribe"
      },
      poweredBy: "Powered by {{appName}} Email System"
    }
  },
  common: {
    and: "and",
    or: "or",
    yes: "Yes",
    no: "No",
    continue: "Continue",
    cancel: "Cancel",
    close: "Close",
    save: "Save",
    email: "Email",
    password: "Password",
    name: "Name",
    firstName: "First Name",
    lastName: "Last Name",
    phone: "Phone",
    address: "Address",
    helpCenter: "Help Center",
    contactSupport: "Contact support",
    emailSentOn: "Email sent on {{timestamp}}"
  },
    errors: {
    userAlreadyExists: "User with email {{email}} already exists",
    userCreationFailed: "Error creating user",
    userNotFound: "User not found",
    invalidCredentials: "Invalid credentials",
    emailAlreadyVerified: "Email is already verified",
    invalidVerificationCode: "Invalid verification code",
  }
};

export default en;