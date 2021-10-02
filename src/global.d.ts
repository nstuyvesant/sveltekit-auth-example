/// <reference types="@sveltejs/kit" />

/* eslint-disable @typescript-eslint/no-explicit-any */

declare const google: any

interface ImportMeta {
  env: {
    VITE_DATABASE_URL: string
    VITE_GOOGLE_CLIENT_ID: string
    VITE_GOOGLE_SECRET: string
    VITE_JWT_SECRET: string
    VITE_WEB_URL: string
  }
}

type AuthenticationResult = {
  statusCode: number
  status: string
  user: User
  sessionId: string
}

type Credentials = {
  email: string
  password: string
}

type User = {
  id?: number
  role?: 'student' | 'teacher' | 'admin'
  password?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}

type UserSession = {
  id: string,
  user: User
}