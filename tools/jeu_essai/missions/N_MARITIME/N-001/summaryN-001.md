# Mission N-001 — VAILLANT21 — "Embarked crew change off Ouessant"

## Introduction

Type: MARITIME
Subtype: OFFSHORE / PERSONNEL
Aircraft: H225M Caracal
Callsign: VAILLANT21
Departure: BAN Lanvéoc-Poulmic (LFRL)
Destination: Maritime point OUESSANT WEST

## Summary

Deliver a team of six technicians from Lanvéoc to a command ship on exercise west of Ouessant. The crew must first make a rendezvous with an escort helicopter, then a second one with the ship before the transfer. The mission focuses on maritime coordination, visual identification of the ship and handling of the relative wind on scene.

## Teams involved

| Name / callsign | Branch / service | Département | Type | Role |
|---|---|---|---|---|
| VAILLANT21 | French Air and Space Force | Finistère | H225M | primary transport |
| CAIMAN23 | French Navy | Finistère | NH90 | escort / identification |
| Deck team | French Navy | — | Ship team | transfer guidance |

## Load / personnel

Category: PERSONNEL
Description: Six naval support technicians and 350 kg of baggage/tools
Mass: 350 kg
Passengers: 6

Constraints:
- Baggage split between cabin and hold
- Equipment secured for the sea crossing
- Final transfer under the ship's control

## Detailed description

Deliver a team of six technicians from Lanvéoc to a command ship on exercise west of Ouessant. The crew must first make a rendezvous with an escort helicopter, then a second one with the ship before the transfer. The mission focuses on maritime coordination, visual identification of the ship and handling of the relative wind on scene.

Departure is from BAN Lanvéoc-Poulmic (LFRL). The operational target is the Command ship — Ouessant West sector. The turning points and rendezvous below structure the mission and must be used as common references for the briefing, the maps and the debrief.

## Primary objective

Deliver the technical team to the ship at the planned maritime point.

## Secondary objectives

- Make the RDV with CAIMAN23 before entering the sector
- Hold an arrival slot of ±10 min
- Bring back two relieved technicians if the final mass allows

## Turning points

| ID | Name | Latitude | Longitude | Role |
|---|---|---:|---:|---|
| PT1 | Pointe Saint-Mathieu | 48.330833 | -4.770278 | coast-out point |
| PT2 | Ouessant south | 48.430000 | -5.100000 | maritime checkpoint |

## Rendezvous

- **RDV-1 — Ouessant south** — 48.430000, -5.100000 — participants: VAILLANT21, CAIMAN23 — join-up with escort element
- **RDV-2 — Ship sector** — 48.450000, -5.650000 — participants: VAILLANT21, Command ship — transfer coordination

## Air-to-air refuelling

- capable: True
- planned: False
- compatible_tanker: A400M tanker
- preferred_track: EDWIGE
- trigger: on-station extension > 45 min or prolonged diversion

## Risks to consider

- **Maritime wind** — consequence: Drift and turbulence on scene — mitigation: Update the wind and keep a fuel margin
- **Maritime traffic** — consequence: Identification confusion — mitigation: Confirm the ship's position, heading and identification before the transfer

## Planned maps

- `generalN-001.png` — General view covering departure, destination, turning points, RDV, target and zones
- `cibleN-001.png` — Local view centred on TARGET, approximate radius 50 km
- `detail_cibleN-001.png` — Detailed 8 × 5 km view around TARGET
- `detail_rdvN-001-1.png` — Detailed 8 × 5 km view around RDV-1
