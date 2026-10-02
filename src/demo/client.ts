import type { ApiClient,ApiRequestOptions,ApiResponse } from '../../shared/api-client';
import { state,persist,fail,audit,uid,STAMP } from './state';
import { lotteryAction } from './lottery';
import { businessAction } from './business';
import { aiAction } from './ai';
import { report,exportReport,getExport } from './reports';
import type { Row } from './seed';
import { refreshMemberMetrics } from './member-metrics';

// Browser-only data for the unchanged UI. No fetch, backend, cookies or service worker.
export function createDemoClient(realm:'admin'|'portal'):ApiClient {
  return {realm,resetSecurityContext(){},onSessionLost(){return ()=>{};},async request<T>(url:string,options:ApiRequestOptions={}):Promise<ApiResponse<T>>{
    const path=url.replace(/^\/api\/(?:admin\/)?v1/,'').split('?')[0];
    const method=options.method||'GET',body=(options.body||{}) as Row,query=(options.query||{}) as Row;
    if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');
    refreshMemberMetrics(state.members, state.ledgers);
    let data:any;
    const cacheKey=options.idempotencyKey;
    if(method!=='GET'&&cacheKey&&state.commands[cacheKey])data=state.commands[cacheKey].data;
    else{
      if(path==='/auth/me'){if(!state.auth)fail('UNAUTHENTICATED','演示会话已退出',401);data=state.identity;}
      else if(path==='/auth/login'){if(!body.account?.trim()||!body.password)fail('INVALID_VALUE','请输入演示账号和密码');state.auth=true;state.identity.employeeId=body.account==='demo_operator'?'demo-employee-002':'demo-employee-001';state.identity.account=`${body.account} · 演示`;data=null;}
      else if(path==='/auth/logout'){state.auth=false;data=null;}
      else if(path==='/me/password'){data=null;}
      else if(path==='/auth/mfa/enrollments'){data={enrollmentId:uid('demo-enrollment'),provisioningUri:'演示绑定：填写任意六位数字完成本地交互',expiresAt:'2099-01-01T00:00:00Z'};}
      else if(path==='/auth/mfa/enrollments/confirm'){state.identity.mfaEnrolled=true;data=null;}
      else if(path==='/action-authorizations'){if(!/^\d{6}$/.test(String(body.proofCode||'')))fail('MFA_CODE_INVALID','演示动作验证码请输入六位数字');data={actionToken:'demo-local-action',expiresAt:'2099-01-01T00:00:00Z'};}
      else if(path.startsWith('/tasks/'))data=state.tasks[path.split('/').at(-1)!]||fail('NOT_FOUND','演示任务不存在',404);
      else if(path.startsWith('/command-results/')){const item=state.commands[path.split('/').at(-1)!];data=item?{operationId:query.operationId||item.operationId,resourceId:item.data?.resourceId||item.data?.id||null,taskId:item.data?.taskId||null,status:'SUCCEEDED',httpStatus:200,resultUrl:item.data?.statusUrl||null,failureCode:null}:fail('NOT_FOUND','演示命令不存在',404);}
      else if(path.startsWith('/reports/'))data=report(path.split('/').at(-1)!,query);
      else if(path==='/report-exports')data=exportReport(body);
      else if(path.startsWith('/report-exports/'))data=getExport(path.split('/').at(-1)!);
      else{
        for(const handler of [lotteryAction,businessAction,aiAction]){data=handler(path,method,body,query);if(data!==undefined)break;}
        if(data===undefined)fail('DEMO_NOT_IMPLEMENTED',`未映射的演示操作：${method} ${path}`,404);
      }
      if(method!=='GET'){
        refreshMemberMetrics(state.members, state.ledgers);
        if(!path.startsWith('/auth/')&&path!=='/action-authorizations'&&path!=='/me/password')audit(path,body);
        if(cacheKey)state.commands[cacheKey]={operationId:path.split('/').at(-1),data:structuredClone(data)};
        persist();
      }
    }
    return {data:structuredClone(data) as T,meta:{requestId:'demo-local',traceId:'demo-local',serverTime:STAMP},status:data?.taskId?202:200,etag:`"${data?.version||data?.pool?.version||'1'}"`,location:null,retryAfterSeconds:null};
  }};
}
export async function storeEvidenceFile(file:File,purpose:string){
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
  const id=uid('demo-evidence');let artifact:unknown=null;if(file.type.includes('json')||file.name.endsWith('.json')){try{artifact=JSON.parse(await file.text());}catch{fail('INVALID_VALUE','请选择有效 JSON 文件');}}
  state.uploads[id]={id,status:'COMMITTED',sha256:hash,purpose,fileName:file.name,artifact};persist();return {id,status:'COMMITTED',sha256:hash,purpose};
}
