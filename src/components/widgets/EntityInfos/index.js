/** @jsx hJSX */
import Cycle from '@cycle/core'
import Rx from 'rx'
import {hJSX} from '@cycle/dom'
import Class from 'classnames'
const merge = Rx.Observable.merge
const combineLatest = Rx.Observable.combineLatest
const just  = Rx.Observable.just

import {combineLatestObj, preventDefault,isTextNotEmpty,formatData,exists} from '../../../utils/obsUtils'
import {mergeData} from '../../../utils/modelUtils'


import Comments from '../Comments'
import view from './view'
import intent from './intent'


////////
import ColorPicker from '../ColorPicker'

export function colorPickerWrapper(state$, DOM){
  console.log("making colorPicker")
  const props$ = //just({color:"#FF00FF"})
    state$.map(function(state){
      let {core,transforms} = state

      if(!core || !transforms){
        return undefined
      }
      if(transforms.length>0) transforms = transforms[0]
      if(core.length>0) core = core[0]

      return {color:core.color}
    })
 

  return ColorPicker({DOM,props$})
}

////////

function model(props$, actions){
  let comments$   = props$.pluck('comments').filter(exists).startWith(undefined)
  let core$       = props$.pluck('core').filter(exists).startWith(undefined)
  let transforms$ = props$.pluck('transforms').filter(exists).startWith(undefined)

  return combineLatestObj({core$, transforms$, comments$})
    .distinctUntilChanged()
    .shareReplay(1)
}

//err bad naming ..also should this be part of the model 
function refineActions(props$, actions){
  const transforms$ = props$.pluck('transforms')
    .filter(exists)
    .map(e=>e[0])

  const changeTransforms$ = actions.changeTransforms$
    .withLatestFrom(transforms$,function(changed,transforms){
      //let bla = Object.assign({},transforms) // this does not create a new instance huh WHY???? 
      //let output = mergeData(transforms) //not working either ????
      let output = JSON.parse(JSON.stringify(transforms))
      
      output[changed.trans][changed.idx] = changed.val
      return output
  })
  return {
    changeCore$:actions.changeCore$
    , changeTransforms$
  }
}



function EntityInfos({DOM, props$}, name = '') {
  const state$ = model(props$)

  const {changeCore$, changeTransforms$} = refineActions( props$, intent(DOM) )


  const colorPicker = colorPickerWrapper(state$, DOM)

  const vtree$ = view(state$, colorPicker.DOM)
  
  return {
    DOM: vtree$,
    events:{
      changeCore$
      ,changeTransforms$
      //addComment$
    }
  }
}

export default EntityInfos