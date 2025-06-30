Cahier des charges technique – POC Voix (Speech‑to‑Text & Text‑to‑Speech)

Version 0.3 – 30 juin 2025

1. Contexte & enjeux

La plateforme Check Compétences a pour objectif de standardiser l’évaluation (français, mathématiques, numérique) d’un public fragile (~10 000 personnes/an). Le présent Proof of Concept (POC) doit démontrer la faisabilité d’une interaction vocale bidirectionnelle 100 % Web, sans installation logicielle.

2. Objectifs du POC

Captation micro dans le navigateur et transcription temps‑réel (STT).

Synthèse vocale côté client à partir de texte arbitraire (TTS).

Latence acceptable pour un dialogue quasi‑instantané (< 400 ms STT, < 1,5 s TTS).

UI minimale : Start/Stop micro, affichage du texte transcrit, champ texte → lecture audio.

Chiffrer coûts d’usage des API et identifier points sensibles (débits, quotas, offline).

3. Portée fonctionnelle

ID

Fonction

Description

F1

Start/Stop Recording

Autoriser/couper le micro, affichage visuel état.

F2

STT Streaming

Transcrire en direct le flux audio (langue : FR).

F3

Affichage Transcript

Afficher la transcription incrémentale et finale.

F4

Champ Texte

Saisie manuelle ou récupération transcript final.

F5

TTS Playback

Appeler TTS, jouer l’audio restitué via HTMLAudio.

F6

Export Transcript (opt.)

Télécharger .txt ou copier‑coller le texte.

4. Architecture cible

[Browser React 18 (Vite) + Tailwind]
   |  microphone / speakers
   |  WebSocket (STT)          REST (TTS)
[Express 5 API Gateway]
   |  Node 18 / Sequelize (SQLite in‑memory)
   |  ↳ OpenAI Whisper (whisper‑1) – STT
   |  ↳ OpenAI TTS (tts‑1, voice "alloy") – TTS

Front‑end : React hooks uniquement, aucune auth, Vite dev server, deploy static.

Back‑end : Express mono‑route (/api/stt WS, /api/tts POST), Sequelize pour journaliser les transcripts (optionnel), Docker Compose.

Pas d’authentification – toutes les routes sont publiques pour ce POC.

5. Contraintes techniques

Langages : JavaScript (ES 2022) partout.

Libs clés : TailwindCSS 3, Socket.IO Client, OpenAI SDK v4.

Navigateurs cibles : Chrome 122+, Edge 122+, Firefox 115 ESR.

Accessibilité : contraste AA, boutons clavier.

6. Modèles IA utilisés

Usage

Modèle

Endpoint

Tarif public (juin 2025)

STT Streaming

whisper-1

POST /audio/transcriptions (stream)

0,006 $/min

TTS

tts-1 voice alloy

POST /audio/speech

0,015 $/min

7. Indicateurs de succès (KPIs)

Latence STT ≤ 400 ms entre parole et affichage token.

WER ≤ 15 % sur un script de test (200 mots).

Latence TTS ≤ 1,5 s pour 80 caractères.

Taux de réussite démo ≥ 95 % (5 scénarios consécutifs).

Coût par session démo (3 min) ≤ 0,05 €.

8. Roadmap POC (4 jours)

Jour

Matin

Après‑midi

Livrables

J1

Init mono‑repo (Vite + React, Tailwind, Express 5, Sequelize).Docker compose minimal.

WS POST /api/tts proxy, config ENV, tests Postman.

Repo GitHub structuré, README install rapide.

J2

Implémentation STT WebSocket client ↔ server.Gestion permissions micro, buffering PCM 16 kHz.

UI transcript incrémental (Tailwind).Sauvegarde transcript dans SQLite.

STT temps‑réel fonctionnel (< 600 ms).

J3

TTS flow : appel tts-1, lecture audio.Option Play/Pause.

Nettoyage code, scripts Docker build + run.

Démo E2E voix‑texte‑voix.

J4

Restitution : slides (config infra, coûts, risques).Test charge (10 simul).

Fallback & mode dégradé.Checklist haute dispo, monitoring simple (Grafana Cloud).

Slide deck, vidéo démo, récap coûts & risques.

9. Estimation des coûts (démo 15 min)

Ressource

Quantité

Tarif

Montant

STT Whisper

15 min

0,006 $/min

0,09 $

TTS alloy

15 min

0,015 $/min

0,225 $

Total

 

 

0,315 $ (~0,29 €)

Hors hébergement (Render free tier) et monitoring (Grafana free).

10. Haute disponibilité & modes dégradés

Quotas API : surveillance 429 ; back‑off exponentiel, file d’attente.

Fallback local : si STT indisponible → enregistrement WAV + upload plus tard.

TTS offline : message texte affiché si audio indisponible.

Monitoring : ping health‑check, log > Grafana Loki.

11. Points sensibles / risques

Latence réseau variable (Wi‑Fi → 4G).

Permissions navigateur (blocage micro).

Saturation CPU sur clients bas de gamme.

Variabilité accent linguistique utilisateurs.

12. Livrables

Dépôt GitHub (MIT) avec instructions 1‑command (docker compose up).

Vidéo démo < 3 min.

Slide deck (PDF) : architecture, coûts, KPIs atteints, pistes next‑step.

Fin du document.

