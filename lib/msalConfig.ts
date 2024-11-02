"use client";

import {
  Configuration,
  PopupRequest,
  PublicClientApplication,
} from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!,
    authority: "https://login.microsoftonline.com/common",
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);
await msalInstance.initialize();

export const loginRequest: PopupRequest = {
  scopes: ["User.Read", "Tasks.Read"],
};

export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
  graphTasksEndpoint: "https://graph.microsoft.com/v1.0/me/todo/lists",
};

//("WGD8Q~rSZl8Twygh2.OV4fBnKr7R_jk-314gYbGl");
//secret : "e0c7a72b-47a1-414c-b26c-03e61e61d892"
