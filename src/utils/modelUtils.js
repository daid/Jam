import Rx from 'rx'
let fromEvent = Rx.Observable.fromEvent
let Observable = Rx.Observable
let merge = Rx.Observable.merge
let just  = Rx.Observable.just

import Immutable from 'seamless-immutable'

//TODO: this needs to be an external lib, for re-use
//merge the current data with any number of input data
export function mergeData(currentData, ...inputs){
  if("merge" in currentData){
    return currentData.merge(inputs)
  }
  return Object.assign({}, currentData, ...inputs)
}

//need to make sure source data structure is right 
export function applyDefaults(data$, defaults){
  return data$.map(function(data){
    return mergeData(defaults,data)
  })
}

//need to make sure the "type" (immutable) is right 
export function applyTransform(data$, transform){
  return data$.map(function(data){
    return transform(data)
  })
}

export function makeModel(updateFns, actions, defaults, source){
  let mods$ =  makeModifications(actions,updateFns)

  //let source$ =  Rx.Observable.just( defaults )//Immutable(defaults) )
  let source$ = source || just(defaults)
  source$ = applyDefaults(source$,defaults)

  return mods$
    .merge(source$)
    .scan((currentData, modFn) => modFn(currentData))//combine existing data with new one
    //.distinctUntilChanged()
    .shareReplay(1)
  
}

function logHistory(currentData, history){ 
  let past   = [currentData].concat(history.past)
  let future = []

  console.log("currentData",past)
  history = mergeData(history, {past, future})
  return history
}

export function makeModifications(actions, updateFns){
  let mods$ =  Object.keys(actions).map(function(key){
    //console.log("actions in makeModifications",key)
    let op     = actions[key]
    let opName = key.replace(/\$/g, "")
    let modFn  = updateFns[opName]

    //here is where the "magic happens"
    //for each "operation/action" we map it to an observable with history & state
    let mod$   = op
      .map((input) => ({state,history}) => {

      history = {}//logHistory(state, history)
      state   = modFn(state, input)//call the adapted function

      return {state,history}//Immutable({state,history})
    })

    //console.log("op",op,"opName",opName,"modFn",modFn)
    if(modFn){
      return mod$ 
    }

    //how to make this better? 
    /*if(opName==="undo"){
      return actions.undo$
        .map((toggleInfo) => ({state,history}) => {
          console.log("Undoing")

          let nState     = history.past[0]
          let past   = history.past.slice(1)
          let future = [state].concat(history.future)

          history = mergeData(history,{past,future})

          return Immutable({state:nState,history})
        })
    }
    if(opName === "redo"){
      return actions.redo$
        .map((toggleInfo) => ({state,history}) => {
          console.log("Redoing")

          let nState = history.future[0]
          let past = [state].concat(history.past) 
          let future = history.future.slice(1)

          history = mergeData(history,{past,future})

          return Immutable({state:nState,history})
        })
    }*/

  })
  .filter(e=>e!==undefined)

  /*
  //handle undo & redo seperatly, they are alway the same
  //we need to seperate this somehow?
  //why does this not work ??
  let undoMod$ = actions.undo$
    .map((toggleInfo) => ({state,history}) => {
      console.log("Undoing")

      let nState     = history.past[0]
      let past   = history.past.slice(1)
      let future = [state].concat(history.future)

      history = mergeData(history,{past,future})

      return Immutable({state:nState,history})
    })

  let redoMod$ = actions.redo$
    .map((toggleInfo) => ({state,history}) => {
      console.log("Redoing")

      let nState = history.future[0]
      let past = [state].concat(history.past) 
      let future = history.future.slice(1)

      history = mergeData(history,{past,future})

      return Immutable({state:nState,history})
    })*/

  return merge(
    mods$
  )
}


///
let transform = Immutable

export function makeModificationsNoHistory(actions, updateFns, doApplyTransform){

  let mods$ =  Object.keys(actions).map(function(key){
    //console.log("actions in makeModifications",key)
    let op     = actions[key]
    let opName = key.replace(/\$/g, "")
    let modFn  = updateFns[opName]

    //here is where the "magic happens"
    //for each "operation/action" we map it to an observable with history & state
    let mod$   = op
      .map((input) => (state) => {

      //history = logHistory(state, history)
      state   = modFn(state, input)//call the adapted function

      if(doApplyTransform)//if we need to coerce it to immutable etc
      {
        state = transform(state)
      }

      return state //,history})
    })

    //console.log("op",op,"opName",opName,"modFn",modFn)
    if(modFn){
      return mod$ 
    }
  })
  .filter(e=>e!==undefined)

  return Rx.Observable.merge(
    mods$
  )
}


export function makeModelNoHistory(defaults, updateFns, actions, source, doApplyTransform=false){
  let mods$ =  makeModificationsNoHistory(actions,updateFns, doApplyTransform)
  
  let source$ = source || just( defaults)

  source$ = applyDefaults(source$, defaults)

  if(doApplyTransform){
    source$ = applyTransform( source$, transform )
  }

  return mods$
    .merge(source$)
    .scan((currentData, modFn) => modFn(currentData))//combine existing data with new one
    //.distinctUntilChanged()
    .shareReplay(1)
}