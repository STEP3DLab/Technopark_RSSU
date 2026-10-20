# Reproducible static views of the bundled GLB; requires Blender 4.3+.
# Run: blender -b --factory-startup --python scripts/render-previews.py
# Encode the resulting PNGs as WebP (quality 88), without changing geometry.
import bpy, math, re
from pathlib import Path
from mathutils import Vector
ROOT=str(Path(__file__).resolve().parent.parent)
Path(ROOT, 'previews').mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ROOT+'/models/atlas.glb')
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.device='CPU'; scene.cycles.samples=32
scene.cycles.use_denoising=False; scene.render.threads_mode='FIXED'; scene.render.threads=4
scene.render.resolution_x=720;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
scene.world=bpy.data.worlds.new('soft studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.6,.72,.78,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
scene.view_settings.view_transform='Standard'
objects={o.get('organId'):o for o in bpy.data.objects if o.type=='MESH'}
colors=re.findall(r"id:'([^']+)'[^\n]*?color:'(#[0-9a-fA-F]{6})'",Path(ROOT,'data.js').read_text())
for id,color in colors:
 d={'id':id,'color':color}
 o=objects[d['id']]; c=tuple(int(d['color'][i:i+2],16)/255 for i in (1,3,5)); c=tuple(v**2.2 for v in c)
 mat=bpy.data.materials.new(d['id']);mat.use_nodes=True;bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(*c,1);bsdf.inputs['Roughness'].default_value=.5;o.data.materials.clear();o.data.materials.append(mat)
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO'
for name,pos,energy,size in [('key',(-2,-3,4),170,4),('rim',(2,1,3),120,3),('fill',(1,-2,1),80,3)]:
 bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.name=name;light.data.energy=energy;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,1.1))-light.location).to_track_quat('-Z','Y').to_euler()
sets={'overview':list(objects),**{k:[k] for k in objects}}
for key,ids in sets.items():
 for id,o in objects.items():o.hide_render=id not in ids
 points=[o.matrix_world@Vector(p) for id,o in objects.items() if id in ids for p in o.bound_box]
 lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)]);center=(lo+hi)/2;extent=hi-lo
 camera.location=center+Vector((.06,-3,.03));camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=max(extent.z,extent.x/0.8)*1.25
 scene.render.filepath=ROOT+'/previews/'+key+'.png';bpy.ops.render.render(write_still=True)
 print('PREVIEW_DONE',key,flush=True)
