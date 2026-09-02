import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-session-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const encoder = new TextEncoder();
const hex = (value: ArrayBuffer) =>
  [...new Uint8Array(value)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
const sha = async (value: string) =>
  hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
const clean = (value: unknown, max = 500) =>
  String(value ?? "").trim().slice(0, max);
const num = (value: unknown) => Number(value ?? 0);

async function context(req: Request) {
  const raw = req.headers.get("x-session-token") || "";
  if (!raw) return null;
  const tokenHash = await sha(raw);
  const now = new Date().toISOString();
  const session = (
    await db
      .from("app_sessions")
      .select("id,user_id,expires_at")
      .eq("token_hash", tokenHash)
      .gt("expires_at", now)
      .maybeSingle()
  ).data;
  if (!session) return null;
  const user = (
    await db
      .from("app_users")
      .select("id,business_id,name,username,role,active")
      .eq("id", session.user_id)
      .eq("active", true)
      .maybeSingle()
  ).data;
  if (!user) return null;
  const business = (
    await db
      .from("businesses")
      .select("id,name,code,phone,address,logo_path")
      .eq("id", user.business_id)
      .maybeSingle()
  ).data;
  if (!business) return null;
  await db
    .from("app_sessions")
    .update({ last_seen_at: now })
    .eq("id", session.id);
  return { session, user, business };
}

async function ensureBase(ctx: any) {
  await db
    .from("pos_settings")
    .upsert(
      { business_id: ctx.business.id },
      { onConflict: "business_id", ignoreDuplicates: true },
    );
  let registers =
    (
      await db
        .from("cash_registers")
        .select("id,code,name,active")
        .eq("business_id", ctx.business.id)
        .eq("active", true)
        .order("created_at")
    ).data || [];
  if (!registers.length) {
    const created = await db
      .from("cash_registers")
      .insert({
        business_id: ctx.business.id,
        code: "CAJA1",
        name: "Caja 1",
        created_by: ctx.user.id,
      })
      .select("id,code,name,active")
      .single();
    if (created.error) throw created.error;
    registers = [created.data];
    await db.from("audit_logs").insert({
      business_id: ctx.business.id,
      user_id: ctx.user.id,
      action: "pos.register.create_default",
      entity_type: "cash_register",
      entity_id: created.data.id,
      details: { code: "CAJA1" },
    });
  }
  return registers;
}

async function expectedCash(ctx: any, session: any) {
  const sales =
    (
      await db
        .from("sales")
        .select("id")
        .eq("business_id", ctx.business.id)
        .eq("cash_session_id", session.id)
        .eq("status", "completed")
    ).data || [];
  const saleIds = sales.map((sale: any) => sale.id);
  let cashSales = 0;
  if (saleIds.length) {
    const payments =
      (
        await db
          .from("sale_payments")
          .select("amount")
          .eq("business_id", ctx.business.id)
          .eq("method", "cash")
          .in("sale_id", saleIds)
      ).data || [];
    cashSales = payments.reduce(
      (sum: number, payment: any) => sum + num(payment.amount),
      0,
    );
  }
  const movements =
    (
      await db
        .from("cash_movements")
        .select("movement_type,amount")
        .eq("business_id", ctx.business.id)
        .eq("cash_session_id", session.id)
    ).data || [];
  let manual = 0;
  for (const movement of movements) {
    const amount = num(movement.amount);
    manual +=
      movement.movement_type === "income" ||
      movement.movement_type === "deposit"
        ? amount
        : -amount;
  }
  return Math.round(
    (num(session.opening_amount) + cashSales + manual) * 100,
  ) / 100;
}

async function userNames(businessId: string, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map<string, string>();
  const rows =
    (
      await db
        .from("app_users")
        .select("id,name")
        .eq("business_id", businessId)
        .in("id", unique)
    ).data || [];
  return new Map(rows.map((row: any) => [row.id, row.name]));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  const action = clean(body?.action, 60);
  try {
    if (action === "health")
      return json({
        ok: true,
        service: "pos-api",
        version: 1,
        capabilitiesVersion: 2,
        atomicSale: true,
        stockMovements: true,
        cashSessions: true,
        customProducts: true,
        returns: true,
        voids: true,
        credits: true,
        promotions: true,
        cfdiUntouched: true,
      });

    const ctx = await context(req);
    if (!ctx) return json({ error: "Sesión inválida o vencida" }, 401);
    if (!["admin", "seller"].includes(ctx.user.role))
      return json({ error: "Usuario no autorizado" }, 403);

    if (action === "bootstrap") {
      const registers = await ensureBase(ctx);
      const openSessions =
        (
          await db
            .from("cash_sessions")
            .select(
              "id,register_id,opened_by,opened_at,opening_amount,status",
            )
            .eq("business_id", ctx.business.id)
            .eq("status", "open")
            .order("opened_at", { ascending: false })
        ).data || [];
      const own =
        openSessions.find((item: any) => item.opened_by === ctx.user.id) ||
        null;
      const recent =
        (
          await db
            .from("sales")
            .select(
              "id,sale_number,total,status,return_status,created_at,customer_name,created_by,notes",
            )
            .eq("business_id", ctx.business.id)
            .order("created_at", { ascending: false })
            .limit(30)
        ).data || [];
      const names = await userNames(
        ctx.business.id,
        recent.map((sale: any) => sale.created_by),
      );
      const supplierCount =
        (
          await db
            .from("suppliers")
            .select("id", { count: "exact", head: true })
            .eq("business_id", ctx.business.id)
            .eq("active", true)
        ).count || 0;
      const promotions =
        (
          await db
            .from("product_promotions")
            .select(
              "id,product_id,name,discount_type,value,starts_at,ends_at,active,created_at",
            )
            .eq("business_id", ctx.business.id)
            .eq("active", true)
        ).data || [];
      return json({
        ok: true,
        business: ctx.business,
        user: { id: ctx.user.id, name: ctx.user.name, role: ctx.user.role },
        registers,
        openSession: own,
        openSessions,
        recentSales: recent.map((sale: any) => ({
          ...sale,
          created_by_name: names.get(sale.created_by) || "Usuario",
        })),
        promotions,
        supplierCount,
      });
    }

    if (action === "openCash") {
      const registers = await ensureBase(ctx);
      const registerId = clean(body?.registerId, 80) || registers[0]?.id;
      const openingAmount = Math.round(num(body?.openingAmount) * 100) / 100;
      if (openingAmount < 0)
        return json({ error: "El fondo inicial no puede ser negativo" }, 400);
      const register = registers.find((item: any) => item.id === registerId);
      if (!register) return json({ error: "Caja inválida" }, 400);
      const existing = (
        await db
          .from("cash_sessions")
          .select("id,opened_by,opened_at,opening_amount,status")
          .eq("register_id", registerId)
          .eq("status", "open")
          .maybeSingle()
      ).data;
      if (existing) {
        if (existing.opened_by === ctx.user.id)
          return json({ ok: true, alreadyOpen: true, session: existing });
        return json(
          { error: "Esta caja ya tiene una sesión abierta por otro usuario" },
          409,
        );
      }
      const created = await db
        .from("cash_sessions")
        .insert({
          business_id: ctx.business.id,
          register_id: registerId,
          opened_by: ctx.user.id,
          opening_amount: openingAmount,
        })
        .select("id,register_id,opened_by,opened_at,opening_amount,status")
        .single();
      if (created.error) throw created.error;
      await db.from("audit_logs").insert({
        business_id: ctx.business.id,
        user_id: ctx.user.id,
        action: "pos.cash.open",
        entity_type: "cash_session",
        entity_id: created.data.id,
        details: { register_id: registerId, opening_amount: openingAmount },
      });
      return json({ ok: true, session: created.data });
    }

    if (action === "addCashMovement") {
      if (ctx.user.role !== "admin")
        return json(
          {
            error:
              "Solo el administrador puede registrar movimientos manuales de caja",
          },
          403,
        );
      const cashSessionId = clean(body?.cashSessionId, 80);
      const movementType = clean(body?.movementType, 30);
      const amount = Math.round(num(body?.amount) * 100) / 100;
      const concept = clean(body?.concept, 240);
      const reference = clean(body?.reference, 160);
      if (!["income", "expense", "withdrawal", "deposit"].includes(movementType))
        return json({ error: "Tipo de movimiento inválido" }, 400);
      if (amount <= 0 || !concept)
        return json({ error: "Escribe un importe y concepto válidos" }, 400);
      const open = (
        await db
          .from("cash_sessions")
          .select("id")
          .eq("id", cashSessionId)
          .eq("business_id", ctx.business.id)
          .eq("status", "open")
          .maybeSingle()
      ).data;
      if (!open) return json({ error: "La caja no está abierta" }, 409);
      const created = await db
        .from("cash_movements")
        .insert({
          business_id: ctx.business.id,
          cash_session_id: cashSessionId,
          movement_type: movementType,
          amount,
          concept,
          reference: reference || null,
          created_by: ctx.user.id,
        })
        .select("*")
        .single();
      if (created.error) throw created.error;
      await db.from("audit_logs").insert({
        business_id: ctx.business.id,
        user_id: ctx.user.id,
        action: "pos.cash.movement",
        entity_type: "cash_movement",
        entity_id: created.data.id,
        details: { type: movementType, amount, concept },
      });
      return json({ ok: true, movement: created.data });
    }

    if (action === "closeCash") {
      const cashSessionId = clean(body?.cashSessionId, 80);
      const countedCash = Math.round(num(body?.countedCash) * 100) / 100;
      const notes = clean(body?.notes, 500);
      if (countedCash < 0)
        return json({ error: "El efectivo contado no puede ser negativo" }, 400);
      const open = (
        await db
          .from("cash_sessions")
          .select("*")
          .eq("id", cashSessionId)
          .eq("business_id", ctx.business.id)
          .eq("status", "open")
          .maybeSingle()
      ).data;
      if (!open)
        return json({ error: "No existe una sesión de caja abierta" }, 409);
      if (ctx.user.role !== "admin" && open.opened_by !== ctx.user.id)
        return json(
          { error: "Solo quien abrió la caja o el administrador puede cerrarla" },
          403,
        );
      const expected = await expectedCash(ctx, open);
      const difference = Math.round((countedCash - expected) * 100) / 100;
      const closedAt = new Date().toISOString();
      const updated = await db
        .from("cash_sessions")
        .update({
          status: "closed",
          closed_by: ctx.user.id,
          closed_at: closedAt,
          expected_cash: expected,
          counted_cash: countedCash,
          difference,
          notes: notes || null,
        })
        .eq("id", open.id)
        .eq("status", "open")
        .select("*")
        .single();
      if (updated.error) throw updated.error;
      await db.from("audit_logs").insert({
        business_id: ctx.business.id,
        user_id: ctx.user.id,
        action: "pos.cash.close",
        entity_type: "cash_session",
        entity_id: open.id,
        details: {
          expected_cash: expected,
          counted_cash: countedCash,
          difference,
        },
      });
      return json({ ok: true, session: updated.data });
    }

    if (action === "completeSale") {
      const cashSessionId = clean(body?.cashSessionId, 80);
      const items = Array.isArray(body?.items) ? body.items : [];
      const payments = Array.isArray(body?.payments) ? body.payments : [];
      if (!cashSessionId || !items.length || !payments.length)
        return json(
          { error: "Faltan caja, productos o forma de pago" },
          400,
        );
      if (
        items.some(
          (item: any) =>
            (!item?.product_id || item?.custom === true) &&
            !clean(item?.name, 180),
        )
      )
        return json(
          { error: "Escribe el nombre de cada producto común" },
          400,
        );
      const result = await db.rpc("pos_complete_sale", {
        p_business_id: ctx.business.id,
        p_user_id: ctx.user.id,
        p_cash_session_id: cashSessionId,
        p_items: items,
        p_payments: payments,
        p_client_id: body?.clientId || null,
        p_notes: clean(body?.notes, 500) || null,
        p_quote_id: body?.quoteId || null,
      });
      if (result.error)
        return json(
          {
            error: result.error.message || "No se pudo completar la venta",
            code: result.error.code || null,
          },
          409,
        );
      return json(result.data || { ok: true });
    }

    if (action === "recentSales") {
      const limit = Math.min(Math.max(Number(body?.limit) || 30, 1), 100);
      const result = await db
        .from("sales")
        .select(
          "id,sale_number,client_id,customer_name,subtotal,iva,total,currency,status,return_status,notes,void_reason,created_by,created_at",
        )
        .eq("business_id", ctx.business.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (result.error) throw result.error;
      const names = await userNames(
        ctx.business.id,
        (result.data || []).map((sale: any) => sale.created_by),
      );
      return json({
        ok: true,
        sales: (result.data || []).map((sale: any) => ({
          ...sale,
          created_by_name: names.get(sale.created_by) || "Usuario",
        })),
      });
    }

    if (action === "findSale") {
      const saleNumber = Number(clean(body?.saleNumber, 30).replace(/^#/, ""));
      if (!Number.isSafeInteger(saleNumber) || saleNumber <= 0)
        return json({ error: "Número de ticket inválido" }, 400);
      const result = await db
        .from("sales")
        .select("*")
        .eq("business_id", ctx.business.id)
        .eq("sale_number", saleNumber)
        .maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) return json({ error: "Ticket no encontrado" }, 404);
      return json({ ok: true, sale: result.data });
    }

    if (action === "saleDetail") {
      const saleId = clean(body?.saleId, 80);
      const sale = await db
        .from("sales")
        .select("*")
        .eq("id", saleId)
        .eq("business_id", ctx.business.id)
        .maybeSingle();
      if (sale.error) throw sale.error;
      if (!sale.data) return json({ error: "Venta no encontrada" }, 404);
      const [items, payments, returns] = await Promise.all([
        db
          .from("sale_items")
          .select("*")
          .eq("sale_id", saleId)
          .eq("business_id", ctx.business.id)
          .order("created_at"),
        db
          .from("sale_payments")
          .select("*")
          .eq("sale_id", saleId)
          .eq("business_id", ctx.business.id)
          .order("created_at"),
        db
          .from("sale_returns")
          .select("id,return_number,total,refund_method,reason,created_at")
          .eq("sale_id", saleId)
          .eq("business_id", ctx.business.id)
          .order("created_at"),
      ]);
      if (items.error) throw items.error;
      if (payments.error) throw payments.error;
      if (returns.error) throw returns.error;
      const returnIds = (returns.data || []).map((item: any) => item.id);
      const returnItems = returnIds.length
        ? await db
            .from("sale_return_items")
            .select("sale_item_id,quantity,total,return_id")
            .eq("business_id", ctx.business.id)
            .in("return_id", returnIds)
        : { data: [], error: null };
      if (returnItems.error) throw returnItems.error;
      const returnedItems: Record<string, number> = {};
      for (const item of returnItems.data || [])
        returnedItems[item.sale_item_id] =
          (returnedItems[item.sale_item_id] || 0) + num(item.quantity);
      return json({
        ok: true,
        sale: sale.data,
        items: items.data || [],
        payments: payments.data || [],
        returns: returns.data || [],
        returnedItems,
        returnedTotal: (returns.data || []).reduce(
          (sum: number, item: any) => sum + num(item.total),
          0,
        ),
      });
    }

    if (action === "voidSale") {
      const result = await db.rpc("pos_void_sale", {
        p_business_id: ctx.business.id,
        p_user_id: ctx.user.id,
        p_sale_id: clean(body?.saleId, 80),
        p_reason: clean(body?.reason, 500),
      });
      if (result.error)
        return json({ error: result.error.message, code: result.error.code }, 409);
      return json(result.data || { ok: true });
    }

    if (action === "updateSalePayments") {
      const result = await db.rpc("pos_update_sale_payments", {
        p_business_id: ctx.business.id,
        p_user_id: ctx.user.id,
        p_sale_id: clean(body?.saleId, 80),
        p_payments: Array.isArray(body?.payments) ? body.payments : [],
        p_reason: clean(body?.reason, 500),
      });
      if (result.error)
        return json({ error: result.error.message, code: result.error.code }, 409);
      return json(result.data || { ok: true });
    }

    if (action === "returnSale") {
      const result = await db.rpc("pos_return_sale", {
        p_business_id: ctx.business.id,
        p_user_id: ctx.user.id,
        p_cash_session_id: body?.cashSessionId || null,
        p_sale_id: clean(body?.saleId, 80),
        p_items: Array.isArray(body?.items) ? body.items : [],
        p_refund_method: clean(body?.refundMethod, 30),
        p_reason: clean(body?.reason, 500),
      });
      if (result.error)
        return json({ error: result.error.message, code: result.error.code }, 409);
      return json(result.data || { ok: true });
    }

    if (action === "listPromotions") {
      const promotions = await db
        .from("product_promotions")
        .select("*")
        .eq("business_id", ctx.business.id)
        .order("created_at", { ascending: false });
      if (promotions.error) throw promotions.error;
      const productIds = [
        ...new Set((promotions.data || []).map((item: any) => item.product_id)),
      ];
      const productRows = productIds.length
        ? (
            await db
              .from("products")
              .select("id,name,code,price")
              .eq("business_id", ctx.business.id)
              .in("id", productIds)
          ).data || []
        : [];
      const products = new Map(
        productRows.map((product: any) => [product.id, product]),
      );
      return json({
        ok: true,
        promotions: (promotions.data || []).map((promotion: any) => ({
          ...promotion,
          product_name: products.get(promotion.product_id)?.name || "Producto",
          product_code: products.get(promotion.product_id)?.code || "",
          product_price: products.get(promotion.product_id)?.price || 0,
        })),
      });
    }

    if (action === "savePromotion") {
      const result = await db.rpc("pos_save_promotion", {
        p_business_id: ctx.business.id,
        p_user_id: ctx.user.id,
        p_id: body?.id || null,
        p_product_id: body?.productId || null,
        p_name: clean(body?.name, 180),
        p_discount_type: clean(body?.discountType, 30),
        p_value: num(body?.value),
        p_starts_at: body?.startsAt || null,
        p_ends_at: body?.endsAt || null,
        p_active: body?.active !== false,
      });
      if (result.error)
        return json({ error: result.error.message, code: result.error.code }, 409);
      return json(result.data || { ok: true });
    }

    if (action === "creditSummary") {
      const movements = await db
        .from("customer_credit_movements")
        .select("client_id,movement_type,amount,created_at")
        .eq("business_id", ctx.business.id)
        .order("created_at", { ascending: false });
      if (movements.error) throw movements.error;
      const clientIds = [
        ...new Set((movements.data || []).map((item: any) => item.client_id)),
      ];
      const clientRows = clientIds.length
        ? (
            await db
              .from("clients")
              .select("id,name,rfc")
              .eq("business_id", ctx.business.id)
              .in("id", clientIds)
          ).data || []
        : [];
      const clients = new Map(clientRows.map((client: any) => [client.id, client]));
      const accounts = new Map<string, any>();
      for (const movement of movements.data || []) {
        const account = accounts.get(movement.client_id) || {
          client_id: movement.client_id,
          client_name: clients.get(movement.client_id)?.name || "Cliente",
          client_rfc: clients.get(movement.client_id)?.rfc || "",
          charges: 0,
          payments: 0,
          balance: 0,
          last_movement_at: movement.created_at,
        };
        if (movement.movement_type === "charge") {
          account.charges += num(movement.amount);
          account.balance += num(movement.amount);
        } else {
          account.payments += num(movement.amount);
          account.balance -= num(movement.amount);
        }
        accounts.set(movement.client_id, account);
      }
      return json({ ok: true, accounts: [...accounts.values()] });
    }

    if (action === "recordCreditPayment") {
      const result = await db.rpc("pos_record_credit_payment", {
        p_business_id: ctx.business.id,
        p_user_id: ctx.user.id,
        p_client_id: body?.clientId || null,
        p_cash_session_id: body?.cashSessionId || null,
        p_amount: num(body?.amount),
        p_payment_method: clean(body?.paymentMethod, 30),
        p_reason: clean(body?.reason, 500),
      });
      if (result.error)
        return json({ error: result.error.message, code: result.error.code }, 409);
      return json(result.data || { ok: true });
    }

    return json({ error: "Acción desconocida" }, 400);
  } catch (error: any) {
    console.error("pos-api", error);
    return json(
      {
        error: "Error del servidor",
        detail: String(error?.message || error).slice(0, 400),
      },
      500,
    );
  }
});
