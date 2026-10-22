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
