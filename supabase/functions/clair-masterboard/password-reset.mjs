// No blank password is accepted: an unknown random replacement invalidates the previous password.
export function createPasswordResetAdmin({request,randomBytes=()=>crypto.getRandomValues(new Uint8Array(32))}){
 return {async invalidatePassword(id){
  const bytes=randomBytes();if(!(bytes instanceof Uint8Array)||bytes.length!==32)throw Error('Invalid entropy');
  const password='Aa1!'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  await request('/auth/v1/admin/users/'+encodeURIComponent(id),'PUT',{password});
 }};
}
