const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;
const PILOT_USER = process.env.PILOT_USER || 'pilot';
const PILOT_PASSWORD = process.env.PILOT_PASSWORD || '';

app.disable('x-powered-by');
app.use(express.json({limit:'1mb'}));

// Temporary pilot access gate. Replace with SSO/role-based auth before enterprise rollout.
app.use((req,res,next)=>{
  if(req.path === '/api/health') return next();
  if(!PILOT_PASSWORD) return next();
  const auth = req.headers.authorization || '';
  if(auth.startsWith('Basic ')){
    try{
      const [user,pass] = Buffer.from(auth.slice(6),'base64').toString('utf8').split(':');
      if(user === PILOT_USER && pass === PILOT_PASSWORD) return next();
    }catch(e){}
  }
  res.set('WWW-Authenticate','Basic realm="ExpiryRx Pilot"');
  return res.status(401).send('ExpiryRx pilot access required');
});

app.use(express.static(path.join(__dirname,'public')));

const dbUrl = process.env.DATABASE_URL || '';
const pool = dbUrl ? new Pool({ connectionString: dbUrl, ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized:false } }) : null;
const useMemory = !pool;

const todayPlus = days => { const d=new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };
const id = () => crypto.randomUUID();
let memory = {
  stores:[
    {id:'S101',name:'Pilot Pharmacy #101 — Raleigh',city:'Raleigh, NC'},
    {id:'S207',name:'Pilot Pharmacy #207 — Durham',city:'Durham, NC'},
    {id:'S331',name:'Pilot Pharmacy #331 — Cary',city:'Cary, NC'}
  ],
  inventory:[
    {id:id(),store_id:'S101',name:'Ozempic 2 mg',gtin:'00301694772127',lot:'OZ24091',exp:todayPlus(42),qty:8,location:'Refrigerator 1',unit_value:900,monthly_velocity:1,status:'active'},
    {id:id(),store_id:'S101',name:'Mounjaro 10 mg',gtin:'00300021471805',lot:'MJ7712',exp:todayPlus(24),qty:2,location:'Refrigerator 2',unit_value:1050,monthly_velocity:2,status:'active'},
    {id:id(),store_id:'S101',name:'Eliquis 5 mg',gtin:'00300030894218',lot:'EL551A',exp:todayPlus(73),qty:3,location:'Shelf C4',unit_value:520,monthly_velocity:4,status:'active'},
    {id:id(),store_id:'S207',name:'Ozempic 2 mg',gtin:'00301694772127',lot:'OZ25010',exp:todayPlus(190),qty:4,location:'Refrigerator 1',unit_value:900,monthly_velocity:11,status:'active'},
    {id:id(),store_id:'S207',name:'Mounjaro 10 mg',gtin:'00300021471805',lot:'MJ8091',exp:todayPlus(150),qty:7,location:'Refrigerator 1',unit_value:1050,monthly_velocity:9,status:'active'}
  ],
  audit:[], transfers:[]
};

function daysTo(exp){ return Math.ceil((new Date(exp+'T23:59:59Z')-new Date())/86400000); }
function riskLabel(exp){ const d=daysTo(exp); if(d<0)return 'EXPIRED'; if(d<=30)return 'REMOVE/RETURN'; if(d<=60)return 'MANAGER ALERT'; if(d<=90)return 'PRIORITY'; if(d<=120)return 'TRANSFER/USE-FIRST'; if(d<=180)return 'WATCH'; return 'OK'; }
function log(action,detail,store_id='SYSTEM',role='Pharmacist'){
  memory.audit.unshift({id:id(),ts:new Date().toISOString(),action,detail,store_id,role});
  memory.audit=memory.audit.slice(0,500);
}

async function initDb(){
  if(!pool) return;
  await pool.query(`
    create table if not exists stores(id text primary key,name text not null,city text not null);
    create table if not exists inventory(
      id uuid primary key, store_id text references stores(id), name text not null, gtin text, lot text not null,
      exp date not null, qty integer not null check(qty>=0), location text, unit_value numeric(12,2) default 0,
      monthly_velocity numeric(12,2) default 0, status text default 'active', verified_at timestamptz, created_at timestamptz default now()
    );
    create table if not exists audit(id uuid primary key, ts timestamptz default now(), action text, detail text, store_id text, role text);
    create table if not exists transfers(id uuid primary key, ts timestamptz default now(), item_name text, from_store text, to_store text, qty integer, protected_value numeric(12,2), status text);
    create index if not exists idx_inventory_exp on inventory(exp);
    create index if not exists idx_inventory_store on inventory(store_id);
    create index if not exists idx_inventory_name on inventory(name);
  `);
  const c = await pool.query('select count(*)::int as c from stores');
  if(c.rows[0].c===0){
    for(const s of memory.stores) await pool.query('insert into stores(id,name,city) values($1,$2,$3)',[s.id,s.name,s.city]);
    for(const x of memory.inventory) await pool.query('insert into inventory(id,store_id,name,gtin,lot,exp,qty,location,unit_value,monthly_velocity,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[x.id,x.store_id,x.name,x.gtin,x.lot,x.exp,x.qty,x.location,x.unit_value,x.monthly_velocity,x.status]);
  }
}

async function allData(){
  if(useMemory) return {stores:memory.stores,inventory:memory.inventory,audit:memory.audit,transfers:memory.transfers};
  const [s,i,a,t]=await Promise.all([
    pool.query('select * from stores order by id'),
    pool.query("select *, exp::text from inventory where qty>0 order by exp asc"),
    pool.query('select * from audit order by ts desc limit 500'),
    pool.query('select * from transfers order by ts desc limit 200')
  ]);
  return {stores:s.rows,inventory:i.rows,audit:a.rows,transfers:t.rows};
}

app.get('/api/health', async (req,res)=>{
  let db='memory';
  if(pool){ try{ await pool.query('select 1'); db='postgres'; }catch(e){ db='postgres-error'; } }
  res.json({ok:true,service:'ExpiryRx',db,auth:!!PILOT_PASSWORD,time:new Date().toISOString()});
});

app.get('/api/state', async (req,res)=>{
  const data=await allData();
  data.inventory=data.inventory.map(x=>({...x,days_to_expiry:daysTo(String(x.exp).slice(0,10)),risk:riskLabel(String(x.exp).slice(0,10))}));
  res.json(data);
});

app.post('/api/inventory', async (req,res)=>{
  const x=req.body||{};
  if(!x.store_id||!x.name||!x.lot||!x.exp||!Number.isFinite(Number(x.qty))||Number(x.qty)<1) return res.status(400).json({error:'Missing required inventory fields'});
  const row={id:id(),store_id:x.store_id,name:String(x.name).trim(),gtin:String(x.gtin||'').trim(),lot:String(x.lot).trim(),exp:String(x.exp).slice(0,10),qty:Number(x.qty),location:String(x.location||'').trim(),unit_value:Number(x.unit_value||0),monthly_velocity:Number(x.monthly_velocity||0),status:'active'};
  if(useMemory){ memory.inventory.push(row); log('Inventory Received',`${row.qty} ${row.name}, lot ${row.lot}, expires ${row.exp}`,row.store_id,x.role||'Pharmacist'); }
  else {
    await pool.query('insert into inventory(id,store_id,name,gtin,lot,exp,qty,location,unit_value,monthly_velocity,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[row.id,row.store_id,row.name,row.gtin,row.lot,row.exp,row.qty,row.location,row.unit_value,row.monthly_velocity,row.status]);
    await pool.query('insert into audit(id,action,detail,store_id,role) values($1,$2,$3,$4,$5)',[id(),'Inventory Received',`${row.qty} ${row.name}, lot ${row.lot}, expires ${row.exp}`,row.store_id,x.role||'Pharmacist']);
  }
  res.status(201).json(row);
});

app.post('/api/inventory/:id/action', async (req,res)=>{
  const action=String(req.body.action||''); const role=req.body.role||'Pharmacist'; const itemId=req.params.id;
  const destructive=['return','destroy'];
  if(!['dispense','return','quarantine','destroy','verify'].includes(action)) return res.status(400).json({error:'Invalid action'});
  if(useMemory){
    const x=memory.inventory.find(v=>v.id===itemId); if(!x)return res.status(404).json({error:'Not found'});
    if(action==='dispense') x.qty=Math.max(0,x.qty-1);
    if(action==='quarantine') x.status='quarantined';
    if(action==='verify') x.verified_at=new Date().toISOString();
    if(destructive.includes(action)) x.qty=0;
    log(action.toUpperCase(),`${x.name} lot ${x.lot}`,x.store_id,role);
    memory.inventory=memory.inventory.filter(v=>v.qty>0);
  } else {
    const q=await pool.query('select * from inventory where id=$1',[itemId]); if(!q.rows.length)return res.status(404).json({error:'Not found'}); const x=q.rows[0];
    if(action==='dispense') await pool.query('update inventory set qty=greatest(0,qty-1) where id=$1',[itemId]);
    if(action==='quarantine') await pool.query("update inventory set status='quarantined' where id=$1",[itemId]);
    if(action==='verify') await pool.query('update inventory set verified_at=now() where id=$1',[itemId]);
    if(destructive.includes(action)) await pool.query('update inventory set qty=0 where id=$1',[itemId]);
    await pool.query('insert into audit(id,action,detail,store_id,role) values($1,$2,$3,$4,$5)',[id(),action.toUpperCase(),`${x.name} lot ${x.lot}`,x.store_id,role]);
  }
  res.json({ok:true});
});

app.get('/api/transfers/suggestions', async (req,res)=>{
  const data=await allData(); const inv=data.inventory.filter(x=>Number(x.qty)>1 && daysTo(String(x.exp).slice(0,10))<=120 && x.status==='active');
  const out=[];
  for(const x of inv){
    const same=data.inventory.filter(y=>y.name===x.name && y.store_id!==x.store_id).sort((a,b)=>Number(b.monthly_velocity)-Number(a.monthly_velocity));
    if(!same.length)continue; const dest=same[0]; if(Number(dest.monthly_velocity)<=Number(x.monthly_velocity))continue;
    const qty=Math.max(1,Math.min(Number(x.qty)-1,Math.ceil(Number(x.qty)*.75)));
    out.push({item_id:x.id,name:x.name,from_store:x.store_id,to_store:dest.store_id,qty,days:daysTo(String(x.exp).slice(0,10)),protected_value:qty*Number(x.unit_value||0),source_velocity:Number(x.monthly_velocity||0),dest_velocity:Number(dest.monthly_velocity||0)});
  }
  res.json(out.sort((a,b)=>b.protected_value-a.protected_value));
});

app.post('/api/transfers', async (req,res)=>{
  const {item_id,to_store,qty,role='Pharmacy Manager'}=req.body; const n=Number(qty);
  if(!item_id||!to_store||!n||n<1)return res.status(400).json({error:'Invalid transfer'});
  if(useMemory){
    const x=memory.inventory.find(v=>v.id===item_id); if(!x||x.qty<n)return res.status(400).json({error:'Insufficient quantity'});
    const from=x.store_id; x.qty-=n; const moved={...x,id:id(),store_id:to_store,qty:n,location:'Transfer Receiving'}; memory.inventory.push(moved); if(x.qty<=0)memory.inventory=memory.inventory.filter(v=>v.id!==item_id);
    const tr={id:id(),ts:new Date().toISOString(),item_name:x.name,from_store:from,to_store,qty:n,protected_value:n*Number(x.unit_value||0),status:'Approved'}; memory.transfers.unshift(tr); log('TRANSFER APPROVED',`${n} ${x.name}: ${from} → ${to_store}`,from,role); res.json(tr);
  } else {
    const client=await pool.connect(); try{ await client.query('begin'); const q=await client.query('select * from inventory where id=$1 for update',[item_id]); if(!q.rows.length||Number(q.rows[0].qty)<n)throw new Error('Insufficient quantity'); const x=q.rows[0]; await client.query('update inventory set qty=qty-$1 where id=$2',[n,item_id]); const newId=id(); await client.query('insert into inventory(id,store_id,name,gtin,lot,exp,qty,location,unit_value,monthly_velocity,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[newId,to_store,x.name,x.gtin,x.lot,x.exp,n,'Transfer Receiving',x.unit_value,x.monthly_velocity,x.status]); const trId=id(); await client.query('insert into transfers(id,item_name,from_store,to_store,qty,protected_value,status) values($1,$2,$3,$4,$5,$6,$7)',[trId,x.name,x.store_id,to_store,n,n*Number(x.unit_value||0),'Approved']); await client.query('insert into audit(id,action,detail,store_id,role) values($1,$2,$3,$4,$5)',[id(),'TRANSFER APPROVED',`${n} ${x.name}: ${x.store_id} → ${to_store}`,x.store_id,role]); await client.query('commit'); res.json({id:trId,status:'Approved'}); }catch(e){await client.query('rollback');res.status(400).json({error:e.message})}finally{client.release()}
  }
});

app.get('/api/roi', async (req,res)=>{
  const d=await allData(); const inv=d.inventory.filter(x=>Number(x.qty)>0); const risk90=inv.filter(x=>daysTo(String(x.exp).slice(0,10))<=90).reduce((s,x)=>s+Number(x.qty)*Number(x.unit_value||0),0); const protectedValue=d.transfers.reduce((s,t)=>s+Number(t.protected_value||0),0); const verified=d.audit.filter(a=>a.action==='VERIFY'||a.action==='MONTHLY VERIFICATION').length; const estMinutesSaved=verified*3; res.json({inventory_at_risk_90:risk90,inventory_protected:protectedValue,successful_transfers:d.transfers.length,estimated_staff_minutes_saved:estMinutesSaved});
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

initDb().then(()=>app.listen(PORT,()=>console.log(`ExpiryRx listening on ${PORT}; storage=${useMemory?'memory':'postgres'}; auth=${!!PILOT_PASSWORD}`))).catch(err=>{ console.error(err); process.exit(1); });
