"""
FastAPI 应用入口

生产部署：默认监听 0.0.0.0:8000，同时托管前端 build 产物 + /api 接口（同源，无跨域）。
当 STATIC_DIR（默认 ../crf-system/dist）存在时自动启用静态托管，开发时不受影响。
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_PREFIX}/openapi.json"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


# 导入路由
from app.routers import auth, patients, visits, adverse_events, concomitant_meds, export
app.include_router(auth.router, prefix=settings.API_PREFIX, tags=["认证"])
app.include_router(patients.router, prefix=settings.API_PREFIX, tags=["患者管理"])
app.include_router(visits.router, prefix=settings.API_PREFIX, tags=["访视记录"])
app.include_router(adverse_events.router, prefix=settings.API_PREFIX, tags=["不良事件"])
app.include_router(concomitant_meds.router, prefix=settings.API_PREFIX, tags=["合并用药"])
app.include_router(export.router, prefix=settings.API_PREFIX, tags=["数据导出"])


# ============ 前端静态托管（生产同源部署）============
# 当 STATIC_DIR 存在（默认 crf-system/dist）时，托管 React SPA + API。
# 未命中 /api 且非静态文件的路由都回退到 index.html（支持前端路由刷新）。
STATIC_DIR = os.environ.get("STATIC_DIR", os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "crf-system", "dist"
))

if os.path.isdir(STATIC_DIR):
    class SPAStaticFiles(StaticFiles):
        """命中静态文件则返回该文件；否则回退到 index.html（SPA 路由）。"""
        async def get_response(self, path: str, scope):
            full = os.path.join(self.directory, path) if self.directory else path
            if not os.path.isfile(full):
                path = "index.html"
            return await super().get_response(path, scope)

    app.mount("/", SPAStaticFiles(directory=STATIC_DIR, html=True), name="frontend")

