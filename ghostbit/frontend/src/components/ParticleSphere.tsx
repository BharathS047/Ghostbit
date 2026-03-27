"use client";
import { useEffect, useRef } from "react";

const _0x4a = [
  0xDAC, 1, 1, 1.2, 0.4, 100, 1, 5, 0.5, 0.06, 0.88, 50, 2.5, 3, 0.15, 8,
];
const _0xf3 = (() => {
  const _a = 0x3;
  return Math.PI * (_a - Math.sqrt(_a + 0x2));
})();
const _t = (v: number, a: number, b: number, c: number, d: number): number =>
  a === b ? c : c + ((v - a) / (b - a)) * (d - c);
const _0xc = [0xef, 0x44, 0x44].reduce(
  (s, v) => s + v.toString(16).padStart(2, "0"),
  "#"
);

export default function ParticleSphere() {
  const _r = useRef<HTMLDivElement>(null);
  const _x = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = _r.current;
    if (!el) return;
    let _a = true;

    (async () => {
      const {
        Scene: _S,
        PerspectiveCamera: _P,
        WebGLRenderer: _W,
        Color: _C,
        SphereGeometry: _G,
        MeshBasicMaterial: _M,
        InstancedMesh: _I,
        Matrix4: _4,
        Group: _Q,
        Vector3: _V,
        AdditiveBlending: _B,
        Float32BufferAttribute: _F,
      } = await import("three");
      if (!_a || !el) return;

      const w0 = el.clientWidth || 400;
      const h0 = el.clientHeight || 400;
      const _om = _0x4a[12];
      const cw = w0 * _om;
      const ch = h0 * _om;
      const _sc = new _S();
      const _af =
        2 *
        Math.atan(Math.tan((_0x4a[11] * Math.PI) / 360) * _om) *
        (180 / Math.PI);
      const _cm = new _P(_af, cw / ch, 0.1, 1000);
      const _sm = _t(_0x4a[3], 0, 1, 0.25, 1.25);
      _cm.position.z = Math.max(_0x4a[13], _sm + 1);

      const _wr = new _W({ antialias: true, alpha: true });
      _wr.setSize(cw, ch);
      _wr.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      (_wr as any).outputColorSpace = "srgb";

      const _cv = _wr.domElement;
      _cv.style.position = "absolute";
      const _ox = (cw - w0) / 2;
      const _oy = (ch - h0) / 2;
      _cv.style.left = `-${_ox}px`;
      _cv.style.top = `-${_oy}px`;
      _cv.style.width = `${cw}px`;
      _cv.style.height = `${ch}px`;
      el.appendChild(_cv);

      const n = _0x4a[0] | 0;
      const _v: number[] = [];
      const _bp: InstanceType<typeof _V>[] = [];
      const _dp: InstanceType<typeof _V>[] = [];
      const _sv: InstanceType<typeof _V>[] = [];
      const _cl = new _C(_0xc);

      for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const q = _0xf3 * i;
        const px = Math.cos(q) * r * _sm;
        const py = y * _sm;
        const pz = Math.sin(q) * r * _sm;
        _v.push(px, py, pz);
        _bp.push(new _V(px, py, pz));
        _dp.push(new _V(0, 0, 0));
        _sv.push(new _V(0, 0, 0));
      }

      const _ps = _t(_0x4a[4], 0.1, 1, 0.01, 0.1);
      const _sg = new _G(
        _ps * _0x4a[14],
        _0x4a[15] | 0,
        _0x4a[15] | 0
      );
      const _mt = new _M({
        color: 0xffffff,
        blending: _B,
        transparent: true,
        opacity: 1,
      });
      const _im = new _I(_sg, _mt, n);
      const _mx = new _4();

      for (let i = 0; i < n; i++) {
        _mx.setPosition(_v[i * 3], _v[i * 3 + 1], _v[i * 3 + 2]);
        _im.setMatrixAt(i, _mx);
      }
      _im.instanceMatrix.needsUpdate = true;

      const _cl_red = new _C(0xef4444);
      const _cl_white = new _C(0xffffff);
      for (let i = 0; i < n; i++) {
        const _cl = i % 2 === 0 ? _cl_white : _cl_red;
        _im.setColorAt(i, _cl);
      }
      if (_im.instanceColor) _im.instanceColor.needsUpdate = true;

      const _qg = new _Q();
      _qg.add(_im);
      _sc.add(_qg);

      const _ro = { x: 0, y: 0 };
      const _tg = { x: 0, y: 0 };
      const _vl = { x: 0, y: 0 };
      let _dr = false;
      let _lx = 0;
      let _ly = 0;
      let _lf = performance.now();
      const _td = 1000 / 60;
      const _rs = _t(_0x4a[1], 0.1, 1, 0.01, 0.05);
      const _lp = _t(_0x4a[2], 0, 1, 0.4, 0.03);
      const _vd = _t(_0x4a[2], 0, 1, 0.7, 0.96);
      let _ms: { x: number; y: number } | null = null;
      const _cr = Math.max(0, Math.min(600, _0x4a[5]));
      const _cs = _t(_0x4a[6], 0, 1, 0, 15);

      let _rf: number;
      let _cw = cw;
      let _ch = ch;
      let _oxx = _ox;
      let _oyy = _oy;

      function _an() {
        const now = performance.now();
        const dt = now - _lf;
        _lf = now;
        const df = dt / _td;
        const th = 0.01;

        if (!_dr && _rs !== 0) {
          _tg.x += _rs * 0.1 * df;
        }

        if (!_dr && _0x4a[2] > 0) {
          if (Math.abs(_vl.x) > th || Math.abs(_vl.y) > th) {
            _tg.x += _vl.x * df;
            _tg.y += _vl.y * df;
            _tg.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, _tg.y));
            const d = Math.pow(_vd, df);
            _vl.x *= d;
            _vl.y *= d;
          }
        }

        const dx = _tg.x - _ro.x;
        const dy = _tg.y - _ro.y;
        if (
          Math.abs(dx) > th ||
          Math.abs(dy) > th ||
          _rs !== 0 ||
          _dr
        ) {
          const f = 1 - Math.pow(1 - _lp, df);
          _ro.x += dx * f;
          _ro.y += dy * f;
          _ro.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, _ro.y));
        }

        _qg.rotation.y = _ro.x;
        _qg.rotation.x = _ro.y;
        _qg.updateMatrixWorld(true);

        if (_ms) {
          const rsq = _cr * _cr;
          for (let i = 0; i < _bp.length; i++) {
            const d = _dp[i];
            const wp = new _V()
              .copy(_bp[i])
              .add(d)
              .applyMatrix4(_qg.matrixWorld);
            const pr = wp.project(_cm);
            const sx = (pr.x * 0.5 + 0.5) * _cw;
            const sy = (-pr.y * 0.5 + 0.5) * _ch;
            const ddx = _ms.x - sx;
            const ddy = _ms.y - sy;
            const dsq = ddx * ddx + ddy * ddy;

            if (dsq < rsq && dsq > 0) {
              const force = (_cr - Math.sqrt(dsq)) / _cr;
              const angle = Math.atan2(ddy, ddx);
              const rep = force * _cs * _0x4a[1] * df * 0.01;
              const lr = new _V()
                .addScaledVector(
                  new _V().setFromMatrixColumn(_cm.matrixWorld, 0),
                  -Math.cos(angle) * rep
                )
                .addScaledVector(
                  new _V().setFromMatrixColumn(_cm.matrixWorld, 1),
                  Math.sin(angle) * rep
                )
                .applyMatrix4(
                  new _4().copy(_qg.matrixWorld).invert()
                );
              d.add(lr);
            }
          }
        }

        const fr = Math.pow(_0x4a[10], df);
        const rm = 1 - _0x4a[9] * _0x4a[1] * df;
        for (let i = 0; i < _dp.length; i++) {
          _dp[i].multiplyScalar(fr).multiplyScalar(rm);
        }

        for (let i = 0; i < _sv.length; i++) {
          _dp[i].addScaledVector(_sv[i], df * 0.1);
          _sv[i]
            .multiplyScalar(Math.pow(0.95, df))
            .multiplyScalar(rm);
        }

        const m = new _4();
        for (let i = 0; i < _bp.length; i++) {
          const p = new _V().copy(_bp[i]).add(_dp[i]);
          m.setPosition(p.x, p.y, p.z);
          _im.setMatrixAt(i, m);
        }
        _im.instanceMatrix.needsUpdate = true;

        _wr.render(_sc, _cm);
        _rf = requestAnimationFrame(_an);
      }

      _rf = requestAnimationFrame(_an);

      const _eh = {
        e: () => { },
        l: () => {
          _ms = null;
        },
        m: (e: MouseEvent) => {
          const rect = el.getBoundingClientRect();
          _ms = {
            x: e.clientX - rect.left + _oxx,
            y: e.clientY - rect.top + _oyy,
          };
        },
        d: (e: MouseEvent) => {
          _dr = true;
          _lx = e.clientX;
          _ly = e.clientY;
          const onM = (me: MouseEvent) => {
            const s = _t(_0x4a[8], 0, 1, 0.001, 0.02);
            _tg.x += (me.clientX - _lx) * s;
            _tg.y += (me.clientY - _ly) * s;
            _lx = me.clientX;
            _ly = me.clientY;
          };
          const onU = () => {
            document.removeEventListener("mousemove", onM);
            _dr = false;
          };
          document.addEventListener("mousemove", onM);
          document.addEventListener("mouseup", onU, { once: true });
        },
      };

      _cv.addEventListener("mouseenter", _eh.e);
      _cv.addEventListener("mouseleave", _eh.l);
      document.addEventListener("mouseleave", _eh.l);
      window.addEventListener("blur", _eh.l);
      _cv.addEventListener("mousemove", _eh.m);
      _cv.addEventListener("mousedown", _eh.d);

      const _rz = () => {
        const w = el.clientWidth || 400;
        const h = el.clientHeight || 400;
        _cw = w * _om;
        _ch = h * _om;
        _wr.setSize(_cw, _ch);
        _cm.aspect = _cw / _ch;
        _cm.updateProjectionMatrix();
        _oxx = (_cw - w) / 2;
        _oyy = (_ch - h) / 2;
        _cv.style.left = `-${_oxx}px`;
        _cv.style.top = `-${_oyy}px`;
        _cv.style.width = `${_cw}px`;
        _cv.style.height = `${_ch}px`;
      };
      window.addEventListener("resize", _rz);

      _x.current = () => {
        cancelAnimationFrame(_rf);
        window.removeEventListener("resize", _rz);
        _cv.removeEventListener("mouseenter", _eh.e);
        _cv.removeEventListener("mouseleave", _eh.l);
        _cv.removeEventListener("mousemove", _eh.m);
        _cv.removeEventListener("mousedown", _eh.d);
        document.removeEventListener("mouseleave", _eh.l);
        window.removeEventListener("blur", _eh.l);
        _wr.dispose();
        _sg.dispose();
        _mt.dispose();
        if (_cv.parentNode) _cv.parentNode.removeChild(_cv);
      };
    })();

    return () => {
      _a = false;
      _x.current?.();
    };
  }, []);

  return (
    <div
      ref={_r}
      className="w-full h-full relative"
      style={{ overflow: "visible" }}
    />
  );
}
