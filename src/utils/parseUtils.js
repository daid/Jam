import { generateUUID } from './utils'
import { postProcessMesh, geometryFromBuffers, unIndexGeometryData } from './meshUtils'
import { meshTools } from 'glView-helpers'
const {centerMesh, computeBoundingSphere} = meshTools

export function postProcessParsedData (data) {
  // TODO: unify parsers' returned data/api ?
  // console.log("postProcessMesh/data",data)
  let mesh
  if ('objects' in data) {
    // for 3mf , etc
    let typesMetaHash = {}
    let typesMeshes = []
    let typesMeta = []

    // we need to make ids unique
    let idLookup = {}

    for (let objectId in data.objects) {
      // console.log("objectId",objectId, data.objects[objectId])
      let item = data.objects[objectId]

      const typeUid = generateUUID()
      idLookup[item.id] = typeUid

      let meta = {id: typeUid, name: item.name}
      // special color handling
      if (item.colors && item.colors.length > 0) {
        meta.color = '#FFFFFF'
        console.log('added color')
      }
      typesMeta.push(meta)
      typesMetaHash[typeUid] = meta

      // console.log('mesh data', item)
      mesh = geometryFromBuffers(item)
      mesh = postProcessMesh(mesh)
      computeBoundingSphere(mesh) // FIXME : EEEK ! mutating and adding fields !
      //mesh = centerMesh(mesh)
      typesMeshes.push({typeUid, mesh})
    }

    // now for the instances data
    let instMeta = []
    let instTransforms = []
    data.build.map(function (item) {
      const instUid = generateUUID()
      let id = idLookup[item.objectid]

      instMeta.push({instUid, typeUid: id}) // TODO : auto generate name
      if ('transforms' in item) {
        instTransforms.push({instUid, transforms: item.transforms})
      } else {
        instTransforms.push({instUid, transforms: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]})
      }
    })
    // console.log("typesMeta",typesMeta,"typesMeshes",typesMeshes,"instMeta",instMeta,"instTransforms",instTransforms)
    const result = {meshOnly: false, typesMeshes, typesMeta, instMeta, instTransforms}
    console.log('data', result)
    return result
  } else {
    mesh = data
    // FIXME: just a test , in case we need to un-index geometric data
    // mesh = unIndexGeometryData(mesh)
    mesh = geometryFromBuffers(mesh)
    mesh = postProcessMesh(mesh)
    computeBoundingSphere(mesh) // FIXME : EEEK ! mutating and adding fields !
    //mesh = centerMesh(mesh)

    let typesMeshes = [{typeUid: undefined, mesh}]

    return {meshOnly: true, typesMeshes}
  }

  return mesh
}
