"""
FastAPI 应用入口
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/")
async def root():
    return {
        "message": "荆防临床研究 CRF 系统 API",
        "version": settings.VERSION,
        "docs": f"{settings.API_PREFIX}/docs"
    }


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
