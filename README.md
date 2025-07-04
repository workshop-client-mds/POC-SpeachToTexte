# POC Voix - Speech-to-Text & Text-to-Speech

Ce projet réalisé par PELLETIER Lucie, VICTOR Evan, MARCHESSE Gilles et MINI Anthony est un Proof of Concept (POC) pour une interaction vocale sur le web, incluant la transcription en temps réel (Speech-to-Text) et la synthèse vocale (Text-to-Speech) en utilisant les API d'OpenAI. L'utilisateur peut ainsi répondre aux questions à l'oral ou encore lire à haute voix la question qui lui est présentée. Bien que prenant juste en charge l'anglais et le français, il y a également une gestion du multilangue pour se calibrer correctement sur les réponses orales.
## Architecture

- **Frontend**: Application React (Vite) avec Tailwind CSS.
- **Backend**: Serveur Node.js (Express 5) servant de passerelle pour les API OpenAI.
- **Base de données**: PostgreSQL pour la journalisation (optionnelle).
- **Orchestration**: Docker Compose pour lancer l'ensemble de la stack.

## Prérequis

- Docker et Docker Compose
- Node.js (pour la gestion des dépendances locales si nécessaire)

## Comment démarrer

1.  **Configurer les variables d'environnement** :

    Copiez le fichier d'exemple `.env.example` du backend vers un nouveau fichier `.env` et remplissez les valeurs, notamment votre clé API OpenAI.

    ```bash
    cp backend/.env.example backend/.env
    # Ensuite, éditez backend/.env pour ajouter votre clé API
    ```

2.  **Installer les dépendances** (recommandé pour l'autocomplétion de l'IDE) :

    ```bash
    # Dans le dossier backend
    npm install

    # Dans le dossier frontend
    npm install
    ```

3.  **Lancer l'application avec Docker Compose** :

    À la racine du projet, exécutez la commande suivante :

    ```bash
    docker-compose up --build
    ```

4.  **Accéder à l'application** :

    - Le front-end sera disponible à l'adresse [http://localhost:3000](http://localhost:3000).
    - Le back-end écoutera sur le port `3001`.

## Structure du projet

```
.
├── backend/
│   ├── src/index.js      # Point d'entrée du serveur Express (API STT/TTS)
│   ├── package.json      # Dépendances Node.js
│   ├── Dockerfile        # Conteneurisation du backend
│   └── .env.example      # Modèle pour les variables d'environnement
├── frontend/
│   ├── src/App.jsx       # Composant principal React
│   ├── package.json      # Dépendances React/Vite
│   ├── vite.config.js    # Configuration de Vite
│   └── tailwind.config.js # Configuration de Tailwind CSS
├── docker-compose.yml    # Orchestration des services
└── README.md             # Ce fichier
```
