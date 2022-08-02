import type { RequestEvent } from "@sveltejs/kit"

export function requestAuthorized(event: RequestEvent, roles: string[]): boolean {
  return !!event.locals.user && roles.includes(event.locals.user.role)
}