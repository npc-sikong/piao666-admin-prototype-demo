import { createElement,type ImgHTMLAttributes } from 'react';
import assets from './assets.json';
export default function Image({unoptimized:_unused,priority:_priority,src,...props}:ImgHTMLAttributes<HTMLImageElement>&{unoptimized?:boolean;priority?:boolean}) {
  return createElement('img',{...props,src:src?(assets as Record<string,string>)[src]||src:src});
}
