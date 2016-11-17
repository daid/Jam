import Rx from 'rx'
const { fromArray } = Rx.Observable
import { pick, head } from 'ramda'
import { remapJson, toArray, exists } from '../../../utils/utils'
import { mergeData } from '../../../utils/modelUtils'

function rawData (ym) {
  const parts = ym.data
    .filter(res => res.request.method === 'get' && res.request.type === 'ymLoad' && res.request.typeDetail === 'parts')
    .mergeAll()
    .pluck('response')
    // .tap(e=>console.log("in parts: ",e))

  const assemblies = ym.data
    .filter(res => res.request.method === 'get' && res.request.type === 'ymLoad' && res.request.typeDetail === 'assemblyEntries')
    // .mergeAll()
    .flatMap(data => {
      const response$ = data.pluck('response')
      return response$.map(function (entries) {
        return entries.map(function (entry) {
          return mergeData(entry, {assemblyId: data.request.assemblyId})
        })
      })
    })
    //.tap(e => console.log('in assemblies: ', e))

  return {
    parts,
    assemblies
  }
}

export default function intent ({ym, resources}, params) {
  const data = rawData(ym)

  const partsData$ = data.parts
    .share()

  const assemblyData$ = data.assemblies
    .share()

  const createMetaComponents$ = assemblyData$
    .map(function (datas) {
      return datas.map(function (entry) {
        const mapping = {
          'uuid': 'id',
          'part_uuid': 'typeUid'
        }
        // NOTE :we are doing these to make them compatible with remapMetaActions helpers, not sure this is the best
        const fieldNames = ['name', 'color', 'id', 'typeUid', 'assemblyId']
        const data = pick(fieldNames, remapJson(mapping, entry))
        return {
          id: data.id,
          value: data
        }
      })
    })
     .tap(e => console.log('createMetaComponents (fromYm)', e))

  const createTransformComponents$ = assemblyData$
    .map(function (datas) {
      return datas.map(function (entry) {
        const mapping = {
          'uuid': 'id',
          'part_uuid': 'typeUid'
        }
        const fieldNames = ['name', 'id', 'typeUid', 'pos', 'rot', 'sca']
        let data = pick(fieldNames, remapJson(mapping, entry))

        data.pos = data.pos.map(parseFloat)
        data.rot = data.rot.map(parseFloat)
        data.sca = data.sca.map(parseFloat)
        // NOTE :we are doing these to make them compatible with remapMetaActions helpers, not sure this is the best
        return {
          id: data.id,
          value: data
        }
      })
    })
    // .tap(e=>console.log("transforms",e))
    /* ext: "stl"
    flags: "noInfer"
    id: "1535f856dd0iT"
    name: "UM2CableChain_BedEnd.STL"
    uri: "*/

  // this makes sure that meshes ALWAYS get resolved, regardless of the order
  // that mesh information and metadata gets recieved
  function combineAndWaitUntil (meshesData$, assemblyData$) {
    const obs = new Rx.ReplaySubject()

    let metas = []
    let meshes = {}
    let dones = []

    function matchAttempt (id) {
      metas.forEach(function (data) {
        let mesh = meshes[data.typeUid]
        if (mesh !== undefined) {
          // mesh.userData = {}
          if (dones.indexOf(data.id) === -1) {
            const result = mergeData(data, {value: {mesh}})
            obs.onNext(result) // ONLY emit data when we have a match
            dones.push(data.id)
          }
        }
      })
    }

    meshesData$
      .forEach(function (meshData) {
        let mesh = meshData.data.typesMeshes[0].mesh
        meshes[ meshData.meta.id ] = mesh
        matchAttempt(meshData.meta.id)
      })

    assemblyData$
      .flatMap(fromArray)
      .forEach(function (data) {
        metas.push(data)
        matchAttempt(data.typeUid)
      })

    return obs
  }

  const meshComponentMeshes$ = resources.filter(data => data.meta.id !== undefined)

  const meshComponentAssemblyData$ = assemblyData$
    .map(function (datas) {
      return datas.map(function (entry) {
        const mapping = {
          'uuid': 'id',
          'part_uuid': 'typeUid'
        }
        const fieldNames = ['id', 'typeUid', 'assemblyId']
        let data = pick(fieldNames, remapJson(mapping, entry))
        return { id: data.id, typeUid: data.typeUid, value: undefined }
      })
    })

  const createMeshComponents$ = combineAndWaitUntil(meshComponentMeshes$, meshComponentAssemblyData$)
    .map(toArray)
    .shareReplay(1)


  const createBoundsComponents$ = createMeshComponents$
    .map(function (datas) {
      return datas.map(function (entry) {
        const id = entry.id

        //FIXME: horribly redudant with ../entitiesExtras
        let mesh = entry.value.mesh
        let bbox = mesh.boundingBox
        let zOffset = bbox.max.clone().sub(bbox.min)
        zOffset = zOffset.z / 2
        bbox = { min: bbox.min.toArray(), max: bbox.max.toArray() }

        const min = [ bbox.min[0], bbox.min[1], bbox.min[2] ]
        const max = [ bbox.max[0], bbox.max[1], bbox.max[2] ]
        const size = [bbox.max[0] - bbox.min[0], bbox.max[1] - bbox.min[1], bbox.max[2] - bbox.min[2]]
        const value = {min, max, size}

        return {
          id,
          value
        }
      })
    })
    .tap(e => console.log('createBoundsComponents', e))


  // TODO : this would need to be filtered based on pre-existing type data ?
  const addTypes$ = partsData$
    .map(function (data) {
      return data.map(function (entry) {
        const mapping = {
          'uuid': 'id'
        }
        const fieldNames = ['id', 'name', 'description', 'binary_document_id', 'binary_document_url', 'source_document_id', 'source_document_url']
        const data = pick(fieldNames, remapJson(mapping, entry))
        return {id: data.id, data: undefined, meta: data}
      })
    })
    .flatMap(fromArray)
    // .forEach(e=>console.log("addEntityTypes", e))

  // send out requests to fetch data for meshes
  const meshRequests$ = partsData$
    .map(function (data) {
      return data.map(function (entry) {
        const mapping = {
          'uuid': 'id'
        }
        const fieldNames = ['id', 'name', 'description', 'binary_document_id', 'binary_document_url', 'source_document_id', 'source_document_url']
        const data = pick(fieldNames, remapJson(mapping, entry))

        return {src: 'http', method: 'get', uri: data.binary_document_url, url: data.binary_document_url, id: data.id, type: 'resource', flags: 'noInfer'}
      })
    })
    .flatMap(fromArray)
    .filter(req => req.uri !== undefined && req.uri !== '')
    // .tap(e => console.log('meshRequests', e))

  // set active assembly
  const setActiveAssembly$ = assemblyData$
    .take(1)
    .map(data => head(data))
    .filter(exists)
    .pluck('assemblyId')
    .distinctUntilChanged()
    // .tap(e => console.log('setActiveAssembly', e))

  return {
    addTypes$,
    createMetaComponents$,
    createTransformComponents$,
    createMeshComponents$,
    createBoundsComponents$,

    requests$: meshRequests$,
    setActiveAssembly$
  }
}
