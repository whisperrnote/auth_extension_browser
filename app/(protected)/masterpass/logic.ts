import { Client, Account } from "appwrite";

// Initialize Appwrite client
const client = new Client();
client.setEndpoint("https://[HOSTNAME]/v1").setProject("[PROJECT_ID]");

const account = new Account(client);

export async function loginWithMasterpass(email: string, password: string) {
  try {
    const response = await account.createEmailSession(email, password);
    return response;
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
}