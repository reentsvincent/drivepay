# DrivePay

> Arbeitsname. Sprachgesteuerte App, mit der LKW-Fahrer während der Fahrt nebenbei Geld verdienen: bezahlte Umfragen, Sprach- und KI-Trainingsaufgaben und ähnliche Micro-Tasks, komplett **ohne Hände und ohne Blick aufs Display**.

**Status:** Meilenstein 2 (Voice-Dialog) fertig (siehe [docs/PLAN.md](docs/PLAN.md))

## Idee

Fernfahrer verbringen viele Stunden am Steuer, in denen Ohren und Stimme frei sind. DrivePay nutzt genau diese Zeit:

1. Der Fahrer startet vor der Fahrt den **Fahrmodus**.
2. Die App liest Aufgaben vor, zum Beispiel eine Umfragefrage, einen Satz zum Einsprechen oder eine kurze Bewertung.
3. Der Fahrer antwortet per Sprache. Steuerbefehle wie „wiederholen“, „überspringen“ und „Pause“ funktionieren jederzeit.
4. Die Antwort wird transkribiert, von einer KI geprüft und gespeichert, und das Guthaben steigt.
5. Ausgezahlt wird nur im Stand. Dann ist auch das Display bedienbar.

## Grundprinzipien

- **Sicherheit zuerst:** Während der Fahrt gibt es keine Interaktion mit dem Bildschirm (§23 StVO). Alles läuft über Sprache, die Bildschirm-UI ist nur für den Stillstand gedacht.
- **Austauschbare Aufgabenquellen:** Umfragen, KI-Trainingsdaten und eigene Aufträge hängen jeweils hinter einer gemeinsamen Schnittstelle.
- **Saubere Struktur:** TypeScript durchgehend, klare Modulgrenzen, Tests für die Kernlogik.

## Tech-Stack (geplant)

| Bereich             | Technologie                               |
| ------------------- | ----------------------------------------- |
| Mobile App          | Expo / React Native (TypeScript)          |
| Backend / API       | Node.js + TypeScript (Fastify)            |
| Datenbank           | PostgreSQL (Prisma)                       |
| Sprache → Text      | Cloud-STT (z. B. Whisper-API / Deepgram)  |
| Text → Sprache      | Cloud-TTS (z. B. ElevenLabs / OpenAI TTS) |
| Dialog & Auswertung | Claude (Anthropic API)                    |
| Monorepo            | pnpm Workspaces                           |

Details und Begründungen stehen in [docs/PLAN.md](docs/PLAN.md).

## Entwicklung

Voraussetzungen: Node.js (siehe `.nvmrc`) und pnpm.

```bash
pnpm install   # Abhängigkeiten installieren
pnpm check     # Formatierung, Linting, Typprüfung und Tests
pnpm test      # nur Tests
pnpm format    # Code automatisch formatieren
```
