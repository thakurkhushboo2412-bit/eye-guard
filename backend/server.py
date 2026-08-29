from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone, date, timedelta

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_CODE = os.environ.get('ADMIN_CODE', '142536')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Server-owned pass catalog. Client can NEVER set the amount.
PACKAGES = {
    "monthly": {"name": "Pro Monthly Pass", "amount": 1.99, "days": 30},
    "yearly": {"name": "Pro Yearly Pass", "amount": 14.99, "days": 365},
}


def today_key() -> str:
    return date.today().isoformat()


def utcnow():
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.isoformat()


# ---------- Models ----------
class Settings(BaseModel):
    user_id: str = "default"
    threshold_cm: int = 30
    alert_blur: bool = True
    alert_vibrate: bool = True
    alert_sound: bool = True
    child_mode: bool = False
    pin: Optional[str] = None
    onboarded: bool = False


class SettingsUpdate(BaseModel):
    threshold_cm: Optional[int] = None
    alert_blur: Optional[bool] = None
    alert_vibrate: Optional[bool] = None
    alert_sound: Optional[bool] = None
    child_mode: Optional[bool] = None
    pin: Optional[str] = None
    onboarded: Optional[bool] = None


class DailyStat(BaseModel):
    user_id: str = "default"
    day: str
    total_seconds: int = 0
    close_seconds: int = 0
    close_events: int = 0
    updated_at: str = Field(default_factory=lambda: iso(utcnow()))


class StatEvent(BaseModel):
    session_seconds: int = 0
    close_seconds: int = 0
    close_events: int = 0


class StreakInfo(BaseModel):
    current_streak: int
    best_streak: int
    goal_daily_close_seconds: int = 300


class CheckoutBody(BaseModel):
    package_id: Literal["monthly", "yearly"]
    origin_url: str


class AdminBody(BaseModel):
    code: str


class PaidModeBody(BaseModel):
    code: str
    enabled: bool


class Sponsor(BaseModel):
    enabled: bool = False
    title: str = ""
    subtitle: str = ""
    image_url: str = ""
    link: str = ""


class SponsorUpdate(BaseModel):
    code: str
    enabled: Optional[bool] = None
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    link: Optional[str] = None


# ---------- Helpers ----------
async def get_pro_config() -> dict:
    doc = await db.pro_config.find_one({"_id": "config"}, {"_id": 0})
    if not doc:
        doc = {"paid_mode_enabled": False}
        await db.pro_config.update_one(
            {"_id": "config"}, {"$set": doc}, upsert=True
        )
    return doc


async def get_active_pass() -> Optional[dict]:
    """Return the latest non-expired paid pass, if any."""
    now = utcnow()
    cursor = db.payment_transactions.find(
        {"user_id": "default", "status": "paid"}, {"_id": 0}
    ).sort("paid_at", -1).limit(1)
    docs = await cursor.to_list(length=1)
    if not docs:
        return None
    txn = docs[0]
    exp = txn.get("expires_at")
    if exp and datetime.fromisoformat(exp) > now:
        return txn
    return None


# ---------- Basic ----------
@api_router.get("/")
async def root():
    return {"message": "EyeGuard API"}


# ---------- Settings ----------
@api_router.get("/settings", response_model=Settings)
async def get_settings():
    doc = await db.settings.find_one({"user_id": "default"}, {"_id": 0})
    if not doc:
        s = Settings()
        await db.settings.insert_one(s.dict())
        return s
    return Settings(**doc)


@api_router.put("/settings", response_model=Settings)
async def update_settings(update: SettingsUpdate):
    existing = await db.settings.find_one({"user_id": "default"}, {"_id": 0})
    if not existing:
        existing = Settings().dict()
    payload = {k: v for k, v in update.dict(exclude_unset=True).items()}
    existing.update(payload)
    await db.settings.update_one(
        {"user_id": "default"}, {"$set": existing}, upsert=True
    )
    return Settings(**existing)


@api_router.post("/pin/verify")
async def verify_pin(body: dict):
    pin = body.get("pin", "")
    doc = await db.settings.find_one({"user_id": "default"}, {"_id": 0})
    if not doc or not doc.get("pin"):
        raise HTTPException(status_code=400, detail="No PIN set")
    return {"ok": doc.get("pin") == pin}


# ---------- Stats ----------
@api_router.post("/stats/event", response_model=DailyStat)
async def record_event(event: StatEvent):
    d = today_key()
    existing = await db.daily_stats.find_one(
        {"user_id": "default", "day": d}, {"_id": 0}
    )
    if not existing:
        existing = DailyStat(day=d).dict()
    existing["total_seconds"] = int(existing.get("total_seconds", 0)) + int(event.session_seconds)
    existing["close_seconds"] = int(existing.get("close_seconds", 0)) + int(event.close_seconds)
    existing["close_events"] = int(existing.get("close_events", 0)) + int(event.close_events)
    existing["updated_at"] = iso(utcnow())
    await db.daily_stats.update_one(
        {"user_id": "default", "day": d}, {"$set": existing}, upsert=True
    )
    return DailyStat(**existing)


@api_router.get("/stats/today", response_model=DailyStat)
async def stats_today():
    d = today_key()
    doc = await db.daily_stats.find_one(
        {"user_id": "default", "day": d}, {"_id": 0}
    )
    if not doc:
        return DailyStat(day=d)
    return DailyStat(**doc)


@api_router.get("/stats/week", response_model=List[DailyStat])
async def stats_week():
    cursor = db.daily_stats.find({"user_id": "default"}, {"_id": 0}).sort("day", -1).limit(7)
    docs = await cursor.to_list(length=7)
    return [DailyStat(**d) for d in docs][::-1]


@api_router.get("/stats/streak", response_model=StreakInfo)
async def get_streak():
    goal = 300
    cursor = db.daily_stats.find({"user_id": "default"}, {"_id": 0}).sort("day", -1)
    docs = await cursor.to_list(length=365)
    if not docs:
        return StreakInfo(current_streak=0, best_streak=0, goal_daily_close_seconds=goal)
    today = date.today().isoformat()
    current = 0
    best = 0
    running = 0
    for d in docs:
        if int(d.get("close_seconds", 0)) <= goal:
            running += 1
            best = max(best, running)
        else:
            running = 0
    for d in docs:
        if int(d.get("close_seconds", 0)) <= goal:
            current += 1
        else:
            break
    return StreakInfo(current_streak=current, best_streak=best, goal_daily_close_seconds=goal)


# ---------- Pro / Entitlement ----------
@api_router.get("/pro/status")
async def pro_status():
    cfg = await get_pro_config()
    paid_mode = bool(cfg.get("paid_mode_enabled", False))
    active = await get_active_pass()
    if not paid_mode:
        # Free launch: everyone is Pro
        return {
            "paid_mode_enabled": False,
            "is_pro": True,
            "plan": None,
            "expires_at": None,
        }
    return {
        "paid_mode_enabled": True,
        "is_pro": active is not None,
        "plan": active.get("package_id") if active else None,
        "expires_at": active.get("expires_at") if active else None,
    }


@api_router.get("/pro/packages")
async def pro_packages():
    return {
        k: {"name": v["name"], "amount": v["amount"], "days": v["days"], "currency": "usd"}
        for k, v in PACKAGES.items()
    }


# ---------- Admin ----------
@api_router.post("/admin/verify")
async def admin_verify(body: AdminBody):
    return {"ok": body.code == ADMIN_CODE}


@api_router.get("/admin/config")
async def admin_config(code: str):
    if code != ADMIN_CODE:
        raise HTTPException(status_code=403, detail="Invalid admin code")
    cfg = await get_pro_config()
    return {"paid_mode_enabled": bool(cfg.get("paid_mode_enabled", False))}


@api_router.put("/admin/paid-mode")
async def set_paid_mode(body: PaidModeBody):
    if body.code != ADMIN_CODE:
        raise HTTPException(status_code=403, detail="Invalid admin code")
    await db.pro_config.update_one(
        {"_id": "config"}, {"$set": {"paid_mode_enabled": body.enabled}}, upsert=True
    )
    return {"paid_mode_enabled": body.enabled}


# ---------- Ads / Sponsor / Earnings ----------
@api_router.get("/ads/sponsor", response_model=Sponsor)
async def get_sponsor():
    doc = await db.ads_config.find_one({"_id": "sponsor"}, {"_id": 0})
    if not doc:
        return Sponsor()
    return Sponsor(**{k: doc.get(k, getattr(Sponsor(), k)) for k in Sponsor.model_fields})


@api_router.put("/ads/sponsor")
async def update_sponsor(body: SponsorUpdate):
    if body.code != ADMIN_CODE:
        raise HTTPException(status_code=403, detail="Invalid admin code")
    existing = await db.ads_config.find_one({"_id": "sponsor"}, {"_id": 0}) or {}
    patch = {k: v for k, v in body.dict(exclude_unset=True).items() if k != "code"}
    existing.update(patch)
    await db.ads_config.update_one({"_id": "sponsor"}, {"$set": existing}, upsert=True)
    return {"ok": True, **existing}


@api_router.post("/ads/impression")
async def ad_impression():
    await db.ads_config.update_one(
        {"_id": "metrics"}, {"$inc": {"impressions": 1}}, upsert=True
    )
    return {"ok": True}


@api_router.post("/ads/click")
async def ad_click():
    await db.ads_config.update_one(
        {"_id": "metrics"}, {"$inc": {"clicks": 1}}, upsert=True
    )
    return {"ok": True}


@api_router.get("/ads/stats")
async def ad_stats(code: str):
    if code != ADMIN_CODE:
        raise HTTPException(status_code=403, detail="Invalid admin code")
    m = await db.ads_config.find_one({"_id": "metrics"}, {"_id": 0}) or {}
    impressions = int(m.get("impressions", 0))
    clicks = int(m.get("clicks", 0))
    rpm, cpc = 2.0, 0.05
    est = round((impressions / 1000.0) * rpm + clicks * cpc, 2)
    ctr = round((clicks / impressions * 100), 2) if impressions else 0.0
    return {
        "impressions": impressions,
        "clicks": clicks,
        "ctr": ctr,
        "estimated_earnings": est,
        "currency": "usd",
    }


# ---------- Stripe Checkout ----------
@api_router.post("/checkout/create")
async def create_checkout(body: CheckoutBody):
    package = PACKAGES.get(body.package_id)
    if not package:
        raise HTTPException(status_code=400, detail="Unknown package")

    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/payment-return?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/payment-return?canceled=1"

    stripe = StripeCheckout(api_key=STRIPE_API_KEY)
    req = CheckoutSessionRequest(
        amount=float(package["amount"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"package_id": body.package_id, "user_id": "default"},
    )
    try:
        session = await stripe.create_checkout_session(req)
    except Exception as e:
        logging.exception("checkout create failed")
        raise HTTPException(status_code=502, detail=f"Checkout error: {e}")

    now = utcnow()
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "package_id": body.package_id,
        "package_name": package["name"],
        "amount": int(round(package["amount"] * 100)),
        "currency": "usd",
        "status": "created",
        "stripe_status": "unpaid",
        "user_id": "default",
        "days": package["days"],
        "created_at": iso(now),
        "updated_at": iso(now),
        "paid_at": None,
        "expires_at": None,
    })
    return {"session_id": session.session_id, "checkout_url": session.url}


@api_router.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str):
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Unknown session")

    # Already fulfilled — return without re-querying Stripe.
    if txn.get("status") == "paid":
        return {
            "session_id": session_id,
            "package_id": txn["package_id"],
            "status": "paid",
            "paid": True,
            "terminal": True,
            "expires_at": txn.get("expires_at"),
        }

    stripe = StripeCheckout(api_key=STRIPE_API_KEY)
    try:
        status_obj = await stripe.get_checkout_status(session_id)
    except Exception as e:
        logging.exception("checkout status failed")
        raise HTTPException(status_code=502, detail=f"Status error: {e}")

    payment_status = status_obj.payment_status
    session_status = status_obj.status
    paid = payment_status == "paid"
    terminal = paid or session_status in {"expired", "complete"}
    now = utcnow()

    update = {
        "stripe_status": payment_status,
        "updated_at": iso(now),
        "status": "paid" if paid else ("expired" if session_status == "expired" else "pending"),
    }
    if paid and not txn.get("paid_at"):
        exp = now + timedelta(days=int(txn.get("days", 30)))
        update["paid_at"] = iso(now)
        update["expires_at"] = iso(exp)

    await db.payment_transactions.update_one(
        {"session_id": session_id}, {"$set": update}
    )
    return {
        "session_id": session_id,
        "package_id": txn["package_id"],
        "status": update["status"],
        "paid": paid,
        "terminal": terminal,
        "expires_at": update.get("expires_at", txn.get("expires_at")),
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
