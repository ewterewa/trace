import { useEffect, useRef } from 'react';
import * as THREE from 'three';
export default function Globe() {
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const el=ref.current;if(!el)return;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.z=4.2;
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setClearColor(0x000000,0);el.appendChild(renderer.domElement);
  const root=new THREE.Group();scene.add(root);
  const sphere=new THREE.Mesh(new THREE.SphereGeometry(1.22,96,96),new THREE.MeshBasicMaterial({color:0x17191d,wireframe:true,transparent:true,opacity:.26}));root.add(sphere);
  const inner=new THREE.Mesh(new THREE.SphereGeometry(1.205,64,64),new THREE.MeshBasicMaterial({color:0x09090b,transparent:true,opacity:.96}));root.add(inner);
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.28,64,64),new THREE.MeshBasicMaterial({color:0xb77f90,transparent:true,opacity:.055,side:THREE.BackSide}));root.add(atmosphere);
  const latMat=new THREE.LineBasicMaterial({color:0x9b9299,transparent:true,opacity:.17});
  for(let lat=-60;lat<=60;lat+=30){const points=[];const r=1.214*Math.cos(THREE.MathUtils.degToRad(lat)),y=1.214*Math.sin(THREE.MathUtils.degToRad(lat));for(let i=0;i<=128;i++){const a=i/128*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r));}root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),latMat));}
  for(let lon=0;lon<180;lon+=30){const points=[];const a=THREE.MathUtils.degToRad(lon);for(let i=0;i<=128;i++){const t=i/128*Math.PI*2;points.push(new THREE.Vector3(1.214*Math.cos(t)*Math.cos(a),1.214*Math.sin(t),1.214*Math.cos(t)*Math.sin(a)));}root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),latMat));}
  const pts:[number,number,number][]=[[-.7,.3,.65],[.1,.7,.7],[.75,.1,.62],[-.2,-.7,.65],[.6,-.45,.7],[-.75,-.2,.4]];
  const pointMat=new THREE.MeshBasicMaterial({color:0xe9bdc8});
  pts.forEach(v=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.022,12,12),pointMat);m.position.set(...v).normalize().multiplyScalar(1.23);root.add(m);});
  const arcMat=new THREE.LineBasicMaterial({color:0xd5a6b4,transparent:true,opacity:.62});
  [[0,1],[1,2],[0,3],[3,4],[4,2],[5,0]].forEach(([a,b])=>{const s=new THREE.Vector3(...pts[a]).normalize().multiplyScalar(1.23),e=new THREE.Vector3(...pts[b]).normalize().multiplyScalar(1.23),mid=s.clone().add(e).multiplyScalar(.5).normalize().multiplyScalar(1.58);root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(s,mid,e).getPoints(48)),arcMat));});
  let frame=0,drag=false,last=0,rotation=0;
  const resize=()=>{const w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};resize();const ro=new ResizeObserver(resize);ro.observe(el);
  const down=(e:PointerEvent)=>{drag=true;last=e.clientX;renderer.domElement.setPointerCapture?.(e.pointerId);};
  const move=(e:PointerEvent)=>{if(drag){rotation+=(e.clientX-last)*.006;last=e.clientX;}};
  const up=()=>{drag=false;};renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);
  const draw=()=>{frame=requestAnimationFrame(draw);if(!drag)rotation+=.0013;root.rotation.y=rotation;root.rotation.x=-.12;renderer.render(scene,camera);};draw();
  return()=>{cancelAnimationFrame(frame);ro.disconnect();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();const m=o.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose();}});renderer.dispose();el.removeChild(renderer.domElement);};
 },[]);
 return <div className="globe" ref={ref}/>;
}