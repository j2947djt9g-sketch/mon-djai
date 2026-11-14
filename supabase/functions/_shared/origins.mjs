// Exact public environments. GitHub Pages remains an explicit transition origin.
export const CLAIR_PRODUCTION_ORIGIN='https://clair-budget.vercel.app';
export const CLAIR_LEGACY_ORIGIN='https://j2947djt9g-sketch.github.io';
export const CLAIR_RECOVERY_DESTINATION=CLAIR_PRODUCTION_ORIGIN+'/clair/';
// Keep policies named separately so a future service change cannot silently widen others.
const policies={
 'account-help':[CLAIR_PRODUCTION_ORIGIN,CLAIR_LEGACY_ORIGIN],
 'account-recovery':[CLAIR_PRODUCTION_ORIGIN,CLAIR_LEGACY_ORIGIN],
 'device-unlock':[CLAIR_PRODUCTION_ORIGIN,CLAIR_LEGACY_ORIGIN]
};
export function isAllowedOrigin(service,origin){
 const allowed=policies[service];
 return !!allowed&&(!origin||allowed.includes(origin)||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
}
