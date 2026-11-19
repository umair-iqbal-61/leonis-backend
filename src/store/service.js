import prisma from '../lib/prisma.js'
import { addressInput, cartInput, checkoutQuote, fail, money, cents, totalCents, orderTransitions } from './commerce.js'

export const orderInclude = { items: { orderBy: { id: 'asc' } } }
export async function preview(tx, rawItems) {
  const items = cartInput(rawItems)
  const [products, settings] = await Promise.all([
    tx.product.findMany({ where: { id: { in: items.map(item => item.productId) } } }),
    tx.storeSettings.findUnique({ where: { id: 1 } }),
  ])
  return checkoutQuote(products, items, settings)
}
export async function placeOrder(userId, body) {
  if (body?.consent !== true) fail('CONSENT_REQUIRED')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body?.requestId)) fail('INVALID_REQUEST')
  const address = addressInput(body)
  const items = cartInput(body.items)
  try {
    return await prisma.$transaction(async tx => {
      const previous = await tx.storeOrder.findUnique({ where: { userId_requestId: { userId, requestId: body.requestId } }, include: orderInclude })
      if (previous) return previous
      // Always lock product rows in ID order. Reservations and competing requests serialize.
      for (const { productId } of items) await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${productId} FOR UPDATE`
      const retry = await tx.storeOrder.findUnique({ where: { userId_requestId: { userId, requestId: body.requestId } }, include: orderInclude })
      if (retry) return retry
      await tx.$queryRaw`SELECT id FROM "StoreSettings" WHERE id = 1 FOR SHARE`
      const quote = await preview(tx, items)
      if (quote.quoteId !== body.quoteId) fail('QUOTE_CHANGED', 409)
      for (const { productId, quantity } of items) {
        const changed = await tx.product.updateMany({ where: { id: productId, active: true, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } })
        if (changed.count !== 1) fail('STOCK_CHANGED', 409)
      }
      return tx.storeOrder.create({ data: { userId, requestId: body.requestId, ...address,
        status: quote.deliveryMode === 'QUOTE' ? 'AWAITING_QUOTE' : 'PENDING', deliveryMode: quote.deliveryMode,
        subtotal: quote.subtotal, shippingFee: quote.shippingFee, total: quote.total, weightGrams: quote.weightGrams,
        items: { create: quote.items },
      }, include: orderInclude })
    })
  } catch (error) {
    // A concurrent retry with the same request ID rolls back its own reservations.
    if (error.code === 'P2002') {
      const existing = await prisma.storeOrder.findUnique({ where: { userId_requestId: { userId, requestId: body.requestId } }, include: orderInclude })
      if (existing) return existing
    }
    throw error
  }
}
export async function changeOrder(id, userId, admin, operation) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "StoreOrder" WHERE id = ${id} FOR UPDATE`
    const order = await tx.storeOrder.findFirst({ where: { id, ...(admin ? {} : { userId }) }, include: orderInclude })
    if (!order) fail('NOT_FOUND', 404)
    return operation(tx, order)
  })
}
export async function cancelOrder(tx, order) {
  if (order.status === 'CANCELLED') return order
  for (const item of [...order.items].sort((a, b) => a.productId - b.productId)) {
    await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } })
  }
  return tx.storeOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED' }, include: orderInclude })
}
export function setOrderStatus(tx, order, status) {
  if (!orderTransitions[order.status]?.includes(status)) fail('INVALID_TRANSITION', 409)
  if (status === 'CANCELLED') return cancelOrder(tx, order)
  return tx.storeOrder.update({ where: { id: order.id }, data: { status }, include: orderInclude })
}
export function quoteDelivery(tx, order, rawFee) {
  const amount = cents(rawFee, true)
  if (amount === null || order.deliveryMode !== 'QUOTE' || !['AWAITING_QUOTE', 'AWAITING_ACCEPTANCE'].includes(order.status)) fail('INVALID_QUOTE', 409)
  return tx.storeOrder.update({ where: { id: order.id }, data: { shippingFee: money(amount), total: money(totalCents(order.subtotal) + amount),
    status: 'AWAITING_ACCEPTANCE', quoteVersion: { increment: 1 } }, include: orderInclude })
}
