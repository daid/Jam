import Rx from 'rx'
const {merge} = Rx.Observable
import { first } from '../../../utils/otherUtils'
import { toArray } from '../../../utils/utils'

export default function intent (events, params) {
  // entities/components
  const updateMetaComponent$ = events
    .select('entityInfos')
    .events('changeMeta$')
    .map(c => ({ target: 'meta', data: c }))

  const updateTransformComponent$ = events
    .select('entityInfos')
    .events('changeTransforms$')
    .merge(
      events
        .select('gl')
        .events('selectionsTransforms$')
        .debounce(20)
  )
    .map(c => ({ target: 'transforms', data: c }))

  const updateComponent$ = merge(
    updateMetaComponent$
    , updateTransformComponent$
  )

  const resetScaling$ = events
    .select('entityInfos')
    .events('resetScaling$')

  // measurements & annotations
  const shortSingleTaps$ = events
    .select('gl').events('shortSingleTaps$')

  const createAnnotationStep$ = shortSingleTaps$
    .map((event) => event.detail.pickingInfos)
    .filter((pickingInfos) => pickingInfos.length > 0)
    .map(first)
    .share()

  const removePartData$ = events // same as removeBomEntries
    .select('bom').events('removeEntry$')
    .map(toArray)

  const removeTypes$ = removePartData$
    .tap(e => console.log('removeTypes(fromEvent:bom)', e))

  const deleteInstances$ = removePartData$
    .map(function (data) {
      return data.map(entry => ({typeUid: entry.id}))
    })
    .tap(e => console.log('deleteInstances (fromEvent:bom)', e))

  /* const annotationsActions =  {
    creationStep$: actionsFromEvents.createAnnotationStep$
  }*/

  const addTypes$ = events // from bom
    .select('bom').events('addEntry$')
    .map(data => ({id: data.id, meta: data})) // convert data structure to something the BOM model can deal with
    // .map(toArray)

  const changeBounds$ = events
    .select('entityInfos')
    .events('changeBounds$')


  return {
    addTypes$,
    removeTypes$,
    deleteInstances$,
    updateComponent$,
    createAnnotationStep$,
    resetScaling$,
    changeBounds$
  }
}
