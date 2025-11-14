# 백엔드 개발 가이드

## Step 1: Supabase 프로젝트 설정

### 1.1 Supabase 프로젝트 생성
1. https://supabase.com 접속
2. "New Project" 클릭
3. 프로젝트명: "pbn-saas"
4. 데이터베이스 비밀번호 설정
5. 리전 선택 (Asia Pacific - Seoul)

### 1.2 데이터베이스 스키마 생성
```sql
-- sites 테이블
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    app_password VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'disconnected',
    last_check TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- campaigns 테이블
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    site_id UUID REFERENCES sites(id),
    target_site VARCHAR(500) NOT NULL,
    keywords TEXT[] NOT NULL,
    quantity INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'paused',
    completed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- logs 테이블
CREATE TABLE logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id),
    content_title VARCHAR(500) NOT NULL,
    target_site VARCHAR(500) NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    published_url VARCHAR(1000),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_logs_campaign_id ON logs(campaign_id);
CREATE INDEX idx_logs_created_at ON logs(created_at);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_site_id ON campaigns(site_id);
```

### 1.3 환경 변수 설정
```bash
# .env 파일 생성
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 2: FastAPI 프로젝트 초기화

### 2.1 프로젝트 구조 생성
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── database/
│   │   ├── __init__.py
│   │   ├── connection.py
│   │   └── models.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── sites.py
│   │   ├── campaigns.py
│   │   ├── logs.py
│   │   ├── statistics.py
│   │   └── content.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── wordpress.py
│   │   ├── content_generator.py
│   │   └── scheduler.py
│   └── utils/
│       ├── __init__.py
│       ├── cache.py
│       └── validators.py
├── requirements.txt
└── docker-compose.yml
```

### 2.2 requirements.txt
```
fastapi==0.104.1
uvicorn==0.24.0
supabase==2.0.0
httpx==0.25.0
celery==5.3.4
redis==5.0.1
python-dotenv==1.0.0
pydantic==2.5.0
```

## Step 3: 기본 API 개발

### 3.1 데이터베이스 연결
```python
# app/database/connection.py
from supabase import create_client, Client
import os

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)
```

### 3.2 기본 CRUD API
```python
# app/api/sites.py
from fastapi import APIRouter
from app.database.connection import supabase

router = APIRouter(prefix="/api/sites", tags=["sites"])

@router.get("/")
async def get_sites():
    response = supabase.table("sites").select("*").execute()
    return response.data

@router.post("/")
async def create_site(site_data: dict):
    response = supabase.table("sites").insert(site_data).execute()
    return response.data
```

## Step 4: WordPress 연동

### 4.1 WordPress 서비스
```python
# app/services/wordpress.py
import httpx
from typing import Dict, Any

class WordPressService:
    async def test_connection(self, site: Dict[str, Any]) -> bool:
        """WordPress 연결 테스트"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{site['url']}/wp-json/wp/v2/posts",
                    auth=(site['username'], site['app_password']),
                    timeout=10.0
                )
                return response.status_code == 200
        except:
            return False
    
    async def create_post(self, site: Dict[str, Any], content: Dict[str, Any]) -> Dict[str, Any]:
        """WordPress에 포스트 생성"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{site['url']}/wp-json/wp/v2/posts",
                    json=content,
                    auth=(site['username'], site['app_password']),
                    timeout=30.0
                )
                
                if response.status_code == 201:
                    return {
                        "status": "success",
                        "data": response.json()
                    }
                else:
                    return {
                        "status": "failed",
                        "error": response.text
                    }
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e)
            }
```

## Step 5: 실시간 기능

### 5.1 WebSocket 연결
```python
# app/main.py
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket 연결 관리
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    async def broadcast(self, data: dict):
        for connection in self.active_connections:
            await connection.send_json(data)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except:
        manager.active_connections.remove(websocket)
```

## Step 6: 프론트엔드 연동

### 6.1 API 호출 함수
```javascript
// src/lib/api.js
const API_BASE_URL = 'http://localhost:8000'

export const api = {
  // 사이트 API
  getSites: () => fetch(`${API_BASE_URL}/api/sites`).then(r => r.json()),
  createSite: (data) => fetch(`${API_BASE_URL}/api/sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  
  // 캠페인 API
  getCampaigns: () => fetch(`${API_BASE_URL}/api/campaigns`).then(r => r.json()),
  createCampaign: (data) => fetch(`${API_BASE_URL}/api/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  
  // 로그 API
  getLogs: (params) => {
    const query = new URLSearchParams(params).toString()
    return fetch(`${API_BASE_URL}/api/logs?${query}`).then(r => r.json())
  }
}
```

### 6.2 실시간 구독
```javascript
// src/lib/realtime.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export const subscribeToLogs = (callback) => {
  return supabase
    .channel('logs')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs' }, callback)
    .subscribe()
}

export const subscribeToCampaigns = (callback) => {
  return supabase
    .channel('campaigns')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'campaigns' }, callback)
    .subscribe()
}
```

## 개발 순서 요약

1. **Supabase 프로젝트 생성** (30분)
2. **데이터베이스 스키마 생성** (30분)
3. **FastAPI 프로젝트 초기화** (1시간)
4. **기본 CRUD API 개발** (2시간)
5. **WordPress 연동** (3시간)
6. **프론트엔드 연동** (2시간)
7. **실시간 기능** (1시간)

**총 예상 시간: 1일**