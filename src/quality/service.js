import { createHash } from 'node:crypto'
import prisma from '../lib/prisma.js'
import { assessRecordQuality, expectationSources } from './speciesGuide.js'

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')

function indexRecords(animal) {
  const sources = {
    profile: [animal], weight: animal.weights, meal: animal.meals,
    vetVisit: animal.vetVisits, dairy: animal.dairyRecords,
  }
  return Object.fromEntries(Object.entries(sources).map(([type, records]) => [
    type, new Map(records.map(record => [record.id, record])),
  ]))
}

async function refresh(tx, petId) {
  const pet = await tx.pet.findUniqueOrThrow({ where: { id: petId } })
  const where = { petId }
  const animal = {
    ...pet,
    weights: await tx.weight.findMany({ where }),
    vetVisits: await tx.vetVisit.findMany({ where }),
    meals: await tx.meal.findMany({ where }),
    dairyRecords: await tx.dairyRecord.findMany({ where }),
  }
  const findings = assessRecordQuality(animal, { asOf: new Date() })
  const existing = await tx.qualityFinding.findMany({ where: { petId } })
  const previous = new Map(existing.map(item => [item.fingerprint, item]))
  const recordsByType = indexRecords(animal)
  const active = new Set()

  for (const finding of findings) {
    // Session metadata changes evidence, while the same pair retains its identity.
    const identity = finding.records.map(record => ({
      ...record, fields: record.fields.filter(field => field !== 'session'),
    }))
    const fingerprint = hash([finding.ruleId, identity])
    const evidence = hash([finding.parameters, finding.records.map(({ type, id, fields }) =>
      fields.filter(field => field !== 'session' || recordsByType[type].get(id).session != null)
        .map(field => recordsByType[type].get(id)[field]))])
    active.add(fingerprint)
    const old = previous.get(fingerprint)
    if (!old) {
      await tx.qualityFinding.create({ data: { ...finding, petId, fingerprint, evidence } })
    } else if (!old.active || old.evidence !== evidence) {
      await tx.qualityFinding.update({
        where: { id: old.id },
        data: { ...finding, evidence, active: true, status: 'OPEN', reviewedAt: null },
      })
    }
  }

  const cleared = existing.filter(item => item.active && !active.has(item.fingerprint))
  if (cleared.length) {
    await tx.qualityFinding.updateMany({
      where: { id: { in: cleared.map(item => item.id) } },
      data: { active: false },
    })
  }
  return animal
}

export function withAnimalLock(petId, operation) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Pet" WHERE id = ${petId} FOR UPDATE`
    return operation(tx)
  })
}

export function changeAnimal(petId, operation) {
  return withAnimalLock(petId, async tx => {
    const result = await operation(tx)
    await refresh(tx, petId)
    return result
  })
}

export function createAnimal(operation) {
  return prisma.$transaction(async tx => {
    const result = await operation(tx)
    await refresh(tx, result.id)
    return result
  })
}

export async function qualitySnapshot(petId) {
  return withAnimalLock(petId, async tx => {
    const animal = await refresh(tx, petId)
    const findings = await tx.qualityFinding.findMany({
      where: { petId },
      orderBy: [{ active: 'desc' }, { id: 'asc' }],
      select: {
        id: true, ruleId: true, dimension: true, severity: true, records: true,
        explanationKey: true, parameters: true, status: true, active: true, reviewedAt: true,
      },
    })
    return { animal, findings }
  })
}

export function qualityReport(animal, findings) {
  const counts = { active: 0, open: 0, reviewed: 0, dismissed: 0, resolved: 0, cleared: 0 }
  for (const item of findings) {
    if (item.active) counts.active++
    else counts.cleared++
    counts[item.status.toLowerCase()]++
  }
  const sources = indexRecords(animal)
  return {
    petId: animal.id,
    counts,
    findings: findings.map(item => ({
      ...item,
      source: expectationSources[item.ruleId] ?? null,
      records: item.records.map(record => {
        const source = sources[record.type].get(record.id)
        return {
          ...record,
          values: source ? Object.fromEntries(record.fields.map(field => [field, source[field]])) : null,
        }
      }),
    })),
  }
}
