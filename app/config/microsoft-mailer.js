import fetch from "node-fetch";

async function getAccessToken() {
  const url = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;

  const params = new URLSearchParams();
  params.append("client_id", process.env.AZURE_CLIENT_ID);
  params.append("scope", "https://graph.microsoft.com/.default");
  params.append("client_secret", process.env.AZURE_CLIENT_SECRET);
  params.append("grant_type", "client_credentials");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to get token: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function sendMicrosoftEmail({ to, subject, html, pdf, filename }) {
  const token = await getAccessToken();

  const emailBody = {
    message: {
      subject,
      body: {
        contentType: "HTML",
        content: html,
      },
      toRecipients: [{ emailAddress: { address: to } }],
      attachments: [
        {
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: filename,
          contentBytes: pdf.includes(",") ? pdf.split(",")[1] : pdf,
        },
      ],
    },
    saveToSentItems: true,
  };

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${process.env.SENDER_EMAIL}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailBody),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to send email: ${response.status} - ${errorBody}`);
  }

  return true;
}
