"""Lettre de famille des identifiants de mission (« M-001 », « S-002A ») — même table que SiaMission.FAMILY_LETTERS
(apps/sia/mission_store.js) et que le prompt du générateur (docs/PROMPT_GENERATEUR_MISSIONS.md, § 3)."""
FAMILY_LETTERS = {
    'HEMS': 'M', 'MEDEVAC': 'M', 'HADR': 'H', 'FIRE': 'F', 'SAR': 'S', 'AIRLIFT': 'T', 'AAR': 'R', 'AIRBORNE': 'P',
    'MARITIME': 'N', 'ISR': 'I', 'LE': 'L', 'COMMAND': 'C', 'SOF': 'O', 'FI': 'V', 'SURVEY': 'G', 'SPECIAL': 'X',
}
