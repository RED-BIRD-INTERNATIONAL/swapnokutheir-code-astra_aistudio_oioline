import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

/**
 * Gmail Service for Red Bird International
 * Handles email listing, viewing, and sending using the Google Workspace Gmail API.
 */

// Cache the access token in memory as per guidelines.
let cachedAccessToken: string | null = null;

/**
 * Ensures we have a valid access token.
 * If not, it attempts to get one from the current Firebase session.
 * NOTE: This requires the user to have signed in with Google and requested the necessary scopes.
 */
export const getGmailAccessToken = async (): Promise<string> => {
  if (cachedAccessToken) return cachedAccessToken;

  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('User must be authenticated to access Gmail.');
  }

  // In a real app, we'd use the token from the sign-in result.
  // Since we might not have it cached after a page reload, we might need to prompt for sign-in again
  // if the provider does not expose the token directly.
  // For this environment, we expect the token to be managed during the login flow.
  
  if (!cachedAccessToken) {
    // If no token is cached, we trigger a popup to get a fresh one with the required scopes.
    const provider = new GoogleAuthProvider();
    provider.addScope('https://mail.google.com/');
    
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      return cachedAccessToken;
    }
    throw new Error('Failed to obtain Gmail access token.');
  }

  return cachedAccessToken;
};

export const setCachedGmailToken = (token: string | null) => {
  cachedAccessToken = token;
};

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject?: string;
  from?: string;
  date?: string;
}

/**
 * Lists the most recent messages from the user's inbox.
 */
export const listMessages = async (maxResults = 10): Promise<GmailMessage[]> => {
  const token = await getGmailAccessToken();
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.messages) return [];

  // Fetch details for each message to get subjects/from
  const messages = await Promise.all(
    data.messages.map(async (msg: { id: string }) => {
      const details = await getMessageDetails(msg.id);
      return details;
    })
  );

  return messages;
};

/**
 * Gets the details of a specific message.
 */
export const getMessageDetails = async (messageId: string): Promise<GmailMessage> => {
  const token = await getGmailAccessToken();
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.statusText}`);
  }

  const data = await response.json();
  const headers = data.payload.headers;
  const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
  const from = headers.find((h: any) => h.name === 'From')?.value || '(Unknown Sender)';
  const date = headers.find((h: any) => h.name === 'Date')?.value || '';

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet,
    subject,
    from,
    date
  };
};

/**
 * Sends an email on behalf of the user.
 */
export const sendEmail = async (to: string, subject: string, body: string): Promise<boolean> => {
  const token = await getGmailAccessToken();

  // Create RFC 2822 message
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const message = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body
  ].join('\n');

  const base64SafeMessage = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: base64SafeMessage })
  });

  return response.ok;
};
