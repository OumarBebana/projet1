<div align="center">

# 🇲🇷 BAWABA.MR

### DÉVELOPPEMENT DU SITE WEB DU PORTAIL DE LA MAURITANIE

**بوابة الأخبار الحكومية الموريتانية**

[![Django](https://img.shields.io/badge/Django-5.0-092E20?style=for-the-badge&logo=django&logoColor=white)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

*Portail d'actualités gouvernementales en temps réel — agrégateur RSS, cartes interactives, newsletter intelligente*

**[🌐 Voir le site](https://projet1-two-mu.vercel.app) · [🔌 API](https://projet1-production-f935.up.railway.app/api/) · [📖 Documentation](#api-reference)**

</div>

---

## 📋 Table des matières

- [Aperçu](#-aperçu)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Structure du projet](#-structure-du-projet)
- [Installation locale](#-installation-locale)
- [Variables d'environnement](#-variables-denvironnement)
- [Déploiement](#-déploiement)
- [API Reference](#-api-reference)
- [Stack technique](#-stack-technique)

---

## 🌍 Aperçu

**BAWABA.MR** est un portail d'actualités gouvernementales mauritaniennes qui agrège automatiquement les flux RSS de plus de 30 sources officielles (ministères, présidence, primature, agences gouvernementales), les affiche en temps réel, et propose des outils avancés : cartes interactives, newsletter par email, breaking news, et assistant IA.

> Disponible en **Arabe** 🇸🇦 et **Français** 🇫🇷 avec basculement instantané.

---

## ✨ Fonctionnalités

### 📰 Agrégation d'actualités
- Récupération automatique depuis **30+ sources RSS** gouvernementales
- Mise à jour en arrière-plan via **APScheduler**
- Déduplication intelligente des articles
- Extraction du contenu complet des articles (Trafilatura)
- Catégorisation automatique : Politique, Économie, Santé, Sécurité…
- Ticker de **breaking news** animé en temps réel

### 🗺️ Cartes interactives
- **Carte gouvernementale** : 30+ institutions (ministères, présidence, parlement)
- **Carte d'urgence** : hôpitaux, pompiers, police, pharmacies
- Calcul d'itinéraire avec **Leaflet Routing Machine**
- Géolocalisation GPS haute précision (`enableHighAccuracy: true`)
- Mode satellite / plan
- Recherche vocale des lieux
- Navigation guidée avec instructions vocales
- Filtre par catégorie (Ministères, Institutions, Hôpitaux…)

### 📧 Newsletter intelligente
- Abonnement avec sélection des **centres d'intérêt**
- Notifications immédiates à chaque nouvelle publication
- **Résumé hebdomadaire** automatique
- **Breaking news** par email
- Désabonnement sécurisé par token HMAC
- Aperçu HTML de la newsletter

### 🎨 Interface utilisateur
- Design **bilingue AR/FR** avec RTL natif
- **Mode sombre / clair** avec transition fluide
- Entièrement **responsive** : desktop → mobile (375px)
- Bottom sheet modal sur mobile
- Grilles CSS auto-fit adaptatives
- **7 breakpoints** : 1200 / 1100 / 1024 / 900 / 768 / 640 / 480 / 360px

### 📊 Statistiques en temps réel
- Nombre d'articles du jour / de la semaine
- Nombre de ministères et institutions indexés
- Dernier article publié
- Bouton de mise à jour manuelle

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BAWABA.MR                            │
├──────────────────────────┬──────────────────────────────────┤
│      FRONTEND (Vercel)   │       BACKEND (Railway)          │
│                          │                                  │
│  React 19 + TypeScript   │   Django 5 + DRF                 │
│  Vite 8 (build tool)     │   APScheduler (RSS fetch)        │
│  Leaflet (maps)          │   Celery (async tasks)           │
│  react-leaflet           │   Gunicorn (WSGI)                │
│  lucide-react (icons)    │   WhiteNoise (static files)      │
│                          │                                  │
│  VITE_API_URL ──────────►│   /api/*                         │
│                          │        │                         │
└──────────────────────────┘        ▼                         │
                              PostgreSQL (Railway)            │
                              (Articles, Sources,             │
                               Subscribers, Locations)       │
└─────────────────────────────────────────────────────────────┘

RSS Sources (30+)
  presidence.mr ──┐
  primature.gov.mr─┤
  finances.gov.mr ─┼──► APScheduler ──► Django ──► PostgreSQL
  sgg.gov.mr ──────┤         (toutes les 30 min)
  ...              ┘
```

---

## 📁 Structure du projet

```
Projet1/
├── backend/                        # Django API
│   ├── govnews/
│   │   ├── settings.py             # Configuration (DB, CORS, Email)
│   │   ├── urls.py                 # Routes principales
│   │   └── wsgi.py
│   ├── news/                       # App actualités
│   │   ├── models.py               # Article, Source, Subscriber
│   │   ├── views.py                # API views (DRF)
│   │   ├── serializers.py
│   │   ├── scheduler.py            # APScheduler (fetch RSS)
│   │   ├── scrapers.py             # Extraction contenu (Trafilatura)
│   │   ├── ai_processor.py         # Traitement IA des articles
│   │   └── management/commands/
│   │       ├── fetch_news.py       # Commande de récupération RSS
│   │       ├── notify_new_articles.py  # Notifications email
│   │       ├── weekly_digest.py    # Résumé hebdomadaire
│   │       ├── send_breaking_news.py   # Breaking news email
│   │       └── seed_sources.py     # Initialisation des sources
│   ├── maps/                       # App cartes
│   │   ├── models.py               # GovernmentLocation, EmergencyPlace
│   │   ├── views.py                # API géolocalisation + nearest
│   │   └── seed_data.py            # Données initiales des lieux
│   ├── requirements.txt
│   ├── Procfile                    # Gunicorn (Railway)
│   └── railway.toml                # Config déploiement Railway
│
├── myapp/                          # React Frontend
│   ├── src/
│   │   ├── App.tsx                 # Composant racine + routing
│   │   ├── Header.tsx              # En-tête responsive + ticker
│   │   ├── NewsFeed.tsx            # Fil d'actualités + filtres
│   │   ├── FeaturedSection.tsx     # Articles mis en avant
│   │   ├── StatsBar.tsx            # Statistiques temps réel
│   │   ├── GovernmentMap.tsx       # Carte des institutions
│   │   ├── EmergencyMap.tsx        # Carte d'urgence
│   │   ├── ServicesModal.tsx       # Modal services numériques
│   │   ├── ArticleModal.tsx        # Modal article complet
│   │   ├── Newsletter.tsx          # Abonnement newsletter
│   │   ├── NewsletterSmart.tsx     # Newsletter avancée
│   │   ├── CategoryFilter.tsx      # Filtres par catégorie
│   │   ├── config.ts               # API_BASE URL
│   │   ├── i18n.ts                 # Traductions AR/FR
│   │   ├── index.css               # Styles globaux + variables CSS
│   │   ├── responsive.css          # 7 breakpoints responsive
│   │   └── assets/
│   │       └── mauritania_seal.jpg # Emblème national
│   ├── vercel.json                 # Config déploiement Vercel
│   └── package.json
│
└── README.md
```

---

## 🚀 Installation locale

### Prérequis
- Python 3.11+
- Node.js 20+
- PostgreSQL (optionnel, SQLite par défaut en dev)

### Backend (Django)

```bash
cd backend

# Créer l'environnement virtuel
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/Mac

# Installer les dépendances
pip install -r requirements.txt

# Variables d'environnement
cp .env.example .env            # Éditer avec vos valeurs

# Migrations
python manage.py migrate

# Charger les sources RSS initiales
python manage.py seed_sources

# Charger les données cartographiques
python manage.py shell -c "from maps.seed_data import seed; seed()"

# Lancer le serveur
python manage.py runserver
```

### Frontend (React)

```bash
cd myapp

# Installer les dépendances
npm install

# Variables d'environnement
echo "VITE_API_URL=http://localhost:8000" > .env.local

# Lancer le serveur de développement
npm run dev
```

Accéder à : `http://localhost:5173`

---

## 🔐 Variables d'environnement

### Backend (`backend/.env`)

| Variable | Description | Exemple |
|---|---|---|
| `SECRET_KEY` | Clé secrète Django | `django-insecure-...` |
| `DEBUG` | Mode debug | `True` / `False` |
| `DATABASE_URL` | URL PostgreSQL | `postgresql://user:pass@host/db` |
| `ALLOWED_HOSTS` | Hôtes autorisés | `localhost,.railway.app` |
| `CORS_ALLOWED_ORIGINS` | Origines CORS | `https://projet1-two-mu.vercel.app` |
| `EMAIL_HOST` | Serveur SMTP | `smtp.gmail.com` |
| `EMAIL_PORT` | Port SMTP | `587` |
| `EMAIL_HOST_USER` | Email expéditeur | `no-reply@bawaba.mr` |
| `EMAIL_HOST_PASSWORD` | Mot de passe SMTP | `app-password` |
| `DJANGO_NO_SCHEDULER` | Désactiver scheduler | `1` (Railway) |

### Frontend (`myapp/.env.local`)

| Variable | Description | Exemple |
|---|---|---|
| `VITE_API_URL` | URL du backend | `https://projet1-production-f935.up.railway.app` |

---

## ☁️ Déploiement

### Backend → Railway

1. Connecter le repo GitHub à Railway
2. Sélectionner le dossier `backend/` comme root directory
3. Ajouter un service **PostgreSQL** dans Railway
4. Configurer les variables d'environnement (voir tableau ci-dessus)
5. Railway détecte automatiquement Python via nixpacks
6. Le `railway.toml` lance les migrations + collectstatic + gunicorn au démarrage

```toml
# backend/railway.toml
[deploy]
startCommand = "python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn govnews.wsgi:application --bind 0.0.0.0:$PORT --workers 2"
```

### Frontend → Vercel

1. Connecter le repo GitHub à Vercel
2. Définir **Root Directory** = `myapp`
3. Ajouter la variable `VITE_API_URL` pointant vers Railway
4. Vercel détecte automatiquement Vite

```json
// myapp/vercel.json
{
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 📡 API Reference

Base URL : `https://projet1-production-f935.up.railway.app/api`

### Actualités

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/articles/` | Liste des articles (filtres: `lang`, `source`, `category`, `search`) |
| `GET` | `/articles/{id}/` | Détail d'un article |
| `GET` | `/sources/` | Liste des sources RSS |
| `GET` | `/stats/` | Statistiques du tableau de bord |
| `GET` | `/breaking/` | Dernières breaking news |
| `GET` | `/latest-titles/` | Titres récents pour le ticker |
| `GET` | `/latest-per-source/` | Dernier article par source |
| `POST` | `/fetch-now/` | Forcer une récupération RSS immédiate |
| `GET` | `/fetch-content/{id}/` | Extraire le contenu complet d'un article |

### Newsletter

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/newsletter/subscribe/` | S'abonner |
| `POST` | `/newsletter/unsubscribe/` | Se désabonner |
| `GET` | `/newsletter/check/` | Vérifier l'abonnement |
| `POST` | `/newsletter/update/` | Modifier les préférences |
| `GET` | `/newsletter/stats/` | Statistiques abonnés |
| `GET` | `/newsletter/preview/` | Aperçu HTML de la newsletter |

### Cartes

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/maps/government-locations/` | Institutions gouvernementales (lat/lng) |
| `GET` | `/maps/emergency/` | Lieux d'urgence |
| `GET` | `/maps/emergency/nearest/` | Lieu d'urgence le plus proche (params: `lat`, `lng`, `type`) |

---

## 🛠️ Stack technique

### Backend
| Technologie | Version | Usage |
|---|---|---|
| Django | 5.x | Framework web principal |
| Django REST Framework | 3.15 | API REST |
| django-cors-headers | 4.3 | Gestion CORS |
| APScheduler | 3.10 | Tâches planifiées (RSS fetch) |
| Celery + Redis | 5.4 | File d'attente async |
| feedparser | 6.x | Parsing flux RSS/Atom |
| Trafilatura | 1.8 | Extraction contenu web |
| BeautifulSoup4 | 4.12 | Scraping HTML |
| psycopg2 | 2.9 | Driver PostgreSQL |
| dj-database-url | 2.1 | Parse DATABASE_URL |
| WhiteNoise | 6.7 | Fichiers statiques production |
| Gunicorn | 22.x | Serveur WSGI production |

### Frontend
| Technologie | Version | Usage |
|---|---|---|
| React | 19 | Framework UI |
| TypeScript | 6.0 | Typage statique |
| Vite | 8.0 | Bundler / dev server |
| Leaflet | 1.9 | Cartes interactives |
| react-leaflet | 5.0 | Bindings React pour Leaflet |
| leaflet-routing-machine | 3.2 | Calcul d'itinéraires |
| lucide-react | 1.21 | Icônes SVG |

### Infrastructure
| Service | Usage |
|---|---|
| **Railway** | Hébergement backend + PostgreSQL |
| **Vercel** | Hébergement frontend (CDN mondial) |
| **GitHub** | Versioning + CI/CD auto-deploy |

---

## 📊 Flux de données RSS

```
Sources officielles mauritaniennes
    │
    ▼ (toutes les 30 min via APScheduler)
feedparser → parse RSS/Atom
    │
    ▼
Déduplication par URL + titre
    │
    ▼
Trafilatura → extraction contenu complet
    │
    ▼
PostgreSQL (Article, Source)
    │
    ├──► API REST ──► React Frontend
    │
    └──► APScheduler ──► Email (nouveaux articles, digest, breaking news)
```

---

## 🌐 Sources indexées

Plus de **30 sources officielles** mauritaniennes incluant :

- 🏛️ Présidence de la République (`presidence.mr`)
- 🏛️ Primature (`primature.gov.mr`)
- 💰 Ministère des Finances (`finances.gov.mr`)
- ⚖️ Secrétariat Général du Gouvernement (`sgg.gov.mr`)
- 📰 Agence Mauritanienne d'Information (AMI)
- 📰 Wakat série
- Et 25+ autres ministères et institutions

---

<div align="center">

**Développé avec ❤️ pour la Mauritanie 🇲🇷**

[![GitHub](https://img.shields.io/badge/GitHub-OumarBebana-181717?style=flat-square&logo=github)](https://github.com/OumarBebana/projet1)

</div>
