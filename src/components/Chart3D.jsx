import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

function textSprite(text, color = '#b7ada3', height = 0.9, weight = 500) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const font = `${weight} 44px Outfit, "Segoe UI", sans-serif`
  ctx.font = font
  const w = Math.ceil(ctx.measureText(text).width) + 16
  canvas.width = w
  canvas.height = 64
  ctx.font = font
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 8, 34)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }))
  sprite.scale.set((w / 64) * height, height, 1)
  return sprite
}

/** Barres 3D : lignes (satellites ou années) × colonnes (temps), hauteur = valeur. Glisser pour tourner, molette pour zoomer. */
export default function Chart3D({ rows, cols, values, colorFor, format = String, unit = '' }) {
  const host = useRef(null)
  const [tip, setTip] = useState(null)

  useEffect(() => {
    const el = host.current
    if (!el || !rows.length || !cols.length) return undefined
    let W = el.clientWidth || 800
    let H = el.clientHeight || 460
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    renderer.setSize(W, H)
    renderer.domElement.className = 'chart3d-canvas'
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 1000)
    const nR = rows.length
    const nC = cols.length
    const WIDTH = 32
    const DEPTH = Math.min(26, Math.max(8, nR * 2.4))
    const gx = WIDTH / nC
    const gz = DEPTH / nR
    const HMAX = 12
    let maxV = 0
    values.forEach((line) => line.forEach((v) => { if (v != null && v > maxV) maxV = v }))
    maxV = maxV || 1

    scene.add(new THREE.AmbientLight(0xffffff, 0.62))
    const sun = new THREE.DirectionalLight(0xfff1e6, 1.1)
    sun.position.set(WIDTH * 0.2, HMAX * 3, DEPTH * 2.5)
    scene.add(sun)
    const rim = new THREE.DirectionalLight(0x9eb6e0, 0.45)
    rim.position.set(WIDTH, HMAX, -DEPTH)
    scene.add(rim)

    const disposables = []
    const floorGeo = new THREE.PlaneGeometry(WIDTH + 3, DEPTH + 3)
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x0f1218 })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.set(WIDTH / 2 - gx / 2, -0.02, DEPTH / 2 - gz / 2)
    scene.add(floor)
    disposables.push(floorGeo, floorMat)

    const lineMat = new THREE.LineBasicMaterial({ color: 0x2a2f3a })
    disposables.push(lineMat)
    for (let t = 1; t <= 4; t += 1) {
      const y = (HMAX * t) / 4
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-gx / 2, y, -gz / 2), new THREE.Vector3(WIDTH - gx / 2, y, -gz / 2),
      ])
      scene.add(new THREE.Line(g, lineMat))
      disposables.push(g)
      const label = textSprite(`${format((maxV * t) / 4)}${unit}`, '#8a8178', 0.75)
      label.position.set(-gx / 2 - 2.2, y, -gz / 2)
      scene.add(label)
      disposables.push(label.material.map, label.material)
    }

    const geo = new THREE.BoxGeometry(gx * 0.72, 1, gz * 0.58)
    geo.translate(0, 0.5, 0)
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.08 })
    const mesh = new THREE.InstancedMesh(geo, mat, nR * nC)
    disposables.push(geo, mat)
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    const heights = []
    const baseColors = []
    for (let r = 0; r < nR; r += 1) {
      for (let c = 0; c < nC; c += 1) {
        const v = values[r][c]
        heights.push(v == null || v <= 0 ? 0.001 : Math.max(0.05, (v / maxV) * HMAX))
        color.set(colorFor(r, c, v == null ? 0 : v / maxV))
        baseColors.push(color.clone())
        mesh.setColorAt(r * nC + c, color)
      }
    }
    scene.add(mesh)

    rows.forEach((row, r) => {
      const s = textSprite(row.label, row.color || '#f4efe6', 0.95, 560)
      s.position.set(WIDTH - gx / 2 + 0.6 + s.scale.x / 2, 0.4, r * gz)
      scene.add(s)
      disposables.push(s.material.map, s.material)
    })
    const step = Math.max(1, Math.ceil(nC / 12))
    for (let c = 0; c < nC; c += step) {
      const s = textSprite(cols[c].label, '#b7ada3', 0.8)
      s.position.set(c * gx, 0.3, DEPTH - gz / 2 + 1.2)
      scene.add(s)
      disposables.push(s.material.map, s.material)
    }

    const center = new THREE.Vector3(WIDTH / 2, HMAX * 0.28, DEPTH / 2)
    camera.position.set(center.x - WIDTH * 0.32, HMAX * 1.9, center.z + DEPTH * 0.9 + WIDTH * 0.62)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(center)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.maxPolarAngle = Math.PI * 0.48
    controls.minDistance = 10
    controls.maxDistance = 120
    controls.update()

    const ray = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let hover = -1
    function onMove(e) {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      ray.setFromCamera(pointer, camera)
      const hit = ray.intersectObject(mesh)[0]
      const id = hit ? hit.instanceId : -1
      if (id !== hover) {
        if (hover >= 0) mesh.setColorAt(hover, baseColors[hover])
        if (id >= 0) mesh.setColorAt(id, baseColors[id].clone().lerp(new THREE.Color('#ffffff'), 0.45))
        mesh.instanceColor.needsUpdate = true
        hover = id
      }
      if (id >= 0) {
        const r = Math.floor(id / nC)
        const c = id % nC
        setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, row: rows[r], col: cols[c], v: values[r][c] })
      } else {
        setTip(null)
      }
    }
    function onLeave() {
      if (hover >= 0) {
        mesh.setColorAt(hover, baseColors[hover])
        mesh.instanceColor.needsUpdate = true
      }
      hover = -1
      setTip(null)
    }
    renderer.domElement.addEventListener('pointermove', onMove)
    renderer.domElement.addEventListener('pointerleave', onLeave)

    const ro = new ResizeObserver(() => {
      W = el.clientWidth || W
      H = el.clientHeight || H
      renderer.setSize(W, H)
      camera.aspect = W / H
      camera.updateProjectionMatrix()
    })
    ro.observe(el)

    const t0 = performance.now()
    let grown = false
    let frame = 0
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    function loop(now) {
      if (!grown) {
        const p = reduce ? 1 : Math.min(1, (now - t0) / 800)
        const ease = 1 - (1 - p) ** 3
        for (let r = 0; r < nR; r += 1) {
          for (let c = 0; c < nC; c += 1) {
            const i = r * nC + c
            const delay = Math.min(0.35, (c / nC) * 0.35)
            const local = Math.max(0, Math.min(1, (ease - delay) / (1 - delay)))
            dummy.position.set(c * gx, 0, r * gz)
            dummy.scale.set(1, Math.max(0.001, heights[i] * local), 1)
            dummy.updateMatrix()
            mesh.setMatrixAt(i, dummy.matrix)
          }
        }
        mesh.instanceMatrix.needsUpdate = true
        if (p >= 1) grown = true
      }
      controls.update()
      renderer.render(scene, camera)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointermove', onMove)
      renderer.domElement.removeEventListener('pointerleave', onLeave)
      controls.dispose()
      mesh.dispose()
      disposables.forEach((d) => d.dispose?.())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [rows, cols, values, colorFor, format, unit])

  return (
    <div className="chart3d" ref={host}>
      {tip && (
        <div className="chart3d-tip" style={{ left: tip.x + 14, top: tip.y + 14 }}>
          <b style={{ color: tip.row.color }}>{tip.row.label}</b>
          <span>{tip.col.label}</span>
          <strong>{tip.v == null ? 'pas de donnée' : `${format(tip.v)}${unit}`}</strong>
        </div>
      )}
      <p className="chart3d-help">Glisser pour tourner · molette pour zoomer · survoler une barre pour sa valeur</p>
    </div>
  )
}
