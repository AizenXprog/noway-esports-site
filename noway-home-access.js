import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Recrutamento com RLS e RPC: nenhuma chave administrativa é enviada ao navegador.
const db=createClient("https://vdipsufzlqmnprbjiojb.supabase.co",
  "sb_publishable_sYb-pfY4GhRjeQzEBKa_kg__xIZUg7e",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

const access=document.getElementById("nowayHomeGoogle");
const label=document.getElementById("nowayHomeGoogleText");
const status=document.getElementById("nowayHomeAuthStatus");
const header=document.getElementById("nowayHeaderLogin");
const memberPanel=new URL("painel.html",location.href).href;
let signedIn=false,pending=false;
function connected(yes){
 signedIn=Boolean(yes);
 if(!access||!label)return;
 if(!pending){
  label.textContent=signedIn?"ABRIR MEU PAINEL":"ENTRAR COM GOOGLE";
  access.setAttribute("aria-label",signedIn?"Abrir meu painel NOWAY ID":"Entrar com Google para acessar o NOWAY ID");
 }
 if(header){
  header.textContent=signedIn?"MINHA CONTA ↗":"ENTRAR / NOWAY ID ↗";
  header.setAttribute("aria-label",signedIn?"Abrir minha conta NOWAY ID":"Entrar no NOWAY ID");
 }
}
access?.addEventListener("click",async event=>{
 if(signedIn||pending)return;
 event.preventDefault();
 pending=true;
 access.classList.add("is-loading");
 label.textContent="ABRINDO GOOGLE...";
 if(status)status.hidden=true;
 try{
  const {error}=await db.auth.signInWithOAuth({
   provider:"google",
   options:{redirectTo:memberPanel}
  });
  if(error)throw error;
 }catch(err){
  if(status){
   status.textContent="Não foi possível abrir o Google agora. Tente entrar com e-mail pelo NOWAY ID.";
   status.hidden=false;
  }
  console.warn("NOWAY Google sign in:",err?.message||err);
 }finally{
  pending=false;
  access.classList.remove("is-loading");
  connected(signedIn);
 }
});
db.auth.getUser().then(({data})=>connected(Boolean(data?.user))).catch(()=>connected(false));
db.auth.onAuthStateChange((event,session)=>{
 if(["SIGNED_IN","SIGNED_OUT","USER_UPDATED"].includes(event))connected(Boolean(session?.user));
});
