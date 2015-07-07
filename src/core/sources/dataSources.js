import Rx from 'rx'
let Observable= Rx.Observable
let merge = Rx.Observable.merge
import {first,toggleCursor,getEntity,hasEntity,extractMeshTransforms, getExtension} from '../../utils/otherUtils'

import {meshExtensions} from '../extensions'

/////////////
//deal with data sources

//only load meshes for resources that are ...mesh files
function validMeshExtension(entry){
  return meshExtensions.indexOf(getExtension(entry)) > -1
}

/*
@param dndSources$: observable of drag and drops
@params urlSources: observable of url sources
*/
export function getDataSources ( dndSources$, urlSources ){
  //drag & drop sources
  let dndMeshFiles$  = dndSources$.filter(e=>e.type ==="file").pluck("data").flatMap(Observable.fromArray)
    .filter(file => validMeshExtension(file.name) )

  let dndMeshUris$    = dndSources$.filter(e=> (e.type === "url") ).pluck("data").flatMap(Observable.fromArray)
    .filter(file => validMeshExtension(url) )

  //meshSources is either url or file (direct data)
  let meshSources$ = merge(
    urlSources.meshUris$,
    dndMeshFiles$,
    dndMeshUris$
  )

  //FIXME these are technically untrue, but still should work
  let dndDesignUris$ = dndSources$.filter(e=> (e.type === "url" || e.type==="text") ).pluck("data").flatMap(Observable.fromArray)
    //.filter(url => validMeshExtension(url) )

  let designSources$ = merge(
    urlSources.designUri$,
    dndDesignUris$
  )

  return {meshSources$, designSources$}
}


 