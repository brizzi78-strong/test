/**
 * The storefront, served as one self-contained document. Talks only to this
 * server's `/api/*`. Design tokens mirror the Cardinal palette used across the
 * other Cardinal apps.
 *
 * Copy rule enforced here: nothing on this page describes CARD as an
 * investment, predicts a price, or promises a return. CARD is presented as a
 * way to pay that costs less — because that is what it is.
 */

export const STOREFRONT_PAGE: string = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Cardinal Books — marketplace</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23A31B33'/%3E%3Ctext x='16' y='23' font-family='system-ui' font-size='19' font-weight='900' text-anchor='middle' fill='white'%3EB%3C/text%3E%3C/svg%3E">
<style>
  :root{--paper:#F7F2E6;--surface:#FFFDF7;--surface-2:#EFE7D3;--ink:#17233F;--muted:#6B6350;--line:#E2D9C3;
    --brand:#A31B33;--brand-strong:#7E1226;--good:#2E7D4F;--good-bg:#E4F0E8;--warn:#9A6410;--warn-bg:#F6ECD6;
    --crit:#B23A3A;--crit-bg:#F6E1DE;--shadow:0 1px 2px rgba(23,35,63,.07),0 10px 26px -14px rgba(23,35,63,.24);
    --font:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;--maxw:1040px;--r:13px;}
  @media (prefers-color-scheme:dark){:root{--paper:#101627;--surface:#172033;--surface-2:#1F2A42;--ink:#F3EEE1;
    --muted:#A9A28F;--line:#2B3855;--brand:#E2586B;--brand-strong:#F27A8B;--good:#4FBE86;--good-bg:#12321f;
    --warn:#D6A24A;--warn-bg:#33280f;--crit:#E07B6E;--crit-bg:#3a1d1a;--shadow:0 1px 2px rgba(0,0,0,.45),0 12px 32px -14px rgba(0,0,0,.65);}}
  :root[data-theme="light"]{--paper:#F7F2E6;--surface:#FFFDF7;--surface-2:#EFE7D3;--ink:#17233F;--muted:#6B6350;--line:#E2D9C3;--brand:#A31B33;--brand-strong:#7E1226;--good:#2E7D4F;--good-bg:#E4F0E8;--warn:#9A6410;--warn-bg:#F6ECD6;--crit:#B23A3A;--crit-bg:#F6E1DE;}
  :root[data-theme="dark"]{--paper:#101627;--surface:#172033;--surface-2:#1F2A42;--ink:#F3EEE1;--muted:#A9A28F;--line:#2B3855;--brand:#E2586B;--brand-strong:#F27A8B;--good:#4FBE86;--good-bg:#12321f;--warn:#D6A24A;--warn-bg:#33280f;--crit:#E07B6E;--crit-bg:#3a1d1a;}
  *{box-sizing:border-box;} body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--font);line-height:1.5;}
  .wrap{max-width:var(--maxw);margin-inline:auto;padding:0 clamp(.9rem,3vw,1.5rem) 3rem;}
  header.top{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--paper) 88%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);}
  .top-in{max-width:var(--maxw);margin-inline:auto;padding:.7rem clamp(.9rem,3vw,1.5rem);display:flex;align-items:center;gap:.6rem;}
  .logo{width:30px;height:30px;border-radius:8px;background:var(--brand);color:#fff;font-weight:900;display:grid;place-items:center;flex:none;}
  h1{font-size:1.05rem;margin:0;font-weight:800;} h1 small{display:block;font-weight:600;font-size:.68rem;color:var(--muted);}
  .cartbtn{margin-left:auto;background:var(--brand);color:#fff;border:0;border-radius:999px;padding:.45rem .9rem;font:inherit;font-weight:700;cursor:pointer;}
  .cartbtn:hover{background:var(--brand-strong);}
  .theme{background:transparent;border:1px solid var(--line);border-radius:8px;color:var(--ink);padding:.35rem .55rem;cursor:pointer;margin-left:.5rem;}
  .banner{display:none;padding:.65rem .85rem;border-radius:10px;margin:.7rem 0;font-size:.87rem;}
  .banner.show{display:block;} .banner.err{background:var(--crit-bg);border:1px solid var(--crit);} .banner.ok{background:var(--good-bg);border:1px solid var(--good);}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--shadow);padding:1rem 1.1rem;margin:.8rem 0;}
  h2{font-size:1rem;margin:.1rem 0 .5rem;} .hint{color:var(--muted);font-size:.83rem;margin:.1rem 0 .7rem;}
  label{display:block;font-size:.72rem;font-weight:700;color:var(--muted);margin:.5rem 0 .2rem;text-transform:uppercase;letter-spacing:.05em;}
  input,select{width:100%;padding:.5rem .6rem;border:1px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink);font:inherit;}
  input:focus,select:focus{outline:2px solid var(--brand);outline-offset:1px;}
  .searchbar{display:grid;grid-template-columns:2fr 1fr auto;gap:.5rem;align-items:end;}
  @media(max-width:620px){.searchbar{grid-template-columns:1fr;}}
  .btn{background:var(--brand);color:#fff;border:0;border-radius:9px;padding:.55rem 1rem;font:inherit;font-weight:700;cursor:pointer;}
  .btn:hover{background:var(--brand-strong);} .btn.ghost{background:transparent;color:var(--brand);border:1px solid var(--line);}
  .btn.small{padding:.32rem .65rem;font-size:.8rem;} .btn.mut{background:transparent;color:var(--muted);border:1px solid var(--line);}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:.8rem;}
  .bookcard{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:.85rem .95rem;display:flex;flex-direction:column;gap:.35rem;}
  .bookcard .t{font-weight:800;line-height:1.25;} .bookcard .a{color:var(--muted);font-size:.86rem;}
  .bookcard .chips{display:flex;flex-wrap:wrap;gap:.25rem;margin-top:.1rem;}
  .chip{background:var(--surface-2);border:1px solid var(--line);border-radius:999px;padding:.1rem .45rem;font-size:.7rem;}
  .offers{margin-top:.4rem;border-top:1px dashed var(--line);padding-top:.4rem;display:flex;flex-direction:column;gap:.3rem;}
  .offer{display:flex;align-items:center;gap:.5rem;font-size:.85rem;}
  .offer .price{font-family:var(--mono);font-weight:700;} .offer .who{color:var(--muted);font-size:.78rem;flex:1;}
  .empty{color:var(--muted);font-size:.86rem;padding:.6rem 0;}
  table{width:100%;border-collapse:collapse;font-size:.88rem;} th,td{text-align:left;padding:.35rem .3rem;border-bottom:1px solid var(--line);}
  th{font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);}
  td.num,th.num{text-align:right;font-family:var(--mono);font-variant-numeric:tabular-nums;}
  .totals{margin-top:.6rem;display:flex;flex-direction:column;gap:.2rem;font-size:.9rem;}
  .totals .row{display:flex;justify-content:space-between;} .totals .row.grand{font-weight:800;font-size:1.05rem;border-top:1px solid var(--line);padding-top:.35rem;margin-top:.2rem;}
  .totals .save{color:var(--good);font-weight:700;}
  .paychoice{display:flex;gap:.5rem;flex-wrap:wrap;margin:.5rem 0;}
  .paychoice label{display:flex;align-items:center;gap:.4rem;border:1px solid var(--line);border-radius:10px;padding:.5rem .7rem;cursor:pointer;text-transform:none;letter-spacing:0;font-size:.88rem;color:var(--ink);font-weight:600;margin:0;flex:1;min-width:190px;}
  .paychoice input{width:auto;}
  .quote{background:var(--surface-2);border-radius:10px;padding:.7rem .8rem;margin-top:.6rem;font-size:.88rem;}
  .quote .amt{font-family:var(--mono);font-weight:800;font-size:1.1rem;}
  .notice{background:var(--warn-bg);border:1px solid color-mix(in srgb,var(--warn) 45%,transparent);border-radius:10px;padding:.65rem .8rem;font-size:.82rem;margin:.7rem 0;}
  footer{color:var(--muted);font-size:.78rem;text-align:center;margin-top:2rem;line-height:1.6;}
</style>
</head>
<body>
<header class="top"><div class="top-in">
  <span class="logo" aria-hidden="true">B</span>
  <h1>Cardinal Books<small>Marketplace — pay in USD or CARD</small></h1>
  <button class="cartbtn" id="cartBtn">Cart (<span id="cartCount">0</span>)</button>
  <button class="theme" id="themeBtn" title="Theme" aria-label="Toggle theme">◐</button>
</div></header>

<div class="wrap">
  <div id="banner" class="banner"></div>

  <section class="card">
    <h2>Browse the catalog</h2>
    <div class="searchbar">
      <div><label for="q">Search title or author</label><input id="q" placeholder="e.g. Cardinal"></div>
      <div><label for="genre">Genre</label><input id="genre" placeholder="any"></div>
      <div><button class="btn" id="searchBtn">Search</button></div>
    </div>
  </section>

  <div id="catalog" class="grid"></div>

  <section class="card" id="cartCard" hidden>
    <h2>Your cart</h2>
    <table id="cartTable"><thead><tr><th>Title</th><th class="num">Price</th><th class="num">Qty</th><th class="num">Line</th><th></th></tr></thead><tbody></tbody></table>
    <div class="totals" id="cartTotals"></div>

    <h2 style="margin-top:1rem">How would you like to pay?</h2>
    <div class="paychoice">
      <label><input type="radio" name="pay" value="usd" checked> Pay in USD</label>
      <label><input type="radio" name="pay" value="card_token"> Pay in CARD <span id="discPill" class="chip"></span></label>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1fr;gap:.3rem .8rem">
      <div><label for="bName">Your name</label><input id="bName" required></div>
      <div><label for="bEmail">Email</label><input id="bEmail" type="email"></div>
    </div>
    <button class="btn" id="placeBtn" style="margin-top:.8rem">Place order</button>

    <div id="payArea"></div>
  </section>

  <div class="notice">
    <strong>About paying in CARD.</strong> CARD is a way to pay for books at a discount — it is
    not an investment, and holding it does not entitle you to a share of any profits. Prices are
    set in US dollars; the CARD amount is calculated at checkout and is good for a short window
    while the rate is current. Payments go from your own wallet directly to the seller — this
    store never holds your funds.
  </div>

  <footer>
    Demonstration marketplace. Book prices are in USD. See BOOKSTORE_PLATFORM_PLAN.md for the
    design decisions behind the payment flow.
  </footer>
</div>

<script>
const $=(id)=>document.getElementById(id);
let books=[],listingsByBook={},cart=[],meta={cardDiscountBps:0},currentOrder=null,currentQuote=null;

function banner(msg,kind){const b=$("banner");b.textContent=msg;b.className="banner show "+(kind||"");if(kind==="ok")setTimeout(()=>{if(b.textContent===msg)b.className="banner";},4000);}
async function api(method,path,body){
  const res=await fetch("/api"+path,{method,headers:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
  const j=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error((j.error&&j.error.message)||("HTTP "+res.status));
  return j;
}
const esc=(s)=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const usd=(cents)=>"$"+(cents/100).toFixed(2);

async function loadCatalog(){
  const params=new URLSearchParams();
  const q=$("q").value.trim(), g=$("genre").value.trim();
  if(q)params.set("q",q); if(g)params.set("genre",g);
  books=await api("GET","/books"+(params.toString()?"?"+params:""));
  listingsByBook={};
  await Promise.all(books.map(async b=>{ listingsByBook[b.id]=await api("GET","/books/"+b.id+"/listings"); }));
  renderCatalog();
}

function renderCatalog(){
  const el=$("catalog");
  if(!books.length){el.innerHTML='<div class="card empty">No books match. Try a different search.</div>';return;}
  el.innerHTML="";
  books.forEach(b=>{
    const offers=(listingsByBook[b.id]||[]).filter(l=>l.active&&l.stock>0);
    const d=document.createElement("div");d.className="bookcard";
    d.innerHTML='<div class="t">'+esc(b.title)+'</div><div class="a">'+esc(b.author)+'</div>'+
      '<div class="chips"><span class="chip">'+esc(b.format)+'</span>'+b.genres.map(g=>'<span class="chip">'+esc(g)+'</span>').join("")+'</div>';
    const wrap=document.createElement("div");wrap.className="offers";
    if(!offers.length){wrap.innerHTML='<div class="empty">Out of stock.</div>';}
    offers.forEach(l=>{
      const row=document.createElement("div");row.className="offer";
      row.innerHTML='<span class="price">'+usd(l.priceCents)+'</span><span class="who">'+esc(l.condition)+' · '+l.stock+' left</span>';
      const btn=document.createElement("button");btn.className="btn small";btn.textContent="Add";
      btn.onclick=()=>addToCart(b,l);
      row.appendChild(btn);wrap.appendChild(row);
    });
    d.appendChild(wrap);el.appendChild(d);
  });
}

function addToCart(book,listing){
  const existing=cart.find(c=>c.listingId===listing.id);
  if(existing){
    if(existing.quantity>=listing.stock){banner("That's all the stock available.","err");return;}
    existing.quantity++;
  } else {
    cart.push({listingId:listing.id,title:book.title,unitPriceCents:listing.priceCents,quantity:1,stock:listing.stock});
  }
  renderCart();banner("Added "+book.title,"ok");
}

function renderCart(){
  $("cartCount").textContent=cart.reduce((n,c)=>n+c.quantity,0);
  const tbody=$("cartTable").querySelector("tbody");tbody.innerHTML="";
  cart.forEach((c,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML='<td>'+esc(c.title)+'</td><td class="num">'+usd(c.unitPriceCents)+'</td><td class="num">'+c.quantity+'</td><td class="num">'+usd(c.unitPriceCents*c.quantity)+'</td>';
    const td=document.createElement("td");
    const rm=document.createElement("button");rm.className="btn small mut";rm.textContent="Remove";
    rm.onclick=()=>{cart.splice(i,1);renderCart();};
    td.appendChild(rm);tr.appendChild(td);tbody.appendChild(tr);
  });
  const subtotal=cart.reduce((n,c)=>n+c.unitPriceCents*c.quantity,0);
  const method=document.querySelector('input[name="pay"]:checked').value;
  const discount=method==="card_token"?Math.floor(subtotal*meta.cardDiscountBps/10000):0;
  $("cartTotals").innerHTML=
    '<div class="row"><span>Subtotal</span><span>'+usd(subtotal)+'</span></div>'+
    (discount?'<div class="row save"><span>CARD discount</span><span>−'+usd(discount)+'</span></div>':'')+
    '<div class="row grand"><span>Total</span><span>'+usd(subtotal-discount)+'</span></div>';
  $("cartCard").hidden=cart.length===0;
}

$("cartBtn").onclick=()=>{ if(!cart.length){banner("Your cart is empty.","err");return;} $("cartCard").hidden=false; $("cartCard").scrollIntoView({behavior:"smooth"}); };
$("searchBtn").onclick=()=>loadCatalog().catch(e=>banner(e.message,"err"));
$("q").addEventListener("keydown",e=>{if(e.key==="Enter")$("searchBtn").click();});
document.querySelectorAll('input[name="pay"]').forEach(r=>r.onchange=()=>{renderCart();$("payArea").innerHTML="";});

$("placeBtn").onclick=async()=>{
  const buyerName=$("bName").value.trim();
  if(!buyerName){banner("Please enter your name.","err");return;}
  if(!cart.length){banner("Your cart is empty.","err");return;}
  const paymentMethod=document.querySelector('input[name="pay"]:checked').value;
  try{
    currentOrder=await api("POST","/orders",{buyerName,buyerEmail:$("bEmail").value.trim()||undefined,
      paymentMethod,items:cart.map(c=>({listingId:c.listingId,quantity:c.quantity}))});
    cart=[];renderCart();$("cartCard").hidden=false;
    banner("Order "+currentOrder.id+" placed — "+usd(currentOrder.totalCents)+" due.","ok");
    renderPayArea();
  }catch(err){banner(err.message,"err");}
};

function renderPayArea(){
  const el=$("payArea");
  if(!currentOrder){el.innerHTML="";return;}
  if(currentOrder.paymentMethod==="usd"){
    el.innerHTML='<div class="quote"><strong>Order placed.</strong> Total due: <span class="amt">'+usd(currentOrder.totalCents)+'</span><br><span class="hint">A USD checkout rail is not wired up in this demo; the order is recorded as awaiting payment.</span></div>';
    return;
  }
  el.innerHTML='<div class="quote"><strong>Pay in CARD</strong><div class="hint" style="margin:.3rem 0">Get a quote, send the CARD from your own wallet, then paste the transaction hash below.</div>'+
    '<label for="rate">Rate (US cents per 1 CARD)</label><input id="rate" type="number" step="0.000001" placeholder="e.g. 0.15">'+
    '<button class="btn small" id="quoteBtn" style="margin-top:.5rem">Get quote</button><div id="quoteOut"></div></div>';
  $("quoteBtn").onclick=async()=>{
    const centsPerCard=Number($("rate").value);
    if(!(centsPerCard>0)){banner("Enter a rate greater than zero.","err");return;}
    try{
      currentQuote=await api("POST","/orders/"+currentOrder.id+"/quote",{centsPerCard});
      $("quoteOut").innerHTML='<div style="margin-top:.6rem">Send <span class="amt">'+esc(currentQuote.cardAmount)+' CARD</span>'+
        '<div class="hint">for '+usd(currentQuote.usdCents)+' · quote expires '+new Date(currentQuote.expiresAt).toLocaleTimeString()+'</div>'+
        '<label for="txh">Transaction hash</label><input id="txh" placeholder="0x…">'+
        '<button class="btn small" id="payBtn" style="margin-top:.5rem">Submit payment</button></div>';
      $("payBtn").onclick=async()=>{
        try{
          currentOrder=await api("POST","/orders/"+currentOrder.id+"/card-payment",{quoteId:currentQuote.id,txHash:$("txh").value.trim()});
          banner("Payment recorded. It will be confirmed once the transaction is seen on-chain.","ok");
          $("quoteOut").innerHTML='<div class="hint" style="margin-top:.6rem">Recorded transaction '+esc(currentOrder.cardPayment.txHash)+' — awaiting on-chain confirmation.</div>';
        }catch(err){banner(err.message,"err");}
      };
    }catch(err){banner(err.message,"err");}
  };
}

$("themeBtn").onclick=()=>{const c=document.documentElement.getAttribute("data-theme");const n=c==="dark"?"light":c==="light"?"":"dark";if(n)document.documentElement.setAttribute("data-theme",n);else document.documentElement.removeAttribute("data-theme");};

async function boot(){
  try{
    meta=await api("GET","/meta");
    $("discPill").textContent=(meta.cardDiscountBps/100)+"% off";
    await loadCatalog();
    renderCart();
  }catch(err){banner(err.message,"err");}
}
boot();
</script>
</body>
</html>`;
