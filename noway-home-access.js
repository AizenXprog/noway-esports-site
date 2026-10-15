import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Recrutamento com RLS e RPC: nenhuma chave administrativa é enviada ao navegador.
const db=createClient("https://vdipsufzlqmnprbjiojb.supabase.co",
  "sb_publishable_sYb-pfY4GhRjeQzEBKa_kg__xIZUg7e",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

const access=document.getElementById("nowayHomeGoogle");
const label=document.getElementById("nowayHomeGoogleText");
const status=document.getElementById("nowayHomeAuthStatus");
const header=document.getElementById("nowayHeaderLogin");
const block=document.querySelector(".noway-home-access");
const title=document.getElementById("nowayHomeAccessTitle");
const description=document.getElementById("nowayHomeAccessDescription");
const glyph=document.getElementById("nowayHomeGoogleGlyph");
const otherLogin=document.getElementById("nowayHomeEmailLogin");
const memberPanel=new URL("painel.html",location.href).href;
let signedIn=false,pending=false,checking=true;

function renderAuthState(isAuthenticated){
  signedIn=Boolean(isAuthenticated);
  checking=false;
  block?.classList.toggle("is-authenticated",signedIn);
  block?.classList.toggle("is-guest",!signedIn);
  block?.classList.remove("is-checking");
  if(glyph)glyph.hidden=signedIn;
  if(otherLogin)otherLogin.hidden=signedIn;
  if(title)title.textContent=signedIn?"SUA CONTA ESTÁ PRONTA.":"TENHA ACESSO À NOWAY.";
  if(description)description.textContent=signedIn?
    "Você já está conectado ao NOWAY ID. Abra seu painel para ver o perfil, acompanhar suas conversas e acessar as funções da sua conta.":
    "Faça login ou crie sua conta com Google para usar o perfil, falar com a organização, acompanhar inscrições e acessar as funções liberadas.";
  if(access){
    access.href=memberPanel;
    access.setAttribute("aria-label",signedIn?
      "Abrir meu painel NOWAY ID":"Login e registro com Google no NOWAY ID");
  }
  if(label&&!pending)label.textContent=signedIn?
    "ABRIR MEU PAINEL":"LOGIN E REGISTRO COM GOOGLE";
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
  if(label)label.textContent="ABRINDO GOOGLE...";
  if(status)status.hidden=true;
  try{
    const {error}=await db.auth.signInWithOAuth({
      provider:"google",
      options:{redirectTo:memberPanel}
    });
    if(error)throw error;
  }catch(err){
    if(status){
      status.textContent="Não foi possível iniciar o login do Google agora. Você também pode entrar por e-mail no NOWAY ID.";
      status.hidden=false;
    }
    console.warn("NOWAY Google sign-in:",err?.message||err);
  }finally{
    pending=false;
    access.classList.remove("is-loading");
    if(!checking)renderAuthState(signedIn);
  }
});
db.auth.onAuthStateChange((event,session)=>{
  if(["INITIAL_SESSION","SIGNED_IN","SIGNED_OUT","TOKEN_REFRESHED","USER_UPDATED"].includes(event)){
    renderAuthState(Boolean(session?.user));
  }
});
db.auth.getSession().then(({data,error})=>{
  if(error)throw error;
  renderAuthState(Boolean(data?.session?.user));
}).catch(()=>{
  // A aparência não concede acesso: as permissões continuam verificadas pelo Supabase.
  // Em caso de rede/sessão indisponível, mantém a opção de login.
  renderAuthState(false);
});
