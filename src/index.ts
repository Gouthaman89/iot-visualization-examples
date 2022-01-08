import './common/global_setting'
import { Object3D, Vector3 } from 'three'
import BoxHelperWrap from './common/BoxHelperWrap'
import Events from './common/Events'
import Object3DWrap from './common/Object3DWrap'
import Space from './common/Space'
import { findParent, checkNameIncludes, findChildren, getScreenPosition } from './common/utils'
import { updateChart1, updateChart2, updateChart3 } from './index-chart'
import Heatmap from './common/Heatmap'

// TODO: default hot map and show temperature
// TODO: warn icon

const element = document.getElementById('3d-space')
if (element === null) {
  throw new Error('#3d-space element dont exist.')
}
const space = new Space(element)
const boxHelperWrap = new BoxHelperWrap()
const rackList: Object3D[] = []
const iconActiveBg = 'bg-blue-700/60'
let computerScreenObject3DWrap: Object3DWrap|null = null
let selectRackWrap: Object3DWrap|null = null
let selectServerWrap: Object3DWrap|null = null

// load 3d model.
space.load('./static/3d/datacenter-0715.glb').then(() => {
  const ele = document.getElementById('loading-tips')
  if (ele !== null) {
    ele.style.display = 'none'
  }

  space.setCameraOriginPosition(new Vector3(21, 20, 8))

  const objectWrapList = space.getObject3DWrapList()

  objectWrapList.forEach(item => {
    if (checkIsRack(item.object3D) === true) {
      rackList.push(item.object3D)
    }
  })
  space.initRaycaster(rackList)

  boxHelperWrap.addToScene(space.scene)
  triggerAutoRotate()
  computerScreenObject3DWrap = space.getObject3DWrapByFullName('Scene/datacenterglb/RootNode/room_main/screen')
}).catch((err) => {
  console.error(err)
})

function checkIsRack (obj: Object3D): Boolean {
  return checkNameIncludes(obj, 'rack')
}

function checkIsRackDoor (obj: Object3D): Boolean {
  return checkNameIncludes(obj, 'door')
}

function checkIsServer (obj: Object3D): Boolean {
  return checkNameIncludes(obj, 'server')
}

function getServerList (rack: Object3D): Object3D[] {
  const result = rack.children.filter(checkIsServer)
  return result
}

let heatMap: Heatmap|null = null
function initHeatmap (): void {
  heatMap = new Heatmap()
  const dataList: IPoint[] = []
  rackList.forEach(r => {
    const position = new Vector3()
    position.setFromMatrixPosition(r.matrixWorld)
    dataList.push({
      value: Math.max(Math.random() * 30 + 2, 15),
      x: position.x,
      y: position.z
    })
  })

  heatMap.init(space.scene, space.scene)
  heatMap.setData(dataList)
}

const updateRightInfo = (() => {
  let oldRack: Object3DWrap
  let oldServer: Object3DWrap
  const rackCardEle = document.getElementById('rackCard')
  const rackNameEle = document.getElementById('rackName')
  const serverCardEle = document.getElementById('serverCard')
  const serverNameEle = document.getElementById('serverName')
  if (rackCardEle === null || rackNameEle === null || serverCardEle === null || serverNameEle === null) {
    throw new Error('#rackCard or #rackName or #serverCard or #serverName dont exist.')
  }
  return (rackWrap: Object3DWrap|null, serverWrap?: Object3DWrap) => {
    if (rackWrap !== null) {
      rackCardEle.classList.remove('hidden')
      rackNameEle.innerText = rackWrap.object3D.name
      if (rackWrap !== oldRack) {
        updateChart2()
        oldRack = rackWrap
      }
    } else {
      rackCardEle.classList.add('hidden')
    }

    if (serverWrap !== undefined && serverWrap !== null) {
      serverCardEle.classList.remove('hidden')
      serverNameEle.innerText = serverWrap.object3D.name
      if (serverWrap !== oldServer) {
        updateChart3()
        oldServer = serverWrap
      }
    } else {
      serverCardEle.classList.add('hidden')
    }
  }
})()

// show popover info when mouse hover on rack or server
const updatePopoverContent = (() => {
  let oldName: string
  const popoverEle = document.getElementById('popover-content')
  const popoverTextEle = document.getElementById('popover-text')
  if (popoverEle === null || popoverTextEle === null) {
    throw new Error('#popover-content or #popover-text dont exist.')
  }
  return (name: string|null) => {
    const event = space.mouseEvent
    if (name !== null) {
      popoverEle.classList.remove('hidden')
      popoverEle.style.top = `${event.y + 10}px`
      popoverEle.style.left = `${event.x + 10}px`
      if (popoverTextEle.innerText !== name) {
        popoverTextEle.innerText = name
      }
      if (oldName !== name) {
        updateChart1()
        oldName = name
      }
    } else {
      popoverEle.classList.add('hidden')
    }
  }
})()

document.getElementById('left-arrow-button')?.addEventListener('click', () => {
  space.backToCameraOriginPosition()
  // reset raycaster list to rack list
  space.setRaycasterObjects(rackList)
  updateRightInfo(null)
  // reset rack open door
  if (selectRackWrap !== null) {
    const door = findChildren(selectRackWrap.object3D, checkIsRackDoor)
    if (door !== null) {
      const doorWrap = space.getObject3DWrap(door)
      doorWrap?.undoMove()
    }
    selectRackWrap = null
  }

  if (selectServerWrap !== null) {
    selectServerWrap.undoMove()
    selectServerWrap = null
  }
})

const rotateBtnEle = document.getElementById('rotate-button')
function triggerAutoRotate (): void {
  space.orbit.autoRotate = !space.orbit.autoRotate
  if (space.orbit.autoRotate) {
    space.emitter.on(Events.animate, space.orbit.update)
    rotateBtnEle?.classList.add(iconActiveBg)
  } else {
    space.emitter.off(Events.animate, space.orbit.update)
    rotateBtnEle?.classList.remove(iconActiveBg)
  }
}

rotateBtnEle?.addEventListener('click', triggerAutoRotate)

const temperatureBtnEle = document.getElementById('temperature-button')
function triggerTemperature (): void {
  if (heatMap === null) {
    initHeatmap()
    temperatureBtnEle?.classList.add(iconActiveBg)
  } else {
    const flag = !heatMap.getVisible()
    heatMap.setVisible(flag)
    if (flag) {
      temperatureBtnEle?.classList.add(iconActiveBg)
    } else {
      temperatureBtnEle?.classList.remove(iconActiveBg)
    }
  }
}

temperatureBtnEle?.addEventListener('click', triggerTemperature)

window.addEventListener('resize', () => space.resize())

function clickRack (obj: Object3D): void {
  const rackWrap = space.getObject3DWrap(obj)
  if (rackWrap !== null) {
    updateRightInfo(rackWrap)
  }
}

function clickServer (obj: Object3D): void {
  const serverWrap = space.getObject3DWrap(obj)
  if (serverWrap !== null && selectRackWrap !== null) {
    updateRightInfo(selectRackWrap, serverWrap)
  }
}

const openDoorMoveInfo = {
  name: 'openDoor',
  rotation: {
    y: 120
  }
}

function dblclickRack (obj: Object3D): void {
  const rackWrap = space.getObject3DWrap(obj)
  if (rackWrap !== null) {
    selectRackWrap = rackWrap
    // rack open door
    const door = findChildren(rackWrap.object3D, checkIsRackDoor)
    if (door !== null) {
      const doorWrap = space.getObject3DWrap(door)
      doorWrap?.move(openDoorMoveInfo)
    }
    // focus rack
    space.focus(obj, { offset: { x: 2, y: 1 } })
    // update raycaster list ,only can select server inside this rack.
    const serverList = getServerList(obj)
    space.setRaycasterObjects(serverList)
  }
}

const popupServerMoveInfo = {
  name: 'popupServer',
  position: {
    x: 0.4
  }
}
function dblclickServer (obj: Object3D): void {
  // focus server
  space.focus(obj, { offset: { x: 6, y: 1 } })
  const serverWrap = space.getObject3DWrap(obj)
  if (serverWrap !== null) {
    serverWrap.move(popupServerMoveInfo)
    if (selectServerWrap !== null) {
      selectServerWrap.undoMove()
    }
    selectServerWrap = serverWrap
  }
}

// add icon list
const spaceContainerEle = document.getElementById('3d-space')?.parentElement
const warnIconContainerEle = document.createElement('div')
warnIconContainerEle.classList.add('absolute', 'flex')
spaceContainerEle?.appendChild(warnIconContainerEle)

// icon : warn
const imgEle = document.createElement('img')
imgEle.src = './static/images/warn.svg'
imgEle.classList.add('icon', 'twinkle')
imgEle.style.backgroundColor = 'rgba(20,50,200,0.4)'
warnIconContainerEle.appendChild(imgEle)

function updateIconListPosition (): void {
  if (computerScreenObject3DWrap?.object3D !== undefined) {
    const screenPosition = getScreenPosition(computerScreenObject3DWrap.object3D, space, { y: 2 })
    warnIconContainerEle.style.top = `${screenPosition.y}px`
    warnIconContainerEle.style.left = `${screenPosition.x}px`
  }
}

space.emitter.on(Events.orbitChange, () => {
  updateIconListPosition()
})

// show loading 3d model progress
space.emitter.on(Events.load.processing, (xhr) => {
  const ele = document.getElementById('loading-text')
  if (ele !== null) {
    const text = `Loading 3d model:${(xhr.loaded / 1024 / 1024).toFixed(2)}MB`
    ele.innerText = text
  }
})

space.emitter.on(Events.click.raycaster, (list) => {
  console.log('click', list)
  if (list.length > 0) {
    if (selectRackWrap !== null) {
      const server = findParent(list[0].object, checkIsServer)
      if (server !== null) {
        clickServer(server)
      }
    } else {
      const rack = findParent(list[0].object, checkIsRack)
      if (rack !== null) {
        clickRack(rack)
      }
    }
  }
})

space.emitter.on(Events.dblclick.raycaster, (list) => {
  console.log('dblclick', list)
  if (list.length > 0) {
    if (selectRackWrap !== null) {
      const server = findParent(list[0].object, checkIsServer)
      if (server !== null) {
        dblclickServer(server)
      }
    } else {
      const rack = findParent(list[0].object, checkIsRack)
      if (rack !== null) {
        dblclickRack(rack)
      }
    }
  }
})

space.emitter.on(Events.mousemove.raycaster, (list) => {
  if (selectRackWrap !== null) {
    if (list.length > 0) {
      const server = findParent(list[0].object, checkIsServer)
      if (server !== null) {
        boxHelperWrap.attach(server)
        updatePopoverContent(server.name)
      }
    } else {
      boxHelperWrap.setVisible(false)
      updatePopoverContent(null)
    }
  } else {
    if (list.length > 0) {
      const rack = findParent(list[0].object, checkIsRack)
      if (rack !== null) {
        boxHelperWrap.attach(rack)
        updatePopoverContent(rack.name)
      }
    } else {
      boxHelperWrap.setVisible(false)
      updatePopoverContent(null)
    }
  }
})
