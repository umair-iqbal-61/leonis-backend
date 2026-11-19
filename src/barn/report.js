import { categories, minor, decimal, dayKey } from './records.js'

export function summarize(entries) {
  let income = 0n, expenses = 0n, operatingIncome = 0n, operatingExpenses = 0n
  let incomeCount = 0, expenseCount = 0, operatingIncomeCount = 0, operatingExpenseCount = 0
  for (const entry of entries) {
    const rule = categories[entry.category], amount = minor(entry.amount)
    if (rule.income) { income += amount; incomeCount++ } else { expenses += amount; expenseCount++ }
    if (rule.operating && rule.income) { operatingIncome += amount; operatingIncomeCount++ }
    if (rule.operating && !rule.income) { operatingExpenses += amount; operatingExpenseCount++ }
  }
  return {
    entryCount: entries.length, incomeCount, expenseCount,
    income: incomeCount ? decimal(income) : null,
    expenses: expenseCount ? decimal(expenses) : null,
    operatingIncome: operatingIncomeCount ? decimal(operatingIncome) : null,
    operatingExpenses: operatingExpenseCount ? decimal(operatingExpenses) : null,
    operatingMargin: operatingIncomeCount && operatingExpenseCount ? decimal(operatingIncome - operatingExpenses) : null,
    nonOperatingIncome: incomeCount ? decimal(income - operatingIncome) : null,
    nonOperatingExpenses: expenseCount ? decimal(expenses - operatingExpenses) : null,
  }
}
export function milkSummary(records, memberships, excluded, from, to) {
  let amount = 0n, count = 0, excludedCount = 0
  for (const record of records) {
    const date = dayKey(record.recordedOn)
    if (date < from || date > to || !memberships.some(item => item.petId === record.petId && dayKey(item.startedOn) <= date && (!item.endedOn || date < dayKey(item.endedOn)))) continue
    if (excluded.has(record.id) || record.liters == null) { excludedCount++; continue }
    try {
      const value = minor(record.liters, 4)
      amount += value
      count++
    } catch { excludedCount++ }
  }
  return { liters: count ? decimal(amount, 4) : null, recordCount: count, excludedCount }
}
export function barnReport(barn, entries, memberships, records, excluded, from, to) {
  const period = entries.filter(entry => dayKey(entry.occurredOn) >= from && dayKey(entry.occurredOn) <= to)
  let receipts = 0n, payments = 0n, paymentCount = 0, receivable = 0n, payable = 0n
  let outstandingCount = 0
  for (const entry of entries) {
    let paidByEnd = 0n
    for (const payment of entry.payments) {
      const date = dayKey(payment.paidOn)
      if (date <= to) paidByEnd += minor(payment.amount)
      if (date < from || date > to) continue
      paymentCount++
      if (categories[entry.category].income) receipts += minor(payment.amount)
      else payments += minor(payment.amount)
    }
    if (dayKey(entry.occurredOn) <= to) {
      outstandingCount++
      const balance = minor(entry.amount) - paidByEnd
      if (categories[entry.category].income) receivable += balance
      else payable += balance
    }
  }
  const animals = new Map()
  for (const membership of memberships) animals.set(membership.animalReference, {
    animalReference: membership.animalReference, petId: membership.petId,
    name: membership.pet?.name ?? membership.animalName,
  })
  for (const entry of entries) if (entry.animalReference != null && !animals.has(entry.animalReference)) animals.set(entry.animalReference, {
    animalReference: entry.animalReference, petId: entry.petId, name: entry.animalName,
  })
  const sold = period.filter(entry => entry.category === 'MILK_SALE')
  return {
    barn: { id: barn.id, name: barn.name }, period: { from, to },
    summary: summarize(period), shared: summarize(period.filter(entry => entry.animalReference == null)),
    cash: { paymentCount, receipts: paymentCount ? decimal(receipts) : null, payments: paymentCount ? decimal(payments) : null, balance: paymentCount ? decimal(receipts - payments) : null },
    outstanding: { asOf: to, receivable: outstandingCount ? decimal(receivable) : null, payable: outstandingCount ? decimal(payable) : null },
    milk: { ...milkSummary(records, memberships, excluded, from, to), soldLiters: sold.length ? decimal(sold.reduce((sum, entry) => sum + minor(entry.quantity, 3), 0n), 3) : null },
    animals: [...animals.values()].sort((a, b) => a.animalReference - b.animalReference).map(animal => ({ ...animal,
      ...summarize(period.filter(entry => entry.animalReference === animal.animalReference)),
      milk: milkSummary(records.filter(record => record.petId === animal.petId), memberships, excluded, from, to),
    })),
    provisional: true,
  }
}
