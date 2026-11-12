# Prototyp-Plan

## Ziel des Prototyps

Ein Fahrer kann auf seinem Handy den Fahrmodus starten, bekommt Beispiel-Aufgaben vorgelesen, beantwortet sie per Sprache und sieht danach (im Stand) sein Guthaben. Echte Auszahlungen und echte Umfrage-Partner sind **nicht** Teil des Prototyps.

## Architektur

```
┌──────────────────────┐        ┌─────────────────────────────────────┐
│  Mobile App (Expo)   │  HTTPS │  API (Fastify)                      │
│                      │◄──────►│                                     │
│  • Fahrmodus (Voice) │        │  • Auth / Fahrerprofil              │
│  • Audio-Aufnahme    │        │  • Task-Engine ──► Task-Provider    │
│  • Audio-Wiedergabe  │        │       (Beispiel, Umfrage, KI-Daten) │
│  • Stand-UI: Konto,  │        │  • Voice-Pipeline: STT → Claude →   │
│    Guthaben, Verlauf │        │       TTS                           │
└──────────────────────┘        │  • Wallet / Guthaben-Buchungen      │
                                └──────────────┬──────────────────────┘
                                               │
                                        PostgreSQL
```

Die API-Keys für STT, TTS und Claude liegen **nur im Backend**, nie in der App.

## Geplante Ordnerstruktur (Monorepo)

```
drivepay/
├── apps/
│   ├── mobile/          # Expo-App (Fahrmodus, Stand-UI)
│   └── api/             # Fastify-Backend
├── packages/
│   ├── shared/          # Gemeinsame Typen & Schemas (zod)
│   └── voice-dialog/    # Dialog-Zustandsmaschine (Befehle, Ablauf), testbar ohne UI
├── docs/
└── README.md
```

## Kernkonzepte

- **Task:** eine Aufgabe mit Typ (`survey_question`, `voice_recording`, `rating`, …), Prompt-Text, Antwortformat und Vergütung.
- **TaskProvider:** eine Schnittstelle, die Tasks liefert und Antworten entgegennimmt. Im Prototyp gibt es nur `SampleTaskProvider`.
- **Voice-Dialog:** eine Zustandsmaschine (`idle → vorlesen → zuhören → prüfen → bestätigen → nächste`) mit globalen Befehlen (wiederholen, überspringen, Pause, Stopp).
- **Antwortprüfung:** Claude prüft, ob die Antwort zur Frage passt und vollständig ist, und normalisiert sie (z. B. Multiple Choice aus freier Sprache).
- **Wallet:** unveränderliche Buchungen (Ledger) statt eines einzelnen Saldo-Feldes.

## Meilensteine

1. **Fundament:** Monorepo, Linting/Formatting, TypeScript-Konfiguration, CI (GitHub Actions)
2. **Voice-Dialog-Paket:** Zustandsmaschine und Tests
3. **API:** Tasks, Antworten, Wallet, Sprach-Pipeline (STT → Claude → TTS)
4. **Mobile App:** Fahrmodus (Audio rein/raus), Stand-UI mit Guthaben
5. **End-to-End-Demo:** Fahrer erledigt 5 Beispiel-Aufgaben nur per Sprache

## Offene Fragen (für später)

- Echte Geldquellen: Partner für KI-Trainingsdaten und Umfragen (Nutzungsbedingungen prüfen!)
- Auszahlungsweg (PayPal, SEPA, Gutscheine)
- CarPlay / Android Auto
- Datenschutz (Sprachaufnahmen = personenbezogene Daten, DSGVO)
