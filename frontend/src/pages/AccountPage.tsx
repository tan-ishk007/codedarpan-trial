import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { apiRequest, jsonBody } from '../lib/api';
import { Brand } from '../components/Brand';

export default function AccountPage() {
  const navigate=useNavigate();
  const [register,setRegister]=useState(false);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const signedIn=typeof window!=='undefined'&&!!window.sessionStorage.getItem('codedarpan.auth.token');
  const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setNotice('');try{const data=await apiRequest('/api/auth/'+(register?'register':'login'),{method:'POST',body:jsonBody({email,password})}) as any;if(typeof data.token!=='string')throw new Error('The account response did not include a session token.');window.sessionStorage.setItem('codedarpan.auth.token',data.token);navigate('/')}catch(err){setNotice(err instanceof Error?err.message:'Account request failed.')}finally{setBusy(false)}};
  const logout=async()=>{try{await apiRequest('/api/auth/logout',{method:'POST'})}catch{}window.sessionStorage.removeItem('codedarpan.auth.token');navigate('/')};
  return <main style={{minHeight:'100vh',background:'#F2EBDD',color:'#1D1A18',padding:'32px 20px'}}><header style={{maxWidth:1050,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center'}}><Brand/><Link to="/" aria-label="Back to CodeDarpan"><ArrowLeft size={18}/> Home</Link></header><section style={{maxWidth:460,margin:'12vh auto',background:'#FAF7F0',border:'1px solid #D8CCB7',padding:'36px'}}><p style={{fontFamily:'monospace',letterSpacing:'.12em',color:'#8F3030'}}>PRIVATE REPOSITORY WORKSPACE</p><h1 style={{fontSize:36,fontWeight:400}}>{signedIn?'Account session':'Account access'}</h1>{signedIn?<><p>You are signed in for this browser tab. Analysis runs are isolated to this account.</p><button className="button-primary" onClick={logout}>Sign out</button></>:<><p>{register?'Create an account to keep your analyses isolated from other users.':'Sign in to access your private analysis workspace.'}</p><form onSubmit={submit} style={{display:'grid',gap:14}}><label>Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} style={{display:'block',width:'100%',padding:12,marginTop:5}}/></label><label>Password<input required type="password" minLength={12} autoComplete={register?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} style={{display:'block',width:'100%',padding:12,marginTop:5}}/><small>At least 12 characters.</small></label>{notice&&<p role="alert" style={{color:'#8F3030'}}>{notice}</p>}<button className="button-primary" disabled={busy}>{busy?'Working…':register?'Create account':'Sign in'} <KeyRound size={16}/></button></form><button className="button-quiet" style={{marginTop:18}} onClick={()=>{setRegister(!register);setNotice('')}}>{register?'I already have an account':'Create a new account'}</button></>}</section></main>;
}
