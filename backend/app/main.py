from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.auth import router as auth_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.integrations import router as integrations_router
from app.api.routes.user import router as user_router


def create_app() -> FastAPI:
    """
    Unified FastAPI application factory.
    Binds CORS middleware configurations and mounts sub-routers under a unified /api/v1 namespace.
    """
    app = FastAPI(
        title="InsightOps API Backend",
        description="Asynchronous multi-tenant database analytics engine with WAF and RAG routing.",
        version="1.0.0"
    )

    # Configure CORS middleware to accept requests from development ports
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:8081",
            "http://127.0.0.1:8081",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


    # Register authentication, analytics, integrations, and user settings sub-routers under /api/v1 path namespace
    app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
    app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
    app.include_router(integrations_router, prefix="/api/v1/integrations", tags=["Integrations"])
    app.include_router(user_router, prefix="/api/v1/user", tags=["User"])

    @app.get("/")
    async def root():
        return {
            "status": "healthy",
            "service": "InsightOps API Service"
        }

    return app

# Expose app module instance for uvicorn runtime execution (uvicorn app.main:app)
app = create_app()
