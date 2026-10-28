import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, KeyRound, LogIn, ShieldCheck } from 'lucide-react';
import { apiRequest, jsonBody } from '../lib/api';
import { Brand } from '../components/Brand';

export default function AccountPage() {
  const navigate=useNavigate();
  const [params]=useSearchParams();
  const [register,setRegister]=useState(false);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [authUser,setAuthUser]=useState<{email:string}|null>(null);
  const [googleEnabled,setGoogleEnabled]=useState(false);
  const [checking,setChecking]=useState(true);
  useEffect(()=>{let active=true;Promise.all([apiRequest('/api/auth/google/status').catch(()=>({enabled:false})),apiRequest('/api/auth/me').catch(()=>null)]).then(([google,user])=>{if(!active)return;setGoogleEnabled((google as any)?.enabled===true);setAuthUser(typeof (user as any)?.user?.email==='string'?{email:(user as any).user.email}:null)}).finally(()=>active&&setChecking(false));return()=>{active=false}},[]);
  useEffect(()=>{const oauth=params.get('oauth');if(oauth==='success')setNotice('Google sign-in completed. Your private workspace is ready.');else if(oauth==='error')setNotice(params.get('message')||'Google sign-in could not be completed.');},[params]);
  const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setNotice('');try{const data=await apiRequest('/api/auth/'+(register?'register':'login'),{method:'POST',body:jsonBody({email,password})}) as any;if(typeof data.token!=='string')throw new Error('The account response did not include a session token.');window.sessionStorage.setItem('codedarpan.auth.token',data.token);navigate('/')}catch(err){setNotice(err instanceof Error?err.message:'Account request failed.')}finally{setBusy(false)}};
  const logout=async()=>{try{await apiRequest('/api/auth/logout',{method:'POST'})}catch{}window.sessionStorage.removeItem('codedarpan.auth.token');setAuthUser(null);navigate('/')};
  return <main className="account-page"><header className="account-header"><Brand/><Link to="/" aria-label="Back to CodeDarpan"><ArrowLeft size={18}/> Home</Link></header><section className="account-card"><p className="account-kicker">PRIVATE REPOSITORY WORKSPACE</p><h1>{checking?'Checking your session…':authUser?'Account session':'Account access'}</h1>{authUser?<><p>You are signed in as <strong>{authUser.email}</strong>. Your analyses are isolated to this account.</p><div className="account-trust"><ShieldCheck size={17}/><span>Protected workspace session</span></div><button className="button-primary" onClick={logout}>Sign out</button></>:<><p>{register?'Create an account to keep your analyses isolated from other users.':'Sign in to access your private analysis workspace.'}</p>{googleEnabled&&<><button className="google-button" type="button" onClick={()=>window.location.assign('/api/auth/google')}><span className="google-mark">G</span> Continue with Google <LogIn size={15}/></button><div className="account-divider"><span>or use email</span></div></>}{!googleEnabled&&<p className="account-config-note">Google sign-in is ready for this deployment once its OAuth credentials are configured.</p>}<form onSubmit={submit} style={{display:'grid',gap:14}}><label>Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label><label>Password<input required type="password" minLength={12} autoComplete={register?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/><small>At least 12 characters.</small></label>{notice&&<p role="alert" className="account-alert">{notice}</p>}<button className="button-primary" disabled={busy}>{busy?'Working…':register?'Create account':'Sign in'} <KeyRound size={16}/></button></form><button className="button-quiet account-toggle" onClick={()=>{setRegister(!register);setNotice('')}}>{register?'I already have an account':'Create a new account'}</button></>}</section></main>;
}
