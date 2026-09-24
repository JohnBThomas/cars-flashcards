# Elmer review checklist

Every lesson card and explanation is a draft until a club reviewer checks it. When a subelement looks right, change its entries to `"status": "reviewed"` and run `node scripts/check-notes.mjs`.

The writers flagged the items below as worth a close look. Most are rules of thumb or extra detail they added beyond what the question pool states. A few are odd references in the official pool itself.

## Technician

- **T1:** The pool's references for T1C05 (empty), T1C10 ("97.5a"), and T1D09 ("97.113(5)(b)") look wrong in the official pool. Check the simplified call-sign groups on the call sign card, the limits described as "some specific restrictions" (T1B12), and the list of station types allowed automatic control (only examples are given). §97.23 (name, mailing address, email) was checked against the eCFR.
- **T2:** §97.403/97.405 wording on the emergency exception (T2C01, T2C09); how RACES certification is described (T2C12); the radiogram preamble order (T2C10); the reverse-split explanation (T2B01). One card uses "KA4XYZ" as a made-up call sign, so check that it isn't someone's real call.
- **T3:** Rounded figures: cross-polarization loss of 20 dB or more, radio horizon about 15% beyond the visual horizon, sporadic-E distances, ionosphere heights, aurora operating tips.
- **T4:** The 50%-efficiency assumption in T4A01's worked steps. The mobile ground connection follows the pool's wording, and many guides say to connect straight to the battery's negative terminal (T4A11). Typical CW/SSB filter widths. The pool has a typo in T4B04 ("decrease").
- **T5:** The water-pipe, beads, and ladder analogies. T5C's "radio frequency definition" is covered only in one line.
- **T6:** How the figure symbols are described in words (T-1 lamp and ground, T-2 capacitor and variable resistor, T-3 antenna). Forward-voltage figures for silicon, Schottky, and LEDs.
- **T7:** How the SSB/CW-FM amplifier switch is explained (T7A09); foam coax drawbacks (T7C11); reading resistance on the voltage setting doing no harm (T7D06).
- **T8:** LSB below 10 MHz, satellite band letters (only V and U are defined), satellite command encryption (T8B11), LEO orbit and pass times, mesh on shared Wi-Fi bands. The grid-square example uses Lake City, EM80.
- **T9:** The wording on "RS-213" (T9B06); why high SWR adds loss (T9B08); capacitance hats; matching coils on 5/8-wave whips.
- **T0:** 12 V and skin resistance; why the fuse goes in the hot wire; averaging times from 47 CFR 1.1310; the newer 1.1307(b) exemption thresholds aren't mentioned yet.

## General

- **G1:** **The 60 m card teaches the current rules**, which the writer read on eCFR: four channels at 100 W ERP plus 5351.5–5366.5 kHz at 9.15 W ERP. These have changed since the pool was written, so please confirm them against §97.303(h) and §97.313(i). G1C03 and G1C04 are still keyed correctly. G1D01 has a `reviewNote` about pre-1987 Technician credit (§97.505(a)). Also check the remote-operation answer (G1D12), the citation for the 10 m repeater relaying a Technician (G1E02, §97.205), and the abbreviations rule (G1B07).
- **G2:** 60 m uses USB; QRP power figures; the FT8 clock tolerance (G2E07); SSB and noise (G2A06); why RTTY uses LSB (G2E01); Winlink over packet. One example CQ uses NF4CQ.
- **G3:** The critical-frequency definition (G3C02); aurora "reflects" vs scatters (G3A09); K-index scale, region heights, SID recovery time, and the reporting networks named.
- **G4:** The band-edge margin on G4D09 and G4D11; the solar cell giving 0.5 V (G4E09); accessory socket ratings and radio current draw (G4E04); tuners and feed-line SWR (G4A06); quarter-wave ground leads (G4C06).
- **G5:** 70.7² rounded to 5000 in G5B06; resonance wording (G5A01, G5A12); the look-alike terms card (conductance, susceptance, reluctance).
- **G6:** The 10.5 V lead-acid floor and sulfation (G6A01); MOSFET vs JFET gate (G6A09); the suppressor-grid note (G6A12); connector frequency limits; LED series resistor.
- **G7:** Amplifier-class efficiency figures; the Figure G7-1 symbols that no question asks about (4 varactor, 8 and 10 capacitors); the bleeder-resistor safety tip.
- **G8:** "Sideband sensitive" QPSK31 (G8A06); mesh node channel wording (G8C09); FT8, RTTY, PSK31, and FM bandwidth figures; the FT8 report reference bandwidth (G8C15).
- **G9:** High SWR and loss (G9A02); ground-plane impedance figures; small-loop null direction (G9D10); stacking gain and "effective aperture" (G9C09). G9C06 is withdrawn from the pool.
- **G0:** The pool's G0A06 and G0A12 references ("1.1307(1)(b)(3)(i)") look like a typo in the official pool. Check the 1 mW exemption framing (G0A12), limits strictest at 30–300 MHz, gas-line bonding, the generator grounding wording, and AWG 14/12 wire sizes.

## Amateur Extra

- **E1:** **60 m changed in January 2026** (the E1 writer found this separately from G1): four channels plus a 9.15 W ERP band. E1A06 and E1C01 are still correct. Has a `reviewNote` on E1F08: the pool cites 97.113(c) where 97.113(a)(2) fits. Also check the Utilities Technology vs Telecom Council name (E1C03, E1C07); 17 and 12 m for space stations (E1D07); amplifier rules after the December 2025 change to 97.315(b) (E1F03, E1F11); and the STA / CSCE 365-day wording (E1F06).
- **E2:** Q65 vs JT65 averaging (E2E07); FT4 and FST4 tone details and period lengths; satellite band letters, SSTV tones, cable channels in 70 cm, mode bandwidths, calling frequencies; no contests on the WARC bands is a custom, not a rule (E2C03).
- **E3:** The EME perigee advantage of about 2 dB (E3A01); MUF vs takeoff angle; sporadic-E seasons and distances; flare vs CME noise (E3C12); meteor trail heights.
- **E4:** SDR overload and the ADC reference voltage vs maximum count (E4C08); how the single-point ground panel is explained (E4E13, E4E14); the alternator-noise fix (E4E04); the "IMD dynamic range" name (E4D01).
- **E5:** The log-scale Y-axis wording (E5C04); the parallel-resonance impedance wording (E5A04); skin effect in film capacitors (E5D08); electrical length of thick conductors (E5D10).
- **E6:** Has a `reviewNote` on E6D11: brass is keyed, but aluminum would also lower inductance. Check how the Figure E6-1, E6-2, and E6-3 symbols are read (some symbols are deliberately left unnamed). Also check the Schottky and LED voltages, the solar panel cell count and efficiency, and the photons vs electrons wording (E6F01).
- **E7:** The written descriptions of Figures E7-1, E7-2, and E7-3. De-emphasis has a fuller reason than the keyed one (E7E06). "Self bias" vs emitter degeneration (E7B11), where "Feedback" is a wrong choice. E7F12 is a "not all of these" trap. E7G02 now shows Figure E7-3; the pool text leaves out the word "Figure".
- **E8:** The dither wording: it spreads quantization error rather than reducing total noise (E8A04). PSK IMD example figures (E8D09). The 4 × WPM and 1.2 × shift + baud rules of thumb. "Modulation index" vs deviation ratio (E8B03, E8B04). The vague keyed answer on E8C10. Gray code used in constellations (E8C09).
- **E9:** The readings of Figures E9-1 and E9-2 (beamwidth, lobe levels, 7.5° peak). E9F06 is keyed to the free-space half wavelength (10.6 m); with a 0.95 velocity factor it comes out near 10.1 m. Also check the reflector-vs-director gain claim (E9D11), the OCF feed point "a third of the way" (E9C05), and "up to 6 dB" ground gain (E9A05).
- **E0:** Has a `reviewNote` on E0A09: find the rule behind the hand-held exemption for radios sold before May 3, 2021. Also check the evaluation-always-required wording (E0A10), the 1.1310 limits and averaging times, and the 5% shared-site rule.
