import Rx from 'rx'
import { mergeData } from '../../../utils/modelUtils'
import { generateUUID } from '../../../utils/utils'

// ///////
// used for all
export function createComponents (defaults, state, inputs) {
  // console.log("createComponents",inputs)

  return inputs.reduce(function (state, input) {
    // console.log("createComponents")
    let inputValue = {}
    if (input && input.value) inputValue = input.value
    const newAttrs = mergeData(defaults, inputValue)

    // auto increment ?
    // auto generate ?
    let id = generateUUID()
    if (input && input.id !== undefined) {
      id = input.id
    }

    state = mergeData({}, state)
    state[id] = newAttrs
    // FIXME big hack, use mutability

    // console.log("done createComponents",state)
    return state
  }, state)
}

export function removeComponents (state, inputs) {
  // FIXME: update data structures
  // console.log("removeComponents",inputs)

  return inputs.reduce(function (state, input) {
    state = mergeData({}, state)
    if (input.hasOwnProperty('id')) {
      // FIXME big hack, use mutability
      delete state[input.id]
    }else if (input.hasOwnProperty('typeUid')) {
      state = Object.keys(state).reduce(function (outState, id) {
        if (state[id].typeUid !== input.typeUid) {
          outState[id] = state[id]
        }
        return outState
      }, {})
    }

    return state
  }, state)
}

export function duplicateComponents (state, inputs) {
  // console.log("duplicatING Components",inputs)

  return inputs.reduce(function (state, input) {
    let {id, newId} = input

    const source = state[id]
    let clone
    if ('clone' in source) {
      clone = source.clone()
      // FIXME specific to mesh components, move it elsewhere
      clone.material = source.material.clone()
      clone.userData.entity = {
        id: newId
      }
      clone.pickable = source.pickable
    } else {
      clone = mergeData({}, source)
      clone.id = newId
    }

    state = mergeData({}, state)
    // FIXME big hack, use mutability
    state[newId] = clone

    // console.log("done duplicateComponents",state)
    return state
  }, state)
}

// other helpers
export function makeActionsFromApiFns (apiFns) {
  const actions = Object.keys(apiFns)
    .reduce(function (prev, cur) {
      let key = cur + '$'
      prev[key] = new Rx.Subject()
      return prev
    }, {})

  return actions
}
