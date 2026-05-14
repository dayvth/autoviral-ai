# AutoViral AI 🚀

**Plataforma SaaS de criação e publicação automática de vídeos virais com IA.**

Escolha seu nicho → a IA pesquisa tendências, cria roteiro, gera voz, edita o vídeo, cria legendas, gera thumbnail, publica nas redes sociais e aprende com a performance. **100% automático.**

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15, TypeScript, TailwindCSS, Shadcn UI, Framer Motion |
| Backend | Node.js, Express, Socket.IO |
| ORM | Prisma + PostgreSQL via Supabase |
| Filas | BullMQ + Redis |
| IA / ML | OpenAI GPT-4o, Claude Sonnet 4.6, Gemini |
| Voz | ElevenLabs (multilingual v2) |
| Transcrição | Whisper (open-source, self-hosted) |
| Vídeo | FFmpeg, MoviePy, Pexels API |
| Workers Python | FastAPI + Uvicorn |
| Storage | Supabase Storage (AWS S3 opcional) |
| Auth | JWT + Supabase Auth |
| Billing | Stripe (assinaturas + portal) |
| Deploy | Docker Compose, Railway, Vercel |

---

## Arquitetura

```
autoviral-ai/
├── apps/
│   ├── web/                   # Next.js 15 (porta 3000)
│   └── api/                   # Express + Socket.IO (porta 4000)
├── packages/
│   └── database/              # Prisma schema + client
├── workers/
│   ├── script-worker/         # BullMQ: geração de roteiros (Claude + GPT)
│   ├── voice-worker/          # BullMQ: síntese de voz (ElevenLabs)
│   ├── video-worker/          # BullMQ: edição FFmpeg + upload storage
│   ├── upload-worker/         # BullMQ: publicação nas redes sociais
│   └── analytics-worker/      # BullMQ: sincronização de métricas
├── ai/                        # FastAPI Python (porta 8000)
│   └── routers/
│       ├── trends.py          # Google Trends / pytrends
│       ├── subtitles.py       # Whisper + ASS karaoke
│       ├── thumbnails.py      # Extração de frames + ranking GPT-4o vision
│       ├── transcribe.py      # Transcrição com timestamps
│       └── improve.py         # Análise de performance e melhoria contínua
├── docker/                    # Dockerfiles + nginx.conf
└── docker-compose.yml
```

### Fluxo completo de geração

```
Usuário escolhe nicho
    ↓
[Scheduler / API] → script-generation queue
    ↓
[script-worker]
  ├── Agent 1: Hook viral (Claude Sonnet)
  ├── Agent 2: Roteiro (Claude Sonnet)
  ├── Agent 3: CTA (Claude Haiku)
  └── Agent 4: Meta — título/desc/hashtags (GPT-4o-mini)
    ↓
[voice-worker]
  └── ElevenLabs multilingual v2 → upload Supabase Storage
    ↓
[video-worker]
  ├── Pexels API → baixa clips de fundo
  ├── FFmpeg → monta background + aplica grade de cor
  ├── Python worker → gera legendas ASS karaoke (Whisper)
  ├── FFmpeg → compõe vídeo final
  └── Gera thumbnail → upload Storage
    ↓
[upload-worker]
  └── YouTube API / TikTok API / Instagram Graph API
    ↓
[analytics-worker]
  └── Coleta métricas → alimenta motor de melhoria contínua
```

---

## Setup local

### Pré-requisitos

- Node.js 20+
- Python 3.12+
- Redis 7+
- FFmpeg
- Docker (opcional, recomendado para prod)

### 1. Clonar e instalar

```bash
git clone https://github.com/seu-usuario/autoviral-ai
cd autoviral-ai
cp .env.example .env
# Preencha as variáveis de ambiente no .env
npm install
```

### 2. Banco de dados

```bash
cd packages/database
npx prisma migrate dev --name init
npx prisma generate
```

### 3. Instalar dependências Python

```bash
cd ai
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Rodar em desenvolvimento

```bash
# Terminal 1 — Redis (ou use Docker)
docker run -d -p 6379:6379 redis:7-alpine

# Terminal 2 — Backend API
cd apps/api && npm run dev

# Terminal 3 — Frontend
cd apps/web && npm run dev

# Terminal 4 — Python workers
cd ai && uvicorn main:app --reload --port 8000

# Terminal 5 — BullMQ workers (script + voice)
cd workers/script-worker && npm run dev
cd workers/voice-worker && npm run dev

# Terminal 6 — Video + upload workers
cd workers/video-worker && npm run dev
cd workers/upload-worker && npm run dev
```

Ou use o turbo para tudo junto:

```bash
npm run dev
```

### 5. Acessar

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000 |
| API Docs (dev) | http://localhost:4000/health |
| Python Worker | http://localhost:8000/docs |

---

## Deploy com Docker

```bash
# Build e subir todos os serviços
docker-compose up -d --build

# Ver logs
docker-compose logs -f api

# Migrations em produção
docker-compose exec api npx prisma migrate deploy

# Parar tudo
docker-compose down
```

---

## Variáveis de ambiente obrigatórias

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | PostgreSQL (Supabase) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role Supabase |
| `REDIS_URL` | Redis connection string |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Claude API key |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS |
| `JWT_SECRET` | Secret JWT (min 32 chars) |
| `STRIPE_SECRET_KEY` | Stripe para billing |
| `PEXELS_API_KEY` | Pexels para vídeos royalty-free |
| `YOUTUBE_CLIENT_ID/SECRET` | YouTube OAuth |

Veja o arquivo [.env.example](.env.example) para a lista completa.

---

## Planos SaaS

| Plano | Preço | Vídeos/mês |
|---|---|---|
| Free | Gratuito | 5 |
| Pro | R$ 97/mês | 200 |
| Business | R$ 297/mês | Ilimitado |

Trial de 7 dias gratuito nos planos pagos.

---

## Funcionalidades implementadas

- [x] Geração automática de roteiros com multi-agent AI (Claude + GPT-4o)
- [x] Síntese de voz multilingual (ElevenLabs)
- [x] Download automático de vídeos royalty-free (Pexels)
- [x] Composição de vídeo com FFmpeg (vertical/horizontal/quadrado)
- [x] Legendas karaoke estilo TikTok (Whisper + ASS)
- [x] Thumbnails automáticos com seleção por GPT-4o vision
- [x] Publicação automática no YouTube e TikTok
- [x] Pesquisa de tendências (YouTube Data API + Google Trends + Reddit)
- [x] Analytics em tempo real (YouTube Analytics API)
- [x] Motor de melhoria contínua baseado em performance
- [x] Billing com Stripe (assinaturas + portal)
- [x] WebSocket para atualizações em tempo real
- [x] Agendamento inteligente com cron
- [x] Dashboard completo com gráficos
- [x] Sistema multi-conta (múltiplos canais)
- [x] Rate limiting, JWT, criptografia de tokens

---

## Licença

MIT — use à vontade.
