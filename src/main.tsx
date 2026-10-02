import { createRoot } from 'react-dom/client';
import { Component, type ReactNode, type ComponentType } from 'react';
import '@piao777/ui-tokens/tokens.css';
import './app/globals.css';
import { AdminShell } from './components/admin-shell/admin-shell';
import { AppProviders } from './app/providers';
import { RouterProvider,useRoute, navigate } from './demo/router';
import { routes } from './demo/routes';

class Boundary extends Component<{children:ReactNode},{error:string|null}> {
  state={error:null as string|null};
  static getDerivedStateFromError(error:Error){return {error:error.message};}
  render(){return this.state.error?<main style={{padding:40}}><h1>演示页面读取失败</h1><p role="alert">{this.state.error}</p><button onClick={()=>{this.setState({error:null});navigate('/');}}>返回运营总览</button></main>:this.props.children;}
}
function Page(){const route=useRoute(),pathname=route.split('?')[0];
  for(const item of routes){const match=pathname.match(new RegExp('^'+item.path.replace(/\[([^\]]+)\]/g,'([^/]+)')+'/?$'));if(!match)continue;const props=Object.fromEntries(item.params.map((key,i)=>[key,decodeURIComponent(match[i+1])])),Screen=item.component as ComponentType<Record<string,string>>;return <Boundary key={pathname}><Screen {...props}/></Boundary>;}
  return <main><h1>页面不存在</h1><button onClick={()=>navigate('/')}>返回运营总览</button></main>;
}
createRoot(document.getElementById('root')!).render(<RouterProvider><AppProviders><AdminShell><Page/></AdminShell></AppProviders></RouterProvider>);
