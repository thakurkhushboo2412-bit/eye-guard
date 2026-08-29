"""EyeGuard - Ads / Sponsor / Earnings backend tests (Iteration 3)"""
import os
import requests
import pytest

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://vision-protect-6.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_CODE = "142536"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module", autouse=True)
def _cleanup(s):
    """After all tests, reset sponsor to disabled state (does NOT reset counters)."""
    yield
    s.put(f"{API}/ads/sponsor", json={
        "code": ADMIN_CODE, "enabled": False,
        "title": "", "subtitle": "", "image_url": "", "link": ""
    })


# ---------- Sponsor GET/PUT ----------
def test_sponsor_get_default_shape(s):
    r = s.get(f"{API}/ads/sponsor")
    assert r.status_code == 200
    d = r.json()
    for k in ["enabled", "title", "subtitle", "image_url", "link"]:
        assert k in d
    assert isinstance(d["enabled"], bool)


def test_sponsor_put_requires_admin_code(s):
    r = s.put(f"{API}/ads/sponsor", json={
        "code": "wrong", "enabled": True, "title": "Hack",
    })
    assert r.status_code == 403


def test_sponsor_put_and_persist(s):
    payload = {
        "code": ADMIN_CODE, "enabled": True,
        "title": "TEST_Brand", "subtitle": "TEST_Save 20%",
        "image_url": "https://picsum.photos/400", "link": "https://example.com",
    }
    r = s.put(f"{API}/ads/sponsor", json=payload)
    assert r.status_code == 200
    d = r.json()
    assert d.get("ok") is True
    # verify persistence via GET
    g = s.get(f"{API}/ads/sponsor").json()
    assert g["enabled"] is True
    assert g["title"] == "TEST_Brand"
    assert g["subtitle"] == "TEST_Save 20%"
    assert g["image_url"] == "https://picsum.photos/400"
    assert g["link"] == "https://example.com"


def test_sponsor_put_partial_update(s):
    # only toggle enabled off - other fields should remain
    s.put(f"{API}/ads/sponsor", json={
        "code": ADMIN_CODE, "enabled": True, "title": "TEST_Keep",
        "subtitle": "sub", "image_url": "https://picsum.photos/1", "link": "https://x.com",
    })
    r = s.put(f"{API}/ads/sponsor", json={"code": ADMIN_CODE, "enabled": False})
    assert r.status_code == 200
    g = s.get(f"{API}/ads/sponsor").json()
    assert g["enabled"] is False
    assert g["title"] == "TEST_Keep"  # preserved
    assert g["subtitle"] == "sub"


# ---------- Impression / Click / Stats ----------
def test_impression_click_increments_and_stats(s):
    # Pull baseline
    before = s.get(f"{API}/ads/stats", params={"code": ADMIN_CODE}).json()
    b_imp, b_clk = int(before["impressions"]), int(before["clicks"])

    # Fire impressions/clicks
    for _ in range(3):
        r = s.post(f"{API}/ads/impression")
        assert r.status_code == 200
        assert r.json().get("ok") is True
    for _ in range(2):
        r = s.post(f"{API}/ads/click")
        assert r.status_code == 200
        assert r.json().get("ok") is True

    after = s.get(f"{API}/ads/stats", params={"code": ADMIN_CODE}).json()
    assert after["impressions"] == b_imp + 3
    assert after["clicks"] == b_clk + 2

    # verify computed fields
    assert "ctr" in after and isinstance(after["ctr"], (int, float))
    assert "estimated_earnings" in after
    assert after.get("currency") == "usd"


def test_stats_forbidden_without_code(s):
    r = s.get(f"{API}/ads/stats", params={"code": "wrong"})
    assert r.status_code == 403


def test_stats_math_formula(s):
    stats = s.get(f"{API}/ads/stats", params={"code": ADMIN_CODE}).json()
    imp, clk = stats["impressions"], stats["clicks"]
    expected_est = round((imp / 1000.0) * 2.0 + clk * 0.05, 2)
    assert stats["estimated_earnings"] == expected_est
    if imp > 0:
        expected_ctr = round((clk / imp * 100), 2)
        assert stats["ctr"] == expected_ctr
    else:
        assert stats["ctr"] == 0.0
