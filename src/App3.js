require("./app.css")
import {Rx} from '@cycle/core'
let just = Rx.Observable.just

//views & wrappers
import SettingsView from './components/SettingsView'
import FullScreenToggler from './components/FullScreenToggler'
import {EntityInfosWrapper,BOMWrapper,GLWrapper} from './components/main/wrappers'


import intent from './components/main/intent'
import model from './components/main/model'
import view from './components/main/view'


export function main(drivers) {
  const {DOM} = drivers
  
  const actions = intent(drivers)
  const state$  = model(undefined, actions, drivers)
  
  //create visual elements
  const entityInfos = EntityInfosWrapper(state$,DOM)
  const gl          = GLWrapper(state$,DOM)
  const bom         = BOMWrapper(state$,DOM)
  const settingsC   = SettingsView({DOM, props$:state$})
  const fsToggler   = FullScreenToggler({DOM})


  //outputs 
  const vtree$  = view(settingsC.DOM, fsToggler.DOM, bom.DOM,gl.DOM,entityInfos.DOM)
  const events$ = just( {gl:gl.events, entityInfos:entityInfos.events} )
  //output to localStorage
  //in this case, settings
  const localStorage$ = state$
    .pluck("settings")
    .map( s=>({"jam!-settings":JSON.stringify(s)}) )

  //return anything you want to output to drivers
  return {
      DOM: vtree$
      ,events: events$
      ,localStorage:localStorage$

  }
}

