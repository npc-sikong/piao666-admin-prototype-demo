import { createContext, useContext, useSyncExternalStore, type AnchorHTMLAttributes, type ImgHTMLAttributes, type ReactNode } from 'react';

const routeEvent = 'piao666-demo-route';
const RouteContext = createContext('/');
export function currentRoute() {
  return location.hash.startsWith('#/') ? location.hash.slice(1) : '/';
}
export function routeHref(path: string) { return path.startsWith('/') ? `#${path}` : path; }
export function navigate(path: string, replace = false) {
  const href = routeHref(path);
  if (currentRoute() === path) return;
  history[replace ? 'replaceState' : 'pushState'](null,'',href);
  window.dispatchEvent(new Event(routeEvent));
  window.scrollTo(0,0);
}
function subscribe(fn: () => void) {
  window.addEventListener('popstate',fn); window.addEventListener('hashchange',fn); window.addEventListener(routeEvent,fn);
  return () => { window.removeEventListener('popstate',fn);window.removeEventListener('hashchange',fn);window.removeEventListener(routeEvent,fn); };
}
export function RouterProvider({ children }: { children: ReactNode }) {
  const route = useSyncExternalStore(subscribe,currentRoute,()=>'/');
  return <RouteContext.Provider value={route}>{children}</RouteContext.Provider>;
}
export function useRoute() { return useContext(RouteContext); }
export function usePathname() { return useRoute().split('?')[0]; }
const router = { push:(path:string)=>navigate(path), replace:(path:string)=>navigate(path,true), back:()=>history.back(), refresh:()=>window.dispatchEvent(new Event(routeEvent)) };
export function useRouter() { return router; }
export function redirect(path:string) { queueMicrotask(()=>navigate(path,true)); }
export default function Link({href='',children,onClick,...props}:AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href={routeHref(href)} onClick={event=>{onClick?.(event);if(href.startsWith('/')&&!event.defaultPrevented&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&event.button===0){event.preventDefault();navigate(href);}}}>{children}</a>;
}
export function Image({unoptimized:_unused,priority:_priority,...props}:ImgHTMLAttributes<HTMLImageElement>&{unoptimized?:boolean;priority?:boolean}) { return <img {...props}/>; }
