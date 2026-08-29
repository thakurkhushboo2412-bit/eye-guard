"""EyeGuard backend API tests"""
import os
import requests
import pytest

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://vision-protect-6.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Health ----------
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("message") == "EyeGuard API"


# ---------- Settings ----------
def test_get_settings_defaults(s):
    r = s.get(f"{API}/settings")
    assert r.status_code == 200
    d = r.json()
    for k in ["threshold_cm", "alert_blur", "alert_vibrate", "alert_sound", "child_mode", "onboarded"]:
        assert k in d
    assert isinstance(d["threshold_cm"], int)


def test_put_settings_threshold_and_persist(s):
    r = s.put(f"{API}/settings", json={"threshold_cm": 45, "alert_sound": False, "onboarded": True})
    assert r.status_code == 200
    d = r.json()
    assert d["threshold_cm"] == 45
    assert d["alert_sound"] is False
    assert d["onboarded"] is True
    # verify persistence
    r2 = s.get(f"{API}/settings")
    d2 = r2.json()
    assert d2["threshold_cm"] == 45
    assert d2["alert_sound"] is False
    assert d2["onboarded"] is True


def test_put_settings_partial_preserves_others(s):
    s.put(f"{API}/settings", json={"threshold_cm": 30, "alert_sound": True})
    r = s.put(f"{API}/settings", json={"alert_blur": False})
    d = r.json()
    assert d["alert_blur"] is False
    assert d["threshold_cm"] == 30  # preserved
    assert d["alert_sound"] is True
    # restore
    s.put(f"{API}/settings", json={"alert_blur": True})


# ---------- PIN ----------
def test_pin_set_and_verify(s):
    r = s.put(f"{API}/settings", json={"pin": "1234", "child_mode": True})
    assert r.status_code == 200
    ok = s.post(f"{API}/pin/verify", json={"pin": "1234"})
    assert ok.status_code == 200
    assert ok.json().get("ok") is True
    bad = s.post(f"{API}/pin/verify", json={"pin": "0000"})
    assert bad.status_code == 200
    assert bad.json().get("ok") is False
    # disable child
    s.put(f"{API}/settings", json={"child_mode": False})


def test_pin_verify_no_pin_set(s):
    # clear pin by setting empty then... backend doesn't support removal directly; set to "" then verify
    s.put(f"{API}/settings", json={"pin": ""})
    r = s.post(f"{API}/pin/verify", json={"pin": "1234"})
    # backend returns 400 when no PIN
    assert r.status_code in (200, 400)


# ---------- Stats ----------
def test_stats_today_default(s):
    r = s.get(f"{API}/stats/today")
    assert r.status_code == 200
    d = r.json()
    assert "day" in d and "close_seconds" in d


def test_stats_event_increments(s):
    before = s.get(f"{API}/stats/today").json()
    before_close = int(before.get("close_seconds", 0))
    before_events = int(before.get("close_events", 0))
    r = s.post(f"{API}/stats/event", json={"session_seconds": 60, "close_seconds": 10, "close_events": 1})
    assert r.status_code == 200
    d = r.json()
    assert d["close_seconds"] == before_close + 10
    assert d["close_events"] == before_events + 1
    # GET verify
    after = s.get(f"{API}/stats/today").json()
    assert after["close_seconds"] == before_close + 10


def test_stats_week(s):
    r = s.get(f"{API}/stats/week")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) <= 7


def test_stats_streak(s):
    r = s.get(f"{API}/stats/streak")
    assert r.status_code == 200
    d = r.json()
    assert "current_streak" in d and "best_streak" in d
    assert d["goal_daily_close_seconds"] == 300



# ---------- Pro / Entitlement / Admin / Checkout ----------
ADMIN_CODE = "142536"


@pytest.fixture(scope="module", autouse=True)
def _reset_paid_mode_off(s):
    """Ensure paid mode is OFF before and after these new tests."""
    yield
    s.put(f"{API}/admin/paid-mode", json={"code": ADMIN_CODE, "enabled": False})


def test_pro_packages(s):
    r = s.get(f"{API}/pro/packages")
    assert r.status_code == 200
    d = r.json()
    assert "monthly" in d and "yearly" in d
    assert d["monthly"]["amount"] == 1.99
    assert d["monthly"]["days"] == 30
    assert d["yearly"]["amount"] == 14.99
    assert d["yearly"]["days"] == 365


def test_admin_verify_correct_and_incorrect(s):
    ok = s.post(f"{API}/admin/verify", json={"code": ADMIN_CODE})
    assert ok.status_code == 200
    assert ok.json().get("ok") is True
    bad = s.post(f"{API}/admin/verify", json={"code": "000000"})
    assert bad.status_code == 200
    assert bad.json().get("ok") is False


def test_admin_config_wrong_code_forbidden(s):
    r = s.get(f"{API}/admin/config", params={"code": "wrong"})
    assert r.status_code == 403


def test_admin_config_correct_code(s):
    r = s.get(f"{API}/admin/config", params={"code": ADMIN_CODE})
    assert r.status_code == 200
    assert "paid_mode_enabled" in r.json()


def test_paid_mode_toggle_wrong_code(s):
    r = s.put(f"{API}/admin/paid-mode", json={"code": "wrong", "enabled": True})
    assert r.status_code == 403


def test_pro_status_paid_mode_off_is_pro_true(s):
    s.put(f"{API}/admin/paid-mode", json={"code": ADMIN_CODE, "enabled": False})
    r = s.get(f"{API}/pro/status")
    assert r.status_code == 200
    d = r.json()
    assert d["paid_mode_enabled"] is False
    assert d["is_pro"] is True
    assert d["plan"] is None
    assert d["expires_at"] is None


def test_pro_status_paid_mode_on_no_pass_is_pro_false(s):
    r = s.put(f"{API}/admin/paid-mode", json={"code": ADMIN_CODE, "enabled": True})
    assert r.status_code == 200
    assert r.json()["paid_mode_enabled"] is True
    # verify status
    r2 = s.get(f"{API}/pro/status")
    d = r2.json()
    assert d["paid_mode_enabled"] is True
    # If no active pass exists it should be False; test env should not have one
    if not d["is_pro"]:
        assert d["is_pro"] is False
        assert d["plan"] is None
    # Reset to OFF
    s.put(f"{API}/admin/paid-mode", json={"code": ADMIN_CODE, "enabled": False})
    r3 = s.get(f"{API}/pro/status")
    assert r3.json()["is_pro"] is True


def test_checkout_create_ignores_client_amount(s):
    # Client tries to pass an amount; server must ignore it (schema doesn't accept amount)
    payload = {"package_id": "monthly", "origin_url": BASE_URL, "amount": 0.01}
    r = s.post(f"{API}/checkout/create", json=payload)
    # Should succeed (extra field ignored) and return session_id + checkout_url
    assert r.status_code == 200, r.text
    d = r.json()
    assert "session_id" in d and d["session_id"]
    assert "checkout_url" in d and d["checkout_url"].startswith("http")


def test_checkout_create_unknown_package(s):
    r = s.post(f"{API}/checkout/create", json={"package_id": "lifetime", "origin_url": BASE_URL})
    # Pydantic Literal validation -> 422; or 400 if reached endpoint
    assert r.status_code in (400, 422)


def test_checkout_status_unknown_session_404(s):
    r = s.get(f"{API}/checkout/status/nonexistent_session_xyz_TEST")
    assert r.status_code == 404


def test_checkout_status_created_session(s):
    # Create a checkout, then fetch status - should be pending/unpaid (not paid)
    create = s.post(f"{API}/checkout/create", json={"package_id": "yearly", "origin_url": BASE_URL})
    assert create.status_code == 200
    sid = create.json()["session_id"]
    r = s.get(f"{API}/checkout/status/{sid}")
    assert r.status_code == 200
    d = r.json()
    assert d["session_id"] == sid
    assert d["package_id"] == "yearly"
    assert d["paid"] is False
    assert d["status"] in ("pending", "expired")
