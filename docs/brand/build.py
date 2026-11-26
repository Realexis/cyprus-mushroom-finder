import json,os,resvg_py
t=json.load(open('trace.json')); P=t['paths']; C={k:'#%02x%02x%02x'%tuple(v) for k,v in t['cols'].items()}
print(C)
CREAM=C['tree']
def svg(vb,body,title='ShroomyMap.cy'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'
def icon(full=False):
    return (f'<path fill-rule="evenodd" fill="{C["tile"]}" d="{P["tilefull" if full else "tile"]}"/><path fill-rule="evenodd" fill="{C["soil"]}" d="{P["soilfull" if full else "soil"]}"/>'
            f'<path fill-rule="evenodd" fill="{CREAM}" d="{P["tree"]}"/><path fill-rule="evenodd" fill="{C["cap"]}" d="{P["cap"]}"/>')
def word(ink,trail=True):
    return (f'<path fill-rule="evenodd" fill="{ink}" d="{P["word"]}"/>'+(f'<path fill-rule="evenodd" fill="{ink}" d="{P["trail"]}"/>' if trail else '')+f'<path fill-rule="evenodd" fill="{C["cy"]}" d="{P["cy"]}"/>')
x0,y0,x1,y1=t['bbox']; pad=4
VB=f"{x0-pad:.0f} {y0-pad:.0f} {x1-x0+2*pad:.0f} {y1-y0+2*pad:.0f}"
VBW="43 103 1022 200"   # icon + name only (no trail, no X)
tx0,ty0,tx1,ty1=t['tile']; VBI=f"{tx0-2:.0f} {ty0-2:.0f} {tx1-tx0+4:.0f} {ty1-ty0+4:.0f}"
out={'logo-light.svg':svg(VB,icon()+word(C['ink'])),'logo-dark.svg':svg(VB,icon()+word(CREAM)),
     'logo-name-light.svg':svg(VBW,icon()+word(C['ink'],False)),'logo-name-dark.svg':svg(VBW,icon()+word(CREAM,False)),
     'icon.svg':svg(VBI,icon(True),'ShroomyMap')}
os.makedirs('out',exist_ok=True)
for n,s in out.items():
    open('out/'+n,'w').write(s); print(n,len(s))
def png(name,src,w,bg=None):
    s=open('out/'+src).read()
    b=resvg_py.svg_to_bytes(svg_string=s,width=w,background=bg) if bg else resvg_py.svg_to_bytes(svg_string=s,width=w)
    open('out/'+name,'wb').write(bytes(b))
png('check-light.png','logo-light.svg',1180,'#f5ecdc'); png('check-dark.png','logo-dark.svg',1180,'#14211b')
png('check-icon.png','icon.svg',360); png('check-name.png','logo-name-light.svg',1180,'#fffdf8')
