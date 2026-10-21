import { lazy, Suspense, useMemo, useState } from 'react'
import { useParams } from 'react-router'

import ChangeResidentSheet from './ChangeResidentSheet'
import UnitFormModal from './UnitFormModal'
import { UnitHistory, UnitSpecs, UnitStays } from './UnitPageSegments'
import { buildUnitRows, unitPlace, unitWho } from './unitRows'
import UnitStatement from './UnitStatement'
import { useBuildingSetupData } from './useBuildingSetupData'
import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import { creditsOf } from '../../services/buildingCharges'
import { currentOwner } from '../../services/buildingResidents'
import {
  buildStatement,
  reminderText,
  statementText,
  type StatementHeader
} from '../../services/buildingStatement'
import { cn } from '../../utils/cn'
import { getTodayIso } from '../../utils/jalaliDate'
import { toPersianDigits } from '../../utils/normalizeDigits'
import { shareText } from '../../utils/shareText'
import EmptyState from '../EmptyState'
import { SegmentedRadio } from '../form'
import MoneyText from '../MoneyText'
import { DangCardListSkeleton } from '../skeleton'
import Button from '../ui/Button'
import { calmDayBadgeClass, calmDayBadgeDangerClass } from '../ui/calmListStyles'
import Card from '../ui/Card'
import { listModulePageClass } from '../ui/featureCardStyles'

// The payment sheet loads only when a payment is started.
const UnitPaymentSheet = lazy(() => import('./UnitPaymentSheet'))

type Segment = 'statement' | 'history' | 'residents' | 'specs'

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'statement', label: 'صورت‌حساب' },
  { value: 'history', label: 'سابقه' },
  { value: 'residents', label: 'ساکنان' },
  { value: 'specs', label: 'مشخصات' }
]

/**
 * One unit (screen 17): who lives there and what it owes, «ثبت پرداخت» and the shareable
 * statement and reminder, and a view switch between the statement, the history, the stays and
 * the unit's details (edited in the unit form).
 */
export default function BuildingUnitPage() {
  const { unitId = '' } = useParams()
  const data = useBuildingSetupData()
  const { can } = useBuildingAccess()
  const [segment, setSegment] = useState<Segment>('statement')
  const [paying, setPaying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [changing, setChanging] = useState(false)

  const { allUnits, stays, persons, receivables, accounts, profile } = data

  const row = useMemo(
    // An archived unit's page stays readable: its statement and history are still here.
    () =>
      buildUnitRows({ ...data, units: allUnits, scope: 'all' }).find(
        item => item.unit.id === unitId
      ),
    // `data` is a fresh object per render; its contents are what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allUnits, stays, persons, receivables, profile, unitId]
  )

  const statement = useMemo(
    () =>
      buildStatement({
        unitId,
        receivables,
        credits: creditsOf(receivables),
        ownerId: currentOwner(unitId, stays)?.personId ?? '',
        todayIso: getTodayIso()
      }),
    [unitId, receivables, stays]
  )

  if (!data.loaded) return <DangCardListSkeleton table />

  if (!row) return <EmptyState icon="building" message="واحد پیدا نشد" />

  const { unit, balance } = row

  const header: StatementHeader = {
    building: profile?.name ?? '',
    unitNumber: unit.number,
    debtor: row.resident?.name ?? row.owner,
    card: accounts.find(account => account.cardNumber)?.cardNumber ?? ''
  }

  const owes = balance.open > 0

  const archived = !unit.active

  return (
    <div className={listModulePageClass}>
      <Card>
        <div className="flex items-center gap-3">
          <span className={cn(calmDayBadgeClass, owes && calmDayBadgeDangerClass)}>
            {toPersianDigits(unit.number)}
          </span>
          <div className="min-w-0 flex-1">
            <b className="block text-[0.95rem]">{unitWho(row)}</b>
            {archived ? (
              <span className="block text-[0.74rem] text-warning">بایگانی‌شده</span>
            ) : null}
            <span className="block text-[0.74rem] text-muted">{unitPlace(unit)}</span>
          </div>
          <div className="text-end text-[0.9rem] font-bold">
            {owes ? (
              <span className="text-danger">
                <MoneyText amount={-balance.open} signed />
              </span>
            ) : (
              <span className="text-success">✓</span>
            )}
            {balance.credit > 0 ? (
              <small className="block text-[0.72rem] text-success">
                اعتبار <MoneyText amount={balance.credit} />
              </small>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {can('record') && !archived ? (
            <Button size="sm" onClick={() => setPaying(true)}>
              ثبت پرداخت
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void shareText(statementText(header, statement), 'صورت‌حساب')}
          >
            اشتراک صورت‌حساب
          </Button>
          {owes ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void shareText(reminderText(header, balance.open), 'یادآوری شارژ')}
            >
              یادآوری
            </Button>
          ) : null}
        </div>
      </Card>

      <SegmentedRadio
        label="بخش‌های واحد"
        options={SEGMENTS}
        value={segment}
        onChange={setSegment}
      />

      {segment === 'statement' ? <UnitStatement data={statement} card={header.card} /> : null}
      {segment === 'history' ? <UnitHistory unitId={unitId} receivables={receivables} /> : null}
      {segment === 'residents' ? (
        <>
          <UnitStays stays={stays.filter(stay => stay.unitId === unitId)} persons={persons} />
          {can('people') && !archived ? (
            <Button variant="secondary" onClick={() => setChanging(true)}>
              تغییر ساکن
            </Button>
          ) : null}
        </>
      ) : null}
      {segment === 'specs' ? (
        <>
          <UnitSpecs row={row} />
          {can('people') && !archived ? (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              ویرایش مشخصات
            </Button>
          ) : null}
        </>
      ) : null}

      {paying ? (
        <Suspense fallback={null}>
          <UnitPaymentSheet
            open
            unitId={unitId}
            data={data}
            onClose={() => setPaying(false)}
            onSaved={() => {
              setPaying(false)
              void data.reload()
            }}
          />
        </Suspense>
      ) : null}
      <UnitFormModal
        open={editing}
        unit={unit}
        data={data}
        onClose={() => setEditing(false)}
        onAddPerson={() => {
          setEditing(false)
          setChanging(true)
        }}
        onSaved={() => setEditing(false)}
      />
      <ChangeResidentSheet
        open={changing}
        data={data}
        unitId={unitId}
        onClose={() => setChanging(false)}
        onDone={() => setChanging(false)}
      />
    </div>
  )
}
