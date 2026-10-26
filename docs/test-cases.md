# Test cases

All expected values are already corrected. Tolerance is ±0.5%. Implemented in `src/engine/__tests__/calculators.test.ts`.

| # | Calculator | Inputs | Expected |
|---|---|---|---|
| T1 | Sterilisation | n=3, C=27 t, Q=45 t/h, blow-off 2 min | cycle 108 min, interval 36, steriliser 72, cooking 70 |
| T2 | Steam pipe | 60 t/h, 272.5 kg/t, V=0.4785, v=50 | ṁ 16,350 kg/h; d 0.235 m |
| T3 | Thresher | d 2.6, k 0.05, b 0.32, 22 rpm, 0.5 m | V 660 m/h; T 56.1 t/h |
| T4 | Fruit elevator | 30 t/h, 0.6, b 0.65, 0.3 m/s, P 0.4, LF 0.85, h 14 | c 0.01207 m³ (12.1 L); power 1.83 kW; design 5.49 kW |
| T5 | De-pericarper fan | 45 t/h, 0.19, 4:1, 1.1777 | fibre 8,550 kg/h; air 34,200 kg/h; 29,040 m³/h; fan 36,300 m³/h |
| T6 | Separating column | Q 24,000, 10 m/s, 25 m/s | area 0.667 m², L 816 mm; trunk 0.267 m², r 291 mm; power 43.0 kW |
| T7 | De-stoner | 30 t/h, 0.12, 5:1, 1.1777, 16 m/s | air 15,284 m³/h; fan 19,105; column 0.332 m², L 576 mm; duct r 260 mm; power 34.2 kW |
| T8 | Clarification | DCO 20 t/h, ρ 0.8607, 3 h, SF 1.3 | clarifier 90.6 m³; pure oil 9.29 m³; sludge 11.62 m³ |
| T9 | Motor amps 3-phase | 10 BHP, 415 V, 90%, PF 0.85 | 13.6 A |
| T10 | PF correction | 100 kW, 0.70 → 0.90 | multiplier 0.536; 53.6 kVAR |
| T11 | PF correction | 0.55 → 0.95 | multiplier 1.190 |
| T12 | Pump (imperial) | 100 GPM, 50 ft, E 70% | WHP 1.52; BHP 2.16 |
| T13 | OER | oil/bunch 24.07% | 20.58% |
| T14 | Scraper conveyor | FFB 60 t/h, W 1000 mm, h 300 mm, φ 0.6, L 20 m, PCD 400, chain 40 kg/m, μc 0.3 | v 0.154 m/s; shaft 2.53 kW; required 3.79 kW → 4 kW; 7.37 rpm; ratio 200 |
| T15 | Screw conveyor | Kernel 10 t/h, D 400 mm, pitch 1D, L 20 m | 12.7 rpm; shaft 1.49 kW → 2.2 kW; ratio 125 |
| T16 | Belt conveyor | FFB 60 t/h, B 800 mm, 20° trough, 10° incline, L 20 m, pulley 500 | v 0.529 m/s; 20.2 rpm; motor 1.5 kW |
| T17 | Chain elevator | Nut 10 t/h, 10 L buckets, pitch 0.4 m, φ 0.75, H 14 m | v 0.228 m/s; shaft 0.763 kW; motor 1.5 kW |
| T18 | Screw, standard size | Ø500 (pitch 380, flight Ø485, pipe Ø75), kernel 10 t/h, L 20 m; and at a given 30 rpm | 9.32 rpm; shaft 1.57 kW; at 30 rpm: capacity 32.2 t/h, loading 14% |
| T19 | Scraper, drawing design | TBS/FR4 FFB conveyor: flight 1090 × 160, φ 0.6, 21T × 152.4 (PCD 1022.6), FFB 60 t/h, L 20 m; and at 6 rpm | v 0.266 m/s; 4.96 rpm; shaft 3.05 kW; at 6 rpm: 72.6 t/h, fill 50% |
| T20 | Pump head & power | Reference: 100 m³/h, 0.5 → 3.5 bar g, Δz 10 m, hL 12 m, ρ 1000, ηp 75%, ηm 90%; and water 30 m³/h, 4" suction 5 m, 3" discharge 50 m, lift 13 m | H 52.58 m; 14.33 / 19.10 / 21.23 kW. Pipes: H 16.38 m; shaft 1.91 kW; NPSHa 11.7 m |
| T21 | Pump affinity | 30 m³/h, 30 m, 5 kW, 1450 → 1200 rpm | 24.8 m³/h; 20.5 m; 2.83 kW |

T14–T21 are not from the pocketbook; they are hand-checked against the formulas in `src/engine/conveyor.ts` and the [REVIEW] constants in `src/data/conveyors.json`.
