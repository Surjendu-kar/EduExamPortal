export interface TemplateVariables {
  firstName: string;
  lastName: string;
  examTitle?: string;
  institutionName?: string;
  expirationDate: string;
  inviteUrl: string;
  invitedBy?: string;
  departmentName?: string;
  teacherName?: string;
}

export interface EmailTemplate {
  subject: string;
  main_message: string;
}

// Helper function to capitalize first letter of each word
function capitalizeWords(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function renderEmailTemplate(
  template: EmailTemplate,
  variables: TemplateVariables
): {
  subject: string;
  html: string;
} {
  // Build full name for convenience
  const fullName = `${capitalizeWords(variables.firstName)} ${capitalizeWords(variables.lastName)}`;

  const replacements: Record<string, string> = {
    // Single brace format
    '{firstName}': capitalizeWords(variables.firstName),
    '{lastName}': capitalizeWords(variables.lastName),
    '{examTitle}': variables.examTitle ? capitalizeWords(variables.examTitle) : '',
    '{institutionName}': variables.institutionName || '',
    '{expirationDate}': variables.expirationDate,
    '{inviteUrl}': variables.inviteUrl,
    '{invitedBy}': variables.invitedBy || '',
    '{departmentName}': variables.departmentName || '',
    '{teacherName}': fullName,
    // Double brace format (for backward compatibility)
    '{{firstName}}': capitalizeWords(variables.firstName),
    '{{lastName}}': capitalizeWords(variables.lastName),
    '{{examTitle}}': variables.examTitle ? capitalizeWords(variables.examTitle) : '',
    '{{institutionName}}': variables.institutionName || 'institution_name',
    '{{expirationDate}}': variables.expirationDate,
    '{{inviteUrl}}': variables.inviteUrl,
    '{{invitedBy}}': variables.invitedBy || 'invited_by',
    '{{departmentName}}': variables.departmentName || 'department_name',
    '{{teacher_name}}': fullName,
    '{{invited_by}}': variables.invitedBy || 'Admin',
    '{{institution_name}}': variables.institutionName || 'Our Institution',
    '{{department_name}}': variables.departmentName || 'Not assigned',
  };

  const replaceVariables = (text: string): string => {
    let result = text;
    Object.entries(replacements).forEach(([key, value]) => {
      // Escape special regex characters in the key
      const escapedKey = key.replace(/[{}]/g, '\\$&');
      result = result.replace(new RegExp(escapedKey, 'g'), value);
    });
    return result;
  };

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .content {
            padding: 30px;
            background: white;
          }
          .content p {
            margin: 0.75em 0;
          }
          .content ul, .content ol {
            margin: 0.5em 0;
            padding-left: 1.5em;
          }
          .invite-section {
            background: #f9f9f9;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            padding: 20px;
            background: #f9f9f9;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #eee;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">EduExamPortal</h1>
          </div>
          <div class="content">
            ${replaceVariables(template.main_message)}

            <div class="invite-section">
              <p><strong>To get started, click the button below:</strong></p>
              <div style="text-align: center;">
                <a href="${variables.inviteUrl}" class="button">Accept Invitation</a>
              </div>
              <p style="margin-top: 15px; font-size: 13px; color: #666;">Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea; font-size: 13px;">${variables.inviteUrl}</p>
            </div>
          </div>
          <div class="footer">
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <p style="margin-top: 10px;"><strong>EduExamPortal</strong> - Online Examination Platform</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    subject: replaceVariables(template.subject),
    html,
  };
}
