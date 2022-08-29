import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = (event) => {
  const locals = event.locals
  const { user }: { user: User } = locals // locals.user set by hooks.ts/handle(), undefined if not logged in
  return {
    user
  }
}