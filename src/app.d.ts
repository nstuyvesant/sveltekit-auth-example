/// <reference types="bootstrap" />
/// <reference types="google.accounts" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
	interface Locals {
    user: User
  }

	// interface Platform {}

  // interface PrivateEnv {} // $env/dynamic/private

	// interface PublicEnv {} // $env/dynamic/public
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

interface GoogleCredentialResponse {
	credential: string
	select_by:
		| 'auto'
		| 'user'
		| 'user_1tap'
		| 'user_2tap'
		| 'btn'
		| 'btn_confirm'
		| 'btn_add_session'
		| 'btn_confirm_add_session'
}

interface ImportMetaEnv {
  VITE_GOOGLE_CLIENT_ID: string
}

type MessageAddressee = {
  email: string
  name?: string
}

type Message = {
  sender?: MessageAddressee
  to?: MessageAddressee[]
  subject: string
  htmlContent?: string
  textContent?: string
  tags?: string[]
  contact?: Person
}

interface SendInBlueContact {
  updateEnabled: boolean
  email: string
  emailBlacklisted: boolean
  attributes: {
    NAME: string
    SURNAME: string
  }
}

interface SendInBlueMessage extends Message {
  sender: MessageAddressee
  to: MessageAddressee[]
}

interface SendInBlueRequest extends RequestInit {
  headers: {
    'api-key': string
  }
}

type User = {
  id: number
  role: 'student' | 'teacher' | 'admin'
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

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Window {
  google?: any
  grecaptcha: any
  bootstrap: Bootstrap
}