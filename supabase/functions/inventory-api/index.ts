import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-session-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const enc=new TextEncoder();
const hex=(value:ArrayBuffer)=>[...new Uint8Array(value)].map((b)=>b.toString(16).padStart(2,"0")).join("");
const sha=async(value:string)=>hex(await crypto.subtle.digest("SHA-256",enc.encode(value)));
const clean=(value:unknown,max=500)=>String(value??"").trim().slice(0,max);
const num=(value:unknown)=>Number(value??0);

async function context(req:Request){
  const raw=req.headers.get("x-session-token")||"";
  if(!raw)return null;
  const tokenHash=await sha(raw),now=new Date().toISOString();
  const session=(await db.from("app_sessions").select("id,user_id,expires_at").eq("token_hash",tokenHash).gt("expires_at",now).maybeSingle()).data;
  if(!session)return null;
  const user=(await db.from("app_users").select("id,business_id,name,username,role,active").eq("id",session.user_id).eq("active",true).maybeSingle()).data;
  if(!user)return null;
  await db.from("app_sessions").update({last_seen_at:now}).eq("id",session.id);
  return {session,user,businessId:user.business_id};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Método no permitido"},405);
  let body:any={};
  try{body=await req.json()}catch{return json({error:"JSON inválido"},400)}
  const action=clean(body?.action,60);
  try{
    if(action==="health")return json({ok:true,service:"inventory-api",version:1,purchases:true,weightedAverageCost:true,adjustments:true,cfdiUntouched:true});
    const ctx=await context(req);
    if(!ctx)return json({error:"Sesión inválida o vencida"},401);
    if(!["admin","seller"].includes(ctx.user.role))return json({error:"Usuario no autorizado"},403);

    if(action==="receivePurchase"){
      if(ctx.user.role!=="admin")return json({error:"Solo el administrador puede registrar entradas de mercancía"},403);
      const supplierId=clean(body?.supplierId,80);
      const notes=clean(body?.notes,500);
      const items=Array.isArray(body?.items)?body.items:[];
      if(!supplierId||!items.length)return json({error:"Selecciona proveedor y productos"},400);
      if(items.length>500)return json({error:"Máximo 500 productos por entrada"},400);
      const normalized=items.map((item:any)=>({product_id:clean(item?.product_id||item?.productId,80),qty:num(item?.qty),unit_cost:num(item?.unit_cost??item?.unitCost),iva_rate:num(item?.iva_rate??item?.ivaRate)}));
      const result=await db.rpc("solrak_receive_purchase",{p_business_id:ctx.businessId,p_user_id:ctx.user.id,p_supplier_id:supplierId,p_items:normalized,p_notes:notes||null});
      if(result.error)return json({error:result.error.message||"No se pudo registrar la entrada",code:result.error.code||null},409);
      return json(result.data||{ok:true});
    }

    if(action==="adjustStock"){
      if(ctx.user.role!=="admin")return json({error:"Solo el administrador puede ajustar inventario"},403);
      const productId=clean(body?.productId,80),reason=clean(body?.reason,500),quantityDelta=num(body?.quantityDelta);
      if(!productId||!reason||!Number.isFinite(quantityDelta)||quantityDelta===0)return json({error:"Producto, cantidad y motivo son obligatorios"},400);
      const result=await db.rpc("solrak_adjust_inventory",{p_business_id:ctx.businessId,p_user_id:ctx.user.id,p_product_id:productId,p_quantity_delta:quantityDelta,p_reason:reason});
      if(result.error)return json({error:result.error.message||"No se pudo ajustar el inventario",code:result.error.code||null},409);
      return json(result.data||{ok:true});
    }

    if(action==="recentPurchases"){
      const limit=Math.min(Math.max(Number(body?.limit)||30,1),100);
      const orders=await db.from("purchase_orders").select("id,supplier_id,order_number,status,subtotal,iva,total,ordered_at,received_at,notes,created_at").eq("business_id",ctx.businessId).order("created_at",{ascending:false}).limit(limit);
      if(orders.error)throw orders.error;
      const supplierIds=[...new Set((orders.data||[]).map((row:any)=>row.supplier_id).filter(Boolean))];
      const supplierRows=supplierIds.length?(await db.from("suppliers").select("id,name").eq("business_id",ctx.businessId).in("id",supplierIds)).data||[]:[];
      const names=new Map(supplierRows.map((row:any)=>[row.id,row.name]));
      return json({ok:true,purchases:(orders.data||[]).map((row:any)=>({...row,supplier_name:names.get(row.supplier_id)||"Proveedor"}))});
    }

    if(action==="lowStock"){
      const products=await db.from("products").select("id,code,name,category,stock,min_stock,unit,cost,price,wholesale").eq("business_id",ctx.businessId).eq("active",true).order("name").limit(5000);
      if(products.error)throw products.error;
      const rows=(products.data||[]).filter((p:any)=>num(p.stock)<=num(p.min_stock));
      return json({ok:true,products:rows,total:rows.length});
    }

    return json({error:"Acción desconocida"},400);
  }catch(error:any){
    console.error("inventory-api",error);
    return json({error:"Error del servidor",detail:String(error?.message||error).slice(0,400)},500);
  }
});
