import { fetchStays } from './buildingResidents'
import { fetchUnits } from './buildingUnits'
import { fetchChecks } from './checks'
import { fetchCounterparties } from './counterparties'
import { fetchDangs } from './dang'
import { getDateFieldId } from './dashboardAggregation'
import type { SearchRecordInput, SearchSources } from './globalSearchEntries'
import { fetchInstallmentPlans } from './installments'
import { fetchPersonalReminders } from './personalReminders'
import { fetchReceivables } from './receivables'
import { loadSavingsGoals } from './savingsGoalsSheet'
import { getSharingInfo, writerLabel } from './sharing'
import { fetchRecords } from './sheets'
import { fetchVaultTransactions } from './treasury'
import { loadVaultCatalog } from './treasuryCatalogSheet'
import { computeHoldings } from './treasuryHoldings'
import { fetchVehicles } from './vehicleProfiles'
import { fetchWalletAccounts } from './wallet'
import { getActiveWorkspaceType } from './workspace'
import type { AppSettings } from '../types'

async function loadRecords(settings: AppSettings): Promise<SearchRecordInput[]> {
  const forms = settings.forms.filter(form => form.type === 'income' || form.type === 'expense')
  const lists = await Promise.all(
    forms.map(async form => {
      const records = await fetchRecords(settings.spreadsheetId, form).catch(() => [])
      const dateField = getDateFieldId(form)
      const type = form.type === 'income' ? ('income' as const) : ('expense' as const)

      return records.map(record => ({
        id: record.id,
        type,
        values: record.values,
        dateField,
        writer: record.writer
      }))
    })
  )

  return lists.flat()
}

/** A building's units and stays; either tab failing to load leaves that side empty. */
async function loadBuilding(id: string): Promise<NonNullable<SearchSources['building']>> {
  const [units, stays] = await Promise.all([
    fetchUnits(id).catch(() => []),
    fetchStays(id).catch(() => [])
  ])

  return { units, stays }
}

/**
 * Everything the global search covers, read from the local mirror the module
 * pages already use: records (with loaded yearly archives), checks, dang,
 * receivables, installments, counterparties, treasury, reminders and vehicles (a building adds
 * its units and residents).
 * A module that fails to load is simply left out.
 */
export async function loadSearchSources(settings: AppSettings): Promise<SearchSources> {
  const id = settings.spreadsheetId
  const sharing = getSharingInfo(id)
  const [
    records,
    accounts,
    checks,
    dangs,
    receivables,
    installments,
    counterparties,
    vault,
    goals,
    reminders,
    vehicles,
    building
  ] = await Promise.all([
    loadRecords(settings),
    fetchWalletAccounts(id).catch(() => []),
    fetchChecks(id).catch(() => []),
    fetchDangs(id).catch(() => []),
    fetchReceivables(id).catch(() => []),
    fetchInstallmentPlans(id).catch(() => []),
    fetchCounterparties(id).catch(() => []),
    Promise.all([fetchVaultTransactions(id), loadVaultCatalog(id)]).catch(() => null),
    loadSavingsGoals(id).catch(() => []),
    fetchPersonalReminders(id).catch(() => []),
    fetchVehicles(id).catch(() => []),
    getActiveWorkspaceType() === 'building' ? loadBuilding(id) : Promise.resolve(undefined)
  ])

  return {
    records,
    accounts,
    checks,
    dangs,
    receivables,
    installments,
    counterparties,
    holdings: vault ? computeHoldings(vault[0], {}, vault[1]) : [],
    goals,
    reminders,
    vehicles: vehicles.filter(vehicle => vehicle.active),
    building,
    writerName: sharing?.shared
      ? email => {
          const label = writerLabel(email, sharing)

          return label.isMe ? 'من' : label.name
        }
      : undefined
  }
}
