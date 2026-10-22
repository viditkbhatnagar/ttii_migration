/** Associates (role 10) share the centre pages but never see fees or payments; the API omits them. */
export const ASSOCIATE_ROLE_ID = 10;

export function canSeeMoney(roleId: number): boolean {
  return roleId !== ASSOCIATE_ROLE_ID;
}
