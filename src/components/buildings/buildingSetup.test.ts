import { describe, expect, it } from 'vitest'

import { nextSetupStep, placeholderOwnerCount, setupChecklist } from './buildingSetup'
import { goNextStep, initialJourneyState, type JourneyState } from '../../services/buildingJourney'
import { newStay } from '../../services/buildingResidents'
import { placeholderOwner } from '../../services/buildingSetupActions'
import { newUnit } from '../../services/buildingUnits'

const finished: JourneyState = { ...initialJourneyState(), step: 'summary', finished: true }

describe('nextSetupStep', () => {
  it('sends an unfinished journey to the step it stopped on', () => {
    const state = goNextStep(initialJourneyState(), 'done')

    expect(nextSetupStep({ journey: state, placeholderOwners: 5 })).toEqual({
      step: 'people',
      reason: 'journey'
    })
  })

  it('asks for the owners of a finished building while a placeholder remains', () => {
    expect(nextSetupStep({ journey: finished, placeholderOwners: 2 })).toEqual({
      step: 'people',
      reason: 'people'
    })
  })

  it('has nothing to ask of a connected sheet or a complete building', () => {
    expect(nextSetupStep({ journey: null, placeholderOwners: 0 })).toBeNull()
    expect(nextSetupStep({ journey: finished, placeholderOwners: 0 })).toBeNull()
  })
})

describe('setupChecklist', () => {
  it('marks done, skipped, current and todo steps', () => {
    let state = initialJourneyState()

    state = goNextStep(state, 'done')
    state = goNextStep(state, 'skipped')

    expect(setupChecklist(state).map(item => item.status)).toEqual([
      'done',
      'done',
      'done',
      'skipped',
      'current',
      'todo',
      'todo',
      'todo'
    ])
  })
})

describe('placeholderOwnerCount', () => {
  it('counts the units whose owner is still a placeholder', () => {
    const units = [newUnit({ number: '1' }), newUnit({ number: '2' })].map((unit, index) => ({
      ...unit,
      rowNumber: index + 2
    }))

    const persons = [
      { ...placeholderOwner('1'), id: 'p1', createdAt: '', rowNumber: 2 },
      { ...placeholderOwner('2'), id: 'p2', createdAt: '', rowNumber: 3, placeholder: false }
    ]

    const stays = units.map((unit, index) => ({
      ...newStay({ unitId: unit.id, personId: persons[index].id, role: 'owner' }),
      rowNumber: index + 2
    }))

    expect(placeholderOwnerCount(units, stays, persons)).toBe(1)
  })

  it('counts a unit without any owner stay as waiting', () => {
    expect(placeholderOwnerCount([{ ...newUnit({ number: '1' }), rowNumber: 2 }], [], [])).toBe(1)
  })
})
