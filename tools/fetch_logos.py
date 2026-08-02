#!/usr/bin/env python3
"""KHO LOGO VĨNH VIỄN — tải logo từng mã về repo, chuẩn hoá WebP 96px.

Lý do: logo là thứ DUY NHẤT trước đây còn đi mượn cdn.simplize.vn (họ chỉ cho cache 24h,
ảnh gốc trung bình 98KB — có mã 1.9MB — trong khi web chỉ hiện 26–44px). Nguồn đổi/chặn
là mất sạch logo. Sau khi kho hoá: ~1.6KB/mã, phục vụ từ cpvn.io, cache 1 năm (xem _headers).

  python3 tools/fetch_logos.py             # chỉ tải mã CHƯA có file
  python3 tools/fetch_logos.py VNM VIC     # vài mã
  python3 tools/fetch_logos.py --force     # tải lại tất cả (khi muốn làm mới)

Cần Pillow: pip install Pillow
"""
import json, os, sys, io, time, urllib.request, concurrent.futures, threading
from PIL import Image

BASE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNIV=os.path.join(BASE,"universe.json")
LOGO_DIR=os.path.join(BASE,"assets","logo")
UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120"}
SIZE=96          # đủ nét cho chỗ hiển thị lớn nhất (44px) trên màn retina 2x
QUALITY=82

def to_webp(raw):
    """bytes ảnh gốc -> bytes WebP vuông tối đa 96px, nền trắng (CSS cũng đang nền trắng)."""
    im=Image.open(io.BytesIO(raw))
    if im.mode in ("RGBA","LA","P"):
        im=im.convert("RGBA")
        bg=Image.new("RGBA",im.size,(255,255,255,255))
        im=Image.alpha_composite(bg,im).convert("RGB")
    else:
        im=im.convert("RGB")
    im.thumbnail((SIZE,SIZE),Image.LANCZOS)
    out=io.BytesIO(); im.save(out,"WEBP",quality=QUALITY,method=6)
    return out.getvalue()

def fetch_one(sym,url,dest):
    for att in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=25) as r:
                raw=r.read()
            data=to_webp(raw)
            tmp=dest+".tmp"
            open(tmp,"wb").write(data); os.replace(tmp,dest)
            return len(raw),len(data)
        except Exception:
            if att<2: time.sleep(1.0*(att+1))
    return None

def main():
    u=json.load(open(UNIV,encoding="utf-8"))
    stocks={s["sym"]:s for s in u["stocks"]}
    os.makedirs(LOGO_DIR,exist_ok=True)
    force="--force" in sys.argv
    picked=[a.upper() for a in sys.argv[1:] if not a.startswith("-")]
    syms=[s for s in (picked or stocks) if s in stocks and stocks[s].get("img")]
    if not force and not picked:
        syms=[s for s in syms if not os.path.exists(os.path.join(LOGO_DIR,f"{s}.webp"))]
    print(f"kho logo: cần tải {len(syms)} mã (đã có {len(os.listdir(LOGO_DIR))} file)",flush=True)
    if not syms: return
    lock=threading.Lock(); st=[0,0,0,0]   # xong, lỗi, byte gốc, byte webp
    def work(sym):
        r=fetch_one(sym,stocks[sym]["img"],os.path.join(LOGO_DIR,f"{sym}.webp"))
        with lock:
            if r: st[0]+=1; st[2]+=r[0]; st[3]+=r[1]
            else: st[1]+=1
            n=st[0]+st[1]
            if n%150==0: print(f"  {n}/{len(syms)}",flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(work,syms))
    if st[0]:
        print(f"XONG: {st[0]} logo ok, {st[1]} lỗi | {st[2]/1e6:.0f} MB gốc -> {st[3]/1e6:.2f} MB WebP "
              f"(TB {st[3]/st[0]/1024:.1f} KB/logo)",flush=True)
    else:
        print(f"XONG: 0 logo ok, {st[1]} lỗi",flush=True)

if __name__=="__main__": main()
