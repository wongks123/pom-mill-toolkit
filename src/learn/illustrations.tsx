import type { ReactNode } from 'react'

// Shared look for every station drawing (viewBox 0 0 360 220).
export const C = {
  ink: '#44403c',
  muted: '#78716c',
  steel: '#a8a29e',
  steelDark: '#57534e',
  bunch: '#7c2d12',
  fruit: '#ea580c',
  oil: '#f59e0b',
  sludge: '#92400e',
  water: '#93c5fd',
  steam: '#e7e5e4',
  fibre: '#d6b98c',
  nut: '#44403c',
  kernel: '#fde68a',
  green: '#15803d',
  flame: '#f97316',
}

/** Area per "How it works" step: [x, y, w, h], highlighted when that step is active. */
export type Area = [number, number, number, number]

export interface Illustration {
  areas: Area[]
  /** Step marker centres; defaults to each area's top-left corner. */
  badges?: [number, number][]
  Art: () => ReactNode
}

const Spin = ({ cx, cy, dur = '3s', reverse = false }: { cx: number; cy: number; dur?: string; reverse?: boolean }) => (
  <animateTransform attributeName="transform" type="rotate" from={`${reverse ? 360 : 0} ${cx} ${cy}`} to={`${reverse ? 0 : 360} ${cx} ${cy}`} dur={dur} repeatCount="indefinite" />
)

/** A pipe or chute with material flowing along it as moving dashes. */
const Flow = ({ d, color = C.steel, flow = C.oil, width = 6, dur = '1.2s' }: { d: string; color?: string; flow?: string; width?: number; dur?: string }) => (
  <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} stroke={color} strokeWidth={width} />
    <path d={d} stroke={flow} strokeWidth={width / 2.5} strokeDasharray="3 7">
      <animate attributeName="stroke-dashoffset" from="20" to="0" dur={dur} repeatCount="indefinite" />
    </path>
  </g>
)

/** Small particles travelling along a path, staggered. */
const Movers = ({ path, n = 4, r = 3, fill = C.fruit, dur = 3, shape = 'circle' }: { path: string; n?: number; r?: number; fill?: string; dur?: number; shape?: 'circle' | 'fibre' | 'oval' }) => (
  <g>
    {Array.from({ length: n }, (_, k) => (
      <g key={k}>
        {shape === 'fibre' ? <path d={`M${-r} 0 L${r} ${r / 2}`} stroke={fill} strokeWidth={1.6} strokeLinecap="round" /> : shape === 'oval' ? <ellipse rx={r * 1.3} ry={r} fill={fill} stroke={C.ink} strokeWidth={0.6} /> : <circle r={r} fill={fill} />}
        <animateMotion path={path} dur={`${dur}s`} begin={`${(-dur * k) / n}s`} repeatCount="indefinite" />
      </g>
    ))}
  </g>
)

const Bunch = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse rx="11" ry="9" fill={C.bunch} />
    {[[-5, -3], [0, -5], [5, -2], [-3, 3], [4, 4], [0, 0]].map(([a, b], k) => <circle key={k} cx={a} cy={b} r="2.4" fill={C.fruit} />)}
  </g>
)

const Label = ({ x, y, children, anchor = 'middle', size = 9 }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; size?: number }) => (
  <text x={x} y={y} fontSize={size} textAnchor={anchor} fill={C.ink}>{children}</text>
)

const Ground = ({ y = 205 }: { y?: number }) => <line x1="0" y1={y} x2="360" y2={y} stroke="#d6d3d1" strokeWidth="2" />

// ---------- 1. FFB reception ----------
const reception: Illustration = {
  areas: [[8, 128, 120, 84], [126, 108, 40, 90], [150, 70, 125, 110], [268, 140, 88, 72]],
  Art: () => (
    <g>
      <Ground />
      {/* weighbridge */}
      <rect x="15" y="196" width="105" height="7" fill={C.steelDark} />
      <rect x="40" y="128" width="46" height="18" rx="3" fill="#1c1917" />
      <text x="63" y="141" fontSize="10" textAnchor="middle" fill="#4ade80" fontFamily="monospace">
        12.4 t<animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </text>
      <Label x={63} y={124}>Weighbridge</Label>
      {/* lorry driving onto the weighbridge */}
      <g>
        <animateTransform attributeName="transform" type="translate" values="-110 0; 0 0; 0 0; -110 0" keyTimes="0;0.35;0.85;1" dur="7s" repeatCount="indefinite" />
        <rect x="20" y="160" width="62" height="30" rx="2" fill={C.green} />
        <rect x="84" y="168" width="24" height="22" rx="3" fill="#166534" />
        <rect x="90" y="171" width="12" height="8" fill="#dbeafe" />
        <Bunch x={36} y={156} s={0.8} /><Bunch x={52} y={154} s={0.8} /><Bunch x={68} y={156} s={0.8} />
        {[34, 70, 98].map((cx) => <circle key={cx} cx={cx} cy="192" r="6" fill="#292524" />)}
      </g>
      {/* grader */}
      <circle cx="146" cy="160" r="6" fill={C.ink} />
      <rect x="140" y="167" width="12" height="22" rx="4" fill={C.fruit} />
      <rect x="152" y="172" width="8" height="10" fill="#fff" stroke={C.ink} strokeWidth="0.8" />
      <Label x={146} y={203}>Grader</Label>
      {/* loading ramp with bay door */}
      <path d="M160 92 L268 150 L268 158 L160 100 Z" fill={C.steel} />
      <rect x="262" y="128" width="5" height="22" fill={C.steelDark}>
        <animate attributeName="height" values="22;4;4;22" keyTimes="0;0.2;0.8;1" dur="4s" repeatCount="indefinite" />
      </rect>
      <Label x={205} y={88}>Loading ramp</Label>
      <Movers path="M170 88 L262 138 L296 160" n={4} dur={4} r={4} fill={C.bunch} />
      {/* steriliser cage on rails */}
      <rect x="276" y="150" width="70" height="42" rx="3" fill="none" stroke={C.steelDark} strokeWidth="2.5" />
      {[290, 304, 318, 332].map((x) => <line key={x} x1={x} y1="150" x2={x} y2="192" stroke={C.steel} strokeWidth="1" />)}
      <Bunch x={296} y={182} s={0.8} /><Bunch x={318} y={183} s={0.8} /><Bunch x={308} y={170} s={0.8} />
      <line x1="270" y1="203" x2="356" y2="203" stroke={C.steelDark} strokeWidth="2" />
      <circle cx="288" cy="197" r="4" fill={C.steelDark} /><circle cx="334" cy="197" r="4" fill={C.steelDark} />
      <Label x={311} y={146}>Steriliser cage</Label>
    </g>
  ),
}

// ---------- 2. Sterilisation ----------
const PEAKS = 'M30 205 L60 165 L72 200 L102 160 L114 198 L150 150 L240 150 L255 200 L330 205'
const sterilisation: Illustration = {
  areas: [[20, 30, 290, 92], [26, 140, 115, 70], [140, 140, 110, 70], [150, 112, 70, 30]],
  badges: [[14, 44], [24, 150], [150, 176], [168, 128]],
  Art: () => (
    <g>
      {/* horizontal pressure vessel */}
      <rect x="30" y="35" width="250" height="80" rx="38" fill="#f5f5f4" stroke={C.steelDark} strokeWidth="3" />
      <rect x="282" y="38" width="10" height="74" rx="3" fill={C.steelDark} />
      <Label x={287} y={30}>Door</Label>
      {[60, 125, 190].map((x) => (
        <g key={x}>
          <rect x={x} y="55" width="58" height="44" rx="2" fill="none" stroke={C.steel} strokeWidth="1.5" />
          <Bunch x={x + 16} y={88} s={0.75} /><Bunch x={x + 40} y={88} s={0.75} /><Bunch x={x + 28} y={72} s={0.75} />
        </g>
      ))}
      {/* steam inlet with puffs */}
      <Flow d="M120 8 L120 36" flow="#fff" color={C.steel} width={7} dur="0.6s" />
      {[0, 1, 2].map((k) => (
        <circle key={k} cx="120" cy="48" r="5" fill={C.steam}>
          <animate attributeName="r" values="3;12" dur="1.8s" begin={`${k * 0.6}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0" dur="1.8s" begin={`${k * 0.6}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <Label x={146} y={16} anchor="start">Steam in</Label>
      {/* pressure gauge following the triple-peak cycle */}
      <circle cx="44" cy="18" r="13" fill="#fff" stroke={C.ink} strokeWidth="2" />
      <line x1="44" y1="18" x2="44" y2="9" stroke={C.fruit} strokeWidth="2" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" values="-70 44 18;20 44 18;-60 44 18;30 44 18;-55 44 18;45 44 18;45 44 18;-70 44 18" keyTimes="0;0.1;0.14;0.24;0.28;0.4;0.7;1" dur="9s" repeatCount="indefinite" />
      </line>
      <Label x={61} y={22} anchor="start">≈ 3 bar g</Label>
      {/* condensate drain */}
      <path d="M185 115 L185 128 L230 128" fill="none" stroke={C.steelDark} strokeWidth="4" />
      <Movers path="M185 117 L185 128 L235 128 L235 136" n={3} r={2.5} fill={C.oil} dur={2} />
      <Label x={238} y={126} anchor="start">Condensate (carries oil)</Label>
      {/* triple-peak chart */}
      <line x1="30" y1="205" x2="335" y2="205" stroke="#d6d3d1" />
      <path d={PEAKS} fill="none" stroke={C.green} strokeWidth="2" />
      <circle r="4.5" fill={C.fruit} stroke="#fff" strokeWidth="1.5">
        <animateMotion path={PEAKS} dur="9s" repeatCount="indefinite" />
      </circle>
      <Label x={86} y={155}>3 peaks</Label>
      <Label x={195} y={146}>Hold (cooking)</Label>
      <Label x={300} y={198}>Blow-off</Label>
    </g>
  ),
}

// ---------- 3. Threshing ----------
const threshing: Illustration = {
  areas: [[6, 28, 100, 82], [110, 20, 140, 140], [96, 150, 210, 60], [252, 40, 106, 86]],
  badges: [[104, 44], [119, 29], [105, 159], [261, 49]],
  Art: () => (
    <g>
      {/* hopper + auto feeder */}
      <path d="M14 30 L96 30 L80 78 L30 78 Z" fill="#f5f5f4" stroke={C.steelDark} strokeWidth="2" />
      <Bunch x={40} y={52} /><Bunch x={64} y={46} /><Bunch x={56} y={66} s={0.9} />
      <Movers path="M70 80 L110 96 L150 96" n={2} r={6} fill={C.bunch} dur={3} />
      <Label x={55} y={24}>Auto feeder</Label>
      {/* drum, end view, turning with bars */}
      <circle cx="180" cy="90" r="62" fill="#fafaf9" stroke={C.steelDark} strokeWidth="3" />
      <g>
        <Spin cx={180} cy={90} dur="4s" />
        {Array.from({ length: 14 }, (_, k) => {
          const a = (k / 14) * Math.PI * 2
          return <line key={k} x1={180 + 52 * Math.cos(a)} y1={90 + 52 * Math.sin(a)} x2={180 + 62 * Math.cos(a)} y2={90 + 62 * Math.sin(a)} stroke={C.steelDark} strokeWidth="3" />
        })}
        <g><Bunch x={180} y={130} /></g>
        <g><Bunch x={145} y={110} s={0.9} /></g>
        <g><Bunch x={214} y={112} s={0.9} /></g>
      </g>
      <Label x={180} y={20}>Thresher drum 22–24 rpm</Label>
      {/* fruitlets falling to the conveyor */}
      {[150, 172, 194, 214].map((x, k) => (
        <circle key={x} cx={x} cy="150" r="3" fill={C.fruit}>
          <animate attributeName="cy" values="140;186" dur="1.1s" begin={`${k * 0.27}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <Flow d="M100 192 L300 192" color={C.steelDark} flow={C.fruit} width={8} dur="0.8s" />
      <Label x={200} y={210}>Fruitlets → fruit conveyor</Label>
      {/* empty bunches leaving the drum end */}
      <path d="M244 104 L300 120" stroke={C.steel} strokeWidth="6" />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 56 16" dur="2.5s" repeatCount="indefinite" />
        <ellipse cx="250" cy="96" rx="10" ry="8" fill="#a16207" />
      </g>
      <Label x={305} y={66}>EFB out</Label>
      <Label x={305} y={78}>(empty bunch)</Label>
    </g>
  ),
}

// ---------- 4. Digestion & pressing ----------
const pressing: Illustration = {
  areas: [[10, 16, 90, 146], [104, 72, 216, 74], [130, 140, 130, 72], [262, 140, 96, 72]],
  badges: [[100, 30], [112, 64], [124, 186], [352, 176]],
  Art: () => (
    <g>
      {/* digester with steam jacket and turning arms */}
      <rect x="22" y="24" width="66" height="116" rx="6" fill="#fff7ed" stroke={C.steelDark} strokeWidth="2.5" />
      <rect x="17" y="40" width="76" height="90" rx="6" fill="none" stroke={C.fruit} strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="55" y1="14" x2="55" y2="132" stroke={C.steelDark} strokeWidth="3" />
      {[50, 78, 106].map((y, k) => (
        <g key={y} transform={`translate(55 ${y})`}>
          <line x1="-24" y1="0" x2="24" y2="0" stroke={C.steelDark} strokeWidth="3">
            <animateTransform attributeName="transform" type="scale" values="1 1;-1 1;1 1" dur="2s" begin={`${k * 0.3}s`} repeatCount="indefinite" />
          </line>
        </g>
      ))}
      {[38, 70, 98, 120].map((y) => <circle key={y} cx={y % 2 ? 40 : 70} cy={y} r="3" fill={C.fruit} />)}
      <Label x={55} y={10}>Digester 90–95 °C</Label>
      {/* mash chute into the press */}
      <Flow d="M55 140 L55 152 L104 110" flow={C.fruit} width={7} dur="1s" />
      {/* twin-screw press */}
      <rect x="104" y="88" width="190" height="44" rx="4" fill="#fafaf9" stroke={C.steelDark} strokeWidth="2.5" strokeDasharray="2 2" />
      {[100, 120].map((y) => (
        <path key={y} d={`M108 ${y} ${Array.from({ length: 18 }, (_, k) => `L${112 + k * 10} ${y + (k % 2 ? -7 : 7)}`).join(' ')}`} fill="none" stroke={C.steelDark} strokeWidth="2" strokeDasharray="6 4">
          <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.9s" repeatCount="indefinite" />
        </path>
      ))}
      <Label x={190} y={82}>Twin-screw press</Label>
      {/* adjustable cones */}
      <path d="M296 92 L312 110 L296 128 Z" fill={C.steelDark}>
        <animateTransform attributeName="transform" type="translate" values="0 0;4 0;0 0" dur="3s" repeatCount="indefinite" />
      </path>
      <Label x={318} y={86}>Cones</Label>
      {/* press cake out */}
      <Movers path="M314 112 L350 112 L356 150" n={3} r={4} fill={C.fibre} dur={2.4} />
      <Label x={330} y={160}>Cake → fibre</Label>
      {/* crude oil draining through the cage */}
      {[140, 175, 210, 245].map((x, k) => (
        <circle key={x} cx={x} cy="140" r="2.5" fill={C.oil}>
          <animate attributeName="cy" values="134;160" dur="0.9s" begin={`${k * 0.2}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <path d="M130 162 L260 162 L250 176 L140 176 Z" fill={C.oil} opacity="0.85" />
      <Flow d="M195 176 L195 196" flow={C.oil} />
      <rect x="148" y="196" width="94" height="14" rx="2" fill="#fff" stroke={C.ink} />
      <Label x={195} y={206}>Sand trap / screen</Label>
      {/* dilution water */}
      <Flow d="M300 186 L262 186 L255 172" flow={C.water} color={C.steel} dur="0.8s" />
      <Label x={305} y={200} anchor="start">Hot water</Label>
    </g>
  ),
}

// ---------- 5. Clarification ----------
const clarification: Illustration = {
  areas: [[6, 52, 80, 104], [92, 18, 150, 170], [240, 120, 116, 92], [240, 10, 116, 100]],
  badges: [[14, 166], [98, 40], [246, 140], [246, 32]],
  Art: () => (
    <g>
      {/* crude oil tank with heating coil */}
      <rect x="14" y="70" width="60" height="78" rx="3" fill="#fff" stroke={C.steelDark} strokeWidth="2" />
      <rect x="16" y="86" width="56" height="60" fill={C.oil} opacity="0.55" />
      <path d="M22 134 q6 -8 12 0 t12 0 t12 0 t12 0" fill="none" stroke={C.fruit} strokeWidth="2" />
      <Label x={44} y={64}>Crude oil tank</Label>
      <Flow d="M74 100 L106 100" />
      {/* clarifier with layers */}
      <rect x="104" y="30" width="126" height="150" rx="3" fill="#fff" stroke={C.steelDark} strokeWidth="2.5" />
      <rect x="106" y="40" width="122" height="42" fill={C.oil} />
      <rect x="106" y="82" width="122" height="52" fill="#d97706" opacity="0.45" />
      <rect x="106" y="134" width="122" height="44" fill={C.sludge} opacity="0.75" />
      <Label x={167} y={24}>Clarifier (settling tank)</Label>
      <text x="167" y="64" fontSize="9" textAnchor="middle" fill="#78350f">Oil floats up</text>
      <text x="167" y="164" fontSize="9" textAnchor="middle" fill="#fff">Sludge settles</text>
      {[120, 150, 185, 212].map((x, k) => (
        <circle key={x} cx={x} cy="120" r="3" fill={C.oil} stroke="#fff" strokeWidth="0.6">
          <animate attributeName="cy" values="128;84" dur="2.4s" begin={`${k * 0.6}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {[132, 168, 200].map((x, k) => (
        <circle key={x} cx={x} cy="96" r="2.5" fill={C.sludge}>
          <animate attributeName="cy" values="90;140" dur="2.8s" begin={`${k * 0.9}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {/* oil overflow to purifier and vacuum dryer */}
      <Flow d="M230 44 L262 44 L262 60" />
      <rect x="250" y="60" width="28" height="30" rx="3" fill={C.oil} stroke={C.ink} />
      <Label x={264} y={100}>Pure oil</Label>
      <Flow d="M278 74 L300 74" />
      <g>
        <ellipse cx="314" cy="74" rx="13" ry="16" fill="#fff" stroke={C.ink} strokeWidth="2" />
        <line x1="303" y1="74" x2="325" y2="74" stroke={C.green} strokeWidth="2.5">
          <animateTransform attributeName="transform" type="rotate" from="0 314 74" to="360 314 74" dur="0.8s" repeatCount="indefinite" />
        </line>
      </g>
      <Label x={314} y={50}>Purifier</Label>
      <Flow d="M327 74 L346 74 L346 30" />
      <Label x={356} y={22} anchor="end">Vacuum dryer → CPO</Label>
      {/* sludge underflow to sludge tank and separator */}
      <Flow d="M230 172 L258 172" flow={C.sludge} />
      <rect x="258" y="150" width="34" height="40" rx="3" fill={C.sludge} opacity="0.8" stroke={C.ink} />
      <Label x={275} y={200}>Sludge tank</Label>
      <Flow d="M292 170 L310 170" flow={C.sludge} />
      <g>
        <circle cx="330" cy="170" r="16" fill="#fff" stroke={C.ink} strokeWidth="2" />
        <path d="M330 156 L330 184 M316 170 L344 170" stroke={C.sludge} strokeWidth="2.5">
          <animateTransform attributeName="transform" type="rotate" from="0 330 170" to="360 330 170" dur="1s" repeatCount="indefinite" />
        </path>
      </g>
      <Label x={330} y={200}>Separator</Label>
      <path d="M330 154 L330 132 L292 132 L292 120" fill="none" stroke={C.oil} strokeWidth="3" strokeDasharray="3 3" />
      <Label x={316} y={126}>oil back</Label>
    </g>
  ),
}

// ---------- 6. Nut / fibre separation ----------
const nutfibre: Illustration = {
  areas: [[6, 150, 150, 60], [140, 20, 70, 175], [196, 140, 90, 72], [212, 10, 146, 120]],
  badges: [[14, 200], [140, 50], [204, 160], [222, 40]],
  Art: () => (
    <g>
      {/* cake breaker conveyor */}
      <rect x="14" y="166" width="140" height="26" rx="4" fill="#fafaf9" stroke={C.steelDark} strokeWidth="2" />
      <path d={`M18 179 ${Array.from({ length: 13 }, (_, k) => `L${24 + k * 10} ${179 + (k % 2 ? -9 : 9)}`).join(' ')}`} fill="none" stroke={C.steelDark} strokeWidth="2" strokeDasharray="6 4">
        <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.9s" repeatCount="indefinite" />
      </path>
      <Movers path="M20 172 L150 172" n={5} r={3} fill={C.fibre} dur={3} />
      <Label x={84} y={160}>Cake breaker conveyor</Label>
      {/* de-pericarper column with air stream */}
      <rect x="152" y="36" width="44" height="150" fill="#f8fafc" stroke={C.steelDark} strokeWidth="2.5" />
      {[162, 174, 186].map((x, k) => (
        <path key={x} d={`M${x} 150 l0 -14 m-4 4 l4 -4 l4 4`} fill="none" stroke={C.water} strokeWidth="2">
          <animateTransform attributeName="transform" type="translate" values="0 0;0 -90" dur="1.6s" begin={`${k * 0.5}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0" dur="1.6s" begin={`${k * 0.5}s`} repeatCount="indefinite" />
        </path>
      ))}
      <Movers path="M170 170 L172 40 L200 24 L236 30" n={6} r={5} fill={C.fibre} dur={2.6} shape="fibre" />
      <Label x={174} y={30}>Column</Label>
      {/* nuts falling to polishing drum */}
      <Movers path="M178 120 L178 186 L214 186" n={3} r={4} fill={C.nut} dur={1.8} />
      <circle cx="240" cy="182" r="22" fill="#fafaf9" stroke={C.steelDark} strokeWidth="2.5" />
      <g>
        <Spin cx={240} cy={182} dur="2.5s" />
        {[0, 1, 2, 3, 4, 5].map((k) => <line key={k} x1={240} y1={182} x2={240 + 20 * Math.cos(k)} y2={182 + 20 * Math.sin(k)} stroke={C.steel} strokeWidth="1.5" />)}
        <circle cx="232" cy="190" r="4" fill={C.nut} /><circle cx="248" cy="186" r="4" fill={C.nut} />
      </g>
      <Label x={240} y={214}>Polishing drum → nuts</Label>
      {/* cyclone and fibre to boiler */}
      <path d="M236 22 L300 22 L300 56 L278 96 L258 96 L236 56 Z" fill="#fff" stroke={C.steelDark} strokeWidth="2.5" />
      <path d="M248 38 q20 10 40 0 M252 54 q16 8 32 0 M258 70 q10 6 20 0" fill="none" stroke={C.fibre} strokeWidth="2">
        <animate attributeName="stroke-dashoffset" from="0" to="20" dur="0.8s" repeatCount="indefinite" />
      </path>
      <Label x={268} y={14}>Fibre cyclone</Label>
      <Movers path="M268 96 L268 116 L350 116" n={3} r={5} fill={C.fibre} dur={2} shape="fibre" />
      <Label x={316} y={130}>Fibre → boiler</Label>
      {/* fan */}
      <circle cx="320" cy="60" r="16" fill="#fff" stroke={C.ink} strokeWidth="2" />
      <g>
        <Spin cx={320} cy={60} dur="0.6s" />
        <path d="M320 60 L320 46 M320 60 L332 67 M320 60 L308 67" stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
      </g>
      <line x1="300" y1="40" x2="306" y2="48" stroke={C.steelDark} strokeWidth="4" />
      <Label x={320} y={88}>Fan</Label>
    </g>
  ),
}

// ---------- 7. Kernel recovery ----------
const kernel: Illustration = {
  areas: [[6, 26, 80, 100], [88, 50, 92, 80], [176, 14, 74, 170], [252, 100, 106, 112]],
  badges: [[8, 60], [96, 120], [184, 60], [256, 150]],
  Art: () => (
    <g>
      {/* nut silo / conditioner */}
      <path d="M16 30 L76 30 L76 96 L56 114 L36 114 L16 96 Z" fill="#fafaf9" stroke={C.steelDark} strokeWidth="2" />
      {[30, 46, 62, 38, 54].map((x, k) => <circle key={k} cx={x} cy={50 + (k % 3) * 14} r="5" fill={C.nut} />)}
      {[24, 44, 64].map((x, k) => (
        <path key={x} d={`M${x} 120 q4 -6 0 -12 q-4 -6 0 -12`} fill="none" stroke={C.fruit} strokeWidth="1.5">
          <animate attributeName="opacity" values="0;1;0" dur="1.6s" begin={`${k * 0.5}s`} repeatCount="indefinite" />
        </path>
      ))}
      <Label x={46} y={22}>Nut silo (dry)</Label>
      <Movers path="M46 114 L46 132 L104 132 L118 112" n={3} r={4} fill={C.nut} dur={2} />
      {/* ripple mill */}
      <circle cx="134" cy="84" r="32" fill="#fafaf9" stroke={C.steelDark} strokeWidth="2.5" />
      <g>
        <Spin cx={134} cy={84} dur="0.7s" />
        {Array.from({ length: 8 }, (_, k) => {
          const a = (k / 8) * Math.PI * 2
          return <line key={k} x1={134} y1={84} x2={134 + 22 * Math.cos(a)} y2={84 + 22 * Math.sin(a)} stroke={C.steelDark} strokeWidth="2.5" />
        })}
      </g>
      <Label x={134} y={44}>Ripple mill</Label>
      {/* winnowing column: light shell blown up and out */}
      <rect x="192" y="34" width="34" height="140" fill="#f8fafc" stroke={C.steelDark} strokeWidth="2.5" />
      <Flow d="M166 104 L196 104" flow={C.nut} color={C.steel} />
      <Movers path="M208 110 L208 40 L246 22" n={4} r={3} fill={C.steelDark} dur={1.8} />
      <Movers path="M210 112 L210 176 L262 176" n={3} r={4} fill={C.kernel} dur={2} shape="oval" />
      <Label x={238} y={16}>Light shell out</Label>
      <Label x={209} y={194}>Winnowing</Label>
      {/* clay bath / hydrocyclone: kernel floats, shell sinks */}
      <rect x="262" y="120" width="86" height="72" rx="3" fill="#e0f2fe" stroke={C.steelDark} strokeWidth="2.5" />
      <path d="M264 132 q10 -4 20 0 t20 0 t20 0 t22 0" fill="none" stroke={C.water} strokeWidth="2" />
      <Movers path="M268 132 L346 132" n={3} r={4} fill={C.kernel} dur={3} shape="oval" />
      {[278, 304, 330].map((x, k) => (
        <circle key={x} cx={x} cy="150" r="3.5" fill={C.steelDark}>
          <animate attributeName="cy" values="140;186" dur="2s" begin={`${k * 0.6}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <Label x={305} y={112}>Clay bath / hydrocyclone</Label>
      <Label x={305} y={206}>Kernel floats · shell sinks</Label>
    </g>
  ),
}

// ---------- 8. Boiler & engine room ----------
const boiler: Illustration = {
  areas: [[6, 64, 124, 130], [10, 18, 124, 52], [150, 34, 170, 92], [150, 132, 206, 78]],
  badges: [[14, 100], [14, 36], [156, 70], [190, 176]],
  Art: () => (
    <g>
      {/* furnace with flames and fuel feed */}
      <rect x="20" y="74" width="100" height="116" rx="3" fill="#fff7ed" stroke={C.steelDark} strokeWidth="2.5" />
      {[40, 62, 84, 100].map((x, k) => (
        <path key={x} d={`M${x} 180 q-10 -20 0 -40 q10 20 0 40 z`} fill={k % 2 ? C.flame : '#facc15'}>
          <animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 1;0 0" dur={`${0.8 + k * 0.15}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.65;0.9;1" dur={`${0.7 + k * 0.2}s`} repeatCount="indefinite" />
        </path>
      ))}
      <Movers path="M0 160 L22 160" n={3} r={4} fill={C.fibre} dur={1.6} shape="fibre" />
      <Label x={70} y={204}>Furnace (fibre + shell)</Label>
      {/* fan */}
      <circle cx="132" cy="176" r="10" fill="#fff" stroke={C.ink} strokeWidth="1.5" />
      <g>
        <Spin cx={132} cy={176} dur="0.5s" />
        <path d="M132 176 L132 168 M132 176 L139 180 M132 176 L125 180" stroke={C.ink} strokeWidth="2" />
      </g>
      {/* steam drum and tubes */}
      <rect x="24" y="22" width="92" height="30" rx="14" fill="#fff" stroke={C.steelDark} strokeWidth="2.5" />
      <rect x="27" y="38" width="86" height="11" rx="5" fill={C.water} />
      {[36, 52, 68, 84, 100].map((x) => <line key={x} x1={x} y1="52" x2={x} y2="74" stroke={C.steelDark} strokeWidth="2" />)}
      {[44, 70, 96].map((x, k) => (
        <circle key={x} cx={x} cy="40" r="3" fill="#fff" stroke={C.water}>
          <animate attributeName="cy" values="47;30" dur="1.2s" begin={`${k * 0.4}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0" dur="1.2s" begin={`${k * 0.4}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <Label x={70} y={14}>Boiler drum 20–30 bar g</Label>
      {/* steam to turbine */}
      <Flow d="M116 34 L172 34 L172 60" flow="#fff" color={C.steel} width={7} dur="0.6s" />
      <path d="M164 60 L212 50 L212 112 L164 102 Z" fill="#e7e5e4" stroke={C.steelDark} strokeWidth="2.5" />
      <g>
        <Spin cx={188} cy={81} dur="0.6s" />
        <path d="M188 64 L188 98 M171 81 L205 81" stroke={C.steelDark} strokeWidth="2.5" />
      </g>
      <Label x={216} y={120} anchor="start">Turbine</Label>
      <line x1="212" y1="81" x2="246" y2="81" stroke={C.steelDark} strokeWidth="4" />
      <circle cx="270" cy="81" r="24" fill="#fff" stroke={C.steelDark} strokeWidth="2.5" />
      <path d="M272 64 L262 84 L272 84 L266 100 L282 76 L272 76 Z" fill="#facc15" stroke={C.ink} strokeWidth="0.8">
        <animate attributeName="opacity" values="1;0.35;1" dur="1s" repeatCount="indefinite" />
      </path>
      <Label x={270} y={50}>Alternator → power</Label>
      {/* exhaust to back pressure vessel and process */}
      <Flow d="M188 112 L188 150 L200 150" flow="#fff" color={C.steel} width={6} dur="0.7s" />
      <rect x="200" y="140" width="110" height="26" rx="13" fill="#fff" stroke={C.steelDark} strokeWidth="2.5" />
      <Label x={255} y={157}>BPV ≈ 3 bar g</Label>
      <Flow d="M310 153 L350 153 L350 196" flow="#fff" color={C.steel} width={6} dur="0.7s" />
      <Label x={290} y={204}>To sterilisers & process</Label>
    </g>
  ),
}

// ---------- 9. Effluent treatment ----------
const pond = (x: number, w: number, fill: string) => <path d={`M${x} 110 L${x + w} 110 L${x + w - 12} 170 L${x + 12} 170 Z`} fill={fill} stroke={C.steelDark} strokeWidth="2" />
const effluent: Illustration = {
  areas: [[4, 64, 82, 140], [84, 64, 84, 140], [166, 60, 98, 144], [262, 60, 96, 144]],
  badges: [[12, 74], [94, 74], [176, 70], [270, 70]],
  Art: () => (
    <g>
      <Ground y={172} />
      <Label x={180} y={24}>POME flows pond to pond; BOD falls at every stage</Label>
      {pond(10, 70, '#a16207')}
      <rect x="14" y="110" width="62" height="8" fill={C.oil} />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0;40 0;0 0" dur="4s" repeatCount="indefinite" />
        <line x1="22" y1="96" x2="22" y2="114" stroke={C.ink} strokeWidth="2.5" />
      </g>
      <Label x={45} y={188}>Fat pit</Label>
      <Label x={45} y={200}>skim oil</Label>
      {pond(92, 70, '#b45309')}
      {[110, 130, 150].map((x, k) => (
        <path key={x} d={`M${x} 104 q4 -6 0 -12 q-4 -6 0 -12`} fill="none" stroke={C.steel} strokeWidth="1.5">
          <animate attributeName="opacity" values="0;1;0" dur="2s" begin={`${k * 0.6}s`} repeatCount="indefinite" />
        </path>
      ))}
      <Label x={127} y={188}>Cooling</Label>
      <Label x={127} y={200}>& mixing</Label>
      {pond(176, 80, '#57534e')}
      {[196, 214, 232, 246].map((x, k) => (
        <circle key={x} cx={x} cy="160" r="3" fill="none" stroke="#e7e5e4" strokeWidth="1.5">
          <animate attributeName="cy" values="164;104" dur="2.2s" begin={`${k * 0.5}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0" dur="2.2s" begin={`${k * 0.5}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <path d="M190 104 q26 -40 52 0" fill="none" stroke={C.steelDark} strokeWidth="2" strokeDasharray="4 3" />
      <Label x={216} y={78}>biogas (CH₄)</Label>
      <Label x={216} y={188}>Anaerobic</Label>
      <Label x={216} y={200}>(closed digester)</Label>
      {pond(270, 80, '#65a30d')}
      <line x1="310" y1="92" x2="310" y2="112" stroke={C.ink} strokeWidth="2" />
      <g>
        <Spin cx={310} cy={112} dur="0.8s" />
        <path d="M296 112 L324 112" stroke={C.ink} strokeWidth="3" />
      </g>
      {[300, 320].map((x, k) => (
        <circle key={x} cx={x} cy="108" r="2" fill={C.water}>
          <animate attributeName="cy" values="110;96;110" dur="0.9s" begin={`${k * 0.3}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <Label x={310} y={188}>Aerobic + aerator</Label>
      <Label x={310} y={200}>→ discharge</Label>
      <Movers path="M70 116 L104 116 M152 116 L188 116 M244 116 L282 116" n={6} r={2.5} fill={C.water} dur={4} />
      <Flow d="M0 116 L14 116" flow={C.sludge} color={C.steel} width={5} />
    </g>
  ),
}

export const ILLUSTRATIONS: Record<string, Illustration> = { reception, sterilisation, threshing, pressing, clarification, nutfibre, kernel, boiler, effluent }
