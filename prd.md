Product Requirements Document (PRD)

Project: POC Voix – Speech‑to‑Text & Text‑to‑Speech (Web)

Author: Product & Tech Team · v1.0 · 30 juin 2025

1. Vision

Permettre à la plateforme Check Compétences de tester l’usage de la voix comme modalité d’interaction principale : l’utilisateur parle, le système transcrit en temps réel, interprète la demande, puis restitue une réponse vocale naturelle. Le POC doit être web‑only, léger et reproductible, afin de valider l’intérêt métier, la qualité technique et le modèle économique avant un déploiement à plus grande échelle.

2. Problem Statement

Public ciblé (personnes en réinsertion, niveau linguistique A2) rencontre des difficultés de lecture/écriture. Le parcours actuel (texte) crée de la friction : taux d’abandon 25 %. La voix pourrait réduire cet obstacle et améliorer l’accessibilité.

3. Goals & Success Metrics

ID

Objectif

KPI cible

G1

Prouver la faisabilité technique temps réel

Latence STT ≤ 700 ms 95ᵉ pct

G2

Prouver la qualité de transcription

WER ≤ 18 % (Corpus interne)

G3

Valider la pertinence métier

80 % des testeurs préfèrent la version vocale

G4

Mesurer coût d’usage

≤ 0,002 €/10 s audio (STT+TTS)

4. Non‑Goals (Out of Scope)

Authentification, gestion de compte, paiement.

Scalabilité >100 concurrents ou support offline.

Alignement pédagogique (scoring, adaptative learning) – traité dans un futur lot.

5. Personas

Candidat : adulte en formation, faible aisance en écriture.

Formateur : superviseur qui veut visualiser la transcription.

PO : valide l’intérêt UX et la viabilité économique.

6. User Stories

US‑01 – En tant que candidat, je clique sur « Parler », je dicte ma réponse et je la vois apparaître quasi instantanément.

US‑02 – En tant que candidat, je reçois le retour du système sous forme vocale claire.

US‑03 – En tant que formateur, je peux relire la transcription textuelle dans le back‑office.

7. Feature Requirements

#

Feature

Must / Should / Could

Notes

F1

Capture microphone WebRTC

Must

Navigator ≥ Chrome 111.

F2

STT streaming via OpenAI Whisper (model : whisper-1)

Must

WebSocket proxy.

F3

TTS request via OpenAI TTS (model : tts-1, voice alloy)

Must

REST POST /api/tts.

F4

Simple UI (Tailwind CSS) : bouton « Parler / Stop », zone transcript

Must

React 18 SPA.

F5

Immediate cost logging (token & sec)

Should

Sequelize table cost_logs.

F6

Metrics dashboard (latence, WER)

Could

Grafana + Prom‑pushgateway.

F7

Fallback : retry HTTP 429 + degrade to partial transcript

Must

see §10.

8. Technical Constraints

Stack back‑end : Node 20 / Express 5, Sequelize + PostgreSQL (Docker Compose).

Stack front‑end : React 18 (Vite), JavaScript ES2022, TailwindCSS.

CI/CD : GitHub Actions + Docker Hub.

AI IDE Assistance : WindSurf IDE for code generation (pair‑programming).

9. Dependencies / Third‑Party Services

Service

Usage

Free tier

Est. coût POC

OpenAI Whisper

STT

60 min

~6 € pour 5 h test

OpenAI TTS

voix

60 min

~4 € pour 5 h

Render / Fly.io

Hosting

750 h

~0 € POC

Grafana Cloud

Metrics

50 GB

0 €

10. High Availability & Fallback

Rate‑limit / quotas : detect HTTP 429, back‑off 1‑2‑5 s, résume en transcript partiel (mode dégradé texte‑seul).

Network loss : buffer audio 3 s, re‑upload à reconnexion.

Service down : switch to local transcription stub (mock) with warning banner.

11. Sensitivities / Risks

Dépendance API : évolution de prix OpenAI.

Détection d’accent / bruit de fond : WER peut dépasser cible.

RGPD : flux audio traité hors UE (OpenAI) → ajouter mention consentement.

12. Milestones & Timeline

Date

Lot

Livrable

J1

Setup & STT MVP

capture + transcript live

J2

TTS & affichage

voix retour + UI tailwind

J3

Logs & tests

mesure latence/WER, coût

J4

Restitution

slides + démo, bilan coûts

13. Open Questions

Quelle langue cible d’abord ? (FR ? EN ?)

Besoin d’un cache voix pour réponses fréquentes ?

Mesure de la compréhension (NLP) hors périmètre ?

Fin du document.

