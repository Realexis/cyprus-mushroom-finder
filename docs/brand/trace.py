import numpy as np, potrace, json
from PIL import Image
from scipy import ndimage as ndi
SRC='/Users/realexis/Desktop/WORK/ShroomyCY/9_Logo-combos/ShroomyMap-cy_U1-icon_L2-wordmark.png'
K=4
im=Image.open(SRC).convert('RGB'); W,H=im.size
a=np.asarray(im.resize((W*K,H*K),Image.LANCZOS)).astype(float)
cream=np.array([245,236,220.]); green=np.array([24,62,42.]); orange=np.array([188,93,27.])
def proj(c):
    v=c-cream; t=((a-cream)@v)/(v@v); r=np.linalg.norm(a-(cream+np.clip(t,0,1)[...,None]*v),axis=-1); return t,r
tg,rg=proj(green); to,ro=proj(orange)
isO=ro<rg
ink_any=np.where(isO,to,tg)>0.5
def clean(m,n=K*K*6):
    lab,k=ndi.label(m); sz=ndi.sum(m,lab,range(1,k+1)); return np.isin(lab,1+np.flatnonzero(sz>=n))
lab,k=ndi.label(ink_any)
tile=ndi.binary_fill_holes(lab==lab[200*K,100*K])
R,G,B=a[...,0],a[...,1],a[...,2]; L=a.mean(-1)
warm=(R-G>15)&(L<215)&tile
cap=clean(ndi.binary_opening(warm&(R-G>62),iterations=K),K*K*20)
soil=clean(ndi.binary_opening(warm&~ndi.binary_dilation(cap,iterations=K),iterations=K*2),K*K*200)
tree=clean((tg<0.5)&(~warm)&tile&~cap&~soil&ndi.binary_erosion(tile,iterations=K*2),K*K*10)
inkm=clean(ink_any&~isO&~tile)
li,n_=ndi.label(inkm); sz=ndi.sum(inkm,li,range(1,n_+1)); objs=ndi.find_objects(li)
big=[i+1 for i in range(n_) if sz[i]>1000*K*K and objs[i][1].start<1070*K]
word=np.isin(li,big); trail=inkm&~word
# whole tile for the icon-only files: the S cuts a notch in the right side; mirror the left side over it
ys,xs=np.nonzero(tile); x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
full=tile.copy(); full[y0:y1,x0:x1]|=tile[y0:y1,x0:x1][:,::-1]
notch=full&~tile; soilf=soil.copy()
for y in np.flatnonzero(notch.any(1)):
    sx=np.flatnonzero(soil[y]); tx=np.flatnonzero(tile[y])
    if len(sx) and tx.max()-sx.max()<K*3: soilf[y]|=notch[y]
print('notch px',int(notch.sum()/K/K))
layers={'tile':tile,'soil':soil,'tree':tree,'cap':cap,'word':word,'trail':trail,
        'cy':clean(ink_any&isO&~tile,K*K*30),'tilefull':full,'soilfull':soilf}
for k_,v in layers.items(): print(k_,int(v.sum()/K/K), ndi.label(v)[1])
def med(mask):
    e=ndi.binary_erosion(mask,iterations=K*2); return tuple(int(v) for v in np.median(a[e],axis=0))
cols={k_:med(v) for k_,v in layers.items()}; cols['tile']=med(tile&~soil&~tree&~cap); cols['ink']=cols['word']; print(cols)
al=tile|inkm|layers['cy']; ys,xs=np.nonzero(al); bb=[xs.min()/K,ys.min()/K,(xs.max()+1)/K,(ys.max()+1)/K]
ys,xs=np.nonzero(tile); tb=[xs.min()/K,ys.min()/K,(xs.max()+1)/K,(ys.max()+1)/K]
# word only (letters, no trail/X): components of ink that are big letters -> report component boxes
wb=np.nonzero(word|layers['cy']); print('word box',wb[1].min()/K,wb[0].min()/K,wb[1].max()/K,wb[0].max()/K)
def path(mask):
    pl=potrace.Bitmap(~mask).trace(turdsize=K*K*2,alphamax=1.0,opttolerance=0.5)
    f=lambda p:f"{p.x/K:.1f} {p.y/K:.1f}"; out=[]
    for c in pl:
        out.append("M"+f(c.start_point))
        for s in c.segments: out.append(("L"+f(s.c)+"L"+f(s.end_point)) if s.is_corner else ("C"+f(s.c1)+" "+f(s.c2)+" "+f(s.end_point)))
        out.append("Z")
    return "".join(out)
json.dump({'paths':{k_:path(v) for k_,v in layers.items()},'cols':cols,'bbox':bb,'tile':tb},open('trace.json','w'))
print(bb,tb)
