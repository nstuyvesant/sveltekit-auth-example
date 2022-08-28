import type { LayoutServerLoad } from './$types'

export function load({ locals }): LayoutServerLoad {
  const { user }: { user: User } = locals // locals.user set by hooks.ts/handle(), undefined if not logged in
  return {
    user
  }
}